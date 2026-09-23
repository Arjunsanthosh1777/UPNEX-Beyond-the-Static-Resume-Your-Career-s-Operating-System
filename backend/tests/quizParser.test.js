import { describe, it, expect, vi } from "vitest";

// Keep the OCR (tesseract.js) module out of these parser-only tests.
vi.mock("../src/services/ocr.js", () => ({
  recognizeImageModes: vi.fn(() => null)
}));

import { parseMcq } from "../src/services/quizParser.js";

describe("parseMcq", () => {
  it("parses one question per line with lettered options on their own line stub", () => {
    const { questions } = parseMcq("1. Capital of France?\nA) Paris\nB) London\nC) Rome\nD) Berlin");
    expect(questions).toHaveLength(1);
    expect(questions[0].prompt).toBe("Capital of France?");
    expect(questions[0].options).toEqual(["Paris", "London", "Rome", "Berlin"]);
    expect(questions[0].answer).toBe(-1);
  });

  it("parses inline options collapsed on one line (photo OCR output)", () => {
    const { questions } = parseMcq("1. Capital of France? A) Paris B) London C) Rome D) Berlin");
    expect(questions).toHaveLength(1);
    expect(questions[0].prompt).toBe("Capital of France?");
    expect(questions[0].options).toEqual(["Paris", "London", "Rome", "Berlin"]);
  });

  it("parses inline numbered options and unnumbered prompt on one line", () => {
    const { questions } = parseMcq("Which is a JVM language? 1) Kotlin 2) Python 3) Java 4) Swift");
    expect(questions).toHaveLength(1);
    expect(questions[0].prompt).toBe("Which is a JVM language?");
    expect(questions[0].options).toEqual(["Kotlin", "Python", "Java", "Swift"]);
  });

  it("parses an unnumbered prompt line followed by option lines", () => {
    const { questions } = parseMcq(
      ["Which of these is an AI?", "A) Alexa", "B) Siri", "C) Cortana", "D) All of the above"].join("\n")
    );
    expect(questions).toHaveLength(1);
    expect(questions[0].prompt).toBe("Which of these is an AI?");
    expect(questions[0].options).toEqual(["Alexa", "Siri", "Cortana", "All of the above"]);
  });

  it("keeps numbered-option runs on their own lines as options", () => {
    const { questions } = parseMcq("1. Which DB is key-value?\n1) Redis\n2) PostgreSQL\n3) MySQL\n2. Pick a language\n1) Rust\n2) Java");
    expect(questions).toHaveLength(2);
    expect(questions[0].prompt).toBe("Which DB is key-value?");
    expect(questions[0].options).toEqual(["Redis", "PostgreSQL", "MySQL"]);
    expect(questions[1].prompt).toBe("Pick a language");
    expect(questions[1].options).toEqual(["Rust", "Java"]);
  });

  it("parses a multi-question blob exactly as a photo OCR snapshot tends to", () => {
    const blob =
      "CS Quiz Section A\n1. What is SQL? A) Language B) DB C) OS D) App 2. HTML stands for? A) Hypertext B) Head C) Home D) Huge 3. Which is a NoSQL DB? A) Redis B) Oracle C) MySQL D) Access";
    const { questions } = parseMcq(blob);
    expect(questions).toHaveLength(3);
    expect(questions[0].prompt).toBe("What is SQL?");
    expect(questions[0].options).toEqual(["Language", "DB", "OS", "App"]);
    expect(questions[1].prompt).toBe("HTML stands for?");
    expect(questions[1].options).toEqual(["Hypertext", "Head", "Home", "Huge"]);
    expect(questions[2].prompt).toBe("Which is a NoSQL DB?");
    expect(questions[2].options).toEqual(["Redis", "Oracle", "MySQL", "Access"]);
  });

  it("does not mangle 'e.g.' phrasing or decimals into markers", () => {
    const { questions } = parseMcq("1. Approx 3.14 defines? A) e.g. ratio B) pi C) tau D) e");
    expect(questions).toHaveLength(1);
    expect(questions[0].prompt).toBe("Approx 3.14 defines?");
    expect(questions[0].options[0]).toBe("e.g. ratio");
  });

  it("applies the answer key when present", () => {
    const { questions } = parseMcq(
      ["1. Capital of France?", "A) Paris", "B) London", "C) Rome", "D) Berlin", "", "ANSWER KEY", "1. A"].join("\n")
    );
    expect(questions).toHaveLength(1);
    expect(questions[0].answer).toBe(0);
  });

  it("sniffs the category from a section header", () => {
    const { questions } = parseMcq("Section B\n1. X?\nA) a\nB) b\nC) c");
    expect(questions[0].category).toBe("Section B");
  });

  it("returns no questions for a single plain line without options", () => {
    const { questions } = parseMcq("This is just prose with no options to speak of at all");
    expect(questions).toHaveLength(0);
  });

  it("splits consecutive unnumbered questions each with their own option block", () => {
    const { questions } = parseMcq(
      ["Which of these is a prime number?", "(A) 15", "(B) 17", "(C) 21", "(D) 23", "Which is the longest river?", "(A) Ganga", "(B) Yamuna", "(C) Godavari", "(D) Narmada"].join("\n")
    );
    expect(questions).toHaveLength(2);
    expect(questions[0].prompt).toBe("Which of these is a prime number?");
    expect(questions[0].options).toEqual(["15", "17", "21", "23"]);
    expect(questions[1].prompt).toBe("Which is the longest river?");
    expect(questions[1].options).toEqual(["Ganga", "Yamuna", "Godavari", "Narmada"]);
  });

  it("leaves genuine option-last-line continuation text appended (not a new question)", () => {
    const { questions } = parseMcq(
      ["1. Pick the odd one out", "A) cat", "B) dog", "C) house", "D) lion", "read the list slowly"].join("\n")
    );
    expect(questions).toHaveLength(1);
    expect(questions[0].options[3]).toBe("lion read the list slowly");
  });

  it("parses sheets using Q. / Q1) / Question N: numbering into distinct questions", () => {
    const { questions } = parseMcq(
      [
        "Q.1 Capital of India?",
        "(A) Delhi",
        "(B) Mumbai",
        "(C) Chennai",
        "Q2) Longest river?",
        "(A) Ganga",
        "(B) Godavari",
        "Question 3: Which planet is red?",
        "(A) Mars",
        "(B) Venus"
      ].join("\n")
    );
    expect(questions).toHaveLength(3);
    expect(questions[0].prompt).toBe("Capital of India?");
    expect(questions[0].options).toEqual(["Delhi", "Mumbai", "Chennai"]);
    expect(questions[1].prompt).toBe("Longest river?");
    expect(questions[1].options).toEqual(["Ganga", "Godavari"]);
    expect(questions[2].prompt).toBe("Which planet is red?");
    expect(questions[2].options).toEqual(["Mars", "Venus"]);
  });

  it("handles a Q-prefixed prose line without crashing, taking its options", () => {
    const { questions } = parseMcq("Q. 5 items were missing from the box\nA) grenade launcher grade\nB) rotated 90 deg");
    expect(questions).toHaveLength(1);
    expect(questions[0].prompt).toBe("items were missing from the box");
    expect(questions[0].options).toEqual(["grenade launcher grade", "rotated 90 deg"]);
  });
});