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
          background: "#FFFFFF",
          boxShadow: "0 24px 70px rgba(26,26,46,0.26)",
          padding: 20,
          display: "grid",
          gap: 14,
        }}
      >
        <div style={{ display: "grid", gap: 7 }}>
          <h2 id="moderation-confirm-title" style={{ margin: 0, color: "#1A1A2E", fontSize: 22, fontWeight: 900, lineHeight: 1.08 }}>
            {title}
          </h2>
          <p id="moderation-confirm-description" style={{ margin: 0, color: "#6E737F", fontSize: 14, lineHeight: 1.45 }}>
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
              background: "#F8F4EE",
              color: "#53596B",
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
