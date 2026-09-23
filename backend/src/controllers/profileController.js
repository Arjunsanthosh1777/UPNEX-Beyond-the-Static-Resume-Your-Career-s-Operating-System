import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "../config/database.js";
import { signAccessToken } from "../utils/signedUrl.js";
import { isValidUsername, normalizeUsername } from "../utils/username.js";
import { deleteFile, mediaStorageRoot, putFile, readBuffer } from "../services/objectStore.js";
import { guessCategory, parseMarks, recognizeImage } from "../services/ocr.js";
import {
  ALLOWED_MIME,
  buildStorageKey,
  friendlyDownloadName,
  previewKind,
  safeBasename,
  verificationIdFor
} from "../utils/files.js";

const DOCUMENT_TYPES = ["MARKSHEET", "CERTIFICATE", "RESUME", "OTHER"];

// Professional availability states. Stored as free text but constrained to this
// list so the public profile can render a consistent status pill.
const AVAILABILITY = [
  "Open to Internships",
  "Open to Jobs",
  "Open to Freelance",
  "Open to Collaborations",
  "Available for Opportunities",
  "Not Currently Available"
];

const PRIVACY_LEVELS = ["public", "connections", "private"];
const visibility = z.enum(PRIVACY_LEVELS);

const markSchema = z.object({
  subject: z.string().min(2).max(80),
  category: z.string().min(2).max(40),
  score: z.number().int().min(0).max(100),
  maxScore: z.number().int().min(1).max(1000).optional().default(100),
  grade: z.string().trim().max(16).optional().or(z.literal(""))
});

const markBatchSchema = z.object({
  docId: z.string().optional(),
  marks: z.array(markSchema).min(1).max(50)
});

const projectSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(10).max(500),
  skills: z.array(z.string().min(1).max(40)).max(12),
  proofUrl: z.string().url().optional().or(z.literal("")),
  featured: z.boolean().optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  demoUrl: z.string().url().optional().or(z.literal("")),
  repoUrl: z.string().url().optional().or(z.literal("")),
  status: z.string().trim().max(40).optional().or(z.literal(""))
});

// Partial update for a single project (featured toggle, links, status).
const projectUpdateSchema = projectSchema.partial();

const LANGUAGES = ["en", "hi", "ml", "ta", "te", "kn", "bn", "mr", "gu", "pa", "or", "as"];

const educationEntrySchema = z.object({
  degree: z.string().trim().min(2).max(120),
  institution: z.string().trim().min(2).max(160),
  startYear: z.string().trim().max(12).optional().or(z.literal("")),
  endYear: z.string().trim().max(12).optional().or(z.literal("")),
  grade: z.string().trim().max(40).optional().or(z.literal(""))
});

const skillEntrySchema = z.object({
  name: z.string().trim().min(1).max(40),
  level: z.enum(["Beginner", "Intermediate", "Advanced", "Expert"]).optional().nullable()
});

const privacySchema = z.object({
  profile: visibility,
  academics: visibility,
  credentials: visibility,
  activity: visibility
}).partial();

const socialLinkSchema = z.object({
  website: z.string().url().optional().or(z.literal("")),
  portfolio: z.string().url().optional().or(z.literal("")),
  x: z.string().url().optional().or(z.literal("")),
  youtube: z.string().url().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal(""))
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  githubUrl: z.string().url().refine((value) => new URL(value).hostname === "github.com" || new URL(value).hostname.endsWith(".github.com"), "Use a valid GitHub profile URL.").optional().or(z.literal("")),
  linkedinUrl: z.string().url().refine((value) => new URL(value).hostname === "linkedin.com" || new URL(value).hostname.endsWith(".linkedin.com"), "Use a valid LinkedIn profile URL.").optional().or(z.literal("")),
  preferredLanguage: z.enum(LANGUAGES).optional().nullable(),
  headline: z.string().trim().max(120).optional().or(z.literal("")),
  location: z.string().trim().max(80).optional().or(z.literal("")),
  availability: z.enum(AVAILABILITY).optional().nullable(),
  bio: z.string().trim().max(600).optional().or(z.literal("")),
  coverUrl: z.string().url().optional().or(z.literal("")),
  profilePublic: z.boolean().optional(),
  privacy: privacySchema.optional(),
  education: z.array(educationEntrySchema).max(6).optional(),
  skills: z.array(skillEntrySchema).max(40).optional(),
  avatar: z.string().trim().max(300).optional().or(z.literal("")),
  targetRole: z.string().trim().max(80).optional().or(z.literal("")),
  careerGoal: z.string().trim().max(240).optional().or(z.literal("")),
  interests: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  openTo: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
  social: socialLinkSchema.optional()
});

// Language is a cosmetic preference, so it gets its own partial-safe endpoint
// rather than going through the strict identity schema (which needs a name).
const preferencesSchema = z.object({
  preferredLanguage: z.enum(LANGUAGES).nullable()
});

const EXPERIENCE_TYPES = ["internship", "full-time", "part-time", "freelance", "volunteer", "research", "student-organization"];
const ACHIEVEMENT_CATEGORIES = ["hackathon", "competition", "academic", "award", "leadership", "publication", "workshop", "community"];
const EVENT_KINDS = new Set(["view", "projectClick", "credentialView", "share", "resume"]);

