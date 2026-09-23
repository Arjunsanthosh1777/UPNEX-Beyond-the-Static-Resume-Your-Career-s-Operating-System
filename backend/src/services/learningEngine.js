// The Student Understanding Engine.
//
// Turns raw arena evidence (every locked-in Clash answer) into a persistent,
// explaining model of how a student actually performs: per-category knowledge,
// a speed/accuracy/pressure signature, correlated weaknesses (topics that fail
// together), dodged topics, and the engine's next practice targets.
//
// Pure function over the same shape Prisma returns, so it is unit-testable
// without a database.

const QUESTION_SECONDS = 20;
const PRESSURE_SECONDS = 4;

function median(sortedValues) {
  if (!sortedValues.length) return null;
  const mid = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 0 ? (sortedValues[mid - 1] + sortedValues[mid]) / 2 : sortedValues[mid];
}

export function analyzeClashAnswers(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { hasData: false };
  }

  const records = rows.map((row) => {
    const order = Array.isArray(row.game?.questionOrder) ? row.game.questionOrder : [];
    const question = order[row.qIndex] || {};
    const sourceLabel = row.game?.source === "pdf" ? "Paper Quiz" : "General";
    return {
      category: String(question.category || sourceLabel).trim() || "General",
      correct: Boolean(row.correct),
      answered: Number.isInteger(row.answerIndex) && row.answerIndex >= 0,
      timeLeft: Number(row.timeLeft) || 0,
      at: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
      gameId: row.gameId
    };
  });

  const answered = records.filter((r) => r.answered);
  const skipped = records.length - answered.length;
  const totalCorrect = answered.filter((r) => r.correct).length;
  const overallAccuracy = answered.length ? totalCorrect / answered.length : 0;
  const gamesPlayed = new Set(records.map((r) => r.gameId)).size;

  // ---- per-category knowledge map ----
  const byCategory = new Map();
  for (const rec of answered) {
    const entry = byCategory.get(rec.category) || {
      category: rec.category,
      attempts: 0,
      correct: 0,
      skipped: 0,
      correctUse: [],
      firstAt: rec.at,
      lastAt: rec.at
    };
    entry.attempts += 1;
    if (rec.correct) {
      entry.correct += 1;
      entry.correctUse.push(QUESTION_SECONDS - rec.timeLeft);
    }
    entry.firstAt = Math.min(entry.firstAt, rec.at);
    entry.lastAt = Math.max(entry.lastAt, rec.at);
    byCategory.set(rec.category, entry);
  }
  for (const rec of records.filter((r) => !r.answered)) {
    const entry = byCategory.get(rec.category) || {
      category: rec.category,
      attempts: 0,
      correct: 0,
      skipped: 0,
      correctUse: [],
      firstAt: rec.at,
      lastAt: rec.at
    };
    entry.skipped += 1;
    byCategory.set(rec.category, entry);
  }

  const knowledgeMap = [...byCategory.values()]
    .map((entry) => {
      const accuracy = entry.attempts ? entry.correct / entry.attempts : 0;
      let trend = null;
      if (entry.attempts >= 4) {
        const timeline = answered
          .filter((r) => r.category === entry.category && r.answered)
          .map((r) => r.at)
          .sort((a, b) => a - b);
        const cut = timeline[Math.floor(timeline.length / 2)];
        const early = answered.filter((r) => r.category === entry.category && r.answered && r.at < cut);
        const late = answered.filter((r) => r.category === entry.category && r.answered && r.at >= cut);
        const earlyAcc = early.length ? early.filter((r) => r.correct).length / early.length : 0;
        const lateAcc = late.length ? late.filter((r) => r.correct).length / late.length : 0;
        trend = Math.round((lateAcc - earlyAcc) * 100);
      }
      return {
        category: entry.category,
        attempts: entry.attempts + entry.skipped,
        answered: entry.attempts,
        skipped: entry.skipped,
        accuracy: entry.attempts ? Math.round(accuracy * 100) : null,
        trend,
        avgCorrectSeconds: entry.correctUse.length ? Math.round(entry.correctUse.reduce((a, b) => a + b, 0) / entry.correctUse.length) : null
      };
    })
    .sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1));

  // ---- learning signature ----
  const correctUse = answered
    .filter((r) => r.correct)
    .map((r) => QUESTION_SECONDS - r.timeLeft)
    .sort((a, b) => a - b);
  const medianSecondsUse = median(correctUse);
  const speedLabel = medianSecondsUse == null ? null : medianSecondsUse <= 6 ? "quick" : medianSecondsUse <= 12 ? "steady" : "deliberate";

  const pressured = answered.filter((r) => r.timeLeft <= PRESSURE_SECONDS);
  const pressuredAccuracy = pressured.length ? pressured.filter((r) => r.correct).length / pressured.length : null;
  const pressureSignal = pressuredAccuracy == null ? null : pressuredAccuracy >= overallAccuracy ? "cool" : overallAccuracy - pressuredAccuracy > 0.15 ? "cracks" : "wavers";

  const categoryAccuracies = knowledgeMap.filter((c) => c.answered >= 2).map((c) => (c.accuracy ?? 0) / 100);
  let consistency = null;
  if (categoryAccuracies.length >= 2) {
    const mean = categoryAccuracies.reduce((a, b) => a + b, 0) / categoryAccuracies.length;
    const variance = categoryAccuracies.reduce((a, b) => a + (b - mean) ** 2, 0) / categoryAccuracies.length;
    consistency = Math.round(Math.sqrt(variance) * 100);
  }

  const persona = (() => {
    if (answered.length < 3) return "explorer";
    if (overallAccuracy >= 0.75 && speedLabel === "quick") return "sniper";
    if (overallAccuracy >= 0.68) return "practitioner";
    if (answered.length >= 20) return "grinder";
    return "learner";
  })();

  const tier = (() => {
    if (answered.length >= 50 && overallAccuracy >= 0.7) return "elite";
    if (answered.length >= 20) return "sharp";
    if (answered.length >= 6) return "practising";
    return "exploring";
  })();

  // ---- correlated weaknesses (topics that fail together in the same arena) ----
  const failedByGame = new Map();
  for (const rec of answered) {
    if (rec.correct) continue;
    const set = failedByGame.get(rec.gameId) || new Set();
    set.add(rec.category);
    failedByGame.set(rec.gameId, set);
  }
  const failGameCount = (cat) => {
    let count = 0;
    for (const set of failedByGame.values()) if (set.has(cat)) count += 1;
    return count;
  };
  const categories = [...byCategory.keys()];
  const correlated = [];
  for (let i = 0; i < categories.length; i += 1) {
    for (let j = i + 1; j < categories.length; j += 1) {
      const base = categories[i];
      const partner = categories[j];
      const baseGames = failGameCount(base);
      const partnerGames = failGameCount(partner);
      if (baseGames < 2 || partnerGames < 2) continue;
      let both = 0;
      for (const set of failedByGame.values()) if (set.has(base) && set.has(partner)) both += 1;
      if (both < 2) continue;
      const pBothGivenBase = both / baseGames;
      const pPartner = failedByGame.size ? partnerGames / failedByGame.size : 0;
      if (pPartner <= 0) continue;
      correlated.push({ base, partner, lift: Math.round((pBothGivenBase / pPartner) * 10) / 10, coFailGames: both });
    }
  }
  correlated.sort((a, b) => b.lift - a.lift);

  // ---- dodged topics (appeared often but rarely attempted) ----
  const gamesQuestionSets = new Map();
  for (const rec of rows) {
    if (!gamesQuestionSets.has(rec.gameId)) {
      gamesQuestionSets.set(rec.gameId, Array.isArray(rec.game?.questionOrder) ? rec.game.questionOrder : []);
    }
  }
  const opportunityByCategory = new Map();
  for (const order of gamesQuestionSets.values()) {
    const seenInGame = new Set();
    for (const question of order) {
      const cat = String(question?.category || "").trim() || "General";
      if (seenInGame.has(cat)) continue;
      seenInGame.add(cat);
      opportunityByCategory.set(cat, (opportunityByCategory.get(cat) || 0) + 1);
    }
  }
  const dodged = [];
  for (const [cat, opportunity] of opportunityByCategory) {
    const attempted = byCategory.get(cat)?.attempts || 0;
    if (opportunity >= 4 && attempted / opportunity < 0.5) dodged.push({ category: cat, opportunity, attempted });
  }
  dodged.sort((a, b) => a.attempted / a.opportunity - b.attempted / b.opportunity);

  // ---- focus targets (engine's pick for next practice) ----
  const focus = [];
  const weakest = knowledgeMap
    .filter((c) => c.answered >= 3 && (c.accuracy ?? 100) < 70)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)
    .map((c) => ({ category: c.category, accuracy: c.accuracy }));
  focus.push(...weakest);
  if (focus.length < 2) {
    focus.push(
      ...dodged.slice(0, 2 - focus.length).map((d) => ({ category: d.category, accuracy: null, avoided: true }))
    );
  }

  return {
    hasData: true,
    totals: { answered: answered.length, correct: totalCorrect, skipped, games: gamesPlayed },
    overall: {
      accuracy: Math.round(overallAccuracy * 100),
      speedLabel,
      medianSecondsUse,
      consistency,
      pressureSignal,
      persona,
      tier
    },
    knowledgeMap,
    correlated: correlated.slice(0, 3),
    dodged,
    focus
  };
}