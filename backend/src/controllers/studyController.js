import { prisma } from "../config/database.js";

// "Smart education" engine: reads the student's actual marks + enrollments and
// turns them into a personal subject coach (which subjects to fix, and courses
// that fix them) plus a persisted weekly study plan with check-off tracking.

function startOfWeek(date) {
  const d = new Date(date || Date.now());
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); // back to Monday
  d.setHours(0, 0, 0, 0);
  return d;
}

// Aggregates per-subject stats from the raw marks rows (one subject can be
// tracked across semesters now that the old unique constraint is gone).
function subjectStats(marks) {
  const by = new Map();
  for (const mark of marks) {
    const key = mark.subject.trim().toLowerCase();
    if (!by.has(key)) by.set(key, []);
    by.get(key).push(mark);
  }
  const stats = [];
  for (const list of by.values()) {
    const sorted = [...list].sort((a, b) => a.createdAt - b.createdAt);
    const latest = sorted[sorted.length - 1].score;
    const avg = Math.round(sorted.reduce((sum, mark) => sum + mark.score, 0) / sorted.length);
    const delta = sorted.length > 1 ? latest - sorted[sorted.length - 2].score : 0;
    const trend = delta > 5 ? "up" : delta < -5 ? "down" : "flat";
    stats.push({ subject: list[0].subject.trim(), avg, latest, trend, count: list.length });
  }
  return stats;
}

function weakSubjects(marks, limit = 4) {
  return subjectStats(marks)
    .filter((entry) => entry.avg < 60)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, limit);
}

function strongSubjects(marks, limit = 3) {
  return subjectStats(marks)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, limit);
}

function tipsFor(avg) {
  return avg < 40
    ? [
        "Master the fundamentals first — 20 focused minutes of basics daily beats cramming.",
        "Revisit the material after 1, 3 and 7 days (spaced repetition).",
        "Work through one solved example fully before attempting new problems."
      ]
    : [
        "Attack the specific topics you lose marks in, not the whole subject.",
        "Try timed quizzes — working fast under pressure is often the missing gap.",
        "Explain the topic back from memory; if you stumble, re-read that part."
      ];
}

// Keyword matches against the course catalogue (title + description + category).
function matchCourses(subject, courses) {
  const words = subject.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  if (!words.length) return [];
  return courses
    .map((course) => {
      const haystack = `${course.title} ${course.description} ${course.category}`.toLowerCase();
      const hits = words.filter((word) => haystack.includes(word)).length;
      return { course, hits };
    })
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3)
    .map((entry) => entry.course);
}

// Subject coach: weak subjects + why + how to fix them + matching Skill Bridge
// courses. Pure analysis of live data — nothing is stored or invented.
export async function getCoach(req, res) {
  const [marks, courses, enrollments] = await Promise.all([
    prisma.academicMark.findMany({ where: { userId: req.auth.id } }),
    prisma.course.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        level: true,
        lessons: { select: { title: true }, orderBy: { order: "asc" }, take: 5 }
      }
    }),
    prisma.enrollment.findMany({
      where: { userId: req.auth.id },
      include: { course: { select: { id: true, title: true } } }
    })
  ]);

  if (!marks.length) {
    return res.json({
      empty: true,
      message: "Add your marks (Vault → Analyse marks, or Subject Analysis) and UPNEX becomes your personal coach.",
      strengths: [],
      weaknesses: []
    });
  }

  const weaknesses = weakSubjects(marks).map(({ subject, avg, latest, trend, count }) => ({
    subject,
    avg,
    latest,
    trend,
    count,
    tips: tipsFor(avg),
    courses: matchCourses(subject, courses)
  }));

  res.json({
    empty: false,
    strengths: strongSubjects(marks),
    weaknesses,
    enrolled: enrollments.length,
    catalogue: courses.length
  });
}

// Deterministic weekly plan: weak subjects get revision + practice slots,
// half-finished courses slot into the routine in order of least progress.
function buildPlan(marks, enrollments) {
  const weak = weakSubjects(marks, 4);
  const strong = strongSubjects(marks);
  const pending = enrollments
    .filter((entry) => !entry.completed && entry.progress < 100)
    .sort((a, b) => a.progress - b.progress);

  const days = [];
  for (let d = 0; d < 7; d += 1) {
    const slots = [];

    if (weak.length) {
      const subject = weak[d % weak.length];
      slots.push({
        key: `d${d}r0${subject.subject.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
        subject: subject.subject,
        kind: "revision",
        focus: subject.avg < 40
          ? "Rebuild the foundation before attempting problems."
          : "Target the exact topics you lose marks on.",
        time: "45 min"
      });
    } else if (strong.length) {
      const subject = strong[d % strong.length];
      slots.push({
        key: `d${d}s0${subject.subject.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
        subject: subject.subject,
        kind: "practice",
        focus: "Keep this strength sharp — a short self-test today.",
        time: "20 min"
      });
    }

    if (pending.length) {
      const course = pending[d % pending.length];
      slots.push({
        key: `d${d}c${course.course.id.slice(-6)}`,
        subject: course.course.title,
        kind: "course",
        focus: `Next lesson in "${course.course.title}" (${course.progress}% done) — small steps keep momentum.`,
        time: "30 min"
      });
    }

    if (strong.length) {
      const subject = strong[(d + 1) % strong.length];
      slots.push({
        key: `d${d}s1${subject.subject.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
        subject: subject.subject,
        kind: "practice",
        focus: "Close the books — answer five questions from memory.",
        time: "25 min"
      });
    } else if (weak.length) {
      const subject = weak[(d + 2) % weak.length];
      slots.push({
        key: `d${d}r1${subject.subject.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
        subject: subject.subject,
        kind: "practice",
        focus: "Redo one question you previously missed.",
        time: "20 min"
      });
    }

    days.push({ day: d, slots });
  }

  const total = days.reduce((sum, day) => sum + day.slots.length, 0);
  return { days, total };
}

// One row per (user, week): plan is a snapshot of that week's schedule, done is
// the { taskKey: boolean } map of boxes the student ticked.
export async function getPlanner(req, res) {
  const [marks, enrollments] = await Promise.all([
    prisma.academicMark.findMany({ where: { userId: req.auth.id } }),
    prisma.enrollment.findMany({
      where: { userId: req.auth.id },
      include: { course: { select: { id: true, title: true } } }
    })
  ]);

  const weekStart = startOfWeek();
  let row = await prisma.studyPlan.findUnique({
    where: { userId_weekStart: { userId: req.auth.id, weekStart } }
  });

  if (!row) {
    const built = buildPlan(marks, enrollments);
    row = await prisma.studyPlan.create({
      data: { userId: req.auth.id, weekStart, plan: built.days, done: {} }
    });
  }

  res.json({ weekStart, total: row.plan.length ? row.plan.reduce((sum, day) => sum + (day.slots?.length || 0), 0) : 0, plan: row.plan, done: row.done || {} });
}

export async function updatePlanner(req, res) {
  const { key, done } = req.body || {};
  if (typeof key !== "string" || !key.trim() || typeof done !== "boolean") {
    return res.status(400).json({ message: "A task key and a boolean value are required." });
  }
  const weekStart = startOfWeek();
  const row = await prisma.studyPlan.findUnique({
    where: { userId_weekStart: { userId: req.auth.id, weekStart } }
  });
  if (!row) return res.status(409).json({ message: "Generate this week's plan first." });

  const updated = await prisma.studyPlan.update({
    where: { id: row.id },
    data: { done: { ...(row.done || {}), [key.trim()]: done } }
  });
  res.json({ done: updated.done });
}