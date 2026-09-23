import { prisma } from "../config/database.js";
import { pickClashQuestions } from "../data/clashQuestions.js";

const QUESTION_TIME_MS = 20 * 1000;
const POINTS_CORRECT = 100;
const POINTS_TIME_BONUS = 20;
const POINTS_WIN = 12;
const POINTS_DRAW = 7;
const POINTS_LOSE = 3;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function code() {
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

function safeUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name || "Player", username: user.username, avatar: user.avatar };
}

function inviteBase(req) {
  return (
    process.env.CLIENT_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `${req.protocol}://${req.get("host")}`
  );
}

function sideOf(game, userId) {
  if (game.hostId === userId) return "host";
  if (game.guestId === userId) return "guest";
  return null;
}

function statePayload(game, userId) {
  const order = Array.isArray(game.questionOrder) ? game.questionOrder : [];
  const meSide = sideOf(game, userId);
  const payload = {
    id: game.id,
    code: game.code,
    status: game.status,
    source: game.source || "builtin",
    scoreHost: game.scoreHost,
    scoreGuest: game.scoreGuest,
    qIndex: game.qIndex,
    questionCount: order.length,
    finishedAt: game.finishedAt,
    mySide: meSide,
    me: meSide === "host" ? safeUser(game.host) : meSide === "guest" ? safeUser(game.guest) : null,
    host: safeUser(game.host),
    guest: safeUser(game.guest),
    winnerId: game.winnerId,
    winner: null
  };
  if (game.winnerId) {
    const winnerUser = game.hostId === game.winnerId ? game.host : game.guest;
    payload.winner = safeUser(winnerUser);
  }
  if (game.status === "active") {
    const question = order[game.qIndex];
    payload.current = question
      ? {
          qIndex: game.qIndex,
          category: question.category,
          prompt: question.prompt,
          options: question.options,
          deadline: game.qDeadline,
          total: order.length
        }
      : null;
  }
  if (game.status === "finished" || game.finishedAt) {
    payload.results = order.map((question, index) => {
      const hostRow = game.answers?.find((a) => a.qIndex === index && a.userId === game.hostId);
      const guestRow = game.answers?.find((a) => a.qIndex === index && a.userId === game.guestId);
      return {
        qIndex: index,
        category: question.category,
        prompt: question.prompt,
        answer: question.answer,
        hostPicked: hostRow ? hostRow.answerIndex : -1,
        guestPicked: guestRow ? guestRow.answerIndex : -1,
        hostCorrect: hostRow?.correct ?? false,
        guestCorrect: guestRow?.correct ?? false,
        hostPoints: hostRow?.points ?? 0,
        guestPoints: guestRow?.points ?? 0
      };
    });
  }
  return payload;
}

async function loadGame(gameId, userId) {
  const game = await prisma.clashGame.findUnique({
    where: { id: gameId },
    include: {
      host: { select: { id: true, name: true, username: true, avatar: true } },
      guest: { select: { id: true, name: true, username: true, avatar: true } },
      answers: {
        select: { userId: true, qIndex: true, answerIndex: true, correct: true, timeLeft: true, points: true }
      }
    }
  });
  if (!game) return null;
  void userId;
  return game;
}

