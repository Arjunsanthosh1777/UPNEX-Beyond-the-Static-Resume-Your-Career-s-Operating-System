import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { recognizeImage } from "./ocr.js";

async function extractPdfText(bytes) {
  const task = getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: true });
  const doc = await task.promise;
  try {
    let text = "";
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let line = "";
      for (const item of content.items) {
        if (typeof item.str === "string") line += item.str;
        if (item.hasEOL) {
          text += `${line}\n`;
          line = "";
        }
      }
      if (line) text += `${line}\n`;
    }
    return text;
  } finally {
    await task.destroy().catch(() => {});
  }
}

// Reads question-paper text out of an uploaded file: PDFs use their embedded
// text layer (pdfjs-dist), images fall back to OCR. Scanned PDFs have no text
// layer and are handled as the empty-string case so the API can tell the user
// to upload a screenshot instead.
export async function extractQuizText(buffer, mime) {
  const kind = String(mime || "").toLowerCase();
  if (kind === "application/pdf") {
    try {
      const text = String(await extractPdfText(buffer)).replace(/\r/g, "").trim();
      return { text, kind: "pdf" };
    } catch {
      return { text: "", kind: "pdf" };
    }
  }
  const text = await recognizeImage(buffer).catch(() => null);
  return { text: String(text || "").trim(), kind: "image" };
}

function sniffCategory(text) {
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^(subject|topic|chapter|unit)\b/i.test(line)) {
      const value = line.replace(/^(subject|topic|chapter|unit)\s*[:.\-]\s*/i, "").trim();
      if (value && value.length <= 60) return value;
    }
    const section = /^\s*(section|part|set)\s*[-:]?\s*([a-z0-9]+)\s*$/i.exec(line);
    if (section) return `Section ${section[2]}`;
  }
  return null;
}

// Collects a compact answer-key section like
//   ANSWER KEY
//   1. B    2. C    3. A
// into { questionNumber: "b" | "2" | ... }.
function parseAnswerKey(text) {
  const entries = {};
  const lines = text.split(/\r?\n/);
  let started = false;
  let seen = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!started) {
      if (/^\s*(answer\s*key|answers?\s*[:.])/i.test(line)) started = true;
      continue;
    }
    if (!line) break;
    const pairs = [...line.matchAll(/(\d{1,3})\s*[.):\-–]?\s*\(?([A-Ea-e1-4])\)?/g)];
    if (pairs.length) {
      for (const match of pairs) {
        if (entries[match[1]] === undefined) {
          entries[match[1]] = match[2].toLowerCase();
          seen += 1;
        }
      }
      if (seen > 40) break;
      continue;
    }
    if (seen > 0) break;
  }
  return entries;
}

const LETTER_OPTION_RE = /^[\[({\s]*([a-eA-E])\s*[)\]}.:\-]\s+(.+)$/;
const NUM_LINE_RE = /^[\[({\s]*(\d{1,4})\s*([).:])\s+(.+)$/;
const MAX_QUESTIONS = 12;
const MAX_OPTIONS = 4;

function pushOption(current, key, text) {
  if (current.letterMap[key] !== undefined) {
    const at = current.letterMap[key];
    current.options[at] = `${current.options[at]} ${text}`.replace(/\s+/g, " ");
    return;
  }
  if (Object.keys(current.letterMap).length < MAX_OPTIONS) {
    const at = current.options.length;
    current.letterMap[key] = at;
    current.options.push(text.replace(/\s+/g, " "));
  }
}

// Heuristic MCQ block parser. Numbered lines with a dot separator open a new
// question; "1)", "2)…" style lines are treated as options when what follows
// really is a run of numbered options; lettered lines are always options.
// Non-matching lines extend the current prompt (before any option) or the last
// option (after). An explicit answer key is honoured when present, otherwise
// answers are left -1 for the host to confirm.
export function parseMcq(text, { category } = {}) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim());
  const answerKey = parseAnswerKey(text);
  const categorySniff = sniffCategory(text) || category || null;
  const questions = [];
  let current = null;

  // Drop everything from the answer-key header onward so the key text can't
  // leak into questions or options; the key itself was already parsed above.
  const keyStart = lines.findIndex((l) => /^\s*(answer\s*key|answers?\s*[:.])/i.test(l));
  const bodyEnd = keyStart >= 0 ? keyStart : lines.length;

  const nextNumeric = (at) => {
    for (let j = at + 1; j < lines.length; j += 1) {
      if (!lines[j]) continue;
      const m = NUM_LINE_RE.exec(lines[j]);
      return Boolean(m) && m[2] !== ".";
    }
    return false;
  };

  const finalize = () => {
    if (!current) return;
    if (current.prompt && current.options.length >= 2) {
      const key = answerKey[String(current.number)];
      let answer = -1;
      if (key) {
        if (/^[a-e]$/.test(key)) {
          const index = current.letterMap[key];
          if (index !== undefined) answer = index;
        } else {
          const digit = Number(key) - 1;
          if (digit >= 0 && digit < current.options.length) answer = digit;
        }
      }
      questions.push({
        category: current.category || "PDF Quiz",
        prompt: current.prompt,
        options: current.options,
        answer
      });
    }
    current = null;
  };

  const newQuestion = (number, prompt) => {
    finalize();
    current = { number, prompt, options: [], letterMap: {}, optsAreNumeric: null, category: categorySniff };
  };

  for (let i = 0; i < bodyEnd; i += 1) {
    const line = lines[i];
    if (!line) continue;

    if (!current) {
      const m = NUM_LINE_RE.exec(line);
      if (m) {
        if (m[2] === "." || !nextNumeric(i)) {
          newQuestion(m[1], m[3]);
          continue;
        }
        current = { number: null, prompt: "", options: [], letterMap: {}, optsAreNumeric: true, category: categorySniff };
        pushOption(current, m[1], m[3]);
        continue;
      }
      const lm = LETTER_OPTION_RE.exec(line);
      if (lm) {
        current = { number: null, prompt: "", options: [], letterMap: {}, optsAreNumeric: false, category: categorySniff };
        pushOption(current, lm[1].toLowerCase(), lm[2]);
      }
      continue;
    }

    const m = NUM_LINE_RE.exec(line);
    if (m) {
      if (m[2] === ".") {
        newQuestion(m[1], m[3]);
        continue;
      }
      if (current.optsAreNumeric === true || (current.options.length === 0 && nextNumeric(i))) {
        if (current.options.length === 0 && current.optsAreNumeric !== true) current.optsAreNumeric = true;
        pushOption(current, m[1], m[3]);
        continue;
      }
      newQuestion(m[1], m[3]);
      continue;
    }

    const lm = LETTER_OPTION_RE.exec(line);
    if (lm) {
      if (current.optsAreNumeric !== true) {
        current.optsAreNumeric = false;
        pushOption(current, lm[1].toLowerCase(), lm[2]);
        continue;
      }
      if (current.options.length === 0) {
        current.optsAreNumeric = false;
        pushOption(current, lm[1].toLowerCase(), lm[2]);
        continue;
      }
    }

    if (current.options.length === 0) {
      current.prompt = `${current.prompt} ${line}`.trim().replace(/\s+/g, " ");
    } else {
      const last = current.options[current.options.length - 1];
      if (last) current.options[current.options.length - 1] = `${last} ${line}`.replace(/\s+/g, " ");
    }
  }
  finalize();

  return {
    questions: questions.slice(0, MAX_QUESTIONS),
    answerKeyFound: Object.keys(answerKey).length > 0
  };
}