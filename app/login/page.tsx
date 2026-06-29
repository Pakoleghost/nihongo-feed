"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AuthShell, { authStyles } from "@/components/auth/AuthShell";
import { supabase } from "@/lib/supabase";

function normalizeUsername(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]/g, "")
    .trim()
    .slice(0, 24);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Ocurrió un error inesperado. Intenta de nuevo.";
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSignUp = mode === "signup";

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      if (isSignUp) {
        const normalizedUsername = normalizeUsername(username);

        if (!fullName.trim()) {
          setErrorMessage("Escribe tu nombre completo.");
          return;
        }

        if (!/^[a-z0-9._-]{3,24}$/.test(normalizedUsername)) {
          setErrorMessage("Usa un username de 3 a 24 caracteres: letras, números, punto, guion o guion bajo.");
          return;
        }

        const { data: usernameTaken } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", normalizedUsername)
          .limit(1);

        if ((usernameTaken ?? []).length > 0) {
          setErrorMessage("Ese username ya está en uso.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              username: normalizedUsername,
            },
          },
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              {
                id: data.user.id,
                username: normalizedUsername,
                full_name: fullName.trim(),
                email: email.trim().toLowerCase(),
                group_name: null,
              },
              { onConflict: "id" },
            );

          if (profileError) {
            setErrorMessage(`Cuenta creada, pero no pude completar el perfil: ${profileError.message}`);
            return;
          }
        }

        setMessage("Cuenta creada. Tu acceso queda pendiente de aprobación del sensei.");
        if (data.session) {
          router.push("/pending");
        } else {
          setMode("login");
        }
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        router.push("/pending");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved,is_admin")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.is_admin || profile?.is_approved) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      router.push("/pending");
      router.refresh();
    } catch (error: unknown) {
      console.error("auth failed:", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={isSignUp ? "Crear cuenta" : "Entrar"}
      subtitle={
        isSignUp
          ? "Crea tu cuenta de alumno. El acceso se activa cuando el sensei la aprueba."
          : "Accede con la cuenta aprobada para tus clases de japonés."
      }
      notice="Esta app es privada para alumnos de Pako Nihongo. Las cuentas nuevas no entran hasta estar aprobadas."
    >
      <form className={authStyles.form} onSubmit={handleAuth}>
        {isSignUp && (
          <>
            <label className={authStyles.field}>
              <span className={authStyles.label}>Nombre completo</span>
              <input
                className={authStyles.input}
                type="text"
                placeholder="Tu nombre"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>

            <label className={authStyles.field}>
              <span className={authStyles.label}>Nombre de usuario</span>
              <input
                className={authStyles.input}
                type="text"
                placeholder="ej. sakura_01"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>
          </>
        )}

        <label className={authStyles.field}>
          <span className={authStyles.label}>Email</span>
          <input
            className={authStyles.input}
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className={authStyles.field}>
          <span className={authStyles.label}>Contraseña</span>
          <input
            className={authStyles.input}
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {message && <div className={authStyles.message}>{message}</div>}
        {errorMessage && (
          <div className={`${authStyles.message} ${authStyles.messageError}`}>
            {errorMessage}
          </div>
        )}

        <div className={authStyles.buttonRow}>
          <button
            className={authStyles.primaryButton}
            type="submit"
            disabled={loading}
          >
            {loading ? "Procesando..." : isSignUp ? "Crear cuenta" : "Entrar"}
          </button>
          <button
            className={authStyles.secondaryButton}
            type="button"
            onClick={() => {
              setMode(isSignUp ? "login" : "signup");
              setMessage(null);
              setErrorMessage(null);
            }}
            disabled={loading}
          >
            {isSignUp ? "Ya tengo cuenta" : "Solicitar acceso"}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
