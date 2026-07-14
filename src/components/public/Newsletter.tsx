import { useState } from "react";
import { toast } from "sonner";

export function Newsletter() {
  const [email, setEmail] = useState("");
  return (
    <div className="wrap"><div className="news">
      <div className="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></div>
      <h3>Stay in the loop</h3>
      <p>Monthly notes on features, study craft, and product thinking. No spam, ever.</p>
      <form className="news__form" onSubmit={(e) => { e.preventDefault(); if (!email) return; toast.success("Thanks — we'll be in touch."); setEmail(""); }}>
        <input className="input" placeholder="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn btn--ink" type="submit">Subscribe</button>
      </form>
    </div></div>
  );
}
