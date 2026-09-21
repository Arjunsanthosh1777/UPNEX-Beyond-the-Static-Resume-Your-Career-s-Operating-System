const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const user = await prisma.user.findFirst({
    where: { username: "demo-student" },
    select: { id: true, name: true, username: true, privacy: true, profilePublic: true }
  });
  console.log("user:", JSON.stringify(user));

  await prisma.vaultDocument.deleteMany({ where: { userId: user.id, fileName: "Semester 4 Marksheet" } });
  await prisma.vaultDocument.deleteMany({ where: { userId: user.id, fileName: "IEEE Conference Certificate" } });

  const doc = await prisma.vaultDocument.create({
    data: {
      userId: user.id,
      fileName: "Semester 4 Marksheet",
      documentType: "MARKSHEET",
      fileSize: 204800,
      mime: "application/pdf",
      issuer: "Anna University",
      verified: true
    },
    select: { id: true }
  });
  const upx = `UPX-${(String(doc.id).slice(0, 4) + String(doc.id).slice(-4)).toUpperCase()}`;
  console.log("derived-path doc id:", doc.id, "verificationId:", upx);

  const doc2 = await prisma.vaultDocument.create({
    data: {
      userId: user.id,
      fileName: "IEEE Conference Certificate",
      documentType: "CERTIFICATE",
      fileSize: 152000,
      mime: "image/png",
      issuer: "IEEE",
      verified: true,
      verificationId: "UPX-DEMO0001"
    },
    select: { id: true, verificationId: true }
  });
  console.log("stored-path doc:", JSON.stringify(doc2));
  console.log("DERIVED_UPX=" + upx);
})().finally(() => prisma.$disconnect());