import { prisma } from "../config/database.js";

export async function listNotifications(req, res) {
  // Clamp aggressively: fractional/negative limits must not reach Prisma's
  // `take` (it rejects them and turns a tiny bad query into a 500).
  const parsed = Number.parseInt(req.query.limit, 10);
  const limit = Number.isNaN(parsed) ? 30 : Math.min(Math.max(parsed, 1), 100);
  const notifications = await prisma.notification.findMany({
    where: { userId: req.auth.id },
    orderBy: { createdAt: "desc" },
    take: limit
  });
  res.json({ notifications });
}

export async function unreadCount(req, res) {
  const count = await prisma.notification.count({
    where: { userId: req.auth.id, readAt: null }
  });
  res.json({ count });
}

export async function markNotificationsRead(req, res) {
  const body = req.body || {};
  if (body.all === true) {
    await prisma.notification.updateMany({
      where: { userId: req.auth.id, readAt: null },
      data: { readAt: new Date() }
    });
    return res.json({ ok: true });
  }

  const { id } = body;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "A notification id is required." });
  }
  const updated = await prisma.notification.updateMany({
    where: { id, userId: req.auth.id },
    data: { readAt: new Date() }
  });
  res.json({ ok: updated.count > 0 });
}