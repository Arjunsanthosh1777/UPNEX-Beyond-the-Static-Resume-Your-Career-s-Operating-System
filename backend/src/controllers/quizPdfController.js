import { extractQuizText, parseMcq } from "../services/quizParser.js";

const QUIZ_LIMIT = 20;

// Accepts a PDF or image of a question paper, reads the text and returns the
// parsed MCQ questions for the host to review. Answers are auto-filled only
// when an explicit answer key was detected; everything else stays -1 so the
// host can confirm before the arena goes live.
export async function importQuizPdf(req, res) {
  if (!req.file) return res.status(400).json({ message: "Upload a PDF or image first." });
  const mime = String(req.file.mimetype || "").toLowerCase();
  const isPdf = mime === "application/pdf";
  const isImage = mime.startsWith("image/");
  if (!isPdf && !isImage) {
    return res.status(422).json({ message: "Only PDF, JPG, PNG or WebP files are supported." });
  }

  let text = "";
  let kind = "unknown";
  try {
    const result = await extractQuizText(req.file.buffer, mime);
    text = result.text || "";
    kind = result.kind;
  } catch {
    // handled below as unreadable
  }

  if (!text || text.length < 20) {
    return res.status(422).json({
      message:
        kind === "pdf"
          ? "Couldn't read text from this PDF. If it's a scanned copy, export a screenshot (JPG/PNG) and upload that instead."
          : "Couldn't read those questions. Try a clearer image with better lighting.",
      code: kind === "pdf" ? "NO_TEXT_LAYER" : "OCR_FAILED"
    });
  }

  const parsed = parseMcq(text);
  const questions = parsed.questions.slice(0, QUIZ_LIMIT);
  if (!questions.length) {
    return res.status(422).json({
      message: "No multiple-choice questions found. Make sure each question has options like A) / B) / C) / D).",
      code: "NO_QUESTIONS"
    });
  }

  const autoAnswered = questions.filter((q) => q.answer >= 0).length;
  res.json({
    questions,
    notes: {
      total: parsed.questions.length,
      truncated: parsed.questions.length > QUIZ_LIMIT,
      autoAnswered,
      needsAnswer: questions.length - autoAnswered,
      answerKeyFound: parsed.answerKeyFound
    }
  });
}