import { NextResponse } from "next/server";
import { clearKidSessionCookie, getKidSession } from "@/lib/kid-session";

export async function GET() {
  const kidSession = await getKidSession();
  return NextResponse.json({ kidSession });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearKidSessionCookie(response);
  return response;
}
