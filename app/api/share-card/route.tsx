import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const content  = searchParams.get("content")  ?? "";
  const username = searchParams.get("username") ?? "Anónimo";
  const week     = searchParams.get("week")     ?? "";

  // Noto Sans JP from Google Fonts — fetched at edge runtime
  let fontData: ArrayBuffer | undefined;
  try {
    // 1. Get the CSS from Google Fonts to extract the TTF URL
    const cssRes = await fetch(
      "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&display=swap",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const css = await cssRes.text();
    const match = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
    if (match?.[1]) {
      const fontRes = await fetch(match[1]);
      if (fontRes.ok) fontData = await fontRes.arrayBuffer();
    }
  } catch {/* edge fetch failed — fall back to system sans-serif */}

  const fonts = fontData
    ? [{ name: "NotoSansJP", data: fontData, weight: 700 as const, style: "normal" as const }]
    : [];

  // Truncate very long content
  const display = content.length > 280 ? content.slice(0, 277) + "…" : content;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#FFF8E7",
          padding: "80px 72px",
          fontFamily: fonts.length ? "NotoSansJP" : "sans-serif",
        }}
      >
        {/* Red accent bar top */}
        <div style={{ width: 56, height: 6, background: "#E63946", borderRadius: 3, marginBottom: 56 }} />

        {/* Topic label */}
        {week && (
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#9CA3AF",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 28,
            display: "flex",
          }}>
            {week}
          </div>
        )}

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          <p
            style={{
              fontSize: display.length > 80 ? 44 : display.length > 40 ? 56 : 72,
              fontWeight: 700,
              color: "#1A1A2E",
              lineHeight: 1.45,
              margin: 0,
              wordBreak: "break-word" as const,
              display: "flex",
            }}
          >
            {display}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 56,
          paddingTop: 32,
          borderTop: "2px solid rgba(26,26,46,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Avatar placeholder */}
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "#E63946",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, fontWeight: 700, color: "#FFFFFF",
            }}>
              {username.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 26, fontWeight: 700, color: "#1A1A2E", display: "flex" }}>
              {username}
            </span>
          </div>

          {/* Branding */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#E63946" }} />
            <span style={{ fontSize: 24, fontWeight: 800, color: "#1A1A2E", display: "flex", letterSpacing: "-0.02em" }}>
              フィード
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts,
    },
  );
}
