#!/usr/bin/env bash
# KidLearn AWS Infrastructure Setup
# Run once to create all DynamoDB tables and IAM resources.
# Usage: AWS_REGION=ap-southeast-2 bash scripts/setup-aws.sh

set -e

REGION=${AWS_REGION:-ap-southeast-2}
PREFIX="kidlearn"

echo "================================================================"
echo "  KidLearn AWS Infrastructure Setup"
echo "  Region: $REGION"
echo "================================================================"

# -----------------------------------------------------------------------
# Helper: create table if it doesn't already exist
# -----------------------------------------------------------------------
create_table_if_not_exists() {
  local TABLE_NAME=$1
  local TABLE_DEF=$2

  if aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" &>/dev/null; then
    echo "  [skip] $TABLE_NAME already exists"
  else
    echo "  [create] $TABLE_NAME ..."
    aws dynamodb create-table $TABLE_DEF --region "$REGION" --output text --query "TableDescription.TableStatus"
    aws dynamodb wait table-exists --table-name "$TABLE_NAME" --region "$REGION"
    echo "  [ok] $TABLE_NAME created"
  fi
}

echo ""
echo "--- DynamoDB Tables ---"

# USERS
create_table_if_not_exists "${PREFIX}-users" \
  "--table-name ${PREFIX}-users \
   --attribute-definitions \
     AttributeName=userId,AttributeType=S \
     AttributeName=email,AttributeType=S \
   --key-schema AttributeName=userId,KeyType=HASH \
   --billing-mode PAY_PER_REQUEST \
   --global-secondary-indexes '[
     {\"IndexName\":\"email-index\",\"KeySchema\":[{\"AttributeName\":\"email\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}
   ]'"

# CHILDREN
create_table_if_not_exists "${PREFIX}-children" \
  "--table-name ${PREFIX}-children \
   --attribute-definitions \
     AttributeName=userId,AttributeType=S \
     AttributeName=childId,AttributeType=S \
   --key-schema \
     AttributeName=userId,KeyType=HASH \
     AttributeName=childId,KeyType=RANGE \
   --billing-mode PAY_PER_REQUEST"

# QUESTIONS
create_table_if_not_exists "${PREFIX}-questions" \
  "--table-name ${PREFIX}-questions \
   --attribute-definitions \
     AttributeName=pk,AttributeType=S \
     AttributeName=questionId,AttributeType=S \
   --key-schema \
     AttributeName=pk,KeyType=HASH \
     AttributeName=questionId,KeyType=RANGE \
   --billing-mode PAY_PER_REQUEST"

# PROGRESS
create_table_if_not_exists "${PREFIX}-progress" \
  "--table-name ${PREFIX}-progress \
   --attribute-definitions \
     AttributeName=childId,AttributeType=S \
     AttributeName=sessionKey,AttributeType=S \
   --key-schema \
     AttributeName=childId,KeyType=HASH \
     AttributeName=sessionKey,KeyType=RANGE \
   --billing-mode PAY_PER_REQUEST"

# ACHIEVEMENTS
create_table_if_not_exists "${PREFIX}-achievements" \
  "--table-name ${PREFIX}-achievements \
   --attribute-definitions \
     AttributeName=childId,AttributeType=S \
     AttributeName=achievementId,AttributeType=S \
   --key-schema \
     AttributeName=childId,KeyType=HASH \
     AttributeName=achievementId,KeyType=RANGE \
   --billing-mode PAY_PER_REQUEST"

# SESSIONS
create_table_if_not_exists "${PREFIX}-sessions" \
  "--table-name ${PREFIX}-sessions \
   --attribute-definitions \
     AttributeName=sessionId,AttributeType=S \
   --key-schema AttributeName=sessionId,KeyType=HASH \
   --billing-mode PAY_PER_REQUEST"

# SUBSCRIPTIONS (new)
create_table_if_not_exists "${PREFIX}-subscriptions" \
  "--table-name ${PREFIX}-subscriptions \
   --attribute-definitions \
     AttributeName=userId,AttributeType=S \
     AttributeName=subscriptionId,AttributeType=S \
     AttributeName=stripeSubscriptionId,AttributeType=S \
   --key-schema \
     AttributeName=userId,KeyType=HASH \
     AttributeName=subscriptionId,KeyType=RANGE \
   --billing-mode PAY_PER_REQUEST \
   --global-secondary-indexes '[
     {\"IndexName\":\"stripeSubscriptionId-index\",\"KeySchema\":[{\"AttributeName\":\"stripeSubscriptionId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}
   ]'"

echo ""
echo "--- IAM User & Policy ---"

POLICY_NAME="KidLearnAppPolicy"
USER_NAME="kidlearn-app-user"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Build table ARNs
TABLE_ARNS=""
for TABLE in users children questions progress achievements sessions subscriptions; do
  ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${PREFIX}-${TABLE}"
  TABLE_ARNS="${TABLE_ARNS}\"${ARN}\",\"${ARN}/index/*\","
