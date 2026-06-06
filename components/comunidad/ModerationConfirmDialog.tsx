"use client";

import { useEffect } from "react";

type ModerationConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "neutral";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ModerationConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  tone = "neutral",
  busy = false,
  onCancel,
  onConfirm,
}: ModerationConfirmDialogProps) {
  useEffect(() => {
    if (!open || busy) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onCancel, open]);

  if (!open) return null;

  const confirmColor = tone === "danger" ? "#E63946" : "#1A1A2E";

  return (
    <div
      role="presentation"
      onClick={busy ? undefined : onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(26,26,46,0.38)",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="moderation-confirm-title"
        aria-describedby="moderation-confirm-description"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(100%, 390px)",
          borderRadius: 28,
          background: "#16161F",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.09)",
          padding: 20,
          display: "grid",
          gap: 14,
        }}
      >
        <div style={{ display: "grid", gap: 7 }}>
          <h2 id="moderation-confirm-title" style={{ margin: 0, color: "#FFFFFF", fontSize: 22, fontWeight: 900, lineHeight: 1.08 }}>
            {title}
          </h2>
          <p id="moderation-confirm-description" style={{ margin: 0, color: "rgba(255,255,255,0.58)", fontSize: 14, lineHeight: 1.45 }}>
            {description}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              border: "none",
              borderRadius: 999,
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.72)",
              padding: "12px 14px",
              fontSize: 14,
              fontWeight: 900,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{
              border: "none",
              borderRadius: 999,
              background: busy ? "#C4BAB0" : confirmColor,
              color: "#FFFFFF",
              padding: "12px 14px",
              fontSize: 14,
              fontWeight: 900,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Guardando..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
