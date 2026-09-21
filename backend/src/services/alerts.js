import { sendMail, wrapEmail } from "./mailer.js";
import { notifyUser, emailWants } from "./notify.js";

function deviceLabel(req) {
  const ua = String(req.headers?.["user-agent"] || "");
  if (/iPad|iPhone|Android/i.test(ua)) return "a mobile device";
  if (/Macintosh|Windows|Linux/i.test(ua)) return "a desktop browser";
  return "a browser";
}

// Security alert on every sign-in (conventional credentials, Google, or the
// Firebase exchange). Shown in-app as a notification and mirrored to email —
// both honour the user's emailPrefs login switch.
export async function sendLoginAlert({ user, req, via = "Email" }) {
  if (!user?.email) return null;

  const link = "/dashboard";
  await notifyUser({
    userId: user.id,
    type: "login",
    title: "New sign-in to your account",
    message: `Signed in with ${via}. We've emailed you a heads-up.`,
    link
  });

  if (emailWants(user.emailPrefs, "login")) {
    await sendMail({
      to: user.email,
      userId: user.id,
      subject: "New sign-in to your UPNEX account",
      html: wrapEmail(`
        <h2 style="margin:0 0 8px;font-size:18px;color:#fff;">New sign-in detected</h2>
        <p style="margin:0;">Your UPNEX account was just signed in via <b>${via}</b> from ${deviceLabel(req)} (${req.ip || "unknown IP"}).</p>
        <p style="margin:14px 0 0;">If this was you, you're all set — no action needed.</p>
        <p style="margin:6px 0 0;">If you didn't just sign in, change your password and reply to this email straight away.</p>`)
    });
  }
  return null;
}

export async function sendWelcome({ user }) {
  if (!user?.email) return null;
  await notifyUser({
    userId: user.id,
    type: "system",
    title: "Welcome to UPNEX",
    message: "Verify marksheets, understand your skills and build a shareable career record.",
    link: "/dashboard"
  });
  if (emailWants(user.emailPrefs, "login")) {
    await sendMail({
      to: user.email,
      userId: user.id,
      subject: "Welcome to UPNEX",
      html: wrapEmail(`
        <h2 style="margin:0 0 8px;font-size:18px;color:#fff;">Welcome to UPNEX</h2>
        <p style="margin:0;">Your account is ready. Add your first marksheet to the vault and UPNEX will turn it into skills, guidance and a shareable career record.</p>`)
    });
  }
  return null;
}