"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SprintResultadosPage() {
  const router = useRouter();
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState<number | null>(null);

  useEffect(() => {
    const s = parseInt(sessionStorage.getItem("sprint-score") ?? "0", 10);
    setScore(s);

    async function saveScore() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const userId = data.user.id;

      const { data: existing } = await supabase
        .from("study_kana_scores")
        .select("best_score")
        .eq("user_id", userId)
        .eq("mode", "mixed")
        .maybeSingle();

      const currentBest = (existing as { best_score: number } | null)?.best_score ?? 0;
      setBestScore(Math.max(currentBest, s));

      if (s > currentBest) {
        await supabase.from("study_kana_scores").upsert({
          user_id: userId,
          mode: "mixed",
          best_score: s,
          updated_at: new Date().toISOString(),
        });
      }
    }
    saveScore();
  }, []);

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      <p
        style={{
          fontSize: "80px",
          fontWeight: 800,
          color: "#1A1A2E",
          margin: 0,
          lineHeight: 1,
        }}
      >
        {score}
      </p>
      <p
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#4ECDC4",
          margin: "8px 0 4px",
        }}
      >
        correctas
      </p>
      {bestScore !== null && (
        <p style={{ fontSize: "15px", color: "#9CA3AF", margin: "4px 0 48px" }}>
          Tu mejor racha: {bestScore}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
        <button
          onClick={() => router.push("/practicar/sprint")}
          style={{
            width: "100%",
            padding: "18px",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            background: "#E63946",
            color: "#FFFFFF",
            fontSize: "17px",
            fontWeight: 700,
            boxShadow: "0 4px 20px rgba(230,57,70,0.3)",
          }}
        >
          Jugar de nuevo
        </button>
        <button
          onClick={() => router.push("/practicar")}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            background: "transparent",
            color: "#1A1A2E",
            fontSize: "17px",
            fontWeight: 600,
          }}
        >
          Volver
        </button>
      </div>

      <button
        onClick={() => router.push("/practicar/sprint/scoreboard")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#4ECDC4",
          fontSize: "15px",
          fontWeight: 700,
          marginTop: "20px",
          padding: "4px",
        }}
      >
        Ver scoreboard →
      </button>
    </div>
  );
}
