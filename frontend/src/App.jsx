import { useState, useRef, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import "./ElectricCastle.css";

import NavBar      from "./components/NavBar";
import NotifPanel  from "./components/NotifPanel";
import AuthModal   from "./components/AuthModal";
import AdminPanel  from "./components/AdminPanel";
import ChatBubble  from "./components/ChatBubble";

import HomePage  from "./pages/HomePage";
import FaqPage   from "./pages/FaqPage";
import GuidePage from "./pages/GuidePage";
import PlannerPage from "./pages/PlannerPage.jsx";

import {
  API_URL, getToken, getUserEmail, logout,
  getSessionId, ensureAuth, authHeaders,
} from "./utils";

const INITIAL_NOTIFICATIONS = [
  { id: 1, text: "🎵 Line-up complet anunțat! Verifică artiștii tăi favoriți", time: "acum 2 min", read: false },
  { id: 2, text: "🚌 Shuttle-urile din Cluj sunt aproape sold out!",            time: "acum 1h",  read: false },
  { id: 3, text: "⛺ Locuri de glamping disponibile – rezervă acum",            time: "acum 3h",  read: true  },
];

export default function App() {
  const [chatOpen, setChatOpen]           = useState(false);
  const [notifOpen, setNotifOpen]         = useState(false);
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
  const msgIndexRef               = useRef(0);
  const pollRef                   = useRef(null);

  // Polling notificari de la admin (la fiecare 10s)
  useEffect(() => {
    async function checkNotifications() {
      if (!getToken()) return;
      try {
        const res = await fetch(`${API_URL}/admin/notifications`, {
          headers: { authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const unread = (data.notifications || []).filter(n => !n.read);
        if (unread.length === 0) return;

        // Adauga in panoul de notificari
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newNotifs = unread
            .filter(n => !existingIds.has(n._id))
            .map(n => ({
              id: n._id,
              text: `💬 Răspuns la întrebarea ta: "${n.question.slice(0, 40)}..."`,
              answer: n.answer,
              question: n.question,
              time: "acum",
              read: false,
              fromAdmin: true,
            }));
          if (newNotifs.length === 0) return prev;
          setUnread(u => u + newNotifs.length);
          return [...newNotifs, ...prev];
        });

        // Marcheaza ca citite in DB
        for (const n of unread) {
          fetch(`${API_URL}/admin/notifications/${n._id}/read`, {
            method: "PATCH",
            headers: { authorization: `Bearer ${getToken()}` },
          }).catch(() => {});
        }
      } catch (e) {}
    }

    pollRef.current = setInterval(checkNotifications, 10000);
    checkNotifications(); // run imediat la mount
    return () => clearInterval(pollRef.current);
  }, [loggedIn]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

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
          // Suporta atat SSE ("data: {...}") cat si JSON pur ("{...}")
          const jsonStr = line.startsWith("data: ") ? line.slice(6) : line;
          if (jsonStr === "[DONE]") break;
          try {
            const data = JSON.parse(jsonStr);
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
    if (loggedIn) { logout(); setLoggedIn(false); setShowAdmin(false); }
    else setShowAuth(true);
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
          <NotifPanel notifications={notifications} onClose={() => setNotifOpen(false)}/>
        )}
      </NavBar>

      <main>
        <Routes>
          <Route path="/"      element={<HomePage/>}/>
          <Route path="/faq"   element={<FaqPage/>}/>
          <Route path="/guide" element={<GuidePage/>}/>
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

      {showAuth  && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => { setLoggedIn(true); setShowAuth(false); }}/>}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)}/>}
    </>
  );
}