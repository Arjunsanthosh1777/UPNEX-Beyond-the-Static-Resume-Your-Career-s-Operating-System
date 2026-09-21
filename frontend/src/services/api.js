import axios from "axios";

// The backend origin is runtime-configurable so the same build can talk to a
// local API (relative /api through the Vite proxy) or a hosted API reached
// cross-origin. Overridden at runtime from /config.js: WINDOW.UPNEX_API_BASE.
const API_BASE = (typeof window !== "undefined" && window.UPNEX_API_BASE) || "/api";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true
});

export default api;