"use client";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cerrar diálogo"
        style={{ position: "fixed", inset: 0, border: 0, background: "rgba(26,26,46,.24)", zIndex: 90 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(92vw, 420px)",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-5)",
          zIndex: 100,
          boxShadow: "var(--shadow-raised)",
          display: "grid",
          gap: "var(--space-3)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "var(--text-h3)", color: "var(--color-text)" }}>{title}</h3>
        {description && <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", lineHeight: 1.5 }}>{description}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "var(--space-1)", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onCancel}
            className="ds-btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              border: destructive ? "1px solid rgba(230,57,70,.18)" : "1px solid var(--color-primary)",
              borderRadius: "var(--radius-pill)",
              background: destructive ? "rgba(230,57,70,.08)" : "var(--color-primary)",
              color: destructive ? "var(--color-accent-strong)" : "var(--color-bg)",
              minHeight: 42,
              padding: "0 16px",
              fontSize: "var(--text-body-sm)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
