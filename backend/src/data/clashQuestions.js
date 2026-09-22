// Reusable question bank for Clash arena duels. Each game snapshots a hand-picked
// set (5 questions across distinct categories) into the ClashGame row, so later
// edits to this bank never change the questions a finished game must show.
const CATEGORIES = [
  {
    category: "Computer Science",
    questions: [
      { prompt: "Which data structure gives O(1) average lookup?", options: ["Linked list", "Hash map", "Stack", "Binary search tree"], answer: 1 },
      { prompt: "What does 'http' stand for?", options: ["HyperText Transfer Protocol", "High-Throughput Text Protocol", "Hyperlink Text Process", "Host Transfer Protocol"], answer: 0 },
      { prompt: "Which language runs directly on the browser?", options: ["JavaScript", "Python", "C++", "Go"], answer: 0 },
      { prompt: "What is the time complexity of binary search?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], answer: 1 },
      { prompt: "Which of these is a database query language?", options: ["HTML", "CSS", "SQL", "JSON"], answer: 2 },
      { prompt: "What stores the temporary result closest to the CPU?", options: ["RAM", "Cache", "Hard disk", "ROM"], answer: 1 }
    ]
  },
  {
    category: "Mathematics",
    questions: [
      { prompt: "What is the derivative of x²?", options: ["x", "2x", "x²", "2"], answer: 1 },
      { prompt: "The value of π to two decimals is…", options: ["3.12", "3.41", "3.14", "3.16"], answer: 2 },
      { prompt: "If a bag contains 3 red and 5 blue balls, P(red) = ?", options: ["1/8", "3/5", "5/8", "3/8"], answer: 3 },
      { prompt: "What is 15% of 240?", options: ["30", "36", "40", "48"], answer: 1 },
      { prompt: "The mean of 4, 8, 6, 10 and 2 is…", options: ["5", "6", "7", "8"], answer: 1 },
      { prompt: "Which number is a perfect square?", options: ["125", "144", "150", "196"], answer: 1 }
    ]
  },
  {
    category: "Economy & Finance",
    questions: [
      { prompt: "RBI primarily controls which of these?", options: ["Stock prices", "Repo rate", "GST rates", "Income tax slabs"], answer: 1 },
      { prompt: "Compound interest grows…", options: ["Linearly", "Exponentially", "Logarithmically", "Randomly"], answer: 1 },
      { prompt: "'CPI' is a measure of…", options: ["Corporate profit index", "Capital purchase inflation", "Consumer price inflation", "Credit purchase index"], answer: 2 },
      { prompt: "A budget deficit means…", options: ["Spending exceeds income", "Income exceeds spending", "Zero spending", "Balanced trade"], answer: 0 },
      { prompt: "Which is a direct tax?", options: ["GST", "Excise", "Income tax", "Customs"], answer: 2 },
      { prompt: "Primary market deals with…", options: ["Old shares", "New share issues", "Bond resale", "Currency trading"], answer: 1 }
    ]
  },
  {
    category: "Science & Aptitude",
    questions: [
      { prompt: "Which vitamin is produced by sunlight on the skin?", options: ["A", "B12", "C", "D"], answer: 3 },
      { prompt: "pH of a neutral solution is…", options: ["0", "7", "10", "14"], answer: 1 },
      { prompt: "The basic SI unit of force is…", options: ["Joule", "Watt", "Newton", "Pascal"], answer: 2 },
      { prompt: "In a class of 30, 12 wear glasses. Those without are…", options: ["18", "20", "42", "12"], answer: 0 },
      { prompt: "If 5x + 3 = 18, then x = ?", options: ["2", "3", "4", "5"], answer: 1 },
      { prompt: "A car moves 120 km in 2 hours. Average speed (km/h)?", options: ["40", "50", "60", "80"], answer: 2 }
    ]
  },
  {
    category: "General Career",
    questions: [
      { prompt: "A 'portfolio' for a student is mainly…", options: ["A savings account", "Evidence of skills and work", "A photo album", "A fee receipt"], answer: 1 },
      { prompt: "Which certification concept means proof can be checked by anyone?", options: ["Verifiable credential", "Private key", "Printout", "Invoice"], answer: 0 },
      { prompt: "An 'internship' typically aims to…", options: ["Earn a salary cap", "Gain real work experience", "Pay tuition", "Replace exams"], answer: 1 },
      { prompt: "A recruiter values most…", options: ["Verified real proof", "Word-of-mouth", "Long resumes", "Certificates only"], answer: 0 },
      { prompt: "'Streak' in a habit app means…", options: ["A prize refund", "Consecutive days of practice", "A payment plan", "A social post"], answer: 1 },
      { prompt: "Which is the best first step to career direction?", options: ["Waiting for placements", "Testing real skills", "Asking for a salary", "Copying a resume"], answer: 1 }
    ]
  }
];

export const CLASH_QUESTION_COUNT = 5;

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pick(category) {
  const shuffled = shuffle(category.questions);
  const question = shuffled[0];
  if (!question) return null;
  return { category: category.category, prompt: question.prompt, options: question.options, answer: question.answer };
}

// Five questions, each from a different category so a duel never repeats a topic.
export function pickClashQuestions() {
  const picked = [];
  const bag = shuffle(CATEGORIES);
  for (const category of bag) {
    const question = pick(category);
    if (question) picked.push(question);
    if (picked.length >= CLASH_QUESTION_COUNT) break;
  }
  return picked;
}