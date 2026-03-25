import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function middleware(_req: NextRequest) {
  // Protected API handlers validate sessions with runtime auth config.
  // Keeping middleware passive avoids production mismatches when the
  // auth secret is fetched dynamically instead of coming from env vars.
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
