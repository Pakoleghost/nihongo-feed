import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/app/api/admin/_lib";
import { searchAdminDictionary } from "@/lib/admin-dictionary";

export async function GET(req: NextRequest) {
  try {
    await assertAdmin(req.headers.get("authorization"));
    const query = req.nextUrl.searchParams.get("q") || "";
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 24) || 24, 50);
    const payload = searchAdminDictionary(query, limit);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("admin dictionary error", error);
    return NextResponse.json({ error: "Dictionary lookup failed" }, { status: 500 });
  }
}
