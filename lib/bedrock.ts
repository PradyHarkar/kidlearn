import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { Subject, YearLevel, Question, AnswerOption } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { putItem, queryItems, TABLES } from "./dynamodb";

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || "us-east-1",
  // Use explicit credentials locally; rely on IAM role in production (Amplify)
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});

const MODEL_ID = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-5-sonnet-20241022-v2:0";

interface BedrockGeneratedQuestion {
  question: string;
  options: { text: string; visualDescription: string; isCorrect: boolean }[];
  explanation: string;
  hint: string;
}

export async function generateQuestionsWithBedrock(
  subject: Subject,
  yearLevel: YearLevel,
  topic: string,
  difficulty: number,
  count: number = 5
): Promise<Question[]> {
  const ageRange = yearLevel === "prep" ? "5-6 year old" : "8-9 year old";
  const yearDesc = yearLevel === "prep" ? "Prep/Kindergarten" : "Year 3";

  const prompt = `Generate ${count} different ${subject} questions for a ${yearDesc} student (${ageRange}).
Topic: ${topic}
Difficulty level: ${difficulty}/10 (${getDifficultyDescription(difficulty)})

For each question, provide:
- A clear, age-appropriate question text
- Exactly 4 answer options (exactly 1 correct)
- A brief visual description for each option (emoji or simple image concept)
- A short explanation of the correct answer
- A helpful hint

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "What is 2 + 3?",
      "options": [
        {"text": "4", "visualDescription": "🔢 four dots", "isCorrect": false},
        {"text": "5", "visualDescription": "🔢 five dots", "isCorrect": true},
        {"text": "6", "visualDescription": "🔢 six dots", "isCorrect": false},
        {"text": "7", "visualDescription": "🔢 seven dots", "isCorrect": false}
      ],
      "explanation": "2 + 3 = 5. Count: 1, 2, then 3 more = 3, 4, 5!",
      "hint": "Start with 2 and count 3 more fingers"
    }
  ]
}`;

  try {
    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      })
    );

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const content = responseBody.content[0].text;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Bedrock response");

    const parsed = JSON.parse(jsonMatch[0]);
    const generatedQuestions: BedrockGeneratedQuestion[] = parsed.questions || [];

    const questions: Question[] = generatedQuestions.map((gq) => ({
      pk: `${subject}#${yearLevel}`,
      questionId: `bedrock-${uuidv4()}`,
      questionText: gq.question,
      answerOptions: gq.options.map((opt, idx) => ({
        id: `opt-${idx}`,
        text: opt.text,
        emoji: opt.visualDescription,
        isCorrect: opt.isCorrect,
      })) as AnswerOption[],
      difficulty,
      topics: [topic],
      explanation: gq.explanation,
      subject,
      yearLevel,
      hint: gq.hint,
      cached: false,
      createdAt: new Date().toISOString(),
    }));

    // Cache generated questions in DynamoDB
    for (const q of questions) {
      try {
        await putItem(TABLES.QUESTIONS, { ...q, cached: true });
      } catch {
        // Non-critical - continue even if caching fails
      }
    }

    return questions;
  } catch (error) {
    console.error("Bedrock generation failed:", error);
    throw error;
  }
}

function getDifficultyDescription(difficulty: number): string {
  if (difficulty <= 2) return "very easy, simple concepts";
  if (difficulty <= 4) return "easy, basic understanding";
  if (difficulty <= 6) return "moderate, applying knowledge";
  if (difficulty <= 8) return "challenging, deeper thinking";
  return "advanced, complex problem-solving";
}

export async function getCachedOrGenerateQuestions(
  subject: Subject,
  yearLevel: YearLevel,
  topic: string,
  difficulty: number,
  count: number = 10
): Promise<Question[]> {
  try {
    // Try to get cached questions first
    const cached = await queryItems(
      TABLES.QUESTIONS,
      "pk = :pk",
      { ":pk": `${subject}#${yearLevel}` },
      undefined,
      undefined,
      `difficulty = :diff`,
      50
    );

    const filtered = (cached as Question[]).filter(
      (q) => q.difficulty === difficulty && q.topics.includes(topic)
    );

    if (filtered.length >= count) {
      // Shuffle and return
      return filtered.sort(() => Math.random() - 0.5).slice(0, count);
    }

    // Generate new questions via Bedrock
    const generated = await generateQuestionsWithBedrock(subject, yearLevel, topic, difficulty, count);
    return generated;
  } catch (error) {
    console.error("Failed to get/generate questions:", error);
    throw error;
  }
}
