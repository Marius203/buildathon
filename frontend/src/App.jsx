import { useState, useRef, useEffect } from "react";
import "./ElectricCastle.css";
import bubbleLogo from "./images/logo.jpg"; // Asigură-te că imaginea e la locul ei

// ─── Config ───────────────────────────────────────────────────────────────────

const API_URL = "http://localhost:8000";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function getToken()     { return localStorage.getItem("ec_token"); }
function getUserEmail() { return localStorage.getItem("ec_email"); }
function isAdmin()      { return localStorage.getItem("ec_role") === "admin"; }

function getSessionId() {
  let sid = localStorage.getItem("ec_session_id");
  if (!sid) {
    sid = "session-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    localStorage.setItem("ec_session_id", sid);
  }
  return sid;
}

function logout() {
  localStorage.removeItem("ec_token");
  localStorage.removeItem("ec_email");
  localStorage.removeItem("ec_role");
}

// Auto-register/login un guest user la primul mesaj
async function ensureAuth() {
  if (getToken()) return true;
  const credentials = { email: "user@gmail.com", password: "testparola123" };
  
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    
    if (res.ok || res.status === 400) { 
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials)
        });
        const loginData = await loginRes.json();
        if (loginData.access_token) {
            localStorage.setItem("ec_token", loginData.access_token);
            localStorage.setItem("ec_email", "user@gmail.com");
            localStorage.setItem("ec_role", "user");
            return true;
        }
    }
  } catch (e) {
    console.error("Auth error:", e);
  }
  return false;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_NOTIFICATIONS = [
  { id: 1, text: "🎵 Line-up complet anunțat! Verifică artiștii tăi favoriți", time: "acum 2 min", read: false },
  { id: 2, text: "🚌 Shuttle-urile din Cluj sunt aproape sold out!", time: "acum 1h",  read: false },
  { id: 3, text: "⛺ Locuri de glamping disponibile – rezervă acum",              time: "acum 3h",  read: true  },
];

const NAV_LINKS = ["Tickets", "Info", "Artists", "Gallery", "Contact"];

const STAGES = [
  { label: "Main Stage",     cls: "ec-lineup__stage ec-lineup__stage--featured" },
  { label: "Forest Stage",   cls: "ec-lineup__stage ec-lineup__stage--mid"      },
  { label: "Electric Stage", cls: "ec-lineup__stage ec-lineup__stage--mid"      },
  { label: "Live Stage",     cls: "ec-lineup__stage ec-lineup__stage--sm"       },
  { label: "Secret Stage",   cls: "ec-lineup__stage ec-lineup__stage--sm"       },
];

const INFO_CARDS = [
  { icon: "🚌", title: "Transport", desc: "Shuttle din Cluj direct la Bonțida. Simplu și fără stres de parcare." },
  { icon: "🏕️", title: "Cazare",   desc: "Camping, glamping sau hotel în Cluj. Există o opțiune pentru fiecare." },
  { icon: "🎵", title: "Muzică",   desc: "5 scene, genuri diferite, energie non-stop 4 zile și 4 nopți." },
  { icon: "🌧️", title: "Vreme",   desc: "Ploaia face parte din experiență. Cizmele de cauciuc sunt cool." },
];

const CHIPS = ["🚌 Transport", "🏕️ Cazare", "💰 Buget", "🌧️ Vreme"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}

// ─── Auth Modal (Login / Register) ───────────────────────────────────────────