export { statePayload, loadGame };
// Advance the duel: once both players have answered (or the timer ran out) move
// to the next question, and finish the game when the set is exhausted. Runs
// inside a transaction. Competing calls from both browsers (and poll nudges)
// are safe: answer rows are inserted with skipDuplicates and the terminal/next
// transitions are guarded by conditional updateMany, so only one caller ever
// awards the points and nobody advances past the same question twice.
async function resolveGame(gameId) {
  await prisma.$transaction(async (tx) => {
    const game = await tx.clashGame.findUnique({ where: { id: gameId } });
    if (!game || game.status !== "active" || !Array.isArray(game.questionOrder)) return;

    const answers = await tx.clashAnswer.findMany({ where: { gameId, qIndex: game.qIndex } });
    const hostAnswered = answers.some((a) => a.userId === game.hostId);
    const guestAnswered = game.guestId ? answers.some((a) => a.userId === game.guestId) : false;
    const deadlinePassed = !game.qDeadline || new Date(game.qDeadline).getTime() <= Date.now();

    if (!(hostAnswered && guestAnswered) && !deadlinePassed) return;

    const placeholders = [];
    for (const side of ["host", "guest"]) {
      const userId = side === "host" ? game.hostId : game.guestId;
      if (!userId) continue;
      if (!answers.some((a) => a.userId === userId)) {
        placeholders.push({ gameId, userId, qIndex: game.qIndex, answerIndex: -1, correct: false, timeLeft: 0, points: 0 });
      }
    }
    if (placeholders.length > 0) {
      await tx.clashAnswer.createMany({ data: placeholders, skipDuplicates: true });
    }

    const isLast = game.qIndex + 1 >= game.questionOrder.length;
    if (isLast) {
      const winnerId = game.scoreHost === game.scoreGuest ? null : game.scoreHost > game.scoreGuest ? game.hostId : game.guestId;
      const updated = await tx.clashGame.updateMany({
        where: { id: gameId, status: "active" },
        data: { status: "finished", winnerId, finishedAt: new Date() }
      });
      if (updated.count === 1) await awardClashGame(tx, gameId, game, winnerId);
      return;
    }
    await tx.clashGame.updateMany({
      where: { id: gameId, status: "active", qIndex: game.qIndex },
      data: { qIndex: game.qIndex + 1, qDeadline: new Date(Date.now() + QUESTION_TIME_MS) }
    });
  });
}

async function awardClashGame(tx, gameId, game, winnerId) {
  const increments = (userId, points) =>
    tx.user.update({
      where: { id: userId },
      data: {
        clashPoints: { increment: points },
        clashWins: { increment: winnerId === userId && winnerId ? 1 : 0 },
        clashGames: { increment: 1 }
      }
    });

  const hostUser = await tx.user.findUnique({ where: { id: game.hostId }, select: { name: true } });
  const guestUser = game.guestId ? await tx.user.findUnique({ where: { id: game.guestId }, select: { name: true } }) : null;
  const winnerName = winnerId ? (winnerId === game.hostId ? hostUser?.name : guestUser?.name) : null;

  if (winnerId) {
    const loserName = winnerId === game.hostId ? guestUser?.name || "your rival" : hostUser?.name || "your rival";
    await increments(winnerId, POINTS_WIN);
    const loserId = winnerId === game.hostId ? game.guestId : game.hostId;
    if (loserId) await increments(loserId, POINTS_LOSE);
    await tx.notification.createMany({
      data: [
        { userId: winnerId, type: "clash", title: `You won the Clash vs ${loserName}!`, message: `+${POINTS_WIN} arena points added to your score.`, link: "/clash" },
        { userId: loserId, type: "clash", title: `${winnerName} beat you in Clash…`, message: "Close one. Rematch?", link: "/clash" }
      ]
    });
  } else {
    if (game.hostId) await increments(game.hostId, POINTS_DRAW);
    if (game.guestId) await increments(game.guestId, POINTS_DRAW);
    await tx.notification.createMany({
      data: [
        { userId: game.hostId, type: "clash", title: "It's a draw!", message: `+${POINTS_DRAW} arena points. Rematch?`, link: "/clash" },
        { userId: game.guestId, type: "clash", title: "It's a draw!", message: `+${POINTS_DRAW} arena points. Rematch?`, link: "/clash" }
      ]
    });
  }
}

export async function createGame(req, res) {
  const userId = req.auth.id;
  let created = null;
  for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
    try {
      created = await prisma.clashGame.create({ data: { hostId: userId, code: code() } });
    } catch (error) {
      if (error.code !== "P2002") throw error;
    }
  }
  if (!created) return res.status(500).json({ message: "Could not create a game room. Try again." });
  res.json({ game: { id: created.id, code: created.code, status: created.status, inviteUrl: `${inviteBase(req)}/clash?code=${created.code}` } });
}

export async function joinGame(req, res) {
  const userId = req.auth.id;
  const gameCode = String(req.body?.code || "").trim().toUpperCase().slice(0, 8);
  if (gameCode.length < 4) return res.status(400).json({ message: "Enter a valid room code." });

  const game = await prisma.clashGame.findUnique({ where: { code: gameCode } });
  if (!game) return res.status(404).json({ message: "No arena found with that code. Check with your friend." });
  if (game.hostId === userId) return res.status(400).json({ message: "That's your own arena. Invite a friend instead." });
  if (game.status === "active" || game.status === "finished") return res.status(409).json({ message: "That arena has already started." });
  if (game.guestId === userId) return res.json({ id: game.id });
  if (game.guestId) return res.status(409).json({ message: "This arena is full." });

  // Conditional write so two guests joining at once cannot both take the seat:
  // the second one gets a 409 instead of silently displacing the first.
  const updated = await prisma.clashGame.updateMany({
    where: { id: game.id, status: "waiting", guestId: null },
    data: { guestId: userId }
  });
  if (updated.count !== 1) return res.status(409).json({ message: "This arena just filled up." });
  res.json({ id: game.id });
}

