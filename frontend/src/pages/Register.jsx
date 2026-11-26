import { useState } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Register({ offline = false, onLoginClick }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();
    if (!navigator.onLine) { setMessage("Internet connection required."); return; }
    setError(""); setMessage(""); setLoading(true);
    try {
      const { data, error: signupError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() } } });
      if (signupError) throw signupError;
      setMessage(data.session ? "Account created! Opening your store..." : "Account created. Sign in to continue, or check your email if confirmation is required.");
    } catch (err) { setError(err.message || "Unable to create your account."); }
    finally { setLoading(false); }
  }

  return <section className="auth-page"><span className="eyebrow">JOIN THE COMMUNITY</span><h2>Create your account</h2><p>Your next project begins here.</p>
    <form onSubmit={handleRegister}><label htmlFor="register-name">Full name</label><input id="register-name" type="text" autoComplete="name" placeholder="Your full name" minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value)} required />
      <label htmlFor="register-email">Email address</label><input id="register-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
      <label htmlFor="register-password">Password</label><div className="password-field"><input id="register-password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div>
      {error && <p className="auth-message error-message" role="alert">{error}</p>}{message && <p className="auth-message success-message" role="status">{message}</p>}
      <button className="auth-submit" type="submit" disabled={loading || offline} title={offline ? "Internet connection required" : undefined}>{loading ? "Creating account..." : <>Create account <ArrowRight size={18}/></>}</button></form>
    <p className="auth-switch">Already have an account? <button type="button" onClick={onLoginClick}>Sign in</button></p>
  </section>;
}
