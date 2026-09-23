import { z } from "zod";
import { prisma } from "../config/database.js";
import { isValidUsername } from "../utils/username.js";
import { verificationIdFor } from "../utils/files.js";
import { verifyToken } from "../utils/jwt.js";

// Strict: lowercase, [a-z0-9-_], 3-24 chars. Lowercasing normalises the URL
// so /RiyaSharma and /riyasharma hit the same record. The reserved-list check
// runs separately in validateUsernameParam via isValidUsername.
const usernameParamSchema = z
  .string({ required_error: "Username is required." })
  .trim()
  .toLowerCase()
  .min(3)
  .max(24)
  .regex(/^[a-z0-9_][a-z0-9_-]*$/, "Username contains unsupported characters.");

export function validateUsernameParam(value) {
  const parsed = usernameParamSchema.safeParse(value);
  if (!parsed.success) return null;
  // Reserved words (login, dashboard, ...) must behave exactly like a missing
  // user — no information leaked, same 404 body.
  if (!isValidUsername(parsed.data)) return null;
  return parsed.data;
}

// Sensitive sections default to private; the public profile itself defaults to
// public so existing accounts keep working. "connections" is treated as
// non-public for anonymous visitors (no connection graph exists yet).
export const DEFAULT_PRIVACY = {
  profile: "public",
  academics: "public",
  credentials: "public",
  activity: "private"
};

const PRIVACY_LEVELS = new Set(["public", "connections", "private"]);

function privacyLevel(privacy, key) {
  const stored = privacy && typeof privacy === "object" ? privacy[key] : undefined;
  return PRIVACY_LEVELS.has(stored) ? stored : DEFAULT_PRIVACY[key];
}

export function isPublic(privacy, key) {
  return privacyLevel(privacy, key) === "public";
}

const VERIFY_ID_PATTERN = /^UPX-[A-Z0-9]{8}$/i;

function verifyIdMatches(documentId, verificationId) {
  return verificationIdFor(documentId).toLowerCase() === verificationId.toLowerCase();
}

// Anonymous, public per-document verification. Reveals only the same metadata
// the public credentials list already exposes (name, type, issuer, issued-on)
// for a *verified* document, and only when the owner's profile and credentials
// sections are public. Anything else — private account, private credentials,
// unknown/never-verified ID — collapses to the identical 404, leaking nothing.
export async function getVerifyInfo(req, res) {
  const raw = String(req.params.verificationId || "").trim();
  if (!VERIFY_ID_PATTERN.test(raw)) {
    return res.status(404).json({ message: "This verification ID doesn't exist." });
  }
  const verificationId = raw.toUpperCase();

  // Prefer the stored column (written when a document is verified); fall back to
  // the derived identifier for older rows whose column was never persisted.
  let document = await prisma.vaultDocument.findFirst({
    where: { verificationId: { equals: verificationId, mode: "insensitive" }, verified: true },
    include: {
      user: { select: { id: true, name: true, username: true, profilePublic: true, privacy: true } }
    }
  });

  if (!document) {
    const candidates = await prisma.vaultDocument.findMany({
      where: { verified: true },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        fileName: true,
        documentType: true,
        issuer: true,
        createdAt: true,
        userId: true,
        user: { select: { id: true, name: true, username: true, profilePublic: true, privacy: true } }
      }
    });
    document = candidates.find((candidate) => verifyIdMatches(candidate.id, verificationId)) || null;
  }

  if (
    !document ||
    document.user.profilePublic === false ||
    !isPublic(document.user.privacy, "profile") ||
    !isPublic(document.user.privacy, "credentials")
  ) {
    return res.status(404).json({ message: "This verification ID doesn't exist." });
  }

  // Count the check as a credential view for the owner's analytics — the same
  // event the public credentials list triggers — but never for the owner.
  let selfId = null;
  const token = req.cookies?.upnex_token;
  if (token) {
    try {
      selfId = verifyToken(token)?.id || null;
    } catch {
      selfId = null;
    }
  }
  if (selfId !== document.userId) {
    try {
      await prisma.profileEvent.create({
        data: {
          userId: document.userId,
          kind: "credentialView",
          refType: document.documentType || null,
          refId: verificationId.slice(0, 80),
          meta: { ip: hashSource(req.ip), ua: hashSource(req.headers["user-agent"]) }
        }
      });
    } catch {
      // Activity tracking must never break the verify result.
    }
  }

  res.json({
    verificationId,
    student: { name: document.user.name, username: document.user.username },
    document: {
      name: document.fileName,
      type: document.documentType,
      issuer: document.issuer || null,
      issuedAt: document.createdAt,
      fileHash: document.fileHash || null,
      verifiedBy: document.verifiedBy || null,
      verifiedAt: document.verifiedAt || null
    }
  });
}

