const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const u = await prisma.user.update({
    where: { username: "demo-student" },
    data: { privacy: { profile: "public", academics: "public", credentials: "public", activity: "private" } }
  });
  console.log("privacy:", JSON.stringify(u.privacy));
})().finally(() => prisma.$disconnect());