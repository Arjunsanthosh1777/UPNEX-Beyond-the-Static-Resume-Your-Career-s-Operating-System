import { prisma } from "../config/database.js";

const DEMO_MARKS = [
  { subject: "Mathematics", category: "Core", score: 88, semester: 1, year: "2022" },
  { subject: "Physics", category: "Core", score: 82, semester: 1, year: "2022" },
  { subject: "Chemistry", category: "Core", score: 74, semester: 2, year: "2022" },
  { subject: "Computer Science", category: "Core", score: 91, semester: 2, year: "2022" },
  { subject: "Data Structures", category: "Core", score: 85, semester: 3, year: "2023" },
  { subject: "English", category: "Language", score: 68, semester: 1, year: "2022" },
  { subject: "Economics", category: "Elective", score: 61, semester: 3, year: "2023" }
];

const DEMO_PROJECTS = [
  {
    title: "Marks-to-Career Insights Dashboard",
    description: "Turns academic marks and proof-of-work into personalised career guidance — the engine behind UPNEX itself.",
    skills: ["React", "Node.js", "PostgreSQL", "Prisma"],
    status: "completed",
    featured: true
  },
  {
    title: "College Placement Portal",
    description: "A portal where recruiters browse verified student profiles and shortlist candidates.",
    skills: ["React", "Express", "PostgreSQL"],
    status: "completed"
  }
];

const DEMO_EDUCATION = {
  degree: "B.Tech Computer Science",
  institution: "Government College of Engineering",
  startYear: "2022",
  endYear: "2026",
  grade: "8.4 CGPA"
};

const DEMO_EXPERIENCES = [
  {
    role: "Web Development Intern",
    company: "Campus Tech Hub",
    type: "internship",
    startDate: "2024-06-01T00:00:00.000Z",
    current: true,
    skills: ["React", "Node.js", "REST APIs"],
    description: "Built internal dashboards and API tools used by 300+ students."
  }
];

const DEMO_LEARNINGS = [
  { topic: "System Design", category: "Engineering", progress: 55, notes: "" }
];

const DEMO_ACHIEVEMENTS = [
  {
    title: "Smart India Hackathon — Finalist",
    organization: "SIH",
    category: "hackathon",
    date: "2024-12-01T00:00:00.000Z",
    description: "Top-10 finalist with a hardware-plus-dashboard solution."
  }
];

const DEMO_GOALS = [
  { subject: "Economics", target: 80 },
  { subject: "Mathematics", target: 92 }
];

const DEMO_HEADLINE = "Final-year CS student building verified career records on UPNEX.";

// Seeds a believable student profile (marks, projects, experience, education,
// learnings, achievements and study goals) so a fresh, otherwise-empty account
// can be explored end-to-end in a demo. Safe to repeat: refuses to run once the
// account already has marks or projects.
export async function loadDemoData(req, res) {
  const userId = req.auth.id;
  try {
    const [markCount, projectCount] = await Promise.all([
      prisma.academicMark.count({ where: { userId } }),
      prisma.project.count({ where: { userId } })
    ]);
    if (markCount || projectCount) {
      return res.status(409).json({ message: "Demo data is already loaded for this account.", loaded: false });
    }

    await prisma.$transaction([
      prisma.academicMark.createMany({ data: DEMO_MARKS.map((m) => ({ ...m, userId, source: "manual" })) }),
      prisma.project.createMany({ data: DEMO_PROJECTS.map((p) => ({ ...p, userId })) }),
      prisma.profileExperience.createMany({ data: DEMO_EXPERIENCES.map((e) => ({ ...e, userId, sortOrder: 0 })) }),
      prisma.profileLearning.createMany({ data: DEMO_LEARNINGS.map((l) => ({ ...l, userId })) }),
      prisma.achievement.createMany({ data: DEMO_ACHIEVEMENTS.map((a) => ({ ...a, userId })) })
    ]);

    for (const goal of DEMO_GOALS) {
      await prisma.studyGoal.upsert({
        where: { userId_subject: { userId, subject: goal.subject } },
        update: {},
        create: { ...goal, userId }
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { headline: true, education: true } });
    const update = {};
    if (!user?.headline) update.headline = DEMO_HEADLINE;
    if (!user?.education || !Array.isArray(user.education) || user.education.length === 0) {
      update.education = [DEMO_EDUCATION];
    }
    if (Object.keys(update).length) await prisma.user.update({ where: { id: userId }, data: update });

    res.json({
      loaded: true,
      counts: {
        marks: DEMO_MARKS.length,
        projects: DEMO_PROJECTS.length,
        experiences: DEMO_EXPERIENCES.length,
        learnings: DEMO_LEARNINGS.length,
        achievements: DEMO_ACHIEVEMENTS.length,
        goals: DEMO_GOALS.length
      }
    });
  } catch (error) {
    console.error("loadDemoData failed:", error);
    res.status(500).json({ message: "Could not load sample data." });
  }
}