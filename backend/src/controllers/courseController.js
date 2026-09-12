import { prisma } from "../config/database.js";

export async function listCourses(req, res) {
  const courses = await prisma.course.findMany({
    include: { _count: { select: { lessons: true } } },
    orderBy: { createdAt: "desc" }
  });
  res.json({ courses });
}

export async function courseDetails(req, res) {
  const course = await prisma.course.findUnique({
    where: { id: req.params.id },
    include: { lessons: { orderBy: { order: "asc" } } }
  });

  if (!course) return res.status(404).json({ message: "Course not found." });
  res.json({ course });
}

export async function enroll(req, res) {
  const course = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!course) return res.status(404).json({ message: "Course not found." });

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: req.auth.id, courseId: course.id } },
    update: {},
    create: { userId: req.auth.id, courseId: course.id }
  });

  res.json({ enrollment });
}