const experienceSchema = z.object({
  role: z.string().trim().min(2).max(80),
  company: z.string().trim().min(1).max(120),
  type: z.enum(EXPERIENCE_TYPES).default("internship"),
  startDate: z.string().trim().max(20).optional().or(z.literal("")),
  endDate: z.string().trim().max(20).optional().or(z.literal("")),
  current: z.boolean().optional(),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  skills: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  sortOrder: z.number().int().min(0).max(1000).optional()
});

const learningSchema = z.object({
  topic: z.string().trim().min(2).max(80),
  category: z.string().trim().max(40).optional().or(z.literal("")),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: z.string().trim().max(20).optional().or(z.literal("")),
  targetDate: z.string().trim().max(20).optional().or(z.literal("")),
  resource: z.string().trim().max(240).optional().or(z.literal("")),
  notes: z.string().trim().max(400).optional().or(z.literal(""))
});

const achievementSchema = z.object({
  title: z.string().trim().min(2).max(120),
  organization: z.string().trim().max(120).optional().or(z.literal("")),
  category: z.enum(ACHIEVEMENT_CATEGORIES).default("competition"),
  date: z.string().trim().max(20).optional().or(z.literal("")),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  proofUrl: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  verified: z.boolean().optional()
});

const exposureToggleSchema = z.object({
  action: z.enum(["photo", "cover"])
});

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  username: true,
  avatar: true,
  githubUrl: true,
  linkedinUrl: true,
  role: true,
  preferredLanguage: true,
  headline: true,
  location: true,
  availability: true,
  coverUrl: true,
  profilePublic: true,
  privacy: true,
  education: true,
  skills: true,
  bio: true,
  targetRole: true,
  careerGoal: true,
  interests: true,
  openTo: true,
  social: true
};

function buildGuidance(marks, projects) {
  // Guidance is meaningless without at least one mark to anchor the average.
  // Return empty paths so the UI shows its onboarding state instead of a
  // misleading "0% match, Full Stack is your strongest" recommendation.
  if (marks.length === 0) return { average: 0, strongest: "", paths: [], nextSkills: [] };

  const average = Math.round(marks.reduce((sum, mark) => sum + mark.score, 0) / marks.length);
  const categories = marks.reduce((result, mark) => {
    result[mark.category] = (result[mark.category] || 0) + mark.score;
    return result;
  }, {});
  const strongest = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || "your strongest subject";
  const skills = projects.flatMap((project) => project.skills);
  const uniqueSkills = [...new Set(skills)];
  const paths = [
    { title: "Full Stack Development", match: Math.min(98, average + (uniqueSkills.some((skill) => /react|node|javascript/i.test(skill)) ? 10 : 0)), skills: ["API design", "Testing", "Deployment"] },
    { title: "AI & Machine Learning", match: Math.min(98, average + (uniqueSkills.some((skill) => /python|machine|data/i.test(skill)) ? 12 : 0)), skills: ["Python", "Model evaluation", "Linear algebra"] },
    { title: "Systems Engineering", match: Math.min(96, average + (uniqueSkills.some((skill) => /system|cloud|linux/i.test(skill)) ? 11 : 0)), skills: ["Linux", "Distributed systems", "Cloud architecture"] }
  ].sort((a, b) => b.match - a.match);

  return { average, strongest, paths, nextSkills: paths[0]?.skills || [] };
}

// Never expose storage keys or internal paths to the client.
function serializeDocument(document) {
  return {
    id: document.id,
    fileName: document.fileName,
    documentType: document.documentType,
    fileSize: document.fileSize,
    mime: document.mime || null,
    originalName: document.originalName || null,
    issuer: document.issuer || null,
    verified: document.verified,
    verificationId: document.verified ? (document.verificationId || verificationIdFor(document.id)) : null,
    verifiedBy: document.verifiedBy || null,
    verifiedAt: document.verifiedAt || null,
    fileHash: document.fileHash || null,
    hasFile: Boolean(document.storageKey),
    previewKind: document.mime ? previewKind(document.mime) : "unsupported",
    downloadCount: document.downloadCount,
    previewCount: document.previewCount,
    lastAccessedAt: document.lastAccessedAt,
    createdAt: document.createdAt
  };
}

function guessDocumentType(name) {
  const lower = safeBasename(name).toLowerCase();
  if (lower.includes("mark") || lower.includes("result") || lower.includes("transcript") || lower.includes("score")) return "MARKSHEET";
  if (lower.includes("resume") || lower.includes("cv")) return "RESUME";
  return "CERTIFICATE";
}

function parseDocumentFields(body) {
  const type = String(body.documentType || "").toUpperCase();
  return {
    fileName: safeBasename(body.fileName || "Document") || "Document",
    documentType: DOCUMENT_TYPES.includes(type) ? type : "OTHER"
  };
}

// ---------- Profile intelligence (completion, evidence, improvements) ----------

