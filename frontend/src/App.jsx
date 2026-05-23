import { useState, useRef, useEffect } from "react";
import "./ElectricCastle.css";
import bubbleLogo from "./images/logo.jpg";

// ─── Config ───────────────────────────────────────────────────────────────────

const API_URL = "http://localhost:8000";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem("ec_token");
}

function getSessionId() {
  let sid = localStorage.getItem("ec_session_id");
  if (!sid) {
    sid = "session-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    localStorage.setItem("ec_session_id", sid);
  }
  return sid;
}

// Auto-register/login un guest user la primul mesaj
async function ensureAuth() {
  if (getToken()) return true;
  const email = `user@gmail.com`;
  const password = "testparola123";
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem("ec_token", data.access_token);
      return true;
    }
  } catch (e) {
    console.error("Auth error:", e);
  }
  return false;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_NOTIFICATIONS = [
  { id: 1, text: "🎵 Line-up complet anunțat! Verifică artiștii tăi favoriți", time: "acum 2 min", read: false },
  { id: 2, text: "🚌 Shuttle-urile din Cluj sunt aproape sold out!", time: "acum 1h", read: false },
  { id: 3, text: "⛺ Locuri de glamping disponibile – rezervă acum", time: "acum 3h", read: true },
];

const NAV_LINKS = ["Tickets", "Info", "Artists", "Gallery", "Contact"];

const STAGES = [
  { label: "Main Stage",     cls: "ec-lineup__stage ec-lineup__stage--featured" },
  { label: "Forest Stage",   cls: "ec-lineup__stage ec-lineup__stage--mid" },
  { label: "Electric Stage", cls: "ec-lineup__stage ec-lineup__stage--mid" },
  { label: "Live Stage",     cls: "ec-lineup__stage ec-lineup__stage--sm" },
  { label: "Secret Stage",   cls: "ec-lineup__stage ec-lineup__stage--sm" },
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavBar({ unread, onBellClick, children }) {
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
        <button className="ec-btn--outline" onClick={() => alert("Guided Planner flow coming next!")}>
          Let's build your plan
        </button>
      </div>
    </div>
  );
}

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

function AiBubble({ chatOpen, bubbleHint, onToggle }) {
  return (
    <div className="ec-bubble-wrap" style={{ position: "fixed", bottom: "30px", right: "30px", zIndex: 1000 }}>
      {bubbleHint && !chatOpen && (
        <div style={{
          position: "absolute", bottom: "90px", right: "0",
          background: "var(--ec-white)", color: "var(--ec-black)",
          border: "3px solid var(--ec-black)", boxShadow: "6px 6px 0px var(--ec-black)",
          padding: "12px 20px", fontWeight: "bold", whiteSpace: "nowrap",
          fontSize: "14px", fontFamily: "Inter, sans-serif"
        }}>
          Hei, prima oară la EC? 👋
          <div style={{
            position: "absolute", bottom: "-8px", right: "26px",
            width: "12px", height: "12px", background: "var(--ec-white)",
            borderBottom: "3px solid var(--ec-black)", borderRight: "3px solid var(--ec-black)",
            transform: "rotate(45deg)"
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

/* ─────────────────────────────────────────
   Main App
───────────────────────────────────────── */

export default function App() {
  const [chatOpen, setChatOpen]           = useState(false);
  const [notifOpen, setNotifOpen]         = useState(false);
  const [bubbleHint, setBubbleHint]       = useState(true);
  const [input, setInput]                 = useState("");
  const [typing, setTyping]               = useState(false);
  const [unread, setUnread]               = useState(2);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [messages, setMessages]           = useState([
    { role: "ai", text: "Hei! 👋 Sunt asistentul tău EC. Prima dată la festival? Spune-mi cu ce te pot ajuta – transport, cazare, buget, muzică sau orice altceva!" }
  ]);
  const messagesEndRef = useRef(null);

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

  return (
    <div>
      <NavBar unread={unread} onBellClick={handleBell}>
        {notifOpen && (
          <NotifPanel
            notifications={notifications}
            onClose={() => setNotifOpen(false)}
          />
        )}
      </NavBar>

      <Hero />
      <InfoSection/>
      <LineupSection/>

      <AiBubble
        chatOpen={chatOpen}
        bubbleHint={bubbleHint}
        onToggle={handleBubble}
      />

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
    </div>
  );
}