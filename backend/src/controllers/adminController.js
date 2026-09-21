import { prisma } from "../config/database.js";
import { verificationIdFor } from "../utils/files.js";
import { notifyUser, emailWants } from "../services/notify.js";
import { sendMail, wrapEmail } from "../services/mailer.js";

// Every unverified upload lands on the reviewer queue. Approving stamps the
// verification ID (stored one wins, else derived), records the issuing body,
// then notifies + emails the owner — the last step that makes a public
// UPX-…. link trustworthy.
export async function listPendingDocuments(req, res) {
  const documents = await prisma.vaultDocument.findMany({
    where: { verified: false },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      user: { select: { id: true, name: true, username: true, email: true } }
    }
  });
  res.json({ documents });
}

export async function approveDocument(req, res) {
  const document = await prisma.vaultDocument.findUnique({
    where: { id: req.params.id },
    include: { user: true }
  });
  if (!document) return res.status(404).json({ message: "Document not found." });
  if (document.verified) return res.status(409).json({ message: "Document is already verified." });

  const body = req.body || {};
  const fileName = typeof body.fileName === "string" && body.fileName.trim()
    ? body.fileName.trim()
    : document.fileName;
  const issuer = typeof body.issuer === "string" && body.issuer.trim()
    ? body.issuer.trim()
    : document.issuer;

  const updated = await prisma.vaultDocument.update({
    where: { id: document.id },
    data: {
      verified: true,
      fileName,
      issuer,
      verificationId: document.verificationId || verificationIdFor(document.id)
    }
  });

  await notifyUser({
    userId: document.userId,
    type: "verify",
    title: "Document verified",
    message: `${fileName} is now verified and shareable.`,
    link: "/profile/vault"
  });

  if (emailWants(document.user.emailPrefs, "verify")) {
    await sendMail({
      to: document.user.email,
      userId: document.userId,
      subject: "Your UPNEX document was verified",
      html: wrapEmail(`
        <h2 style="margin:0 0 8px;font-size:18px;color:#fff;">Document verified</h2>
        <p style="margin:0;"><b>${fileName}</b> passed UPNEX review and now carries a public verification badge.</p>
        <p style="margin:12px 0 0;"><code style="background:#1b1b26;padding:4px 8px;border-radius:6px;color:#d9c9ff;">${updated.verificationId}</code></p>
        <p style="margin:12px 0 0;">You can copy its verify link from the vault in your profile.</p>`)
    });
  }

  res.json({ document: updated });
}

export async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, name: true, email: true, username: true, role: true, createdAt: true }
  });
  res.json({ users });
}