// Academic snapshot is DERIVED from existing marks — never stored or invented.
// Returns null when there is nothing to show so the UI hides the section.
function buildAcademicSnapshot(marks) {
  if (!marks.length) return null;

  const average = Math.round(marks.reduce((sum, mark) => sum + mark.score, 0) / marks.length);

  const byCategory = marks.reduce((acc, mark) => {
    (acc[mark.category] = acc[mark.category] || []).push(mark.score);
    return acc;
  }, {});
  const categories = Object.entries(byCategory)
    .map(([name, scores]) => ({ name, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }))
    .sort((a, b) => b.avg - a.avg);
  const strongAreas = categories.slice(0, 3).map((entry) => entry.name);
  const improvementAreas = categories
    .slice()
    .reverse()
    .filter((entry) => !strongAreas.includes(entry.name))
    .slice(0, 2)
    .map((entry) => entry.name);

  // Trend compares the earlier half of the (chronological) marks with the later
  // half. Only reported once there are enough marks to be meaningful.
  let trend = "steady";
  if (marks.length >= 4) {
    const ordered = [...marks].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const half = Math.floor(ordered.length / 2);
    const early = ordered.slice(0, half).reduce((sum, mark) => sum + mark.score, 0) / half;
    const late = ordered.slice(half).reduce((sum, mark) => sum + mark.score, 0) / (ordered.length - half);
    if (late - early >= 4) trend = "improving";
    else if (early - late >= 4) trend = "declining";
  }

  return {
    average,
    cgpa: Math.round((average / 10) * 10) / 10,
    strongAreas,
    improvementAreas,
    trend,
    subjects: marks.length
  };
}

// Merges user-declared skills with the skills referenced by projects. A skill
// is never badged "verified" here: Phase 1 only links the evidence that exists.
function mergeSkills(declared, projects) {
  const map = new Map();
  const add = (raw, level) => {
    const name = String(raw || "").trim();
    if (!name) return null;
    const key = name.toLowerCase();
    if (!map.has(key)) map.set(key, { name, level: level || null, evidence: [] });
    else if (level && !map.get(key).level) map.get(key).level = level;
    return map.get(key);
  };

  for (const entry of Array.isArray(declared) ? declared : []) {
    add(entry?.name, entry?.level);
  }

  for (const project of projects) {
    for (const raw of Array.isArray(project.skills) ? project.skills : []) {
      const skill = add(raw, null);
      if (skill && !skill.evidence.some((item) => item.title === project.title)) {
        skill.evidence.push({ type: "project", title: project.title });
      }
    }
  }

  return [...map.values()].map((skill) => ({
    name: skill.name,
    level: skill.level,
    evidenceCount: skill.evidence.length,
    evidence: skill.evidence.slice(0, 6)
  }));
}

