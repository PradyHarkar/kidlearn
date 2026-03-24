/**
 * Seed script: validates and loads 60 curriculum-aligned questions
 * (20 Maths, 20 English, 20 Science — Foundation through Year 3, ACARA-aligned AU)
 *
 * Usage:
 *   AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... npx tsx scripts/seed-questions.ts
 *   OR with AWS profile:
 *   AWS_PROFILE=... npx tsx scripts/seed-questions.ts
 *   OR dry-run (validate only, no writes):
 *   DRY_RUN=true npx tsx scripts/seed-questions.ts
 */

import {
  DynamoDBClient,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

// ---------------------------------------------------------------------------
// DynamoDB client
// ---------------------------------------------------------------------------
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});

const TABLE = process.env.DYNAMODB_QUESTIONS_TABLE || "kidlearn-questions";
const DRY_RUN = process.env.DRY_RUN === "true";

// ---------------------------------------------------------------------------
// Raw question data (sourced from GPT-generated ACARA question bank PDF)
// PK  = subject#ageGroup  (ageGroup uses our canonical keys: foundation|year1-year8)
// SK  = questionId  (unique per question)
// ---------------------------------------------------------------------------

type RawQuestion = {
  pk: string;
  questionId: string;
  questionText: string;
  ttsText: string;
  subject: "maths" | "english" | "science";
  yearLevel: string;
  difficulty: number;
  topics: string[];
  interactionType: string;
  interactionData: Record<string, unknown>;
  answerOptions: {
    id: string;
    text: string;
    emoji?: string;
    isCorrect: boolean;
    visualDescription?: string;
  }[];
  explanation: string;
  hint: string;
};

