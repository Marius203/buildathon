import { useState, useRef, useEffect, useCallback } from "react";
import { API_URL, POLL_INTERVAL, getToken, authHeaders, playNotifSound } from "../utils";

const CATEGORY_COLORS = {
  transport: "#3b82f6", cazare: "#22c55e", buget: "#f59e0b",
  vreme: "#6366f1", muzica: "#ec4899", acces: "#14b8a6", altele: "#94a3b8",
};

const TABS = [
  ["stats",      "📊 Statistici"],
  ["favorites",  "⭐ Favorite"],
  ["unanswered", "⚠️ Fără Răspuns"],
  ["upload",     "📁 Upload"],
];


function UnansweredTab({ unanswered, unansweredLoad, cardStyle, onRefresh }) {
  const [replyText, setReplyText] = useState({});
  const [sending, setSending]     = useState({});
  const [sent, setSent]           = useState({});
  const [errors, setErrors]       = useState({});

  async function handleReply(item) {
    const key = item.session_id + item.message?.content;
    const reply = (replyText[key] || "").trim();
    if (!reply) return;
    setSending(s => ({ ...s, [key]: true }));
    setErrors(e => ({ ...e, [key]: "" }));
    try {
      const token = localStorage.getItem("ec_token");
      const r = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8001"}/admin/unanswered/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          session_id: item.session_id,
          message_content: item.message?.content,
          reply,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSent(s => ({ ...s, [key]: true }));
      setReplyText(t => ({ ...t, [key]: "" }));
      setTimeout(() => onRefresh(), 800);
    } catch (e) {
      setErrors(err => ({ ...err, [key]: "Eroare la trimitere." }));
    } finally {
      setSending(s => ({ ...s, [key]: false }));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: "14px", color: "#555", margin: 0 }}>
          Mesaje la care agentul nu a știut să răspundă. Poți răspunde manual.
        </p>
        <button onClick={onRefresh} style={{ background: "var(--ec-black)", color: "#fff", border: "none", padding: "6px 14px", fontFamily: "Oswald, sans-serif", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}>
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

      {unanswered.map((item, i) => {
        const key = item.session_id + item.message?.content;
        return (
          <div key={i} style={{ ...cardStyle, borderLeft: "4px solid var(--ec-red)", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "12px", color: "#888" }}>
              Session: <code style={{ background: "#f0f0f0", padding: "2px 6px" }}>{item.session_id?.slice(-8)}</code>
              <span style={{ marginLeft: "12px" }}>
                {item.message?.timestamp ? new Date(item.message.timestamp).toLocaleString("ro-RO") : ""}
              </span>
            </div>

            <div style={{ background: "#fff8f8", border: "1px solid #fecaca", padding: "10px 14px", borderRadius: "2px" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", color: "#dc2626", letterSpacing: "0.05em", textTransform: "uppercase" }}>Întrebarea utilizatorului</span>
              <p style={{ fontSize: "14px", color: "var(--ec-black)", margin: "4px 0 0", fontWeight: "500" }}>
                {item.message?.content || "—"}
              </p>
            </div>

            {sent[key] ? (
              <div style={{ background: "#f0fff4", border: "1px solid #86efac", padding: "10px 14px", color: "#166534", fontWeight: "bold", fontSize: "13px" }}>
                ✅ Răspuns trimis!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: "bold", color: "#555", letterSpacing: "0.05em", textTransform: "uppercase" }}>Răspunsul tău</span>
                <textarea
                  rows={3}
                  value={replyText[key] || ""}
                  onChange={e => setReplyText(t => ({ ...t, [key]: e.target.value }))}
                  placeholder="Scrie un răspuns clar și util pentru utilizator..."
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid var(--ec-black)", fontSize: "13px", fontFamily: "Inter, sans-serif", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                />
                {errors[key] && <span style={{ fontSize: "12px", color: "var(--ec-red)", fontWeight: "bold" }}>{errors[key]}</span>}
                <button
                  onClick={() => handleReply(item)}
                  disabled={sending[key] || !(replyText[key] || "").trim()}
                  style={{
                    alignSelf: "flex-end",
                    background: sending[key] || !(replyText[key] || "").trim() ? "#ccc" : "var(--ec-black)",
                    color: "#fff",
                    border: "2px solid var(--ec-black)",
                    padding: "8px 20px",
                    fontFamily: "Oswald, sans-serif",
                    fontSize: "14px",
                    fontWeight: "bold",
                    cursor: sending[key] || !(replyText[key] || "").trim() ? "not-allowed" : "pointer",
                    letterSpacing: "0.5px",
                  }}
                >
                  {sending[key] ? "SE TRIMITE..." : "✉️ TRIMITE RĂSPUNS"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminPanel({ onClose }) {
  const [tab, setTab] = useState("stats");

  const [stats, setStats]           = useState(null);
  const [hourly, setHourly]         = useState([]);
  const [categories, setCategories] = useState([]);
  const [statsLoading, setStatsL]   = useState(true);
  const [statsError, setStatsErr]   = useState("");

  const [unanswered, setUnanswered]             = useState([]);
  const [unansweredLoad, setUnansLoad]          = useState(false);
  const [unansweredCount, setUnansweredCount]   = useState(0);
  const [newUnanswered, setNewUnanswered]       = useState(0);
  const prevCountRef                            = useRef(null);
  const pollTimerRef                            = useRef(null);

  const [favorites, setFavorites]     = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [favsLoading, setFavsLoad]    = useState(false);
  const [newFav, setNewFav]           = useState("");
  const [favMsg, setFavMsg]           = useState("");

  const [files, setFiles]         = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileInputRef              = useRef(null);

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
        setTimeout(() => setNewUnanswered(0), 5000);
      }
      prevCountRef.current = count;
    } catch (e) {}
  }, []);

  useEffect(() => {
    pollUnanswered();
    pollTimerRef.current = setInterval(pollUnanswered, POLL_INTERVAL);
    return () => clearInterval(pollTimerRef.current);
  }, [pollUnanswered]);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [sRes, hRes, cRes] = await Promise.all([
          fetch(`${API_URL}/admin/stats`,            { headers: authHeaders() }),
          fetch(`${API_URL}/admin/stats/hourly`,     { headers: authHeaders() }),
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

  useEffect(() => { if (tab === "unanswered") loadUnanswered(); }, [tab]);
  useEffect(() => { if (tab === "favorites") fetchFavorites(); }, [tab]);

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
        fetch(`${API_URL}/admin/favorites`,             { headers: authHeaders() }),
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
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `ec-stats-${new Date().toISOString().slice(0,10)}.csv`; a.click();
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

  const cardStyle = { background: "var(--ec-white)", border: "2px solid var(--ec-black)", boxShadow: "4px 4px 0 var(--ec-black)", padding: "20px" };
  const maxHourly = Math.max(...hourly.map(h => h.count), 1);
  const maxCat    = Math.max(...categories.map(c => c.count), 1);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px", boxSizing: "border-box" }}>
      <div style={{ background: "#f5f5f5", border: "3px solid var(--ec-black)", boxShadow: "10px 10px 0 var(--ec-black)", width: "100%", maxWidth: "900px", maxHeight: "90vh", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>

        <div style={{ background: "var(--ec-black)", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ color: "var(--ec-red)", fontFamily: "Oswald, sans-serif", fontSize: "22px", fontWeight: "bold", letterSpacing: "2px" }}>⚡ ADMIN</span>
            <span style={{ color: "#666", fontSize: "13px" }}>Electric Castle Dashboard</span>
          </div>
          {newUnanswered > 0 && (
            <div style={{ background: "var(--ec-red)", color: "#fff", padding: "6px 14px", fontFamily: "Oswald, sans-serif", fontSize: "13px", fontWeight: "bold", letterSpacing: "0.5px", animation: "pulse 1s infinite", border: "2px solid rgba(255,255,255,0.3)" }}>
              🔔 +{newUnanswered} întrebare{newUnanswered > 1 ? "i" : ""} nouă fără răspuns
            </div>
          )}
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: "22px", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", borderBottom: "3px solid var(--ec-black)", flexShrink: 0, background: "var(--ec-white)", overflowX: "auto" }}>
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ padding: "14px 22px", border: "none", borderBottom: tab === key ? "3px solid var(--ec-red)" : "3px solid transparent", background: "none", fontFamily: "Oswald, sans-serif", fontSize: "14px", fontWeight: "bold", cursor: "pointer", color: tab === key ? "var(--ec-red)" : "#666", letterSpacing: "0.5px", marginBottom: "-3px", whiteSpace: "nowrap", position: "relative" }}>
              {label}
              {key === "unanswered" && unansweredCount > 0 && (
                <span style={{ position: "absolute", top: "8px", right: "6px", background: "var(--ec-red)", color: "#fff", borderRadius: "50%", width: "18px", height: "18px", fontSize: "10px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
                  {unansweredCount > 99 ? "99+" : unansweredCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

          {tab === "stats" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {statsLoading && <p style={{ color: "#888", textAlign: "center", padding: "40px" }}>Se încarcă...</p>}
              {statsError   && <p style={{ color: "var(--ec-red)", fontWeight: "bold" }}>⚠️ {statsError}</p>}
              {stats && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
                    {[
                      { icon: "💬", label: "Total mesaje",    value: stats.total_messages },
                      { icon: "👥", label: "Conversații",      value: stats.total_conversations },
                      { icon: "📅", label: "Conv. azi",        value: stats.conversations_today },
                      { icon: "👤", label: "Useri totali",     value: stats.total_users },
                      { icon: "🆕", label: "Useri noi azi",    value: stats.users_today },
                      { icon: "⚠️", label: "Fără răspuns",     value: unansweredCount },
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
                            <div style={{ width: "100%", background: h.count > 0 ? "var(--ec-red)" : "#e5e7eb", height: `${Math.max((h.count / maxHourly) * 64, h.count > 0 ? 4 : 2)}px`, transition: "height 0.3s" }}/>
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
                              <div style={{ width: `${(cat.count / maxCat) * 100}%`, height: "100%", background: CATEGORY_COLORS[cat.name] || "#94a3b8", transition: "width 0.4s" }}/>
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

          {tab === "favorites" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {favsLoading && <p style={{ color: "#888", textAlign: "center" }}>Se încarcă...</p>}
              <div style={cardStyle}>
                <h3 style={{ fontFamily: "Oswald, sans-serif", fontSize: "15px", marginBottom: "14px", letterSpacing: "1px" }}>➕ ADAUGĂ ÎNTREBARE FAVORITĂ</h3>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input value={newFav} onChange={e => setNewFav(e.target.value)} placeholder="Scrie întrebarea..."
                    style={{ flex: 1, padding: "10px 14px", border: "2px solid var(--ec-black)", fontSize: "14px", outline: "none", fontFamily: "Inter, sans-serif" }}
                    onKeyDown={e => e.key === "Enter" && newFav.trim() && addFavorite(newFav.trim())}/>
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

          {tab === "unanswered" && (
            <UnansweredTab
              unanswered={unanswered}
              unansweredLoad={unansweredLoad}
              cardStyle={cardStyle}
              onRefresh={loadUnanswered}
            />
          )}

          {tab === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <p style={{ fontSize: "14px", color: "#555", margin: 0 }}>Încarcă fișiere în knowledge base-ul backend-ului.</p>
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "3px dashed var(--ec-black)", background: files.length ? "#f0fff4" : "var(--ec-white)", padding: "40px 24px", cursor: "pointer", gap: "12px" }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); setFiles(e.dataTransfer.files); setUploadMsg(""); }}>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={e => { setFiles(e.target.files); setUploadMsg(""); }}/>
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

      {newUnanswered > 0 && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "var(--ec-black)", color: "#fff", border: "3px solid var(--ec-red)", boxShadow: "6px 6px 0 var(--ec-red)", padding: "14px 20px", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: "bold", zIndex: 10000, display: "flex", alignItems: "center", gap: "10px", animation: "slideIn 0.3s ease" }}>
          <span style={{ fontSize: "20px" }}>🔔</span>
          <span>+{newUnanswered} întrebare{newUnanswered > 1 ? "i" : ""} nouă fără răspuns!</span>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}