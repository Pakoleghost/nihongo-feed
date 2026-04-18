"use client";

import { DS, Eyebrow, type DSTab } from "./ds";

type SideMenuProps = {
  open: boolean;
  onClose: () => void;
  onTabChange: (tab: DSTab | "resources") => void;
};

export default function SideMenu({ open, onClose, onTabChange }: SideMenuProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(28,27,23,0.15)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "relative",
          width: "280px",
          height: "100%",
          background: DS.bg,
          boxShadow: "4px 0 24px rgba(28,27,23,0.1)",
          display: "flex",
          flexDirection: "column",
          padding: "24px",
          animation: "slideIn 0.3s ease-out",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div style={{ fontFamily: DS.fontKana, fontSize: 24, fontWeight: 500, color: DS.ink }}>禅</div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "8px" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke={DS.ink} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <Eyebrow>Navegación</Eyebrow>
        <div style={{ marginTop: "16px", display: "grid", gap: "8px" }}>
          <MenuButton
            label="Inicio"
            icon="🏠"
            onClick={() => {
              onTabChange("home");
              onClose();
            }}
          />
          <MenuButton
            label="Aprender"
            icon="📖"
            onClick={() => {
              onTabChange("learn");
              onClose();
            }}
          />
          <MenuButton
            label="Repasar"
            icon="🔄"
            onClick={() => {
              onTabChange("review");
              onClose();
            }}
          />
          <MenuButton
            label="Practicar"
            icon="⚡"
            onClick={() => {
              onTabChange("practice");
              onClose();
            }}
          />
          <MenuButton
            label="Biblioteca"
            icon="🏛️"
            onClick={() => {
              onTabChange("vault");
              onClose();
            }}
          />
          <div style={{ height: "8px", borderBottom: `1px solid ${DS.line}`, marginBottom: "8px" }} />
          <MenuButton
            label="Recursos"
            icon="📚"
            onClick={() => {
              onTabChange("resources");
              onClose();
            }}
          />
        </div>

        <div style={{ marginTop: "auto" }}>
            <div style={{ fontFamily: DS.fontBody, fontSize: 11, color: DS.inkFaint }}>
                Nihongo App v2.0
            </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function MenuButton({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        padding: "12px 16px",
        borderRadius: "14px",
        background: "none",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: DS.fontHead,
        fontSize: "16px",
        fontWeight: 600,
        color: DS.ink,
        transition: "background 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = DS.surfaceAlt)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
