import { NextRequest, NextResponse } from "next/server";
import { putItem, TABLES } from "@/lib/dynamodb";
import { Question } from "@/types";
import { v4 as uuidv4 } from "uuid";

// Comprehensive seed questions for Prep and Year 3
const SEED_QUESTIONS: Omit<Question, "pk" | "createdAt">[] = [
  // ==================== PREP MATHS - COUNTING (difficulty 1-3) ====================
  {
    questionId: uuidv4(),
    questionText: "How many apples are there? 🍎🍎🍎",
    answerOptions: [
      { id: "a", text: "2", emoji: "2️⃣", isCorrect: false },
      { id: "b", text: "3", emoji: "3️⃣", isCorrect: true },
      { id: "c", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "d", text: "5", emoji: "5️⃣", isCorrect: false },
    ],
    difficulty: 1, topics: ["counting"], explanation: "Count the apples: 1, 2, 3!", subject: "maths", yearLevel: "prep", hint: "Count each apple one by one",
  },
  {
    questionId: uuidv4(),
    questionText: "How many stars? ⭐⭐⭐⭐⭐",
    answerOptions: [
      { id: "a", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "b", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "c", text: "5", emoji: "5️⃣", isCorrect: true },
      { id: "d", text: "6", emoji: "6️⃣", isCorrect: false },
    ],
    difficulty: 1, topics: ["counting"], explanation: "Count the stars: 1, 2, 3, 4, 5!", subject: "maths", yearLevel: "prep", hint: "Point to each star and count",
  },
  {
    questionId: uuidv4(),
    questionText: "How many balloons? 🎈🎈",
    answerOptions: [
      { id: "a", text: "1", emoji: "1️⃣", isCorrect: false },
      { id: "b", text: "2", emoji: "2️⃣", isCorrect: true },
      { id: "c", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "d", text: "4", emoji: "4️⃣", isCorrect: false },
    ],
    difficulty: 1, topics: ["counting"], explanation: "Count the balloons: 1, 2. There are 2 balloons!", subject: "maths", yearLevel: "prep", hint: "Count each balloon",
  },
  {
    questionId: uuidv4(),
    questionText: "Which number comes after 4?",
    answerOptions: [
      { id: "a", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "b", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "c", text: "5", emoji: "5️⃣", isCorrect: true },
      { id: "d", text: "6", emoji: "6️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["counting"], explanation: "After 4 comes 5! Count: 1, 2, 3, 4, 5", subject: "maths", yearLevel: "prep", hint: "Count up from 4",
  },
  {
    questionId: uuidv4(),
    questionText: "Count the dogs: 🐶🐶🐶🐶🐶🐶🐶",
    answerOptions: [
      { id: "a", text: "5", emoji: "5️⃣", isCorrect: false },
      { id: "b", text: "6", emoji: "6️⃣", isCorrect: false },
      { id: "c", text: "7", emoji: "7️⃣", isCorrect: true },
      { id: "d", text: "8", emoji: "8️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["counting"], explanation: "Count each dog: 1, 2, 3, 4, 5, 6, 7. There are 7 dogs!", subject: "maths", yearLevel: "prep", hint: "Count carefully one by one",
  },
  // ==================== PREP MATHS - ADDITION (difficulty 2-4) ====================
  {
    questionId: uuidv4(),
    questionText: "1 + 1 = ?",
    answerOptions: [
      { id: "a", text: "1", emoji: "1️⃣", isCorrect: false },
      { id: "b", text: "2", emoji: "2️⃣", isCorrect: true },
      { id: "c", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "d", text: "4", emoji: "4️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["addition"], explanation: "1 + 1 = 2. One apple and one more apple = 2 apples!", subject: "maths", yearLevel: "prep", hint: "Hold up 1 finger, then 1 more",
  },
  {
    questionId: uuidv4(),
    questionText: "2 + 2 = ?",
    answerOptions: [
      { id: "a", text: "2", emoji: "2️⃣", isCorrect: false },
      { id: "b", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "c", text: "4", emoji: "4️⃣", isCorrect: true },
      { id: "d", text: "5", emoji: "5️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["addition"], explanation: "2 + 2 = 4. Count: 1, 2, then 3, 4!", subject: "maths", yearLevel: "prep", hint: "Show 2 fingers on each hand",
  },
  {
    questionId: uuidv4(),
    questionText: "3 + 2 = ?",
    answerOptions: [
      { id: "a", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "b", text: "5", emoji: "5️⃣", isCorrect: true },
      { id: "c", text: "6", emoji: "6️⃣", isCorrect: false },
      { id: "d", text: "7", emoji: "7️⃣", isCorrect: false },
    ],
    difficulty: 3, topics: ["addition"], explanation: "3 + 2 = 5. Start at 3, count 2 more: 4, 5!", subject: "maths", yearLevel: "prep", hint: "Start at 3 and count on 2 more",
  },
  {
    questionId: uuidv4(),
    questionText: "🍭🍭🍭 + 🍭🍭 = ?",
    answerOptions: [
      { id: "a", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "b", text: "5", emoji: "5️⃣", isCorrect: true },
      { id: "c", text: "6", emoji: "6️⃣", isCorrect: false },
      { id: "d", text: "7", emoji: "7️⃣", isCorrect: false },
    ],
    difficulty: 3, topics: ["addition"], explanation: "3 lollipops + 2 lollipops = 5 lollipops!", subject: "maths", yearLevel: "prep", hint: "Count all the lollipops together",
  },
  {
    questionId: uuidv4(),
    questionText: "4 + 3 = ?",
    answerOptions: [
      { id: "a", text: "6", emoji: "6️⃣", isCorrect: false },
      { id: "b", text: "7", emoji: "7️⃣", isCorrect: true },
      { id: "c", text: "8", emoji: "8️⃣", isCorrect: false },
      { id: "d", text: "9", emoji: "9️⃣", isCorrect: false },
    ],
    difficulty: 3, topics: ["addition"], explanation: "4 + 3 = 7. Start at 4, count: 5, 6, 7!", subject: "maths", yearLevel: "prep", hint: "Start at 4 and count on 3 more fingers",
  },
  // ==================== PREP MATHS - SUBTRACTION (difficulty 3-5) ====================
  {
    questionId: uuidv4(),
    questionText: "5 - 2 = ?",
    answerOptions: [
      { id: "a", text: "2", emoji: "2️⃣", isCorrect: false },
      { id: "b", text: "3", emoji: "3️⃣", isCorrect: true },
      { id: "c", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "d", text: "5", emoji: "5️⃣", isCorrect: false },
    ],
    difficulty: 3, topics: ["subtraction"], explanation: "5 - 2 = 3. If you have 5 and take away 2, you have 3 left!", subject: "maths", yearLevel: "prep", hint: "Hold up 5 fingers and put 2 down",
  },
  {
    questionId: uuidv4(),
    questionText: "There are 4 cookies 🍪🍪🍪🍪. You eat 1. How many are left?",
    answerOptions: [
      { id: "a", text: "2", emoji: "2️⃣", isCorrect: false },
      { id: "b", text: "3", emoji: "3️⃣", isCorrect: true },
      { id: "c", text: "4", emoji: "4️⃣", isCorrect: false },
      { id: "d", text: "5", emoji: "5️⃣", isCorrect: false },
    ],
    difficulty: 3, topics: ["subtraction"], explanation: "4 - 1 = 3. You started with 4 cookies and ate 1, so 3 are left!", subject: "maths", yearLevel: "prep", hint: "Count the cookies and take one away",
  },
  // ==================== PREP MATHS - SHAPES (difficulty 1-3) ====================
  {
    questionId: uuidv4(),
    questionText: "Which shape has 3 sides? 🔺",
    answerOptions: [
      { id: "a", text: "Circle", emoji: "⭕", isCorrect: false },
      { id: "b", text: "Square", emoji: "⬜", isCorrect: false },
      { id: "c", text: "Triangle", emoji: "🔺", isCorrect: true },
      { id: "d", text: "Rectangle", emoji: "▬", isCorrect: false },
    ],
    difficulty: 2, topics: ["shapes"], explanation: "A triangle has 3 sides. Count the sides: 1, 2, 3!", subject: "maths", yearLevel: "prep", hint: "Count the sides of each shape",
  },
  {
    questionId: uuidv4(),
    questionText: "What shape is a pizza? 🍕",
    answerOptions: [
      { id: "a", text: "Square", emoji: "⬜", isCorrect: false },
      { id: "b", text: "Circle", emoji: "⭕", isCorrect: true },
      { id: "c", text: "Triangle", emoji: "🔺", isCorrect: false },
      { id: "d", text: "Rectangle", emoji: "▬", isCorrect: false },
    ],
    difficulty: 1, topics: ["shapes"], explanation: "A pizza is round, which means it is a circle!", subject: "maths", yearLevel: "prep", hint: "Think about the shape of a pizza",
  },
  {
    questionId: uuidv4(),
    questionText: "How many sides does a square have?",
    answerOptions: [
      { id: "a", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "b", text: "4", emoji: "4️⃣", isCorrect: true },
      { id: "c", text: "5", emoji: "5️⃣", isCorrect: false },
      { id: "d", text: "6", emoji: "6️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["shapes"], explanation: "A square has 4 sides, all the same length!", subject: "maths", yearLevel: "prep", hint: "Count the sides of a square",
  },
  // ==================== PREP MATHS - PATTERNS ====================
  {
    questionId: uuidv4(),
    questionText: "What comes next? 🔴🔵🔴🔵🔴__",
    answerOptions: [
      { id: "a", text: "🔴 Red", emoji: "🔴", isCorrect: false },
      { id: "b", text: "🔵 Blue", emoji: "🔵", isCorrect: true },
      { id: "c", text: "🟡 Yellow", emoji: "🟡", isCorrect: false },
      { id: "d", text: "🟢 Green", emoji: "🟢", isCorrect: false },
    ],
    difficulty: 2, topics: ["patterns"], explanation: "The pattern is red, blue, red, blue... so next is blue!", subject: "maths", yearLevel: "prep", hint: "Look at what repeats",
  },
  {
    questionId: uuidv4(),
    questionText: "What comes next? ⭐🌙⭐🌙⭐__",
    answerOptions: [
      { id: "a", text: "⭐ Star", emoji: "⭐", isCorrect: false },
      { id: "b", text: "🌙 Moon", emoji: "🌙", isCorrect: true },
      { id: "c", text: "☀️ Sun", emoji: "☀️", isCorrect: false },
      { id: "d", text: "🌟 Sparkle", emoji: "🌟", isCorrect: false },
    ],
    difficulty: 2, topics: ["patterns"], explanation: "Star, moon, star, moon... the pattern repeats, so next is Moon!", subject: "maths", yearLevel: "prep", hint: "What repeats in the pattern?",
  },

  // ==================== YEAR 3 MATHS - MULTIPLICATION (difficulty 5-8) ====================
  {
    questionId: uuidv4(),
    questionText: "What is 3 × 4?",
    answerOptions: [
      { id: "a", text: "10", emoji: "🔟", isCorrect: false },
      { id: "b", text: "12", emoji: "1️⃣2️⃣", isCorrect: true },
      { id: "c", text: "14", emoji: "1️⃣4️⃣", isCorrect: false },
      { id: "d", text: "7", emoji: "7️⃣", isCorrect: false },
    ],
    difficulty: 5, topics: ["multiplication"], explanation: "3 × 4 = 12. Think of 3 groups of 4: 4, 8, 12!", subject: "maths", yearLevel: "year3", hint: "Count by 4s three times",
  },
  {
    questionId: uuidv4(),
    questionText: "What is 5 × 6?",
    answerOptions: [
      { id: "a", text: "25", emoji: "2️⃣5️⃣", isCorrect: false },
      { id: "b", text: "30", emoji: "3️⃣0️⃣", isCorrect: true },
      { id: "c", text: "35", emoji: "3️⃣5️⃣", isCorrect: false },
      { id: "d", text: "11", emoji: "1️⃣1️⃣", isCorrect: false },
    ],
    difficulty: 5, topics: ["multiplication"], explanation: "5 × 6 = 30. Count by 5s six times: 5, 10, 15, 20, 25, 30!", subject: "maths", yearLevel: "year3", hint: "Count by 5s",
  },
  {
    questionId: uuidv4(),
    questionText: "What is 7 × 8?",
    answerOptions: [
      { id: "a", text: "54", emoji: "5️⃣4️⃣", isCorrect: false },
      { id: "b", text: "56", emoji: "5️⃣6️⃣", isCorrect: true },
      { id: "c", text: "58", emoji: "5️⃣8️⃣", isCorrect: false },
      { id: "d", text: "63", emoji: "6️⃣3️⃣", isCorrect: false },
    ],
    difficulty: 7, topics: ["multiplication"], explanation: "7 × 8 = 56. Remember: 7 × 8 = 56 (7, 8, we ate 56!)", subject: "maths", yearLevel: "year3", hint: "7 × 8 rhymes with 56",
  },
  {
    questionId: uuidv4(),
    questionText: "What is 9 × 9?",
    answerOptions: [
      { id: "a", text: "72", emoji: "7️⃣2️⃣", isCorrect: false },
      { id: "b", text: "81", emoji: "8️⃣1️⃣", isCorrect: true },
      { id: "c", text: "80", emoji: "8️⃣0️⃣", isCorrect: false },
      { id: "d", text: "90", emoji: "9️⃣0️⃣", isCorrect: false },
    ],
    difficulty: 7, topics: ["multiplication"], explanation: "9 × 9 = 81. The 9 times table: the digits always add to 9 (8+1=9)!", subject: "maths", yearLevel: "year3", hint: "The 9 times table trick: use your fingers",
  },
  // ==================== YEAR 3 MATHS - ADDITION (difficulty 4-6) ====================
  {
    questionId: uuidv4(),
    questionText: "What is 45 + 37?",
    answerOptions: [
      { id: "a", text: "72", emoji: "7️⃣2️⃣", isCorrect: false },
      { id: "b", text: "82", emoji: "8️⃣2️⃣", isCorrect: true },
      { id: "c", text: "83", emoji: "8️⃣3️⃣", isCorrect: false },
      { id: "d", text: "75", emoji: "7️⃣5️⃣", isCorrect: false },
    ],
    difficulty: 5, topics: ["addition"], explanation: "45 + 37: Add ones 5+7=12, write 2 carry 1. Add tens 4+3+1=8. Answer: 82!", subject: "maths", yearLevel: "year3", hint: "Add ones first, then tens",
  },
  {
    questionId: uuidv4(),
    questionText: "What is 123 + 456?",
    answerOptions: [
      { id: "a", text: "579", emoji: "5️⃣7️⃣9️⃣", isCorrect: true },
      { id: "b", text: "589", emoji: "5️⃣8️⃣9️⃣", isCorrect: false },
      { id: "c", text: "579", emoji: "5️⃣7️⃣0️⃣", isCorrect: false },
      { id: "d", text: "600", emoji: "6️⃣0️⃣0️⃣", isCorrect: false },
    ],
    difficulty: 6, topics: ["addition"], explanation: "123 + 456 = 579. Add each column: 3+6=9, 2+5=7, 1+4=5!", subject: "maths", yearLevel: "year3", hint: "Add each column starting from ones",
  },
  // ==================== YEAR 3 MATHS - TIME ====================
  {
    questionId: uuidv4(),
    questionText: "How many minutes are in an hour?",
    answerOptions: [
      { id: "a", text: "30 minutes", emoji: "🕧", isCorrect: false },
      { id: "b", text: "60 minutes", emoji: "🕐", isCorrect: true },
      { id: "c", text: "100 minutes", emoji: "💯", isCorrect: false },
      { id: "d", text: "24 minutes", emoji: "2️⃣4️⃣", isCorrect: false },
    ],
    difficulty: 4, topics: ["time"], explanation: "There are 60 minutes in one hour!", subject: "maths", yearLevel: "year3", hint: "Think about a clock face",
  },
  {
    questionId: uuidv4(),
    questionText: "What time is it if the clock shows 3:30?",
    answerOptions: [
      { id: "a", text: "Three o'clock", emoji: "🕒", isCorrect: false },
      { id: "b", text: "Half past three", emoji: "🕞", isCorrect: true },
      { id: "c", text: "Quarter past three", emoji: "🕒", isCorrect: false },
      { id: "d", text: "Quarter to four", emoji: "🕓", isCorrect: false },
    ],
    difficulty: 5, topics: ["time"], explanation: "3:30 is half past three because the minute hand points to 6 (30 minutes)!", subject: "maths", yearLevel: "year3", hint: "30 minutes = half an hour",
  },

  // ==================== PREP ENGLISH - PHONICS (difficulty 1-3) ====================
  {
    questionId: uuidv4(),
    questionText: "What sound does the letter 'A' make?",
    answerOptions: [
      { id: "a", text: "buh", emoji: "🐝", isCorrect: false },
      { id: "b", text: "ah/ay", emoji: "🍎", isCorrect: true },
      { id: "c", text: "cuh", emoji: "🐱", isCorrect: false },
      { id: "d", text: "duh", emoji: "🐶", isCorrect: false },
    ],
    difficulty: 1, topics: ["phonics"], explanation: "The letter A makes the 'ah' sound like in Apple! 🍎", subject: "english", yearLevel: "prep", hint: "Think of Apple - what's the first sound?",
  },
  {
    questionId: uuidv4(),
    questionText: "Which word starts with the letter 'B'?",
    answerOptions: [
      { id: "a", text: "Cat", emoji: "🐱", isCorrect: false },
      { id: "b", text: "Ball", emoji: "⚽", isCorrect: true },
      { id: "c", text: "Dog", emoji: "🐶", isCorrect: false },
      { id: "d", text: "Sun", emoji: "☀️", isCorrect: false },
    ],
    difficulty: 1, topics: ["phonics", "letter-recognition"], explanation: "Ball starts with B! B makes the 'buh' sound!", subject: "english", yearLevel: "prep", hint: "Say each word out loud - which starts with 'buh'?",
  },
  {
    questionId: uuidv4(),
    questionText: "What letter does 'Sun' start with?",
    answerOptions: [
      { id: "a", text: "T", emoji: "🌴", isCorrect: false },
      { id: "b", text: "S", emoji: "☀️", isCorrect: true },
      { id: "c", text: "C", emoji: "🌊", isCorrect: false },
      { id: "d", text: "R", emoji: "🌈", isCorrect: false },
    ],
    difficulty: 1, topics: ["phonics", "letter-recognition"], explanation: "Sun starts with S! S makes a 'sss' sound like a snake! 🐍", subject: "english", yearLevel: "prep", hint: "Say 'Sun' slowly - sss-un",
  },
  {
    questionId: uuidv4(),
    questionText: "Which picture rhymes with 'cat'? 🐱",
    answerOptions: [
      { id: "a", text: "Dog 🐶", emoji: "🐶", isCorrect: false },
      { id: "b", text: "Hat 🎩", emoji: "🎩", isCorrect: true },
      { id: "c", text: "Sun ☀️", emoji: "☀️", isCorrect: false },
      { id: "d", text: "Fish 🐟", emoji: "🐟", isCorrect: false },
    ],
    difficulty: 2, topics: ["phonics"], explanation: "Cat and Hat rhyme! They both end in '-at'!", subject: "english", yearLevel: "prep", hint: "Which word ends the same as cat?",
  },
  {
    questionId: uuidv4(),
    questionText: "Which word has the 'oo' sound?",
    answerOptions: [
      { id: "a", text: "Cat 🐱", emoji: "🐱", isCorrect: false },
      { id: "b", text: "Moon 🌙", emoji: "🌙", isCorrect: true },
      { id: "c", text: "Dog 🐶", emoji: "🐶", isCorrect: false },
      { id: "d", text: "Sun ☀️", emoji: "☀️", isCorrect: false },
    ],
    difficulty: 2, topics: ["phonics"], explanation: "Moon has the 'oo' sound! Mo-oo-n!", subject: "english", yearLevel: "prep", hint: "Say each word and listen for the 'oo' sound",
  },
  // ==================== PREP ENGLISH - SIGHT WORDS (difficulty 2-4) ====================
  {
    questionId: uuidv4(),
    questionText: "Which is the word 'the'?",
    answerOptions: [
      { id: "a", text: "teh", emoji: "❌", isCorrect: false },
      { id: "b", text: "the", emoji: "✅", isCorrect: true },
      { id: "c", text: "thi", emoji: "❌", isCorrect: false },
      { id: "d", text: "tha", emoji: "❌", isCorrect: false },
    ],
    difficulty: 2, topics: ["sight-words"], explanation: "The correct spelling is 'the' - a very common word we use all the time!", subject: "english", yearLevel: "prep", hint: "The most common word in English",
  },
  {
    questionId: uuidv4(),
    questionText: "Which word means the opposite of 'big'?",
    answerOptions: [
      { id: "a", text: "Huge 🐘", emoji: "🐘", isCorrect: false },
      { id: "b", text: "Small 🐭", emoji: "🐭", isCorrect: true },
      { id: "c", text: "Tall 🦒", emoji: "🦒", isCorrect: false },
      { id: "d", text: "Heavy ⚖️", emoji: "⚖️", isCorrect: false },
    ],
    difficulty: 3, topics: ["sight-words", "vocabulary"], explanation: "The opposite of big is small! A mouse is small, an elephant is big!", subject: "english", yearLevel: "prep", hint: "Think of the smallest animal",
  },
  // ==================== YEAR 3 ENGLISH - GRAMMAR (difficulty 5-8) ====================
  {
    questionId: uuidv4(),
    questionText: "Choose the correct sentence:",
    answerOptions: [
      { id: "a", text: "She go to school", emoji: "❌", isCorrect: false },
      { id: "b", text: "She goes to school", emoji: "✅", isCorrect: true },
      { id: "c", text: "She goed to school", emoji: "❌", isCorrect: false },
      { id: "d", text: "She going to school", emoji: "❌", isCorrect: false },
    ],
    difficulty: 5, topics: ["grammar"], explanation: "The correct verb form is 'goes'. For he/she/it, we add -s to the verb!", subject: "english", yearLevel: "year3", hint: "With 'she', the verb needs -s",
  },
  {
    questionId: uuidv4(),
    questionText: "Which word is a noun?",
    answerOptions: [
      { id: "a", text: "Run 🏃", emoji: "🏃", isCorrect: false },
      { id: "b", text: "Happy 😊", emoji: "😊", isCorrect: false },
      { id: "c", text: "Elephant 🐘", emoji: "🐘", isCorrect: true },
      { id: "d", text: "Quickly ⚡", emoji: "⚡", isCorrect: false },
    ],
    difficulty: 5, topics: ["grammar"], explanation: "Elephant is a noun - it's a person, place, or thing! Run is a verb, Happy is an adjective.", subject: "english", yearLevel: "year3", hint: "A noun is a person, place, or thing",
  },
  {
    questionId: uuidv4(),
    questionText: "Add the correct punctuation: 'What is your name'",
    answerOptions: [
      { id: "a", text: "What is your name.", emoji: ".", isCorrect: false },
      { id: "b", text: "What is your name!", emoji: "!", isCorrect: false },
      { id: "c", text: "What is your name?", emoji: "?", isCorrect: true },
      { id: "d", text: "What is your name,", emoji: ",", isCorrect: false },
    ],
    difficulty: 4, topics: ["grammar", "punctuation"], explanation: "Questions end with a question mark (?). 'What' tells us it's asking something!", subject: "english", yearLevel: "year3", hint: "The sentence is asking something",
  },
  {
    questionId: uuidv4(),
    questionText: "Which is the correct plural of 'child'?",
    answerOptions: [
      { id: "a", text: "Childs", emoji: "❌", isCorrect: false },
      { id: "b", text: "Childrens", emoji: "❌", isCorrect: false },
      { id: "c", text: "Children", emoji: "✅", isCorrect: true },
      { id: "d", text: "Childes", emoji: "❌", isCorrect: false },
    ],
    difficulty: 6, topics: ["grammar", "vocabulary"], explanation: "Child has an irregular plural - Children! Some words don't just add -s!", subject: "english", yearLevel: "year3", hint: "Some words change completely in plural",
  },
  // ==================== YEAR 3 ENGLISH - SPELLING (difficulty 5-8) ====================
  {
    questionId: uuidv4(),
    questionText: "Which is spelled correctly?",
    answerOptions: [
      { id: "a", text: "Frend", emoji: "❌", isCorrect: false },
      { id: "b", text: "Freind", emoji: "❌", isCorrect: false },
      { id: "c", text: "Friend", emoji: "✅", isCorrect: true },
      { id: "d", text: "Freend", emoji: "❌", isCorrect: false },
    ],
    difficulty: 5, topics: ["spelling"], explanation: "Friend is spelled F-R-I-E-N-D. Remember: 'i before e except after c'!", subject: "english", yearLevel: "year3", hint: "Remember: i before e",
  },
  {
    questionId: uuidv4(),
    questionText: "Which word is spelled correctly?",
    answerOptions: [
      { id: "a", text: "Becuase", emoji: "❌", isCorrect: false },
      { id: "b", text: "Because", emoji: "✅", isCorrect: true },
      { id: "c", text: "Becouse", emoji: "❌", isCorrect: false },
      { id: "d", text: "Beecause", emoji: "❌", isCorrect: false },
    ],
    difficulty: 6, topics: ["spelling"], explanation: "Because is spelled B-E-C-A-U-S-E. Break it up: be-cause!", subject: "english", yearLevel: "year3", hint: "Break the word into parts: be-cause",
  },
  // ==================== YEAR 3 ENGLISH - READING COMPREHENSION ====================
  {
    questionId: uuidv4(),
    questionText: "Tom has a red ball. He plays with it every day. What colour is Tom's ball?",
    answerOptions: [
      { id: "a", text: "Blue 🔵", emoji: "🔵", isCorrect: false },
      { id: "b", text: "Red 🔴", emoji: "🔴", isCorrect: true },
      { id: "c", text: "Green 🟢", emoji: "🟢", isCorrect: false },
      { id: "d", text: "Yellow 🟡", emoji: "🟡", isCorrect: false },
    ],
    difficulty: 4, topics: ["reading-comprehension"], explanation: "The text says 'Tom has a RED ball' - so the answer is red!", subject: "english", yearLevel: "year3", hint: "Look for the describing word before 'ball'",
  },
  {
    questionId: uuidv4(),
    questionText: "Sara woke up early. She ate breakfast and went to school. Why did Sara wake up early?",
    answerOptions: [
      { id: "a", text: "She was hungry 🍳", emoji: "🍳", isCorrect: false },
      { id: "b", text: "To go to school 🎒", emoji: "🎒", isCorrect: true },
      { id: "c", text: "To watch TV 📺", emoji: "📺", isCorrect: false },
      { id: "d", text: "To play outside 🌳", emoji: "🌳", isCorrect: false },
    ],
    difficulty: 5, topics: ["reading-comprehension"], explanation: "Sara woke up early and then went to school - she woke up early for school!", subject: "english", yearLevel: "year3", hint: "What did Sara do after breakfast?",
  },
  // ==================== MORE PREP QUESTIONS ====================
  {
    questionId: uuidv4(),
    questionText: "What is 0 + 5?",
    answerOptions: [
      { id: "a", text: "0", emoji: "0️⃣", isCorrect: false },
      { id: "b", text: "5", emoji: "5️⃣", isCorrect: true },
      { id: "c", text: "10", emoji: "🔟", isCorrect: false },
      { id: "d", text: "1", emoji: "1️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["addition"], explanation: "0 + 5 = 5. Adding zero to anything keeps it the same!", subject: "maths", yearLevel: "prep", hint: "Zero means nothing, so you keep all 5",
  },
  {
    questionId: uuidv4(),
    questionText: "What number comes before 10?",
    answerOptions: [
      { id: "a", text: "8", emoji: "8️⃣", isCorrect: false },
      { id: "b", text: "9", emoji: "9️⃣", isCorrect: true },
      { id: "c", text: "11", emoji: "1️⃣1️⃣", isCorrect: false },
      { id: "d", text: "7", emoji: "7️⃣", isCorrect: false },
    ],
    difficulty: 2, topics: ["counting"], explanation: "9 comes before 10. Count: ...8, 9, 10!", subject: "maths", yearLevel: "prep", hint: "Count backwards from 10",
  },
  {
    questionId: uuidv4(),
    questionText: "Which is the biggest number?",
    answerOptions: [
      { id: "a", text: "3", emoji: "3️⃣", isCorrect: false },
      { id: "b", text: "7", emoji: "7️⃣", isCorrect: false },
      { id: "c", text: "9", emoji: "9️⃣", isCorrect: true },
      { id: "d", text: "5", emoji: "5️⃣", isCorrect: false },
    ],
    difficulty: 3, topics: ["counting"], explanation: "9 is the biggest! Count: 3, 5, 7, 9 - we counted up to 9!", subject: "maths", yearLevel: "prep", hint: "Which number do you reach last when counting?",
  },
  {
    questionId: uuidv4(),
    questionText: "Which shape has no corners?",
    answerOptions: [
      { id: "a", text: "Triangle 🔺", emoji: "🔺", isCorrect: false },
      { id: "b", text: "Square ⬜", emoji: "⬜", isCorrect: false },
      { id: "c", text: "Circle ⭕", emoji: "⭕", isCorrect: true },
      { id: "d", text: "Rectangle ▬", emoji: "▬", isCorrect: false },
    ],
    difficulty: 2, topics: ["shapes"], explanation: "A circle is completely round with no corners at all!", subject: "maths", yearLevel: "prep", hint: "A round shape has no pointy corners",
  },
  // More Year 3 Maths
  {
    questionId: uuidv4(),
    questionText: "What is 250 - 120?",
    answerOptions: [
      { id: "a", text: "130", emoji: "1️⃣3️⃣0️⃣", isCorrect: true },
      { id: "b", text: "120", emoji: "1️⃣2️⃣0️⃣", isCorrect: false },
      { id: "c", text: "140", emoji: "1️⃣4️⃣0️⃣", isCorrect: false },
      { id: "d", text: "370", emoji: "3️⃣7️⃣0️⃣", isCorrect: false },
    ],
    difficulty: 5, topics: ["subtraction"], explanation: "250 - 120 = 130. Subtract each column: 0-0=0, 5-2=3, 2-1=1. Answer: 130!", subject: "maths", yearLevel: "year3", hint: "Subtract each column from right to left",
  },
  {
    questionId: uuidv4(),
    questionText: "Which fraction is bigger: 1/2 or 1/4?",
    answerOptions: [
      { id: "a", text: "1/4 (one quarter)", emoji: "🍕", isCorrect: false },
      { id: "b", text: "1/2 (one half)", emoji: "🍰", isCorrect: true },
      { id: "c", text: "They are equal", emoji: "⚖️", isCorrect: false },
      { id: "d", text: "Cannot tell", emoji: "🤷", isCorrect: false },
    ],
    difficulty: 6, topics: ["measurement"], explanation: "1/2 is bigger than 1/4. If you cut a pizza in half, each piece is bigger than if you cut it into 4 pieces!", subject: "maths", yearLevel: "year3", hint: "Would you rather half a pizza or a quarter?",
  },
  {
    questionId: uuidv4(),
    questionText: "How many centimetres in a metre?",
    answerOptions: [
      { id: "a", text: "10 cm", emoji: "1️⃣0️⃣", isCorrect: false },
      { id: "b", text: "100 cm", emoji: "💯", isCorrect: true },
      { id: "c", text: "1000 cm", emoji: "1️⃣0️⃣0️⃣0️⃣", isCorrect: false },
      { id: "d", text: "50 cm", emoji: "5️⃣0️⃣", isCorrect: false },
    ],
    difficulty: 5, topics: ["measurement"], explanation: "There are 100 centimetres in 1 metre! Centi means 100!", subject: "maths", yearLevel: "year3", hint: "Think about a ruler - how many cm in a metre ruler?",
  },
  // Year 3 English - Vocabulary
  {
    questionId: uuidv4(),
    questionText: "What is a synonym for 'happy'?",
    answerOptions: [
      { id: "a", text: "Sad 😢", emoji: "😢", isCorrect: false },
      { id: "b", text: "Joyful 😄", emoji: "😄", isCorrect: true },
      { id: "c", text: "Angry 😠", emoji: "😠", isCorrect: false },
      { id: "d", text: "Tired 😴", emoji: "😴", isCorrect: false },
    ],
    difficulty: 5, topics: ["vocabulary", "grammar"], explanation: "A synonym means the same thing! Joyful means happy!", subject: "english", yearLevel: "year3", hint: "Which word means the SAME as happy?",
  },
  {
    questionId: uuidv4(),
    questionText: "Choose the correct form: 'Yesterday, she __ to the park.'",
    answerOptions: [
      { id: "a", text: "go", emoji: "❌", isCorrect: false },
      { id: "b", text: "goes", emoji: "❌", isCorrect: false },
      { id: "c", text: "went", emoji: "✅", isCorrect: true },
      { id: "d", text: "going", emoji: "❌", isCorrect: false },
    ],
    difficulty: 6, topics: ["grammar"], explanation: "Yesterday is past tense, so we use 'went' (past tense of 'go')!", subject: "english", yearLevel: "year3", hint: "'Yesterday' means it already happened",
  },
  {
    questionId: uuidv4(),
    questionText: "Which sentence has the correct capital letter?",
    answerOptions: [
      { id: "a", text: "my dog is brown.", emoji: "❌", isCorrect: false },
      { id: "b", text: "My Dog Is Brown.", emoji: "❌", isCorrect: false },
      { id: "c", text: "My dog is brown.", emoji: "✅", isCorrect: true },
      { id: "d", text: "my Dog is brown.", emoji: "❌", isCorrect: false },
    ],
    difficulty: 4, topics: ["grammar", "punctuation"], explanation: "Sentences start with ONE capital letter - only the first word is capitalised!", subject: "english", yearLevel: "year3", hint: "Only the first word needs a capital",
  },
];

export async function GET(req: NextRequest) {
  // Simple auth check - only allow in development or with a secret
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
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Failed to seed questions" }, { status: 500 });
  }
}
