import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

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
          setUser(localStorage.getItem("upnex_guest") === "true" ? { id: "guest", name: "Guest learner", email: "", role: "GUEST", guest: true } : null);
        } else {
          setAuthError("We couldn't verify your session. Check your connection and try again.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    localStorage.removeItem("upnex_guest");
    setAuthError(null);
    setUser(res.data.user);
  }

  async function register(name, email, password) {
    const res = await api.post("/auth/register", { name, email, password });
    localStorage.removeItem("upnex_guest");
    setAuthError(null);
    setUser(res.data.user);
  }

  function continueAsGuest() {
    localStorage.setItem("upnex_guest", "true");
    setAuthError(null);
    setUser({ id: "guest", name: "Guest learner", email: "", role: "GUEST", guest: true });
  }

  async function logout() {
    if (!user?.guest) await api.post("/auth/logout");
    localStorage.removeItem("upnex_guest");
    setAuthError(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, authError, login, register, continueAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);