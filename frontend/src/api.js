// src/api.js
const API_URL = "http://localhost:8000";

// Helper pentru a lua token-ul salvat
const getAuthHeaders = () => {
  const token = localStorage.getItem("ec_token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
};

export const api = {
  // 1. Autentificare
  login: async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error("Credentiale invalide");
    const data = await res.ok ? await res.json() : {};
    if (data.access_token) {
      localStorage.setItem("ec_token", data.access_token);
    }
    return data;
  },

  register: async (email, password) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error("Inregistrarea a esuat");
    return res.json();
  },

  // 2. Chat Real-Time
  sendMessage: async (sessionId, message) => {
    const res = await fetch(`${API_URL}/chat/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ session_id: sessionId, message })
    });
    if (!res.ok) throw new Error("Eroare la trimiterea mesajului");
    return res.json(); // Se asteapta sa returneze raspunsul text/obiectul de la AI
  },

  // 3. Admin & Statistici
  getStats: async () => {
    const res = await fetch(`${API_URL}/admin/stats`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Nu ai acces la statistici");
    return res.json();
  },

  exportStats: async () => {
    const res = await fetch(`${API_URL}/admin/stats/export`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Exportul a esuat");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ec_statistici.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  uploadKnowledgeBase: async (file) => {
    const formData = new FormData();
    formData.append("file", file); // Backend-ul asteapta "file"

    const res = await fetch(`${API_URL}/admin/kb/upload`, {
      method: "POST",
      headers: getAuthHeaders(), // FARA Content-Type json! Fetch isi pune singur boundary-ul pt FormData
      body: formData
    });
    if (!res.ok) throw new Error("Upload-ul a esuat");
    return res.json();
  }
};