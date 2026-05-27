import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/app/api/admin/_lib";

const FLASK_BASE = "https://pako-nihongo.tailcd0aee.ts.net";
const SENSEI_KEY = "sensei-pako-2026";

/**
 * PATCH /api/admin/progreso-toggle?grupo=<nombre>
 * Body: { "show_progreso": boolean }
 * Proxies to Flask: PATCH /api/sensei/grupo/<nombre>/progreso-toggle
 */
export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  try {
    await assertAdmin(authHeader);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 403 },
    );
  }

  const grupo = req.nextUrl.searchParams.get("grupo");
  if (!grupo) {
    return NextResponse.json({ error: "grupo requerido" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body inválido" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${FLASK_BASE}/api/sensei/grupo/${encodeURIComponent(grupo)}/progreso-toggle`,
      {
        method: "PATCH",
        headers: {
          "X-Sensei-Key": SENSEI_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[/api/admin/progreso-toggle]", err);
    return NextResponse.json({ error: "Flask no disponible" }, { status: 502 });
  }
}
