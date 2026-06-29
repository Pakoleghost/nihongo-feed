"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import AuthShell, { authStyles } from "@/components/auth/AuthShell";
import { supabase } from "@/lib/supabase";

type ApplicationStatus = "pending" | "rejected";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ApplicationStatus>("pending");
  const [checked, setChecked] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Auth hydration (local + first load). Use session + auth state changes.
  useEffect(() => {
    let alive = true;

    const boot = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;

      if (!alive) return;

      if (uid) {
        setUserId(uid);
        setAuthReady(true);
        return;
      }

      // No session on first load.
      setSessionExpired(true);
      setAuthReady(true);

      const { data: sub } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        const nextUid = session?.user?.id ?? null;
        if (!alive) return;
        if (nextUid) {
          setUserId(nextUid);
          setSessionExpired(false);
        }
        setAuthReady(true);
      });

      return () => sub.subscription.unsubscribe();
    };

    const cleanupPromise = boot();

    return () => {
      alive = false;
      Promise.resolve(cleanupPromise).then((fn) => (typeof fn === "function" ? fn() : null));
    };
  }, []);

  // Check status after auth hydration.
  useEffect(() => {
    if (!authReady) return;
    if (!userId) return;

    const checkStatus = async () => {
      setChecked(false);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_approved,is_admin")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("profiles read failed", profileError);
      }

      if (profile?.is_admin) {
        window.location.href = "/dashboard";
        return;
      }

      if (profile?.is_approved) {
        window.location.href = "/dashboard";
        return;
      }

      const { data: app } = await supabase
        .from("applications")
        .select("id,status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (app?.status === "rejected") {
        setStatus("rejected");
        setChecked(true);
        return;
      }

      if (app?.status === "approved") {
        // Fallback: if applications is approved but profiles.approved hasn't propagated yet,
        // still move the user forward.
        window.location.href = "/dashboard";
        return;
      }

      // Default: pending (covers none, pending, approved not yet propagated, or missing application row)
      setStatus("pending");
      setChecked(true);
    };

    checkStatus();
  }, [authReady, userId]);

  // While pending, poll for approval and then send the user into the dashboard.
  useEffect(() => {
    if (!authReady) return;
    if (!userId) return;
    if (status !== "pending") return;

    let alive = true;
    const tick = async () => {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_approved,is_admin")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("profiles read failed", profileError);
      }

      if (!alive) return;

      if (profile?.is_admin) {
        window.location.href = "/dashboard";
        return;
      }

      if (profile?.is_approved) {
        // Keep the session. Just move them into the app.
        window.location.href = "/dashboard";
      }

      const { data: app } = await supabase
        .from("applications")
        .select("status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (app?.status === "approved") {
        window.location.href = "/dashboard";
      }
    };

    // Run once quickly, then poll.
    tick();
    const id = window.setInterval(tick, 4000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [authReady, userId, status]);

  async function goToLogin() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!authReady || (userId && !checked)) {
    return (
      <AuthShell
        title="Revisando acceso"
        subtitle="Estamos confirmando el estado de tu cuenta."
      >
        <div className={authStyles.message}>Un momento...</div>
      </AuthShell>
    );
  }

  if (sessionExpired) {
    return (
      <AuthShell
        title="Sesión vencida"
        subtitle="Inicia sesión otra vez para revisar tu acceso."
      >
        <button className={authStyles.primaryButton} onClick={goToLogin}>
          Volver a entrar
        </button>
      </AuthShell>
    );
  }

  if (status === "pending") {
    return (
      <AuthShell
        title="Acceso pendiente"
        subtitle="Tu cuenta ya existe, pero todavía necesita aprobación del sensei."
        notice="Cuando se apruebe tu cuenta, esta pantalla te mandará automáticamente al dashboard."
      >
        <div className={authStyles.message}>
          Puedes dejar esta ventana abierta o volver más tarde. ID de usuario: {userId}
        </div>
        <button className={authStyles.secondaryButton} onClick={goToLogin}>
          Cambiar de cuenta
        </button>
      </AuthShell>
    );
  }

  if (status === "rejected") {
    return (
      <AuthShell
        title="Acceso no aprobado"
        subtitle="Esta cuenta no tiene acceso a la app de alumnos."
      >
        <div className={`${authStyles.message} ${authStyles.messageError}`}>
          Si crees que esto es un error, contacta al sensei.
        </div>
        <button className={authStyles.secondaryButton} onClick={goToLogin}>
          Usar otra cuenta
        </button>
      </AuthShell>
    );
  }

  // Default screen (no form here)
  return (
    <AuthShell
      title="Acceso pendiente"
      subtitle="Tu cuenta está en revisión."
    >
      <div className={authStyles.message}>
        Cuando el sensei apruebe la cuenta, entrarás automáticamente.
      </div>
    </AuthShell>
  );
}
