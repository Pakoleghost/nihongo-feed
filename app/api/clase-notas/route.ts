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

/**
 * PATCH /api/clase-notas
 * Body: { grupo: string, id: string, tarea_completada: boolean }
 * Flask endpoint: PATCH /api/sensei/grupo/<nombre>/clase-nota/<id>
 */
export async function PATCH(req: NextRequest) {
  try {
    const { grupo, id, tarea_completada } = (await req.json()) as {
      grupo: string;
      id: string;
      tarea_completada: boolean;
    };

    if (!grupo || !id) {
      return NextResponse.json({ error: "grupo and id required" }, { status: 400 });
    }

    const res = await fetch(
      `${FLASK_BASE}/api/sensei/grupo/${encodeURIComponent(grupo)}/clase-nota/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Sensei-Key": SENSEI_KEY },
        body: JSON.stringify({ tarea_completada }),
      },
    );

    if (!res.ok) return NextResponse.json({ error: "Flask error" }, { status: res.status });
    return NextResponse.json(await res.json().catch(() => ({ ok: true })));
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
