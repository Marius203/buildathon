import { useState, useRef, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import "./ElectricCastle.css";

import NavBar      from "./components/NavBar";
import NotifPanel  from "./components/NotifPanel";
import AuthModal   from "./components/AuthModal";
import AdminPanel  from "./components/AdminPanel";
import ChatBubble  from "./components/ChatBubble";

import HomePage    from "./pages/HomePage";
import FaqPage     from "./pages/FaqPage";
import GuidePage   from "./pages/GuidePage";
import PlannerPage from "./pages/PlannerPage.jsx";

import {
  API_URL, getToken, getUserEmail, logout,
  getSessionId, ensureAuth, authHeaders,
} from "./utils";

// ─── Notif Detail Modal ───────────────────────────────────────────────────────

function NotifDetailModal({ notif, onClose }) {
  if (!notif) return null;
  const isAdmin = notif.fromAdmin;

  return (
    <div className="ec-notif-modal-backdrop" onClick={onClose}>
      <div className="ec-notif-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={`ec-notif-modal__header ${isAdmin ? "ec-notif-modal__header--admin" : "ec-notif-modal__header--broadcast"}`}>
          <span className="ec-notif-modal__header-title">
            {isAdmin ? "💬 RĂSPUNS DE LA ADMIN" : "📢 NOTIFICARE FESTIVAL"}
          </span>
          <button className="ec-notif-modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="ec-notif-modal__body">
          {/* Original question (only for admin replies) */}
          {isAdmin && notif.question && (
            <div className="ec-notif-modal__question-box">
              <div className="ec-notif-modal__question-label">Întrebarea ta</div>
              <p className="ec-notif-modal__question-text">"{notif.question}"</p>
            </div>
          )}

          {/* Answer */}
          <div className={`ec-notif-modal__answer-box ${isAdmin ? "ec-notif-modal__answer-box--admin" : "ec-notif-modal__answer-box--broadcast"}`}>
            {isAdmin && (
              <div className={`ec-notif-modal__answer-label ec-notif-modal__answer-label--admin`}>
                Răspuns
              </div>
            )}
            <p className="ec-notif-modal__answer-text">
              {notif.answer || notif.text?.replace(/^[📢💬]\s*/, "")}
            </p>
          </div>

          {/* Footer */}
          <div className="ec-notif-modal__footer">
            <span className="ec-notif-modal__time">{notif.time}</span>
            <button className="ec-notif-modal__cta" onClick={onClose}>
              ÎNCHIDE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [chatOpen, setChatOpen]           = useState(false);
  const [notifOpen, setNotifOpen]         = useState(false);
  const [input, setInput]                 = useState("");
  const [typing, setTyping]               = useState(false);
  const [unread, setUnread]               = useState(0);
  const [notifications, setNotifications] = useState([]);   // always starts empty
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [messages, setMessages]           = useState([
    { role: "ai", text: "Hei! 👋 Sunt asistentul tău EC. Prima dată la festival? Spune-mi cu ce te pot ajuta – transport, cazare, buget, muzică sau orice altceva!" },
  ]);
  const [showAuth, setShowAuth]   = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [loggedIn, setLoggedIn]   = useState(!!getToken());
  const messagesEndRef            = useRef(null);
  const msgIndexRef               = useRef(0);
  const pollRef                   = useRef(null);

  // ── Poll notifications every 10s ──────────────────────────────────────────
  useEffect(() => {
    async function checkNotifications() {
      if (!getToken()) return;
      try {
        const res = await fetch(`${API_URL}/admin/notifications`, {
          headers: { authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const incoming = (data.notifications || []).filter(n => !n.read);
        if (incoming.length === 0) return;

        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newNotifs = incoming
            .filter(n => !existingIds.has(n._id))
            .map(n => n.is_broadcast
              ? { id: n._id, text: `📢 ${n.broadcast_message}`, time: "acum", read: false, fromAdmin: false }
              : {
                  id: n._id,
                  text: `💬 Răspuns la: "${(n.question || "").slice(0, 40)}..."`,
                  answer: n.answer,
                  question: n.question,
                  time: "acum", read: false, fromAdmin: true,
                }
            );
          if (newNotifs.length === 0) return prev;
          setUnread(u => u + newNotifs.length);
          return [...newNotifs, ...prev];
        });
      } catch (_) {}
    }

    pollRef.current = setInterval(checkNotifications, 10000);
    checkNotifications();
    return () => clearInterval(pollRef.current);
  }, [loggedIn]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // ── Chat ──────────────────────────────────────────────────────────────────
  async function sendMessage(overrideText) {
    const userMsg = (overrideText !== undefined ? overrideText : input).trim();
    if (!userMsg) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setTyping(true);
    try {
      const authed = await ensureAuth();
      if (!authed) throw new Error("Auth failed");
      const res = await fetch(`${API_URL}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ session_id: getSessionId(), message: userMsg }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No response body");
      const aiMsgIndex = msgIndexRef.current * 2 + 1;
      msgIndexRef.current += 1;
      setTyping(false);
      setMessages(prev => [...prev, { role: "ai", text: "", index: aiMsgIndex, feedback: null }]);
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          const jsonStr = line.startsWith("data: ") ? line.slice(6) : line;
          if (jsonStr === "[DONE]") break;
          try {
            const data  = JSON.parse(jsonStr);
            const token = data.token ?? data.text ?? data.content ?? data.answer ?? "";
            if (token) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  text: updated[updated.length - 1].text + token,
                };
                return updated;
              });
            }
          } catch { continue; }
        }
      }
    } catch (err) {
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
    } catch (_) {}
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function handleBell() {
    const opening = !notifOpen;
    setNotifOpen(prev => !prev);
    setChatOpen(false);
    if (opening) {
      setUnread(0);
      setNotifications(n => n.map(x => ({ ...x, read: true })));
      const unreadNotifs = notifications.filter(n => !n.read && n.id && typeof n.id === "string");
      for (const n of unreadNotifs) {
        fetch(`${API_URL}/admin/notifications/${n.id}/read`, {
          method: "PATCH",
          headers: { authorization: `Bearer ${getToken()}` },
        }).catch(() => {});
      }
    }
  }

  function handleBubble() {
    setChatOpen(prev => !prev);
    setNotifOpen(false);
  }

  function handleAuthClick() {
    if (loggedIn) { logout(); setLoggedIn(false); setShowAdmin(false); }
    else setShowAuth(true);
  }

  // Click notif → open full popup
  function handleNotifClick(notif) {
    setSelectedNotif(notif);
    setNotifOpen(false);
  }

  // Funcția apelată când apeși pe un card din HomePage
  function handleCardClick(topic) {
    setChatOpen(true); // Deschide bula de chat
    sendMessage(`Aș vrea să aflu mai multe detalii despre ${topic.toLowerCase()}.`); 
  }

  return (
    <>
      <NavBar
        unread={unread}
        onBellClick={handleBell}
        onAuthClick={handleAuthClick}
        onAdminClick={() => setShowAdmin(true)}
        loggedIn={loggedIn}
      >
        {notifOpen && (
          <NotifPanel
            notifications={notifications}
            onClose={() => setNotifOpen(false)}
            onNotifClick={handleNotifClick}
          />
        )}
      </NavBar>

      <main>
        <Routes>
          {/* Aici am adăugat prop-ul onTopicClick={handleCardClick} */}
          <Route path="/"        element={<HomePage onTopicClick={handleCardClick} />}/>
          <Route path="/faq"     element={<FaqPage/>}/>
          <Route path="/guide"   element={<GuidePage/>}/>
          <Route path="/planner" element={<PlannerPage/>}/>
        </Routes>
      </main>

      <ChatBubble
        chatOpen={chatOpen}
        onToggle={handleBubble}
        messages={messages}
        typing={typing}
        input={input}
        onInputChange={e => setInput(e.target.value)}
        onSend={sendMessage}
        onKeyDown={handleKey}
        onChip={sendMessage}
        messagesEndRef={messagesEndRef}
        onFeedback={handleFeedback}
      />

      {/* Notif detail popup — centered on screen */}
      {selectedNotif && (
        <NotifDetailModal
          notif={selectedNotif}
          onClose={() => setSelectedNotif(null)}
        />
      )}

      {showAuth  && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => { setLoggedIn(true); setShowAuth(false); }}/>}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)}/>}
    </>
  );
}