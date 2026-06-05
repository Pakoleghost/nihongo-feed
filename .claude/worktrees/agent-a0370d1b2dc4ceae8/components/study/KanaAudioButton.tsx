"use client";

import { useState } from "react";
import { DS } from "@/components/study/ds";
import { speakKana, type KanaSpeechAvailability } from "@/lib/kana-speech";

type KanaAudioButtonProps = {
  kana: string;
  availability: KanaSpeechAvailability | "checking";
};

function getDisabledLabel(availability: KanaSpeechAvailability | "checking") {
  if (availability === "unsupported") return "Audio no disponible en este navegador";
  if (availability === "no-voice") return "Voz japonesa no disponible en este dispositivo";
  return "Cargando audio";
}

export default function KanaAudioButton({ kana, availability }: KanaAudioButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const disabled = availability !== "ready";

  const handleClick = async () => {
    if (disabled || isPlaying) return;

    setIsPlaying(true);
    const ok = await speakKana(kana);
    window.setTimeout(() => setIsPlaying(false), ok ? 450 : 0);
  };

  const ariaLabel = disabled ? getDisabledLabel(availability) : `Escuchar ${kana}`;

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      style={{
        width: 32,
        height: 32,
        borderRadius: 999,
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        background: disabled
          ? DS.surfaceAlt
          : isPlaying
            ? DS.accent
            : DS.accentSoft,
        color: disabled
          ? DS.inkFaint
          : isPlaying
            ? DS.accentInk
            : DS.accent,
        boxShadow: disabled ? "none" : "0 4px 12px rgba(230,57,70,0.12)",
        transition: "background 140ms ease, color 140ms ease, transform 140ms ease",
        transform: isPlaying ? "scale(0.96)" : "scale(1)",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 14.5V9.5a1.5 1.5 0 0 1 1.5-1.5H10l4.2-3.2a.8.8 0 0 1 1.3.64v13.16a.8.8 0 0 1-1.3.64L10 16H6.5A1.5 1.5 0 0 1 5 14.5Z"
          fill="currentColor"
        />
        <path
          d="M18 9.2a4.4 4.4 0 0 1 0 5.6M19.9 7a7.4 7.4 0 0 1 0 10"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