const COMPLETION_WEIGHTS = [
  { key: "basic", label: "Basic information", weight: 15, done: (user) => Boolean(user.name && user.username && user.headline) },
  { key: "about", label: "Professional summary", weight: 10, done: (user) => Boolean(user.bio) },
  { key: "education", label: "Education", weight: 15, done: (user) => (user.education || []).length > 0 },
  { key: "skills", label: "Skills", weight: 15, done: (user) => (user.skills || []).length > 0 },
  { key: "evidence", label: "Credentials & evidence", weight: 15, done: (user, ctx) => ctx.documents.some((document) => document.verified) },
  { key: "projects", label: "Projects", weight: 15, done: (user, ctx) => ctx.projects.length > 0 },
  { key: "experience", label: "Experience", weight: 10, done: (user, ctx) => ctx.experiences.length > 0 },
  { key: "career", label: "Career direction", weight: 5, done: (user) => Boolean(user.careerGoal || user.targetRole || (user.interests || []).length) }
];

function buildCompletion(user, ctx) {
  const items = COMPLETION_WEIGHTS.map((entry) => {
    const done = Boolean(entry.done(user, ctx));
    return { key: entry.key, label: entry.label, weight: entry.weight, done };
  });
  const percent = Math.round(items.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0));
  return { percent, items, missing: items.filter((item) => !item.done).map((item) => item.label) };
}

function skillContains(needle, haystacks) {
  const key = String(needle || "").trim().toLowerCase();
  if (!key) return false;
  return (haystacks || []).some((raw) => String(raw || "").toLowerCase().includes(key));
}

// Aggregation layer: every declared skill is linked to the projects and
// verified credentials that actually reference it. Nothing is guessed.
function buildEvidenceIntelligence(declared, projects, documents) {
  return (Array.isArray(declared) ? declared : []).map((entry) => {
    const name = String(entry?.name || "").trim();
    if (!name) return null;
    const projectMatches = projects.filter((project) => skillContains(name, project.skills));
    const credentialMatches = documents.filter(
      (document) => document.verified && skillContains(name, [document.fileName, document.documentType])
    );
    const githubMatches = projectMatches.filter((project) => Boolean(project.repoUrl));
    return {
      name,
      level: entry.level || null,
      projects: projectMatches.map((project) => project.title),
      github: githubMatches.map((project) => project.title),
      credentials: credentialMatches.map((document) => document.fileName),
      assessments: [],
      evidenceCount: projectMatches.length + credentialMatches.length + githubMatches.length
    };
  }).filter(Boolean);
}

function buildImprovements(user, ctx) {
  const suggestions = [];
  if (!user.username) suggestions.push({ title: "Claim your public username", section: "basic" });
  if (!user.headline) suggestions.push({ title: "Add a professional headline", section: "basic" });
  if (!user.bio) suggestions.push({ title: "Write your professional summary", section: "about" });
  if (!user.careerGoal && !user.targetRole) suggestions.push({ title: "Set a career direction", section: "career" });
  if (ctx.experiences.length === 0) suggestions.push({ title: "Add your first experience", section: "experience" });
  if (ctx.projects.length === 0) suggestions.push({ title: "Publish your first project", section: "projects" });
  if ((user.education || []).length === 0) suggestions.push({ title: "Add your education", section: "education" });
  const unproved = buildEvidenceIntelligence(user.skills, ctx.projects, ctx.documents).filter((skill) => skill.evidenceCount === 0);
  for (const skill of unproved.slice(0, 3)) {
    suggestions.push({ title: `Add evidence to ${skill.name}`, section: "evidence", skill: skill.name });
  }
  return suggestions.slice(0, 6);
}

function buildAnalyticsOverview(events) {
  const now = Date.now();
  const day = 86400000;
  const ranges = [
    { key: "7", cutoff: now - 7 * day },
    { key: "30", cutoff: now - 30 * day },
    { key: "90", cutoff: now - 90 * day },
    { key: "all", cutoff: 0 }
  ];
  const overview = {};
  for (const range of ranges) {
    const within = events.filter((event) => event.createdAt.getTime() >= range.cutoff);
    overview[range.key] = {
      total: within.length,
      views: within.filter((event) => event.kind === "view").length,
      projectClicks: within.filter((event) => event.kind === "projectClick").length,
      credentialViews: within.filter((event) => event.kind === "credentialView").length,
      shares: within.filter((event) => event.kind === "share").length,
      resumes: within.filter((event) => event.kind === "resume").length
    };
  }
  const byProject = {};
  for (const event of events.filter((entry) => entry.kind === "projectClick" && entry.refId)) {
    byProject[event.refId] = (byProject[event.refId] || 0) + 1;
  }
  return {
    overview,
    byProject,
    recent: events.slice(0, 10).map((event) => ({
      kind: event.kind,
      refType: event.refType,
      id: event.id,
      at: event.createdAt
    }))
  };
}

// ---------- Profile section CRUD ----------

