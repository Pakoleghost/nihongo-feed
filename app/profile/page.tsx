"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function MyProfilePage() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    const routeToProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!alive) return;
      if (!session) {
        router.replace("/login");
        return;
      }

      router.replace(`/profile/${session.user.id}`);
    };

    void routeToProfile();

    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, color: "var(--color-text-muted)" }}>
      Cargando perfil…
    </main>
  );
}
