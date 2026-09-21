import { prisma } from "../config/database.js";

export async function dashboard(req, res) {
  const [user, enrollments, courseCount, lessonProgress, assessmentResults] = await Promise.all([
    prisma.user.findUnique({
      where: { id: req.auth.id },
      select: { id: true, name: true, email: true, username: true, role: true }
    }),
    prisma.enrollment.findMany({
      where: { userId: req.auth.id },
      include: { course: true },
      orderBy: { enrolledAt: "desc" },
      take: 6
    }),
    prisma.enrollment.count({
      where: { userId: req.auth.id, completed: true }
    }),
    prisma.progress.findMany({
      where: { userId: req.auth.id, completed: true },
      select: { updatedAt: true }
    }),
    prisma.assessmentResult.findMany({
      where: { userId: req.auth.id },
      select: { score: true }
    })
  ]);

  const activeDays = new Set(lessonProgress.map((entry) => dayKey(entry.updatedAt)));
  const streak = countCurrentStreak(activeDays);
  const skillScore = assessmentResults.length
    ? Math.round(assessmentResults.reduce((sum, result) => sum + result.score, 0) / assessmentResults.length)
    : null;

  res.json({
    user,
    stats: {
      streak,
      completedCourses: courseCount,
      // No lesson time is currently tracked, so report it as unavailable
      // rather than showing a fabricated number.
      hoursLearned: null,
      skillScore
    },
    enrollments
  });
}

// Counts consecutive calendar days of activity ending today (or yesterday,
// so a learner who studied yesterday but not yet today keeps their streak).
function countCurrentStreak(activeDays) {
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!activeDays.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!activeDays.has(dayKey(cursor))) return 0;
  }

  while (activeDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function dayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}