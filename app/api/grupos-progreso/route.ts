import { NextResponse } from "next/server";

// Public Flask endpoint — no auth token required.
// Returns: { [grupo: string]: boolean }
const FLASK_URL = "https://pako-nihongo.tailcd0aee.ts.net/api/grupos/progreso";

export async function GET() {
  try {
    const res = await fetch(FLASK_URL, {
      // short cache — toggles should reflect quickly
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error("[/api/grupos-progreso]", err);
    return NextResponse.json({}, { status: 502 });
  }
}
