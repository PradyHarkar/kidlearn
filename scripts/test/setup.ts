/**
 * TEST DATA SETUP
 * ───────────────
 * Seeds DynamoDB with all fixtures needed for the test suite.
 * Safe to re-run — uses fixed IDs so duplicates are just overwrites.
 *
 * Usage:
 *   npx tsx scripts/test/setup.ts
 *
 * Requires AWS credentials in env.
 */

import bcrypt from "bcryptjs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import {
  TEST_USERS, TEST_CHILDREN, TEST_QUESTION_PARTITIONS,
  makeTestQuestions,
} from "./fixtures";

const TABLES = {
  USERS:         process.env.DYNAMODB_USERS_TABLE         || "kidlearn-users",
  CHILDREN:      process.env.DYNAMODB_CHILDREN_TABLE      || "kidlearn-children",
  QUESTIONS:     process.env.DYNAMODB_QUESTIONS_TABLE     || "kidlearn-questions",
  SUBSCRIPTIONS: process.env.DYNAMODB_SUBSCRIPTIONS_TABLE || "kidlearn-subscriptions",
};

function createDdb() {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "ap-southeast-2",
    ...(process.env.AWS_ACCESS_KEY_ID && {
      credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    }),
  });
  return DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
}

async function seedUsers(ddb: DynamoDBDocumentClient) {
  console.log("  Seeding test users...");
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  for (const user of Object.values(TEST_USERS)) {
    const passwordHash = await bcrypt.hash(user.password, 8); // low rounds — test only
    await ddb.send(new PutCommand({
      TableName: TABLES.USERS,
      Item: {
        userId:             user.userId,
        email:              user.email.toLowerCase(),
        passwordHash,
        parentName:         user.parentName,
        country:            user.country,
        subscriptionStatus: "trial",
        trialEndsAt,
        createdAt:          new Date().toISOString(),
        _testFixture:       true,  // marker for teardown
      },
    }));
    console.log(`    ✓ ${user.email} (${user.country})`);
  }
}

async function seedChildren(ddb: DynamoDBDocumentClient) {
  console.log("  Seeding test children...");
  const now = new Date().toISOString();

  // AU children belong to AU parent
  const auUserId = TEST_USERS.AU_PARENT.userId;
  const usUserId = TEST_USERS.US_PARENT.userId;
  const inUserId = TEST_USERS.IN_PARENT.userId;
  const ukUserId = TEST_USERS.UK_PARENT.userId;

  const childRows = [
    { userId: auUserId, ...TEST_CHILDREN.AU_FOUNDATION,  country: "AU" },
    { userId: auUserId, ...TEST_CHILDREN.AU_YEAR1,        country: "AU" },
    { userId: auUserId, ...TEST_CHILDREN.AU_YEAR3,        country: "AU" },
    // Year 5/6/7/8 go under a second AU user (3 child limit) — reuse AU parent userId with extra suffix
    { userId: auUserId + "-b", ...TEST_CHILDREN.AU_YEAR5, country: "AU" },
    { userId: auUserId + "-b", ...TEST_CHILDREN.AU_YEAR6, country: "AU" },
    { userId: auUserId + "-b", ...TEST_CHILDREN.AU_YEAR7, country: "AU" },
    { userId: auUserId + "-b", ...TEST_CHILDREN.AU_YEAR8, country: "AU" },
    // Regression child: stored difficulty=1 but ageGroup=year5
    {
      userId: auUserId + "-b",
      ...TEST_CHILDREN.VED_REGRESSION,
      country: "AU",
      overrideDifficulty: 1, // simulates old buggy data
    },
    { userId: usUserId, ...TEST_CHILDREN.US_KINDER,  country: "US" },
    { userId: usUserId, ...TEST_CHILDREN.US_GRADE5,  country: "US" },
    { userId: usUserId, ...TEST_CHILDREN.US_GRADE8,  country: "US" },
    { userId: inUserId, ...TEST_CHILDREN.IN_CLASS8,  country: "IN" },
    { userId: ukUserId, ...TEST_CHILDREN.UK_RECEPTION, country: "UK" },
    { userId: ukUserId, ...TEST_CHILDREN.UK_YEAR7,    country: "UK" },
  ];

  for (const row of childRows) {
    const difficulty = ("overrideDifficulty" in row && typeof row.overrideDifficulty === "number")
      ? row.overrideDifficulty
      : row.expectedDifficulty;
    await ddb.send(new PutCommand({
      TableName: TABLES.CHILDREN,
      Item: {
        userId:                   row.userId,
        childId:                  row.childId,
        childName:                row.childName,
        grade:                    row.grade,
        country:                  row.country,
        ageGroup:                 row.ageGroup,
        yearLevel:                row.ageGroup === "foundation" ? "prep" : row.ageGroup,
        avatar:                   "🧪",
        diagnosticComplete:       false,
        currentDifficultyMaths:   difficulty,
        currentDifficultyEnglish: difficulty,
        currentDifficultyScience: difficulty,
        streakDays:               0,
        lastActiveDate:           now,
        totalCoins:               0,
        totalStars:               0,
        stats: {
          totalQuestionsAttempted: 0,
          totalCorrect:            0,
          mathsAccuracy:           0,
          englishAccuracy:         0,
          scienceAccuracy:         0,
          favoriteTopics:          [],
        },
        createdAt:    now,
        _testFixture: true,
      },
    }));
    console.log(`    ✓ ${row.childName} (difficulty=${difficulty})`);
  }
}

