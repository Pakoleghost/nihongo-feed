"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KANA_ITEMS } from "@/lib/kana-data";
import type { KanaItem } from "@/lib/kana-data";

type ChipKey = "hiragana" | "katakana" | "tenten" | "maru" | "combinaciones";
type Difficulty = "facil" | "dificil" | "automatico";
type Mode = "smart" | "libre";

const CHIPS: { key: ChipKey; label: string }[] = [
  { key: "hiragana", label: "Hiragana" },
  { key: "katakana", label: "Katakana" },
  { key: "tenten", label: "Tenten" },
  { key: "maru", label: "Maru" },
  { key: "combinaciones", label: "Combinaciones" },
];

const DEPENDENT_CHIPS: ChipKey[] = ["tenten", "maru", "combinaciones"];
const BASE_CHIPS: ChipKey[] = ["hiragana", "katakana"];

const DIFFICULTY_OPTIONS: { key: Difficulty; label: string }[] = [
  { key: "facil", label: "Fácil" },
  { key: "dificil", label: "Difícil" },
  { key: "automatico", label: "Automático" },
];

// Map new chip keys to pool filter logic
function getPool(selectedSets: ChipKey[]): KanaItem[] {
  const pool: KanaItem[] = [];
  for (const key of selectedSets) {
    if (key === "hiragana") pool.push(...KANA_ITEMS.filter((i) => i.script === "hiragana" && i.set === "basic"));
    if (key === "katakana") pool.push(...KANA_ITEMS.filter((i) => i.script === "katakana" && i.set === "basic"));
    if (key === "tenten") pool.push(...KANA_ITEMS.filter((i) => i.set === "dakuten"));
    if (key === "maru") pool.push(...KANA_ITEMS.filter((i) => i.set === "handakuten"));
    if (key === "combinaciones") pool.push(...KANA_ITEMS.filter((i) => i.set === "yoon"));
  }
  return pool;
}

// Map chip keys to quiz URL param values (quiz/page.tsx uses old names internally)
function chipToUrlParam(key: ChipKey): string {
  if (key === "tenten") return "dakuon";
  if (key === "maru") return "handakuon";
  if (key === "combinaciones") return "yoon";
  return key;
}

function ConfigurarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get("mode") as Mode) ?? "smart";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [selectedSets, setSelectedSets] = useState<ChipKey[]>(["hiragana"]);
  const [difficulty, setDifficulty] = useState<Difficulty>("facil");
  const [questionCount, setQuestionCount] = useState(20);
  const [validationMsg, setValidationMsg] = useState(false);
  const validationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pool = mode === "libre" ? getPool(selectedSets) : KANA_ITEMS;
  const maxQuestions = Math.max(5, pool.length);

  useEffect(() => {
    setQuestionCount((prev) => Math.min(prev, maxQuestions));
  }, [maxQuestions]);

  function showValidation() {
    setValidationMsg(true);
    if (validationTimer.current) clearTimeout(validationTimer.current);
    validationTimer.current = setTimeout(() => setValidationMsg(false), 2000);
  }

  function toggleChip(key: ChipKey) {
    const isDependent = DEPENDENT_CHIPS.includes(key);
    const isBase = BASE_CHIPS.includes(key);

    setSelectedSets((prev) => {
      if (prev.includes(key)) {
        // Deselecting
        if (!isDependent && prev.length === 1) return prev; // must keep at least one base
        const next = prev.filter((k) => k !== key);

        // If deselecting a base chip and no base remains, also remove dependents
        if (isBase) {
          const hasBase = next.some((k) => BASE_CHIPS.includes(k));
          if (!hasBase) {
            const cleaned = next.filter((k) => !DEPENDENT_CHIPS.includes(k));
            if (cleaned.length === 0) return prev; // can't deselect if it would leave empty
            if (cleaned.length < next.length) showValidation();
            return cleaned;
          }
        }
        return next;
      }

      // Selecting
      if (isDependent) {
        const hasBase = prev.some((k) => BASE_CHIPS.includes(k));
        if (!hasBase) {
          showValidation();
          return prev; // block selection
        }
      }
      return [...prev, key];
    });
  }

  function changeCount(delta: number) {
    setQuestionCount((prev) => Math.max(5, Math.min(maxQuestions, prev + delta)));
  }

  function handleStart() {
    const params = new URLSearchParams({
      mode,
      difficulty,
      count: String(questionCount),
    });
    if (mode === "libre") {
      params.set("sets", selectedSets.map(chipToUrlParam).join(","));
    }
    router.push(`/kana/quiz?${params.toString()}`);
  }

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "52px 20px 120px",
        }}
      >
        {/* Back button */}
        <button
          onClick={() => router.back()}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "#FFFFFF",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 12px rgba(26,26,46,0.10)",
            marginBottom: "24px",
          }}
          aria-label="Volver"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M12 5l-7 7 7 7"
              stroke="#1A1A2E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Title */}
        <h1
          style={{
            fontSize: "34px",
            fontWeight: 800,
            color: "#1A1A2E",
            margin: "0 0 28px",
            lineHeight: 1.15,
          }}
        >
          Configurar
          <br />
          práctica
        </h1>

        {/* Mode toggle */}
        <div
          style={{
            background: "#E8E3DC",
            borderRadius: "999px",
            padding: "4px",
            display: "flex",
            marginBottom: "28px",
          }}
        >
          {(["smart", "libre"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: "12px 0",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "16px",
                background: mode === m ? "#E63946" : "transparent",
                color: mode === m ? "#FFFFFF" : "#9CA3AF",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              {m === "smart" ? "Smart" : "Libre"}
            </button>
          ))}
        </div>

        {/* Character selection — libre only */}
        {mode === "libre" && (
          <div style={{ marginBottom: "28px" }}>
            <p
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#1A1A2E",
                margin: "0 0 14px",
              }}
            >
              Selección de caracteres
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {CHIPS.map(({ key, label }) => {
                const active = selectedSets.includes(key);
                const isDependent = DEPENDENT_CHIPS.includes(key);
                const hasBase = selectedSets.some((k) => BASE_CHIPS.includes(k));
                const dimmed = isDependent && !hasBase;

                return (
                  <button
                    key={key}
                    onClick={() => toggleChip(key)}
                    style={{
                      padding: "12px 22px",
                      borderRadius: "999px",
                      border: "none",
                      cursor: "pointer",
                      background: active ? "#1A1A2E" : "#FFFFFF",
                      color: active ? "#FFFFFF" : dimmed ? "#C4BAB0" : "#1A1A2E",
                      fontWeight: 600,
                      fontSize: "15px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: active ? "none" : "0 2px 8px rgba(26,26,46,0.08)",
                      opacity: dimmed ? 0.6 : 1,
                      flexGrow: key === "combinaciones" ? 1 : 0,
                      justifyContent: key === "combinaciones" ? "center" : undefined,
                      transition: "opacity 0.15s",
                    }}
                  >
                    {label}
                    {active && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Validation message */}
            <p
              style={{
                fontSize: "13px",
                color: "#9CA3AF",
                margin: "10px 0 0",
                minHeight: "18px",
                transition: "opacity 0.3s",
                opacity: validationMsg ? 1 : 0,
              }}
            >
              Selecciona Hiragana o Katakana primero
            </p>
          </div>
        )}

        {/* Difficulty */}
        <div style={{ marginBottom: "28px" }}>
          <p
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#1A1A2E",
              margin: "0 0 14px",
            }}
          >
            Dificultad
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {DIFFICULTY_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDifficulty(key)}
                style={{
                  padding: "11px 22px",
                  borderRadius: "999px",
                  border: "none",
                  cursor: "pointer",
                  background: difficulty === key ? "#E63946" : "#E8E3DC",
                  color: difficulty === key ? "#FFFFFF" : "#53596B",
                  fontWeight: 700,
                  fontSize: "15px",
                  transition: "background 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Number of questions */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 4px 20px rgba(26,26,46,0.07)",
          }}
        >
          <p
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#1A1A2E",
              margin: "0 0 16px",
              textAlign: "center",
            }}
          >
            Número de preguntas
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "24px",
            }}
          >
            <button
              onClick={() => changeCount(-5)}
              disabled={questionCount <= 5}
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "#F0EDE8",
                border: "none",
                cursor: questionCount <= 5 ? "not-allowed" : "pointer",
                fontSize: "22px",
                fontWeight: 700,
                color: questionCount <= 5 ? "#C0BCB5" : "#1A1A2E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              −
            </button>
            <span
              style={{
                fontSize: "52px",
                fontWeight: 800,
                color: "#1A1A2E",
                minWidth: "72px",
                textAlign: "center",
                lineHeight: 1,
              }}
            >
              {questionCount}
            </span>
            <button
              onClick={() => changeCount(5)}
              disabled={questionCount >= maxQuestions}
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "#F0EDE8",
                border: "none",
                cursor: questionCount >= maxQuestions ? "not-allowed" : "pointer",
                fontSize: "22px",
                fontWeight: 700,
                color: questionCount >= maxQuestions ? "#C0BCB5" : "#1A1A2E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +
            </button>
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "#9CA3AF",
              textAlign: "center",
              margin: "12px 0 0",
            }}
          >
            {questionCount} de {pool.length} posibles
          </p>
        </div>
      </div>

      {/* Fixed bottom button */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "16px 20px 36px",
          background: "linear-gradient(to top, #FFF8E7 70%, transparent)",
        }}
      >
        <button
          onClick={handleStart}
          style={{
            width: "100%",
            padding: "18px",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            background: "#E63946",
            color: "#FFFFFF",
            fontSize: "18px",
            fontWeight: 700,
            boxShadow: "0 4px 20px rgba(230,57,70,0.35)",
          }}
        >
          Empezar
        </button>
      </div>
    </div>
  );
}

export default function ConfigurarPage() {
  return (
    <Suspense>
      <ConfigurarContent />
    </Suspense>
  );
}
