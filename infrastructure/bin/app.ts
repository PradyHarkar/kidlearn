#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { KidLearnStack } from "../lib/kidlearn-stack";

const app = new cdk.App();

new KidLearnStack(app, "KidLearnStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "ap-southeast-2",
  },
  githubOwner: process.env.GITHUB_OWNER || "prady",
  githubRepo: process.env.GITHUB_REPO || "kidlearn",
  githubBranch: "master",
  // Set AMPLIFY_GITHUB_TOKEN env var with a GitHub Personal Access Token
  // that has repo scope — needed only for Amplify to pull source code
  amplifyGithubToken: process.env.AMPLIFY_GITHUB_TOKEN,
  description: "KidLearn edutech platform — DynamoDB, IAM, Amplify, OIDC",
});
