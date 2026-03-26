import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import { NextResponse } from "next/server";
import { getNextAuthSecret } from "@/lib/auth-options";
import type { Child, Subject, YearLevel } from "@/types";

const KID_SESSION_COOKIE = "kidlearn_kid_session";
const KID_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

const encoder = new TextEncoder();

export interface KidSession extends JWTPayload {
  userId: string;
  childId: string;
  childName: string;
  grade?: string;
  yearLevel: YearLevel;
  avatar?: string;
  allowedKidLoginMethods: ["pin"];
  lastSubject?: Subject;
  lastSessionCompletedAt?: string;
}

async function getKidSessionSecret() {
  return encoder.encode(await getNextAuthSecret());
}

export function childToKidSession(child: Child): KidSession {
  return {
    userId: child.userId,
    childId: child.childId,
    childName: child.childName,
    grade: child.grade,
    yearLevel: child.yearLevel,
    avatar: child.avatar,
    allowedKidLoginMethods: ["pin"],
    lastSubject: child.lastSubject,
    lastSessionCompletedAt: child.lastSessionCompletedAt,
  };
}

export async function createKidSessionToken(session: KidSession) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + KID_SESSION_MAX_AGE_SECONDS)
    .sign(await getKidSessionSecret());
}

export async function getKidSession(): Promise<KidSession | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(KID_SESSION_COOKIE)?.value;
    if (!token) return null;

    const verified = await jwtVerify(token, await getKidSessionSecret(), {
      algorithms: ["HS256"],
    });

    return verified.payload as KidSession;
  } catch {
    return null;
  }
}

export function applyKidSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: KID_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: KID_SESSION_MAX_AGE_SECONDS,
  });
}

export function clearKidSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: KID_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}
