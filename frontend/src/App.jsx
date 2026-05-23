import { useState, useRef, useEffect, useCallback } from "react";
import "./ElectricCastle.css";
import bubbleLogo from "./images/logo.jpg";
import chatAvatar from "./images/logo.jpg";

// ─── Config ───────────────────────────────────────────────────────────────────

const API_URL = "http://localhost:8001";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function getToken() { return localStorage.getItem("ec_token"); }
function getUserEmail() { return localStorage.getItem("ec_email"); }
function isAdmin() { return localStorage.getItem("ec_role") === "admin"; }

function getSessionId() {
  if (!window._ecSessionId) {
    window._ecSessionId = "session-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  }
  return window._ecSessionId;
}

function logout() {
  localStorage.removeItem("ec_token");
  localStorage.removeItem("ec_email");
  localStorage.removeItem("ec_role");
}

async function ensureAuth() {
  if (getToken()) return true;
  const credentials = { email: "user@gmail.com", password: "testparola123" };
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    if (res.ok || res.status === 400) {
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const loginData = await loginRes.json();
      if (loginData.access_token) {
        localStorage.setItem("ec_token", loginData.access_token);
        localStorage.setItem("ec_email", "user@gmail.com");
        localStorage.setItem("ec_role", "user");
        return true;
      }
    }
  } catch (e) { console.error("Auth error:", e); }
  return false;
}

function authHeaders() {
  return { "Content-Type": "application/json", authorization: `Bearer ${getToken()}` };
}

// ─── Sunet notificare ─────────────────────────────────────────────────────────

function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) { /* browser poate bloca AudioContext fara interactiune */ }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_NOTIFICATIONS = [
  { id: 1, text: "🎵 Line-up complet anunțat! Verifică artiștii tăi favoriți", time: "acum 2 min", read: false },
  { id: 2, text: "🚌 Shuttle-urile din Cluj sunt aproape sold out!", time: "acum 1h", read: false },
  { id: 3, text: "⛺ Locuri de glamping disponibile – rezervă acum", time: "acum 3h", read: true },
];

const NAV_LINKS = ["Tickets", "Info", "Artists", "Gallery", "Contact"];

const STAGES = [
  { label: "Main Stage", cls: "ec-lineup__stage ec-lineup__stage--featured" },
  { label: "Forest Stage", cls: "ec-lineup__stage ec-lineup__stage--mid" },
  { label: "Electric Stage", cls: "ec-lineup__stage ec-lineup__stage--mid" },
  { label: "Live Stage", cls: "ec-lineup__stage ec-lineup__stage--sm" },
  { label: "Secret Stage", cls: "ec-lineup__stage ec-lineup__stage--sm" },
];

const INFO_CARDS = [
  { icon: "🚌", title: "Transport", desc: "Shuttle din Cluj direct la Bonțida. Simplu și fără stres de parcare." },
  { icon: "🏕️", title: "Cazare", desc: "Camping, glamping sau hotel în Cluj. Există o opțiune pentru fiecare." },
  { icon: "🎵", title: "Muzică", desc: "5 scene, genuri diferite, energie non-stop 4 zile și 4 nopți." },
  { icon: "🌧️", title: "Vreme", desc: "Ploaia face parte din experiență. Cizmele de cauciuc sunt cool." },
];

const CHIPS = ["🚌 Transport", "🏕️ Cazare", "💰 Buget", "🌧️ Vreme"];

const CATEGORY_COLORS = {
  transport: "#3b82f6", cazare: "#22c55e", buget: "#f59e0b",
  vreme: "#6366f1", muzica: "#ec4899", acces: "#14b8a6", altele: "#94a3b8",
};

const POLL_INTERVAL = 30000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}

