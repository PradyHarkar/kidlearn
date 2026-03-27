import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { ddb, TABLES } from "@/lib/dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

// Cache the secret so we don't hit Secrets Manager on every request
let cachedSecret: string | undefined;

export async function getNextAuthSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;

  // Works locally / if explicitly set
  if (process.env.NEXTAUTH_SECRET) {
    cachedSecret = process.env.NEXTAUTH_SECRET;
    return cachedSecret;
  }

  // Runtime fetch from Secrets Manager (Amplify Lambda execution role has access)
  const { SecretsManagerClient, GetSecretValueCommand } = await import(
    "@aws-sdk/client-secrets-manager"
  );
  const client = new SecretsManagerClient({ region: "ap-southeast-2" });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: "kidlearn/nextauth-secret" })
  );
  cachedSecret = response.SecretString!;
  return cachedSecret;
}

function buildAuthOptions(secret: string): AuthOptions {
  return {
    providers: [
      CredentialsProvider({
        name: "credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) return null;

          try {
            const result = await ddb.send(
              new QueryCommand({
                TableName: TABLES.USERS,
                IndexName: "email-index",
                KeyConditionExpression: "email = :email",
                ExpressionAttributeValues: {
                  ":email": credentials.email.toLowerCase(),
                },
                Limit: 1,
              })
            );

            const user = result.Items?.[0];
            if (!user) return null;

            const valid = await bcrypt.compare(
              credentials.password,
              user.passwordHash
            );
            if (!valid) return null;

            return {
              id: user.userId,
              email: user.email,
              name: user.parentName,
              country: user.country,
              subscriptionStatus: user.subscriptionStatus,
              trialEndsAt: user.trialEndsAt,
            };
          } catch (error) {
            console.error("Auth error:", error);
            return null;
          }
        },
      }),
    ],
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.userId = user.id;
          token.country = user.country;
          token.subscriptionStatus = user.subscriptionStatus;
          token.trialEndsAt = user.trialEndsAt;
        }
        return token;
      },
      async session({ session, token }) {
        if (token && session.user) {
          session.user.id = token.userId as string;
          session.user.country = token.country;
          session.user.subscriptionStatus = token.subscriptionStatus;
          session.user.trialEndsAt = token.trialEndsAt;
        }
        return session;
      },
      async redirect({ url, baseUrl }) {
        // Allow relative URLs (e.g. "/login") — always safe
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        // Allow same-origin absolute URLs
        try {
          if (new URL(url).origin === new URL(baseUrl).origin) return url;
        } catch { /* ignore invalid URLs */ }
        return baseUrl;
      },
    },
    pages: {
      signIn: "/login",
      error: "/login",
    },
    secret,
  };
}

// Async getter — used by the NextAuth route handler
export async function getAuthOptions(): Promise<AuthOptions> {
  const secret = await getNextAuthSecret();
  return buildAuthOptions(secret);
}

// Static export for middleware (uses NEXTAUTH_SECRET env var; falls back to empty string)
export const authOptions: AuthOptions = buildAuthOptions(
  process.env.NEXTAUTH_SECRET ?? ""
);
