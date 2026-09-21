const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  await prisma.user.update({
    where: { username: "demo-student" },
    data: { privacy: { profile: "public", academics: "public", credentials: "connections", activity: "private" } }
  });
  console.log("set credentials=connections");
})().finally(() => prisma.$disconnect());