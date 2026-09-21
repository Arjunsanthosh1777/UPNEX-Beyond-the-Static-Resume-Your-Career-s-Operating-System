import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../config/database.js";

const fromName = process.env.MAIL_FROM_NAME || "UPNEX";
const fromAddress = process.env.MAIL_FROM || "no-reply@upnex.ai";

// Branded wrapper shared by every outbound email so the whole mailbox reads as
// one product, whatever transport actually delivers it.
export function wrapEmail(body) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#0b0b10;color:#d6d8de;padding:28px 16px;">
    <div style="max-width:520px;margin:0 auto;background:#12121a;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:26px 26px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:30px;height:30px;border-radius:9px;background:#7c4dff;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;">U</div>
        <b style="letter-spacing:.5px;color:#fff;">UPNEX</b>
      </div>
      <div style="margin-top:18px;color:#e6e8ec;font-size:15px;line-height:1.6;">${body}</div>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:22px 0;"/>
      <p style="color:#7c8291;font-size:12px;margin:0;line-height:1.6;">
        You're receiving this because you have an UPNEX account.<br/>
        If this looks unexpected, reply to this email and we'll help.
      </p>
    </div>
  </div>`;
}

const backendLogsDir = () => path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../logs");

// SMTP is optional: with SMTP_* env set a transport is built, otherwise every
// message is recorded on the OutboxEmail ledger and logged to logs/emails.log
// so the delivery pipeline is testable without any real provider.
async function delivery() {
  if (!process.env.SMTP_HOST) return null;
  let nodemailer = null;
  try {
    nodemailer = (await import("nodemailer")).default;
  } catch {
    nodemailer = null;
  }
  if (!nodemailer) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  });
}

export async function sendMail({ to, subject, html, userId = null }) {
  const record = await prisma.outboxEmail.create({ data: { to, subject, html, userId, status: "queued" } });

  const transport = await delivery();
  if (!transport) {
    await mkdir(backendLogsDir(), { recursive: true }).catch(() => {});
    await appendFile(
      path.join(backendLogsDir(), "emails.log"),
      `${JSON.stringify({ id: record.id, to, subject, at: new Date().toISOString() })}\n`,
      "utf8"
    ).catch(() => {});
    return prisma.outboxEmail.update({ where: { id: record.id }, data: { status: "logged", sentAt: new Date() } });
  }

  try {
    await transport.sendMail({ from: `"${fromName}" <${fromAddress}>`, to, subject, html });
    return prisma.outboxEmail.update({ where: { id: record.id }, data: { status: "sent", sentAt: new Date() } });
  } catch (error) {
    return prisma.outboxEmail.update({
      where: { id: record.id },
      data: { status: "failed", error: String(error?.message || error).slice(0, 400) }
    });
  }
}