export async function getPublicProfile(req, res) {
  const username = validateUsernameParam(req.params.username);

  if (!username) {
    return res.status(404).json({ message: "That profile doesn't exist." });
  }

  // Exact-match lookup via Prisma (parameterised) — no string interpolation,
  // so route params can never inject or broaden the query. Only explicitly
  // public fields are selected; email, passwordHash, storage keys and internal
  // ids are never read, so they can never leak.
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
      name: true,
      avatar: true,
      bio: true,
      headline: true,
      location: true,
      availability: true,
      coverUrl: true,
      githubUrl: true,
      linkedinUrl: true,
      profilePublic: true,
      privacy: true,
      education: true,
      skills: true,
      createdAt: true,
      social: true,
      targetRole: true,
      careerGoal: true,
      interests: true,
      openTo: true,
      experiences: {
        select: { role: true, company: true, type: true, startDate: true, endDate: true, current: true, description: true, skills: true },
        orderBy: { sortOrder: "asc" }
      },
      learnings: {
        select: { topic: true, category: true, progress: true, startDate: true, targetDate: true, resource: true },
        orderBy: { createdAt: "desc" }
      },
      achievements: {
        select: { title: true, organization: true, category: true, date: true, description: true, proofUrl: true, imageUrl: true, verified: true },
        orderBy: { createdAt: "desc" }
      },
      documents: {
        where: { verified: true },
        select: { id: true, fileName: true, documentType: true, issuer: true, createdAt: true },
        orderBy: { createdAt: "desc" }
      },
      projects: {
        select: {
          title: true,
          description: true,
          skills: true,
          proofUrl: true,
          featured: true,
          thumbnailUrl: true,
          demoUrl: true,
          repoUrl: true,
          status: true,
          createdAt: true
        },
        orderBy: { createdAt: "desc" }
      },
      marks: {
        select: { subject: true, category: true, score: true, createdAt: true },
        orderBy: { score: "asc" }
      }
    }
  });

  // A private (or profile-hidden) account must be indistinguishable from a
  // missing one — same 404, no information about the account.
  if (!user || user.profilePublic === false || !isPublic(user.privacy, "profile")) {
    return res.status(404).json({ message: "That profile doesn't exist." });
  }

  const academicsVisible = isPublic(user.privacy, "academics");
  const credentialsVisible = isPublic(user.privacy, "credentials");

  const projects = user.projects.map((project) => ({
    title: project.title,
    description: project.description,
    skills: Array.isArray(project.skills) ? project.skills : [],
    thumbnailUrl: project.thumbnailUrl || null,
    demoUrl: project.demoUrl || null,
    repoUrl: project.repoUrl || project.proofUrl || null,
    status: project.status || null,
    featured: Boolean(project.featured),
    createdAt: project.createdAt
  }));

  const skills = mergeSkills(user.skills, user.projects);

  const credentials = credentialsVisible
    ? user.documents.map((document) => ({
        title: document.fileName,
        type: document.documentType,
        issuer: document.issuer || null,
        verified: true,
        verificationId: document.verificationId || verificationIdFor(document.id),
        date: document.createdAt
      }))
    : [];

  const academics = academicsVisible ? buildAcademicSnapshot(user.marks) : null;

  const experiences = (user.experiences || []).map((entry) => ({
    role: entry.role,
    company: entry.company,
    type: entry.type,
    startDate: entry.startDate,
    endDate: entry.endDate,
    current: Boolean(entry.current),
    description: entry.description,
    skills: Array.isArray(entry.skills) ? entry.skills : []
  }));

  const learnings = (user.learnings || []).map((entry) => ({
    topic: entry.topic,
    category: entry.category,
    progress: entry.progress,
    startDate: entry.startDate,
    targetDate: entry.targetDate,
    resource: entry.resource
  }));

  const achievements = credentialsVisible
    ? (user.achievements || []).map((entry) => ({
        title: entry.title,
        organization: entry.organization,
        category: entry.category,
        date: entry.date,
        description: entry.description,
        proofUrl: entry.proofUrl,
        imageUrl: entry.imageUrl,
        verified: Boolean(entry.verified)
      }))
    : [];

  res.json({
    profile: {
      username: user.username,
      name: user.name,
      avatar: user.avatar,
      coverUrl: user.coverUrl,
      headline: user.headline,
      bio: user.bio,
      location: user.location,
      availability: user.availability,
      githubUrl: user.githubUrl,
      linkedinUrl: user.linkedinUrl,
      social: user.social || null,
      targetRole: user.targetRole,
      careerGoal: user.careerGoal,
      interests: Array.isArray(user.interests) ? user.interests : [],
      openTo: Array.isArray(user.openTo) ? user.openTo : user.openTo || null,
      joined: user.createdAt,
      verified: credentials.length > 0
    },
    sections: {
      academics: academicsVisible,
      credentials: credentialsVisible,
      achievements: credentialsVisible,
      experience: true,
      learning: true,
      career: true
    },
    stats: {
      projects: projects.length,
      skills: skills.length,
      credentials: credentials.length,
      subjects: academicsVisible ? user.marks.length : 0
    },
    projects,
    featured: projects.filter((project) => project.featured),
    skills,
    education: Array.isArray(user.education) ? user.education : [],
    academics,
    credentials,
    experiences,
    learnings,
    achievements
  });
}

const EVENT_KINDS = new Set(["view", "projectClick", "credentialView", "share", "resume"]);

function hashSource(source) {
  const input = String(source || "");
  let hash = 5381;
  for (let i = 0; i < input.length && i < 128; i += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return `h${hash.toString(16)}`;
}

// Anonymous interaction tracking. Nothing identifies a visitor: only a hash of
// the user agent and the client IP are stored, so owners can read reach without
// ever learning who came by.
export async function recordEvent(req, res) {
  const username = validateUsernameParam(req.params.username);
  if (!username) {
    return res.status(404).json({ message: "That profile doesn't exist." });
  }

  const { kind, refType, refId } = req.body || {};
  if (!EVENT_KINDS.has(kind)) {
    return res.status(400).json({ message: "Unknown event." });
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, profilePublic: true, privacy: true }
  });
  if (!user || user.profilePublic === false || !isPublic(user.privacy, "profile")) {
    return res.status(404).json({ message: "That profile doesn't exist." });
  }

  let selfId = null;
  const token = req.cookies?.upnex_token;
  if (token) {
    try {
      selfId = verifyToken(token)?.id || null;
    } catch {
      selfId = null;
    }
  }
  if (selfId === user.id) return res.status(204).send();

  const sensitive = /(credential|resume)/i.test(kind);
  if (sensitive && !isPublic(user.privacy, "credentials")) return res.status(204).send();

  await prisma.profileEvent.create({
    data: {
      userId: user.id,
      kind,
      refType: refType ? String(refType).slice(0, 40) : null,
      refId: refId ? String(refId).slice(0, 80) : null,
      meta: { ip: hashSource(req.ip), ua: hashSource(req.headers["user-agent"]) }
    }
  });
  res.status(204).send();
}
