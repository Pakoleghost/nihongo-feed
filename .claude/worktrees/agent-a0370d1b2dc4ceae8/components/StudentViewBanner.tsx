"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useStudentViewMode } from "@/lib/use-student-view-mode";

export default function StudentViewBanner() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileGroupName, setProfileGroupName] = useState<string | null>(null);
  const { studentViewActive, studentViewGroupName, setStudentViewActive } = useStudentViewMode(isAdmin);

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

      const { data } = await supabase.from("profiles").select("is_admin, group_name").eq("id", user.id).maybeSingle();
      if (alive) {
        setIsAdmin(Boolean(data?.is_admin));
        setProfileGroupName(data?.group_name ?? null);
      }
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
      className="studentViewModeBar"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 70,
        display: "flex",
        justifyContent: "center",
        padding: "calc(env(safe-area-inset-top, 0px) + 8px) 12px 8px",
        background: "linear-gradient(to bottom, #FFF8E7 0%, rgba(255,248,231,0.96) 100%)",
        borderBottom: "1px solid rgba(26,26,46,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          width: "min(100%, 760px)",
          borderRadius: 999,
          background: "#1A1A2E",
          color: "#FFFFFF",
          padding: "7px 8px 7px 14px",
          boxShadow: "0 6px 18px rgba(26,26,46,0.10)",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span>Vista de estudiante activada</span>
          <span
            style={{
              borderRadius: 999,
              background: "rgba(255,255,255,0.12)",
              color: "#D9F7F4",
              padding: "4px 8px",
              fontSize: 11,
              fontWeight: 900,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {studentViewGroupName || profileGroupName ? `Grupo: ${studentViewGroupName || profileGroupName}` : "Sin grupo"}
          </span>
        </span>
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
