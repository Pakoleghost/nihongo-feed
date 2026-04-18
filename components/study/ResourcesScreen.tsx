"use client";

import { DS, TopBar, TabBar, Eyebrow, ScreenTitle, type DSTab } from "./ds";
import { MOCK_RESOURCES } from "@/lib/resources-data";

type ResourcesScreenProps = {
  onTabChange: (tab: DSTab) => void;
  onMenu: () => void;
};

export default function ResourcesScreen({ onTabChange, onMenu }: ResourcesScreenProps) {
  return (
    <div style={{ minHeight: "100vh", background: DS.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 54 }} />
      <TopBar onMenu={onMenu} />

      <div style={{ flex: 1, overflow: "auto", paddingBottom: 84 }}>
        <ScreenTitle
          title="Recursos"
          subtitle="Materiales externos"
        />

        <div style={{ padding: "0 24px" }}>
          <div style={{ display: "grid", gap: 16 }}>
            {MOCK_RESOURCES.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  background: DS.card,
                  borderRadius: 24,
                  border: `1px solid ${DS.line}`,
                  boxShadow: "0 4px 12px rgba(28,27,23,0.04)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <Eyebrow color={item.type === "PDF" ? "#ac3e53" : item.type === "Enlace" ? "#457B9D" : "#F4A261"}>
                    {item.type}
                  </Eyebrow>
                  <div style={{
                    fontFamily: DS.fontHead, fontSize: 16, fontWeight: 600,
                    color: DS.ink, marginTop: 4,
                  }}>
                    {item.title}
                  </div>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: "none",
                    fontFamily: DS.fontHead,
                    fontSize: 13,
                    fontWeight: 700,
                    color: DS.accent,
                    padding: "8px 16px",
                    borderRadius: 12,
                    background: DS.accentSoft,
                  }}
                >
                  Abrir
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      <TabBar active="practice" onTab={onTabChange} />
    </div>
  );
}
