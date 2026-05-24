import { useState, useRef, useEffect, useCallback } from "react";
import { API_URL, POLL_INTERVAL, getToken, authHeaders, playNotifSound } from "../utils";

const CATEGORY_COLORS = {
  transport: "#3b82f6", cazare: "#22c55e", buget: "#f59e0b",
  vreme: "#6366f1", muzica: "#ec4899", acces: "#14b8a6", altele: "#94a3b8",
};

const TABS = [
  ["stats",      "📊 Dashboard"],
  ["favorites",  "⭐ Favorite"],
  ["unanswered", "⚠️ Fără Răspuns"],
  ["upload",     "📁 Upload"],
  ["broadcast",  "📢 Broadcast"],
];


function UnansweredTab({ unanswered, unansweredLoad, cardStyle, onRefresh }) {
  const [replyText, setReplyText] = useState({});
  const [sending, setSending]     = useState({});
  const [sent, setSent]           = useState({});
  const [errors, setErrors]       = useState({});

  async function handleReply(group) {
    const key = group.content;
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
          message_content: group.content,
          reply,
          sessions: group.sessions,
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
          Întrebări grupate după conținut. Răspunsul merge la toți userii care au pus aceeași întrebare.
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

      {unanswered.map((group, i) => {
        const key = group.content;
        return (
          <div key={i} style={{ ...cardStyle, borderLeft: `4px solid ${group.count > 1 ? "#f59e0b" : "var(--ec-red)"}`, display: "flex", flexDirection: "column", gap: "12px" }}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "12px", color: "#888" }}>
                {group.latest_timestamp ? new Date(group.latest_timestamp).toLocaleString("ro-RO") : ""}
              </div>
              {group.count > 1 && (
                <div style={{ background: "#f59e0b", color: "#fff", fontFamily: "Oswald, sans-serif", fontWeight: "bold", fontSize: "13px", padding: "3px 10px", letterSpacing: "0.5px" }}>
                  ✕{group.count} USERI AU ÎNTREBAT ASTA
                </div>
              )}
            </div>

            <div style={{ background: "#fff8f8", border: "1px solid #fecaca", padding: "10px 14px" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", color: "#dc2626", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Întrebarea {group.count > 1 ? `(${group.count} useri)` : ""}
              </span>
              <p style={{ fontSize: "14px", color: "var(--ec-black)", margin: "4px 0 0", fontWeight: "500" }}>
                {group.content}
              </p>
            </div>

            {group.count > 1 && (
              <div style={{ fontSize: "11px", color: "#888", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                <span style={{ fontWeight: "bold", marginRight: 4 }}>Sesiuni:</span>
                {group.sessions.slice(0, 5).map((s, j) => (
                  <code key={j} style={{ background: "#f0f0f0", padding: "1px 5px" }}>{s.session_id?.slice(-6)}</code>
                ))}
                {group.sessions.length > 5 && <span>+{group.sessions.length - 5} altele</span>}
              </div>
            )}

            {sent[key] ? (
              <div style={{ background: "#f0fff4", border: "1px solid #86efac", padding: "10px 14px", color: "#166534", fontWeight: "bold", fontSize: "13px" }}>
                ✅ Răspuns trimis la {group.count} {group.count === 1 ? "user" : "useri"}!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: "bold", color: "#555", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Răspunsul tău {group.count > 1 ? `→ va fi trimis la ${group.count} useri` : ""}
                </span>
                <textarea
                  rows={3}
                  value={replyText[key] || ""}
                  onChange={e => setReplyText(t => ({ ...t, [key]: e.target.value }))}
                  placeholder="Scrie un răspuns clar și util..."
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid var(--ec-black)", fontSize: "13px", fontFamily: "Inter, sans-serif", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                />
                {errors[key] && <span style={{ fontSize: "12px", color: "var(--ec-red)", fontWeight: "bold" }}>{errors[key]}</span>}
                <button
                  onClick={() => handleReply(group)}
                  disabled={sending[key] || !(replyText[key] || "").trim()}
                  style={{
                    alignSelf: "flex-end",
                    background: sending[key] || !(replyText[key] || "").trim() ? "#ccc" : "var(--ec-black)",
                    color: "#fff", border: "2px solid var(--ec-black)",
                    padding: "8px 20px", fontFamily: "Oswald, sans-serif",
                    fontSize: "14px", fontWeight: "bold",
                    cursor: sending[key] || !(replyText[key] || "").trim() ? "not-allowed" : "pointer",
                    letterSpacing: "0.5px",
                  }}
                >
                  {sending[key] ? "SE TRIMITE..." : `✉️ TRIMITE LA ${group.count > 1 ? `TOȚI (${group.count})` : "USER"}`}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


function BroadcastTab({ cardStyle }) {
  const [message, setMessage]   = useState("");
  const [sending, setSending]   = useState(false);
  const [result, setResult]     = useState(null);
  const [history, setHistory]   = useState([]);
  const [histLoad, setHistLoad] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      setHistLoad(true);
      try {
        const token = localStorage.getItem("ec_token");
        const r = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8001"}/admin/broadcast/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const d = await r.json();
          setHistory(d.broadcasts || []);
        }
      } finally { setHistLoad(false); }
    }
    loadHistory();
  }, [result]);

  async function handleBroadcast() {
    if (!message.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const token = localStorage.getItem("ec_token");
      const r = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8001"}/admin/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: message.trim() }),
      });
      const d = await r.json();
      if (r.ok) {
        setResult({ ok: true, text: `✅ Trimis către ${d.sent_to} useri` });
        setMessage("");
      } else {
        setResult({ ok: false, text: `❌ ${d.detail}` });
      }
    } catch (e) {
      setResult({ ok: false, text: "❌ Eroare de conexiune" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={cardStyle}>
        <h3 style={{ fontFamily: "Oswald, sans-serif", fontSize: "15px", marginBottom: "6px", letterSpacing: "1px" }}>
          📢 TRIMITE NOTIFICARE TUTUROR USERILOR
        </h3>
        <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px" }}>
          Mesajul va apărea în panoul de notificări al fiecărui user înregistrat.
        </p>
        <textarea
          rows={4}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Ex: Porțile se deschid la 16:00! Ne vedem la Electric Castle 🏰"
          style={{ width: "100%", padding: "12px 14px", border: "2px solid var(--ec-black)", fontSize: "14px", fontFamily: "Inter, sans-serif", resize: "vertical", outline: "none", boxSizing: "border-box", marginBottom: "12px" }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "12px", color: message.length > 200 ? "var(--ec-red)" : "#888" }}>
            {message.length}/200 caractere
          </span>
          <button
            onClick={handleBroadcast}
            disabled={sending || !message.trim() || message.length > 200}
            style={{
              background: sending || !message.trim() ? "#ccc" : "var(--ec-black)",
              color: "#fff",
              border: "2px solid var(--ec-black)",
              boxShadow: sending || !message.trim() ? "none" : "4px 4px 0 #555",
              padding: "12px 28px",
              fontFamily: "Oswald, sans-serif",
              fontSize: "15px",
              fontWeight: "bold",
              letterSpacing: "1px",
              cursor: sending || !message.trim() ? "not-allowed" : "pointer",
            }}
          >
            {sending ? "SE TRIMITE..." : "📢 TRIMITE TUTUROR"}
          </button>
        </div>
        {result && (
          <div style={{ marginTop: "12px", padding: "10px 14px", background: result.ok ? "#f0fff4" : "#fff0f0", border: `1px solid ${result.ok ? "#86efac" : "#fecaca"}`, fontWeight: "bold", fontSize: "13px", color: result.ok ? "#166534" : "var(--ec-red)" }}>
            {result.text}
          </div>
        )}
      </div>

      <div style={{ ...cardStyle, background: "#fffbeb", border: "1px solid #fcd34d" }}>
        <p style={{ fontSize: "13px", color: "#92400e", margin: 0 }}>
          ⚠️ <strong>Atenție:</strong> Mesajul se trimite imediat tuturor userilor înregistrați. Nu există undo.
        </p>
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontFamily: "Oswald, sans-serif", fontSize: "15px", marginBottom: "14px", letterSpacing: "1px" }}>
          📋 ISTORIC BROADCAST-URI
        </h3>
        {histLoad && <p style={{ color: "#888", fontSize: "13px" }}>Se încarcă...</p>}
        {!histLoad && history.length === 0 && (
          <p style={{ color: "#888", fontSize: "13px" }}>Nu ai trimis niciun broadcast încă.</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {history.map((b, i) => (
            <div key={i} style={{ padding: "12px 14px", background: "#f8f8f8", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: "4px" }}>
              <p style={{ fontSize: "14px", color: "var(--ec-black)", margin: 0, fontWeight: "500" }}>{b.message}</p>
              <div style={{ display: "flex", gap: "16px" }}>
                <span style={{ fontSize: "12px", color: "#888" }}>
                  📅 {b.sent_at ? new Date(b.sent_at).toLocaleString("ro-RO") : "—"}
                </span>
                <span style={{ fontSize: "12px", color: "#888" }}>
                  👥 {b.sent_to} useri
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


const CAT_COLORS = {
  transport: "#3b82f6", cazare: "#22c55e", buget: "#f59e0b",
  vreme: "#6366f1", muzica: "#ec4899", acces: "#14b8a6", altele: "#94a3b8",
};

function DashboardTab({ stats, hourly, categories, themes, peakHours, statsLoading, statsError, cardStyle, onExport }) {
  const maxHourly  = Math.max(...hourly.map(h => h.count), 1);
  const maxPeak    = Math.max(...peakHours.map(h => h.count), 1);
  const maxCat     = Math.max(...categories.map(c => c.count), 1);
  const maxTheme   = Math.max(...(themes.map(t => t.count) || [1]), 1);

  const feedback   = stats?.feedback || { positive: 0, negative: 0, total: 0 };
  const satPct     = feedback.total > 0 ? Math.round((feedback.positive / feedback.total) * 100) : null;
  const unanswRate = stats?.total_messages > 0 ? Math.round((stats.unanswered_count / stats.total_messages) * 100) : 0;

  if (statsLoading) return <p style={{ color: "#888", textAlign: "center" }}>Se încarcă...</p>;
  if (statsError)   return <p style={{ color: "red" }}>Eroare: {statsError}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
        {[
          { label: "Total mesaje",     value: stats?.total_messages || 0,     color: "#3b82f6", icon: "💬" },
          { label: "Conversații azi",  value: stats?.conversations_today || 0, color: "#22c55e", icon: "📅" },
          { label: "Useri totali",     value: stats?.total_users || 0,         color: "#8b5cf6", icon: "👥" },
          { label: "Fără răspuns",     value: stats?.unanswered_count || 0,    color: "#ef4444", icon: "⚠️" },
        ].map((k, i) => (
          <div key={i} style={{ ...cardStyle, borderTop: `3px solid ${k.color}`, padding: "12px 14px" }}>
            <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k.icon} {k.label}</div>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: "26px", fontWeight: "bold", color: k.color }}>{k.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Satisfaction + Unanswered rate */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div style={cardStyle}>
          <div style={{ fontSize: "11px", color: "#888", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>👍 Satisfacție utilizatori</div>
          {satPct !== null ? (
            <>
              <div style={{ fontFamily: "Oswald, sans-serif", fontSize: "30px", fontWeight: "bold", color: satPct >= 70 ? "#22c55e" : satPct >= 40 ? "#f59e0b" : "#dc2626" }}>{satPct}%</div>
              <div style={{ height: 6, background: "#f0f0f0", marginTop: 8, borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${satPct}%`, background: satPct >= 70 ? "#22c55e" : "#f59e0b", borderRadius: 3, transition: "width 0.5s" }} />
              </div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: 6 }}>{feedback.positive} 👍 · {feedback.negative} 👎 din {feedback.total}</div>
            </>
          ) : <div style={{ fontSize: "13px", color: "#aaa" }}>Nu există feedback încă</div>}
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: "11px", color: "#888", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>❓ Rată fără răspuns</div>
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: "30px", fontWeight: "bold", color: unanswRate > 30 ? "#dc2626" : unanswRate > 15 ? "#f59e0b" : "#22c55e" }}>{unanswRate}%</div>
          <div style={{ height: 6, background: "#f0f0f0", marginTop: 8, borderRadius: 3 }}>
            <div style={{ height: "100%", width: `${Math.min(unanswRate, 100)}%`, background: unanswRate > 30 ? "#dc2626" : "#f59e0b", borderRadius: 3, transition: "width 0.5s" }} />
          </div>
          <div style={{ fontSize: "12px", color: "#888", marginTop: 6 }}>{stats?.unanswered_count || 0} din {stats?.total_messages || 0} mesaje</div>
        </div>
      </div>

      {/* Activitate 24h */}
      {hourly.length > 0 && (
        <div style={cardStyle}>
          <div style={{ fontSize: "11px", color: "#888", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>⏰ Activitate ultimele 24h</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: 70 }}>
            {hourly.map((h, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                  <div style={{ width: "100%", height: `${Math.max((h.count / maxHourly) * 100, h.count > 0 ? 8 : 2)}%`, background: h.count > 0 ? "var(--ec-black)" : "#f0f0f0", minHeight: 2 }} />
                </div>
                {i % 6 === 0 && <div style={{ fontSize: 8, color: "#ccc" }}>{h.hour.slice(0, 2)}h</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Peak hours all-time */}
      {peakHours.length > 0 && (
        <div style={cardStyle}>
          <div style={{ fontSize: "11px", color: "#888", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
            🕐 Ore de vârf (toate timpurile)
            <span style={{ marginLeft: 8, fontWeight: "normal", color: "#aaa" }}>— când sunt adminii cel mai necesari</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: 70 }}>
            {peakHours.map((h, i) => {
              const isPeak = h.count === Math.max(...peakHours.map(x => x.count));
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                    <div style={{ width: "100%", height: `${Math.max((h.count / maxPeak) * 100, h.count > 0 ? 8 : 2)}%`, background: isPeak ? "#ef4444" : h.count > 0 ? "#3b82f6" : "#f0f0f0", minHeight: 2, position: "relative" }} />
                  </div>
                  {i % 6 === 0 && <div style={{ fontSize: 8, color: "#ccc" }}>{h.hour.slice(0, 2)}h</div>}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: "11px", color: "#888", marginTop: 8 }}>
            🔴 = ora de vârf maximă &nbsp;·&nbsp; 🔵 = activitate normală
          </div>
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <div style={cardStyle}>
          <div style={{ fontSize: "11px", color: "#888", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>🗂️ Ce întreabă oamenii</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...categories].sort((a, b) => b.count - a.count).map((cat, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 80, fontSize: 12, fontWeight: "bold", color: "#333", flexShrink: 0 }}>{cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}</div>
                <div style={{ flex: 1, background: "#f0f0f0", height: 18 }}>
                  <div style={{ width: `${(cat.count / maxCat) * 100}%`, height: "100%", background: CAT_COLORS[cat.name] || "#94a3b8", transition: "width 0.4s" }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: "bold", color: "#333", width: 28, textAlign: "right", flexShrink: 0 }}>{cat.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unanswered themes — gaps in knowledge base */}
      {themes.length > 0 && (
        <div style={{ ...cardStyle, borderLeft: "4px solid #ef4444" }}>
          <div style={{ fontSize: "11px", color: "#888", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>🚨 Gaps în knowledge base</div>
          <div style={{ fontSize: "12px", color: "#666", marginBottom: 14 }}>Teme pentru care oamenii nu au primit răspuns — ce lipsește din comunicarea EC</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {themes.map((theme, i) => (
              <div key={i}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <div style={{ width: 80, fontSize: 12, fontWeight: "bold", color: "#333", flexShrink: 0 }}>{theme.name.charAt(0).toUpperCase() + theme.name.slice(1)}</div>
                  <div style={{ flex: 1, background: "#f0f0f0", height: 16 }}>
                    <div style={{ width: `${(theme.count / maxTheme) * 100}%`, height: "100%", background: "#ef4444", opacity: 0.7, transition: "width 0.4s" }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: "bold", color: "#ef4444", width: 28, textAlign: "right", flexShrink: 0 }}>{theme.count}</div>
                </div>
                {theme.examples.length > 0 && (
                  <div style={{ marginLeft: 90, display: "flex", flexDirection: "column", gap: 2 }}>
                    {theme.examples.map((ex, j) => (
                      <div key={j} style={{ fontSize: 11, color: "#888", fontStyle: "italic", background: "#fafafa", padding: "2px 6px", borderLeft: "2px solid #e5e7eb" }}>"{ex}"</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onExport} style={{ background: "var(--ec-black)", color: "#fff", border: "2px solid var(--ec-black)", boxShadow: "4px 4px 0 #555", padding: "12px 28px", fontFamily: "Oswald, sans-serif", fontSize: "16px", fontWeight: "bold", letterSpacing: "1px", cursor: "pointer" }}>⬇️ EXPORT CSV</button>
      </div>

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
  const [themes, setThemes]          = useState([]);
  const [peakHours, setPeakHours]    = useState([]);

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
        // Fetch new metrics
        try {
          const [tRes, pRes] = await Promise.all([
            fetch(`${API_URL}/admin/stats/unanswered-themes`, { headers: authHeaders() }),
            fetch(`${API_URL}/admin/stats/peak-hours`,        { headers: authHeaders() }),
          ]);
          if (tRes.ok) setThemes((await tRes.json()).themes || []);
          if (pRes.ok) setPeakHours((await pRes.json()).hours || []);
        } catch (e) {}
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
            <DashboardTab
              stats={stats}
              hourly={hourly}
              categories={categories}
              themes={themes}
              peakHours={peakHours}
              statsLoading={statsLoading}
              statsError={statsError}
              cardStyle={cardStyle}
              onExport={handleExport}
            />
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

          {tab === "broadcast" && (
            <BroadcastTab cardStyle={cardStyle} />
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