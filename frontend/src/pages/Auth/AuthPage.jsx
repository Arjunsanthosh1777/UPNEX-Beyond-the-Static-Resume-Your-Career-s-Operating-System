import { useEffect, useRef, useState } from "react";
import { ArrowRight, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useStarfield } from "../../hooks/useStarfield";

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register, continueAsGuest, authError } = useAuth();
  const isSignUp = location.pathname === "/register";
  const canvasRef = useRef(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const providerError = new URLSearchParams(location.search).get("error");
    if (providerError) setError(providerError === "google_cancelled" ? "Google sign-in was cancelled." : "Google sign-in could not be completed.");
  }, [location.search]);

  // Surface a transient session-check failure distinctly from bad credentials,
  // without overriding a more specific provider error message.
  const displayedError = error || authError;

  useStarfield(canvasRef);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isSignUp) await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
      navigate("/dashboard");
    } catch (submitError) {
      setError(submitError.response?.data?.message || (isSignUp ? "Unable to create your account." : "Unable to sign you in."));
    } finally { setBusy(false); }
  }

  function switchMode() { navigate(isSignUp ? "/login" : "/register"); setError(""); }

  function startGoogleLogin() { window.location.assign("/api/auth/google"); }

  function startGuestMode() { continueAsGuest(); navigate("/dashboard"); }

  return <main className="auth-scene"><canvas ref={canvasRef} aria-hidden="true" /><div className="auth-vignette" aria-hidden="true" /><Link to="/" className="auth-brand"><span>U</span><b>UPNEX</b></Link><form className="auth-surface" onSubmit={submit} aria-labelledby="auth-title"><div className="auth-monogram">U</div><h1 id="auth-title">{isSignUp ? "Create your UPNEX account" : "Sign in to UPNEX"}</h1><p className="auth-subtitle">{isSignUp ? "Start building your academic signal." : "Continue to your student workspace."}</p>{isSignUp && <Field icon={UserRound} label="Full name" type="text" autoComplete="name" placeholder="Your full name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />}{!isSignUp && <Field icon={Mail} label="Work email" type="email" autoComplete="email" placeholder="name@work-email.com" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />}{isSignUp && <Field icon={Mail} label="Work email" type="email" autoComplete="email" placeholder="name@work-email.com" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />}<Field icon={LockKeyhole} label="Password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} placeholder={isSignUp ? "Minimum 8 characters" : "Your password"} value={form.password} onChange={(value) => setForm({ ...form, password: value })} minLength={isSignUp ? 8 : undefined} />{displayedError && <div className="auth-error" role="alert">{displayedError}</div>}<button className="auth-submit" type="submit" disabled={busy}>{busy ? "Please wait..." : isSignUp ? "Sign Up with Email" : "Continue with Email"}<ArrowRight size={16} /></button><div className="auth-divider"><span /> <small>or continue with</small> <span /></div><button className="google-submit" type="button" onClick={startGoogleLogin}><GoogleMark /> {isSignUp ? "Sign up with Google" : "Continue with Google"}</button><button className="guest-submit" type="button" onClick={startGuestMode}>Continue as guest</button><p className="auth-switch">{isSignUp ? "Already have an account?" : "New to UPNEX?"} <button type="button" onClick={switchMode}>{isSignUp ? "Sign In" : "Sign Up"}</button></p><p className="auth-legal">By continuing, you agree to create a UPNEX account subject to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.</p></form></main>;
}

function Field({ icon: Icon, label, type, autoComplete, placeholder, value, onChange, minLength }) { return <label className="auth-field"><span>{label}</span><div><Icon size={16} aria-hidden="true" /><input required type={type} autoComplete={autoComplete} placeholder={placeholder} value={value} minLength={minLength} onChange={(event) => onChange(event.target.value)} /></div></label>; }

function GoogleMark() { return <span className="google-mark" aria-hidden="true">G</span>; }
