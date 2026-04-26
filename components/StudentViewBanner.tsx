"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useStudentViewMode } from "@/lib/use-student-view-mode";

export default function StudentViewBanner() {
  const [isAdmin, setIsAdmin] = useState(false);
  const { studentViewActive, setStudentViewActive } = useStudentViewMode(isAdmin);

  useEffect(() => {
    let alive = true;

    async function loadAdminState() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive || !user) {
        if (alive) setIsAdmin(false);
        return;
      }

      const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (alive) setIsAdmin(Boolean(data?.is_admin));
    }

    void loadAdminState();

    return () => {
      alive = false;
    };
  }, []);

  if (!studentViewActive) return null;

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 10px)",
        left: 12,
        right: 12,
        zIndex: 1000,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderRadius: 999,
          background: "#1A1A2E",
          color: "#FFFFFF",
          padding: "8px 10px 8px 14px",
          boxShadow: "0 10px 28px rgba(26,26,46,0.18)",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        <span>Vista de estudiante activada</span>
        <button
          type="button"
          onClick={() => setStudentViewActive(false)}
          style={{
            border: "none",
            borderRadius: 999,
            background: "#4ECDC4",
            color: "#1A1A2E",
            padding: "7px 10px",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Salir
        </button>
      </div>
    </div>
  );
}