function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode]       = useState("login"); // "login" | "register"
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        const r = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d.detail || "Eroare la înregistrare");
        }
      }

      // Login
      const r2 = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!r2.ok) {
        const d = await r2.json();
        throw new Error(d.detail || "Email sau parolă greșită");
      }
      
      const data = await r2.json();
      localStorage.setItem("ec_token", data.access_token);
      localStorage.setItem("ec_email", email);
      
      // FIX PENTRU ADMIN: Verificam daca emailul contine "admin"
      let userRole = data.role;
      if (!userRole && email.toLowerCase().includes("admin")) {
        userRole = "admin";
      } else if (!userRole) {
        userRole = "user";
      }
      
      localStorage.setItem("ec_role", userRole);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }}>
      <div style={{
        background: "var(--ec-white)", border: "3px solid var(--ec-black)",
        boxShadow: "8px 8px 0 var(--ec-black)", width: "100%", maxWidth: "420px",
        fontFamily: "Inter, sans-serif",
      }}>
        {/* Header */}
        <div style={{ background: "var(--ec-red)", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#fff", fontFamily: "Oswald, sans-serif", fontSize: "20px", fontWeight: "bold", letterSpacing: "1px" }}>
            {mode === "login" ? "LOGIN" : "REGISTER"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontWeight: "bold", fontSize: "13px", marginBottom: "6px", color: "var(--ec-black)", letterSpacing: "0.5px" }}>EMAIL</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: "100%", padding: "12px 14px", border: "2px solid var(--ec-black)", outline: "none", fontSize: "15px", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }}
              placeholder="email@exemplu.com"
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "bold", fontSize: "13px", marginBottom: "6px", color: "var(--ec-black)", letterSpacing: "0.5px" }}>PAROLĂ</label>
            <input
              type="password" value={password} onChange={e => setPass(e.target.value)} required minLength={6}
              style={{ width: "100%", padding: "12px 14px", border: "2px solid var(--ec-black)", outline: "none", fontSize: "15px", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{ background: "#fff0f0", border: "2px solid var(--ec-red)", padding: "10px 14px", color: "var(--ec-red)", fontSize: "13px", fontWeight: "bold" }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{ background: loading ? "#888" : "var(--ec-red)", color: "#fff", border: "2px solid var(--ec-black)", padding: "14px", fontFamily: "Oswald, sans-serif", fontSize: "18px", fontWeight: "bold", letterSpacing: "1px", cursor: loading ? "not-allowed" : "pointer", boxShadow: "4px 4px 0 var(--ec-black)" }}
          >
            {loading ? "SE PROCESEAZĂ..." : mode === "login" ? "INTRĂ ÎN CONT" : "CREEAZĂ CONT"}
          </button>

          <p style={{ textAlign: "center", fontSize: "14px", color: "#555", margin: 0 }}>
            {mode === "login" ? "Nu ai cont? " : "Ai deja cont? "}
            <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              style={{ background: "none", border: "none", color: "var(--ec-red)", fontWeight: "bold", cursor: "pointer", fontSize: "14px", padding: 0 }}>
              {mode === "login" ? "Înregistrează-te" : "Loghează-te"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────

function AdminPanel({ onClose }) {
  const [tab, setTab]             = useState("stats");   // "stats" | "upload"
  const [stats, setStats]         = useState(null);
  const [statsLoading, setStatsL] = useState(true);
  const [statsError, setStatsErr] = useState("");
  const [files, setFiles]         = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileInputRef              = useRef(null);

  // Load stats on mount
  useEffect(() => {
    async function fetchStats() {
      try {
        const r = await fetch(`${API_URL}/admin/stats`, {
          headers: { authorization: `Bearer ${getToken()}` },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setStats(await r.json());
      } catch (e) {
        setStatsErr("Nu s-au putut încărca statisticile: " + e.message);
      } finally {
        setStatsL(false);
      }
    }
    fetchStats();
  }, []);

  async function handleExport() {
    try {
      const r = await fetch(`${API_URL}/admin/export`, {
        headers: { authorization: `Bearer ${getToken()}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `ec-stats-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export eșuat: " + e.message);
    }
  }

  async function handleUpload() {
    if (!files.length) return;
    setUploading(true);
    setUploadMsg("");
    const form = new FormData();
    Array.from(files).forEach(f => form.append("files", f));
    try {
      const r = await fetch(`${API_URL}/admin/upload`, {
        method: "POST",
        headers: { authorization: `Bearer ${getToken()}` },
        body: form,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setUploadMsg(`✅ ${d.message || "Fișiere încărcate cu succes!"}`);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setUploadMsg("❌ Upload eșuat: " + e.message);
    } finally {
      setUploading(false);
    }
  }

  const statCards = stats ? [
    { label: "Total mesaje",      value: stats.total_messages   ?? "—", icon: "💬" },
    { label: "Sesiuni active",    value: stats.active_sessions  ?? "—", icon: "👥" },
    { label: "Utilizatori",       value: stats.total_users      ?? "—", icon: "🙋" },
    { label: "Întrebări azi",     value: stats.messages_today   ?? "—", icon: "📅" },
  ] : [];

  const topQuestions = stats?.top_questions ?? [];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: "16px", boxSizing: "border-box",
    }}>
      <div style={{
        background: "#f5f5f5", border: "3px solid var(--ec-black)",
        boxShadow: "10px 10px 0 var(--ec-black)", width: "100%", maxWidth: "820px",
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        fontFamily: "Inter, sans-serif",
      }}>
        {/* Header */}
        <div style={{ background: "var(--ec-black)", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ color: "var(--ec-red)", fontFamily: "Oswald, sans-serif", fontSize: "22px", fontWeight: "bold", letterSpacing: "2px" }}>⚡ ADMIN</span>
            <span style={{ color: "#666", fontSize: "13px" }}>Electric Castle Dashboard</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: "22px", cursor: "pointer" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "3px solid var(--ec-black)", flexShrink: 0, background: "var(--ec-white)" }}>
          {[["stats", "📊 Statistici"], ["upload", "📁 Upload Fișiere"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: "14px 28px", border: "none", borderBottom: tab === key ? "3px solid var(--ec-red)" : "3px solid transparent",
              background: "none", fontFamily: "Oswald, sans-serif", fontSize: "15px", fontWeight: "bold",
              cursor: "pointer", color: tab === key ? "var(--ec-red)" : "#666", letterSpacing: "0.5px",
              marginBottom: "-3px",
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

          {/* ── STATS TAB ── */}
          {tab === "stats" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {statsLoading && <p style={{ color: "#888", textAlign: "center", padding: "40px" }}>Se încarcă statisticile...</p>}
              {statsError  && <p style={{ color: "var(--ec-red)", fontWeight: "bold" }}>⚠️ {statsError}</p>}

              {stats && (
                <>
                  {/* Stat cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
                    {statCards.map(s => (
                      <div key={s.label} style={{
                        background: "var(--ec-white)", border: "2px solid var(--ec-black)",
                        boxShadow: "4px 4px 0 var(--ec-black)", padding: "20px 16px", textAlign: "center",
                      }}>
                        <div style={{ fontSize: "28px", marginBottom: "8px" }}>{s.icon}</div>
                        <div style={{ fontSize: "32px", fontWeight: "bold", fontFamily: "Oswald, sans-serif", color: "var(--ec-red)" }}>{s.value}</div>
                        <div style={{ fontSize: "12px", color: "#888", marginTop: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Top questions */}
                  {topQuestions.length > 0 && (
                    <div style={{ background: "var(--ec-white)", border: "2px solid var(--ec-black)", boxShadow: "4px 4px 0 var(--ec-black)", padding: "20px" }}>
                      <h3 style={{ fontFamily: "Oswald, sans-serif", fontSize: "16px", marginBottom: "16px", color: "var(--ec-black)", letterSpacing: "1px" }}>
                        🔥 TOP ÎNTREBĂRI
                      </h3>
                      {topQuestions.map((q, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: i < topQuestions.length - 1 ? "1px solid #eee" : "none" }}>
                          <span style={{ background: "var(--ec-red)", color: "#fff", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold", flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ flex: 1, fontSize: "14px", color: "var(--ec-black)" }}>{q.question || q}</span>
                          {q.count && <span style={{ fontSize: "12px", color: "#888", fontWeight: "bold" }}>×{q.count}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Export button */}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={handleExport} style={{
                      background: "var(--ec-black)", color: "#fff", border: "2px solid var(--ec-black)",
                      boxShadow: "4px 4px 0 #555", padding: "12px 28px",
                      fontFamily: "Oswald, sans-serif", fontSize: "16px", fontWeight: "bold",
                      letterSpacing: "1px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
                    }}>
                      ⬇️ EXPORT CSV
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── UPLOAD TAB ── */}
          {tab === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <p style={{ fontSize: "14px", color: "#555", margin: 0 }}>
                Încarcă fișiere (imagini, PDF-uri, documente) direct în knowledge base-ul backend-ului.
              </p>

              {/* Drop zone */}
              <label style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                border: "3px dashed var(--ec-black)", background: files.length ? "#f0fff4" : "var(--ec-white)",
                padding: "40px 24px", cursor: "pointer", gap: "12px", transition: "background 0.2s",
              }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); setFiles(e.dataTransfer.files); setUploadMsg(""); }}
              >
                <input
                  ref={fileInputRef} type="file" multiple
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json"
                  style={{ display: "none" }}
                  onChange={e => { setFiles(e.target.files); setUploadMsg(""); }}
                />
                <span style={{ fontSize: "40px" }}>📂</span>
                <span style={{ fontFamily: "Oswald, sans-serif", fontSize: "18px", fontWeight: "bold", color: "var(--ec-black)" }}>
                  DRAG & DROP sau click să selectezi
                </span>
                <span style={{ fontSize: "13px", color: "#888" }}>
                  JPG, PNG, PDF, DOC, TXT, CSV, JSON
                </span>
              </label>

              {/* File list */}
              {files.length > 0 && (
                <div style={{ background: "var(--ec-white)", border: "2px solid var(--ec-black)", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontWeight: "bold", fontSize: "13px", color: "#888", letterSpacing: "0.5px", textTransform: "uppercase" }}>{files.length} fișier(e) selectat(e):</span>
                  {Array.from(files).map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
                      <span style={{ fontSize: "18px" }}>
                        {f.type.startsWith("image/") ? "🖼️" : f.type === "application/pdf" ? "📄" : "📝"}
                      </span>
                      <span style={{ flex: 1, color: "var(--ec-black)", fontWeight: "500" }}>{f.name}</span>
                      <span style={{ color: "#888", fontSize: "12px" }}>{(f.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              )}

              {uploadMsg && (
                <div style={{
                  padding: "12px 16px", border: `2px solid ${uploadMsg.startsWith("✅") ? "#22c55e" : "var(--ec-red)"}`,
                  background: uploadMsg.startsWith("✅") ? "#f0fff4" : "#fff0f0",
                  color: uploadMsg.startsWith("✅") ? "#166534" : "var(--ec-red)",
                  fontWeight: "bold", fontSize: "14px",
                }}>
                  {uploadMsg}
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={uploading || !files.length}
                style={{
                  background: uploading || !files.length ? "#ccc" : "var(--ec-red)",
                  color: "#fff", border: "2px solid var(--ec-black)",
                  boxShadow: uploading || !files.length ? "none" : "4px 4px 0 var(--ec-black)",
                  padding: "14px", fontFamily: "Oswald, sans-serif", fontSize: "18px",
                  fontWeight: "bold", letterSpacing: "1px",
                  cursor: uploading || !files.length ? "not-allowed" : "pointer",
                }}
              >
                {uploading ? "SE TRIMITE..." : "📤 TRIMITE LA BACKEND"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── NavBar ───────────────────────────────────────────────────────────────────

function NavBar({ unread, onBellClick, onAuthClick, onAdminClick, loggedIn, children }) {
  return (
    <nav className="ec-nav">
      <div className="ec-nav__logo">
        <svg width="38" height="38" viewBox="0 0 38 38">
          <polygon points="19,2 36,10.5 36,27.5 19,36 2,27.5 2,10.5"
            fill="var(--ec-black)" stroke="var(--ec-white)" strokeWidth="2"/>
          <text x="19" y="24" textAnchor="middle" fill="var(--ec-white)"
            fontSize="12" fontFamily="Oswald, sans-serif" fontWeight="bold" letterSpacing="0.5">EC</text>
        </svg>
        <div>
          <div className="ec-nav__logo-text-top">ELECTRIC</div>
          <div className="ec-nav__logo-text-bottom">CASTLE</div>
        </div>
      </div>

      <div className="ec-nav__links">
        {NAV_LINKS.map(l => (
          <a key={l} href="#" className="ec-nav__link">{l}</a>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Admin button – only for admins */}
        {loggedIn && isAdmin() && (
          <button onClick={onAdminClick} style={{
            background: "var(--ec-red)", color: "#fff",
            border: "2px solid rgba(255,255,255,0.4)",
            padding: "6px 14px", fontFamily: "Oswald, sans-serif",
            fontSize: "13px", fontWeight: "bold", letterSpacing: "1px",
            cursor: "pointer",
          }}>
            ⚡ ADMIN
          </button>
        )}

        {/* Login / Logout */}
        <button onClick={onAuthClick} style={{
          background: "transparent", color: "var(--ec-white)",
          border: "2px solid rgba(255,255,255,0.5)",
          padding: "6px 14px", fontFamily: "Oswald, sans-serif",
          fontSize: "13px", fontWeight: "bold", letterSpacing: "1px",
          cursor: "pointer",
        }}>
          {loggedIn ? `👤 ${getUserEmail()?.split("@")[0]?.toUpperCase()}` : "LOGIN"}
        </button>

        {/* Bell */}
        <div style={{ position: "relative" }}>
          <button className="ec-nav__bell" onClick={onBellClick} aria-label="Notificări">
            <svg width="24" height="24" fill="none"
              stroke="var(--ec-white)" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unread > 0 && <span className="ec-nav__bell-badge">{unread}</span>}
          </button>
          {children}
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <div className="ec-hero">
      <div className="ec-hero__date">FIRST TIME AT THE CASTLE?</div>
      <h1 className="ec-hero__title">
        <span className="ec-hero__title-electric">ELECTRIC</span>
        <span className="ec-hero__title-castle">CASTLE</span>
      </h1>
      <div className="ec-hero__cta" style={{ marginTop: "24px" }}>
        <button className="ec-btn--outline" onClick={() => alert("Guided Planner flow coming next!")}>
          Let's build your plan
        </button>
      </div>
    </div>
  );
}

// ─── InfoSection ──────────────────────────────────────────────────────────────

function InfoSection() {
  return (
    <section className="ec-info">
      <div className="ec-info__inner">
        <h2 className="ec-info__title" style={{ color: "var(--ec-black)", marginBottom: "40px" }}>
          TOTUL ARE SENS ODATĂ CE EȘTI ACOLO
        </h2>
        <div className="ec-info__grid">
          {INFO_CARDS.map(card => (
            <div key={card.title} className="ec-info__card"
              style={{ background: "var(--ec-white)", border: "2px solid var(--ec-black)", boxShadow: "6px 6px 0px var(--ec-black)" }}>
              <div className="ec-info__card-icon">{card.icon}</div>
              <h3 className="ec-info__card-title" style={{ color: "var(--ec-red)", fontSize: "16px", fontWeight: "bold" }}>{card.title}</h3>
              <p className="ec-info__card-desc" style={{ color: "var(--ec-black)", marginTop: "10px" }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── LineupSection ────────────────────────────────────────────────────────────

function LineupSection() {
  return (
    <section className="ec-lineup" style={{ background: "var(--ec-red)", padding: "4rem 2rem" }}>
      <div className="ec-lineup__inner">
        <h2 style={{ color: "var(--ec-white)", fontFamily: "Oswald, sans-serif", fontSize: "32px", marginBottom: "20px" }}>
          DISCOVER THE STAGES
        </h2>
        <div className="ec-lineup__stages">
          {STAGES.map(s => (
            <span key={s.label} className={s.cls}
              style={{ background: "var(--ec-black)", color: "var(--ec-white)", border: "none", fontWeight: "bold" }}>
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── NotifPanel ───────────────────────────────────────────────────────────────

function NotifPanel({ notifications, onClose }) {
  return (
    <div className="ec-notif-panel">
      <div className="ec-notif-panel__header">
        <span className="ec-notif-panel__title">NOTIFICĂRI</span>
        <button className="ec-notif-panel__close" onClick={onClose}>✕</button>
      </div>
      <div className="ec-notif-panel__body">
        {notifications.map(n => (
          <div key={n.id} className={`ec-notif-item ${!n.read ? "ec-notif-item--unread" : ""}`}>
            {!n.read ? <div className="ec-notif-item__dot"/> : <div className="ec-notif-item__dot-placeholder"/>}
            <div className="ec-notif-item__content">
              <p className="ec-notif-item__text">{n.text}</p>
              <span className="ec-notif-item__time">{n.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AiBubble ─────────────────────────────────────────────────────────────────

function AiBubble({ chatOpen, bubbleHint, onToggle }) {
  return (
    <div className="ec-bubble-wrap" style={{ position: "fixed", bottom: "30px", right: "30px", zIndex: 1000 }}>
      {bubbleHint && !chatOpen && (
        <div style={{
          position: "absolute", bottom: "90px", right: "0",
          background: "var(--ec-white)", color: "var(--ec-black)",
          border: "3px solid var(--ec-black)", boxShadow: "6px 6px 0px var(--ec-black)",
          padding: "12px 20px", fontWeight: "bold", whiteSpace: "nowrap",
          fontSize: "14px", fontFamily: "Inter, sans-serif",
        }}>
          Hei, prima oară la EC? 👋
          <div style={{
            position: "absolute", bottom: "-8px", right: "26px",
            width: "12px", height: "12px", background: "var(--ec-white)",
            borderBottom: "3px solid var(--ec-black)", borderRight: "3px solid var(--ec-black)",
            transform: "rotate(45deg)",
          }}/>
        </div>
      )}
      <button
        onClick={onToggle}
        style={{
          width: "75px", height: "75px", borderRadius: "50%",
          border: "3px solid var(--ec-black)", boxShadow: "6px 6px 0px var(--ec-black)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", transition: "transform 0.2s, background-image 0.2s",
          transform: chatOpen ? "scale(0.9)" : "scale(1)",
          backgroundImage: chatOpen ? "none" : `url(${bubbleLogo})`,
          backgroundSize: "110%", backgroundPosition: "center", backgroundRepeat: "no-repeat",
          backgroundColor: chatOpen ? "var(--ec-black)" : "transparent",
        }}
        onMouseOver={e => !chatOpen && (e.currentTarget.style.transform = "scale(1.05)")}
        onMouseOut={e => !chatOpen && (e.currentTarget.style.transform = "scale(1)")}
        aria-label="Deschide asistentul EC"
      >
        {chatOpen && (
          <svg width="32" height="32" fill="none" stroke="var(--ec-white)" strokeWidth="3" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        )}
      </button>
    </div>
  );
}

// ─── ChatWindow ───────────────────────────────────────────────────────────────

function ChatWindow({ messages, typing, input, onInputChange, onSend, onKeyDown, onChip, messagesEndRef }) {
  return (
    <div className="ec-chat">
      <div className="ec-chat__header">
        <div className="ec-chat__avatar" style={{ background: "var(--ec-black)", border: "1px solid var(--ec-white)", boxShadow: "none" }}>🏰</div>
        <div style={{ flex: 1 }}>
          <div className="ec-chat__header-name">First-Timer AI</div>
          <div className="ec-chat__header-status">
            <div className="ec-chat__status-dot"/>
            Online acum
          </div>
        </div>
      </div>

      <div className="ec-chat__messages">
        {messages.map((msg, i) => (
          <div key={i} className={`ec-chat__msg-row ec-chat__msg-row--${msg.role}`}>
            {msg.role === "ai" && (
              <div className="ec-chat__msg-avatar" style={{ background: "var(--ec-black)", boxShadow: "none" }}>🏰</div>
            )}
            <div
              className={`ec-chat__bubble ec-chat__bubble--${msg.role}`}
              dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
            />
          </div>
        ))}
        {typing && (
          <div className="ec-chat__msg-row ec-chat__msg-row--ai">
            <div className="ec-chat__msg-avatar" style={{ background: "var(--ec-black)", boxShadow: "none" }}>🏰</div>
            <div className="ec-chat__typing" style={{ background: "var(--ec-light-gray)", border: "1px solid var(--ec-black)", borderRadius: "0" }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="ec-chat__typing-dot"
                  style={{ animationDelay: `${i * 0.15}s`, background: "var(--ec-black)" }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef}/>
      </div>

      <div className="ec-chat__chips">
        {CHIPS.map(chip => {
          const label = chip.slice(3).trim();
          return (
            <button key={chip} className="ec-chat__chip" onClick={() => onChip(label)}
              style={{ background: "var(--ec-black)", color: "var(--ec-white)", border: "none", borderRadius: "0" }}>
              {chip}
            </button>
          );
        })}
      </div>

      <div className="ec-chat__input-row">
        <input
          className="ec-chat__input"
          value={input}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          placeholder="Întreabă orice despre EC..."
          style={{ background: "var(--ec-light-gray)", color: "var(--ec-black)", border: "2px solid var(--ec-black)", borderRadius: "0" }}
        />
        <button className="ec-chat__send" onClick={() => onSend()}
          style={{ background: "var(--ec-red)", border: "2px solid var(--ec-black)", borderRadius: "0", boxShadow: "none" }}>
          <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [chatOpen, setChatOpen]           = useState(false);
  const [notifOpen, setNotifOpen]         = useState(false);
  const [bubbleHint, setBubbleHint]       = useState(true);
  const [input, setInput]                 = useState("");
  const [typing, setTyping]               = useState(false);
  const [unread, setUnread]               = useState(2);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [messages, setMessages]           = useState([
    { role: "ai", text: "Hei! 👋 Sunt asistentul tău EC. Prima dată la festival? Spune-mi cu ce te pot ajuta – transport, cazare, buget, muzică sau orice altceva!" },
  ]);
  const [showAuth, setShowAuth]   = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [loggedIn, setLoggedIn]   = useState(!!getToken());
  const messagesEndRef            = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    const t = setTimeout(() => setBubbleHint(false), 6000);
    return () => clearTimeout(t);
  }, []);

  async function sendMessage(overrideText) {
    const userMsg = (overrideText !== undefined ? overrideText : input).trim();
    if (!userMsg) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setTyping(true);
    try {
      // Asigură-te că avem token înainte de primul mesaj
      const authed = await ensureAuth();
      if (!authed) throw new Error("Auth failed");

      const res = await fetch(`${API_URL}/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "authorization": `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          session_id: getSessionId(),
          message: userMsg,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTyping(false);
      setMessages(prev => [...prev, { role: "ai", text: data.agent_response }]);
    } catch (err) {
      console.error("Chat error:", err);
      setTyping(false);
      setMessages(prev => [...prev, { role: "ai", text: "❌ Eroare de conexiune. Verifică că backend-ul rulează." }]);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function handleBell() {
    setNotifOpen(prev => !prev);
    setChatOpen(false);
    if (!notifOpen) {
      setUnread(0);
      setNotifications(n => n.map(x => ({ ...x, read: true })));
    }
  }

  function handleBubble() {
    setChatOpen(prev => !prev);
    setNotifOpen(false);
  }

  function handleAuthClick() {
    if (loggedIn) {
      logout();
      setLoggedIn(false);
      setShowAdmin(false);
    } else {
      setShowAuth(true);
    }
  }

  function handleAuthSuccess() {
    setLoggedIn(true);
    setShowAuth(false);
  }

  return (
    <div>
      <NavBar
        unread={unread}
        onBellClick={handleBell}
        onAuthClick={handleAuthClick}
        onAdminClick={() => setShowAdmin(true)}
        loggedIn={loggedIn}
      >
        {notifOpen && (
          <NotifPanel notifications={notifications} onClose={() => setNotifOpen(false)}/>
        )}
      </NavBar>

      <Hero/>
      <InfoSection/>
      <LineupSection/>

      <AiBubble chatOpen={chatOpen} bubbleHint={bubbleHint} onToggle={handleBubble}/>

      {chatOpen && (
        <ChatWindow
          messages={messages}
          typing={typing}
          input={input}
          onInputChange={e => setInput(e.target.value)}
          onSend={sendMessage}
          onKeyDown={handleKey}
          onChip={sendMessage}
          messagesEndRef={messagesEndRef}
        />
      )}

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess}/>
      )}

      {showAdmin && (
        <AdminPanel onClose={() => setShowAdmin(false)}/>
      )}
    </div>
  );
}