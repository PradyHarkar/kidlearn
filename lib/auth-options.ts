import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { ddb, TABLES } from "@/lib/dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

export const authOptions: AuthOptions = {
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
              ExpressionAttributeValues: { ":email": credentials.email.toLowerCase() },
              Limit: 1,
            })
          );

          const user = result.Items?.[0];
          if (!user) return null;

          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
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
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