// Cheap heuristic mirroring backend lang_detect: pick "ro" if RO diacritics or
// common RO function words are present, else "en". Used only for the thinking
// indicator label, the real classification happens on the agent (Claude).
function detectLangClient(text) {
  if (!text) return "en";
  if (/[ăâîșțĂÂÎȘȚ]/.test(text)) return "ro";
  const tokens = new Set((text.toLowerCase().match(/[a-zăâîșț]+/gu) || []));
  const ro = ["si", "cu", "la", "in", "nu", "ca", "de", "pe", "ce", "cum", "sunt", "pentru", "din", "pana", "vreau", "pot", "trebuie", "ajung", "aduc", "bilet", "bilete", "cazare", "cort", "salut", "multumesc", "buna"];
  return ro.some(w => tokens.has(w)) ? "ro" : "en";
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────

function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [error, setError] = useState("");
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

  const inputStyle = { width: "100%", padding: "12px 14px", border: "2px solid var(--ec-black)", outline: "none", fontSize: "15px", boxSizing: "border-box", fontFamily: "Inter, sans-serif" };
  const labelStyle = { display: "block", fontWeight: "bold", fontSize: "13px", marginBottom: "6px", color: "var(--ec-black)", letterSpacing: "0.5px" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <div style={{ background: "var(--ec-white)", border: "3px solid var(--ec-black)", boxShadow: "8px 8px 0 var(--ec-black)", width: "100%", maxWidth: "420px", fontFamily: "Inter, sans-serif" }}>
        <div style={{ background: "var(--ec-red)", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#fff", fontFamily: "Oswald, sans-serif", fontSize: "20px", fontWeight: "bold", letterSpacing: "1px" }}>
            {mode === "login" ? "LOGIN" : "REGISTER"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div><label style={labelStyle}>EMAIL</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="email@exemplu.com" /></div>
          <div><label style={labelStyle}>PAROLĂ</label><input type="password" value={password} onChange={e => setPass(e.target.value)} required minLength={6} style={inputStyle} placeholder="••••••••" /></div>
          {error && <div style={{ background: "#fff0f0", border: "2px solid var(--ec-red)", padding: "10px 14px", color: "var(--ec-red)", fontSize: "13px", fontWeight: "bold" }}>⚠️ {error}</div>}
          <button type="submit" disabled={loading} style={{ background: loading ? "#888" : "var(--ec-red)", color: "#fff", border: "2px solid var(--ec-black)", padding: "14px", fontFamily: "Oswald, sans-serif", fontSize: "18px", fontWeight: "bold", letterSpacing: "1px", cursor: loading ? "not-allowed" : "pointer", boxShadow: "4px 4px 0 var(--ec-black)" }}>
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
  const [tab, setTab] = useState("stats");

  // Stats
  const [stats, setStats] = useState(null);
  const [hourly, setHourly] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statsLoading, setStatsL] = useState(true);
  const [statsError, setStatsErr] = useState("");

  // Unanswered + polling
  const [unanswered, setUnanswered] = useState([]);
  const [unansweredLoad, setUnansLoad] = useState(false);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [newUnanswered, setNewUnanswered] = useState(0); // câte noi față de ultima verificare
  const prevCountRef = useRef(null);
  const pollTimerRef = useRef(null);

  // Favorites
  const [favorites, setFavorites] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [favsLoading, setFavsLoad] = useState(false);
  const [newFav, setNewFav] = useState("");
  const [favMsg, setFavMsg] = useState("");

  // Upload
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileInputRef = useRef(null);

  // ── Polling pentru unanswered count ──
  const pollUnanswered = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/admin/stats`, { headers: authHeaders() });
      if (!r.ok) return;
      const data = await r.json();
      const count = data.unanswered_count ?? 0;
      setUnansweredCount(count);
      if (prevCountRef.current !== null && count > prevCountRef.current) {
        const diff = count - prevCountRef.current;
        setNewUnanswered(diff);
        playNotifSound();
        // Reset badge dupa 5 secunde
        setTimeout(() => setNewUnanswered(0), 5000);
      }
      prevCountRef.current = count;
    } catch (e) { /* silently fail */ }
  }, []);

  // Porneste polling cand panoul e deschis
  useEffect(() => {
    pollUnanswered(); // primul check imediat
    pollTimerRef.current = setInterval(pollUnanswered, POLL_INTERVAL);
    return () => clearInterval(pollTimerRef.current);
  }, [pollUnanswered]);

  // ── Fetch stats on mount ──
  useEffect(() => {
    async function fetchAll() {
      try {
        const [sRes, hRes, cRes] = await Promise.all([
          fetch(`${API_URL}/admin/stats`, { headers: authHeaders() }),
          fetch(`${API_URL}/admin/stats/hourly`, { headers: authHeaders() }),
          fetch(`${API_URL}/admin/stats/categories`, { headers: authHeaders() }),
        ]);
        if (sRes.ok) {
          const d = await sRes.json();
          setStats(d);
          setUnansweredCount(d.unanswered_count ?? 0);
          prevCountRef.current = d.unanswered_count ?? 0;
        } else setStatsErr(`HTTP ${sRes.status}`);
        if (hRes.ok) setHourly((await hRes.json()).hourly || []);
        if (cRes.ok) setCategories((await cRes.json()).categories || []);
      } catch (e) { setStatsErr(e.message); }
      finally { setStatsL(false); }
    }
    fetchAll();
  }, []);

  // ── Fetch unanswered when tab changes ──
  useEffect(() => {
    if (tab !== "unanswered") return;
    loadUnanswered();
  }, [tab]);

  // ── Fetch favorites when tab changes ──
  useEffect(() => {
    if (tab !== "favorites") return;
    fetchFavorites();
  }, [tab]);

  async function loadUnanswered() {
    setUnansLoad(true);
    try {
      const r = await fetch(`${API_URL}/admin/unanswered`, { headers: authHeaders() });
      const d = await r.json();
      setUnanswered(d.unanswered || []);
    } finally { setUnansLoad(false); }
  }

  async function fetchFavorites() {
    setFavsLoad(true);
    try {
      const [fRes, sRes] = await Promise.all([
        fetch(`${API_URL}/admin/favorites`, { headers: authHeaders() }),
        fetch(`${API_URL}/admin/favorites/suggestions`, { headers: authHeaders() }),
      ]);
      if (fRes.ok) setFavorites((await fRes.json()).favorites || []);
      if (sRes.ok) setSuggestions((await sRes.json()).suggestions || []);
    } finally { setFavsLoad(false); }
  }

  async function addFavorite(question) {
    setFavMsg("");
    const r = await fetch(`${API_URL}/admin/favorites`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify({ question }),
    });
    const d = await r.json();
    if (r.ok) { setFavMsg("✅ Adăugat!"); setNewFav(""); fetchFavorites(); }
    else setFavMsg(`❌ ${d.detail}`);
  }

  async function deleteFavorite(id) {
    await fetch(`${API_URL}/admin/favorites/${id}`, { method: "DELETE", headers: authHeaders() });
    fetchFavorites();
  }

  async function handleExport() {
    try {
      const r = await fetch(`${API_URL}/admin/stats/export`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `ec-stats-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert("Export eșuat: " + e.message); }
  }

  async function handleUpload() {
    if (!files.length) return;
    setUploading(true); setUploadMsg("");
    const form = new FormData();
    Array.from(files).forEach(f => form.append("file", f));
    try {
      const r = await fetch(`${API_URL}/admin/kb/upload`, {
        method: "POST", headers: { authorization: `Bearer ${getToken()}` }, body: form,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setUploadMsg(`✅ ${d.message || "Fișiere încărcate cu succes!"}`);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) { setUploadMsg("❌ Upload eșuat: " + e.message); }
    finally { setUploading(false); }
  }

  const TABS = [
    ["stats", "📊 Statistici"],
    ["favorites", "⭐ Favorite"],
    ["unanswered", "⚠️ Fără Răspuns"],
    ["upload", "📁 Upload"],
  ];

  const panelStyle = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999, padding: "16px", boxSizing: "border-box",
  };
  const boxStyle = {
    background: "#f5f5f5", border: "3px solid var(--ec-black)",
    boxShadow: "10px 10px 0 var(--ec-black)", width: "100%", maxWidth: "900px",
    maxHeight: "90vh", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif",
  };
  const cardStyle = { background: "var(--ec-white)", border: "2px solid var(--ec-black)", boxShadow: "4px 4px 0 var(--ec-black)", padding: "20px" };
  const maxHourly = Math.max(...hourly.map(h => h.count), 1);
  const maxCat = Math.max(...categories.map(c => c.count), 1);

  return (
    <div style={panelStyle}>
      <div style={boxStyle}>
        {/* Header */}
        <div style={{ background: "var(--ec-black)", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ color: "var(--ec-red)", fontFamily: "Oswald, sans-serif", fontSize: "22px", fontWeight: "bold", letterSpacing: "2px" }}>⚡ ADMIN</span>
            <span style={{ color: "#666", fontSize: "13px" }}>Electric Castle Dashboard</span>
          </div>
          {/* Badge notificare în header */}
          {newUnanswered > 0 && (
            <div style={{
              background: "var(--ec-red)", color: "#fff", padding: "6px 14px",
              fontFamily: "Oswald, sans-serif", fontSize: "13px", fontWeight: "bold",
              letterSpacing: "0.5px", animation: "pulse 1s infinite",
              border: "2px solid rgba(255,255,255,0.3)",
            }}>
              🔔 +{newUnanswered} întrebare{newUnanswered > 1 ? "i" : ""} nouă fără răspuns
            </div>
          )}
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: "22px", cursor: "pointer" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "3px solid var(--ec-black)", flexShrink: 0, background: "var(--ec-white)", overflowX: "auto" }}>
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: "14px 22px", border: "none",
              borderBottom: tab === key ? "3px solid var(--ec-red)" : "3px solid transparent",
              background: "none", fontFamily: "Oswald, sans-serif", fontSize: "14px", fontWeight: "bold",
              cursor: "pointer", color: tab === key ? "var(--ec-red)" : "#666", letterSpacing: "0.5px",
              marginBottom: "-3px", whiteSpace: "nowrap", position: "relative",
            }}>
              {label}
              {/* Badge pe tab unanswered */}
              {key === "unanswered" && unansweredCount > 0 && (
                <span style={{
                  position: "absolute", top: "8px", right: "6px",
                  background: "var(--ec-red)", color: "#fff",
                  borderRadius: "50%", width: "18px", height: "18px",
                  fontSize: "10px", fontWeight: "bold",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "Inter, sans-serif",
                }}>{unansweredCount > 99 ? "99+" : unansweredCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

          {/* ── STATS TAB ── */}
          {tab === "stats" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {statsLoading && <p style={{ color: "#888", textAlign: "center", padding: "40px" }}>Se încarcă...</p>}
              {statsError && <p style={{ color: "var(--ec-red)", fontWeight: "bold" }}>⚠️ {statsError}</p>}
              {stats && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
                    {[
                      { icon: "💬", label: "Total mesaje", value: stats.total_messages },
                      { icon: "👥", label: "Conversații", value: stats.total_conversations },
                      { icon: "📅", label: "Conv. azi", value: stats.conversations_today },
                      { icon: "👤", label: "Useri totali", value: stats.total_users },
                      { icon: "🆕", label: "Useri noi azi", value: stats.users_today },
                      { icon: "⚠️", label: "Fără răspuns", value: unansweredCount },
                      { icon: "👍", label: "Feedback pozitiv", value: stats.feedback?.positive ?? 0 },
                      { icon: "👎", label: "Feedback negativ", value: stats.feedback?.negative ?? 0 },
                    ].map(s => (
                      <div key={s.label} style={{ ...cardStyle, textAlign: "center", padding: "16px 12px" }}>
                        <div style={{ fontSize: "24px", marginBottom: "6px" }}>{s.icon}</div>
                        <div style={{ fontSize: "28px", fontWeight: "bold", fontFamily: "Oswald, sans-serif", color: "var(--ec-red)" }}>{s.value ?? "—"}</div>
                        <div style={{ fontSize: "11px", color: "#888", marginTop: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {hourly.length > 0 && (
                    <div style={cardStyle}>
                      <h3 style={{ fontFamily: "Oswald, sans-serif", fontSize: "15px", marginBottom: "16px", color: "var(--ec-black)", letterSpacing: "1px" }}>🕐 ACTIVITATE ULTIMELE 24H</h3>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "80px" }}>
                        {hourly.map((h, i) => (
                          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                            <div style={{ width: "100%", background: h.count > 0 ? "var(--ec-red)" : "#e5e7eb", height: `${Math.max((h.count / maxHourly) * 64, h.count > 0 ? 4 : 2)}px`, transition: "height 0.3s" }} />
                            {i % 4 === 0 && <span style={{ fontSize: "9px", color: "#888", whiteSpace: "nowrap" }}>{h.hour}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {categories.length > 0 && (
                    <div style={cardStyle}>
                      <h3 style={{ fontFamily: "Oswald, sans-serif", fontSize: "15px", marginBottom: "16px", color: "var(--ec-black)", letterSpacing: "1px" }}>🏷️ CATEGORII POPULARE</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {[...categories].sort((a, b) => b.count - a.count).map(cat => (
                          <div key={cat.name} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ width: "80px", fontSize: "13px", color: "#555", textTransform: "capitalize", flexShrink: 0 }}>{cat.name}</span>
                            <div style={{ flex: 1, background: "#f0f0f0", height: "18px" }}>
                              <div style={{ width: `${(cat.count / maxCat) * 100}%`, height: "100%", background: CATEGORY_COLORS[cat.name] || "#94a3b8", transition: "width 0.4s" }} />
                            </div>
                            <span style={{ fontSize: "13px", fontWeight: "bold", color: "#333", width: "28px", textAlign: "right" }}>{cat.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={handleExport} style={{ background: "var(--ec-black)", color: "#fff", border: "2px solid var(--ec-black)", boxShadow: "4px 4px 0 #555", padding: "12px 28px", fontFamily: "Oswald, sans-serif", fontSize: "16px", fontWeight: "bold", letterSpacing: "1px", cursor: "pointer" }}>⬇️ EXPORT CSV</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── FAVORITES TAB ── */}
          {tab === "favorites" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {favsLoading && <p style={{ color: "#888", textAlign: "center" }}>Se încarcă...</p>}
              <div style={cardStyle}>
                <h3 style={{ fontFamily: "Oswald, sans-serif", fontSize: "15px", marginBottom: "14px", letterSpacing: "1px" }}>➕ ADAUGĂ ÎNTREBARE FAVORITĂ</h3>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input value={newFav} onChange={e => setNewFav(e.target.value)} placeholder="Scrie întrebarea..."
                    style={{ flex: 1, padding: "10px 14px", border: "2px solid var(--ec-black)", fontSize: "14px", outline: "none", fontFamily: "Inter, sans-serif" }}
                    onKeyDown={e => e.key === "Enter" && newFav.trim() && addFavorite(newFav.trim())} />
                  <button onClick={() => newFav.trim() && addFavorite(newFav.trim())} style={{ background: "var(--ec-red)", color: "#fff", border: "2px solid var(--ec-black)", padding: "10px 20px", fontFamily: "Oswald, sans-serif", fontSize: "15px", fontWeight: "bold", cursor: "pointer" }}>ADAUGĂ</button>
                </div>
                {favMsg && <p style={{ marginTop: "8px", fontSize: "13px", fontWeight: "bold", color: favMsg.startsWith("✅") ? "#166534" : "var(--ec-red)" }}>{favMsg}</p>}
              </div>

              {suggestions.length > 0 && (
                <div style={cardStyle}>
                  <h3 style={{ fontFamily: "Oswald, sans-serif", fontSize: "15px", marginBottom: "14px", letterSpacing: "1px" }}>💡 SUGESTII (puse de 3+ ori)</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {suggestions.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "#fffbeb", border: "1px solid #fcd34d" }}>
                        <span style={{ flex: 1, fontSize: "14px" }}>{s.question}</span>
                        <span style={{ fontSize: "12px", color: "#888", fontWeight: "bold" }}>×{s.count}</span>
                        <button onClick={() => addFavorite(s.question)} style={{ background: "var(--ec-black)", color: "#fff", border: "none", padding: "6px 12px", fontSize: "12px", fontFamily: "Oswald, sans-serif", fontWeight: "bold", cursor: "pointer" }}>+ FAVORITE</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={cardStyle}>
                <h3 style={{ fontFamily: "Oswald, sans-serif", fontSize: "15px", marginBottom: "14px", letterSpacing: "1px" }}>⭐ ÎNTREBĂRI FAVORITE ({favorites.length})</h3>
                {favorites.length === 0 && <p style={{ color: "#888", fontSize: "14px" }}>Nu există întrebări favorite încă.</p>}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {favorites.map(fav => (
                    <div key={fav._id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "#f8f8f8", border: "1px solid #e5e7eb" }}>
                      <span style={{ fontSize: "16px" }}>⭐</span>
                      <span style={{ flex: 1, fontSize: "14px" }}>{fav.question}</span>
                      <button onClick={() => deleteFavorite(fav._id)} style={{ background: "none", border: "1px solid #dc2626", color: "#dc2626", padding: "4px 10px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}>✕ ȘTERGE</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── UNANSWERED TAB ── */}
          {tab === "unanswered" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: "14px", color: "#555", margin: 0 }}>
                  Mesaje la care agentul nu a știut să răspundă.
                </p>
                <button onClick={loadUnanswered} style={{ background: "var(--ec-black)", color: "#fff", border: "none", padding: "6px 14px", fontFamily: "Oswald, sans-serif", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}>
                  🔄 REFRESH
                </button>
              </div>
              {unansweredLoad && <p style={{ color: "#888", textAlign: "center" }}>Se încarcă...</p>}
              {!unansweredLoad && unanswered.length === 0 && (
                <div style={{ ...cardStyle, textAlign: "center", color: "#22c55e", padding: "40px" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
                  <p style={{ fontFamily: "Oswald, sans-serif", fontSize: "18px", margin: 0 }}>Toate întrebările au primit răspuns!</p>
                </div>
              )}
              {unanswered.map((item, i) => (
                <div key={i} style={{ ...cardStyle, borderLeft: "4px solid var(--ec-red)" }}>
                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>
                    Session: <code style={{ background: "#f0f0f0", padding: "2px 6px" }}>{item.session_id}</code>
                  </div>
                  <p style={{ fontSize: "14px", color: "var(--ec-black)", margin: "0 0 8px 0", fontWeight: "500" }}>
                    {item.message?.content || "—"}
                  </p>
                  <div style={{ fontSize: "12px", color: "#aaa" }}>
                    {item.message?.timestamp ? new Date(item.message.timestamp).toLocaleString("ro-RO") : ""}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── UPLOAD TAB ── */}
          {tab === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <p style={{ fontSize: "14px", color: "#555", margin: 0 }}>Încarcă fișiere în knowledge base-ul backend-ului.</p>
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "3px dashed var(--ec-black)", background: files.length ? "#f0fff4" : "var(--ec-white)", padding: "40px 24px", cursor: "pointer", gap: "12px" }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); setFiles(e.dataTransfer.files); setUploadMsg(""); }}>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={e => { setFiles(e.target.files); setUploadMsg(""); }} />
                <span style={{ fontSize: "40px" }}>📂</span>
                <span style={{ fontFamily: "Oswald, sans-serif", fontSize: "18px", fontWeight: "bold", color: "var(--ec-black)" }}>DRAG & DROP sau click să selectezi</span>
                <span style={{ fontSize: "13px", color: "#888" }}>JPG, PNG, PDF, DOC, TXT</span>
              </label>

              {files.length > 0 && (
                <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontWeight: "bold", fontSize: "13px", color: "#888", textTransform: "uppercase" }}>{files.length} fișier(e):</span>
                  {Array.from(files).map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
                      <span>{f.type.startsWith("image/") ? "🖼️" : f.type === "application/pdf" ? "📄" : "📝"}</span>
                      <span style={{ flex: 1, fontWeight: "500" }}>{f.name}</span>
                      <span style={{ color: "#888", fontSize: "12px" }}>{(f.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              )}

              {uploadMsg && (
                <div style={{ padding: "12px 16px", border: `2px solid ${uploadMsg.startsWith("✅") ? "#22c55e" : "var(--ec-red)"}`, background: uploadMsg.startsWith("✅") ? "#f0fff4" : "#fff0f0", color: uploadMsg.startsWith("✅") ? "#166534" : "var(--ec-red)", fontWeight: "bold", fontSize: "14px" }}>{uploadMsg}</div>
              )}

              <button onClick={handleUpload} disabled={uploading || !files.length} style={{ background: uploading || !files.length ? "#ccc" : "var(--ec-red)", color: "#fff", border: "2px solid var(--ec-black)", boxShadow: uploading || !files.length ? "none" : "4px 4px 0 var(--ec-black)", padding: "14px", fontFamily: "Oswald, sans-serif", fontSize: "18px", fontWeight: "bold", letterSpacing: "1px", cursor: uploading || !files.length ? "not-allowed" : "pointer" }}>
                {uploading ? "SE TRIMITE..." : "📤 TRIMITE LA BACKEND"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Toast notificare colț dreapta jos ── */}
      {newUnanswered > 0 && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px",
          background: "var(--ec-black)", color: "#fff",
          border: "3px solid var(--ec-red)", boxShadow: "6px 6px 0 var(--ec-red)",
          padding: "14px 20px", fontFamily: "Inter, sans-serif",
          fontSize: "14px", fontWeight: "bold", zIndex: 10000,
          display: "flex", alignItems: "center", gap: "10px",
          animation: "slideIn 0.3s ease",
        }}>
          <span style={{ fontSize: "20px" }}>🔔</span>
          <span>+{newUnanswered} întrebare{newUnanswered > 1 ? "i" : ""} nouă fără răspuns!</span>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── NavBar ───────────────────────────────────────────────────────────────────

function NavBar({ unread, onBellClick, onAuthClick, onAdminClick, loggedIn, children }) {
  return (
    <nav className="ec-nav">
      <div className="ec-nav__logo">
        <svg width="38" height="38" viewBox="0 0 38 38">
          <polygon points="19,2 36,10.5 36,27.5 19,36 2,27.5 2,10.5" fill="var(--ec-black)" stroke="var(--ec-white)" strokeWidth="2" />
          <text x="19" y="24" textAnchor="middle" fill="var(--ec-white)" fontSize="12" fontFamily="Oswald, sans-serif" fontWeight="bold" letterSpacing="0.5">EC</text>
        </svg>
        <div>
          <div className="ec-nav__logo-text-top">ELECTRIC</div>
          <div className="ec-nav__logo-text-bottom">CASTLE</div>
        </div>
      </div>
      <div className="ec-nav__links">
        {NAV_LINKS.map(l => <a key={l} href="#" className="ec-nav__link">{l}</a>)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {loggedIn && isAdmin() && (
          <button onClick={onAdminClick} style={{ background: "var(--ec-red)", color: "#fff", border: "2px solid rgba(255,255,255,0.4)", padding: "6px 14px", fontFamily: "Oswald, sans-serif", fontSize: "13px", fontWeight: "bold", letterSpacing: "1px", cursor: "pointer" }}>
            ⚡ ADMIN
          </button>
        )}
        <button onClick={onAuthClick} style={{ background: "transparent", color: "var(--ec-white)", border: "2px solid rgba(255,255,255,0.5)", padding: "6px 14px", fontFamily: "Oswald, sans-serif", fontSize: "13px", fontWeight: "bold", letterSpacing: "1px", cursor: "pointer" }}>
          {loggedIn ? `👤 ${getUserEmail()?.split("@")[0]?.toUpperCase()}` : "LOGIN"}
        </button>
        <div style={{ position: "relative" }}>
          <button className="ec-nav__bell" onClick={onBellClick} aria-label="Notificări">
            <svg width="24" height="24" fill="none" stroke="var(--ec-white)" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unread > 0 && <span className="ec-nav__bell-badge">{unread}</span>}
          </button>
          {children}
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <div className="ec-hero">
      <div className="ec-hero__date">FIRST TIME AT THE CASTLE?</div>
      <h1 className="ec-hero__title">
        <span className="ec-hero__title-electric">ELECTRIC</span>
        <span className="ec-hero__title-castle">CASTLE</span>
      </h1>
      <div className="ec-hero__cta" style={{ marginTop: "24px" }}>
        <button className="ec-btn--outline" onClick={() => alert("Guided Planner flow coming next!")}>Let's build your plan</button>
      </div>
    </div>
  );
}

function InfoSection() {
  return (
    <section className="ec-info">
      <div className="ec-info__inner">
        <h2 className="ec-info__title" style={{ color: "var(--ec-black)", marginBottom: "40px" }}>TOTUL ARE SENS ODATĂ CE EȘTI ACOLO</h2>
        <div className="ec-info__grid">
          {INFO_CARDS.map(card => (
            <div key={card.title} className="ec-info__card" style={{ background: "var(--ec-white)", border: "2px solid var(--ec-black)", boxShadow: "6px 6px 0px var(--ec-black)" }}>
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

function LineupSection() {
  return (
    <section className="ec-lineup" style={{ background: "var(--ec-red)", padding: "4rem 2rem" }}>
      <div className="ec-lineup__inner">
        <h2 style={{ color: "var(--ec-white)", fontFamily: "Oswald, sans-serif", fontSize: "32px", marginBottom: "20px" }}>DISCOVER THE STAGES</h2>
        <div className="ec-lineup__stages">
          {STAGES.map(s => <span key={s.label} className={s.cls} style={{ background: "var(--ec-black)", color: "var(--ec-white)", border: "none", fontWeight: "bold" }}>{s.label}</span>)}
        </div>
      </div>
    </section>
  );
}

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
            {!n.read ? <div className="ec-notif-item__dot" /> : <div className="ec-notif-item__dot-placeholder" />}
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

function AiBubble({ chatOpen, bubbleHint, onToggle }) {
  return (
    <div className="ec-bubble-wrap" style={{ position: "fixed", bottom: "30px", right: "30px", zIndex: 1000 }}>
      {bubbleHint && !chatOpen && (
        <div style={{ position: "absolute", bottom: "90px", right: "0", background: "var(--ec-white)", color: "var(--ec-black)", border: "3px solid var(--ec-black)", boxShadow: "6px 6px 0px var(--ec-black)", padding: "12px 20px", fontWeight: "bold", whiteSpace: "nowrap", fontSize: "14px", fontFamily: "Inter, sans-serif" }}>
          Hei, prima oară la EC? 👋
          <div style={{ position: "absolute", bottom: "-8px", right: "26px", width: "12px", height: "12px", background: "var(--ec-white)", borderBottom: "3px solid var(--ec-black)", borderRight: "3px solid var(--ec-black)", transform: "rotate(45deg)" }} />
        </div>
      )}
      <button onClick={onToggle} style={{ width: "75px", height: "75px", borderRadius: "50%", border: "3px solid var(--ec-black)", boxShadow: "6px 6px 0px var(--ec-black)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform 0.2s", transform: chatOpen ? "scale(0.9)" : "scale(1)", backgroundImage: chatOpen ? "none" : `url(${bubbleLogo})`, backgroundSize: "110%", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundColor: chatOpen ? "var(--ec-black)" : "transparent" }}
        onMouseOver={e => !chatOpen && (e.currentTarget.style.transform = "scale(1.05)")}
        onMouseOut={e => !chatOpen && (e.currentTarget.style.transform = "scale(1)")}
        aria-label="Deschide asistentul EC">
        {chatOpen && <svg width="32" height="32" fill="none" stroke="var(--ec-white)" strokeWidth="3" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
      </button>
    </div>
  );
}

const THINKING_PHRASES = {
  ro: [
    "mă gândesc",
    "scotocesc prin info",
    "caut prin notițe",
    "pun cap la cap",
    "verific detaliile",
    "rumegă întrebarea",
    "scormonesc baza",
    "îmi amintesc",
    "filtrez chestii",
    "compun răspunsul",
  ],
  en: [
    "thinking",
    "digging through info",
    "checking notes",
    "putting it together",
    "double-checking",
    "pondering",
    "rummaging around",
    "recalling",
    "filtering stuff",
    "drafting reply",
  ],
};

function ChatWindow({ messages, typing, typingLang, typingPhrase, input, onInputChange, onSend, onKeyDown, onChip, messagesEndRef, onFeedback }) {
  const thinkingLabel = typingPhrase || (typingLang === "ro" ? "mă gândesc" : "thinking");
  return (
    <div className="ec-chat">
      <div className="ec-chat__header">
        <img src={chatAvatar} style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} alt="EC" />
        <div style={{ flex: 1 }}>
          <div className="ec-chat__header-name">Robica</div>
          <div className="ec-chat__header-status"><div className="ec-chat__status-dot" />Online acum</div>
        </div>
      </div>
      <div className="ec-chat__messages">
        {messages.map((msg, i) => (
          <div key={i} className={`ec-chat__msg-row ec-chat__msg-row--${msg.role}`}>
            {msg.role === "ai" && <img src={chatAvatar} style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} alt="EC" />}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "80%" }}>
              <div className={`ec-chat__bubble ec-chat__bubble--${msg.role}`} dangerouslySetInnerHTML={{ __html: formatText(msg.text) }} />
              {msg.role === "ai" && msg.index !== undefined && (
                <div style={{ display: "flex", gap: "6px", paddingLeft: "4px" }}>
                  <button onClick={() => onFeedback(msg.index, true)} style={{ background: msg.feedback === true ? "#22c55e" : "#f0f0f0", border: "1px solid #ccc", borderRadius: "4px", padding: "2px 8px", fontSize: "12px", cursor: "pointer" }}>👍</button>
                  <button onClick={() => onFeedback(msg.index, false)} style={{ background: msg.feedback === false ? "#ef4444" : "#f0f0f0", border: "1px solid #ccc", borderRadius: "4px", padding: "2px 8px", fontSize: "12px", cursor: "pointer" }}>👎</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {typing && (
          <div className="ec-chat__msg-row ec-chat__msg-row--ai">
            <img src={chatAvatar} style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} alt="EC" />
            <div className="ec-chat__typing" style={{ background: "var(--ec-light-gray)", border: "1px solid var(--ec-black)", borderRadius: "0" }}>
              {[0, 1, 2].map(i => <div key={i} className="ec-chat__typing-dot" style={{ animationDelay: `${i * 0.15}s`, background: "var(--ec-black)" }} />)}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="ec-chat__chips">
        {CHIPS.map(chip => {
          const label = chip.slice(3).trim();
          return <button key={chip} className="ec-chat__chip" onClick={() => onChip(label)} style={{ background: "var(--ec-black)", color: "var(--ec-white)", border: "none", borderRadius: "0" }}>{chip}</button>;
        })}
      </div>
      <div className="ec-chat__input-row">
        <input className="ec-chat__input" value={input} onChange={onInputChange} onKeyDown={onKeyDown} placeholder="Întreabă orice despre EC..." style={{ background: "var(--ec-light-gray)", color: "var(--ec-black)", border: "2px solid var(--ec-black)", borderRadius: "0" }} />
        <button className="ec-chat__send" onClick={() => onSend()} style={{ background: "var(--ec-red)", border: "2px solid var(--ec-black)", borderRadius: "0", boxShadow: "none" }}>
          <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [chatOpen, setChatOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [bubbleHint, setBubbleHint] = useState(true);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [typingLang, setTypingLang] = useState("ro");
  const [typingPhrase, setTypingPhrase] = useState("");
  const [unread, setUnread] = useState(2);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hei! 👋 Sunt asistentul tău EC. Prima dată la festival? Spune-mi cu ce te pot ajuta – transport, cazare, buget, muzică sau orice altceva!" }
  ]);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const messagesEndRef = useRef(null);
  const msgIndexRef = useRef(0);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);
  useEffect(() => { const t = setTimeout(() => setBubbleHint(false), 6000); return () => clearTimeout(t); }, []);

  async function sendMessage(overrideText) {
    const userMsg = (overrideText !== undefined ? overrideText : input).trim();
    if (!userMsg) return;
    setInput("");

    // Capture prior turns BEFORE pushing the new user message, and skip the
    // initial canned greeting so the model isn't biased by it.
    const history = messages
      .filter((m, i) => !(i === 0 && m.role === "ai"))
      .map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));

    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    const lang = detectLangClient(userMsg);
    const pool = THINKING_PHRASES[lang];
    setTypingLang(lang);
    setTypingPhrase(pool[Math.floor(Math.random() * pool.length)]);
    setTyping(true);
    try {
      const authed = await ensureAuth();
      if (!authed) throw new Error("Auth failed");
      const res = await fetch(`${API_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "authorization": `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          session_id: getSessionId(),
          message: userMsg,
          history,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No response body");
      const aiMsgIndex = msgIndexRef.current * 2 + 1;
      msgIndexRef.current += 1;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let bubblePushed = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.token) {
              if (!bubblePushed) {
                setTyping(false);
                setMessages(prev => [...prev, { role: "ai", text: data.token, index: aiMsgIndex, feedback: null }]);
                bubblePushed = true;
              } else {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], text: updated[updated.length - 1].text + data.token };
                  return updated;
                });
              }
            }
          } catch { continue; }
        }
      }
      // Stream ended without any tokens (rare); make sure typing turns off.
      if (!bubblePushed) setTyping(false);
    } catch (err) {
      console.error("Chat error:", err);
      setTyping(false);
      setMessages(prev => [...prev, { role: "ai", text: "❌ Eroare de conexiune. Verifică că backend-ul rulează." }]);
    }
  }

  async function handleFeedback(messageIndex, helpful) {
    try {
      await fetch(`${API_URL}/admin/feedback`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ session_id: getSessionId(), message_index: messageIndex, helpful }),
      });
      setMessages(prev => prev.map(m => m.index === messageIndex ? { ...m, feedback: helpful } : m));
    } catch (e) { console.error("Feedback error:", e); }
  }

  function handleKey(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }
  function handleBell() {
    setNotifOpen(prev => !prev); setChatOpen(false);
    if (!notifOpen) { setUnread(0); setNotifications(n => n.map(x => ({ ...x, read: true }))); }
  }
  function handleBubble() { setChatOpen(prev => !prev); setNotifOpen(false); }
  function handleAuthClick() {
    if (loggedIn) { logout(); setLoggedIn(false); setShowAdmin(false); }
    else setShowAuth(true);
  }
  function handleAuthSuccess() { setLoggedIn(true); setShowAuth(false); }

  return (
    <div>
      <NavBar unread={unread} onBellClick={handleBell} onAuthClick={handleAuthClick} onAdminClick={() => setShowAdmin(true)} loggedIn={loggedIn}>
        {notifOpen && <NotifPanel notifications={notifications} onClose={() => setNotifOpen(false)} />}
      </NavBar>
      <Hero /><InfoSection /><LineupSection />
      <AiBubble chatOpen={chatOpen} bubbleHint={bubbleHint} onToggle={handleBubble} />
      {chatOpen && (
        <ChatWindow messages={messages} typing={typing} typingLang={typingLang} typingPhrase={typingPhrase} input={input}
          onInputChange={e => setInput(e.target.value)}
          onSend={sendMessage} onKeyDown={handleKey} onChip={sendMessage}
          messagesEndRef={messagesEndRef} onFeedback={handleFeedback} />
      )}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </div>
  );
}