export async function getGame(req, res) {
  const game = await loadGame(req.params.id, req.auth.id);
  if (!game) return res.status(404).json({ message: "Arena not found." });
  if (!sideOf(game, req.auth.id)) return res.status(403).json({ message: "You are not part of this arena." });

  if (game.status === "active") {
    try {
      await resolveGame(game.id);
      const refreshed = await loadGame(game.id, req.auth.id);
      if (refreshed) return res.json({ state: statePayload(refreshed, req.auth.id) });
    } catch {
      // Concurrent resolves can collide on the unique answer index; the next
      // poll will see a consistent state anyway.
    }
  }
  res.json({ state: statePayload(game, req.auth.id) });
}

export async function startGame(req, res) {
  const userId = req.auth.id;
  const game = await prisma.clashGame.findUnique({ where: { id: req.params.id } });
  if (!game) return res.status(404).json({ message: "Arena not found." });
  if (game.hostId !== userId) return res.status(403).json({ message: "Only the host can start the arena." });
  if (game.status !== "waiting") return res.status(409).json({ message: "This arena already started." });
  if (!game.guestId) return res.status(400).json({ message: "Share the room code — you need a second player." });

  await prisma.clashGame.update({
    where: { id: game.id },
    data: {
      status: "active",
      questionOrder: game.questionOrder ?? pickClashQuestions(),
      qIndex: 0,
      qDeadline: new Date(Date.now() + QUESTION_TIME_MS)
    }
  });
  res.json({ ok: true });
}

// Stores a host-confirmed question set (from a PDF/photo import) on a pending
// arena. A null payload rolls the arena back to the built-in random quiz.
export async function setGameQuestions(req, res) {
  const game = await prisma.clashGame.findUnique({ where: { id: req.params.id } });
  if (!game) return res.status(404).json({ message: "Arena not found." });
  if (game.hostId !== req.auth.id) return res.status(403).json({ message: "Only the host can set the questions." });
  if (game.status !== "waiting") return res.status(409).json({ message: "Questions can only be changed before the arena starts." });

  if (req.body?.questions == null) {
    await prisma.clashGame.update({ where: { id: game.id }, data: { questionOrder: null, source: "builtin" } });
    const refreshed = await loadGame(game.id, req.auth.id);
    return res.json({ state: statePayload(refreshed, req.auth.id) });
  }

  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > QUIZ_MAX_QUESTIONS) {
    return res.status(400).json({ message: `A quiz needs between 1 and ${QUIZ_MAX_QUESTIONS} questions.` });
  }

  const cleaned = [];
  const seen = new Set();
  for (const raw of questions) {
    const prompt = String(raw?.prompt || "").trim().replace(/\s+/g, " ");
    if (!prompt || prompt.length < 3) continue;
    const options = Array.isArray(raw?.options)
      ? raw.options.map((o) => String(o || "").trim().replace(/\s+/g, " ")).filter(Boolean)
      : [];
    if (options.length < 2 || options.length > 4) continue;
    const answer = Number(raw?.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) continue;
    const key = prompt.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push({ category: "PDF Quiz", prompt, options, answer });
  }
  if (!cleaned.length) {
    return res.status(400).json({ message: "Fix the questions first — each needs 2 to 4 options and a marked answer." });
  }

  await prisma.clashGame.update({ where: { id: game.id }, data: { questionOrder: cleaned, source: "pdf" } });
  const refreshed = await loadGame(game.id, req.auth.id);
  res.json({ state: statePayload(refreshed, req.auth.id) });
}

const QUIZ_MAX_QUESTIONS = 20;