export async function getProfile(req, res) {
  const [user, documents, marks, projects, experiences, learnings, achievements, events, studyBadges] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.auth.id }, select: PROFILE_SELECT }),
    prisma.vaultDocument.findMany({ where: { userId: req.auth.id }, orderBy: { createdAt: "desc" } }),
    prisma.academicMark.findMany({ where: { userId: req.auth.id }, orderBy: { score: "asc" } }),
    prisma.project.findMany({ where: { userId: req.auth.id }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }] }),
    prisma.profileExperience.findMany({ where: { userId: req.auth.id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    prisma.profileLearning.findMany({ where: { userId: req.auth.id }, orderBy: { createdAt: "desc" } }),
    prisma.achievement.findMany({ where: { userId: req.auth.id }, orderBy: { createdAt: "desc" } }),
    prisma.profileEvent.findMany({ where: { userId: req.auth.id }, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.studyBadge.count({ where: { userId: req.auth.id } })
  ]);
  const guidance = buildGuidance(marks, projects);
  // Readiness: academic average is the backbone, projects and verified docs
  // reward proof-of-work, and Smart Study badges reward consistency.
  const readiness = Math.min(100, Math.round(
    guidance.average * 0.65
    + Math.min(projects.length * 8, 24)
    + Math.min(documents.filter((doc) => doc.verified).length * 4, 12)
    + Math.min(studyBadges * 2, 8)
  ));
  const ctx = { documents, projects, experiences };
  // A deleted user's still-valid token sails through requireAuth; without this
  // guard the *buildX* helpers below would crash on user === null.
  if (!user) return res.status(404).json({ message: "Profile not found." });
  res.json({
    user,
    documents: documents.map(serializeDocument),
    marks,
    projects,
    experiences,
    learnings,
    achievements,
    guidance,
    readiness,
    completion: buildCompletion(user, ctx),
    intelligence: buildEvidenceIntelligence(user.skills, projects, documents),
    improvements: buildImprovements(user, ctx),
    analytics: buildAnalyticsOverview(events)
  });
}

export async function updateProfile(req, res) {
  const data = profileSchema.parse(req.body);

  // Only touch keys the caller actually sent: the portfolio identity form posts
  // name/links only, and must not blank out headline/privacy/education.
  const update = { name: data.name };
  // The social links follow the same !==-undefined rule — a rename-only PATCH
  // must never null them out.
  if (data.githubUrl !== undefined) update.githubUrl = data.githubUrl || null;
  if (data.linkedinUrl !== undefined) update.linkedinUrl = data.linkedinUrl || null;
  if (data.preferredLanguage !== undefined) update.preferredLanguage = data.preferredLanguage;
  if (data.headline !== undefined) update.headline = data.headline || null;
  if (data.location !== undefined) update.location = data.location || null;
  if (data.availability !== undefined) update.availability = data.availability || null;
  if (data.bio !== undefined) update.bio = data.bio || null;
  if (data.coverUrl !== undefined) update.coverUrl = data.coverUrl || null;
  if (data.profilePublic !== undefined) update.profilePublic = data.profilePublic;
  if (data.privacy !== undefined) update.privacy = data.privacy;
  if (data.education !== undefined) update.education = data.education;
  if (data.skills !== undefined) update.skills = data.skills;
  if (data.avatar !== undefined) update.avatar = data.avatar || null;
  if (data.targetRole !== undefined) update.targetRole = data.targetRole || null;
  if (data.careerGoal !== undefined) update.careerGoal = data.careerGoal || null;
  if (data.interests !== undefined) update.interests = data.interests;
  if (data.openTo !== undefined) update.openTo = data.openTo;
  if (data.social !== undefined) update.social = data.social;

  const user = await prisma.user.update({
    where: { id: req.auth.id },
    data: update,
    select: PROFILE_SELECT
  });
  res.json({ user });
}

export async function updateUsername(req, res) {
  const requested = normalizeUsername(req.body?.username);
  if (!requested) {
    return res.status(400).json({ message: "Use 3-24 letters, numbers, dashes or underscores." });
  }
  if (!isValidUsername(requested)) {
    return res.status(400).json({ message: "That username is reserved. Try another." });
  }
  const taken = await prisma.user.findUnique({ where: { username: requested }, select: { id: true } });
  if (taken && taken.id !== req.auth.id) {
    return res.status(409).json({ message: "That username is already taken." });
  }
  const user = await prisma.user.update({
    where: { id: req.auth.id },
    data: { username: requested },
    select: { username: true }
  });
  res.json({ user });
}

export async function updatePreferences(req, res) {
  const data = preferencesSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.auth.id },
    data: { preferredLanguage: data.preferredLanguage },
    select: { id: true, preferredLanguage: true }
  });
  res.json({ user });
}

