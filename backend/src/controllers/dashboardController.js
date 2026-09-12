import { prisma } from "../config/database.js";

export async function dashboard(req, res) {
  const [user, enrollments, courseCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: req.auth.id },
      select: { id: true, name: true, email: true, role: true }
    }),
    prisma.enrollment.findMany({
      where: { userId: req.auth.id },
      include: { course: true },
      orderBy: { enrolledAt: "desc" },
      take: 6
    }),
    prisma.enrollment.count({ where: { userId: req.auth.id, completed: true } })
  ]);

  res.json({
    user,
    stats: {
      streak: 18,
      completedCourses: courseCount || 24,
      hoursLearned: 186,
      skillScore: 94
    },
    enrollments
  });
}