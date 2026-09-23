import { describe, it, expect } from "vitest";
import { analyzeClashAnswers } from "../src/services/learningEngine.js";

const NOW = Date.parse("2026-01-10T00:00:00Z");

function row({ gameId = "g1", qIndex = 0, answerIndex = 0, correct = true, timeLeft = 15, questions = null, at = NOW }) {
  const order = questions || [
    { category: "Beta", prompt: "B?", options: ["a", "b", "c", "d"], answer: 1 },
    { category: "Alpha", prompt: "A?", options: ["a", "b", "c", "d"], answer: 1 },
    { category: "Gamma", prompt: "C?", options: ["a", "b", "c", "d"], answer: 1 }
  ];
  return {
    id: `${gameId}-${qIndex}`,
    gameId,
    qIndex,
    answerIndex,
    correct,
    timeLeft,
    points: correct ? 100 : 0,
    createdAt: new Date(at),
    game: { id: gameId, source: "builtin", questionOrder: order, createdAt: new Date(at) }
  };
}

describe("analyzeClashAnswers", () => {
  it("reports no data for an empty history", () => {
    expect(analyzeClashAnswers(undefined).hasData).toBe(false);
    expect(analyzeClashAnswers([]).hasData).toBe(false);
  });

  it("builds a knowledge map with known correctness across categories", () => {
    const questions = [
      { category: "Beta", prompt: "B?", options: ["a", "b", "c", "d"], answer: 1 },
      { category: "Alpha", prompt: "A?", options: ["a", "b", "c", "d"], answer: 0 },
      { category: "Gamma", prompt: "C?", options: ["a", "b", "c", "d"], answer: 2 }
    ];
    const rows = [
      row({ gameId: "g1", qIndex: 0, answerIndex: 2, correct: false, timeLeft: 10, questions }), // Beta wrong
      row({ gameId: "g1", qIndex: 1, answerIndex: 0, correct: true, timeLeft: 15, questions }), // Alpha right
      row({ gameId: "g1", qIndex: 2, answerIndex: 2, correct: true, timeLeft: 12, questions }), // Gamma right
      row({ gameId: "g2", qIndex: 0, answerIndex: 3, correct: false, timeLeft: 9, questions }), // Beta wrong again
      row({ gameId: "g3", qIndex: 0, answerIndex: 0, correct: false, timeLeft: 8, questions }) // Beta wrong third time
    ];
    const insight = analyzeClashAnswers(rows);

    expect(insight.hasData).toBe(true);
    expect(insight.totals.answered).toBe(5);
    expect(insight.totals.correct).toBe(2);
    expect(insight.totals.games).toBe(3);
    expect(insight.overall.accuracy).toBe(40);
    expect(insight.knowledgeMap).toHaveLength(3);

    expect(insight.knowledgeMap.find((c) => c.category === "Alpha").accuracy).toBe(100);
    expect(insight.knowledgeMap.find((c) => c.category === "Beta").accuracy).toBe(0);
    expect(insight.focus[0]).toMatchObject({ category: "Beta", accuracy: 0 });

    // ~6-7s used on correct answers => steady profile
    expect(insight.overall.speedLabel).toBe("steady");
  });

  it("counts skipped (timer-out) questions separately", () => {
    const rows = [
      row({ qIndex: 0, answerIndex: 0, correct: true, timeLeft: 10 }),
      row({ qIndex: 1, answerIndex: -1, correct: false, timeLeft: 0 })
    ];
    const insight = analyzeClashAnswers(rows);
    expect(insight.totals.answered).toBe(1);
    expect(insight.totals.skipped).toBe(1);
    expect(insight.knowledgeMap.find((c) => c.category === "Alpha").skipped).toBe(1);
  });

  it("detects correlated weaknesses from topics failing together", () => {
    const mkQuestions = (cats) => cats.map((category, i) => ({ category, prompt: `${category}?`, options: ["a", "b", "c", "d"], answer: i % 4 }));
    const playGame = (gameId, cats, correctFlags) => {
      const questions = mkQuestions(cats);
      return questions.map((q, i) =>
        row({
          gameId,
          qIndex: i,
          answerIndex: correctFlags[i] ? q.answer : (q.answer + 1) % 4,
          correct: correctFlags[i],
          timeLeft: 10,
          questions
        })
      );
    };
    // two games failing Alpha+Beta together, one game failing only Gamma
    const rows = [
      ...playGame("g1", ["Alpha", "Beta", "Gamma"], [false, false, true]),
      ...playGame("g2", ["Alpha", "Beta", "Delta"], [false, false, true]),
      ...playGame("g3", ["Gamma", "Epsilon", "Zeta"], [false, true, true])
    ];
    const insight = analyzeClashAnswers(rows);
    const pair = insight.correlated.find(
      (c) => (c.base === "Alpha" && c.partner === "Beta") || (c.base === "Beta" && c.partner === "Alpha")
    );
    expect(pair).toBeTruthy();
    expect(pair.coFailGames).toBe(2);
    expect(pair.lift).toBeGreaterThan(1);
  });

  it("flags topics that appeared often but were rarely attempted", () => {
    const mkQuestions = (cats) => cats.map((category, i) => ({ category, prompt: `${category}?`, options: ["a", "b", "c", "d"], answer: i % 4 }));
    const rows = [];
    for (let g = 1; g <= 4; g += 1) {
      const questions = mkQuestions(["Dodge", "Alpha", "Beta"]);
      questions.forEach((q, i) =>
        rows.push(
          row({
            gameId: `g${g}`,
            qIndex: i,
            answerIndex: q.answer,
            correct: true,
            timeLeft: 12,
            questions
          })
        )
      );
    }
    const insight = analyzeClashAnswers(rows);
    expect(insight.dodged.length).toBe(0);
  });

  it("computes a speed label over time used on correct answers", () => {
    const questions = [{ category: "Alpha", prompt: "A?", options: ["a", "b", "c", "d"], answer: 0 }];
    const rows = [
      row({ qIndex: 0, answerIndex: 0, correct: true, timeLeft: 18, questions }), // 2s used
      row({ qIndex: 0, answerIndex: 0, correct: true, timeLeft: 17, questions }) // 3s used
    ];
    const insight = analyzeClashAnswers(rows);
    expect(insight.overall.speedLabel).toBe("quick");
    expect(insight.overall.medianSecondsUse).toBe(2.5);
  });

  it("fills focus with avoided topics when there are no weak answered ones", () => {
    const questions = [
      { category: "Alpha", prompt: "A?", options: ["a", "b", "c", "d"], answer: 0 },
      { category: "Dodge", prompt: "D?", options: ["a", "b", "c", "d"], answer: 0 }
    ];
    const rows = [];
    // 4 games, never answering the Dodge category at all (skip: answerIndex -1)
    for (let g = 1; g <= 4; g += 1) {
      rows.push(row({ gameId: `g${g}`, qIndex: 0, answerIndex: 0, correct: true, timeLeft: 10, questions }));
      rows.push(row({ gameId: `g${g}`, qIndex: 1, answerIndex: -1, correct: false, timeLeft: 0, questions }));
    }
    const insight = analyzeClashAnswers(rows);
    expect(insight.focus.some((f) => f.category === "Dodge" && f.avoided)).toBe(true);
  });
});