// Multipart upload (file + documentType). Falls back to metadata-only when no
// file is attached so the endpoint keeps working for callers without a file.
export async function addDocument(req, res) {
  const file = req.file;
  const body = req.body || {};
  const fileName = safeBasename(body.fileName || file?.originalname || "Document") || "Document";
  const documentType = (typeof body.documentType === "string" && DOCUMENT_TYPES.includes(body.documentType.toUpperCase()))
    ? body.documentType.toUpperCase()
    : guessDocumentType(file?.originalname || fileName);
  const fileSize = file?.size ?? (Number.isFinite(Number(body.fileSize)) ? Number(body.fileSize) : 0);
  const mime = file?.mimetype || null;

  if (file && mime && !ALLOWED_MIME.has(mime)) {
    return res.status(400).json({ message: "This file type isn't supported in your vault yet." });
  }
  if (!file && fileSize <= 0) {
    return res.status(400).json({ message: "Choose a document to upload." });
  }

let storageKey = null;
  if (file) {
    storageKey = buildStorageKey(randomUUID(), mime);
    try {
      await putFile({ key: storageKey, data: file.buffer, contentType: mime });
    } catch (error) {
      return res.status(500).json({ message: "Could not store the uploaded file." });
    }
    try {
      const document = await prisma.vaultDocument.create({
        data: {
          userId: req.auth.id,
          fileName,
          documentType,
          fileSize,
          mime,
          originalName: safeBasename(file.originalname || fileName),
          storageKey,
          // SHA-256 fingerprint of the exact bytes, taken once at upload. It is
          // shown on the public verify page so the original contents can be
          // recognised if the file is ever re-downloaded elsewhere.
          fileHash: createHash("sha256").update(file.buffer).digest("hex")
        }
      });
      return res.status(201).json({ document: serializeDocument(document) });
    } catch (error) {
      await deleteFile({ key: storageKey }).catch(() => {});
      throw error;
    }
  }

  const fields = parseDocumentFields(body);
  const document = await prisma.vaultDocument.create({
    data: { userId: req.auth.id, fileSize: fileSize || 0, ...fields }
  });
  res.status(201).json({ document: serializeDocument(document) });
}

export async function updateDocument(req, res) {
  const existing = await prisma.vaultDocument.findFirst({
    where: { id: req.params.id, userId: req.auth.id }
  });
  if (!existing) return res.status(404).json({ message: "Document not found." });

  const body = req.body || {};
  const fileName = typeof body.fileName === "string" && body.fileName.trim() ? safeBasename(body.fileName) : existing.fileName;
  const type = typeof body.documentType === "string" && DOCUMENT_TYPES.includes(body.documentType.toUpperCase())
    ? body.documentType.toUpperCase()
    : existing.documentType;

  const document = await prisma.vaultDocument.update({
    where: { id: existing.id },
    data: { fileName, documentType: type }
  });
  res.json({ document: serializeDocument(document) });
}

export async function removeDocument(req, res) {
  const existing = await prisma.vaultDocument.findFirst({
    where: { id: req.params.id, userId: req.auth.id }
  });
  if (!existing) return res.status(404).json({ message: "Document not found." });

await prisma.vaultDocument.delete({ where: { id: existing.id } });
  if (existing.storageKey) {
    await deleteFile({ key: existing.storageKey }).catch(() => {});
  }
  res.status(204).send();
}

// Issues a short-lived capability URL. Whatever the file's visibility is, this
// hands out access only to the owning user; there is no separate "insecure
// preview" endpoint — preview and download share the exact same gate.
export async function getDocumentAccess(req, res) {
  const action = String(req.body?.action || "preview") === "download" ? "download" : "preview";
  const document = await prisma.vaultDocument.findFirst({
    where: { id: req.params.id, userId: req.auth.id }
  });
  if (!document) {
    return res.status(404).json({ message: "Document not found." });
  }
  if (!document.storageKey) {
    return res.status(409).json({ message: "This document has no file attached." });
  }

  const expiresIn = 600;
  // The URL is intentionally RELATIVE: the frontend resolves it against its own
  // API base (window.UPNEX_API_BASE || "same origin"). Building an absolute URL
  // from req headers is unreliable behind proxies (vite rewrites Host to the
  // backend, a tunnel sees its own host), so we never guess the client origin.
  const url = `/api/storage/file?token=${encodeURIComponent(signAccessToken({
    documentId: document.id,
    userId: req.auth.id,
    action,
    expiresInSec: expiresIn
  }))}`;

  res.json({
    url,
    filename: friendlyDownloadName(document.originalName || document.fileName),
    expiresIn,
    action
  });
}

// One subject per category, upserted by hand (no DB unique constraint so the
// same subject can be tracked across semesters later). Manual entries carry no
// source document; OCR-imported rows are replaced wholesale by batchSaveMarks.
export async function addMark(req, res) {
  const data = markSchema.parse(req.body);
  const existing = await prisma.academicMark.findFirst({
    where: { userId: req.auth.id, subject: data.subject, docId: null },
    orderBy: { createdAt: "desc" }
  });
  const mark = existing
    ? await prisma.academicMark.update({ where: { id: existing.id }, data })
    : await prisma.academicMark.create({ data: { ...data, userId: req.auth.id } });
  res.status(201).json({ mark });
}

export async function listMarks(req, res) {
  const marks = await prisma.academicMark.findMany({
    where: { userId: req.auth.id },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
    include: { doc: { select: { id: true, fileName: true, verified: true } } }
  });
  res.json({ marks });
}

export async function removeMark(req, res) {
  const existing = await prisma.academicMark.findFirst({
    where: { id: req.params.id, userId: req.auth.id }
  });
  if (!existing) return res.status(404).json({ message: "Mark not found." });
  await prisma.academicMark.delete({ where: { id: existing.id } });
  res.status(204).send();
}

