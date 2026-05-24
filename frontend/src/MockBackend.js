// ─── MOCK BACKEND ─────────────────────────────────────────────────────────────
// Import in main.jsx:
//   import { installMockFetch } from "./mockBackend";
//   installMockFetch("http://localhost:8000");

const store = {
  notifications: [],  // NO hardcoded notifications — start empty
  unanswered: [
    {
      session_id: "session-mock-001",
      user_email: "user@test.com",
      message: { content: "Există loc de parcare pentru rulote lângă festival?", timestamp: new Date().toISOString() },
    },
    {
      session_id: "session-mock-002",
      user_email: null,
      message: { content: "Pot aduce câinele meu la EC?", timestamp: new Date(Date.now() - 3600000).toISOString() },
    },
  ],
  broadcasts: [],
  favorites: [],
  idCounter: 1,
};

function newId() {
  return "mock-" + (store.idCounter++) + "-" + Math.random().toString(36).slice(2, 6);
}

const MOCK_RESPONSES = {
  transport: "🚌 **Transport spre EC:**\n\nDin București: tren/avion până la Cluj (2-3h), apoi shuttle EC din centrul Clujului până la Bonțida (~30 min). Prețul shuttle-ului ~30-50 RON dus-întors. Rezervă din timp pe site-ul oficial!\n\nCu mașina: parcare oficială disponibilă, carpooling recomandat.",
  cazare:    "🏕️ **Cazare la EC:**\n\n**Camping** – cel mai autentic, aduci cortul propriu.\n**Glamping** – corturi premium cu pat real, se termină rapid.\n**Hotel în Cluj** – confort maxim, 30 min navetă zilnică.",
  buget:     "💰 **Buget estimativ EC 2025:**\n\n• Bilet 4 zile: ~800-1100 RON\n• Transport: ~100-300 RON\n• Mâncare + băuturi/zi: ~150-250 RON\n• Fond haos: ~200 RON\n\n**Total estimat 4 zile: 1500-3000 RON/persoană.**",
  vreme:     "🌧️ **Vreme și ploaie:**\n\nObligatoriu: **cizme de cauciuc**, poncho, haine în straturi, husă impermeabilă telefon.\n\nDacă plouă festivalul continuă. Oamenii dansează în noroi și e iconic!",
  muzica:    "🎵 **Scene și muzică:**\n\n🏰 **Main Stage** – headlineri, mainstream\n🌲 **Booha** – house, techno, dans non-stop\n🎪 **Hangar** – alternativ, indie, rock\n🎸 **Stables** – techno, ro-minimal",
  default:   "Bună întrebare! 🏰 Pot să te ajut cu informații despre **transport**, **cazare**, **buget**, **vreme** sau **muzică și scene** la Electric Castle.\n\nÎncearcă să mă întrebi ceva specific!",
};

function getMockResponse(message) {
  const msg = message.toLowerCase();
  if (msg.includes("transport") || msg.includes("drum") || msg.includes("ajung") || msg.includes("shuttle") || msg.includes("tren")) return MOCK_RESPONSES.transport;
  if (msg.includes("cazare") || msg.includes("cort") || msg.includes("camping") || msg.includes("hotel") || msg.includes("glamping")) return MOCK_RESPONSES.cazare;
  if (msg.includes("buget") || msg.includes("bani") || msg.includes("cost") || msg.includes("preț")) return MOCK_RESPONSES.buget;
  if (msg.includes("ploaie") || msg.includes("vreme") || msg.includes("noroi") || msg.includes("cizme")) return MOCK_RESPONSES.vreme;
  if (msg.includes("muzic") || msg.includes("scenă") || msg.includes("scena") || msg.includes("artist") || msg.includes("dans")) return MOCK_RESPONSES.muzica;
  return MOCK_RESPONSES.default;
}

