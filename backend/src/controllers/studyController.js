import { z } from "zod";
import { prisma } from "../config/database.js";
import { notifyUser } from "../services/notify.js";
import { sendMail, wrapEmail } from "../services/mailer.js";

// "Smart education" engine: reads the student's actual marks + enrollments and
// turns them into a personal subject coach (which subjects to fix, and courses
// that fix them), a persisted weekly study plan with check-off tracking, and
// consistency analytics. Pure template-based logic — no external AI calls.

const goalSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  target: z.number().int().min(1).max(100)
});

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
    stats.push({ subject: list[0].subject.trim(), avg, latest, trend, count: list.length, marks: sorted });
  }
  return stats;
}

// "Current semester": the most recent (year, semester) pair across all marks.
// Used to weight the plan toward the syllabus the student is studying right now.
function latestSemester(marks) {
  let best = null;
  for (const mark of marks) {
    if (mark.semester == null) continue;
    const yearNum = Number(mark.year);
    const key = { year: mark.year, semester: mark.semester, order: (Number.isFinite(yearNum) ? yearNum : 0) * 100 + mark.semester };
    if (!best || key.order > best.order) best = key;
  }
  return best ? { year: best.year, semester: best.semester } : null;
}

function isCurrentSemester(mark, current) {
  if (!current) return false;
  return mark.semester === current.semester && String(mark.year || "") === String(current.year || "");
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

// Weakness ranking: current-semester subjects first, then the biggest gap to
// the student's own goal, then the lowest average. Stable when there are ties.
function rankWeak(entries, goalsBySubject, current) {
  return entries
    .map((entry) => {
      const goal = goalsBySubject.get(entry.subject.toLowerCase()) ?? null;
      const gap = goal != null ? Math.max(0, goal.target - entry.avg) : null;
      return { ...entry, goal, gap, targetMet: goal != null && entry.avg >= goal.target, current: isCurrentSemester(entry.marks[entry.marks.length - 1], current) };
    })
    .map((entry, index) => ({ entry, index, score: (entry.current ? 0 : 2) + (entry.gap != null ? (entry.gap > 20 ? 0 : entry.gap > 8 ? 1 : 2) : 3) }))
    .sort((a, b) => a.score - b.score || a.entry.avg - b.entry.avg || a.index - b.index)
    .map((row) => row.entry);
}

function strongSubjects(marks, limit = 3) {
  return subjectStats(marks)
    .map(({ marks: _marks, ...rest }) => rest)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, limit);
}

// Subject coach: weak subjects + why + how to fix them + matching Skill Bridge
// courses + the student's own goal and gap. Pure analysis of live data.
export async function getCoach(req, res) {
  const [marks, courses, enrollments, goals] = await Promise.all([
    prisma.academicMark.findMany({
      where: { userId: req.auth.id },
      orderBy: { createdAt: "desc" }
    }),
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
    }),
    prisma.studyGoal.findMany({ where: { userId: req.auth.id } })
  ]);

  if (!marks.length) {
    return res.json({
      empty: true,
      message: "Add your marks (Vault → Analyse marks, or Subject Analysis) and UPNEX becomes your personal coach.",
      strengths: [],
      weaknesses: []
    });
  }

  const current = latestSemester(marks);
  const goalsBySubject = new Map(goals.map((goal) => [goal.subject.trim().toLowerCase(), goal]));

  const weaknesses = rankWeak(
    subjectStats(marks).filter((entry) => entry.avg < 60),
    goalsBySubject,
    current
  ).map(({ marks: _marks, ...entry }) => ({
    ...entry,
    tips: tipsFor(entry.avg),
    courses: matchCourses(entry.subject, courses)
  }));

  res.json({
    empty: false,
    currentSemester: current ? { year: current.year, semester: current.semester } : null,
    subjects: subjectStats(marks).map(({ marks: list, ...rest }) => ({
      ...rest,
      history: list.map((mark) => ({ score: mark.score, at: mark.createdAt, semester: mark.semester ?? null, year: mark.year ?? null }))
    })),
    strengths: strongSubjects(marks),
    weaknesses,
    enrolled: enrollments.length,
    catalogue: courses.length
  });
}

