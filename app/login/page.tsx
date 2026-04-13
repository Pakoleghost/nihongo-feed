"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function normalizeUsername(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]/g, "")
    .trim()
    .slice(0, 24);
}

export default function LoginPage() { // <--- ESTO ES LO QUE BUSCA VERCEL
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        if (!fullName.trim()) return alert("Escribe tu nombre completo.");
        const normalizedUsername = normalizeUsername(username);
        if (!normalizedUsername || !/^[a-z0-9._-]{3,24}$/.test(normalizedUsername)) {
          return alert("Username inválido. Usa 3-24 caracteres: letras, números, punto, guion o guion_bajo.");
        }
        if (!gender) return alert("Selecciona tu género.");
        if (!birthDate) return alert("Selecciona tu fecha de nacimiento.");

        const { data: usernameTaken } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", normalizedUsername)
          .limit(1);
        if ((usernameTaken || []).length > 0) {
          return alert("Ese username ya está en uso.");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              username: normalizedUsername,
              gender,
              birth_date: birthDate,
            },
          },
        });
        if (error) {
          alert(error.message);
          return;
        }
        if (data.user) {
          const profilePayload = {
            id: data.user.id,
            username: normalizedUsername,
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            group_name: null,
            gender,
            birth_date: birthDate,
          };
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(profilePayload, { onConflict: "id" });
          if (profileError) {
            // Fallback if newer research fields are not in the schema yet.
            const { error: fallbackError } = await supabase
              .from("profiles")
              .upsert(
                {
                  id: data.user.id,
                  username: normalizedUsername,
                  full_name: fullName.trim(),
                  group_name: null,
                },
                { onConflict: "id" },
              );
            if (fallbackError) {
              alert(`Cuenta creada pero no se pudo completar el perfil: ${fallbackError.message}`);
              return;
            }
            alert("¡Cuenta creada! Tu perfil quedó listo (sin género/fecha por esquema actual).");
          } else {
            alert("¡Cuenta creada!");
          }
          setIsSignUp(false);
          setFullName("");
          setUsername("");
          setGender("");
          setBirthDate("");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
        else {
          router.push("/study");
          router.refresh();
        }
      }
    } catch (err: any) {
      console.error("handleAuth fatal:", err);
      alert(err?.message || "Ocurrió un error inesperado. Intenta de nuevo.");
    }
  };

  const shellStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "var(--color-bg)",
    padding: "var(--page-padding)",
    display: "grid",
    placeItems: "center",
  };
  const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 480,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-card)",
    padding: "var(--space-6)",
    display: "grid",
    gap: "var(--space-5)",
  };
  const headerStyle: React.CSSProperties = {
    display: "grid",
    gap: "var(--space-2)",
  };
  const eyebrowStyle: React.CSSProperties = {
    fontSize: "var(--text-label)",
    color: "var(--color-text-muted)",
    fontWeight: 800,
    letterSpacing: ".08em",
    textTransform: "uppercase",
  };
  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "var(--text-h1)",
    lineHeight: 0.95,
    letterSpacing: "-.05em",
    color: "var(--color-text)",
  };
  const copyStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "var(--text-body)",
    color: "var(--color-text-muted)",
    lineHeight: 1.5,
  };
  const formStyle: React.CSSProperties = {
    display: "grid",
    gap: "var(--space-3)",
  };
  const fieldStyle: React.CSSProperties = {
    display: "grid",
    gap: 6,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "var(--text-label)",
    color: "var(--color-text-muted)",
    fontWeight: 700,
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    background: "var(--color-surface)",
    padding: "12px 14px",
    fontSize: "var(--text-body)",
    color: "var(--color-text)",
    outline: "none",
  };
  const primaryButtonStyle: React.CSSProperties = {
    border: 0,
    borderRadius: "var(--radius-pill)",
    background: "var(--color-primary)",
    color: "#fff",
    padding: "12px 16px",
    fontWeight: 800,
    fontSize: "var(--text-body)",
    cursor: "pointer",
  };
  const ghostButtonStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)",
    background: "transparent",
    color: "var(--color-text-muted)",
    borderRadius: "var(--radius-pill)",
    padding: "10px 14px",
    fontWeight: 700,
    fontSize: "var(--text-body-sm)",
    cursor: "pointer",
    width: "100%",
  };

  return (
    <div style={shellStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={eyebrowStyle}>Nihongo</div>
          <h1 style={titleStyle}>{isSignUp ? "Crear cuenta" : "Entrar"}</h1>
          <p style={copyStyle}>
            {isSignUp ? "Tu acceso queda listo aquí mismo." : "Accede a estudio y recursos."}
          </p>
        </div>

        <form onSubmit={handleAuth} style={formStyle}>
          {isSignUp && (
            <>
              <label style={fieldStyle}>
                <span style={labelStyle}>Nombre completo</span>
                <input type="text" placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={inputStyle} />
              </label>

              <label style={fieldStyle}>
                <span style={labelStyle}>Username</span>
                <input
                  type="text"
                  placeholder="ej. sakura_01"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={inputStyle}
                />
              </label>

              <label style={fieldStyle}>
                <span style={labelStyle}>Género</span>
                <select value={gender} onChange={(e) => setGender(e.target.value)} required style={inputStyle}>
                  <option value="">Selecciona una opción</option>
                  <option value="mujer">Mujer</option>
                  <option value="hombre">Hombre</option>
                  <option value="no_binario">No binario</option>
                  <option value="prefiero_no_decir">Prefiero no decir</option>
                  <option value="otro">Otro</option>
                </select>
              </label>

              <label style={fieldStyle}>
                <span style={labelStyle}>Fecha de nacimiento</span>
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required style={inputStyle} />
              </label>
            </>
          )}

          <label style={fieldStyle}>
            <span style={labelStyle}>Email</span>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Contraseña</span>
            <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
          </label>

          <button type="submit" style={primaryButtonStyle}>{isSignUp ? "Crear cuenta" : "Entrar"}</button>
        </form>

        <button onClick={() => setIsSignUp(!isSignUp)} style={ghostButtonStyle}>
          {isSignUp ? "Ya tengo cuenta" : "Crear cuenta nueva"}
        </button>
      </div>
    </div>
  );
}
