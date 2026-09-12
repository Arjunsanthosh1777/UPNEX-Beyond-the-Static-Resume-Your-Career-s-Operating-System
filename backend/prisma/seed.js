import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Demo@12345", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@upnex.com" },
    update: {},
    create: {
      name: "Demo Student",
      email: "demo@upnex.com",
      passwordHash,
      role: "STUDENT"
    }
  });

  const course = await prisma.course.create({
    data: {
      title: "Full Stack Development",
      description: "Build modern web applications from frontend to backend.",
      category: "Development",
      level: "Intermediate",
      lessons: {
        create: [
          { title: "Modern JavaScript", content: "JavaScript foundations.", order: 1 },
          { title: "React Architecture", content: "Components, state and routing.", order: 2 },
          { title: "Node & Express", content: "Build secure APIs.", order: 3 },
          { title: "PostgreSQL", content: "Model and query application data.", order: 4 }
        ]
      }
    }
  });

  await prisma.enrollment.create({
    data: { userId: user.id, courseId: course.id, progress: 82 }
  });

  console.log("UPNEX seeded.");
  console.log("Login: demo@upnex.com / Demo@12345");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());