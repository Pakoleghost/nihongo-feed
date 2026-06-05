"use client";

import { DS, TabBar, type DSTab } from "./ds";

type RecursosScreenProps = {
  onTabChange: (tab: DSTab) => void;
};

const RESOURCE_CATEGORIES = [
  {
    kana: "文",
    title: "Vocabulario",
    desc: "Listas por lección y tema",
    href: "/resources",
  },
  {
    kana: "字",
    title: "Kanji",
    desc: "Lecturas y trazos Genki",
    href: "/resources",
  },
  {
    kana: "法",
    title: "Gramática",
    desc: "Estructuras y ejemplos",
    href: "/resources",
  },
  {
    kana: "音",
    title: "Audio",
    desc: "Diálogos y pronunciación",
    href: "/resources",
  },
];

export default function RecursosScreen({ onTabChange }: RecursosScreenProps) {
  return (
    <div style={{ minHeight: "100vh", background: DS.bg, display: "flex", flexDirection: "column" }}>


      <div style={{ flex: 1, overflow: "auto", paddingBottom: 84 }}>
        {/* Header */}
        <div style={{ padding: "16px 24px 0" }}>
          <div style={{
            fontFamily: DS.fontHead, fontSize: 30, fontWeight: 800,
            color: DS.ink, letterSpacing: -0.8, lineHeight: 1.05,
          }}>Recursos</div>
          <div style={{
            fontFamily: DS.fontBody, fontSize: 14, color: DS.inkSoft,
            marginTop: 6, lineHeight: 1.5,
          }}>Material de estudio organizado por categoría.</div>
        </div>

        {/* Open full library CTA */}
        <div style={{ padding: "20px 24px 0" }}>
          <a
            href="/resources"
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 22px", borderRadius: 24,
              background: `linear-gradient(135deg, ${DS.accent} 0%, #c42b38 100%)`,
              textDecoration: "none",
              boxShadow: "0 8px 24px rgba(230,57,70,0.25)",
            }}
          >
            <div>
              <div style={{
                fontFamily: DS.fontHead, fontSize: 16, fontWeight: 700,
                color: "#fff", letterSpacing: -0.2,
              }}>Abrir biblioteca completa</div>
              <div style={{
                fontFamily: DS.fontBody, fontSize: 12, color: "rgba(255,255,255,0.75)",
                marginTop: 3,
              }}>Links, archivos y notas de clase</div>
            </div>
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
              <path d="M1 7h17m0 0l-6-6m6 6l-6 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        {/* Category grid */}
        <div style={{ padding: "24px 24px 0" }}>
          <div style={{
            fontFamily: DS.fontHead, fontSize: 10.5, fontWeight: 600,
            letterSpacing: "0.2em", textTransform: "uppercase", color: DS.inkSoft,
            marginBottom: 14,
          }}>Categorías</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {RESOURCE_CATEGORIES.map((cat) => (
              <a
                key={cat.title}
                href={cat.href}
                style={{
                  display: "flex", flexDirection: "column", gap: 10,
                  padding: "18px 16px", borderRadius: 22,
                  background: DS.card,
                  boxShadow: "0 4px 20px rgba(26,26,46,0.05)",
                  textDecoration: "none",
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: DS.surfaceAlt,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: DS.fontKana, fontSize: 22, color: DS.ink,
                }}>{cat.kana}</div>
                <div>
                  <div style={{
                    fontFamily: DS.fontHead, fontSize: 14, fontWeight: 700,
                    color: DS.ink, letterSpacing: -0.2,
                  }}>{cat.title}</div>
                  <div style={{
                    fontFamily: DS.fontBody, fontSize: 11, color: DS.inkSoft,
                    marginTop: 3, lineHeight: 1.4,
                  }}>{cat.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div style={{ height: 16 }} />
      </div>

      <TabBar active="recursos" onTab={onTabChange} />
    </div>
  );
}