const QUESTIONS: RawQuestion[] = [
  // ==========================================================================
  // MATHS — Foundation (difficulty 1–2)
  // ==========================================================================
  {
    pk: "maths#foundation",
    questionId: "maths-foundation-001",
    questionText: "How many apples are there?",
    ttsText: "How many apples are there? Count the apples and tap the right number.",
    subject: "maths",
    yearLevel: "foundation",
    difficulty: 1,
    topics: ["number", "counting", "ac9mfn01"],
    interactionType: "tap-card",
    interactionData: {
      visualContext: "🍎🍎🍎",
      keyboardAlternative: "Use arrow keys to move between cards, press Enter to select.",
      ariaLabel: "Select the number that shows how many apples there are.",
    },
    answerOptions: [
      { id: "a", text: "3", emoji: "3️⃣", isCorrect: true },
      { id: "b", text: "2", emoji: "2️⃣", isCorrect: false },
      { id: "c", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "d", text: "5", emoji: "5️⃣", isCorrect: false },
    ],
    explanation: "There are 3 apples. Count them one by one: 1, 2, 3!",
    hint: "Point to each apple and say a number as you count.",
  },
  {
    pk: "maths#foundation",
    questionId: "maths-foundation-002",
    questionText: "Which shape is a circle?",
    ttsText: "Look at the shapes. Which one is a circle? Tap the circle.",
    subject: "maths",
    yearLevel: "foundation",
    difficulty: 1,
    topics: ["geometry", "2D shapes", "ac9mfsp01"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the shape that is a circle.",
    },
    answerOptions: [
      { id: "a", text: "Circle", emoji: "⭕", isCorrect: true },
      { id: "b", text: "Square", emoji: "🟥", isCorrect: false },
      { id: "c", text: "Triangle", emoji: "🔺", isCorrect: false },
      { id: "d", text: "Rectangle", emoji: "▬", isCorrect: false },
    ],
    explanation: "A circle is perfectly round with no corners or straight edges.",
    hint: "A circle looks like a ball from the front — perfectly round!",
  },
  {
    pk: "maths#foundation",
    questionId: "maths-foundation-003",
    questionText: "Which group has MORE fruit?",
    ttsText: "Look at the two groups of fruit. Which group has more? Tap that group.",
    subject: "maths",
    yearLevel: "foundation",
    difficulty: 1,
    topics: ["comparison", "more and less", "ac9mfn03"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Press 1 for Group A or 2 for Group B.",
      ariaLabel: "Select the group that has more fruit.",
    },
    answerOptions: [
      { id: "a", text: "Group A — 🍊🍊🍊🍊🍊", isCorrect: true },
      { id: "b", text: "Group B — 🍋🍋🍋", isCorrect: false },
      { id: "c", text: "They are the same", isCorrect: false },
      { id: "d", text: "I don't know", isCorrect: false },
    ],
    explanation: "Group A has 5 oranges, Group B has 3 lemons. 5 is more than 3.",
    hint: "Count each group. The bigger number means more.",
  },
  {
    pk: "maths#foundation",
    questionId: "maths-foundation-004",
    questionText: "What comes next in the pattern? 🔴 🔵 🔴 🔵 🔴 ___",
    ttsText: "Red, blue, red, blue, red … what comes next? Tap the answer.",
    subject: "maths",
    yearLevel: "foundation",
    difficulty: 2,
    topics: ["patterns", "algebra", "ac9mfal01"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the shape that continues the pattern.",
    },
    answerOptions: [
      { id: "a", text: "Blue", emoji: "🔵", isCorrect: true },
      { id: "b", text: "Red", emoji: "🔴", isCorrect: false },
      { id: "c", text: "Green", emoji: "🟢", isCorrect: false },
      { id: "d", text: "Yellow", emoji: "🟡", isCorrect: false },
    ],
    explanation: "The pattern is red–blue repeating. After red comes blue.",
    hint: "Say the colours out loud: red, blue, red, blue … what's missing?",
  },
  {
    pk: "maths#foundation",
    questionId: "maths-foundation-005",
    questionText: "Sort these objects into HEAVY and LIGHT.",
    ttsText: "Drag each object into the correct bin — heavy things or light things.",
    subject: "maths",
    yearLevel: "foundation",
    difficulty: 2,
    topics: ["measurement", "mass", "ac9mfme01"],
    interactionType: "drag-to-bins",
    interactionData: {
      bins: ["Heavy 🏋️", "Light 🪶"],
      items: ["🪨 Rock", "🍃 Leaf", "🏐 Ball", "🪆 Toy"],
      correctBins: { "🪨 Rock": "Heavy 🏋️", "🍃 Leaf": "Light 🪶", "🏐 Ball": "Heavy 🏋️", "🪆 Toy": "Light 🪶" },
      keyboardAlternative: "Tab to select an item, then press 1 for Heavy or 2 for Light.",
      ariaLabel: "Sort each object into the heavy or light bin.",
    },
    answerOptions: [
      { id: "a", text: "Rock → Heavy, Leaf → Light, Ball → Heavy, Toy → Light", isCorrect: true },
      { id: "b", text: "Rock → Light, Leaf → Heavy, Ball → Light, Toy → Heavy", isCorrect: false },
      { id: "c", text: "All → Heavy", isCorrect: false },
      { id: "d", text: "All → Light", isCorrect: false },
    ],
    explanation: "Rocks and balls are heavy; leaves and small toys are light.",
    hint: "Think about whether you could lift it easily with one finger.",
  },

  // ==========================================================================
  // MATHS — Year 1 (difficulty 2–4)
  // ==========================================================================
  {
    pk: "maths#year1",
    questionId: "maths-year1-001",
    questionText: "What is 7 + 5?",
    ttsText: "What is seven plus five? Tap the correct answer.",
    subject: "maths",
    yearLevel: "year1",
    difficulty: 3,
    topics: ["addition", "number facts", "ac9m1n04"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the sum of seven plus five.",
    },
    answerOptions: [
      { id: "a", text: "12", isCorrect: true },
      { id: "b", text: "11", isCorrect: false },
      { id: "c", text: "13", isCorrect: false },
      { id: "d", text: "10", isCorrect: false },
    ],
    explanation: "7 + 5 = 12. You can count on from 7: 8, 9, 10, 11, 12.",
    hint: "Start at 7 and count on 5 more fingers.",
  },
  {
    pk: "maths#year1",
    questionId: "maths-year1-002",
    questionText: "Put these numbers in ORDER from smallest to biggest.",
    ttsText: "Arrange the numbers from smallest to biggest by dragging them into the right order.",
    subject: "maths",
    yearLevel: "year1",
    difficulty: 2,
    topics: ["number", "ordering", "ac9m1n01"],
    interactionType: "arrange-words",
    interactionData: {
      items: ["15", "3", "9", "21"],
      correctOrder: ["3", "9", "15", "21"],
      keyboardAlternative: "Tab to select a number card, use arrow keys to reposition.",
      ariaLabel: "Arrange the number cards in order from smallest to biggest.",
    },
    answerOptions: [
      { id: "a", text: "3, 9, 15, 21", isCorrect: true },
      { id: "b", text: "21, 15, 9, 3", isCorrect: false },
      { id: "c", text: "3, 15, 9, 21", isCorrect: false },
      { id: "d", text: "9, 3, 21, 15", isCorrect: false },
    ],
    explanation: "3 < 9 < 15 < 21. Each number is bigger than the one before it.",
    hint: "Find the smallest number first, then the next smallest.",
  },
  {
    pk: "maths#year1",
    questionId: "maths-year1-003",
    questionText: "Which is LONGER — the pencil or the crayon?",
    ttsText: "Look at the pencil and the crayon. Which one is longer? Tap the longer one.",
    subject: "maths",
    yearLevel: "year1",
    difficulty: 2,
    topics: ["measurement", "length", "ac9m1me01"],
    interactionType: "hotspot",
    interactionData: {
      imageDescription: "A yellow pencil (18 cm) above a red crayon (8 cm)",
      hotspots: [
        { id: "pencil", label: "Pencil", isCorrect: true, region: "top" },
        { id: "crayon", label: "Crayon", isCorrect: false, region: "bottom" },
      ],
      keyboardAlternative: "Press 1 for Pencil or 2 for Crayon.",
      ariaLabel: "Tap the longer object — pencil or crayon.",
    },
    answerOptions: [
      { id: "a", text: "Pencil", emoji: "✏️", isCorrect: true },
      { id: "b", text: "Crayon", emoji: "🖍️", isCorrect: false },
      { id: "c", text: "They are the same length", isCorrect: false },
      { id: "d", text: "Can't tell", isCorrect: false },
    ],
    explanation: "The pencil is 18 cm and the crayon is 8 cm, so the pencil is longer.",
    hint: "Line them up at one end and see which sticks out more.",
  },
  {
    pk: "maths#year1",
    questionId: "maths-year1-004",
    questionText: "Sort these shapes: triangles go in one group, squares in the other.",
    ttsText: "Drag each shape into the correct bin — triangles or squares.",
    subject: "maths",
    yearLevel: "year1",
    difficulty: 3,
    topics: ["geometry", "2D shapes", "ac9m1sp01"],
    interactionType: "drag-to-bins",
    interactionData: {
      bins: ["Triangles 🔺", "Squares 🟦"],
      items: ["🔺 Shape A", "🟦 Shape B", "🔺 Shape C", "🟦 Shape D"],
      correctBins: { "🔺 Shape A": "Triangles 🔺", "🟦 Shape B": "Squares 🟦", "🔺 Shape C": "Triangles 🔺", "🟦 Shape D": "Squares 🟦" },
      keyboardAlternative: "Tab to select a shape, then press T for Triangles or S for Squares.",
      ariaLabel: "Sort the shapes into triangles and squares.",
    },
    answerOptions: [
      { id: "a", text: "A & C → Triangles; B & D → Squares", isCorrect: true },
      { id: "b", text: "A & B → Triangles; C & D → Squares", isCorrect: false },
      { id: "c", text: "All → Triangles", isCorrect: false },
      { id: "d", text: "All → Squares", isCorrect: false },
    ],
    explanation: "Triangles have 3 sides; squares have 4 equal sides and 4 right angles.",
    hint: "Count the corners — triangles have 3, squares have 4.",
  },
  {
    pk: "maths#year1",
    questionId: "maths-year1-005",
    questionText: "Connect the dots in order from 1 to 10.",
    ttsText: "Connect the dots by tapping them in order from 1 to 10.",
    subject: "maths",
    yearLevel: "year1",
    difficulty: 2,
    topics: ["number", "counting", "ordinal", "ac9m1n01"],
    interactionType: "connect-dots",
    interactionData: {
      dots: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      correctOrder: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      completedImage: "star",
      keyboardAlternative: "Use Tab to move to each dot, press Enter to connect.",
      ariaLabel: "Connect the numbered dots in order from 1 to 10 to reveal a star.",
    },
    answerOptions: [
      { id: "a", text: "1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10", isCorrect: true },
      { id: "b", text: "10 → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1", isCorrect: false },
      { id: "c", text: "1 → 3 → 5 → 7 → 9 → 2 → 4 → 6 → 8 → 10", isCorrect: false },
      { id: "d", text: "2 → 4 → 6 → 8 → 10 → 1 → 3 → 5 → 7 → 9", isCorrect: false },
    ],
    explanation: "Counting from 1 to 10 in order: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10.",
    hint: "Start at 1 and find the next number each time.",
  },

  // ==========================================================================
  // MATHS — Year 2 (difficulty 3–5)
  // ==========================================================================
  {
    pk: "maths#year2",
    questionId: "maths-year2-001",
    questionText: "What is the value of the 5 in the number 52?",
    ttsText: "In the number fifty-two, what is the value of the digit 5? Tap the answer.",
    subject: "maths",
    yearLevel: "year2",
    difficulty: 4,
    topics: ["place value", "tens and ones", "ac9m2n01"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the place value of 5 in the number 52.",
    },
    answerOptions: [
      { id: "a", text: "50", isCorrect: true },
      { id: "b", text: "5", isCorrect: false },
      { id: "c", text: "500", isCorrect: false },
      { id: "d", text: "52", isCorrect: false },
    ],
    explanation: "In 52, the 5 is in the tens place, so its value is 5 × 10 = 50.",
    hint: "Think of 52 as 5 tens and 2 ones.",
  },
  {
    pk: "maths#year2",
    questionId: "maths-year2-002",
    questionText: "Shade 1/4 of this shape.",
    ttsText: "Shade one quarter of the rectangle. Tap on one of the four equal sections.",
    subject: "maths",
    yearLevel: "year2",
    difficulty: 4,
    topics: ["fractions", "quarters", "ac9m2n04"],
    interactionType: "fraction-shade",
    interactionData: {
      shape: "rectangle",
      totalParts: 4,
      targetFraction: "1/4",
      targetShaded: 1,
      keyboardAlternative: "Use arrow keys to highlight sections, press Space to shade.",
      ariaLabel: "Shade exactly one out of four equal sections to show one quarter.",
    },
    answerOptions: [
      { id: "a", text: "1 section shaded out of 4", isCorrect: true },
      { id: "b", text: "2 sections shaded out of 4", isCorrect: false },
      { id: "c", text: "3 sections shaded out of 4", isCorrect: false },
      { id: "d", text: "4 sections shaded out of 4", isCorrect: false },
    ],
    explanation: "One quarter (1/4) means 1 part out of 4 equal parts.",
    hint: "The shape has 4 equal parts. Shade just 1 of them.",
  },
  {
    pk: "maths#year2",
    questionId: "maths-year2-003",
    questionText: "What is 36 − 14?",
    ttsText: "What is thirty-six minus fourteen? Tap the correct answer.",
    subject: "maths",
    yearLevel: "year2",
    difficulty: 4,
    topics: ["subtraction", "number facts", "ac9m2n04"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the result of thirty-six minus fourteen.",
    },
    answerOptions: [
      { id: "a", text: "22", isCorrect: true },
      { id: "b", text: "21", isCorrect: false },
      { id: "c", text: "23", isCorrect: false },
      { id: "d", text: "20", isCorrect: false },
    ],
    explanation: "36 − 14: subtract the ones first (6 − 4 = 2), then the tens (3 − 1 = 2), giving 22.",
    hint: "Try breaking it into tens and ones: 30 − 10 = 20, then 6 − 4 = 2.",
  },
  {
    pk: "maths#year2",
    questionId: "maths-year2-004",
    questionText: "Match each clock time to the correct digital time.",
    ttsText: "Match each analogue clock to the correct digital time by pairing them.",
    subject: "maths",
    yearLevel: "year2",
    difficulty: 5,
    topics: ["time", "clocks", "ac9m2me01"],
    interactionType: "match-pairs",
    interactionData: {
      pairs: [
        { left: "🕒 3 o'clock", right: "3:00" },
        { left: "🕕 5 o'clock", right: "5:00" },
        { left: "🕐 1 o'clock", right: "1:00" },
        { left: "🕗 7 o'clock", right: "7:00" },
      ],
      keyboardAlternative: "Tab to select a clock, then Tab to the matching time and press Enter.",
      ariaLabel: "Match each analogue clock face to the correct digital time.",
    },
    answerOptions: [
      { id: "a", text: "3:00 ↔ 3 o'clock, 5:00 ↔ 5 o'clock, 1:00 ↔ 1 o'clock, 7:00 ↔ 7 o'clock", isCorrect: true },
      { id: "b", text: "3:00 ↔ 5 o'clock, 5:00 ↔ 3 o'clock, 1:00 ↔ 7 o'clock, 7:00 ↔ 1 o'clock", isCorrect: false },
      { id: "c", text: "All clocks match 12:00", isCorrect: false },
      { id: "d", text: "Random matching", isCorrect: false },
    ],
    explanation: "When the short hand points to a number and the long hand is on 12, it's that number o'clock.",
    hint: "The short hand shows the hour. Find the matching number.",
  },
  {
    pk: "maths#year2",
    questionId: "maths-year2-005",
    questionText: "There are 5 bags with 3 apples each. How many apples in total?",
    ttsText: "Five bags with three apples in each bag. How many apples are there altogether? Tap the answer.",
    subject: "maths",
    yearLevel: "year2",
    difficulty: 5,
    topics: ["multiplication", "groups of", "ac9m2n05"],
    interactionType: "tap-card",
    interactionData: {
      visualContext: "🛍️×5, each with 🍎🍎🍎",
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the total number of apples in five bags of three.",
    },
    answerOptions: [
      { id: "a", text: "15", isCorrect: true },
      { id: "b", text: "8", isCorrect: false },
      { id: "c", text: "12", isCorrect: false },
      { id: "d", text: "20", isCorrect: false },
    ],
    explanation: "5 groups of 3 = 5 × 3 = 15. You can also add: 3 + 3 + 3 + 3 + 3 = 15.",
    hint: "Count by 3s: 3, 6, 9, 12, 15.",
  },

  // ==========================================================================
  // MATHS — Year 3 (difficulty 4–7)
  // ==========================================================================
  {
    pk: "maths#year3",
    questionId: "maths-year3-001",
    questionText: "What is 8 × 7?",
    ttsText: "What is eight times seven? Tap the correct answer.",
    subject: "maths",
    yearLevel: "year3",
    difficulty: 5,
    topics: ["multiplication", "times tables", "ac9m3n05"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the product of eight times seven.",
    },
    answerOptions: [
      { id: "a", text: "56", isCorrect: true },
      { id: "b", text: "54", isCorrect: false },
      { id: "c", text: "48", isCorrect: false },
      { id: "d", text: "64", isCorrect: false },
    ],
    explanation: "8 × 7 = 56. The 8-times table: 8, 16, 24, 32, 40, 48, 56.",
    hint: "Try 8 × 5 = 40, then add 8 + 8 more.",
  },
  {
    pk: "maths#year3",
    questionId: "maths-year3-002",
    questionText: "What fraction of the pizza has been eaten? (3 slices out of 8 are gone.)",
    ttsText: "A pizza had 8 equal slices. Three slices have been eaten. What fraction has been eaten?",
    subject: "maths",
    yearLevel: "year3",
    difficulty: 5,
    topics: ["fractions", "ac9m3n04"],
    interactionType: "fraction-shade",
    interactionData: {
      shape: "circle",
      totalParts: 8,
      targetFraction: "3/8",
      targetShaded: 3,
      keyboardAlternative: "Use arrow keys to navigate slices, press Space to mark as eaten.",
      ariaLabel: "Shade three out of eight pizza slices to show the fraction eaten.",
    },
    answerOptions: [
      { id: "a", text: "3/8", isCorrect: true },
      { id: "b", text: "5/8", isCorrect: false },
      { id: "c", text: "3/5", isCorrect: false },
      { id: "d", text: "1/3", isCorrect: false },
    ],
    explanation: "3 slices out of 8 total = 3/8. The top number is how many were eaten, the bottom is the total.",
    hint: "Write it as: slices eaten / total slices.",
  },
  {
    pk: "maths#year3",
    questionId: "maths-year3-003",
    questionText: "What is the area of a rectangle 6 m long and 4 m wide?",
    ttsText: "A rectangle is 6 metres long and 4 metres wide. What is its area in square metres?",
    subject: "maths",
    yearLevel: "year3",
    difficulty: 6,
    topics: ["area", "measurement", "ac9m3me03"],
    interactionType: "tap-card",
    interactionData: {
      visualContext: "Rectangle: length 6 m, width 4 m",
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the area of a 6 by 4 rectangle in square metres.",
    },
    answerOptions: [
      { id: "a", text: "24 m²", isCorrect: true },
      { id: "b", text: "20 m²", isCorrect: false },
      { id: "c", text: "10 m²", isCorrect: false },
      { id: "d", text: "16 m²", isCorrect: false },
    ],
    explanation: "Area = length × width = 6 × 4 = 24 square metres.",
    hint: "Multiply length × width to find area.",
  },
  {
    pk: "maths#year3",
    questionId: "maths-year3-004",
    questionText: "Put these events in order from FIRST to LAST.",
    ttsText: "Arrange these events in the correct time order from first to last.",
    subject: "maths",
    yearLevel: "year3",
    difficulty: 4,
    topics: ["time", "sequencing", "ac9m3me01"],
    interactionType: "order-events",
    interactionData: {
      events: ["🌙 Go to sleep", "🌅 Wake up", "🍽️ Eat lunch", "🎒 Go to school"],
      correctOrder: ["🌅 Wake up", "🎒 Go to school", "🍽️ Eat lunch", "🌙 Go to sleep"],
      keyboardAlternative: "Tab to select an event card, use arrow keys to move it up or down.",
      ariaLabel: "Order the daily events from first to last.",
    },
    answerOptions: [
      { id: "a", text: "Wake up → School → Lunch → Sleep", isCorrect: true },
      { id: "b", text: "Sleep → Wake up → School → Lunch", isCorrect: false },
      { id: "c", text: "School → Wake up → Lunch → Sleep", isCorrect: false },
      { id: "d", text: "Lunch → School → Wake up → Sleep", isCorrect: false },
    ],
    explanation: "A typical day: wake up in the morning, go to school, eat lunch at midday, then sleep at night.",
    hint: "Think about what time of day each event happens.",
  },
  {
    pk: "maths#year3",
    questionId: "maths-year3-005",
    questionText: "How many groups of 6 are in 42?",
    ttsText: "How many groups of six fit into forty-two? Tap the correct answer.",
    subject: "maths",
    yearLevel: "year3",
    difficulty: 6,
    topics: ["division", "grouping", "ac9m3n05"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select how many groups of 6 are in 42.",
    },
    answerOptions: [
      { id: "a", text: "7", isCorrect: true },
      { id: "b", text: "6", isCorrect: false },
      { id: "c", text: "8", isCorrect: false },
      { id: "d", text: "9", isCorrect: false },
    ],
    explanation: "42 ÷ 6 = 7. Check: 6 × 7 = 42 ✓",
    hint: "Count up in 6s until you reach 42: 6, 12, 18, 24, 30, 36, 42.",
  },

  // ==========================================================================
  // ENGLISH — Foundation (difficulty 1–2)
  // ==========================================================================
  {
    pk: "english#foundation",
    questionId: "english-foundation-001",
    questionText: "Which picture starts with the letter 'B'?",
    ttsText: "Which picture starts with the letter B? Listen: B, B, B. Tap the right picture.",
    subject: "english",
    yearLevel: "foundation",
    difficulty: 1,
    topics: ["phonics", "initial sounds", "ac9efla04"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the picture whose name starts with the letter B.",
    },
    answerOptions: [
      { id: "a", text: "Ball", emoji: "⚽", isCorrect: true },
      { id: "b", text: "Cat", emoji: "🐱", isCorrect: false },
      { id: "c", text: "Dog", emoji: "🐶", isCorrect: false },
      { id: "d", text: "Egg", emoji: "🥚", isCorrect: false },
    ],
    explanation: "Ball starts with /b/ — the same sound as the letter B.",
    hint: "Say each word slowly. Which one starts with a 'buh' sound?",
  },
  {
    pk: "english#foundation",
    questionId: "english-foundation-002",
    questionText: "Which word rhymes with 'cat'?",
    ttsText: "Which word rhymes with cat? Listen: cat. Tap the word that rhymes.",
    subject: "english",
    yearLevel: "foundation",
    difficulty: 1,
    topics: ["rhyme", "phonological awareness", "ac9efla03"],
    interactionType: "audio-listen-tap",
    interactionData: {
      audioWords: ["cat", "hat", "dog", "sun"],
      targetRhyme: "cat",
      keyboardAlternative: "Press Space to hear each word, then press 1–4 to select.",
      ariaLabel: "Listen to each word and tap the one that rhymes with cat.",
    },
    answerOptions: [
      { id: "a", text: "hat", emoji: "🎩", isCorrect: true },
      { id: "b", text: "dog", emoji: "🐶", isCorrect: false },
      { id: "c", text: "sun", emoji: "☀️", isCorrect: false },
      { id: "d", text: "big", emoji: "🔡", isCorrect: false },
    ],
    explanation: "Cat and hat both end in '-at', so they rhyme!",
    hint: "Say cat, then each word. Do they end with the same sound?",
  },
  {
    pk: "english#foundation",
    questionId: "english-foundation-003",
    questionText: "Tap the sight word: 'the'",
    ttsText: "Can you find the word 'the'? Tap on the word that says 'the'.",
    subject: "english",
    yearLevel: "foundation",
    difficulty: 1,
    topics: ["sight words", "reading", "ac9efla08"],
    interactionType: "hotspot",
    interactionData: {
      displayWords: ["the", "cat", "and", "she"],
      targetWord: "the",
      keyboardAlternative: "Tab to each word card, press Enter to select.",
      ariaLabel: "Find and tap the word 'the' from the group of words.",
    },
    answerOptions: [
      { id: "a", text: "the", isCorrect: true },
      { id: "b", text: "cat", isCorrect: false },
      { id: "c", text: "and", isCorrect: false },
      { id: "d", text: "she", isCorrect: false },
    ],
    explanation: "'The' is one of the most common words in English — it's a sight word to learn by heart.",
    hint: "It starts with 't' and has 3 letters.",
  },
  {
    pk: "english#foundation",
    questionId: "english-foundation-004",
    questionText: "Put the sentence in the correct order: 'the / likes / cat / fish'",
    ttsText: "Make a sentence from these words: the, likes, cat, fish. Drag them into the right order.",
    subject: "english",
    yearLevel: "foundation",
    difficulty: 2,
    topics: ["sentence structure", "grammar", "ac9efla09"],
    interactionType: "arrange-words",
    interactionData: {
      words: ["the", "likes", "cat", "fish"],
      correctOrder: ["The", "cat", "likes", "fish"],
      keyboardAlternative: "Tab to each word tile, use arrow keys to move left or right.",
      ariaLabel: "Arrange the four word cards to make a correct sentence.",
    },
    answerOptions: [
      { id: "a", text: "The cat likes fish.", isCorrect: true },
      { id: "b", text: "Fish the cat likes.", isCorrect: false },
      { id: "c", text: "Likes the cat fish.", isCorrect: false },
      { id: "d", text: "Cat fish the likes.", isCorrect: false },
    ],
    explanation: "A sentence needs a subject (The cat) and what it does (likes fish). Sentences start with a capital letter.",
    hint: "Start with who it's about — 'The cat'.",
  },
  {
    pk: "english#foundation",
    questionId: "english-foundation-005",
    questionText: "Match each animal to the sound it makes.",
    ttsText: "Match each animal to the sound it makes by pairing them up.",
    subject: "english",
    yearLevel: "foundation",
    difficulty: 2,
    topics: ["vocabulary", "language", "ac9efla11"],
    interactionType: "match-pairs",
    interactionData: {
      pairs: [
        { left: "🐄 Cow", right: "Moo" },
        { left: "🐸 Frog", right: "Ribbit" },
        { left: "🐝 Bee", right: "Buzz" },
        { left: "🦆 Duck", right: "Quack" },
      ],
      keyboardAlternative: "Tab to select an animal, then Tab to its sound and press Enter.",
      ariaLabel: "Match each animal on the left with the sound it makes on the right.",
    },
    answerOptions: [
      { id: "a", text: "Cow–Moo, Frog–Ribbit, Bee–Buzz, Duck–Quack", isCorrect: true },
      { id: "b", text: "Cow–Quack, Frog–Moo, Bee–Ribbit, Duck–Buzz", isCorrect: false },
      { id: "c", text: "All animals say Moo", isCorrect: false },
      { id: "d", text: "Cow–Buzz, Frog–Quack, Bee–Moo, Duck–Ribbit", isCorrect: false },
    ],
    explanation: "Each animal makes its own special sound. Cows moo, frogs ribbit, bees buzz, and ducks quack!",
    hint: "Think about each animal. What sound does it make?",
  },

  // ==========================================================================
  // ENGLISH — Year 1 (difficulty 2–4)
  // ==========================================================================
  {
    pk: "english#year1",
    questionId: "english-year1-001",
    questionText: "Which word has the 'sh' sound?",
    ttsText: "Which word has the 'sh' sound — like in 'ship'? Listen and tap the right word.",
    subject: "english",
    yearLevel: "year1",
    difficulty: 3,
    topics: ["digraphs", "phonics", "ac9e1la04"],
    interactionType: "audio-listen-tap",
    interactionData: {
      audioWords: ["shop", "cat", "run", "big"],
      targetSound: "sh",
      keyboardAlternative: "Press Space to hear each word, then 1–4 to select.",
      ariaLabel: "Select the word containing the 'sh' digraph sound.",
    },
    answerOptions: [
      { id: "a", text: "shop", emoji: "🏪", isCorrect: true },
      { id: "b", text: "cat", emoji: "🐱", isCorrect: false },
      { id: "c", text: "run", emoji: "🏃", isCorrect: false },
      { id: "d", text: "big", emoji: "🔡", isCorrect: false },
    ],
    explanation: "'Shop' starts with 'sh' — a digraph (two letters making one sound).",
    hint: "Say each word. Only one starts with the 'shh' sound.",
  },
  {
    pk: "english#year1",
    questionId: "english-year1-002",
    questionText: "Choose the correct word: 'The dog ___ in the park.' (run / runs / running)",
    ttsText: "Choose the correct word to complete the sentence: The dog blank in the park.",
    subject: "english",
    yearLevel: "year1",
    difficulty: 3,
    topics: ["grammar", "verb agreement", "ac9e1la02"],
    interactionType: "tap-card",
    interactionData: {
      sentence: "The dog ___ in the park.",
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the correct verb form to complete the sentence.",
    },
    answerOptions: [
      { id: "a", text: "runs", isCorrect: true },
      { id: "b", text: "run", isCorrect: false },
      { id: "c", text: "running", isCorrect: false },
      { id: "d", text: "ran", isCorrect: false },
    ],
    explanation: "'The dog runs' is correct. When we talk about one person or animal doing something now, we add -s.",
    hint: "The subject is 'the dog' — one dog. Which form matches?",
  },
  {
    pk: "english#year1",
    questionId: "english-year1-003",
    questionText: "Sort these words into NOUNS and VERBS.",
    ttsText: "Sort these words into nouns — naming words — and verbs — action words.",
    subject: "english",
    yearLevel: "year1",
    difficulty: 3,
    topics: ["grammar", "nouns", "verbs", "ac9e1la01"],
    interactionType: "drag-to-bins",
    interactionData: {
      bins: ["Nouns (naming words)", "Verbs (action words)"],
      items: ["jump", "apple", "run", "school"],
      correctBins: { jump: "Verbs (action words)", apple: "Nouns (naming words)", run: "Verbs (action words)", school: "Nouns (naming words)" },
      keyboardAlternative: "Tab to a word, press N for Noun or V for Verb.",
      ariaLabel: "Sort the four words into nouns or verbs.",
    },
    answerOptions: [
      { id: "a", text: "Nouns: apple, school; Verbs: jump, run", isCorrect: true },
      { id: "b", text: "Nouns: jump, run; Verbs: apple, school", isCorrect: false },
      { id: "c", text: "All nouns", isCorrect: false },
      { id: "d", text: "All verbs", isCorrect: false },
    ],
    explanation: "Nouns name things (apple, school). Verbs describe actions (jump, run).",
    hint: "Can you 'do' it? If yes, it's probably a verb. If it's a thing, it's a noun.",
  },
  {
    pk: "english#year1",
    questionId: "english-year1-004",
    questionText: "What is the correct punctuation at the end of a question?",
    ttsText: "What punctuation mark goes at the end of a question? Tap the right answer.",
    subject: "english",
    yearLevel: "year1",
    difficulty: 2,
    topics: ["punctuation", "question mark", "ac9e1la06"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the punctuation mark that ends a question.",
    },
    answerOptions: [
      { id: "a", text: "?", isCorrect: true },
      { id: "b", text: ".", isCorrect: false },
      { id: "c", text: "!", isCorrect: false },
      { id: "d", text: ",", isCorrect: false },
    ],
    explanation: "A question mark (?) goes at the end of a question. Full stops end statements, exclamation marks show excitement.",
    hint: "A question is asking something. What mark goes with asking?",
  },
  {
    pk: "english#year1",
    questionId: "english-year1-005",
    questionText: "Put the story events in the correct order.",
    ttsText: "Arrange these story events in the correct order from beginning to end.",
    subject: "english",
    yearLevel: "year1",
    difficulty: 4,
    topics: ["comprehension", "sequencing", "ac9e1lt01"],
    interactionType: "order-events",
    interactionData: {
      events: [
        "🐣 The chick hatched from the egg.",
        "🥚 An egg was laid in the nest.",
        "🐔 The chick grew into a chicken.",
        "🌡️ The mother sat on the egg to keep it warm.",
      ],
      correctOrder: [
        "🥚 An egg was laid in the nest.",
        "🌡️ The mother sat on the egg to keep it warm.",
        "🐣 The chick hatched from the egg.",
        "🐔 The chick grew into a chicken.",
      ],
      keyboardAlternative: "Tab to an event card, use arrow keys to move it up or down.",
      ariaLabel: "Order the story events from first to last.",
    },
    answerOptions: [
      { id: "a", text: "Egg laid → Kept warm → Chick hatched → Grew into chicken", isCorrect: true },
      { id: "b", text: "Chick hatched → Egg laid → Kept warm → Grew into chicken", isCorrect: false },
      { id: "c", text: "Grew into chicken → Chick hatched → Egg laid → Kept warm", isCorrect: false },
      { id: "d", text: "Kept warm → Grew into chicken → Egg laid → Chick hatched", isCorrect: false },
    ],
    explanation: "First the egg is laid, then kept warm, then the chick hatches, and finally it grows up.",
    hint: "Think: what has to happen before each event is possible?",
  },

  // ==========================================================================
  // ENGLISH — Year 2 (difficulty 3–5)
  // ==========================================================================
  {
    pk: "english#year2",
    questionId: "english-year2-001",
    questionText: "Which word is spelt correctly?",
    ttsText: "Which word is spelt correctly? Tap the correctly spelt word.",
    subject: "english",
    yearLevel: "year2",
    difficulty: 4,
    topics: ["spelling", "ac9e2la04"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the correctly spelled word.",
    },
    answerOptions: [
      { id: "a", text: "because", isCorrect: true },
      { id: "b", text: "becuase", isCorrect: false },
      { id: "c", text: "becouse", isCorrect: false },
      { id: "d", text: "becaues", isCorrect: false },
    ],
    explanation: "'Because' is the correct spelling: b-e-c-a-u-s-e.",
    hint: "Break it into sounds: be-cause.",
  },
  {
    pk: "english#year2",
    questionId: "english-year2-002",
    questionText: "Match each adjective to the noun it best describes.",
    ttsText: "Match each describing word to the noun it best describes.",
    subject: "english",
    yearLevel: "year2",
    difficulty: 4,
    topics: ["adjectives", "vocabulary", "ac9e2la01"],
    interactionType: "match-pairs",
    interactionData: {
      pairs: [
        { left: "🌊 Ocean", right: "deep" },
        { left: "🌸 Flower", right: "beautiful" },
        { left: "🦁 Lion", right: "fierce" },
        { left: "🍦 Ice cream", right: "cold" },
      ],
      keyboardAlternative: "Tab to select a noun, then Tab to an adjective and press Enter.",
      ariaLabel: "Match each noun to the adjective that best describes it.",
    },
    answerOptions: [
      { id: "a", text: "Ocean–deep, Flower–beautiful, Lion–fierce, Ice cream–cold", isCorrect: true },
      { id: "b", text: "Ocean–cold, Flower–fierce, Lion–deep, Ice cream–beautiful", isCorrect: false },
      { id: "c", text: "All nouns are beautiful", isCorrect: false },
      { id: "d", text: "Ocean–fierce, Flower–cold, Lion–beautiful, Ice cream–deep", isCorrect: false },
    ],
    explanation: "Adjectives describe nouns. Choose the word that fits best: oceans are deep, lions are fierce.",
    hint: "Picture each noun. What word describes it most?",
  },
  {
    pk: "english#year2",
    questionId: "english-year2-003",
    questionText: "Add the correct punctuation: 'Watch out the dog is coming'",
    ttsText: "The sentence 'Watch out the dog is coming' needs punctuation. Which version is correct?",
    subject: "english",
    yearLevel: "year2",
    difficulty: 4,
    topics: ["punctuation", "exclamation marks", "ac9e2la06"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the correctly punctuated version of the sentence.",
    },
    answerOptions: [
      { id: "a", text: "Watch out! The dog is coming!", isCorrect: true },
      { id: "b", text: "Watch out, the dog is coming.", isCorrect: false },
      { id: "c", text: "Watch out? The dog is coming?", isCorrect: false },
      { id: "d", text: "watch out the dog is coming", isCorrect: false },
    ],
    explanation: "'Watch out!' is a warning — exclamation marks show urgency or strong feeling. Each sentence starts with a capital letter.",
    hint: "Is this an urgent warning? What punctuation shows strong feeling?",
  },
  {
    pk: "english#year2",
    questionId: "english-year2-004",
    questionText: "Sort these words into 'things you can see' and 'things you can hear'.",
    ttsText: "Sort these sense words — some describe things you see, some describe things you hear.",
    subject: "english",
    yearLevel: "year2",
    difficulty: 5,
    topics: ["vocabulary", "senses", "ac9e2la11"],
    interactionType: "drag-to-bins",
    interactionData: {
      bins: ["👀 See", "👂 Hear"],
      items: ["loud", "bright", "colourful", "whisper"],
      correctBins: { loud: "👂 Hear", bright: "👀 See", colourful: "👀 See", whisper: "👂 Hear" },
      keyboardAlternative: "Tab to a word, press S for See or H for Hear.",
      ariaLabel: "Sort the sense-related words into things you see or things you hear.",
    },
    answerOptions: [
      { id: "a", text: "See: bright, colourful; Hear: loud, whisper", isCorrect: true },
      { id: "b", text: "See: loud, whisper; Hear: bright, colourful", isCorrect: false },
      { id: "c", text: "All → See", isCorrect: false },
      { id: "d", text: "All → Hear", isCorrect: false },
    ],
    explanation: "'Bright' and 'colourful' relate to sight. 'Loud' and 'whisper' relate to hearing (sound).",
    hint: "Bright and colourful relate to light — which sense uses light?",
  },
  {
    pk: "english#year2",
    questionId: "english-year2-005",
    questionText: "Which sentence uses 'their' correctly?",
    ttsText: "Which sentence uses the word 'their' correctly? Tap the right sentence.",
    subject: "english",
    yearLevel: "year2",
    difficulty: 5,
    topics: ["homophones", "spelling", "grammar", "ac9e2la04"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the sentence that correctly uses the word 'their'.",
    },
    answerOptions: [
      { id: "a", text: "The children ate their lunch.", isCorrect: true },
      { id: "b", text: "Their going to the park.", isCorrect: false },
      { id: "c", text: "I put it over their.", isCorrect: false },
      { id: "d", text: "Their is a dog outside.", isCorrect: false },
    ],
    explanation: "'Their' shows belonging — the children's lunch belongs to them. 'They're' = they are. 'There' = a place.",
    hint: "Can you replace 'their' with 'belonging to them'? If yes, it's the right one.",
  },

  // ==========================================================================
  // ENGLISH — Year 3 (difficulty 4–7)
  // ==========================================================================
  {
    pk: "english#year3",
    questionId: "english-year3-001",
    questionText: "What is the meaning of the prefix 'un-' in the word 'unhappy'?",
    ttsText: "In the word unhappy, what does the prefix 'un' mean? Tap the answer.",
    subject: "english",
    yearLevel: "year3",
    difficulty: 5,
    topics: ["vocabulary", "prefixes", "ac9e3la04"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the meaning of the prefix 'un-'.",
    },
    answerOptions: [
      { id: "a", text: "not", isCorrect: true },
      { id: "b", text: "very", isCorrect: false },
      { id: "c", text: "again", isCorrect: false },
      { id: "d", text: "before", isCorrect: false },
    ],
    explanation: "The prefix 'un-' means 'not'. Unhappy = not happy. Other examples: undo, unfair, unclear.",
    hint: "If someone is unhappy, are they happy?",
  },
  {
    pk: "english#year3",
    questionId: "english-year3-002",
    questionText: "Which type of text would you read to find facts about dinosaurs?",
    ttsText: "If you want to learn facts about dinosaurs, which type of text would you choose?",
    subject: "english",
    yearLevel: "year3",
    difficulty: 5,
    topics: ["text types", "informational", "ac9e3lt01"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the type of text that contains facts about dinosaurs.",
    },
    answerOptions: [
      { id: "a", text: "Non-fiction information book 📚", isCorrect: true },
      { id: "b", text: "Fiction storybook 📖", isCorrect: false },
      { id: "c", text: "Poem 🎵", isCorrect: false },
      { id: "d", text: "Recipe 🍳", isCorrect: false },
    ],
    explanation: "Non-fiction texts contain real facts. Fiction is made-up stories. A recipe tells you how to cook.",
    hint: "You want facts — real information. Which type contains real information?",
  },
  {
    pk: "english#year3",
    questionId: "english-year3-003",
    questionText: "Arrange these words to make a correct complex sentence.",
    ttsText: "Drag the word groups into the right order to make a complex sentence.",
    subject: "english",
    yearLevel: "year3",
    difficulty: 6,
    topics: ["sentence structure", "conjunctions", "ac9e3la02"],
    interactionType: "arrange-words",
    interactionData: {
      words: ["she finished her homework", "Maya read a book", "because", "quickly"],
      correctOrder: ["Maya read a book", "quickly", "because", "she finished her homework"],
      keyboardAlternative: "Tab to select a phrase, use arrow keys to reposition.",
      ariaLabel: "Arrange the phrases to form a grammatically correct complex sentence.",
    },
    answerOptions: [
      { id: "a", text: "Maya read a book quickly because she finished her homework.", isCorrect: true },
      { id: "b", text: "Because Maya read a book quickly she finished her homework.", isCorrect: false },
      { id: "c", text: "She finished her homework because Maya read a book quickly.", isCorrect: false },
      { id: "d", text: "Quickly because she finished her homework Maya read a book.", isCorrect: false },
    ],
    explanation: "'Because' connects the main clause (Maya read a book) with the reason (she finished her homework).",
    hint: "Start with what Maya did, then explain why with 'because'.",
  },
  {
    pk: "english#year3",
    questionId: "english-year3-004",
    questionText: "The author uses the phrase 'the sun smiled down'. What is this an example of?",
    ttsText: "The author writes 'the sun smiled down.' What literary technique is this?",
    subject: "english",
    yearLevel: "year3",
    difficulty: 7,
    topics: ["figurative language", "personification", "ac9e3lt05"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the literary technique used in 'the sun smiled down'.",
    },
    answerOptions: [
      { id: "a", text: "Personification", isCorrect: true },
      { id: "b", text: "Simile", isCorrect: false },
      { id: "c", text: "Rhyme", isCorrect: false },
      { id: "d", text: "Alliteration", isCorrect: false },
    ],
    explanation: "Personification gives human qualities (like smiling) to non-human things (the sun). A simile compares using 'like' or 'as'.",
    hint: "The sun is acting like a person. What's it called when things act like people?",
  },
  {
    pk: "english#year3",
    questionId: "english-year3-005",
    questionText: "Which sentence is written in the PAST tense?",
    ttsText: "Which sentence is in the past tense — describing something that already happened?",
    subject: "english",
    yearLevel: "year3",
    difficulty: 5,
    topics: ["grammar", "tense", "ac9e3la02"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the sentence written in the past tense.",
    },
    answerOptions: [
      { id: "a", text: "She walked to school yesterday.", isCorrect: true },
      { id: "b", text: "She walks to school every day.", isCorrect: false },
      { id: "c", text: "She will walk to school tomorrow.", isCorrect: false },
      { id: "d", text: "She is walking to school now.", isCorrect: false },
    ],
    explanation: "'Walked' is past tense — it happened already. 'Walks' is present, 'will walk' is future, 'is walking' is present continuous.",
    hint: "Past tense usually ends in -ed. Which sentence has that?",
  },

  // ==========================================================================
  // SCIENCE — Foundation (difficulty 1–2)
  // ==========================================================================
  {
    pk: "science#foundation",
    questionId: "science-foundation-001",
    questionText: "Which of these is a LIVING thing?",
    ttsText: "Which one is a living thing? Tap the picture of a living thing.",
    subject: "science",
    yearLevel: "foundation",
    difficulty: 1,
    topics: ["living and non-living", "biology", "ac9sfbu01"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the living thing from the four options.",
    },
    answerOptions: [
      { id: "a", text: "Tree", emoji: "🌳", isCorrect: true },
      { id: "b", text: "Rock", emoji: "🪨", isCorrect: false },
      { id: "c", text: "Chair", emoji: "🪑", isCorrect: false },
      { id: "d", text: "Book", emoji: "📚", isCorrect: false },
    ],
    explanation: "Trees are living — they grow, need water and sunlight, and make seeds. Rocks, chairs, and books are not alive.",
    hint: "Living things grow and need food or water. Can a rock grow?",
  },
  {
    pk: "science#foundation",
    questionId: "science-foundation-002",
    questionText: "What do plants need to grow? Sort these into NEEDS and DOESN'T NEED.",
    ttsText: "Sort these things into what a plant needs to grow and what it doesn't need.",
    subject: "science",
    yearLevel: "foundation",
    difficulty: 2,
    topics: ["plants", "needs of living things", "ac9sfbu02"],
    interactionType: "drag-to-bins",
    interactionData: {
      bins: ["Plant needs ✅", "Plant doesn't need ❌"],
      items: ["💧 Water", "☀️ Sunlight", "🎵 Music", "🌱 Soil"],
      correctBins: { "💧 Water": "Plant needs ✅", "☀️ Sunlight": "Plant needs ✅", "🎵 Music": "Plant doesn't need ❌", "🌱 Soil": "Plant needs ✅" },
      keyboardAlternative: "Tab to an item, press Y for Needs or N for Doesn't need.",
      ariaLabel: "Sort items into what a plant needs to grow and what it doesn't need.",
    },
    answerOptions: [
      { id: "a", text: "Needs: water, sunlight, soil; Doesn't need: music", isCorrect: true },
      { id: "b", text: "Needs: music, water; Doesn't need: sunlight, soil", isCorrect: false },
      { id: "c", text: "All are needed", isCorrect: false },
      { id: "d", text: "Nothing is needed", isCorrect: false },
    ],
    explanation: "Plants need water, sunlight, and soil to grow. They don't care about music!",
    hint: "Think about what you do when you look after a plant.",
  },
  {
    pk: "science#foundation",
    questionId: "science-foundation-003",
    questionText: "Which weather picture shows a SUNNY day?",
    ttsText: "Which picture shows a sunny day? Tap the correct weather picture.",
    subject: "science",
    yearLevel: "foundation",
    difficulty: 1,
    topics: ["weather", "Earth science", "ac9sfes01"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the weather picture that shows a sunny day.",
    },
    answerOptions: [
      { id: "a", text: "Sunny", emoji: "☀️", isCorrect: true },
      { id: "b", text: "Rainy", emoji: "🌧️", isCorrect: false },
      { id: "c", text: "Snowy", emoji: "❄️", isCorrect: false },
      { id: "d", text: "Stormy", emoji: "⛈️", isCorrect: false },
    ],
    explanation: "A sunny day has bright sunshine and no rain. The sun symbol shows sunshine.",
    hint: "Which picture shows the bright yellow sun?",
  },
  {
    pk: "science#foundation",
    questionId: "science-foundation-004",
    questionText: "Which of your senses would you use to taste an apple?",
    ttsText: "You want to taste an apple. Which of your five senses would you use?",
    subject: "science",
    yearLevel: "foundation",
    difficulty: 1,
    topics: ["senses", "biology", "ac9sfbu03"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the sense used to taste an apple.",
    },
    answerOptions: [
      { id: "a", text: "Taste 👅", isCorrect: true },
      { id: "b", text: "Sight 👀", isCorrect: false },
      { id: "c", text: "Hearing 👂", isCorrect: false },
      { id: "d", text: "Touch ✋", isCorrect: false },
    ],
    explanation: "You use your sense of taste (tongue) to taste food. Your tongue tells you if something is sweet, sour, salty, or bitter.",
    hint: "Which body part do you use when you eat or drink?",
  },
  {
    pk: "science#foundation",
    questionId: "science-foundation-005",
    questionText: "Put the seasons in the correct order starting from summer.",
    ttsText: "Can you put the four seasons in the right order, starting from summer?",
    subject: "science",
    yearLevel: "foundation",
    difficulty: 2,
    topics: ["seasons", "Earth science", "ac9sfes01"],
    interactionType: "order-events",
    interactionData: {
      events: ["🍂 Autumn", "❄️ Winter", "☀️ Summer", "🌸 Spring"],
      correctOrder: ["☀️ Summer", "🍂 Autumn", "❄️ Winter", "🌸 Spring"],
      keyboardAlternative: "Tab to a season card, use arrow keys to reorder.",
      ariaLabel: "Order the four seasons starting from summer.",
    },
    answerOptions: [
      { id: "a", text: "Summer → Autumn → Winter → Spring", isCorrect: true },
      { id: "b", text: "Spring → Summer → Autumn → Winter", isCorrect: false },
      { id: "c", text: "Winter → Spring → Summer → Autumn", isCorrect: false },
      { id: "d", text: "Autumn → Winter → Spring → Summer", isCorrect: false },
    ],
    explanation: "In Australia: Summer (Dec–Feb) → Autumn (Mar–May) → Winter (Jun–Aug) → Spring (Sep–Nov).",
    hint: "In Australia, school starts back after the summer holidays in late January/February.",
  },

  // ==========================================================================
  // SCIENCE — Year 1 (difficulty 2–4)
  // ==========================================================================
  {
    pk: "science#year1",
    questionId: "science-year1-001",
    questionText: "Which material is best for making a waterproof raincoat?",
    ttsText: "You need to make a raincoat that keeps you dry. Which material should you use?",
    subject: "science",
    yearLevel: "year1",
    difficulty: 3,
    topics: ["materials", "properties", "ac9s1pu01"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the best material for a waterproof raincoat.",
    },
    answerOptions: [
      { id: "a", text: "Plastic", emoji: "🧴", isCorrect: true },
      { id: "b", text: "Paper", emoji: "📄", isCorrect: false },
      { id: "c", text: "Wool", emoji: "🧶", isCorrect: false },
      { id: "d", text: "Cotton", emoji: "👕", isCorrect: false },
    ],
    explanation: "Plastic is waterproof — water can't pass through it. Paper, wool, and cotton absorb water.",
    hint: "Think about what happens to paper in the rain.",
  },
  {
    pk: "science#year1",
    questionId: "science-year1-002",
    questionText: "Match each animal to where it lives.",
    ttsText: "Match each animal to its natural habitat — where it lives in the wild.",
    subject: "science",
    yearLevel: "year1",
    difficulty: 3,
    topics: ["habitats", "living things", "ac9s1bu01"],
    interactionType: "match-pairs",
    interactionData: {
      pairs: [
        { left: "🐠 Clownfish", right: "Ocean 🌊" },
        { left: "🦘 Kangaroo", right: "Grassland 🌾" },
        { left: "🐻 Bear", right: "Forest 🌲" },
        { left: "🐪 Camel", right: "Desert 🏜️" },
      ],
      keyboardAlternative: "Tab to an animal, then Tab to a habitat and press Enter.",
      ariaLabel: "Match each animal to the habitat where it lives.",
    },
    answerOptions: [
      { id: "a", text: "Fish–Ocean, Kangaroo–Grassland, Bear–Forest, Camel–Desert", isCorrect: true },
      { id: "b", text: "Fish–Desert, Kangaroo–Ocean, Bear–Grassland, Camel–Forest", isCorrect: false },
      { id: "c", text: "All live in the forest", isCorrect: false },
      { id: "d", text: "Fish–Forest, Kangaroo–Desert, Bear–Ocean, Camel–Grassland", isCorrect: false },
    ],
    explanation: "Animals are adapted to their habitat: fish breathe underwater, kangaroos graze in grasslands, bears live in forests, camels survive in deserts.",
    hint: "Think about where you might see each animal in a nature documentary.",
  },
  {
    pk: "science#year1",
    questionId: "science-year1-003",
    questionText: "What force makes a ball fall to the ground when you drop it?",
    ttsText: "When you drop a ball, it falls down. What force causes this?",
    subject: "science",
    yearLevel: "year1",
    difficulty: 3,
    topics: ["forces", "gravity", "ac9s1pu03"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the force that makes a dropped ball fall to the ground.",
    },
    answerOptions: [
      { id: "a", text: "Gravity", isCorrect: true },
      { id: "b", text: "Magnetism", isCorrect: false },
      { id: "c", text: "Friction", isCorrect: false },
      { id: "d", text: "Wind", isCorrect: false },
    ],
    explanation: "Gravity is the force that pulls objects toward the Earth. It makes balls fall, rain drop, and keeps us on the ground.",
    hint: "It's the same force that keeps us from floating off into space!",
  },
  {
    pk: "science#year1",
    questionId: "science-year1-004",
    questionText: "Put the life cycle of a butterfly in the correct order.",
    ttsText: "Arrange the stages of a butterfly's life cycle in the correct order.",
    subject: "science",
    yearLevel: "year1",
    difficulty: 4,
    topics: ["life cycles", "biology", "ac9s1bu02"],
    interactionType: "order-events",
    interactionData: {
      events: ["🦋 Adult butterfly", "🥚 Egg", "🐛 Caterpillar", "🫘 Chrysalis"],
      correctOrder: ["🥚 Egg", "🐛 Caterpillar", "🫘 Chrysalis", "🦋 Adult butterfly"],
      keyboardAlternative: "Tab to a stage card, use arrow keys to reorder.",
      ariaLabel: "Order the four stages of the butterfly life cycle from first to last.",
    },
    answerOptions: [
      { id: "a", text: "Egg → Caterpillar → Chrysalis → Butterfly", isCorrect: true },
      { id: "b", text: "Butterfly → Chrysalis → Caterpillar → Egg", isCorrect: false },
      { id: "c", text: "Caterpillar → Egg → Butterfly → Chrysalis", isCorrect: false },
      { id: "d", text: "Chrysalis → Caterpillar → Egg → Butterfly", isCorrect: false },
    ],
    explanation: "A butterfly starts as an egg, hatches into a caterpillar, forms a chrysalis, then emerges as a butterfly.",
    hint: "It starts very small. What comes before a caterpillar?",
  },
  {
    pk: "science#year1",
    questionId: "science-year1-005",
    questionText: "Sort these objects: which ones are attracted by a magnet?",
    ttsText: "Sort these objects — which ones are attracted to a magnet, and which are not?",
    subject: "science",
    yearLevel: "year1",
    difficulty: 4,
    topics: ["magnets", "forces", "materials", "ac9s1pu03"],
    interactionType: "drag-to-bins",
    interactionData: {
      bins: ["🧲 Attracted by magnet", "🚫 Not attracted"],
      items: ["📎 Paper clip", "🪵 Wood", "🔩 Iron bolt", "🍎 Apple"],
      correctBins: { "📎 Paper clip": "🧲 Attracted by magnet", "🪵 Wood": "🚫 Not attracted", "🔩 Iron bolt": "🧲 Attracted by magnet", "🍎 Apple": "🚫 Not attracted" },
      keyboardAlternative: "Tab to an item, press M for Magnet or N for Not attracted.",
      ariaLabel: "Sort each object into whether it is attracted by a magnet or not.",
    },
    answerOptions: [
      { id: "a", text: "Attracted: paper clip, iron bolt; Not: wood, apple", isCorrect: true },
      { id: "b", text: "Attracted: wood, apple; Not: paper clip, iron bolt", isCorrect: false },
      { id: "c", text: "All are attracted", isCorrect: false },
      { id: "d", text: "None are attracted", isCorrect: false },
    ],
    explanation: "Magnets attract metal objects containing iron. Paper clips and iron bolts contain iron; wood and apples do not.",
    hint: "Magnets attract metal objects — but not all metals. Think about which ones are made of iron.",
  },

  // ==========================================================================
  // SCIENCE — Year 2 (difficulty 3–5)
  // ==========================================================================
  {
    pk: "science#year2",
    questionId: "science-year2-001",
    questionText: "What happens to water when it is heated?",
    ttsText: "What happens to water when you heat it up? Tap the correct answer.",
    subject: "science",
    yearLevel: "year2",
    difficulty: 4,
    topics: ["states of matter", "heating", "ac9s2pu01"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select what happens to water when it is heated.",
    },
    answerOptions: [
      { id: "a", text: "It evaporates into water vapour (gas)", isCorrect: true },
      { id: "b", text: "It turns into ice (solid)", isCorrect: false },
      { id: "c", text: "It stays the same", isCorrect: false },
      { id: "d", text: "It becomes heavier", isCorrect: false },
    ],
    explanation: "Heating water causes it to evaporate — it changes from liquid to gas (water vapour). Cooling water makes it freeze into ice.",
    hint: "Think about what happens when a puddle disappears on a sunny day.",
  },
  {
    pk: "science#year2",
    questionId: "science-year2-002",
    questionText: "Match each animal to what it eats.",
    ttsText: "Match each animal to the type of food it mainly eats.",
    subject: "science",
    yearLevel: "year2",
    difficulty: 4,
    topics: ["food chains", "animals", "ac9s2bu01"],
    interactionType: "match-pairs",
    interactionData: {
      pairs: [
        { left: "🦁 Lion", right: "Meat 🥩" },
        { left: "🐇 Rabbit", right: "Plants 🥬" },
        { left: "🐻 Bear", right: "Plants & Meat 🍃🥩" },
        { left: "🐄 Cow", right: "Grass 🌿" },
      ],
      keyboardAlternative: "Tab to an animal, then to its food and press Enter.",
      ariaLabel: "Match each animal to what it eats.",
    },
    answerOptions: [
      { id: "a", text: "Lion–Meat, Rabbit–Plants, Bear–Both, Cow–Grass", isCorrect: true },
      { id: "b", text: "Lion–Grass, Rabbit–Meat, Bear–Grass, Cow–Meat", isCorrect: false },
      { id: "c", text: "All animals eat meat", isCorrect: false },
      { id: "d", text: "Lion–Plants, Rabbit–Meat, Bear–Meat, Cow–Plants", isCorrect: false },
    ],
    explanation: "Lions are carnivores (meat-eaters), rabbits and cows are herbivores (plant-eaters), bears are omnivores (eat both).",
    hint: "A lion hunts other animals. A rabbit nibbles leaves. Which eating type is each?",
  },
  {
    pk: "science#year2",
    questionId: "science-year2-003",
    questionText: "Which of these is a RENEWABLE energy source?",
    ttsText: "Which one is a renewable energy source — something that won't run out?",
    subject: "science",
    yearLevel: "year2",
    difficulty: 5,
    topics: ["energy", "sustainability", "ac9s2es01"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the renewable energy source from the options.",
    },
    answerOptions: [
      { id: "a", text: "Solar (sun) ☀️", isCorrect: true },
      { id: "b", text: "Coal ⛏️", isCorrect: false },
      { id: "c", text: "Oil 🛢️", isCorrect: false },
      { id: "d", text: "Natural gas 💨", isCorrect: false },
    ],
    explanation: "The sun is renewable — it will keep shining for billions of years! Coal, oil, and gas are fossil fuels that will eventually run out.",
    hint: "Renewable means it doesn't run out. Can we ever use up the sun?",
  },
  {
    pk: "science#year2",
    questionId: "science-year2-004",
    questionText: "Sort these materials as NATURAL or MADE BY HUMANS.",
    ttsText: "Are these materials found in nature or made by people? Sort them into the correct bins.",
    subject: "science",
    yearLevel: "year2",
    difficulty: 4,
    topics: ["materials", "natural vs manufactured", "ac9s2pu01"],
    interactionType: "drag-to-bins",
    interactionData: {
      bins: ["🌿 Natural", "🏭 Made by humans"],
      items: ["🪵 Wood", "🧱 Brick", "🌑 Coal", "🧪 Plastic"],
      correctBins: { "🪵 Wood": "🌿 Natural", "🧱 Brick": "🏭 Made by humans", "🌑 Coal": "🌿 Natural", "🧪 Plastic": "🏭 Made by humans" },
      keyboardAlternative: "Tab to an item, press N for Natural or H for Human-made.",
      ariaLabel: "Sort each material into natural or made by humans.",
    },
    answerOptions: [
      { id: "a", text: "Natural: wood, coal; Human-made: brick, plastic", isCorrect: true },
      { id: "b", text: "Natural: brick, plastic; Human-made: wood, coal", isCorrect: false },
      { id: "c", text: "All natural", isCorrect: false },
      { id: "d", text: "All human-made", isCorrect: false },
    ],
    explanation: "Wood and coal come from nature. Bricks are made by heating clay, and plastic is made in factories from chemicals.",
    hint: "Can you find wood or coal in nature without any factories?",
  },
  {
    pk: "science#year2",
    questionId: "science-year2-005",
    questionText: "Which body part helps you breathe?",
    ttsText: "Which body part helps you breathe? Tap the correct answer.",
    subject: "science",
    yearLevel: "year2",
    difficulty: 3,
    topics: ["human body", "organs", "ac9s2bu03"],
    interactionType: "hotspot",
    interactionData: {
      imageDescription: "Outline of human body with organs labelled",
      hotspots: [
        { id: "lungs", label: "Lungs", isCorrect: true },
        { id: "heart", label: "Heart", isCorrect: false },
        { id: "stomach", label: "Stomach", isCorrect: false },
        { id: "brain", label: "Brain", isCorrect: false },
      ],
      keyboardAlternative: "Use Tab to move between organs, press Enter to select.",
      ariaLabel: "Tap the body part that helps you breathe.",
    },
    answerOptions: [
      { id: "a", text: "Lungs 🫁", isCorrect: true },
      { id: "b", text: "Heart ❤️", isCorrect: false },
      { id: "c", text: "Stomach 🫃", isCorrect: false },
      { id: "d", text: "Brain 🧠", isCorrect: false },
    ],
    explanation: "The lungs bring oxygen into your body when you breathe in and push out carbon dioxide when you breathe out.",
    hint: "Take a deep breath. Which part of your chest expands?",
  },

  // ==========================================================================
  // SCIENCE — Year 3 (difficulty 4–7)
  // ==========================================================================
  {
    pk: "science#year3",
    questionId: "science-year3-001",
    questionText: "What is the role of a PRODUCER in a food chain?",
    ttsText: "In a food chain, what is the role of a producer? Tap the best answer.",
    subject: "science",
    yearLevel: "year3",
    difficulty: 5,
    topics: ["food chains", "ecosystems", "ac9s3bu01"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the role of a producer in a food chain.",
    },
    answerOptions: [
      { id: "a", text: "Makes food using sunlight (plants)", isCorrect: true },
      { id: "b", text: "Eats other animals for energy", isCorrect: false },
      { id: "c", text: "Breaks down dead matter", isCorrect: false },
      { id: "d", text: "Hunts prey for food", isCorrect: false },
    ],
    explanation: "Producers (usually plants) make their own food using sunlight through photosynthesis. They are always at the base of a food chain.",
    hint: "The word 'produce' means to make. Who makes the food?",
  },
  {
    pk: "science#year3",
    questionId: "science-year3-002",
    questionText: "What type of rock is formed from cooled lava?",
    ttsText: "When lava from a volcano cools down, it forms which type of rock?",
    subject: "science",
    yearLevel: "year3",
    difficulty: 6,
    topics: ["rocks", "Earth science", "ac9s3es01"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the type of rock formed from cooled lava.",
    },
    answerOptions: [
      { id: "a", text: "Igneous rock 🌋", isCorrect: true },
      { id: "b", text: "Sedimentary rock 🏔️", isCorrect: false },
      { id: "c", text: "Metamorphic rock 💎", isCorrect: false },
      { id: "d", text: "Limestone", isCorrect: false },
    ],
    explanation: "Igneous rocks form when magma (lava) cools and hardens. Sedimentary rocks form from layers of sediment; metamorphic rocks form under heat and pressure.",
    hint: "'Igneous' comes from the Latin word for fire. Think: fire → volcano → lava.",
  },
  {
    pk: "science#year3",
    questionId: "science-year3-003",
    questionText: "Put the water cycle steps in the correct order.",
    ttsText: "Arrange the steps of the water cycle in the correct order.",
    subject: "science",
    yearLevel: "year3",
    difficulty: 6,
    topics: ["water cycle", "Earth science", "ac9s3es02"],
    interactionType: "order-events",
    interactionData: {
      events: [
        "💧 Precipitation (rain falls)",
        "☁️ Condensation (water vapour forms clouds)",
        "🌊 Collection (water gathers in lakes/rivers)",
        "♨️ Evaporation (water heats up and rises as vapour)",
      ],
      correctOrder: [
        "🌊 Collection (water gathers in lakes/rivers)",
        "♨️ Evaporation (water heats up and rises as vapour)",
        "☁️ Condensation (water vapour forms clouds)",
        "💧 Precipitation (rain falls)",
      ],
      keyboardAlternative: "Tab to a step card, use arrow keys to reorder.",
      ariaLabel: "Order the four stages of the water cycle correctly.",
    },
    answerOptions: [
      { id: "a", text: "Collection → Evaporation → Condensation → Precipitation", isCorrect: true },
      { id: "b", text: "Precipitation → Collection → Evaporation → Condensation", isCorrect: false },
      { id: "c", text: "Condensation → Precipitation → Collection → Evaporation", isCorrect: false },
      { id: "d", text: "Evaporation → Collection → Precipitation → Condensation", isCorrect: false },
    ],
    explanation: "Water collects, evaporates into the atmosphere, condenses into clouds, then falls as precipitation — and the cycle continues.",
    hint: "Start with water on the ground. What happens when the sun heats it?",
  },
  {
    pk: "science#year3",
    questionId: "science-year3-004",
    questionText: "Which adaptation helps a cactus survive in the desert?",
    ttsText: "Cacti live in deserts. Which feature helps a cactus survive with very little water?",
    subject: "science",
    yearLevel: "year3",
    difficulty: 6,
    topics: ["adaptations", "biology", "ac9s3bu01"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the adaptation that helps a cactus survive in the desert.",
    },
    answerOptions: [
      { id: "a", text: "Thick stem to store water 🌵", isCorrect: true },
      { id: "b", text: "Large leaves to catch rain 🍃", isCorrect: false },
      { id: "c", text: "Deep roots to find underground rivers 🌊", isCorrect: false },
      { id: "d", text: "Bright flowers to attract rain clouds 🌸", isCorrect: false },
    ],
    explanation: "Cacti have thick, waxy stems that store water for long dry periods. They also have spines instead of leaves to reduce water loss.",
    hint: "The desert has very little water. How might a plant store the little water it gets?",
  },
  {
    pk: "science#year3",
    questionId: "science-year3-005",
    questionText: "Which of these is a source of LIGHT energy?",
    ttsText: "Which one is a source of light energy? Tap the correct answer.",
    subject: "science",
    yearLevel: "year3",
    difficulty: 5,
    topics: ["energy", "light", "ac9s3pu01"],
    interactionType: "tap-card",
    interactionData: {
      keyboardAlternative: "Use arrow keys, press Enter to select.",
      ariaLabel: "Select the source of light energy from the options.",
    },
    answerOptions: [
      { id: "a", text: "The Sun ☀️", isCorrect: true },
      { id: "b", text: "A rock 🪨", isCorrect: false },
      { id: "c", text: "Water 💧", isCorrect: false },
      { id: "d", text: "Soil 🌱", isCorrect: false },
    ],
    explanation: "The Sun is Earth's primary source of light energy. It also provides heat. Rocks, water, and soil do not produce light on their own.",
    hint: "What do we need to see during the day when there are no artificial lights?",
  },
];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type ValidationResult = { valid: boolean; errors: string[] };