// Deterministic weekly plan: current-semester weak subjects get the first
// revision + practice slots (weighted toward the biggest gap to the goal),
// half-finished courses slot into the routine in order of least progress.
function buildPlan(marks, enrollments, goals) {
  const current = latestSemester(marks);
  const goalsBySubject = new Map(goals.map((goal) => [goal.subject.trim().toLowerCase(), goal]));
  const weak = rankWeak(
    subjectStats(marks).filter((entry) => entry.avg < 60),
    goalsBySubject,
    current
  ).slice(0, 4);
  const strong = strongSubjects(marks);
  const pending = enrollments
    .filter((entry) => !entry.completed && entry.progress < 100)
    .sort((a, b) => a.progress - b.progress);

  const goalFocus = (entry) => {
    if (entry.goal != null && entry.gap != null && entry.gap > 0) {
      return `At ${entry.avg}% vs your ${entry.goal.target}% target — close the +${entry.gap} gap this week.`;
    }
    return entry.avg < 40
      ? "Rebuild the foundation before attempting problems."
      : "Target the exact topics you lose marks on.";
  };

  const days = [];
  for (let d = 0; d < 7; d += 1) {
    const slots = [];

    if (weak.length) {
      const subject = weak[d % weak.length];
      slots.push({
        key: `d${d}r0${subject.subject.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
        subject: subject.subject,
        kind: "revision",
        focus: goalFocus(subject),
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
  const [marks, enrollments, goals] = await Promise.all([
    prisma.academicMark.findMany({ where: { userId: req.auth.id } }),
    prisma.enrollment.findMany({
      where: { userId: req.auth.id },
      include: { course: { select: { id: true, title: true } } }
    }),
    prisma.studyGoal.findMany({ where: { userId: req.auth.id } })
  ]);

  const weekStart = startOfWeek();
  let row = await prisma.studyPlan.findUnique({
    where: { userId_weekStart: { userId: req.auth.id, weekStart } }
  });

  if (!row) {
    const built = buildPlan(marks, enrollments, goals);
    // Upsert instead of create: two requests for the same fresh week (double
    // React effect, second tab) both miss the lookup, and create() would blow
    // up on the unique (userId, weekStart) pair.
    row = await prisma.studyPlan.upsert({
      where: { userId_weekStart: { userId: req.auth.id, weekStart } },
      update: {},
      create: { userId: req.auth.id, weekStart, plan: built.days, done: {} }
    });
    await announceNewWeek(req.auth.id, built).catch(() => {});
  }

  res.json({
    weekStart,
    total: row.plan.length ? row.plan.reduce((sum, day) => sum + (day.slots?.length || 0), 0) : 0,
    plan: row.plan,
    done: row.done || {}
  });
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

// ---------- Goals (per-subject target scores) ----------

async function goalsWithStatus(userId) {
  const [goals, marks] = await Promise.all([
    prisma.studyGoal.findMany({ where: { userId } }),
    prisma.academicMark.findMany({ where: { userId } })
  ]);
  const avgBySubject = new Map(subjectStats(marks).map((entry) => [entry.subject.toLowerCase(), entry.avg]));
  return goals
    .map((goal) => {
      const avg = avgBySubject.get(goal.subject.trim().toLowerCase());
      return { ...goal, avg: avg ?? null, gap: avg != null ? Math.max(0, goal.target - avg) : null, targetMet: avg != null && avg >= goal.target };
    });
}

export async function getStudyGoals(req, res) {
  res.json({ goals: await goalsWithStatus(req.auth.id) });
}

export async function upsertStudyGoal(req, res) {
  const { subject, target } = goalSchema.parse(req.body);
  const goal = await prisma.studyGoal.upsert({
    where: { userId_subject: { userId: req.auth.id, subject } },
    update: { target },
    create: { userId: req.auth.id, subject, target }
  });
  res.json({ goals: await goalsWithStatus(req.auth.id), goal });
}

export async function deleteStudyGoal(req, res) {
  const subject = String(req.params.subject || "").trim();
  if (!subject) return res.status(400).json({ message: "A subject is required." });
  await prisma.studyGoal.deleteMany({ where: { userId: req.auth.id, subject } });
  res.json({ goals: await goalsWithStatus(req.auth.id) });
}

// ---------- Consistency analytics + badges ----------

// One shared computation: per-week completion, the streak, running totals and
// the live goal status. Used by both the analytics endpoint and badge awards so
// the two can never disagree.
function computeStudyAnalytics(rows, goals, marks) {
  const weekly = rows
    .map((row) => {
      const list = Array.isArray(row.plan) ? row.plan : [];
      const total = list.reduce((sum, day) => sum + (day.slots?.length || 0), 0);
      const done = Object.values(row.done || {}).filter(Boolean).length;
      return { weekStart: row.weekStart, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
    })
    .reverse();

  const current = weekly.length ? weekly[weekly.length - 1] : null;

  let streak = 0;
  for (const week of [...weekly].reverse()) {
    if (week.done > 0) streak += 1;
    else break;
  }

  const sessionsDone = weekly.reduce((sum, week) => sum + week.done, 0);
  const sessionsPlanned = weekly.reduce((sum, week) => sum + week.total, 0);

  const avgBySubject = new Map(subjectStats(marks).map((entry) => [entry.subject.toLowerCase(), entry.avg]));
  const goalRows = goals.map((goal) => {
    const avg = avgBySubject.get(goal.subject.trim().toLowerCase());
    return { subject: goal.subject, target: goal.target, avg, met: avg != null && avg >= goal.target };
  });

  return {
    weekly,
    current,
    streak,
    totals: {
      sessionsDone,
      sessionsPlanned,
      weeksActive: weekly.filter((week) => week.done > 0).length
    },
    goals: { set: goalRows.length, met: goalRows.filter((row) => row.met).length }
  };
}

// Auto-earned badges (all derived from real study behaviour — no guessing).
const BADGE_DEFS = [
  { code: "first_session", title: "First session", hint: "Complete your first study session" },
  { code: "streak_3", title: "3-week streak", hint: "Study three weeks in a row" },
  { code: "streak_7", title: "7-week streak", hint: "Study seven weeks in a row" },
  { code: "ten_sessions_week", title: "10-session week", hint: "Complete ten sessions in a single week" },
  { code: "goal_crusher", title: "Goal crusher", hint: "Meet every target you have set" },
  { code: "weeks_active_4", title: "Consistent 4", hint: "Study across four different weeks" },
  { code: "weeks_active_8", title: "Planner regular", hint: "Stay active across eight weeks" }
];

async function evaluateBadges(userId, stats) {
  const owned = await prisma.studyBadge.findMany({ where: { userId }, select: { code: true } });
  const have = new Set(owned.map((badge) => badge.code));

  const newlyEarned = [];
  const award = (code, title, unlocked) => {
    if (unlocked && !have.has(code)) newlyEarned.push({ code, title });
  };

  award("first_session", "First session", stats.totals.sessionsDone >= 1);
  award("streak_3", "3-week streak", stats.streak >= 3);
  award("streak_7", "7-week streak", stats.streak >= 7);
  award("ten_sessions_week", "10-session week", stats.weekly.some((week) => week.done >= 10) || (stats.current && stats.current.done >= 10));
  award("goal_crusher", "Goal crusher", stats.goals.set > 0 && stats.goals.set === stats.goals.met);
  award("weeks_active_4", "Consistent 4", stats.totals.weeksActive >= 4);
  award("weeks_active_8", "Planner regular", stats.totals.weeksActive >= 8);

  if (newlyEarned.length) {
    await prisma.studyBadge.createMany({
      data: newlyEarned.map((badge) => ({ userId, code: badge.code, title: badge.title })),
      skipDuplicates: true
    });
    for (const badge of newlyEarned) {
      notifyUser({
        userId,
        type: "badge",
        title: `Badge unlocked: ${badge.title}`,
        message: "Your Smart Study consistency earned you a badge.",
        link: "/profile/study"
      }).catch(() => {});
    }
  }
  return newlyEarned;
}

// When a brand-new week's plan is generated, tell the student in-app and (if
// they opted into the weekly digest) via email.
async function announceNewWeek(userId, built) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailPrefs: true }
  });
  const first = built.days[0]?.slots?.[0]?.subject || "";

  await notifyUser({
    userId,
    type: "study",
    title: "Your study plan for this week is ready",
    message: `${built.total} sessions scheduled this week${first ? ` — start with ${first}.` : "."}`,
    link: "/profile/study"
  });

  if (user?.email && user.emailPrefs?.study === true) {
    await sendMail({
      to: user.email,
      userId,
      subject: "Your UPNEX study plan for this week is ready",
      html: wrapEmail(`
        <h2 style="margin:0 0 8px;font-size:18px;color:#fff;">This week's study plan is ready</h2>
        <p style="margin:0;">UPNEX scheduled <b>${built.total} study sessions</b> for this week${first ? `, starting with <b>${first}</b>` : ""} based on your marks, goals and in-progress courses.</p>
        <p style="margin:14px 0 0;">Open Smart Study to tick sessions off, track your streak and earn badges.</p>`)
    });
  }
}

export async function getStudyProgress(req, res) {
  const [rows, goals, marks, ownedBadges] = await Promise.all([
    prisma.studyPlan.findMany({
      where: { userId: req.auth.id },
      orderBy: { weekStart: "desc" }
    }),
    prisma.studyGoal.findMany({ where: { userId: req.auth.id } }),
    prisma.academicMark.findMany({ where: { userId: req.auth.id } }),
    prisma.studyBadge.findMany({ where: { userId: req.auth.id }, orderBy: { earnedAt: "desc" } })
  ]);

  const stats = computeStudyAnalytics(rows, goals, marks);
  const newlyEarned = await evaluateBadges(req.auth.id, stats);

  res.json({
    weeks: stats.weekly.slice(-8).map((week) => ({ start: week.weekStart.toISOString().slice(0, 10), done: week.done, total: week.total, pct: week.pct })),
    current: stats.current && { done: stats.current.done, total: stats.current.total, pct: stats.current.pct },
    streak: stats.streak,
    totals: stats.totals,
    goals: stats.goals,
    badgeCatalog: BADGE_DEFS.map(({ code, title, hint }) => ({ code, title, hint })),
    badges: {
      earned: ownedBadges.map((badge) => ({ code: badge.code, title: badge.title, earnedAt: badge.earnedAt })),
      new: newlyEarned.map((badge) => badge.code)
    }
  });
}