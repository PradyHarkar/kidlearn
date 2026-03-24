import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as amplify from "aws-cdk-lib/aws-amplify";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface KidLearnStackProps extends cdk.StackProps {
  githubOwner: string;   // e.g. "prady"
  githubRepo: string;    // e.g. "kidlearn"
  githubBranch?: string; // default "master"
  amplifyGithubToken?: string; // personal access token for Amplify ↔ GitHub
}

export class KidLearnStack extends cdk.Stack {
  /** The deployed Amplify app URL — available as a CloudFormation output */
  public readonly appUrl: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: KidLearnStackProps) {
    super(scope, id, props);

    const { githubOwner, githubRepo, githubBranch = "master" } = props;

    // -----------------------------------------------------------------------
    // DynamoDB Tables
    // 6 tables already exist (created via setup-dynamodb.ts) — import them.
    // subscriptions is new — CDK creates it.
    // -----------------------------------------------------------------------

    const usersTable = dynamodb.Table.fromTableName(this, "UsersTable", "kidlearn-users");
    const childrenTable = dynamodb.Table.fromTableName(this, "ChildrenTable", "kidlearn-children");
    const questionsTable = dynamodb.Table.fromTableName(this, "QuestionsTable", "kidlearn-questions");
    const progressTable = dynamodb.Table.fromTableName(this, "ProgressTable", "kidlearn-progress");
    const achievementsTable = dynamodb.Table.fromTableName(this, "AchievementsTable", "kidlearn-achievements");
    const sessionsTable = dynamodb.Table.fromTableName(this, "SessionsTable", "kidlearn-sessions");

    const subscriptionsTable = dynamodb.Table.fromTableName(this, "SubscriptionsTable", "kidlearn-subscriptions");

    const allTables = [
      usersTable, childrenTable, questionsTable, progressTable,
      achievementsTable, sessionsTable, subscriptionsTable,
    ];

    // -----------------------------------------------------------------------
    // IAM Policy for the app (Amplify service role + GitHub Actions role)
    // -----------------------------------------------------------------------

    const appPolicy = new iam.ManagedPolicy(this, "KidLearnAppPolicy", {
      managedPolicyName: "KidLearnAppPolicy",
      statements: [
        new iam.PolicyStatement({
          sid: "DynamoDB",
          actions: [
            "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem",
            "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:Scan",
            "dynamodb:BatchGetItem", "dynamodb:BatchWriteItem",
          ],
          resources: allTables.flatMap((t) => [t.tableArn, `${t.tableArn}/index/*`]),
        }),
        new iam.PolicyStatement({
          sid: "Bedrock",
          actions: ["bedrock:InvokeModel"],
          resources: [
            `arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`,
          ],
        }),
        new iam.PolicyStatement({
          sid: "SecretsManager",
          actions: ["secretsmanager:GetSecretValue"],
          resources: [
            `arn:aws:secretsmanager:${this.region}:${this.account}:secret:kidlearn/*`,
          ],
        }),
        new iam.PolicyStatement({
          sid: "SES",
          actions: ["ses:SendEmail", "ses:SendRawEmail"],
          resources: ["*"],
        }),
      ],
    });

    // -----------------------------------------------------------------------
    // GitHub Actions OIDC — no static IAM access keys needed
    // -----------------------------------------------------------------------

    const githubOidcProvider = new iam.OpenIdConnectProvider(this, "GitHubOidcProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    const githubActionsRole = new iam.Role(this, "GitHubActionsRole", {
      roleName: "kidlearn-github-actions",
      assumedBy: new iam.WebIdentityPrincipal(githubOidcProvider.openIdConnectProviderArn, {
        StringLike: {
          "token.actions.githubusercontent.com:sub": `repo:${githubOwner}/${githubRepo}:*`,
        },
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        },
      }),
    });
    githubActionsRole.addManagedPolicy(appPolicy);
    // Allow GitHub Actions to trigger Amplify deployments
    githubActionsRole.addToPolicy(new iam.PolicyStatement({
      actions: ["amplify:StartJob", "amplify:GetJob", "amplify:ListJobs"],
      resources: ["*"],
    }));

    // -----------------------------------------------------------------------
    // Amplify App
    // -----------------------------------------------------------------------

    const amplifyRole = new iam.Role(this, "AmplifyServiceRole", {
      roleName: "kidlearn-amplify-service-role",
      assumedBy: new iam.ServicePrincipal("amplify.amazonaws.com"),
    });
    amplifyRole.addManagedPolicy(appPolicy);

    // Build environment variables for Amplify (non-secret ones)
    const buildEnv: Record<string, string> = {
      // Note: AWS_REGION is injected automatically by Amplify — cannot set it here
      BEDROCK_REGION: "us-east-1",
      BEDROCK_MODEL_ID: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      DYNAMODB_USERS_TABLE: "kidlearn-users",
      DYNAMODB_CHILDREN_TABLE: "kidlearn-children",
      DYNAMODB_QUESTIONS_TABLE: "kidlearn-questions",
      DYNAMODB_PROGRESS_TABLE: "kidlearn-progress",
      DYNAMODB_ACHIEVEMENTS_TABLE: "kidlearn-achievements",
      DYNAMODB_SESSIONS_TABLE: "kidlearn-sessions",
      DYNAMODB_SUBSCRIPTIONS_TABLE: "kidlearn-subscriptions",
      NODE_ENV: "production",
    };

    const amplifyApp = new amplify.CfnApp(this, "AmplifyApp", {
      name: "kidlearn",
      repository: `https://github.com/${githubOwner}/${githubRepo}`,
      platform: "WEB_COMPUTE",   // Next.js SSR — NOT static
      // Use access token stored in Secrets Manager (set separately)
      accessToken: props.amplifyGithubToken,
      iamServiceRole: amplifyRole.roleArn,
      buildSpec: [
        "version: 1",
        "frontend:",
        "  phases:",
        "    preBuild:",
        "      commands:",
        "        - nvm use 20 || true",
        "        - npm ci",
        "    build:",
        "      commands:",
        "        - npm run build",
        "  artifacts:",
        "    baseDirectory: .next",
        "    files:",
        "      - '**/*'",
        "  cache:",
        "    paths:",
        "      - node_modules/**/*",
        "      - .next/cache/**/*",
      ].join("\n"),
      environmentVariables: Object.entries(buildEnv).map(([name, value]) => ({ name, value })),
    });

    const amplifyBranch = new amplify.CfnBranch(this, "AmplifyMasterBranch", {
      appId: amplifyApp.attrAppId,
      branchName: githubBranch,
      enableAutoBuild: false,  // GitHub Actions controls builds (ensures env vars are set first)
      stage: "PRODUCTION",
      framework: "Next.js - SSR",
    });

    // -----------------------------------------------------------------------
    // Outputs
    // -----------------------------------------------------------------------

    this.appUrl = new cdk.CfnOutput(this, "AppUrl", {
      value: `https://${githubBranch}.${amplifyApp.attrAppId}.amplifyapp.com`,
      description: "KidLearn app URL",
      exportName: "KidLearnAppUrl",
    });

    new cdk.CfnOutput(this, "GitHubActionsRoleArn", {
      value: githubActionsRole.roleArn,
      description: "Use this ARN as the AWS_ROLE_ARN GitHub Secret",
      exportName: "KidLearnGitHubActionsRoleArn",
    });

    new cdk.CfnOutput(this, "AmplifyAppId", {
      value: amplifyApp.attrAppId,
      description: "Use this as the AMPLIFY_APP_ID GitHub Secret",
      exportName: "KidLearnAmplifyAppId",
    });

    new cdk.CfnOutput(this, "Region", {
      value: this.region,
      exportName: "KidLearnRegion",
    });

    // Tag all resources
    cdk.Tags.of(this).add("Project", "kidlearn");
    cdk.Tags.of(this).add("ManagedBy", "cdk");
  }
}
