import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceInUseException,
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function tableExists(tableName: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch {
    return false;
  }
}

async function createTable(params: Parameters<typeof client.send>[0]["input"]) {
  const tableName = (params as { TableName: string }).TableName;
  if (await tableExists(tableName)) {
    console.log(`✓ Table ${tableName} already exists`);
    return;
  }
  try {
    await client.send(new CreateTableCommand(params as Parameters<typeof CreateTableCommand>[0]["input"]));
    console.log(`✓ Created table: ${tableName}`);
  } catch (error: unknown) {
    if (error instanceof ResourceInUseException) {
      console.log(`✓ Table ${tableName} already exists`);
    } else {
      console.error(`✗ Failed to create ${tableName}:`, error);
      throw error;
    }
  }
}

async function setupTables() {
  console.log("Setting up DynamoDB tables...\n");

  // Users table
  await createTable({
    TableName: "kidlearn-users",
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "email", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "email-index",
        KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  });

  // Children table
  await createTable({
    TableName: "kidlearn-children",
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "childId", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" },
      { AttributeName: "childId", KeyType: "RANGE" },
    ],
  });

  // Questions table
  await createTable({
    TableName: "kidlearn-questions",
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "pk", AttributeType: "S" },
      { AttributeName: "questionId", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "pk", KeyType: "HASH" },
      { AttributeName: "questionId", KeyType: "RANGE" },
    ],
  });

  // Progress table
  await createTable({
    TableName: "kidlearn-progress",
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "childId", AttributeType: "S" },
      { AttributeName: "sessionKey", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "childId", KeyType: "HASH" },
      { AttributeName: "sessionKey", KeyType: "RANGE" },
    ],
  });

  // Achievements table
  await createTable({
    TableName: "kidlearn-achievements",
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "childId", AttributeType: "S" },
      { AttributeName: "achievementId", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "childId", KeyType: "HASH" },
      { AttributeName: "achievementId", KeyType: "RANGE" },
    ],
  });

  // Sessions table (for NextAuth)
  await createTable({
    TableName: "kidlearn-sessions",
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "pk", AttributeType: "S" },
      { AttributeName: "sk", AttributeType: "S" },
      { AttributeName: "GSI1PK", AttributeType: "S" },
      { AttributeName: "GSI1SK", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "pk", KeyType: "HASH" },
      { AttributeName: "sk", KeyType: "RANGE" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "GSI1",
        KeySchema: [
          { AttributeName: "GSI1PK", KeyType: "HASH" },
          { AttributeName: "GSI1SK", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    TimeToLiveSpecification: {
      AttributeName: "expires",
      Enabled: true,
    },
  });

  console.log("\n✅ All DynamoDB tables set up successfully!");
}

setupTables().catch(console.error);
