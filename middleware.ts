import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Only enforce subscription on protected learning routes
    const learningPaths = ["/learn", "/results"];
    const isLearningPath = learningPaths.some((p) => pathname.startsWith(p));

    if (!isLearningPath) return NextResponse.next();

    const status = token?.subscriptionStatus as string | undefined;
    const trialEndsAt = token?.trialEndsAt as string | undefined;

    // Active subscription — allow through
    if (status === "active") return NextResponse.next();

    // Legacy users (no subscriptionStatus in token) — treat as active
    // The migrate-users script back-fills these; until then, don't lock out
    if (!status) return NextResponse.next();

    // Trial users — check expiry
    if (status === "trial" && trialEndsAt) {
      const expired = new Date(trialEndsAt) < new Date();
      if (!expired) return NextResponse.next();
    }

    // Expired trial or no valid subscription → redirect to pricing
    const pricingUrl = new URL("/pricing", req.url);
    pricingUrl.searchParams.set("reason", "subscription_required");
    return NextResponse.redirect(pricingUrl);
  },
  {
    callbacks: {
      // withAuth handles the unauthenticated → /login redirect
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/learn/:path*", "/results/:path*"],
};