function validateQuestion(q: RawQuestion): ValidationResult {
  const errors: string[] = [];

  // PK format: subject#ageGroup
  const validAgeGroups = ["foundation", "year1", "year2", "year3", "year4", "year5", "year6", "year7", "year8"];
  const validSubjects = ["maths", "english", "science"];
  const [subject, ageGroup] = q.pk.split("#");
  if (!validSubjects.includes(subject)) errors.push(`Invalid subject in pk: ${subject}`);
  if (!validAgeGroups.includes(ageGroup)) errors.push(`Invalid ageGroup in pk: ${ageGroup}`);

  // questionId must be non-empty
  if (!q.questionId || q.questionId.trim() === "") errors.push("questionId is empty");

  // questionText must be non-empty
  if (!q.questionText || q.questionText.trim() === "") errors.push("questionText is empty");

  // ttsText must be non-empty
  if (!q.ttsText || q.ttsText.trim() === "") errors.push("ttsText is empty");

  // difficulty 1-10
  if (q.difficulty < 1 || q.difficulty > 10) errors.push(`difficulty out of range: ${q.difficulty}`);

  // topics array non-empty
  if (!q.topics || q.topics.length === 0) errors.push("topics is empty");

  // answerOptions: must have 2-6 options
  if (!q.answerOptions || q.answerOptions.length < 2) errors.push("need at least 2 answerOptions");
  if (q.answerOptions && q.answerOptions.length > 6) errors.push("too many answerOptions (max 6)");

  // exactly 1 correct answer
  const correctCount = q.answerOptions?.filter((o) => o.isCorrect).length ?? 0;
  if (correctCount !== 1) errors.push(`expected exactly 1 correct answer, found ${correctCount}`);

  // all option IDs unique
  const ids = q.answerOptions?.map((o) => o.id) ?? [];
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) errors.push("duplicate option IDs");

  // subject consistency
  if (q.subject !== subject) errors.push(`subject field '${q.subject}' doesn't match pk subject '${subject}'`);

  // yearLevel consistent with ageGroup
  if (q.yearLevel !== ageGroup) errors.push(`yearLevel '${q.yearLevel}' doesn't match pk ageGroup '${ageGroup}'`);

  // explanation non-empty
  if (!q.explanation || q.explanation.trim() === "") errors.push("explanation is empty");

  // interactionData must have keyboardAlternative and ariaLabel
  if (!q.interactionData?.keyboardAlternative) errors.push("interactionData.keyboardAlternative is missing");
  if (!q.interactionData?.ariaLabel) errors.push("interactionData.ariaLabel is missing");

  return { valid: errors.length === 0, errors };
}

