import { useState } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Login({ offline = false, onRegisterClick }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    if (!navigator.onLine) { setMessage("Internet connection required."); return; }
    setMessage("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (err) {
      setMessage(err.message || "Unable to log in. Please try again.");
    } finally { setLoading(false); }
  }

  return <section className="auth-page"><span className="eyebrow">WELCOME BACK</span><h2>Sign in to your account</h2><p>Ready to get your next project started?</p>
    <form onSubmit={handleLogin}><label htmlFor="login-email">Email address</label><input id="login-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
      <label htmlFor="login-password">Password</label><div className="password-field"><input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div>
      {message && <p className="auth-message error-message" role="alert">{message}</p>}
      <button className="auth-submit" type="submit" disabled={loading || offline} title={offline ? "Internet connection required" : undefined}>{loading ? "Signing in..." : <>Sign in <ArrowRight size={18}/></>}</button></form>
    <p className="auth-switch">New to HardwareHub? <button type="button" onClick={onRegisterClick}>Create an account</button></p>
  </section>;
}