// OCR path: reads the stored document bytes, recognises the text and returns
// candidate subject/score rows WITHOUT saving them. The client confirms (and
// can edit) the candidates, then calls batchSaveMarks.
export async function analyseDocument(req, res) {
  const document = await prisma.vaultDocument.findFirst({
    where: { id: req.params.id, userId: req.auth.id }
  });
  if (!document) return res.status(404).json({ message: "Document not found." });
  if (!document.storageKey) {
    return res.status(409).json({ message: "This document has no file attached." });
  }
  if (!document.mime || !document.mime.startsWith("image/")) {
    return res.status(422).json({ message: "Only image marksheets can be analysed automatically. Upload a photo of your marksheet (JPG, PNG or WebP)." });
  }

  const buffer = await readBuffer({ key: document.storageKey });
  if (!buffer) return res.status(404).json({ message: "The document file is missing." });

  const text = await recognizeImage(buffer).catch(() => null);
  if (!text) {
    return res.status(502).json({ message: "Couldn't read this marksheet. Try a clearer photo with good lighting." });
  }

  try {
    await prisma.vaultDocument.update({ where: { id: document.id }, data: { ocrText: text.slice(0, 20000) } });
  } catch {
    // Keeping the transcript is best-effort; the analysis itself must not fail.
  }

  const candidates = parseMarks(text).map((entry) => ({
    ...entry,
    category: guessCategory(document.fileName)
  }));
  res.json({ candidates, text: text.slice(0, 4000) });
}

// Replaces every OCR-imported mark for a document with the confirmed set the
// client sends back. Manual (docId-less) marks are never touched.
export async function batchSaveMarks(req, res) {
  const data = markBatchSchema.parse(req.body);
  const userId = req.auth.id;

  if (data.docId) {
    const document = await prisma.vaultDocument.findFirst({ where: { id: data.docId, userId } });
    if (!document) return res.status(404).json({ message: "Document not found." });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (data.docId) {
        await tx.academicMark.deleteMany({ where: { userId, docId: data.docId, source: "ocr" } });
      }
      return tx.academicMark.createMany({
        data: data.marks.map((mark) => ({
          userId,
          subject: mark.subject,
          category: mark.category,
          score: mark.score,
          maxScore: mark.maxScore ?? 100,
          grade: mark.grade || null,
          source: "ocr",
          docId: data.docId || null
        }))
      });
    });
    res.status(201).json({ count: result.count });
  } catch (error) {
    console.error("batch save marks failed:", error);
    res.status(409).json({ message: "Some subjects couldn't be saved. Try changing the scores to whole numbers and retry." });
  }
}

export async function addProject(req, res) {
  const data = projectSchema.parse(req.body);
  const project = await prisma.project.create({
    data: {
      userId: req.auth.id,
      title: data.title,
      description: data.description,
      skills: data.skills,
      proofUrl: data.proofUrl || null,
      featured: data.featured ?? false,
      thumbnailUrl: data.thumbnailUrl || null,
      demoUrl: data.demoUrl || null,
      repoUrl: data.repoUrl || null,
      status: data.status || null
    }
  });
  res.status(201).json({ project });
}

export async function updateProject(req, res) {
  const existing = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.auth.id }
  });
  if (!existing) return res.status(404).json({ message: "Project not found." });

  const data = projectUpdateSchema.parse(req.body);
  const update = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.description !== undefined) update.description = data.description;
  if (data.skills !== undefined) update.skills = data.skills;
  if (data.proofUrl !== undefined) update.proofUrl = data.proofUrl || null;
  if (data.featured !== undefined) update.featured = data.featured;
  if (data.thumbnailUrl !== undefined) update.thumbnailUrl = data.thumbnailUrl || null;
  if (data.demoUrl !== undefined) update.demoUrl = data.demoUrl || null;
  if (data.repoUrl !== undefined) update.repoUrl = data.repoUrl || null;
  if (data.status !== undefined) update.status = data.status || null;

  const project = await prisma.project.update({ where: { id: existing.id }, data: update });
  res.json({ project });
}

export async function removeProject(req, res) {
  const existing = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.auth.id }
  });
  if (!existing) return res.status(404).json({ message: "Project not found." });

  await prisma.project.delete({ where: { id: existing.id } });
  res.status(204).send();
}

// ---------- Profile photo / cover uploads ----------

const MEDIA_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
  ["image/avif", ".avif"]
]);

// Media keys are namespaced per user ("<userId>/photo.png"): the same shape
// the public media endpoint expects.
function clearImageVariants(userId, stem) {
  return Promise.all(
    [...MEDIA_TYPES.values()].map((ext) =>
      deleteFile({ key: `${userId}/${stem}${ext}`, root: mediaStorageRoot() }).catch(() => {})
    )
  );
}

async function persistImage(req, res, stem) {
  const file = req.file;
  if (!file) return res.status(400).json({ message: "No image was uploaded." });
  const ext = MEDIA_TYPES.get(file.mimetype);
  if (!ext) return res.status(400).json({ message: "Upload a JPG, PNG, GIF, WebP or AVIF image." });
  if (file.size > 5 * 1024 * 1024) return res.status(400).json({ message: "Images must be smaller than 5 MB." });

  const key = `${req.auth.id}/${stem}${ext}`;
  await clearImageVariants(req.auth.id, stem);
  await putFile({ key, data: file.buffer, contentType: file.mimetype, root: mediaStorageRoot() });
  return `/api/storage/media/${req.auth.id}/${stem}${ext}`;
}

