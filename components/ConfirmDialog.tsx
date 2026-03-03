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
        style={{ position: "fixed", inset: 0, border: 0, background: "rgba(0,0,0,.35)", zIndex: 90 }}
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
          background: "#fff",
          border: "1px solid rgba(17,17,20,.08)",
          borderRadius: 14,
          padding: 16,
          zIndex: 100,
          boxShadow: "0 20px 40px rgba(0,0,0,.2)",
          display: "grid",
          gap: 10,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, color: "#17171b" }}>{title}</h3>
        {description && <p style={{ margin: 0, fontSize: 13, color: "#666a73", lineHeight: 1.5 }}>{description}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 10, background: "#fff", padding: "8px 10px", fontSize: 13, cursor: "pointer" }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              border: destructive ? "1px solid #fecaca" : "1px solid rgba(17,17,20,.1)",
              borderRadius: 10,
              background: destructive ? "#fff5f5" : "#111114",
              color: destructive ? "#b91c1c" : "#fff",
              padding: "8px 10px",
              fontSize: 13,
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

