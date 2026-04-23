"use client";

type ModuleActionChoice = {
  title: string;
  subtitle: string;
  buttonLabel: string;
  onClick: () => void;
  accent?: "teal" | "red";
  watermark?: string;
};

type ModuleActionChoicesProps = {
  recommendedMode: "aprender" | "practicar";
  learnCard: ModuleActionChoice;
  practiceCard: ModuleActionChoice;
};

function ActionCard({
  card,
  isRecommended,
}: {
  card: ModuleActionChoice;
  isRecommended: boolean;
}) {
  const accent = card.accent ?? "teal";
  const buttonBackground = isRecommended ? (accent === "red" ? "#E63946" : "#1A1A2E") : accent === "red" ? "#1A1A2E" : "#4ECDC4";
  const buttonColor = isRecommended ? "#FFFFFF" : accent === "red" ? "#FFFFFF" : "#1A1A2E";

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: isRecommended ? "#FFFFFF" : "rgba(255,255,255,0.78)",
        borderRadius: "2rem",
        padding: "14px",
        minHeight: "118px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: isRecommended ? "0 14px 30px rgba(26,26,46,0.08)" : "0 8px 18px rgba(26,26,46,0.05)",
      }}
    >
      {card.watermark ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: "16px",
            top: "14px",
            fontSize: "58px",
            fontWeight: 800,
            lineHeight: 1,
            opacity: 0.08,
            color: accent === "red" ? "#E63946" : "#4ECDC4",
            pointerEvents: "none",
          }}
        >
          {card.watermark}
        </span>
      ) : null}

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <p
            style={{
              margin: 0,
              fontSize: "18px",
              lineHeight: 1,
              fontWeight: 700,
              color: "#1A1A2E",
            }}
          >
            {card.title}
          </p>
          {isRecommended ? (
            <span
              style={{
                borderRadius: "999px",
                background: "rgba(78,205,196,0.12)",
                color: "#0F766E",
                padding: "4px 8px",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Recomendado
            </span>
          ) : null}
        </div>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "12px",
            lineHeight: 1.25,
            fontWeight: 400,
            color: "#6B7280",
            maxWidth: "200px",
          }}
        >
          {card.subtitle}
        </p>
      </div>

      <button
        onClick={card.onClick}
        style={{
          position: "relative",
          zIndex: 1,
          alignSelf: "flex-start",
          border: "none",
          borderRadius: "3rem",
          background: buttonBackground,
          color: buttonColor,
          padding: "7px 16px",
          fontWeight: 700,
          fontSize: "12px",
          cursor: "pointer",
        }}
      >
        {card.buttonLabel}
      </button>
    </div>
  );
}

export default function ModuleActionChoices({
  recommendedMode,
  learnCard,
  practiceCard,
}: ModuleActionChoicesProps) {
  return (
    <div
      style={{
        marginTop: "12px",
        background: "rgba(255,255,255,0.78)",
        borderRadius: "2rem",
        padding: "12px",
        boxShadow: "0 12px 30px rgba(26,26,46,0.06)",
      }}
    >
      <p
        style={{
          margin: "0 0 10px",
          fontSize: "11px",
          letterSpacing: "0.12em",
          fontWeight: 700,
          color: "#9CA3AF",
          textTransform: "uppercase",
        }}
      >
        Cómo quieres estudiar
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <ActionCard card={learnCard} isRecommended={recommendedMode === "aprender"} />
        <ActionCard card={practiceCard} isRecommended={recommendedMode === "practicar"} />
      </div>
    </div>
  );
}