export async function uploadPhoto(req, res) {
  const url = await persistImage(req, res, "photo");
  if (typeof url !== "string") return;
  const user = await prisma.user.update({ where: { id: req.auth.id }, data: { avatar: url }, select: PROFILE_SELECT });
  res.json({ user, photoUrl: url });
}

export async function uploadCover(req, res) {
  const url = await persistImage(req, res, "cover");
  if (typeof url !== "string") return;
  const user = await prisma.user.update({ where: { id: req.auth.id }, data: { coverUrl: url }, select: PROFILE_SELECT });
  res.json({ user, coverUrl: url });
}

async function removeImage(req, res, stem) {
  await clearImageVariants(req.auth.id, stem);
  const user = await prisma.user.update({
    where: { id: req.auth.id },
    data: stem === "photo" ? { avatar: null } : { coverUrl: null },
    select: PROFILE_SELECT
  });
  res.json({ user });
}

export async function removePhoto(req, res) {
  return removeImage(req, res, "photo");
}

export async function removeCover(req, res) {
  return removeImage(req, res, "cover");
}

// ---------- Experience CRUD ----------

export async function addExperience(req, res) {
  const data = experienceSchema.parse(req.body);
  // Read-then-write in one transaction so two quick adds can't both pick the
  // same sortOrder (the UI orders by it).
  const experience = await prisma.$transaction(async (tx) => {
    const maxOrder = await tx.profileExperience.aggregate({
      where: { userId: req.auth.id },
      _max: { sortOrder: true }
    });
    return tx.profileExperience.create({
      data: { ...data, sortOrder: data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1, userId: req.auth.id }
    });
  });
  res.status(201).json({ experience });
}

export async function updateExperience(req, res) {
  const existing = await prisma.profileExperience.findFirst({ where: { id: req.params.id, userId: req.auth.id } });
  if (!existing) return res.status(404).json({ message: "Experience not found." });
  const data = experienceSchema.partial().parse(req.body);
  const experience = await prisma.profileExperience.update({ where: { id: existing.id }, data });
  res.json({ experience });
}

export async function removeExperience(req, res) {
  const existing = await prisma.profileExperience.findFirst({ where: { id: req.params.id, userId: req.auth.id } });
  if (!existing) return res.status(404).json({ message: "Experience not found." });
  await prisma.profileExperience.delete({ where: { id: existing.id } });
  res.status(204).send();
}

export async function reorderExperience(req, res) {
  const { orderedIds } = (req.body || {});
  const sorted = Array.isArray(orderedIds)
    ? orderedIds.map((id, index) => ({ id: String(id), sortOrder: index + 1 })).slice(0, 50)
    : [];
  for (const entry of sorted) {
    await prisma.profileExperience.updateMany({ where: { id: entry.id, userId: req.auth.id }, data: { sortOrder: entry.sortOrder } });
  }
  const experiences = await prisma.profileExperience.findMany({ where: { userId: req.auth.id }, orderBy: { sortOrder: "asc" } });
  res.json({ experiences });
}

// ---------- Learning CRUD ----------

export async function addLearning(req, res) {
  const data = learningSchema.parse(req.body);
  const learning = await prisma.profileLearning.create({ data: { ...data, userId: req.auth.id } });
  res.status(201).json({ learning });
}

export async function updateLearning(req, res) {
  const existing = await prisma.profileLearning.findFirst({ where: { id: req.params.id, userId: req.auth.id } });
  if (!existing) return res.status(404).json({ message: "Learning item not found." });
  const data = learningSchema.partial().parse(req.body);
  const learning = await prisma.profileLearning.update({ where: { id: existing.id }, data });
  res.json({ learning });
}

export async function removeLearning(req, res) {
  const existing = await prisma.profileLearning.findFirst({ where: { id: req.params.id, userId: req.auth.id } });
  if (!existing) return res.status(404).json({ message: "Learning item not found." });
  await prisma.profileLearning.delete({ where: { id: existing.id } });
  res.status(204).send();
}

// ---------- Achievements CRUD ----------

export async function addAchievement(req, res) {
  const data = achievementSchema.parse(req.body);
  const achievement = await prisma.achievement.create({ data: { ...data, userId: req.auth.id } });
  res.status(201).json({ achievement });
}

export async function updateAchievement(req, res) {
  const existing = await prisma.achievement.findFirst({ where: { id: req.params.id, userId: req.auth.id } });
  if (!existing) return res.status(404).json({ message: "Achievement not found." });
  const data = achievementSchema.partial().parse(req.body);
  const achievement = await prisma.achievement.update({ where: { id: existing.id }, data });
  res.json({ achievement });
}

export async function removeAchievement(req, res) {
  const existing = await prisma.achievement.findFirst({ where: { id: req.params.id, userId: req.auth.id } });
  if (!existing) return res.status(404).json({ message: "Achievement not found." });
  await prisma.achievement.delete({ where: { id: existing.id } });
  res.status(204).send();
}

// ---------- Analytics ----------