done
TABLE_ARNS="${TABLE_ARNS%,}"  # remove trailing comma

POLICY_DOCUMENT=$(cat <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoDB",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem","dynamodb:PutItem","dynamodb:UpdateItem",
        "dynamodb:DeleteItem","dynamodb:Query","dynamodb:Scan",
        "dynamodb:BatchGetItem","dynamodb:BatchWriteItem"
      ],
      "Resource": [${TABLE_ARNS}]
    },
    {
      "Sid": "Bedrock",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
    },
    {
      "Sid": "SecretsManager",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:kidlearn/*"
    },
    {
      "Sid": "SES",
      "Effect": "Allow",
      "Action": ["ses:SendEmail","ses:SendRawEmail"],
      "Resource": "*"
    },
    {
      "Sid": "Amplify",
      "Effect": "Allow",
      "Action": ["amplify:StartJob","amplify:GetJob","amplify:ListJobs"],
      "Resource": "arn:aws:amplify:${REGION}:${ACCOUNT_ID}:apps/*"
    }
  ]
}
POLICY
)

# Create or update policy
if aws iam get-policy --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}" &>/dev/null; then
  echo "  [skip] IAM policy ${POLICY_NAME} already exists"
else
  echo "  [create] IAM policy ${POLICY_NAME} ..."
  aws iam create-policy \
    --policy-name "$POLICY_NAME" \
    --policy-document "$POLICY_DOCUMENT" \
    --output text --query "Policy.PolicyName"
fi

# Create IAM user
if aws iam get-user --user-name "$USER_NAME" &>/dev/null; then
  echo "  [skip] IAM user ${USER_NAME} already exists"
else
  echo "  [create] IAM user ${USER_NAME} ..."
  aws iam create-user --user-name "$USER_NAME" --output text --query "User.UserName"
  aws iam attach-user-policy \
    --user-name "$USER_NAME" \
    --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"

  echo "  [create] Access keys for ${USER_NAME} ..."
  KEYS=$(aws iam create-access-key --user-name "$USER_NAME" --output json)
  KEY_ID=$(echo "$KEYS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['AccessKey']['AccessKeyId'])")
  SECRET=$(echo "$KEYS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['AccessKey']['SecretAccessKey'])")

  echo ""
  echo "  ⚠️  SAVE THESE CREDENTIALS — shown only once:"
  echo "  AWS_ACCESS_KEY_ID:     $KEY_ID"
  echo "  AWS_SECRET_ACCESS_KEY: $SECRET"
fi

echo ""
echo "--- SES Email Verification ---"
echo "  Run the following to verify your FROM email address:"
echo "  aws ses verify-email-identity --email-address noreply@yourdomain.com --region $REGION"

echo ""
echo "================================================================"
echo "  Required GitHub Secrets"
echo "================================================================"
echo ""
echo "  AWS_ACCESS_KEY_ID           (from above)"
echo "  AWS_SECRET_ACCESS_KEY       (from above)"
echo "  AWS_REGION                  $REGION"
echo "  AMPLIFY_APP_ID              (from Amplify console → App ARN)"
echo "  NEXTAUTH_SECRET             (run: openssl rand -base64 32)"
echo "  NEXTAUTH_URL                https://<your-amplify-domain>"
echo "  STRIPE_SECRET_KEY           (from Stripe Dashboard)"
echo "  STRIPE_WEBHOOK_SECRET       (from Stripe Dashboard → Webhooks)"
echo "  STRIPE_PRICE_AU_WEEKLY      (run: npm run setup:stripe)"
echo "  STRIPE_PRICE_AU_ANNUAL      (run: npm run setup:stripe)"
echo "  STRIPE_PRICE_US_WEEKLY      (run: npm run setup:stripe)"
echo "  STRIPE_PRICE_US_ANNUAL      (run: npm run setup:stripe)"
echo "  STRIPE_PRICE_IN_WEEKLY      (run: npm run setup:stripe)"
echo "  STRIPE_PRICE_IN_ANNUAL      (run: npm run setup:stripe)"
echo "  STRIPE_PRICE_UK_WEEKLY      (run: npm run setup:stripe)"
echo "  STRIPE_PRICE_UK_ANNUAL      (run: npm run setup:stripe)"
echo "  SES_FROM_EMAIL              noreply@yourdomain.com"
echo "  CRON_SECRET                 (run: openssl rand -base64 32)"
echo "  APP_URL                     https://<your-amplify-domain>"
echo "  USE_SECRETS_MANAGER         true (optional, for AWS Secrets Manager)"
echo ""
echo "================================================================"
echo "  Setup complete!"
echo "================================================================"
