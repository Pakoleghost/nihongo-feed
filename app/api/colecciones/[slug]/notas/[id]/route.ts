import { NextRequest, NextResponse } from "next/server";

const FLASK_BASE = "https://pako-nihongo.tailcd0aee.ts.net";
const SENSEI_KEY = "sensei-pako-2026";

/**
 * PATCH /api/colecciones/[slug]/notas/[id]
 * Proxies to Flask: PATCH /api/colecciones/<slug>/notas/<id>
 * Body: { tarea_completada: boolean }
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { slug, id } = await ctx.params;
    const body = await req.json();

    const res = await fetch(`${FLASK_BASE}/api/colecciones/${slug}/notas/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Sensei-Key": SENSEI_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Flask error" }, { status: res.status });
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to update nota" }, { status: 500 });
  }
}
