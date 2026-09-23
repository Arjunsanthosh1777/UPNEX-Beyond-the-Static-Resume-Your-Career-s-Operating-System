import { createWorker } from "tesseract.js";

// One shared worker per process: the WASM bundle and the English language pack
// are downloaded lazily on first use and then cached for every later request.
let workerPromise = null;
function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("eng", 1);
  }
  return workerPromise;
}

// Runs OCR against an image buffer and returns the raw recognised text.
// Returns null when recognition fails (bad image, no language data, ...) so
// callers can fail gracefully instead of erroring out.
export async function recognizeImage(buffer) {
  const worker = await getWorker();
  const { data } = await worker.recognize(buffer);
  const text = String(data.text || "").trim();
  return text || null;
}

const DEFAULT_PSM = "3";

// OCR page-segmentation modes to try for photos of printed pages. Mode 3 (auto)
// suits normal text blocks, 4 (single column, variable sizes) fits list-style
// question sheets, 6 (single block) denser papers, and 11 (sparse text) helps
// when there is lots of whitespace or columns.
const PHOTO_PSMS = ["3", "4", "6", "11"];

// Runs OCR against an image buffer trying several page-segmentation modes and
// keeps the longest output. Photos of exam questions vary wildly in layout, so
// a single PSM leaks or mangles text regularly. The shared worker is reused
// and always reset afterwards; tesseract.js serialises worker calls, so these
// attempts cannot interleave with other requests.
export async function recognizeImageModes(buffer, modes = PHOTO_PSMS) {
  if (!buffer) return null;
  const worker = await getWorker();
  let best = null;
  try {
    for (const psm of modes) {
      await worker.setParameters({ tessedit_pageseg_mode: psm });
      const { data } = await worker.recognize(buffer);
      const text = String(data.text || "").trim();
      if (!text) continue;
      if (!best || text.length > best.length) best = text;
    }
  } finally {
    try {
      await worker.setParameters({ tessedit_pageseg_mode: DEFAULT_PSM });
    } catch {
      // ignore reset failures; the next call re-sets the mode anyway
    }
  }
  return best;
}

const FRAGMENT_STOPWORDS = /^(subj|subject|max|maximum|obtain|total|grade|result|semester|term|roll|reg|univ|university|exam|examcenter|theory|pract|credit|arrear|failed|pass|marks|code|duration|date|board|degree|year|attende|percentage|scheme|page|no|student|name|index|checked|internal|external|summary|award|cgpa|gpa|sgpa|sign|position|part|division|result|pass|fail|contin|regg|college|school)/i;

// Turns a single OCR line into a subject+score candidate when possible.
// Handles the three shapes most marksheets use:
//   "Mathematics         100       85   A"   (max, obtained)
//   "Science   87/100                      "   (obtained / max)
//   "English            72                  "   (obtained only)
function parseLine(line) {
  const columns = line.split(/\s{2,}|\t+/).map((c) => c.trim()).filter(Boolean);
  const tokens = columns.length > 1 ? columns : line.split(/\s+/).filter(Boolean);

  const numbers = [];
  tokens.forEach((token, index) => {
    const cleaned = token.replace(/[^\d.]/g, "");
    if (cleaned && cleaned !== "." && /^(\d{1,3}(\.\d{1,2})?|[4-9]\d|100)$/.test(cleaned)) {
      numbers.push({ index, value: Number.parseFloat(cleaned) });
    }
  });

  if (numbers.length === 0) return null;

  const firstNumberIndex = numbers[0].index;
  const subject = tokens.slice(0, firstNumberIndex).join(" ").replace(/\s{2,}/g, " ").trim();
  if (!subject || subject.length < 2 || FRAGMENT_STOPWORDS.test(subject)) return null;

  // Heuristic guards against page numbers, dates and totals.
  const plainNumbers = numbers.filter((entry) => Number.isInteger(entry.value));
  if (plainNumbers.length === 1 && plainNumbers[0].value > 400 && !/\/\s*\d{2,3}/.test(line)) return null;

  const values = numbers.map((entry) => entry.value);
  let score = values[0];
  let maxScore = values[1];
  if (maxScore !== undefined && (maxScore > 1000 || score > maxScore)) maxScore = undefined;

  const gradeMatch = line.match(/\b(O|A\+|A|B\+|B|C\+|C|D|E|F|S|AA|AB)\b/);
  const grade = gradeMatch ? gradeMatch[1] : null;

  return { subject, score: Math.round(score), maxScore, grade };
}

// Best-effort extraction of candidate marks from raw OCR text. Results are
// ALWAYS shown to the user for confirmation before anything is saved.
export function parseMarks(text) {
  const seen = new Set();
  const marks = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    const candidate = parseLine(line.trim());
    if (!candidate) continue;
    const key = `${candidate.subject.toLowerCase()}:${candidate.score}`;
    if (seen.has(key)) continue;
    seen.add(key);
    marks.push(candidate);
    if (marks.length >= 40) break;
  }
  return marks;
}

// Infers a broad category label from the file name (e.g. "Semester3.pdf").
export function guessCategory(fileName) {
  const match = /(sem(ester)?|year|term)[\s._-]*(\d+)/i.exec(String(fileName || ""));
  if (match) return `Semester ${match[3]}`;
  return "General";
}