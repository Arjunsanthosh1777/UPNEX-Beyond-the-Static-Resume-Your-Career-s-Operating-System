import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await register(form.name, form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create account.");
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-background" />
      <Link to="/" className="auth-logo"><span className="brand-mark">U</span> UPNEX</Link>
      <div className="auth-layout">
        <div className="auth-promo">
          <div className="eyebrow"><span /> START YOUR JOURNEY</div>
          <h1>BUILD THE<br /><span>FUTURE YOU.</span></h1>
          <p>Create your personalized learning identity inside UPNEX.</p>
        </div>
        <form className="auth-card" onSubmit={submit}>
          <h2>Create your account</h2>
          <p>Join the smart education ecosystem.</p>
          <label>Name</label>
          <div className="input-wrap"><UserRound size={17} /><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your name" /></div>
          <label>Email</label>
          <div className="input-wrap"><Mail size={17} /><input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" /></div>
          <label>Password</label>
          <div className="input-wrap"><LockKeyhole size={17} /><input type="password" minLength="8" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Minimum 8 characters" /></div>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-btn full">Create Account <ArrowRight size={18} /></button>
          <p className="auth-bottom">Already have an account? <Link to="/">Return to UPNEX →</Link></p>
        </form>
      </div>
    </main>
  );
}