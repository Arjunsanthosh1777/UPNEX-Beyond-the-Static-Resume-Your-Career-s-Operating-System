import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { recognizeImageModes } from "./ocr.js";

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
  const text = await recognizeImageModes(buffer).catch(() => null);
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

const MAX_QUESTIONS = 12;
const MAX_OPTIONS = 4;

// Splits a single OCR/PDF line into marker tokens whose payloads overlap the
// gaps between them. "1. prompt A) x B) y" becomes:
//   [{lead:"" seped q(1)), {lead:" prompt " letter a}, {lead:" x " letter b}]
// A marker is a number + "." or ")" or a single letter a–e + one of `)]}.:-`.
// Letters must be preceded by a space / line start / "(" so prose like
// "e.g. text" is not split, and "3.14"-style decimals are skipped.
function lineTokens(line) {
  const MARKER_RE = /(?<=^|\s|\()(\d{1,4})([.)])|(?<=^|\s|\()([a-eA-E])([)\]}.:-])/g;
  const tokens = [];
  let last = 0;
  let match;
  MARKER_RE.lastIndex = 0;
  while ((match = MARKER_RE.exec(line)) !== null) {
    if (match[2] === ".") {
      // "3.14" decimal guard: the chunk straight after "3." is itself numeric.
      const firstWord = line.slice(match.index + match[0].length).trimStart().split(/\s/)[0];
      if (/^\d+(\.\d+)?$/.test(firstWord)) continue;
    }
    if (match[3] && match[3].toLowerCase() === "e" && /^g\./i.test(line.slice(match.index + 2))) {
      // "e.g." phrasing, not an option "e." followed by content.
      continue;
    }
    const kind = match[1] === undefined ? "o" : "q";
    tokens.push({
      kind,
      sep: match[1] === undefined ? match[4] : match[2],
      num: kind === "q" ? match[1] : null,
      letter: kind === "o" ? match[3].toLowerCase() : null,
      lead: line.slice(last, match.index)
    });
    last = match.index + match[0].length;
  }
  const trailer = line.slice(last);
  if (tokens.length === 0) {
    const t = line.trim();
    return t ? [{ kind: "t", text: t }] : [];
  }
  // Each token's content is the text between it and the next marker.
  tokens.forEach((token, index) => {
    token.content = (index + 1 < tokens.length ? tokens[index + 1].lead : trailer)
      .replace(/\s+/g, " ")
      .trim();
  });
  return tokens;
}

// True when a near-following non-empty line opens with a numbered-option
// marker ("1) a", "2) b", "3: …") — used to decide whether "1) foo" belongs to
// a question's option set or starts a fresh question.
function numericRunAhead(body, fromLine) {
  const to = Math.min(fromLine + 6, body.length);
  for (let j = fromLine + 1; j < to; j += 1) {
    const line = body[j];
    if (!line) continue;
    const first = lineTokens(line)[0];
    return Boolean(first && first.kind === "q" && first.sep !== ".");
  }
  return false;
}

