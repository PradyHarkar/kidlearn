import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getItem, deleteItem, TABLES } from "@/lib/dynamodb";

export async function GET(_req: NextRequest, { params }: { params: { childId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const child = await getItem(TABLES.CHILDREN, { userId, childId: params.childId });

    if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });
    return NextResponse.json({ child });
  } catch (error) {
    console.error("Get child error:", error);
    return NextResponse.json({ error: "Failed to fetch child" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { childId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    await deleteItem(TABLES.CHILDREN, { userId, childId: params.childId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete child error:", error);
    return NextResponse.json({ error: "Failed to delete child" }, { status: 500 });
  }
}