async function seedActiveSubscription(ddb: DynamoDBDocumentClient) {
  console.log("  Seeding active subscription fixture...");
  const { ACTIVE_SUB_PARENT } = TEST_USERS;
  const now = new Date().toISOString();
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Update the user record to have stripeCustomerId (needed for portal endpoint)
  const { UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
  await ddb.send(new UpdateCommand({
    TableName: TABLES.USERS,
    Key: { userId: ACTIVE_SUB_PARENT.userId },
    UpdateExpression: "SET stripeCustomerId = :cid",
    ExpressionAttributeValues: { ":cid": ACTIVE_SUB_PARENT.stripeCustomerId },
  }));

  // Seed a live active subscription record so the status API reads it from DynamoDB
  // (the user's JWT still says "trial" — this is the stale-JWT regression fixture)
  await ddb.send(new PutCommand({
    TableName: TABLES.SUBSCRIPTIONS,
    Item: {
      userId:               ACTIVE_SUB_PARENT.userId,
      subscriptionId:       ACTIVE_SUB_PARENT.subscriptionId,
      stripeSubscriptionId: "sub_test_tsunami_active",
      stripeCustomerId:     ACTIVE_SUB_PARENT.stripeCustomerId,
      status:               "active",
      plan:                 "weekly",
      currentPeriodEnd:     periodEnd,
      cancelAtPeriodEnd:    false,
      createdAt:            now,
      updatedAt:            now,
      _testFixture:         true,
    },
  }));
  console.log(`    ✓ subscription ${ACTIVE_SUB_PARENT.subscriptionId} (active) for ${ACTIVE_SUB_PARENT.email}`);
}

async function seedQuestions(ddb: DynamoDBDocumentClient) {
  console.log("  Seeding test questions...");

  for (const partition of TEST_QUESTION_PARTITIONS) {
    const questions = makeTestQuestions(
      partition.pk,
      partition.subject,
      partition.ageGroup,
      partition.country,
      partition.difficulty,
      15  // 15 per partition — enough for selectQuestionsByDifficulty to return 10
    );

    // BatchWrite in chunks of 25
    for (let i = 0; i < questions.length; i += 25) {
      const batch = questions.slice(i, i + 25);
      await ddb.send(new BatchWriteCommand({
        RequestItems: {
          [TABLES.QUESTIONS]: batch.map(q => ({ PutRequest: { Item: q } })),
        },
      }));
    }
    console.log(`    ✓ ${partition.pk} (${questions.length} questions, difficulty ${partition.difficulty})`);
  }
}

async function main() {
  console.log("\n🌊 KidLearn Test Data Setup\n");
  const ddb = createDdb();

  try {
    await seedUsers(ddb);
    await seedChildren(ddb);
    await seedQuestions(ddb);
    await seedActiveSubscription(ddb);
    console.log("\n✅ Test data seeded successfully.\n");
  } catch (err) {
    console.error("\n❌ Setup failed:", err);
    process.exit(1);
  }
}

main();
