import NextAuth from "next-auth";
import type { Country, SubscriptionStatus } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      country?: Country;
      subscriptionStatus?: SubscriptionStatus;
      trialEndsAt?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    country?: Country;
    subscriptionStatus?: SubscriptionStatus;
    trialEndsAt?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    country?: Country;
    subscriptionStatus?: SubscriptionStatus;
    trialEndsAt?: string;
  }
}