export async function getAnalytics(req, res) {
  const [events, projects] = await Promise.all([
    prisma.profileEvent.findMany({ where: { userId: req.auth.id }, orderBy: { createdAt: "desc" }, take: 2000 }),
    prisma.project.findMany({ where: { userId: req.auth.id }, select: { id: true, title: true } })
  ]);
  const overview = buildAnalyticsOverview(events);
  const byProject = {};
  for (const event of events.filter((entry) => entry.kind === "projectClick" && entry.refId)) {
    const id = String(event.refId);
    byProject[id] = {
      count: (byProject[id]?.count || 0) + 1,
      title: projects.find((project) => project.id === id)?.title || "Unknown project"
    };
  }
  res.json({ overview: overview.overview, recent: overview.recent, byProject: Object.values(byProject).sort((a, b) => b.count - a.count) });
}

// ---------- Rule-based AI generators (real UPNEX data only) ----------

const LEVEL_RANK = { Expert: 4, Advanced: 3, Intermediate: 2, Beginner: 1 };

function topSkills(skills, limit) {
  const ranked = (Array.isArray(skills) ? skills : [])
    .filter((entry) => entry && String(entry.name || "").trim())
    .sort((a, b) => (LEVEL_RANK[b.level] || 0) - (LEVEL_RANK[a.level] || 0));
  return ranked.slice(0, limit);
}

function cap(word) {
  const text = String(word || "").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function headlineOptions(data) {
  const degree = data.education?.[0]?.degree?.trim() || null;
  const institution = data.education?.[0]?.institution?.trim() || null;
  const skills = topSkills(data.skills, 3).map((entry) => entry.name);
  const projectCount = data.projects?.length || 0;
  const role = data.targetRole?.trim() || null;
  const options = [];
  const push = (text) => {
    const cleaned = String(text || "").trim();
    if (cleaned && !options.includes(cleaned)) options.push(cleaned);
  };
  if (degree) {
    push(`${degree} Student${institution ? ` at ${institution}` : ""}${skills[0] ? ` - ${cap(skills[0])}` : ""}`);
  }
  if (skills[0]) {
    push(`${cap(skills[0])} enthusiast building ${projectCount ? `${projectCount} real-world project${projectCount > 1 ? "s" : ""}` : "real-world projects"}${skills[1] ? ` - ${cap(skills[1])}` : ""}`);
  }
  if (role) {
    push(`${role}${skills[0] ? ` - ${cap(skills[0])}` : ""}${projectCount ? ` - ${projectCount} project${projectCount > 1 ? "s" : ""}` : ""}`);
  }
  if (degree && skills.length) {
    push(`${degree}${skills.length ? ` - ${skills.map((name) => cap(name)).join(" - ")}` : ""}`);
  }
  if (!options.length) push("Student learner building with evidence");
  return options.slice(0, 4);
}

export async function generateHeadlines(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.auth.id },
    select: { headline: true, targetRole: true, education: true, skills: true }
  });
  const projects = await prisma.project.findMany({ where: { userId: req.auth.id }, select: { title: true } });
  const options = headlineOptions({ ...user, projects });
  res.json({ options, current: user?.headline || null });
}

export async function generateAbout(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.auth.id },
    select: { name: true, headline: true, targetRole: true, careerGoal: true, location: true, education: true, skills: true }
  });
  const [projects, documents, experiences] = await Promise.all([
    prisma.project.findMany({ where: { userId: req.auth.id }, select: { title: true } }),
    prisma.vaultDocument.findMany({ where: { userId: req.auth.id, verified: true }, select: { fileName: true } }),
    prisma.profileExperience.findMany({ where: { userId: req.auth.id }, select: { role: true, company: true } })
  ]);

  const degree = user?.education?.[0]?.degree?.trim();
  const institution = user?.education?.[0]?.institution?.trim();
  const skills = topSkills(user?.skills, 5).map((entry) => entry.name);
  const sentences = [];

  if (user?.name) {
    sentences.push(`${user.name} is ${degree ? `a ${degree} student` : "a student"}${institution ? ` at ${institution}` : ""}${user?.location ? `, based in ${user.location}` : ""}.`);
  }
  if (skills.length) {
    sentences.push(`Core strengths include ${skills.slice(0, 4).join(", ")}${skills.length > 4 ? " and more" : ""}.`);
  }
  if (projects.length) {
    sentences.push(`Has built ${projects.length} project${projects.length > 1 ? "s" : ""} to date, including ${projects.slice(0, 3).map((project) => project.title).join(", ")}.`);
  }
  if (experiences.length) {
    sentences.push(`Gained experience as ${experiences[0].role}${experiences[0].company ? ` at ${experiences[0].company}` : ""}.`);
  }
  if (user?.targetRole || user?.careerGoal) {
    sentences.push(`Aiming toward ${user.targetRole ? `a career as ${user.targetRole}` : `a career in ${user.careerGoal}`}.`);
  }
  if (!sentences.length) {
    sentences.push(`${user?.name || "This student"} is building their public professional identity with UPNEX.`);
  }

  res.json({
    draft: sentences.join(" "),
    builtFrom: {
      skills: skills.length,
      projects: projects.length,
      education: degree ? 1 : 0,
      experience: experiences.length,
      verifiedCredentials: documents.length
    }
  });
}
