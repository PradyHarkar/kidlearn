import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth-options";

export async function getSession() {
  const authOptions = await getAuthOptions();
  return await getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}
