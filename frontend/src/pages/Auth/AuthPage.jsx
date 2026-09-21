import { useEffect, useRef, useState } from "react";
import { ArrowRight, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useStarfield } from "../../hooks/useStarfield";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import ThemeSwitcher from "../../components/ThemeSwitcher";
import { Mark } from "../../components/Logo";

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, register, loginWithGoogle, continueAsGuest, authError, readableAuthError } = useAuth();
  const isSignUp = location.pathname === "/register";
  const canvasRef = useRef(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const providerError = new URLSearchParams(location.search).get("error");
    if (providerError) setError(providerError === "google_cancelled" ? t("auth.googleCancelled", "Google sign-in was cancelled.") : t("auth.googleFailed", "Google sign-in could not be completed."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setError(submitError.response?.data?.message || (isSignUp ? t("auth.createFailed", "Unable to create your account.") : t("auth.signInFailed", "Unable to sign you in.")));
    } finally { setBusy(false); }
  }

  function switchMode() { navigate(isSignUp ? "/login" : "/register"); setError(""); }

  async function startGoogleLogin() {
    try {
      await loginWithGoogle();
      navigate("/dashboard");
    } catch (error) {
      // Surfaces "popup blocked", "sign-in cancelled" etc. instead of dying silently.
      setError(readableAuthError(error));
    }
  }

  function startGuestMode() { continueAsGuest(); navigate("/dashboard"); }

  return <main className="auth-scene"><canvas ref={canvasRef} aria-hidden="true" /><div className="auth-vignette" aria-hidden="true" /><Link to="/" className="auth-brand"><Mark /><b>UPNEX</b></Link><LanguageSwitcher /><ThemeSwitcher /><form className="auth-surface" onSubmit={submit} aria-labelledby="auth-title"><div className="auth-monogram"><Mark /></div><h1 id="auth-title">{isSignUp ? t("auth.registerTitle", "Create your UPNEX account") : t("auth.loginTitle", "Sign in to UPNEX")}</h1><p className="auth-subtitle">{isSignUp ? t("auth.registerSub", "Start building your academic signal.") : t("auth.loginSub", "Continue to your student workspace.")}</p>{isSignUp && <Field icon={UserRound} label={t("auth.fullName", "Full name")} type="text" autoComplete="name" placeholder={t("auth.fullNamePlaceholder", "Your full name")} value={form.name} onChange={(value) => setForm({ ...form, name: value })} />}<Field icon={Mail} label={t("auth.email", "Work email")} type="email" autoComplete="email" placeholder={t("auth.emailPlaceholder", "name@work-email.com")} value={form.email} onChange={(value) => setForm({ ...form, email: value })} /><Field icon={LockKeyhole} label={t("auth.password", "Password")} type="password" autoComplete={isSignUp ? "new-password" : "current-password"} placeholder={isSignUp ? t("auth.passwordHint", "Minimum 8 characters") : t("auth.passwordPlaceholder", "Your password")} value={form.password} onChange={(value) => setForm({ ...form, password: value })} minLength={isSignUp ? 8 : undefined} />{displayedError && <div className="auth-error" role="alert">{displayedError}</div>}<button className="auth-submit" type="submit" disabled={busy}>{busy ? t("auth.loading", "Please wait...") : isSignUp ? t("auth.emailSignUp", "Sign Up with Email") : t("auth.emailSignIn", "Continue with Email")}<ArrowRight size={16} /></button><div className="auth-divider"><span /> <small>{t("auth.orContinueWith", "or continue with")}</small> <span /></div><button className="google-submit" type="button" onClick={startGoogleLogin}><GoogleMark /> {isSignUp ? t("auth.googleSignUp", "Sign up with Google") : t("auth.googleSignIn", "Continue with Google")}</button><button className="guest-submit" type="button" onClick={startGuestMode}>{t("auth.continueAsGuest", "Continue as guest")}</button><p className="auth-switch">{isSignUp ? t("auth.haveAccount", "Already have an account?") : t("auth.newToUpnex", "New to UPNEX?")} <button type="button" onClick={switchMode}>{isSignUp ? t("auth.switchSignIn", "Sign In") : t("auth.switchSignUp", "Sign Up")}</button></p><p className="auth-legal"><Trans i18nKey="auth.legal">By continuing, you agree to create a UPNEX account subject to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.</Trans></p></form></main>;
}

function Field({ icon: Icon, label, type, autoComplete, placeholder, value, onChange, minLength }) { return <label className="auth-field"><span>{label}</span><div><Icon size={16} aria-hidden="true" /><input required type={type} autoComplete={autoComplete} placeholder={placeholder} value={value} minLength={minLength} onChange={(event) => onChange(event.target.value)} /></div></label>; }

function GoogleMark() { return <span className="google-mark" aria-hidden="true">G</span>; }