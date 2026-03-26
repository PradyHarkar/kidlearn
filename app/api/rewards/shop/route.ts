import { NextResponse } from "next/server";
import { getRewardShopItems } from "@/lib/services/reward-shop";

export async function GET() {
  return NextResponse.json({ items: getRewardShopItems() });
}
