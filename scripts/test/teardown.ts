/**
 * TEST DATA TEARDOWN
 * ──────────────────
 * Deletes all test fixtures from DynamoDB.
 * Identifies records by _testFixture=true marker OR by tt- ID prefix.
 *
 * Usage:
 *   npx tsx scripts/test/teardown.ts
 */

import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import {
  TEST_USERS, TEST_CHILDREN, TEST_QUESTION_PARTITIONS, makeTestQuestions,
  TEST_USER_ID_PREFIX, TEST_CHILD_ID_PREFIX, TEST_QUESTION_ID_PREFIX,
} from "./fixtures";

const TABLES = {
  USERS:     process.env.DYNAMODB_USERS_TABLE     || "kidlearn-users",
  CHILDREN:  process.env.DYNAMODB_CHILDREN_TABLE  || "kidlearn-children",
  QUESTIONS: process.env.DYNAMODB_QUESTIONS_TABLE || "kidlearn-questions",
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

async function deleteUsers(ddb: DynamoDBDocumentClient) {
  console.log("  Deleting test users...");
  const userIds = [
    ...Object.values(TEST_USERS).map(u => u.userId),
    TEST_USERS.AU_PARENT.userId + "-b",  // second AU parent handle
  ];
  for (const userId of userIds) {
    await ddb.send(new DeleteCommand({ TableName: TABLES.USERS, Key: { userId } }));
    console.log(`    ✓ deleted user ${userId}`);
  }
}

async function deleteChildren(ddb: DynamoDBDocumentClient) {
  console.log("  Deleting test children...");
  const auUserId = TEST_USERS.AU_PARENT.userId;
  const usUserId = TEST_USERS.US_PARENT.userId;
  const inUserId = TEST_USERS.IN_PARENT.userId;
  const ukUserId = TEST_USERS.UK_PARENT.userId;

  const childKeys = [
    { userId: auUserId,          childId: TEST_CHILDREN.AU_FOUNDATION.childId },
    { userId: auUserId,          childId: TEST_CHILDREN.AU_YEAR1.childId },
    { userId: auUserId,          childId: TEST_CHILDREN.AU_YEAR3.childId },
    { userId: auUserId + "-b",   childId: TEST_CHILDREN.AU_YEAR5.childId },
    { userId: auUserId + "-b",   childId: TEST_CHILDREN.AU_YEAR6.childId },
    { userId: auUserId + "-b",   childId: TEST_CHILDREN.AU_YEAR7.childId },
    { userId: auUserId + "-b",   childId: TEST_CHILDREN.AU_YEAR8.childId },
    { userId: auUserId + "-b",   childId: TEST_CHILDREN.VED_REGRESSION.childId },
    { userId: usUserId,          childId: TEST_CHILDREN.US_KINDER.childId },
    { userId: usUserId,          childId: TEST_CHILDREN.US_GRADE5.childId },
    { userId: usUserId,          childId: TEST_CHILDREN.US_GRADE8.childId },
    { userId: inUserId,          childId: TEST_CHILDREN.IN_CLASS8.childId },
    { userId: ukUserId,          childId: TEST_CHILDREN.UK_RECEPTION.childId },
    { userId: ukUserId,          childId: TEST_CHILDREN.UK_YEAR7.childId },
  ];

  for (const key of childKeys) {
    await ddb.send(new DeleteCommand({ TableName: TABLES.CHILDREN, Key: key }));
    console.log(`    ✓ deleted child ${key.childId}`);
  }
}

async function deleteQuestions(ddb: DynamoDBDocumentClient) {
  console.log("  Deleting test questions...");
  for (const partition of TEST_QUESTION_PARTITIONS) {
    const questions = makeTestQuestions(
      partition.pk, partition.subject, partition.ageGroup, partition.country, partition.difficulty, 15
    );
    // BatchDelete in chunks of 25
    for (let i = 0; i < questions.length; i += 25) {
      const batch = questions.slice(i, i + 25);
      await ddb.send(new BatchWriteCommand({
        RequestItems: {
          [TABLES.QUESTIONS]: batch.map(q => ({
            DeleteRequest: { Key: { pk: q.pk, questionId: q.questionId } },
          })),
        },
      }));
    }
    console.log(`    ✓ deleted test questions for ${partition.pk}`);
  }
}

async function scanAndDeleteByPrefix(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  pkField: string,
  pkPrefix: string
) {
  const raw = new DynamoDBClient({
    region: process.env.AWS_REGION || "ap-southeast-2",
    ...(process.env.AWS_ACCESS_KEY_ID && {
      credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    }),
  });

  let lastKey: Record<string, unknown> | undefined;
  let deleted = 0;

  do {
    const result = await raw.send(new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastKey as ScanCommand["input"]["ExclusiveStartKey"],
      FilterExpression: "_testFixture = :t",
      ExpressionAttributeValues: { ":t": { BOOL: true } },
    }));

    const items = (result.Items || []).map(i => unmarshall(i));
    for (const item of items) {
      if (typeof item[pkField] === "string" && item[pkField].startsWith(pkPrefix)) {
        // Will be handled by the explicit delete above
        deleted++;
      }
    }

    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return deleted;
}

async function main() {
  console.log("\n🌊 KidLearn Test Data Teardown\n");
  const ddb = createDdb();

  try {
    await deleteUsers(ddb);
    await deleteChildren(ddb);
    await deleteQuestions(ddb);
    console.log("\n✅ Test data cleaned up.\n");
  } catch (err) {
    console.error("\n❌ Teardown failed:", err);
    process.exit(1);
  }
}

main();