// Heuristic MCQ block parser over a token stream. Question numbers open
// questions; lettered and "1) 2)…" numbered runs become options whether they
// sit on their own lines or share a line with the prompt (photo OCR collapses
// these). Unnumbered prompts are kept. An explicit answer key is honoured when
// present, otherwise answers are left -1 for the host to confirm.
export function parseMcq(text, { category } = {}) {
  const rawLines = String(text || "").split(/\r?\n/).map((line) => line.trim());
  const answerKey = parseAnswerKey(text);
  const categorySniff = sniffCategory(text) || category || null;
  const questions = [];
  let current = null;

  const bodyEnd = rawLines.findIndex((l) => /^\s*(answer\s*key|answers?\s*[:.])/i.test(l));

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
    current = { number, prompt, options: [], letterMap: {}, optsAreNumeric: false, category: categorySniff };
  };

  const pushOption = (key, content) => {
    if (current.letterMap[key] !== undefined) {
      const at = current.letterMap[key];
      current.options[at] = `${current.options[at]} ${content}`.replace(/\s+/g, " ");
      return;
    }
    if (Object.keys(current.letterMap).length < MAX_OPTIONS) {
      const at = current.options.length;
      current.letterMap[key] = at;
      current.options.push(content.replace(/\s+/g, " "));
    }
  };

  const body = bodyEnd >= 0 ? rawLines.slice(0, bodyEnd) : rawLines;
  for (let li = 0; li < body.length; li += 1) {
    const line = body[li];
    if (!line) continue;
    const tokens = lineTokens(line);
    if (tokens.length === 0) continue;

    for (let t = 0; t < tokens.length; t += 1) {
      const token = tokens[t];
      const leading = t === 0;

      if (token.kind === "t") {
        if (!current) newQuestion(null, token.text);
        else if (current.options.length === 0) current.prompt = `${current.prompt} ${token.text}`.replace(/\s+/g, " ").trim();
        else {
          const last = current.options[current.options.length - 1];
          if (last) current.options[current.options.length - 1] = `${last} ${token.text}`.replace(/\s+/g, " ");
        }
        continue;
      }

      if (token.kind === "q") {
        const inlineRun = !leading && t + 1 < tokens.length && tokens[t + 1].kind === "q" && tokens[t + 1].sep === ")";
        if (leading) {
          if (token.sep === ".") {
            newQuestion(Number(token.num) || null, token.lead.trim() ? `${token.lead.trim()} ${token.content}` : token.content);
            continue;
          }
          if (current && current.optsAreNumeric) {
            pushOption(token.num, token.content);
            continue;
          }
          const beginsOptions =
            (t + 1 < tokens.length && tokens[t + 1].kind === "q" && tokens[t + 1].sep === ")") ||
            numericRunAhead(body, li) ||
            Boolean(current && current.options.length === 0);
          if (beginsOptions) {
            // numbered-option line: "1) a 2) b" or "1) a" beneath a prompt.
            if (!current) newQuestion(null, token.lead.trim() || "");
            else if (token.lead.trim() && !current.prompt) current.prompt = token.lead.trim();
            current.optsAreNumeric = true;
            pushOption(token.num, token.content);
            continue;
          }
          newQuestion(Number(token.num) || null, token.lead.trim() ? `${token.lead.trim()} ${token.content}` : token.content);
          continue;
        }
        // inline numeric marker on a question line: "Which? 1) a 2) b"
        if (current && current.optsAreNumeric) {
          pushOption(token.num, token.content);
          continue;
        }
        if (current && current.options.length === 0 && inlineRun) {
          if (token.lead.trim() && !current.prompt) current.prompt = token.lead.trim();
          current.optsAreNumeric = true;
          pushOption(token.num, token.content);
          continue;
        }
        // mid-line digit markers after finished options open the next question;
        // their lead already belongs to the previous option's content.
        newQuestion(Number(token.num) || null, token.content);
        continue;
      }

      // letter option
      if (current && current.optsAreNumeric && current.options.length !== 0) {
        // stray letters after numbered options read as continuation text.
        const last = current.options[current.options.length - 1];
        if (last) current.options[current.options.length - 1] = `${last} ${token.lead}${token.letter}${token.sep} ${token.content}`.replace(/\s+/g, " ").trim();
        continue;
      }
      if (!current) newQuestion(null, "");
      current.optsAreNumeric = false;
      if (leading && token.lead.trim() && current.options.length === 0 && !current.prompt) {
        // "Which…? A) x B) y" — the text before the first marker is the prompt.
        current.prompt = token.lead.trim();
      }
      pushOption(token.letter, token.content);
    }
  }
  finalize();

  return {
    questions: questions.slice(0, MAX_QUESTIONS),
    answerKeyFound: Object.keys(answerKey).length > 0
  };
}