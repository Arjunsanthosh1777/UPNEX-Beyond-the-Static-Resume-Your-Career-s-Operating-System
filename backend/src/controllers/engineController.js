import { prisma } from "../config/database.js";
import { analyzeClashAnswers } from "../services/learningEngine.js";

// The Student Understanding Engine: a live read on how the signed-in student
// actually performs, computed on demand from their Clash answer history plus a
// light academic cross-signal from their tracked marks.
export async function getEngineInsight(req, res) {
  const userId = req.auth.id;
  const rows = await prisma.clashAnswer.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { game: { select: { id: true, source: true, questionOrder: true, createdAt: true } } }
  });

  const insight = analyzeClashAnswers(rows);
  if (!insight.hasData) return res.json({ engine: insight });

  const marks = await prisma.academicMark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { subject: true, category: true, score: true, maxScore: true, grade: true, createdAt: true }
  });

  const scored = marks
    .map((mark) => ({ subject: mark.subject, category: mark.category, pct: mark.maxScore ? Math.round((mark.score / mark.maxScore) * 100) : mark.score }))
    .filter((entry) => Number.isFinite(entry.pct));

  let strongest = null;
  let weakest = null;
  if (scored.length) {
    scored.sort((a, b) => a.pct - b.pct);
    weakest = { subject: scored[0].subject, pct: scored[0].pct };
    strongest = { subject: scored[scored.length - 1].subject, pct: scored[scored.length - 1].pct };
  }

  insight.academics = {
    tracked: scored.length,
    average: scored.length ? Math.round(scored.reduce((a, b) => a + b.pct, 0) / scored.length) : null,
    strongest,
    weakest
  };

  return res.json({ engine: insight });
}