function runValidation(): boolean {
  console.log(`\nValidating ${QUESTIONS.length} questions...\n`);
  let allValid = true;
  const pkCounts: Record<string, number> = {};
  const questionIds = new Set<string>();

  for (const q of QUESTIONS) {
    // Duplicate questionId check
    if (questionIds.has(q.questionId)) {
      console.error(`❌ DUPLICATE questionId: ${q.questionId}`);
      allValid = false;
    }
    questionIds.add(q.questionId);

    // Track distribution
    pkCounts[q.pk] = (pkCounts[q.pk] ?? 0) + 1;

    const { valid, errors } = validateQuestion(q);
    if (!valid) {
      console.error(`❌ ${q.questionId}:`);
      for (const err of errors) console.error(`   - ${err}`);
      allValid = false;
    } else {
      console.log(`✓  ${q.questionId}`);
    }
  }

  console.log("\n--- Distribution by PK ---");
  for (const [pk, count] of Object.entries(pkCounts).sort()) {
    console.log(`  ${pk}: ${count} question${count !== 1 ? "s" : ""}`);
  }

  console.log(`\n--- Total: ${QUESTIONS.length} questions ---`);
  return allValid;
}

// ---------------------------------------------------------------------------
// DynamoDB batch write (max 25 per request)
// ---------------------------------------------------------------------------

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function seedQuestions() {
  const timestamp = new Date().toISOString();

  const items = QUESTIONS.map((q) => ({
    pk: q.pk,
    questionId: q.questionId,
    questionText: q.questionText,
    ttsText: q.ttsText,
    subject: q.subject,
    yearLevel: q.yearLevel,
    difficulty: q.difficulty,
    topics: q.topics,
    interactionType: q.interactionType,
    interactionData: q.interactionData,
    answerOptions: q.answerOptions,
    explanation: q.explanation,
    hint: q.hint,
    cached: true,
    createdAt: timestamp,
  }));

  const chunks = chunkArray(items, 25);
  console.log(`\nWriting ${items.length} questions in ${chunks.length} batch(es) to table '${TABLE}'...\n`);

  let written = 0;
  for (const [idx, chunk] of chunks.entries()) {
    const requestItems = chunk.map((item) => ({
      PutRequest: { Item: marshall(item, { removeUndefinedValues: true }) },
    }));

    const command = new BatchWriteItemCommand({
      RequestItems: { [TABLE]: requestItems },
    });

    const response = await client.send(command);
    const unprocessed = response.UnprocessedItems?.[TABLE]?.length ?? 0;
    written += chunk.length - unprocessed;

    if (unprocessed > 0) {
      console.warn(`  ⚠️  Batch ${idx + 1}: ${unprocessed} unprocessed items — retry manually`);
    } else {
      console.log(`  ✅ Batch ${idx + 1}/${chunks.length}: wrote ${chunk.length} items`);
    }
  }

  console.log(`\n✅ Done. ${written}/${items.length} questions written to DynamoDB.\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const valid = runValidation();

  if (!valid) {
    console.error("\n❌ Validation failed. Fix errors above before seeding.\n");
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log("\n✅ Dry run complete — validation passed. No data written (DRY_RUN=true).\n");
    return;
  }

  await seedQuestions();
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