export async function answerQuestion(req, res) {
  const userId = req.auth.id;
  const game = await prisma.clashGame.findUnique({ where: { id: req.params.id } });
  if (!game || game.status !== "active") return res.status(409).json({ message: "Arena is not accepting answers right now." });

  const side = sideOf(game, userId);
  if (!side) return res.status(403).json({ message: "You are not part of this arena." });

  const order = Array.isArray(game.questionOrder) ? game.questionOrder : [];
  const qIndex = Number(req.body?.qIndex);
  if (!Number.isInteger(qIndex) || qIndex !== game.qIndex || !order[qIndex]) {
    return res.status(400).json({ message: "Stale question — refresh the arena." });
  }
  const answerIndex = Number(req.body?.answerIndex);
  if (side === "guest" && game.guestId !== userId) return res.status(403).json({ message: "You are not part of this arena." });
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= order[qIndex].options.length) {
    return res.status(400).json({ message: "Pick a valid option." });
  }

  // The 20s question deadline is the source of truth, not the client clock —
  // a modified client must not be able to farm the speed bonus or to answer a
  // question that already ended.
  const nowMs = Date.now();
  const deadlineMs = game.qDeadline ? new Date(game.qDeadline).getTime() : nowMs;
  if (nowMs > deadlineMs) {
    return res.status(409).json({ message: "Time's up — the next question is on its way." });
  }
  const timeLeft = Math.min(QUESTION_TIME_MS / 1000, Math.max(0, Math.floor((deadlineMs - nowMs) / 1000)));
  const correct = order[qIndex].answer === answerIndex;
  const points = correct ? POINTS_CORRECT + (timeLeft >= 10 ? POINTS_TIME_BONUS : 0) : 0;

  const inserted = await prisma.clashAnswer.createMany({
    data: [{ gameId: game.id, userId, qIndex, answerIndex, correct, timeLeft, points }],
    skipDuplicates: true
  });
  if (inserted.count === 1 && points > 0) {
    await prisma.clashGame.update({
      where: { id: game.id },
      data: side === "host" ? { scoreHost: { increment: points } } : { scoreGuest: { increment: points } }
    });
  }

  const row = await prisma.clashAnswer.findUniqueOrThrow({
    where: { gameId_userId_qIndex: { gameId: game.id, userId, qIndex } }
  });
  const refreshed = await prisma.clashGame.findUnique({ where: { id: game.id }, select: { scoreHost: true, scoreGuest: true, qIndex: true } });

  // nudge the turn along in case the opponent already answered
  await resolveGame(game.id);

  res.json({
    ok: true,
    correct: row.correct,
    correctIndex: order[qIndex].answer,
    pickedIndex: row.answerIndex,
    points: row.points,
    timeLeft: row.timeLeft,
    scores: { host: refreshed?.scoreHost ?? game.scoreHost, guest: refreshed?.scoreGuest ?? game.scoreGuest },
    nextIndex: refreshed?.qIndex
  });
}

export async function leaderboard(req, res) {
  const users = await prisma.user.findMany({
    where: { clashGames: { gt: 0 } },
    orderBy: [{ clashPoints: "desc" }, { clashWins: "desc" }, { clashGames: "asc" }],
    take: 20,
    select: { id: true, name: true, username: true, avatar: true, clashPoints: true, clashWins: true, clashGames: true }
  });
  res.json({ users });
}

export async function abandonGame(req, res) {
  const userId = req.auth.id;
  const game = await prisma.clashGame.findUnique({ where: { id: req.params.id } });
  if (!game || (game.hostId !== userId && game.guestId !== userId)) return res.status(404).json({ message: "Arena not found." });
  if (game.status === "finished" || game.status === "abandoned") return res.status(409).json({ message: "Arena already finished." });

  if (game.status === "waiting") {
    await prisma.clashGame.updateMany({
      where: { id: game.id, status: "waiting" },
      data: { status: "abandoned", finishedAt: new Date() }
    });
    return res.json({ ok: true });
  }

  // Active game: bailing is a forfeit — the opponent takes the win and the
  // points are awarded exactly once (guarded by the conditional transition).
  const opponentId = game.guestId && game.guestId !== userId ? game.guestId : game.hostId;
  await prisma.$transaction(async (tx) => {
    const updated = await tx.clashGame.updateMany({
      where: { id: game.id, status: "active" },
      data: { status: "finished", winnerId: opponentId, finishedAt: new Date() }
    });
    if (updated.count === 1) await awardClashGame(tx, game.id, game, opponentId);
  });
  res.json({ ok: true });
}