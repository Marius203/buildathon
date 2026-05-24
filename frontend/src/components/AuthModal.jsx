import { useState } from "react";
import { API_URL } from "../utils";

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode]       = useState("login");
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "register") {
        const r = await fetch(`${API_URL}/auth/register`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Eroare la înregistrare"); }
      }
      const r2 = await fetch(`${API_URL}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!r2.ok) { const d = await r2.json(); throw new Error(d.detail || "Email sau parolă greșită"); }
      const data = await r2.json();
      localStorage.setItem("ec_token", data.access_token);
      localStorage.setItem("ec_email", email);
      let userRole = data.role;
      if (!userRole && email.toLowerCase().includes("admin")) userRole = "admin";
      else if (!userRole) userRole = "user";
      localStorage.setItem("ec_role", userRole);
      onSuccess();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="ec-modal-backdrop">
      <div className="ec-modal">
        <div className="ec-modal__header">
          <span className="ec-modal__title">{mode === "login" ? "LOGIN" : "REGISTER"}</span>
          <button onClick={onClose} className="ec-modal__close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="ec-modal__form">
          <div className="ec-modal__field">
            <label className="ec-modal__label">EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              required className="ec-modal__input" placeholder="email@exemplu.com"/>
          </div>
          <div className="ec-modal__field">
            <label className="ec-modal__label">PAROLĂ</label>
            <input type="password" value={password} onChange={e => setPass(e.target.value)}
              required minLength={6} className="ec-modal__input" placeholder="••••••••"/>
          </div>
          {error && <div className="ec-modal__error">⚠️ {error}</div>}
          <button type="submit" disabled={loading} className="ec-modal__submit">
            {loading ? "SE PROCESEAZĂ..." : mode === "login" ? "INTRĂ ÎN CONT" : "CREEAZĂ CONT"}
          </button>
          <p className="ec-modal__switch">
            {mode === "login" ? "Nu ai cont? " : "Ai deja cont? "}
            <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="ec-modal__switch-btn">
              {mode === "login" ? "Înregistrează-te" : "Loghează-te"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
