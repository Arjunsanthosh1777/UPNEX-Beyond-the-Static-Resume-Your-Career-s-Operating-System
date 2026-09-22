import "dotenv/config";
import { validateEnv } from "./config/validateEnv.js";

validateEnv();

const { default: app } = await import("./app.js");

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`UPNEX API running on http://localhost:${port}`);
  startKeepAlive();
});

// Render's free web services sleep after ~15 minutes without traffic, so the
// first visitor of the day pays a long cold start. Scraping /api/health every
// few minutes keeps the web instance awake. Production-only and configured via
// RENDER_EXTERNAL_URL (set automatically on Render) or KEEP_ALIVE_URL.
function startKeepAlive() {
  const target = process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL || "";
  if (!target) {
    console.log("Keep-alive: disabled (no RENDER_EXTERNAL_URL / KEEP_ALIVE_URL).");
    return;
  }
  const minutes = Math.max(1, Number(process.env.KEEP_ALIVE_MINUTES || 5));
  const ping = async () => {
    try {
      const res = await fetch(`${target}/api/health`, { signal: AbortSignal.timeout(15000) });
      console.log(`Keep-alive: ${res.status}`);
    } catch (error) {
      console.warn(`Keep-alive ping failed: ${error.message}`);
    }
  };
  ping();
  setInterval(ping, minutes * 60 * 1000);
  console.log(`Keep-alive: pinging ${target}/api/health every ${minutes} min`);
}