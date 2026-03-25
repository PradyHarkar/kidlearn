import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth-options";

type Handler = (req: Request, ctx: unknown) => Promise<Response>;

export async function GET(req: Request, ctx: unknown) {
  const options = await getAuthOptions();
  return (NextAuth(options) as unknown as Handler)(req, ctx);
}

export async function POST(req: Request, ctx: unknown) {
  const options = await getAuthOptions();
  return (NextAuth(options) as unknown as Handler)(req, ctx);
}