function mockStream(text) {
  const words = text.split(" ");
  let i = 0;
  return new ReadableStream({
    async pull(controller) {
      if (i >= words.length) { controller.close(); return; }
      const chunk = (i === 0 ? "" : " ") + words[i++];
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ token: chunk })}\n\n`));
      await new Promise(r => setTimeout(r, 40));
    },
  });
}

function mockResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export function installMockFetch(API_URL) {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function mockFetch(url, options = {}) {
    const urlStr = String(url);
    const method = (options.method || "GET").toUpperCase();
    let body = {};
    try { body = options.body ? JSON.parse(options.body) : {}; } catch (_) {}

    // ── Auth ──
    if (urlStr.includes("/auth/register"))
      return mockResponse({ message: "User created" });

    if (urlStr.includes("/auth/login")) {
      const isAdmin = (body.email || "").toLowerCase().includes("admin");
      return mockResponse({
        access_token: "mock-token-" + Date.now(),
        role: isAdmin ? "admin" : "user",
      });
    }

    // ── Chat stream ──
    if (urlStr.includes("/chat/stream") && method === "POST") {
      const msg = body.message || "";
      const unclear = msg.length > 30 && !["transport","cazare","buget","vreme","muzica"].some(k => msg.toLowerCase().includes(k));
      if (unclear) {
        store.unanswered.push({
          session_id: body.session_id || "session-unknown",
          user_email: null,
          message: { content: msg, timestamp: new Date().toISOString() },
        });
      }
      await sleep(300);
      return { ok: true, status: 200, body: mockStream(getMockResponse(msg)), json: async () => ({}) };
    }

    if (urlStr.includes("/chat/message") && method === "POST") {
      await sleep(800);
      return mockResponse({ agent_response: getMockResponse(body.message || "") });
    }

    // ── Admin: unanswered reply → create notification ──
    if (urlStr.includes("/admin/unanswered/reply") && method === "POST") {
      const notif = {
        _id: newId(),
        user_session: body.session_id,
        question: body.message_content,
        answer: body.reply,
        is_broadcast: false,
        read: false,
        sent_at: new Date().toISOString(),
      };
      store.notifications.push(notif);
      store.unanswered = store.unanswered.filter(
        u => !(u.session_id === body.session_id && u.message?.content === body.message_content)
      );
      console.log("📬 Mock: notificare creată →", notif);
      return mockResponse({ message: "Reply sent" });
    }

    if (urlStr.includes("/admin/unanswered"))
      return mockResponse({ unanswered: store.unanswered });

    // ── Admin: broadcast ──
    if (urlStr.includes("/admin/broadcast") && method === "POST" && !urlStr.includes("history")) {
      const b = {
        _id: newId(),
        message: body.message,
        sent_at: new Date().toISOString(),
        sent_to: 5,
        is_broadcast: true,
      };
      store.broadcasts.push(b);
      const notif = {
        _id: newId(),
        is_broadcast: true,
        broadcast_message: body.message,
        read: false,
        sent_at: new Date().toISOString(),
      };
      store.notifications.push(notif);
      console.log("📢 Mock: broadcast →", body.message);
      return mockResponse({ message: "Sent", sent_to: 5 });
    }

    if (urlStr.includes("/admin/broadcast/history"))
      return mockResponse({ broadcasts: store.broadcasts });

    // ── Notifications: mark read ──
    const readMatch = urlStr.match(/\/admin\/notifications\/([^/]+)\/read/);
    if (readMatch && method === "PATCH") {
      const id = readMatch[1];
      const n = store.notifications.find(n => n._id === id);
      if (n) n.read = true;
      return mockResponse({ ok: true });
    }

    if (urlStr.includes("/admin/notifications"))
      return mockResponse({ notifications: store.notifications.filter(n => !n.read) });

    // ── Stats ──
    if (urlStr.includes("/admin/stats/hourly"))
      return mockResponse({ hourly: Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2,"0")}:00`, count: Math.floor(Math.abs(Math.sin(i/3)) * 10) })) });
    if (urlStr.includes("/admin/stats/categories"))
      return mockResponse({ categories: [{ name:"transport",count:42 },{ name:"cazare",count:31 },{ name:"buget",count:28 },{ name:"vreme",count:22 },{ name:"muzica",count:19 },{ name:"acces",count:15 }] });
    if (urlStr.includes("/admin/stats/unanswered-themes"))
      return mockResponse({ themes: [] });
    if (urlStr.includes("/admin/stats/peak-hours"))
      return mockResponse({ hours: Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2,"0")}:00`, count: i >= 20 || i <= 2 ? 8 : 2 })) });
    if (urlStr.includes("/admin/stats/export"))
      return new Response("metric,value\ntotal_messages,142\nusers,37\n", { status: 200, headers: { "Content-Type":"text/csv","Content-Disposition":"attachment; filename=stats.csv" } });
    if (urlStr.includes("/admin/stats"))
      return mockResponse({ total_messages: 142, active_sessions: 8, total_users: 37, messages_today: 24, unanswered_count: store.unanswered.length, conversations_today: 11, feedback: { positive: 28, negative: 4, total: 32 } });

    if (urlStr.includes("/admin/feedback"))
      return mockResponse({ ok: true });

    if (urlStr.includes("/admin/favorites/suggestions"))
      return mockResponse({ suggestions: [{ question: "Cum ajung din Timișoara?", count: 5 }, { question: "Există duș gratuit?", count: 4 }] });
    if (urlStr.includes("/admin/favorites") && method === "DELETE")
      return mockResponse({ ok: true });
    if (urlStr.includes("/admin/favorites") && method === "POST")
      return mockResponse({ ok: true });
    if (urlStr.includes("/admin/favorites"))
      return mockResponse({ favorites: store.favorites });

    if (urlStr.includes("/admin/kb/upload") && method === "POST") {
      await sleep(1200);
      return mockResponse({ message: "Fișiere procesate și adăugate în knowledge base!" });
    }

    return originalFetch(url, options);
  };

  console.log("%c🏰 Mock Backend activ — notificările vin doar de la admin replies!", "color:#E8003A;font-weight:bold;font-size:14px");
}