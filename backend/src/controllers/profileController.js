import { z } from "zod";
import { prisma } from "../config/database.js";

const documentSchema = z.object({
  fileName: z.string().min(1).max(160),
  documentType: z.enum(["MARKSHEET", "CERTIFICATE", "RESUME", "OTHER"]),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024)
});

const markSchema = z.object({
  subject: z.string().min(2).max(80),
  category: z.string().min(2).max(40),
  score: z.number().int().min(0).max(100)
});

const projectSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(10).max(500),
  skills: z.array(z.string().min(1).max(40)).max(12),
  proofUrl: z.string().url().optional().or(z.literal(""))
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  githubUrl: z.string().url().refine((value) => new URL(value).hostname === "github.com" || new URL(value).hostname.endsWith(".github.com"), "Use a valid GitHub profile URL.").optional().or(z.literal("")),
  linkedinUrl: z.string().url().refine((value) => new URL(value).hostname === "linkedin.com" || new URL(value).hostname.endsWith(".linkedin.com"), "Use a valid LinkedIn profile URL.").optional().or(z.literal(""))
});

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

export async function getProfile(req, res) {
  const [user, documents, marks, projects] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.auth.id }, select: { id: true, name: true, email: true, avatar: true, githubUrl: true, linkedinUrl: true, role: true } }),
    prisma.vaultDocument.findMany({ where: { userId: req.auth.id }, orderBy: { createdAt: "desc" } }),
    prisma.academicMark.findMany({ where: { userId: req.auth.id }, orderBy: { score: "asc" } }),
    prisma.project.findMany({ where: { userId: req.auth.id }, orderBy: { createdAt: "desc" } })
  ]);
  const guidance = buildGuidance(marks, projects);
  const readiness = Math.min(100, Math.round(guidance.average * 0.65 + Math.min(projects.length * 8, 24) + Math.min(documents.filter((doc) => doc.verified).length * 4, 12)));
  res.json({ user, documents, marks, projects, guidance, readiness });
}

export async function updateProfile(req, res) {
  const data = profileSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.auth.id },
    data: { name: data.name, githubUrl: data.githubUrl || null, linkedinUrl: data.linkedinUrl || null },
    select: { id: true, name: true, email: true, avatar: true, githubUrl: true, linkedinUrl: true, role: true }
  });
  res.json({ user });
}

export async function addDocument(req, res) {
  const data = documentSchema.parse(req.body);
  // Documents start unverified. A real verification flow (review, checksum,
  // issuer confirmation) must mark them `verified` later — never fake it here.
  const document = await prisma.vaultDocument.create({ data: { ...data, userId: req.auth.id } });
  res.status(201).json({ document });
}

export async function addMark(req, res) {
  const data = markSchema.parse(req.body);
  const mark = await prisma.academicMark.upsert({
    where: { userId_subject: { userId: req.auth.id, subject: data.subject } },
    update: data,
    create: { ...data, userId: req.auth.id }
  });
  res.status(201).json({ mark });
}

export async function addProject(req, res) {
  const data = projectSchema.parse(req.body);
  const project = await prisma.project.create({ data: { ...data, userId: req.auth.id } });
  res.status(201).json({ project });
}