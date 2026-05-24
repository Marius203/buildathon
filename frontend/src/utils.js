export const API_URL = "http://localhost:8001";
export const POLL_INTERVAL = 30000;

export function getToken()     { return localStorage.getItem("ec_token"); }
export function getUserEmail() { return localStorage.getItem("ec_email"); }
export function isAdmin()      { return localStorage.getItem("ec_role") === "admin"; }

export function getSessionId() {
  if (!window._ecSessionId) {
    window._ecSessionId = "session-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  }
  return window._ecSessionId;
}

export function logout() {
  localStorage.removeItem("ec_token");
  localStorage.removeItem("ec_email");
  localStorage.removeItem("ec_role");
}

export async function ensureAuth() {
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

export function authHeaders() {
  return { "Content-Type": "application/json", authorization: `Bearer ${getToken()}` };
}

export function formatText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g, "<br/>");
}

export function playNotifSound() {
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
  } catch (e) {}
}