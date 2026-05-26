import { NextResponse } from "next/server";

// Server-side proxy so mobile clients (not on Tailscale) can reach the Flask API.
const FLASK_URL = "https://pako-nihongo.tailcd0aee.ts.net/api/colecciones";

export async function GET() {
  try {
    const res = await fetch(FLASK_URL, {
      next: { revalidate: 60 }, // cache 60s on the server
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/colecciones]", err);
    return NextResponse.json(
      { error: "No se pudieron cargar las grabaciones." },
      { status: 502 }
    );
  }
}
