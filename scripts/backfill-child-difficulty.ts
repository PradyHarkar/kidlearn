/**
 * One-off migration: backfill existing children's difficulty fields
 * based on their ageGroup.
 *
 * Children created before the year-based difficulty fix were all stored
 * with currentDifficultyMaths/English/Science = 1 regardless of grade.
 * This script corrects that for every child in DynamoDB.
 *
 * Usage:
 *   npx tsx scripts/backfill-child-difficulty.ts [--dry-run]
 *
 * Requires AWS credentials in env (same as the main app).
 */

import { DynamoDBClient, ScanCommand, ScanCommandInput } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const INITIAL_DIFFICULTY_BY_AGE_GROUP: Record<string, number> = {
  foundation: 1,
  year1: 2,
  year2: 3,
  year3: 4,
  year4: 5,
  year5: 6,
  year6: 7,
  year7: 8,
  year8: 9,
};

function toAgeGroup(level: string): string {
  return level === "prep" ? "foundation" : level;
}

function difficultyForChild(ageGroup: string | undefined, yearLevel: string | undefined): number {
  const resolved = ageGroup
    ? toAgeGroup(ageGroup)
    : yearLevel
    ? toAgeGroup(yearLevel)
    : "foundation";
  return INITIAL_DIFFICULTY_BY_AGE_GROUP[resolved] ?? 1;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const tableName = process.env.DYNAMODB_CHILDREN_TABLE || "kidlearn-children";

  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "ap-southeast-2",
    ...(process.env.AWS_ACCESS_KEY_ID && {
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    }),
  });
  const ddb = DynamoDBDocumentClient.from(client);

  console.log(`Backfill child difficulty — table: ${tableName}${dryRun ? " [DRY RUN]" : ""}`);

  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    const params: ScanCommandInput = {
      TableName: tableName,
      ExclusiveStartKey: lastKey as ScanCommandInput["ExclusiveStartKey"],
    };

    const result = await client.send(new ScanCommand(params));
    const items = (result.Items || []).map((item) => unmarshall(item));

    for (const child of items) {
      scanned++;
      const ageGroup: string | undefined = child.ageGroup;
      const yearLevel: string | undefined = child.yearLevel;
      const expectedDifficulty = difficultyForChild(ageGroup, yearLevel);

      const currentMaths = child.currentDifficultyMaths;
      const currentEnglish = child.currentDifficultyEnglish;
      const currentScience = child.currentDifficultyScience ?? 1;

      // Only update children whose difficulty is clearly below what their age group warrants.
      // We set it if it's currently at the old default of 1 and the expected is higher.
      const needsUpdate =
        (currentMaths === 1 || currentEnglish === 1 || currentScience === 1) &&
        expectedDifficulty > 1;

      if (!needsUpdate) {
        skipped++;
        continue;
      }

      const newMaths = currentMaths === 1 ? expectedDifficulty : currentMaths;
      const newEnglish = currentEnglish === 1 ? expectedDifficulty : currentEnglish;
      const newScience = currentScience === 1 ? expectedDifficulty : currentScience;

      console.log(
        `  ${child.childName} (${child.childId.slice(0, 8)}…) ` +
        `ageGroup=${ageGroup ?? yearLevel} → difficulty ${expectedDifficulty} ` +
        `[maths: ${currentMaths}→${newMaths}, english: ${currentEnglish}→${newEnglish}, science: ${currentScience}→${newScience}]`
      );

      if (!dryRun) {
        await ddb.send(new UpdateCommand({
          TableName: tableName,
          Key: { userId: child.userId, childId: child.childId },
          UpdateExpression:
            "SET currentDifficultyMaths = :m, currentDifficultyEnglish = :e, currentDifficultyScience = :s",
          ExpressionAttributeValues: {
            ":m": newMaths,
            ":e": newEnglish,
            ":s": newScience,
          },
        }));
      }

      updated++;
    }

    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  console.log(`\nDone. Scanned ${scanned}, updated ${updated}, skipped ${skipped}${dryRun ? " (dry run — no writes)" : ""}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
