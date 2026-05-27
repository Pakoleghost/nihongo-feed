import { NextRequest, NextResponse } from "next/server";

const FLASK_BASE = "https://pako-nihongo.tailcd0aee.ts.net";
const SENSEI_KEY = "sensei-pako-2026";

/**
 * GET /api/clase-notas?grupo=<nombre>
 * Returns class notes for the given group name.
 * Flask endpoint: GET /api/sensei/grupo/<nombre>/clase-notas
 */
export async function GET(req: NextRequest) {
  const grupo = req.nextUrl.searchParams.get("grupo");
  if (!grupo) return NextResponse.json([], { status: 200 });

  try {
    const res = await fetch(
      `${FLASK_BASE}/api/sensei/grupo/${encodeURIComponent(grupo)}/clase-notas`,
      {
        headers: { "X-Sensei-Key": SENSEI_KEY },
        // no cache — tarea_completada changes without server invalidation
        cache: "no-store",
      },
    );
    if (!res.ok) return NextResponse.json([], { status: 200 });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

