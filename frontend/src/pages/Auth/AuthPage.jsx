import { useEffect, useRef, useState } from "react";
import { ArrowRight, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register, continueAsGuest } = useAuth();
  const isSignUp = location.pathname === "/register";
  const canvasRef = useRef(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const providerError = new URLSearchParams(location.search).get("error");
    if (providerError) setError(providerError === "google_cancelled" ? "Google sign-in was cancelled." : "Google sign-in could not be completed.");
  }, [location.search]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame;
    let resizeObserver;
    let width = 0;
    let height = 0;
    let dots = [];
    let startedAt = performance.now();

    function resize() {
      const bounds = canvas.parentElement.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      dots = [];
      for (let y = 10; y < height + 20; y += 20) {
        for (let x = 10; x < width + 20; x += 20) {
          const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          const random = seed - Math.floor(seed);
          dots.push({ x, y, phase: random * Math.PI * 2, speed: 0.35 + random * 0.75, strength: 0.18 + random * 0.22, highlight: random > 0.9, delay: random * 900 });
        }
      }
    }

    function draw(now) {
      const elapsed = now - startedAt;
      context.clearRect(0, 0, width, height);
      const shimmer = ((elapsed * 0.035) % (width + height + 260)) - 130;
      const motion = reducedMotion.matches ? 0 : elapsed;
      for (const dot of dots) {
        const twinkle = 0.65 + Math.sin(motion * 0.001 * dot.speed + dot.phase) * 0.35;
        const distance = Math.abs(dot.x + dot.y - shimmer);
        const sweep = Math.max(0, 1 - distance / 90);
        const pulse = dot.highlight && !reducedMotion.matches ? Math.max(0, Math.sin((motion + dot.delay) * 0.0011 + dot.phase)) ** 8 : 0;
        const alpha = Math.min(0.92, dot.strength * twinkle + sweep * 0.25 + pulse * 0.58);
        if (pulse > 0.02) {
          const glow = context.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, 25 + pulse * 10);
          glow.addColorStop(0, `rgba(255,255,255,${pulse * 0.55})`);
          glow.addColorStop(0.24, `rgba(218,201,255,${pulse * 0.27})`);
          glow.addColorStop(1, "rgba(106,63,180,0)");
          context.fillStyle = glow;
          context.fillRect(dot.x - 35, dot.y - 35, 70, 70);
        }
        const lavender = sweep > 0.08 || pulse > 0.02;
        context.fillStyle = lavender ? `rgba(232,224,255,${alpha})` : `rgba(223,229,239,${alpha})`;
        context.fillRect(dot.x - 2.5, dot.y - 2.5, 5, 5);
      }
      frame = requestAnimationFrame(draw);
    }

    resize();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement);
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); resizeObserver?.disconnect(); };
  }, []);

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

  return <main className="auth-scene"><canvas ref={canvasRef} aria-hidden="true" /><div className="auth-vignette" aria-hidden="true" /><Link to="/" className="auth-brand"><span>U</span><b>UPNEX</b></Link><form className="auth-surface" onSubmit={submit} aria-labelledby="auth-title"><div className="auth-monogram">U</div><h1 id="auth-title">{isSignUp ? "Create your UPNEX account" : "Sign in to UPNEX"}</h1><p className="auth-subtitle">{isSignUp ? "Start building your academic signal." : "Continue to your student workspace."}</p>{isSignUp && <Field icon={UserRound} label="Full name" type="text" autoComplete="name" placeholder="Your full name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />}{!isSignUp && <Field icon={Mail} label="Work email" type="email" autoComplete="email" placeholder="name@work-email.com" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />}{isSignUp && <Field icon={Mail} label="Work email" type="email" autoComplete="email" placeholder="name@work-email.com" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />}<Field icon={LockKeyhole} label="Password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} placeholder={isSignUp ? "Minimum 8 characters" : "Your password"} value={form.password} onChange={(value) => setForm({ ...form, password: value })} minLength={isSignUp ? 8 : undefined} />{error && <div className="auth-error" role="alert">{error}</div>}<button className="auth-submit" type="submit" disabled={busy}>{busy ? "Please wait..." : isSignUp ? "Sign Up with Email" : "Continue with Email"}<ArrowRight size={16} /></button><div className="auth-divider"><span /> <small>or continue with</small> <span /></div><button className="google-submit" type="button" onClick={startGoogleLogin}><GoogleMark /> {isSignUp ? "Sign up with Google" : "Continue with Google"}</button><button className="guest-submit" type="button" onClick={startGuestMode}>Continue as guest</button><p className="auth-switch">{isSignUp ? "Already have an account?" : "New to UPNEX?"} <button type="button" onClick={switchMode}>{isSignUp ? "Sign In" : "Sign Up"}</button></p><p className="auth-legal">By continuing, you agree to create a UPNEX account subject to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.</p></form></main>;
}

function Field({ icon: Icon, label, type, autoComplete, placeholder, value, onChange, minLength }) { return <label className="auth-field"><span>{label}</span><div><Icon size={16} aria-hidden="true" /><input required type={type} autoComplete={autoComplete} placeholder={placeholder} value={value} minLength={minLength} onChange={(event) => onChange(event.target.value)} /></div></label>; }

function GoogleMark() { return <span className="google-mark" aria-hidden="true">G</span>; }
