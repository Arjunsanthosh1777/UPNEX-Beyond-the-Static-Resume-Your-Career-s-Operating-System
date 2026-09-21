import { prisma } from "../config/database.js";

// Single place that creates in-app notifications so every triggered flow uses
// the same shape (type drives the icon in the bell, link deep-links the app).
export async function notifyUser({ userId, type, title, message = null, link = null }) {
  return prisma.notification.create({ data: { userId, type, title, message, link } });
}

// Whether a user has opted into a given email class. Defaults to on for login
// security alerts, verification results and upload confirmations — off for
// view digests unless enabled — mirroring sensible safe-by-default choices.
export function emailWants(prefs, key) {
  if (!prefs || typeof prefs !== "object") return true;
  if (prefs.all === false) return false;
  return prefs[key] !== false;
}