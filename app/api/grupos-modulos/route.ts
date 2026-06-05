import { NextResponse } from "next/server";

const FLASK_URL = "https://pako-nihongo.tailcd0aee.ts.net/api/grupos/modulos";

export async function GET() {
  try {
    const res = await fetch(FLASK_URL, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({});
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({});
  }
}
