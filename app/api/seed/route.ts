import { NextRequest, NextResponse } from "next/server";
import { putItem, TABLES } from "@/lib/dynamodb";
import { Question } from "@/types";
import { v4 as uuidv4 } from "uuid";

// ============================================================
// PREP (Ages 5-6) — Australian Curriculum Foundation Year
// YEAR 3 (Ages 8-9) — Australian Curriculum Year 3
// Difficulty 1-10 aligned to curriculum progression
// ============================================================

const SEED_QUESTIONS: Omit<Question, "pk" | "createdAt">[] = [

  // =============================================
  // PREP MATHS — COUNTING (difficulty 1-2)
  // =============================================
  {
    questionId: uuidv4(), questionText: "How many cats? 🐱🐱🐱",
    answerOptions: [
      { id: "a", text: "2", emoji: "2️⃣", isCorrect: false },
      { id: "b", text: "3", emoji: "3️⃣", isCorrect: true },
      { id: "c", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "d", text: "1", emoji: "1️⃣", isCorrect: false },
    ],
    difficulty: 1, topics: ["counting"], explanation: "Count 1, 2, 3 — there are 3 cats!", subject: "maths", yearLevel: "prep", hint: "Point to each cat and count",
  },
  {
    questionId: uuidv4(), questionText: "Count the stars: ⭐⭐",
    answerOptions: [
      { id: "a", text: "1", emoji: "1️⃣", isCorrect: false },
      { id: "b", text: "2", emoji: "2️⃣", isCorrect: true },
      { id: "c", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "d", text: "4", emoji: "4️⃣", isCorrect: false },
    ],
    difficulty: 1, topics: ["counting"], explanation: "1, 2 — there are 2 stars!", subject: "maths", yearLevel: "prep", hint: "Count each star",
  },
  {
    questionId: uuidv4(), questionText: "Which number is 5?",
    answerOptions: [
      { id: "a", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "b", text: "5", emoji: "5️⃣", isCorrect: true },
      { id: "c", text: "7", emoji: "7️⃣", isCorrect: false },
      { id: "d", text: "9", emoji: "9️⃣", isCorrect: false },
    ],
    difficulty: 1, topics: ["counting"], explanation: "This is the number 5 — five fingers on one hand!", subject: "maths", yearLevel: "prep", hint: "Count five fingers",
  },
  {
    questionId: uuidv4(), questionText: "Count the apples: 🍎🍎🍎🍎",
    answerOptions: [
      { id: "a", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "b", text: "4", emoji: "4️⃣", isCorrect: true },
      { id: "c", text: "5", emoji: "5️⃣", isCorrect: false },
      { id: "d", text: "6", emoji: "6️⃣", isCorrect: false },
    ],
    difficulty: 1, topics: ["counting"], explanation: "Count each apple: 1, 2, 3, 4!", subject: "maths", yearLevel: "prep", hint: "Touch each apple while counting",
  },
  {
    questionId: uuidv4(), questionText: "What number comes after 3?",
    answerOptions: [
      { id: "a", text: "2", emoji: "2️⃣", isCorrect: false },
      { id: "b", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "c", text: "4", emoji: "4️⃣", isCorrect: true },
      { id: "d", text: "5", emoji: "5️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["counting"], explanation: "1, 2, 3... 4 comes next!", subject: "maths", yearLevel: "prep", hint: "Count on from 3",
  },
  {
    questionId: uuidv4(), questionText: "What number comes before 7?",
    answerOptions: [
      { id: "a", text: "5", emoji: "5️⃣", isCorrect: false },
      { id: "b", text: "6", emoji: "6️⃣", isCorrect: true },
      { id: "c", text: "7", emoji: "7️⃣", isCorrect: false },
      { id: "d", text: "8", emoji: "8️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["counting"], explanation: "5, 6, 7 — 6 comes before 7!", subject: "maths", yearLevel: "prep", hint: "Count backwards from 7",
  },
  {
    questionId: uuidv4(), questionText: "How many fingers on one hand?",
    answerOptions: [
      { id: "a", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "b", text: "5", emoji: "5️⃣", isCorrect: true },
      { id: "c", text: "6", emoji: "6️⃣", isCorrect: false },
      { id: "d", text: "10", emoji: "🔟", isCorrect: false },
    ],
    difficulty: 1, topics: ["counting"], explanation: "We have 5 fingers on one hand!", subject: "maths", yearLevel: "prep", hint: "Hold up one hand and count",
  },
  {
    questionId: uuidv4(), questionText: "Count the balls: 🏀🏀🏀🏀🏀🏀",
    answerOptions: [
      { id: "a", text: "5", emoji: "5️⃣", isCorrect: false },
      { id: "b", text: "6", emoji: "6️⃣", isCorrect: true },
      { id: "c", text: "7", emoji: "7️⃣", isCorrect: false },
      { id: "d", text: "8", emoji: "8️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["counting"], explanation: "1, 2, 3, 4, 5, 6 — six balls!", subject: "maths", yearLevel: "prep", hint: "Count carefully — don't skip any!",
  },
  {
    questionId: uuidv4(), questionText: "Which is the biggest number?",
    answerOptions: [
      { id: "a", text: "2", emoji: "2️⃣", isCorrect: false },
      { id: "b", text: "5", emoji: "5️⃣", isCorrect: false },
      { id: "c", text: "8", emoji: "8️⃣", isCorrect: true },
      { id: "d", text: "3", emoji: "3️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["counting"], explanation: "8 is the biggest! Count up: 2, 3, 5, 8 — we reach 8 last!", subject: "maths", yearLevel: "prep", hint: "Which number is last when you count?",
  },
  {
    questionId: uuidv4(), questionText: "Which is the smallest number?",
    answerOptions: [
      { id: "a", text: "9", emoji: "9️⃣", isCorrect: false },
      { id: "b", text: "7", emoji: "7️⃣", isCorrect: false },
      { id: "c", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "d", text: "1", emoji: "1️⃣", isCorrect: true },
    ],
    difficulty: 2, topics: ["counting"], explanation: "1 is the smallest! It comes first when we count.", subject: "maths", yearLevel: "prep", hint: "Which number do you say first when counting?",
  },

  // =============================================
  // PREP MATHS — ADDITION (difficulty 2-4)
  // =============================================
  {
    questionId: uuidv4(), questionText: "1 + 1 = ?",
    answerOptions: [
      { id: "a", text: "1", emoji: "1️⃣", isCorrect: false },
      { id: "b", text: "2", emoji: "2️⃣", isCorrect: true },
      { id: "c", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "d", text: "0", emoji: "0️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["addition"], explanation: "1 + 1 = 2. Hold up 1 finger, then 1 more = 2 fingers!", subject: "maths", yearLevel: "prep", hint: "Hold up 1 finger on each hand",
  },
  {
    questionId: uuidv4(), questionText: "2 + 1 = ?",
    answerOptions: [
      { id: "a", text: "2", emoji: "2️⃣", isCorrect: false },
      { id: "b", text: "3", emoji: "3️⃣", isCorrect: true },
      { id: "c", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "d", text: "1", emoji: "1️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["addition"], explanation: "2 + 1 = 3. Start at 2, count 1 more: 3!", subject: "maths", yearLevel: "prep", hint: "Start with 2, add 1 more",
  },
  {
    questionId: uuidv4(), questionText: "3 + 2 = ?",
    answerOptions: [
      { id: "a", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "b", text: "5", emoji: "5️⃣", isCorrect: true },
      { id: "c", text: "6", emoji: "6️⃣", isCorrect: false },
      { id: "d", text: "3", emoji: "3️⃣", isCorrect: false },
    ],
    difficulty: 3, topics: ["addition"], explanation: "3 + 2 = 5. Start at 3, count 2 more: 4, 5!", subject: "maths", yearLevel: "prep", hint: "Count on from 3",
  },
  {
    questionId: uuidv4(), questionText: "🍎🍎 + 🍎🍎🍎 = ?",
    answerOptions: [
      { id: "a", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "b", text: "5", emoji: "5️⃣", isCorrect: true },
      { id: "c", text: "6", emoji: "6️⃣", isCorrect: false },
      { id: "d", text: "7", emoji: "7️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["addition"], explanation: "2 apples and 3 apples = 5 apples altogether!", subject: "maths", yearLevel: "prep", hint: "Count all the apples together",
  },
  {
    questionId: uuidv4(), questionText: "4 + 1 = ?",
    answerOptions: [
      { id: "a", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "b", text: "5", emoji: "5️⃣", isCorrect: true },
      { id: "c", text: "6", emoji: "6️⃣", isCorrect: false },
      { id: "d", text: "3", emoji: "3️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["addition"], explanation: "4 + 1 = 5. One more than 4 is 5!", subject: "maths", yearLevel: "prep", hint: "4 plus one more is...?",
  },
  {
    questionId: uuidv4(), questionText: "5 + 2 = ?",
    answerOptions: [
      { id: "a", text: "6", emoji: "6️⃣", isCorrect: false },
      { id: "b", text: "7", emoji: "7️⃣", isCorrect: true },
      { id: "c", text: "8", emoji: "8️⃣", isCorrect: false },
      { id: "d", text: "5", emoji: "5️⃣", isCorrect: false },
    ],
    difficulty: 3, topics: ["addition"], explanation: "5 + 2 = 7. Count on from 5: 6, 7!", subject: "maths", yearLevel: "prep", hint: "Count on 2 from 5",
  },
  {
    questionId: uuidv4(), questionText: "There are 3 dogs 🐶🐶🐶 and 3 more join. How many dogs now?",
    answerOptions: [
      { id: "a", text: "5", emoji: "5️⃣", isCorrect: false },
      { id: "b", text: "6", emoji: "6️⃣", isCorrect: true },
      { id: "c", text: "7", emoji: "7️⃣", isCorrect: false },
      { id: "d", text: "3", emoji: "3️⃣", isCorrect: false },
    ],
    difficulty: 3, topics: ["addition"], explanation: "3 + 3 = 6. Double 3 is 6!", subject: "maths", yearLevel: "prep", hint: "3 + 3 = double 3",
  },
  {
    questionId: uuidv4(), questionText: "0 + 4 = ?",
    answerOptions: [
      { id: "a", text: "0", emoji: "0️⃣", isCorrect: false },
      { id: "b", text: "4", emoji: "4️⃣", isCorrect: true },
      { id: "c", text: "5", emoji: "5️⃣", isCorrect: false },
      { id: "d", text: "3", emoji: "3️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["addition"], explanation: "0 + 4 = 4. Adding nothing doesn't change the number!", subject: "maths", yearLevel: "prep", hint: "Zero means nothing extra",
  },
  {
    questionId: uuidv4(), questionText: "4 + 4 = ?",
    answerOptions: [
      { id: "a", text: "6", emoji: "6️⃣", isCorrect: false },
      { id: "b", text: "7", emoji: "7️⃣", isCorrect: false },
      { id: "c", text: "8", emoji: "8️⃣", isCorrect: true },
      { id: "d", text: "9", emoji: "9️⃣", isCorrect: false },
    ],
    difficulty: 4, topics: ["addition"], explanation: "4 + 4 = 8. Double 4 makes 8!", subject: "maths", yearLevel: "prep", hint: "Count 4 fingers on each hand",
  },
  {
    questionId: uuidv4(), questionText: "6 + 3 = ?",
    answerOptions: [
      { id: "a", text: "8", emoji: "8️⃣", isCorrect: false },
      { id: "b", text: "9", emoji: "9️⃣", isCorrect: true },
      { id: "c", text: "10", emoji: "🔟", isCorrect: false },
      { id: "d", text: "7", emoji: "7️⃣", isCorrect: false },
    ],
    difficulty: 4, topics: ["addition"], explanation: "6 + 3 = 9. From 6, count on 3 more: 7, 8, 9!", subject: "maths", yearLevel: "prep", hint: "Count on 3 from 6",
  },

  // =============================================
  // PREP MATHS — SUBTRACTION (difficulty 3-5)
  // =============================================
  {
    questionId: uuidv4(), questionText: "3 - 1 = ?",
    answerOptions: [
      { id: "a", text: "1", emoji: "1️⃣", isCorrect: false },
      { id: "b", text: "2", emoji: "2️⃣", isCorrect: true },
      { id: "c", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "d", text: "4", emoji: "4️⃣", isCorrect: false },
    ],
    difficulty: 3, topics: ["subtraction"], explanation: "3 - 1 = 2. Take away 1 from 3 — 2 are left!", subject: "maths", yearLevel: "prep", hint: "Hold up 3 fingers and put 1 down",
  },
  {
    questionId: uuidv4(), questionText: "5 - 2 = ?",
    answerOptions: [
      { id: "a", text: "2", emoji: "2️⃣", isCorrect: false },
      { id: "b", text: "3", emoji: "3️⃣", isCorrect: true },
      { id: "c", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "d", text: "7", emoji: "7️⃣", isCorrect: false },
    ],
    difficulty: 3, topics: ["subtraction"], explanation: "5 - 2 = 3. Start at 5, count back 2: 4, 3!", subject: "maths", yearLevel: "prep", hint: "Count backwards from 5",
  },
  {
    questionId: uuidv4(), questionText: "You have 4 🍪 and eat 2. How many left?",
    answerOptions: [
      { id: "a", text: "1", emoji: "1️⃣", isCorrect: false },
      { id: "b", text: "2", emoji: "2️⃣", isCorrect: true },
      { id: "c", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "d", text: "6", emoji: "6️⃣", isCorrect: false },
    ],
    difficulty: 3, topics: ["subtraction"], explanation: "4 - 2 = 2. Cross out 2 cookies — 2 remain!", subject: "maths", yearLevel: "prep", hint: "Take 2 away from 4",
  },
  {
    questionId: uuidv4(), questionText: "6 - 3 = ?",
    answerOptions: [
      { id: "a", text: "2", emoji: "2️⃣", isCorrect: false },
      { id: "b", text: "3", emoji: "3️⃣", isCorrect: true },
      { id: "c", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "d", text: "9", emoji: "9️⃣", isCorrect: false },
    ],
    difficulty: 4, topics: ["subtraction"], explanation: "6 - 3 = 3. Half of 6 is 3!", subject: "maths", yearLevel: "prep", hint: "Count back 3 from 6",
  },
  {
    questionId: uuidv4(), questionText: "8 - 5 = ?",
    answerOptions: [
      { id: "a", text: "2", emoji: "2️⃣", isCorrect: false },
      { id: "b", text: "3", emoji: "3️⃣", isCorrect: true },
      { id: "c", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "d", text: "13", emoji: "1️⃣3️⃣", isCorrect: false },
    ],
    difficulty: 4, topics: ["subtraction"], explanation: "8 - 5 = 3. Count back 5 from 8: 7, 6, 5, 4, 3!", subject: "maths", yearLevel: "prep", hint: "Count back 5 steps from 8",
  },

  // =============================================
  // PREP MATHS — SHAPES (difficulty 1-3)
  // =============================================
  {
    questionId: uuidv4(), questionText: "What shape is a ball? ⚽",
    answerOptions: [
      { id: "a", text: "Square ⬜", emoji: "⬜", isCorrect: false },
      { id: "b", text: "Circle ⭕", emoji: "⭕", isCorrect: true },
      { id: "c", text: "Triangle 🔺", emoji: "🔺", isCorrect: false },
      { id: "d", text: "Rectangle 📱", emoji: "📱", isCorrect: false },
    ],
    difficulty: 1, topics: ["shapes"], explanation: "A ball is a circle — round with no corners!", subject: "maths", yearLevel: "prep", hint: "Think of how round a ball is",
  },
  {
    questionId: uuidv4(), questionText: "How many sides does a triangle have?",
    answerOptions: [
      { id: "a", text: "2", emoji: "2️⃣", isCorrect: false },
      { id: "b", text: "3", emoji: "3️⃣", isCorrect: true },
      { id: "c", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "d", text: "5", emoji: "5️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["shapes"], explanation: "A triangle has 3 sides. TRI means three!", subject: "maths", yearLevel: "prep", hint: "TRI in triangle means 3",
  },
  {
    questionId: uuidv4(), questionText: "How many corners does a square have?",
    answerOptions: [
      { id: "a", text: "2", emoji: "2️⃣", isCorrect: false },
      { id: "b", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "c", text: "4", emoji: "4️⃣", isCorrect: true },
      { id: "d", text: "0", emoji: "0️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["shapes"], explanation: "A square has 4 corners, one at each point!", subject: "maths", yearLevel: "prep", hint: "Count the pointy corners of a square",
  },
  {
    questionId: uuidv4(), questionText: "Which shape has no corners?",
    answerOptions: [
      { id: "a", text: "Square ⬜", emoji: "⬜", isCorrect: false },
      { id: "b", text: "Triangle 🔺", emoji: "🔺", isCorrect: false },
      { id: "c", text: "Circle ⭕", emoji: "⭕", isCorrect: true },
      { id: "d", text: "Rectangle 📱", emoji: "📱", isCorrect: false },
    ],
    difficulty: 2, topics: ["shapes"], explanation: "A circle is round — it has no corners at all!", subject: "maths", yearLevel: "prep", hint: "Which shape is perfectly round?",
  },
  {
    questionId: uuidv4(), questionText: "What shape is a door?",
    answerOptions: [
      { id: "a", text: "Circle ⭕", emoji: "⭕", isCorrect: false },
      { id: "b", text: "Triangle 🔺", emoji: "🔺", isCorrect: false },
      { id: "c", text: "Rectangle 🚪", emoji: "🚪", isCorrect: true },
      { id: "d", text: "Star ⭐", emoji: "⭐", isCorrect: false },
    ],
    difficulty: 2, topics: ["shapes"], explanation: "A door is a rectangle — tall, with 4 sides but 2 longer sides!", subject: "maths", yearLevel: "prep", hint: "A door is tall and has 4 sides",
  },
  {
    questionId: uuidv4(), questionText: "How many sides does a rectangle have?",
    answerOptions: [
      { id: "a", text: "2", emoji: "2️⃣", isCorrect: false },
      { id: "b", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "c", text: "4", emoji: "4️⃣", isCorrect: true },
      { id: "d", text: "6", emoji: "6️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["shapes"], explanation: "A rectangle has 4 sides — 2 long and 2 short!", subject: "maths", yearLevel: "prep", hint: "Count the sides of a rectangle",
  },

  // =============================================
  // PREP MATHS — PATTERNS (difficulty 2-4)
  // =============================================
  {
    questionId: uuidv4(), questionText: "What comes next? 🔴🔵🔴🔵🔴___",
    answerOptions: [
      { id: "a", text: "🔴 Red", emoji: "🔴", isCorrect: false },
      { id: "b", text: "🔵 Blue", emoji: "🔵", isCorrect: true },
      { id: "c", text: "🟡 Yellow", emoji: "🟡", isCorrect: false },
      { id: "d", text: "🟢 Green", emoji: "🟢", isCorrect: false },
    ],
    difficulty: 2, topics: ["patterns"], explanation: "Red, Blue, Red, Blue pattern — next is Blue!", subject: "maths", yearLevel: "prep", hint: "Say the pattern out loud",
  },
  {
    questionId: uuidv4(), questionText: "What comes next? ⭐🌙⭐🌙⭐___",
    answerOptions: [
      { id: "a", text: "⭐ Star", emoji: "⭐", isCorrect: false },
      { id: "b", text: "🌙 Moon", emoji: "🌙", isCorrect: true },
      { id: "c", text: "☀️ Sun", emoji: "☀️", isCorrect: false },
      { id: "d", text: "🌟 Glow", emoji: "🌟", isCorrect: false },
    ],
    difficulty: 2, topics: ["patterns"], explanation: "Star-Moon pattern keeps repeating — next is Moon!", subject: "maths", yearLevel: "prep", hint: "Find the part that repeats",
  },
  {
    questionId: uuidv4(), questionText: "What comes next? 🐱🐶🐱🐶___",
    answerOptions: [
      { id: "a", text: "🐶 Dog", emoji: "🐶", isCorrect: false },
      { id: "b", text: "🐱 Cat", emoji: "🐱", isCorrect: true },
      { id: "c", text: "🐠 Fish", emoji: "🐠", isCorrect: false },
      { id: "d", text: "🐰 Bunny", emoji: "🐰", isCorrect: false },
    ],
    difficulty: 2, topics: ["patterns"], explanation: "Cat-Dog repeats — next is Cat!", subject: "maths", yearLevel: "prep", hint: "Cat, Dog, Cat, Dog... what's next?",
  },
  {
    questionId: uuidv4(), questionText: "What comes next? 1️⃣ 2️⃣ 3️⃣ 1️⃣ 2️⃣ ___",
    answerOptions: [
      { id: "a", text: "1", emoji: "1️⃣", isCorrect: false },
      { id: "b", text: "2", emoji: "2️⃣", isCorrect: false },
      { id: "c", text: "3", emoji: "3️⃣", isCorrect: true },
      { id: "d", text: "4", emoji: "4️⃣", isCorrect: false },
    ],
    difficulty: 3, topics: ["patterns"], explanation: "1, 2, 3 repeating — after 1, 2 comes 3!", subject: "maths", yearLevel: "prep", hint: "The pattern is 1-2-3, 1-2-...",
  },

  // =============================================
  // PREP ENGLISH — PHONICS (difficulty 1-3)
  // =============================================
  {
    questionId: uuidv4(), questionText: "What sound does 🍎 Apple start with?",
    answerOptions: [
      { id: "a", text: "B sound (buh)", emoji: "🐝", isCorrect: false },
      { id: "b", text: "A sound (ah)", emoji: "🍎", isCorrect: true },
      { id: "c", text: "C sound (kuh)", emoji: "🐱", isCorrect: false },
      { id: "d", text: "D sound (duh)", emoji: "🦆", isCorrect: false },
    ],
    difficulty: 1, topics: ["phonics"], explanation: "Apple starts with A! A makes the 'aah' sound!", subject: "english", yearLevel: "prep", hint: "Say Apple slowly — AH-pple",
  },
  {
    questionId: uuidv4(), questionText: "Which word starts with 'S'?",
    answerOptions: [
      { id: "a", text: "Dog 🐶", emoji: "🐶", isCorrect: false },
      { id: "b", text: "Cat 🐱", emoji: "🐱", isCorrect: false },
      { id: "c", text: "Sun ☀️", emoji: "☀️", isCorrect: true },
      { id: "d", text: "Ball ⚽", emoji: "⚽", isCorrect: false },
    ],
    difficulty: 1, topics: ["phonics"], explanation: "Sun starts with S! S goes 'sss' like a snake!", subject: "english", yearLevel: "prep", hint: "S sounds like 'sss'",
  },
  {
    questionId: uuidv4(), questionText: "What letter does 🐶 Dog start with?",
    answerOptions: [
      { id: "a", text: "B", emoji: "🔤", isCorrect: false },
      { id: "b", text: "C", emoji: "🔤", isCorrect: false },
      { id: "c", text: "D", emoji: "🔤", isCorrect: true },
      { id: "d", text: "E", emoji: "🔤", isCorrect: false },
    ],
    difficulty: 1, topics: ["phonics", "letter-recognition"], explanation: "Dog starts with D! D makes a 'duh' sound!", subject: "english", yearLevel: "prep", hint: "Say Dog — Ddd-og",
  },
  {
    questionId: uuidv4(), questionText: "Which picture rhymes with 'hat' 🎩?",
    answerOptions: [
      { id: "a", text: "Dog 🐶", emoji: "🐶", isCorrect: false },
      { id: "b", text: "Cat 🐱", emoji: "🐱", isCorrect: true },
      { id: "c", text: "Sun ☀️", emoji: "☀️", isCorrect: false },
      { id: "d", text: "Ball ⚽", emoji: "⚽", isCorrect: false },
    ],
    difficulty: 2, topics: ["phonics"], explanation: "Hat and Cat both end with '-at'! They rhyme!", subject: "english", yearLevel: "prep", hint: "Which word ends the same way as hat?",
  },
  {
    questionId: uuidv4(), questionText: "Which word rhymes with 'big'?",
    answerOptions: [
      { id: "a", text: "Cat 🐱", emoji: "🐱", isCorrect: false },
      { id: "b", text: "Dog 🐶", emoji: "🐶", isCorrect: false },
      { id: "c", text: "Pig 🐷", emoji: "🐷", isCorrect: true },
      { id: "d", text: "Sun ☀️", emoji: "☀️", isCorrect: false },
    ],
    difficulty: 2, topics: ["phonics"], explanation: "Big and Pig both end with '-ig'. They rhyme!", subject: "english", yearLevel: "prep", hint: "Which ends with 'ig' like big?",
  },
  {
    questionId: uuidv4(), questionText: "What letter does 🌈 Rainbow start with?",
    answerOptions: [
      { id: "a", text: "P", emoji: "🔤", isCorrect: false },
      { id: "b", text: "Q", emoji: "🔤", isCorrect: false },
      { id: "c", text: "R", emoji: "🔤", isCorrect: true },
      { id: "d", text: "S", emoji: "🔤", isCorrect: false },
    ],
    difficulty: 1, topics: ["phonics", "letter-recognition"], explanation: "Rainbow starts with R! R makes a 'rrr' sound!", subject: "english", yearLevel: "prep", hint: "Say Rainbow — RRR-ainbow",
  },
  {
    questionId: uuidv4(), questionText: "Which word has the short 'a' sound like in 'cat'?",
    answerOptions: [
      { id: "a", text: "Moon 🌙", emoji: "🌙", isCorrect: false },
      { id: "b", text: "Mat 🟫", emoji: "🟫", isCorrect: true },
      { id: "c", text: "Bee 🐝", emoji: "🐝", isCorrect: false },
      { id: "d", text: "Boat ⛵", emoji: "⛵", isCorrect: false },
    ],
    difficulty: 2, topics: ["phonics"], explanation: "Mat has the short 'a' sound: m-AAA-t, just like c-AAA-t!", subject: "english", yearLevel: "prep", hint: "Which has the same middle sound as cat?",
  },
  {
    questionId: uuidv4(), questionText: "Which word starts with the same sound as 🌟 Star?",
    answerOptions: [
      { id: "a", text: "Dog 🐶", emoji: "🐶", isCorrect: false },
      { id: "b", text: "Snake 🐍", emoji: "🐍", isCorrect: true },
      { id: "c", text: "Apple 🍎", emoji: "🍎", isCorrect: false },
      { id: "d", text: "Pig 🐷", emoji: "🐷", isCorrect: false },
    ],
    difficulty: 2, topics: ["phonics"], explanation: "Star and Snake both start with the 'S' sound!", subject: "english", yearLevel: "prep", hint: "Star starts with 'sss'",
  },

  // =============================================
  // PREP ENGLISH — SIGHT WORDS (difficulty 2-4)
  // =============================================
  {
    questionId: uuidv4(), questionText: "Which is the word 'cat'?",
    answerOptions: [
      { id: "a", text: "cta", emoji: "❌", isCorrect: false },
      { id: "b", text: "cat", emoji: "🐱", isCorrect: true },
      { id: "c", text: "tac", emoji: "❌", isCorrect: false },
      { id: "d", text: "act", emoji: "❌", isCorrect: false },
    ],
    difficulty: 2, topics: ["sight-words"], explanation: "C-A-T spells cat! c...a...t", subject: "english", yearLevel: "prep", hint: "C-A-T",
  },
  {
    questionId: uuidv4(), questionText: "Which word means the same as 'happy'?",
    answerOptions: [
      { id: "a", text: "Sad 😢", emoji: "😢", isCorrect: false },
      { id: "b", text: "Glad 😊", emoji: "😊", isCorrect: true },
      { id: "c", text: "Mad 😠", emoji: "😠", isCorrect: false },
      { id: "d", text: "Tired 😴", emoji: "😴", isCorrect: false },
    ],
    difficulty: 3, topics: ["sight-words", "vocabulary"], explanation: "Happy and Glad mean the same thing — both mean you feel good!", subject: "english", yearLevel: "prep", hint: "Which feeling is like being happy?",
  },
  {
    questionId: uuidv4(), questionText: "Choose the correct sentence:",
    answerOptions: [
      { id: "a", text: "the cat is big", emoji: "❌", isCorrect: false },
      { id: "b", text: "The cat is big.", emoji: "✅", isCorrect: true },
      { id: "c", text: "The Cat is big.", emoji: "❌", isCorrect: false },
      { id: "d", text: "the Cat is Big.", emoji: "❌", isCorrect: false },
    ],
    difficulty: 3, topics: ["sight-words", "phonics"], explanation: "Sentences start with a capital letter and end with a full stop!", subject: "english", yearLevel: "prep", hint: "A sentence starts with a BIG letter",
  },
  {
    questionId: uuidv4(), questionText: "Which word is opposite of 'big'?",
    answerOptions: [
      { id: "a", text: "Huge 🐘", emoji: "🐘", isCorrect: false },
      { id: "b", text: "Tall 🦒", emoji: "🦒", isCorrect: false },
      { id: "c", text: "Small 🐭", emoji: "🐭", isCorrect: true },
      { id: "d", text: "Wide ↔️", emoji: "↔️", isCorrect: false },
    ],
    difficulty: 3, topics: ["sight-words", "vocabulary"], explanation: "Big and Small are opposites! A mouse is small, an elephant is big.", subject: "english", yearLevel: "prep", hint: "What is the opposite of big?",
  },
  {
    questionId: uuidv4(), questionText: "Which word is a colour?",
    answerOptions: [
      { id: "a", text: "Jump 🏃", emoji: "🏃", isCorrect: false },
      { id: "b", text: "Blue 💙", emoji: "💙", isCorrect: true },
      { id: "c", text: "Run 🏃", emoji: "🏃", isCorrect: false },
      { id: "d", text: "Sit 🪑", emoji: "🪑", isCorrect: false },
    ],
    difficulty: 2, topics: ["vocabulary"], explanation: "Blue is a colour! We can see blue in the sky and ocean!", subject: "english", yearLevel: "prep", hint: "Which is a describing word for what things look like?",
  },

  // =============================================
  // YEAR 3 MATHS — ADDITION (difficulty 4-6)
  // =============================================
  {
    questionId: uuidv4(), questionText: "What is 35 + 48?",
    answerOptions: [
      { id: "a", text: "73", emoji: "7️⃣3️⃣", isCorrect: false },
      { id: "b", text: "83", emoji: "8️⃣3️⃣", isCorrect: true },
      { id: "c", text: "73", emoji: "7️⃣4️⃣", isCorrect: false },
      { id: "d", text: "90", emoji: "9️⃣0️⃣", isCorrect: false },
    ],
    difficulty: 5, topics: ["addition"], explanation: "35 + 48: 5+8=13, write 3 carry 1. 3+4+1=8. Answer: 83!", subject: "maths", yearLevel: "year3", hint: "Add ones first, then tens with carry",
  },
  {
    questionId: uuidv4(), questionText: "What is 127 + 345?",
    answerOptions: [
      { id: "a", text: "462", emoji: "4️⃣6️⃣2️⃣", isCorrect: false },
      { id: "b", text: "472", emoji: "4️⃣7️⃣2️⃣", isCorrect: true },
      { id: "c", text: "482", emoji: "4️⃣8️⃣2️⃣", isCorrect: false },
      { id: "d", text: "452", emoji: "4️⃣5️⃣2️⃣", isCorrect: false },
    ],
    difficulty: 6, topics: ["addition"], explanation: "127 + 345: 7+5=12 (write 2, carry 1), 2+4+1=7, 1+3=4. Answer: 472!", subject: "maths", yearLevel: "year3", hint: "Column addition: ones, tens, hundreds",
  },
  {
    questionId: uuidv4(), questionText: "Sam has 147 stickers. He gets 68 more. How many total?",
    answerOptions: [
      { id: "a", text: "205", emoji: "2️⃣0️⃣5️⃣", isCorrect: false },
      { id: "b", text: "215", emoji: "2️⃣1️⃣5️⃣", isCorrect: true },
      { id: "c", text: "225", emoji: "2️⃣2️⃣5️⃣", isCorrect: false },
      { id: "d", text: "195", emoji: "1️⃣9️⃣5️⃣", isCorrect: false },
    ],
    difficulty: 5, topics: ["addition"], explanation: "147 + 68 = 215. 7+8=15 (write 5, carry 1), 4+6+1=11 (write 1, carry 1), 1+1=2. Answer: 215!", subject: "maths", yearLevel: "year3", hint: "Add ones, tens, hundreds with carrying",
  },
  {
    questionId: uuidv4(), questionText: "What is 400 + 250 + 30?",
    answerOptions: [
      { id: "a", text: "670", emoji: "6️⃣7️⃣0️⃣", isCorrect: false },
      { id: "b", text: "680", emoji: "6️⃣8️⃣0️⃣", isCorrect: true },
      { id: "c", text: "690", emoji: "6️⃣9️⃣0️⃣", isCorrect: false },
      { id: "d", text: "660", emoji: "6️⃣6️⃣0️⃣", isCorrect: false },
    ],
    difficulty: 4, topics: ["addition"], explanation: "400 + 250 + 30 = 680. Add the hundreds: 400+200=600, then +50+30=680!", subject: "maths", yearLevel: "year3", hint: "Add the hundreds, then the tens",
  },

  // =============================================
  // YEAR 3 MATHS — SUBTRACTION (difficulty 4-6)
  // =============================================
  {
    questionId: uuidv4(), questionText: "What is 84 - 37?",
    answerOptions: [
      { id: "a", text: "47", emoji: "4️⃣7️⃣", isCorrect: true },
      { id: "b", text: "57", emoji: "5️⃣7️⃣", isCorrect: false },
      { id: "c", text: "53", emoji: "5️⃣3️⃣", isCorrect: false },
      { id: "d", text: "41", emoji: "4️⃣1️⃣", isCorrect: false },
    ],
    difficulty: 5, topics: ["subtraction"], explanation: "84 - 37 = 47. 14-7=7 (borrow from tens), 7-3=4. Answer: 47!", subject: "maths", yearLevel: "year3", hint: "You may need to regroup (borrow)",
  },
  {
    questionId: uuidv4(), questionText: "What is 500 - 175?",
    answerOptions: [
      { id: "a", text: "315", emoji: "3️⃣1️⃣5️⃣", isCorrect: false },
      { id: "b", text: "325", emoji: "3️⃣2️⃣5️⃣", isCorrect: true },
      { id: "c", text: "335", emoji: "3️⃣3️⃣5️⃣", isCorrect: false },
      { id: "d", text: "675", emoji: "6️⃣7️⃣5️⃣", isCorrect: false },
    ],
    difficulty: 6, topics: ["subtraction"], explanation: "500 - 175 = 325. Think: 175 + 25 = 200, 200 + 300 = 500, so 25+300=325!", subject: "maths", yearLevel: "year3", hint: "Count up from 175 to 500",
  },
  {
    questionId: uuidv4(), questionText: "There are 243 children at school. 98 go home early. How many stay?",
    answerOptions: [
      { id: "a", text: "145", emoji: "1️⃣4️⃣5️⃣", isCorrect: true },
      { id: "b", text: "155", emoji: "1️⃣5️⃣5️⃣", isCorrect: false },
      { id: "c", text: "135", emoji: "1️⃣3️⃣5️⃣", isCorrect: false },
      { id: "d", text: "341", emoji: "3️⃣4️⃣1️⃣", isCorrect: false },
    ],
    difficulty: 5, topics: ["subtraction"], explanation: "243 - 98 = 145. Round 98 to 100: 243-100=143, then +2=145!", subject: "maths", yearLevel: "year3", hint: "Subtract 100 first, then adjust",
  },

  // =============================================
  // YEAR 3 MATHS — MULTIPLICATION (difficulty 5-8)
  // =============================================
  {
    questionId: uuidv4(), questionText: "What is 2 × 6?",
    answerOptions: [
      { id: "a", text: "10", emoji: "🔟", isCorrect: false },
      { id: "b", text: "12", emoji: "1️⃣2️⃣", isCorrect: true },
      { id: "c", text: "8", emoji: "8️⃣", isCorrect: false },
      { id: "d", text: "14", emoji: "1️⃣4️⃣", isCorrect: false },
    ],
    difficulty: 4, topics: ["multiplication"], explanation: "2 × 6 = 12. Count by 2s six times: 2, 4, 6, 8, 10, 12!", subject: "maths", yearLevel: "year3", hint: "Count in 2s",
  },
  {
    questionId: uuidv4(), questionText: "What is 5 × 7?",
    answerOptions: [
      { id: "a", text: "30", emoji: "3️⃣0️⃣", isCorrect: false },
      { id: "b", text: "35", emoji: "3️⃣5️⃣", isCorrect: true },
      { id: "c", text: "40", emoji: "4️⃣0️⃣", isCorrect: false },
      { id: "d", text: "12", emoji: "1️⃣2️⃣", isCorrect: false },
    ],
    difficulty: 5, topics: ["multiplication"], explanation: "5 × 7 = 35. Count by 5s: 5,10,15,20,25,30,35!", subject: "maths", yearLevel: "year3", hint: "Count in 5s seven times",
  },
  {
    questionId: uuidv4(), questionText: "What is 3 × 8?",
    answerOptions: [
      { id: "a", text: "21", emoji: "2️⃣1️⃣", isCorrect: false },
      { id: "b", text: "24", emoji: "2️⃣4️⃣", isCorrect: true },
      { id: "c", text: "27", emoji: "2️⃣7️⃣", isCorrect: false },
      { id: "d", text: "11", emoji: "1️⃣1️⃣", isCorrect: false },
    ],
    difficulty: 5, topics: ["multiplication"], explanation: "3 × 8 = 24. Three groups of 8: 8, 16, 24!", subject: "maths", yearLevel: "year3", hint: "Count in 8s three times",
  },
  {
    questionId: uuidv4(), questionText: "What is 4 × 9?",
    answerOptions: [
      { id: "a", text: "32", emoji: "3️⃣2️⃣", isCorrect: false },
      { id: "b", text: "36", emoji: "3️⃣6️⃣", isCorrect: true },
      { id: "c", text: "40", emoji: "4️⃣0️⃣", isCorrect: false },
      { id: "d", text: "13", emoji: "1️⃣3️⃣", isCorrect: false },
    ],
    difficulty: 6, topics: ["multiplication"], explanation: "4 × 9 = 36. Four groups of 9: 9, 18, 27, 36!", subject: "maths", yearLevel: "year3", hint: "Count in 9s four times",
  },
  {
    questionId: uuidv4(), questionText: "What is 6 × 7?",
    answerOptions: [
      { id: "a", text: "36", emoji: "3️⃣6️⃣", isCorrect: false },
      { id: "b", text: "42", emoji: "4️⃣2️⃣", isCorrect: true },
      { id: "c", text: "48", emoji: "4️⃣8️⃣", isCorrect: false },
      { id: "d", text: "13", emoji: "1️⃣3️⃣", isCorrect: false },
    ],
    difficulty: 6, topics: ["multiplication"], explanation: "6 × 7 = 42. Six 7s: 7,14,21,28,35,42!", subject: "maths", yearLevel: "year3", hint: "Count in 7s six times",
  },
  {
    questionId: uuidv4(), questionText: "What is 9 × 6?",
    answerOptions: [
      { id: "a", text: "45", emoji: "4️⃣5️⃣", isCorrect: false },
      { id: "b", text: "54", emoji: "5️⃣4️⃣", isCorrect: true },
      { id: "c", text: "63", emoji: "6️⃣3️⃣", isCorrect: false },
      { id: "d", text: "15", emoji: "1️⃣5️⃣", isCorrect: false },
    ],
    difficulty: 7, topics: ["multiplication"], explanation: "9 × 6 = 54. Digits in 9 times table always add to 9: 5+4=9 ✓", subject: "maths", yearLevel: "year3", hint: "9 times table: digits add to 9",
  },
  {
    questionId: uuidv4(), questionText: "A box has 8 rows of 7 eggs. How many eggs in total?",
    answerOptions: [
      { id: "a", text: "48", emoji: "4️⃣8️⃣", isCorrect: false },
      { id: "b", text: "56", emoji: "5️⃣6️⃣", isCorrect: true },
      { id: "c", text: "64", emoji: "6️⃣4️⃣", isCorrect: false },
      { id: "d", text: "15", emoji: "1️⃣5️⃣", isCorrect: false },
    ],
    difficulty: 6, topics: ["multiplication"], explanation: "8 × 7 = 56. Eight rows of seven eggs = 56 eggs!", subject: "maths", yearLevel: "year3", hint: "8 rows, 7 in each row = 8 × 7",
  },
  {
    questionId: uuidv4(), questionText: "What is 10 × 10?",
    answerOptions: [
      { id: "a", text: "20", emoji: "2️⃣0️⃣", isCorrect: false },
      { id: "b", text: "100", emoji: "💯", isCorrect: true },
      { id: "c", text: "110", emoji: "1️⃣1️⃣0️⃣", isCorrect: false },
      { id: "d", text: "1000", emoji: "🔢", isCorrect: false },
    ],
    difficulty: 5, topics: ["multiplication"], explanation: "10 × 10 = 100. Ten 10s make one hundred!", subject: "maths", yearLevel: "year3", hint: "10 times table: just add a zero",
  },

  // =============================================
  // YEAR 3 MATHS — DIVISION (difficulty 5-7)
  // =============================================
  {
    questionId: uuidv4(), questionText: "What is 12 ÷ 3?",
    answerOptions: [
      { id: "a", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "b", text: "4", emoji: "4️⃣", isCorrect: true },
      { id: "c", text: "5", emoji: "5️⃣", isCorrect: false },
      { id: "d", text: "6", emoji: "6️⃣", isCorrect: false },
    ],
    difficulty: 5, topics: ["multiplication"], explanation: "12 ÷ 3 = 4. Share 12 into 3 equal groups = 4 each!", subject: "maths", yearLevel: "year3", hint: "3 × ? = 12",
  },
  {
    questionId: uuidv4(), questionText: "What is 20 ÷ 5?",
    answerOptions: [
      { id: "a", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "b", text: "4", emoji: "4️⃣", isCorrect: true },
      { id: "c", text: "5", emoji: "5️⃣", isCorrect: false },
      { id: "d", text: "15", emoji: "1️⃣5️⃣", isCorrect: false },
    ],
    difficulty: 5, topics: ["multiplication"], explanation: "20 ÷ 5 = 4. Count by 5s to 20: 5,10,15,20 = 4 jumps!", subject: "maths", yearLevel: "year3", hint: "5 × ? = 20",
  },
  {
    questionId: uuidv4(), questionText: "27 students split into 3 equal teams. How many in each team?",
    answerOptions: [
      { id: "a", text: "7", emoji: "7️⃣", isCorrect: false },
      { id: "b", text: "9", emoji: "9️⃣", isCorrect: true },
      { id: "c", text: "8", emoji: "8️⃣", isCorrect: false },
      { id: "d", text: "10", emoji: "🔟", isCorrect: false },
    ],
    difficulty: 6, topics: ["multiplication"], explanation: "27 ÷ 3 = 9. Three groups of 9 = 27!", subject: "maths", yearLevel: "year3", hint: "3 × ? = 27",
  },

  // =============================================
  // YEAR 3 MATHS — FRACTIONS (difficulty 5-7)
  // =============================================
  {
    questionId: uuidv4(), questionText: "What is half of 16?",
    answerOptions: [
      { id: "a", text: "6", emoji: "6️⃣", isCorrect: false },
      { id: "b", text: "8", emoji: "8️⃣", isCorrect: true },
      { id: "c", text: "10", emoji: "🔟", isCorrect: false },
      { id: "d", text: "4", emoji: "4️⃣", isCorrect: false },
    ],
    difficulty: 5, topics: ["measurement"], explanation: "Half of 16 is 8. 16 ÷ 2 = 8!", subject: "maths", yearLevel: "year3", hint: "Divide 16 by 2",
  },
  {
    questionId: uuidv4(), questionText: "Which fraction is bigger: ½ or ¼?",
    answerOptions: [
      { id: "a", text: "¼ (one quarter)", emoji: "🍕", isCorrect: false },
      { id: "b", text: "½ (one half)", emoji: "🍰", isCorrect: true },
      { id: "c", text: "They are equal", emoji: "⚖️", isCorrect: false },
      { id: "d", text: "Cannot tell", emoji: "🤷", isCorrect: false },
    ],
    difficulty: 6, topics: ["measurement"], explanation: "½ is bigger than ¼. If you cut a pizza in half, each piece is bigger than a quarter!", subject: "maths", yearLevel: "year3", hint: "Half a pizza vs a quarter — which piece is bigger?",
  },
  {
    questionId: uuidv4(), questionText: "A pizza is cut into 4 equal pieces. Emma eats 1 piece. What fraction did she eat?",
    answerOptions: [
      { id: "a", text: "½ (one half)", emoji: "🍕🍕", isCorrect: false },
      { id: "b", text: "¼ (one quarter)", emoji: "🍕", isCorrect: true },
      { id: "c", text: "¾ (three quarters)", emoji: "🍕🍕🍕", isCorrect: false },
      { id: "d", text: "1 (the whole)", emoji: "🍕🍕🍕🍕", isCorrect: false },
    ],
    difficulty: 5, topics: ["measurement"], explanation: "1 piece out of 4 = ¼ (one quarter)!", subject: "maths", yearLevel: "year3", hint: "1 piece out of how many pieces?",
  },

  // =============================================
  // YEAR 3 MATHS — TIME (difficulty 4-6)
  // =============================================
  {
    questionId: uuidv4(), questionText: "How many minutes are in one hour?",
    answerOptions: [
      { id: "a", text: "30", emoji: "3️⃣0️⃣", isCorrect: false },
      { id: "b", text: "60", emoji: "6️⃣0️⃣", isCorrect: true },
      { id: "c", text: "100", emoji: "💯", isCorrect: false },
      { id: "d", text: "24", emoji: "2️⃣4️⃣", isCorrect: false },
    ],
    difficulty: 4, topics: ["time"], explanation: "There are 60 minutes in one hour!", subject: "maths", yearLevel: "year3", hint: "Look at a clock — it has 60 marks",
  },
  {
    questionId: uuidv4(), questionText: "How many hours are in one day?",
    answerOptions: [
      { id: "a", text: "12", emoji: "1️⃣2️⃣", isCorrect: false },
      { id: "b", text: "24", emoji: "2️⃣4️⃣", isCorrect: true },
      { id: "c", text: "60", emoji: "6️⃣0️⃣", isCorrect: false },
      { id: "d", text: "7", emoji: "7️⃣", isCorrect: false },
    ],
    difficulty: 4, topics: ["time"], explanation: "There are 24 hours in a day — 12 in the morning, 12 at night!", subject: "maths", yearLevel: "year3", hint: "AM hours + PM hours",
  },
  {
    questionId: uuidv4(), questionText: "What time is shown as 'quarter past 3'?",
    answerOptions: [
      { id: "a", text: "3:05", emoji: "🕒", isCorrect: false },
      { id: "b", text: "3:15", emoji: "🕒", isCorrect: true },
      { id: "c", text: "3:30", emoji: "🕞", isCorrect: false },
      { id: "d", text: "3:45", emoji: "🕓", isCorrect: false },
    ],
    difficulty: 5, topics: ["time"], explanation: "Quarter past 3 = 3:15. A quarter of 60 minutes = 15 minutes!", subject: "maths", yearLevel: "year3", hint: "A quarter of an hour = 15 minutes",
  },
  {
    questionId: uuidv4(), questionText: "How many days in a week?",
    answerOptions: [
      { id: "a", text: "5", emoji: "5️⃣", isCorrect: false },
      { id: "b", text: "6", emoji: "6️⃣", isCorrect: false },
      { id: "c", text: "7", emoji: "7️⃣", isCorrect: true },
      { id: "d", text: "8", emoji: "8️⃣", isCorrect: false },
    ],
    difficulty: 4, topics: ["time"], explanation: "There are 7 days in a week: Mon, Tue, Wed, Thu, Fri, Sat, Sun!", subject: "maths", yearLevel: "year3", hint: "How many days from Monday to Sunday?",
  },
  {
    questionId: uuidv4(), questionText: "School starts at 9:00am and ends at 3:00pm. How many hours is school?",
    answerOptions: [
      { id: "a", text: "5 hours", emoji: "5️⃣", isCorrect: false },
      { id: "b", text: "6 hours", emoji: "6️⃣", isCorrect: true },
      { id: "c", text: "7 hours", emoji: "7️⃣", isCorrect: false },
      { id: "d", text: "4 hours", emoji: "4️⃣", isCorrect: false },
    ],
    difficulty: 5, topics: ["time"], explanation: "9am to 3pm = 6 hours. Count: 9→10→11→12→1→2→3 = 6 hours!", subject: "maths", yearLevel: "year3", hint: "Count the hours from 9am to 3pm",
  },

  // =============================================
  // YEAR 3 MATHS — MEASUREMENT (difficulty 4-6)
  // =============================================
  {
    questionId: uuidv4(), questionText: "How many centimetres (cm) are in 1 metre (m)?",
    answerOptions: [
      { id: "a", text: "10 cm", emoji: "1️⃣0️⃣", isCorrect: false },
      { id: "b", text: "100 cm", emoji: "💯", isCorrect: true },
      { id: "c", text: "1000 cm", emoji: "🔢", isCorrect: false },
      { id: "d", text: "50 cm", emoji: "5️⃣0️⃣", isCorrect: false },
    ],
    difficulty: 4, topics: ["measurement"], explanation: "1 metre = 100 centimetres. 'Centi' means 100!", subject: "maths", yearLevel: "year3", hint: "'Centi' means 100 — like 100 cents in a dollar",
  },
  {
    questionId: uuidv4(), questionText: "A book weighs 300 grams. How many grams is 3 books?",
    answerOptions: [
      { id: "a", text: "600g", emoji: "6️⃣0️⃣0️⃣", isCorrect: false },
      { id: "b", text: "900g", emoji: "9️⃣0️⃣0️⃣", isCorrect: true },
      { id: "c", text: "1000g", emoji: "🔢", isCorrect: false },
      { id: "d", text: "303g", emoji: "3️⃣0️⃣3️⃣", isCorrect: false },
    ],
    difficulty: 5, topics: ["measurement", "multiplication"], explanation: "3 × 300g = 900g. Three groups of 300!", subject: "maths", yearLevel: "year3", hint: "3 × 300 = ?",
  },

  // =============================================
  // YEAR 3 ENGLISH — GRAMMAR (difficulty 4-7)
  // =============================================
  {
    questionId: uuidv4(), questionText: "Choose the correct verb: 'She ___ to school every day.'",
    answerOptions: [
      { id: "a", text: "go", emoji: "❌", isCorrect: false },
      { id: "b", text: "goes", emoji: "✅", isCorrect: true },
      { id: "c", text: "going", emoji: "❌", isCorrect: false },
      { id: "d", text: "goed", emoji: "❌", isCorrect: false },
    ],
    difficulty: 5, topics: ["grammar"], explanation: "With 'she/he/it', we add -s to the verb! She goes.", subject: "english", yearLevel: "year3", hint: "With 'she', the verb needs -s added",
  },
  {
    questionId: uuidv4(), questionText: "Which word is a noun?",
    answerOptions: [
      { id: "a", text: "Quickly ⚡", emoji: "⚡", isCorrect: false },
      { id: "b", text: "Happy 😊", emoji: "😊", isCorrect: false },
      { id: "c", text: "Run 🏃", emoji: "🏃", isCorrect: false },
      { id: "d", text: "Library 📚", emoji: "📚", isCorrect: true },
    ],
    difficulty: 5, topics: ["grammar"], explanation: "A noun is a person, place, or thing. Library is a PLACE!", subject: "english", yearLevel: "year3", hint: "A noun is a person, place or thing",
  },
  {
    questionId: uuidv4(), questionText: "Which word is an adjective in: 'The fluffy cat sat down.'",
    answerOptions: [
      { id: "a", text: "cat 🐱", emoji: "🐱", isCorrect: false },
      { id: "b", text: "sat 🪑", emoji: "🪑", isCorrect: false },
      { id: "c", text: "fluffy ✨", emoji: "✨", isCorrect: true },
      { id: "d", text: "down ⬇️", emoji: "⬇️", isCorrect: false },
    ],
    difficulty: 5, topics: ["grammar"], explanation: "Fluffy is an adjective — it describes what the cat looks like!", subject: "english", yearLevel: "year3", hint: "An adjective describes a noun",
  },
  {
    questionId: uuidv4(), questionText: "Add punctuation: 'what is your favourite colour'",
    answerOptions: [
      { id: "a", text: "What is your favourite colour.", emoji: ".", isCorrect: false },
      { id: "b", text: "What is your favourite colour!", emoji: "!", isCorrect: false },
      { id: "c", text: "What is your favourite colour?", emoji: "?", isCorrect: true },
      { id: "d", text: "what is your favourite colour,", emoji: ",", isCorrect: false },
    ],
    difficulty: 4, topics: ["grammar", "punctuation"], explanation: "It's a question, so it ends with a question mark (?). What starts questions!", subject: "english", yearLevel: "year3", hint: "The word 'what' tells you it's a question",
  },
  {
    questionId: uuidv4(), questionText: "Which is the correct plural of 'leaf'?",
    answerOptions: [
      { id: "a", text: "leafs", emoji: "❌", isCorrect: false },
      { id: "b", text: "leaves", emoji: "✅", isCorrect: true },
      { id: "c", text: "leaes", emoji: "❌", isCorrect: false },
      { id: "d", text: "leaf's", emoji: "❌", isCorrect: false },
    ],
    difficulty: 6, topics: ["grammar"], explanation: "Leaf → Leaves. Words ending in 'f' often change to 'ves' in plural!", subject: "english", yearLevel: "year3", hint: "Words ending in 'f' often change to 'ves'",
  },
  {
    questionId: uuidv4(), questionText: "Which sentence uses the past tense correctly?",
    answerOptions: [
      { id: "a", text: "She walk to the park.", emoji: "❌", isCorrect: false },
      { id: "b", text: "She walks to the park.", emoji: "❌", isCorrect: false },
      { id: "c", text: "She walked to the park.", emoji: "✅", isCorrect: true },
      { id: "d", text: "She walking to the park.", emoji: "❌", isCorrect: false },
    ],
    difficulty: 5, topics: ["grammar"], explanation: "Past tense = already happened! 'walked' is past tense of 'walk'.", subject: "english", yearLevel: "year3", hint: "The action already happened",
  },
  {
    questionId: uuidv4(), questionText: "Choose the correct word: 'There are ___ apples.'",
    answerOptions: [
      { id: "a", text: "much", emoji: "❌", isCorrect: false },
      { id: "b", text: "a", emoji: "❌", isCorrect: false },
      { id: "c", text: "many", emoji: "✅", isCorrect: true },
      { id: "d", text: "an", emoji: "❌", isCorrect: false },
    ],
    difficulty: 5, topics: ["grammar"], explanation: "Use 'many' for things you can count! Many apples, many kids.", subject: "english", yearLevel: "year3", hint: "Many = for things you can count",
  },
  {
    questionId: uuidv4(), questionText: "Which sentence has the correct capital letter?",
    answerOptions: [
      { id: "a", text: "the dog barked.", emoji: "❌", isCorrect: false },
      { id: "b", text: "The Dog barked.", emoji: "❌", isCorrect: false },
      { id: "c", text: "The dog barked.", emoji: "✅", isCorrect: true },
      { id: "d", text: "the Dog Barked.", emoji: "❌", isCorrect: false },
    ],
    difficulty: 4, topics: ["grammar", "punctuation"], explanation: "Only the first word of a sentence gets a capital letter (unless it's a proper noun)!", subject: "english", yearLevel: "year3", hint: "Only the FIRST word gets a capital",
  },

  // =============================================
  // YEAR 3 ENGLISH — SPELLING (difficulty 5-8)
  // =============================================
  {
    questionId: uuidv4(), questionText: "Which word is spelled correctly?",
    answerOptions: [
      { id: "a", text: "frend", emoji: "❌", isCorrect: false },
      { id: "b", text: "friend", emoji: "✅", isCorrect: true },
      { id: "c", text: "freind", emoji: "❌", isCorrect: false },
      { id: "d", text: "frriend", emoji: "❌", isCorrect: false },
    ],
    difficulty: 5, topics: ["spelling"], explanation: "Friend: F-R-I-E-N-D. Remember 'i before e'!", subject: "english", yearLevel: "year3", hint: "i before e except after c",
  },
  {
    questionId: uuidv4(), questionText: "Which spelling is correct?",
    answerOptions: [
      { id: "a", text: "becuase", emoji: "❌", isCorrect: false },
      { id: "b", text: "because", emoji: "✅", isCorrect: true },
      { id: "c", text: "becouse", emoji: "❌", isCorrect: false },
      { id: "d", text: "beecause", emoji: "❌", isCorrect: false },
    ],
    difficulty: 6, topics: ["spelling"], explanation: "Because: B-E-C-A-U-S-E. Break it up: be-cause!", subject: "english", yearLevel: "year3", hint: "be-CAUSE",
  },
  {
    questionId: uuidv4(), questionText: "Which word is spelled correctly?",
    answerOptions: [
      { id: "a", text: "beutiful", emoji: "❌", isCorrect: false },
      { id: "b", text: "beautyful", emoji: "❌", isCorrect: false },
      { id: "c", text: "beautiful", emoji: "✅", isCorrect: true },
      { id: "d", text: "beautifull", emoji: "❌", isCorrect: false },
    ],
    difficulty: 7, topics: ["spelling"], explanation: "Beautiful: B-E-A-U-T-I-F-U-L. Remember: it has 'eau' in the middle!", subject: "english", yearLevel: "year3", hint: "beau-ti-ful",
  },
  {
    questionId: uuidv4(), questionText: "Which word is spelled correctly?",
    answerOptions: [
      { id: "a", text: "tommorrow", emoji: "❌", isCorrect: false },
      { id: "b", text: "tomorrow", emoji: "✅", isCorrect: true },
      { id: "c", text: "tommorow", emoji: "❌", isCorrect: false },
      { id: "d", text: "tomorow", emoji: "❌", isCorrect: false },
    ],
    difficulty: 6, topics: ["spelling"], explanation: "Tomorrow: T-O-M-O-R-R-O-W. One M, two Rs!", subject: "english", yearLevel: "year3", hint: "to-MOR-row — one M, two Rs",
  },
  {
    questionId: uuidv4(), questionText: "Which is the correct spelling?",
    answerOptions: [
      { id: "a", text: "wednesday", emoji: "❌", isCorrect: false },
      { id: "b", text: "Wendsday", emoji: "❌", isCorrect: false },
      { id: "c", text: "Wednesday", emoji: "✅", isCorrect: true },
      { id: "d", text: "Wednessday", emoji: "❌", isCorrect: false },
    ],
    difficulty: 6, topics: ["spelling"], explanation: "Wednesday has a silent 'd': Wed-nes-day. It's a day of the week so it gets a capital!", subject: "english", yearLevel: "year3", hint: "Wed-nes-day — there's a silent D",
  },

  // =============================================
  // YEAR 3 ENGLISH — READING COMPREHENSION (difficulty 4-7)
  // =============================================
  {
    questionId: uuidv4(), questionText: "Story: 'Maya had a red umbrella. She used it every rainy day.'\n\nWhat colour was Maya's umbrella?",
    answerOptions: [
      { id: "a", text: "Blue 🔵", emoji: "🔵", isCorrect: false },
      { id: "b", text: "Red 🔴", emoji: "🔴", isCorrect: true },
      { id: "c", text: "Yellow 🟡", emoji: "🟡", isCorrect: false },
      { id: "d", text: "Green 🟢", emoji: "🟢", isCorrect: false },
    ],
    difficulty: 4, topics: ["reading-comprehension"], explanation: "The text says 'Maya had a RED umbrella'!", subject: "english", yearLevel: "year3", hint: "Look for the colour word before umbrella",
  },
  {
    questionId: uuidv4(), questionText: "Story: 'The library had 500 books. Jack borrowed 12 books this week.'\n\nWhere did Jack borrow books from?",
    answerOptions: [
      { id: "a", text: "A shop 🛍️", emoji: "🛍️", isCorrect: false },
      { id: "b", text: "A library 📚", emoji: "📚", isCorrect: true },
      { id: "c", text: "A school 🏫", emoji: "🏫", isCorrect: false },
      { id: "d", text: "A friend 🤝", emoji: "🤝", isCorrect: false },
    ],
    difficulty: 4, topics: ["reading-comprehension"], explanation: "The story says 'The library had 500 books' — Jack borrowed from the library!", subject: "english", yearLevel: "year3", hint: "Read the first sentence",
  },
  {
    questionId: uuidv4(), questionText: "Story: 'Liam loved football. He practised every evening after school. His team won the trophy last Saturday.'\n\nWhen did Liam practise football?",
    answerOptions: [
      { id: "a", text: "Every morning ☀️", emoji: "☀️", isCorrect: false },
      { id: "b", text: "Every evening after school 🌙", emoji: "🌙", isCorrect: true },
      { id: "c", text: "On weekends ⚽", emoji: "⚽", isCorrect: false },
      { id: "d", text: "During lunch 🍽️", emoji: "🍽️", isCorrect: false },
    ],
    difficulty: 5, topics: ["reading-comprehension"], explanation: "The text says 'He practised every evening after school'!", subject: "english", yearLevel: "year3", hint: "Look for when he practised",
  },
  {
    questionId: uuidv4(), questionText: "Story: 'Zara was scared of spiders. One day she saw a tiny spider in her room. She took a deep breath and gently moved it outside.'\n\nWhat does this story tell us about Zara?",
    answerOptions: [
      { id: "a", text: "She liked spiders 🕷️", emoji: "🕷️", isCorrect: false },
      { id: "b", text: "She was brave even when scared 💪", emoji: "💪", isCorrect: true },
      { id: "c", text: "She ran away 🏃", emoji: "🏃", isCorrect: false },
      { id: "d", text: "She called for help 📢", emoji: "📢", isCorrect: false },
    ],
    difficulty: 6, topics: ["reading-comprehension"], explanation: "Zara was scared but still helped the spider — that shows bravery!", subject: "english", yearLevel: "year3", hint: "What do Zara's actions tell us?",
  },
  {
    questionId: uuidv4(), questionText: "Poem: 'Rain, rain, go away,\nCome again another day.'\n\nWhat does the poem ask the rain to do?",
    answerOptions: [
      { id: "a", text: "Fall harder 🌧️", emoji: "🌧️", isCorrect: false },
      { id: "b", text: "Go away 👋", emoji: "👋", isCorrect: true },
      { id: "c", text: "Make rainbows 🌈", emoji: "🌈", isCorrect: false },
      { id: "d", text: "Turn into snow ❄️", emoji: "❄️", isCorrect: false },
    ],
    difficulty: 4, topics: ["reading-comprehension"], explanation: "'Rain, rain, GO AWAY' — the poem asks the rain to leave!", subject: "english", yearLevel: "year3", hint: "Read the first line of the poem",
  },

  // =============================================
  // YEAR 3 ENGLISH — VOCABULARY (difficulty 5-7)
  // =============================================
  {
    questionId: uuidv4(), questionText: "What is a synonym (same meaning) for 'angry'?",
    answerOptions: [
      { id: "a", text: "Happy 😊", emoji: "😊", isCorrect: false },
      { id: "b", text: "Furious 😡", emoji: "😡", isCorrect: true },
      { id: "c", text: "Tired 😴", emoji: "😴", isCorrect: false },
      { id: "d", text: "Surprised 😲", emoji: "😲", isCorrect: false },
    ],
    difficulty: 5, topics: ["vocabulary"], explanation: "Furious is a synonym of angry — both mean very upset!", subject: "english", yearLevel: "year3", hint: "A synonym means the same thing",
  },
  {
    questionId: uuidv4(), questionText: "What is an antonym (opposite) of 'ancient'?",
    answerOptions: [
      { id: "a", text: "Old 👴", emoji: "👴", isCorrect: false },
      { id: "b", text: "Historic 🏛️", emoji: "🏛️", isCorrect: false },
      { id: "c", text: "Modern 🏙️", emoji: "🏙️", isCorrect: true },
      { id: "d", text: "Antique 🏺", emoji: "🏺", isCorrect: false },
    ],
    difficulty: 6, topics: ["vocabulary"], explanation: "Ancient means very old, so its antonym (opposite) is Modern = new!", subject: "english", yearLevel: "year3", hint: "An antonym means the opposite",
  },
  {
    questionId: uuidv4(), questionText: "Choose the correct word: 'The scientist made an important ___.'",
    answerOptions: [
      { id: "a", text: "discover", emoji: "❌", isCorrect: false },
      { id: "b", text: "discovery", emoji: "✅", isCorrect: true },
      { id: "c", text: "discovering", emoji: "❌", isCorrect: false },
      { id: "d", text: "discovered", emoji: "❌", isCorrect: false },
    ],
    difficulty: 6, topics: ["vocabulary", "grammar"], explanation: "We need a noun here. 'Discovery' is a noun — the result of discovering something!", subject: "english", yearLevel: "year3", hint: "After 'an important', we need a noun (thing)",
  },
  {
    questionId: uuidv4(), questionText: "What does 'enormous' mean?",
    answerOptions: [
      { id: "a", text: "Very tiny 🐜", emoji: "🐜", isCorrect: false },
      { id: "b", text: "Very old 👴", emoji: "👴", isCorrect: false },
      { id: "c", text: "Very big 🐘", emoji: "🐘", isCorrect: true },
      { id: "d", text: "Very fast 🏎️", emoji: "🏎️", isCorrect: false },
    ],
    difficulty: 5, topics: ["vocabulary"], explanation: "Enormous means extremely big! An elephant is enormous!", subject: "english", yearLevel: "year3", hint: "Think of the biggest thing you know",
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (process.env.NODE_ENV === "production" && secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    let seeded = 0;
    for (const q of SEED_QUESTIONS) {
      const fullQuestion = {
        ...q,
        pk: `${q.subject}#${q.yearLevel}`,
        createdAt: new Date().toISOString(),
      };
      await putItem(TABLES.QUESTIONS, fullQuestion);
      seeded++;
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${seeded} questions successfully`,
      count: seeded,
      breakdown: {
        prepMaths: SEED_QUESTIONS.filter(q => q.subject === "maths" && q.yearLevel === "prep").length,
        prepEnglish: SEED_QUESTIONS.filter(q => q.subject === "english" && q.yearLevel === "prep").length,
        year3Maths: SEED_QUESTIONS.filter(q => q.subject === "maths" && q.yearLevel === "year3").length,
        year3English: SEED_QUESTIONS.filter(q => q.subject === "english" && q.yearLevel === "year3").length,
      }
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Failed to seed questions" }, { status: 500 });
  }
}
