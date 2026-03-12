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
          router.push("/");
          router.refresh();
        }
      }
    } catch (err: any) {
      console.error("handleAuth fatal:", err);
      alert(err?.message || "Ocurrió un error inesperado. Intenta de nuevo.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "60px auto", padding: "20px", fontFamily: "sans-serif", border: "1px solid #eee", borderRadius: "10px" }}>
      <h1 style={{ textAlign: "center" }}>Nihongo Feed</h1>
      <p style={{ textAlign: "center", margin: "6px 0 18px", color: "#6b7280", fontSize: "13px" }}>
        {isSignUp ? "Crear cuenta nueva" : "Iniciar sesión"}
      </p>
      <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {isSignUp && (
          <>
            <input type="text" placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={{ padding: "12px", borderRadius: "5px", border: "1px solid #ddd" }} />
            <input
              type="text"
              placeholder="Username (ej. sakura_01)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ padding: "12px", borderRadius: "5px", border: "1px solid #ddd" }}
            />
            <select value={gender} onChange={(e) => setGender(e.target.value)} required style={{ padding: "12px", borderRadius: "5px", border: "1px solid #ddd" }}>
              <option value="">Género</option>
              <option value="mujer">Mujer</option>
              <option value="hombre">Hombre</option>
              <option value="no_binario">No binario</option>
              <option value="prefiero_no_decir">Prefiero no decir</option>
              <option value="otro">Otro</option>
            </select>
            <div style={{ display: "grid", gap: "6px" }}>
              <label style={{ fontSize: "12px", color: "#666" }}>Fecha de nacimiento</label>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required style={{ padding: "12px", borderRadius: "5px", border: "1px solid #ddd" }} />
            </div>
          </>
        )}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: "12px", borderRadius: "5px", border: "1px solid #ddd" }} />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: "12px", borderRadius: "5px", border: "1px solid #ddd" }} />
        <button type="submit" style={{ padding: "12px", backgroundColor: "#2cb696", color: "white", border: "none", borderRadius: "5px", fontWeight: "bold" }}>{isSignUp ? "Crear Cuenta" : "Entrar"}</button>
      </form>
      <button onClick={() => setIsSignUp(!isSignUp)} style={{ marginTop: "20px", background: "none", border: "none", color: "#2cb696", cursor: "pointer", width: "100%" }}>
        {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿Eres nuevo? Regístrate aquí"}
      </button>
    </div>
  );
}
