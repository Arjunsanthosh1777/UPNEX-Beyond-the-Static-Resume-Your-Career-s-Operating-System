import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from "firebase/auth";
import api from "../services/api";
import { auth, firebaseIsConfigured, googleProvider, firebaseMissingHint } from "../services/firebase";

const AuthContext = createContext(null);
const GUEST_USER = { id: "guest", name: "Guest learner", email: "", role: "GUEST", guest: true };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    api.get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch((error) => {
        // 401 means there is genuinely no session, so fall back to the guest
        // state. Anything else (network failure, 5xx) is a transient problem:
        // flag it and leave the user untouched rather than signing them out.
        if (error.response?.status === 401) {
          setUser(localStorage.getItem("upnex_guest") === "true" ? GUEST_USER : null);
        } else {
          setAuthError("We couldn't verify your session. Check your connection and try again.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Hand the freshly-minted Firebase ID token to the backend, which verifies it
  // with the Admin SDK and issues the usual upnex_token session cookie. This is
  // what lets the Express + Prisma API keep authorising requests unchanged.
  // A failure here is not fatal to sign-in: Firebase auth already succeeded, so
  // the user is still signed in on the client.
  async function syncSessionWithBackend(firebaseUser) {
    const idToken = await firebaseUser.getIdToken();
    try {
      const res = await api.post("/auth/firebase", { idToken });
      return res.data.user;
    } catch {
      return {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || "UPNEX Learner",
        email: firebaseUser.email || "",
        role: "STUDENT",
        avatar: firebaseUser.photoURL || null,
        // Flag it so callers can tell the server session lags the client one.
        sessionSynced: false
      };
    }
  }

  // Firebase credentials authenticate against the Firebase project; the legacy
  // backend password flow against Prisma. Prefer Firebase once frontend/.env is
  // populated, otherwise keep the original backend login working.
  async function login(email, password) {
    if (firebaseIsConfigured()) {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const synced = await syncSessionWithBackend(credential.user);
      localStorage.removeItem("upnex_guest");
      setAuthError(null);
      // Same shape register() uses: prefer the backend user when the session
      // synced, otherwise the client-side Firebase user still lets the UI in.
      setUser(synced);
      return;
    }
    await api.post("/auth/login", { email, password });
    localStorage.removeItem("upnex_guest");
    setAuthError(null);
    const refreshed = await api.get("/auth/me").catch(() => null);
    setUser(refreshed ? refreshed.data.user : user);
  }

  async function register(name, email, password) {
    if (firebaseIsConfigured()) {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(credential.user, { displayName: name });
      localStorage.removeItem("upnex_guest");
      setAuthError(null);
      setUser({ ...(await syncSessionWithBackend(credential.user)), name });
      return;
    }
    const res = await api.post("/auth/register", { name, email, password });
    localStorage.removeItem("upnex_guest");
    setAuthError(null);
    setUser(res.data.user);
  }

  // Firebase popup when the project is configured; otherwise fall back to the
  // backend's server-side Google redirect (same result, one page load).
  async function loginWithGoogle() {
    if (firebaseIsConfigured()) {
      const credential = await signInWithPopup(auth, googleProvider);
      localStorage.removeItem("upnex_guest");
      setAuthError(null);
      setUser(await syncSessionWithBackend(credential.user));
      return;
    }
    window.location.assign("/api/auth/google");
  }

  function continueAsGuest() {
    localStorage.setItem("upnex_guest", "true");
    setAuthError(null);
    setUser(GUEST_USER);
  }

  async function logout() {
    if (user?.guest) {
      localStorage.removeItem("upnex_guest");
      setAuthError(null);
      setUser(null);
      return;
    }
    // Clear the backend cookie first (it may 401 if already expired), then drop
    // the Firebase session. Either failing must not strand the user signed in.
    try {
      await api.post("/auth/logout");
    } catch {
      // Session already gone — nothing to clear server-side.
    }
    if (auth && auth.currentUser) {
      try {
        await signOut(auth);
      } catch {
        // Ignore: local state below is what the UI reads.
      }
    }
    localStorage.removeItem("upnex_guest");
    setAuthError(null);
    setUser(null);
  }

  // Keep the UI in step with Firebase itself. This fires on token refresh and on
  // sign-out performed outside React (e.g. in another tab), and clears state if
  // the backend session has gone away.
  useEffect(() => {
    if (!firebaseIsConfigured() || !auth) return undefined;
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser((current) => (current?.guest ? current : null));
      }
    });
  }, []);

  const value = {
    user, loading, authError,
    login, register, loginWithGoogle, continueAsGuest, logout,
    readableAuthError: (error) => {
      if (!firebaseIsConfigured() && error?.message?.includes("not configured")) {
        return firebaseMissingHint();
      }
      const codes = {
        "auth/invalid-email": "That email address doesn't look valid.",
        "auth/user-disabled": "This account has been disabled.",
        "auth/user-not-found": "No account found with that email.",
        "auth/wrong-password": "Incorrect email or password.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/email-already-in-use": "That email is already registered. Try signing in instead.",
        "auth/weak-password": "Choose a stronger password (at least 8 characters).",
        "auth/popup-closed-by-user": "Sign-in was cancelled.",
        "auth/popup-blocked": "Your browser blocked the sign-in popup. Allow popups and try again.",
        "auth/network-request-failed": "Network problem reaching Firebase. Check your connection.",
        "auth/operation-not-allowed": "This sign-in method is not enabled in the Firebase console.",
        "auth/too-many-requests": "Too many attempts. Please wait a moment and try again."
      };
      return codes[error?.code] || error?.message || "Sign-in failed.";
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);