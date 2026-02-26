"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function toUsernameBase(name: string): string {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 20);

  return normalized || `student-${Math.random().toString(36).slice(2, 8)}`;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [availableGroups, setAvailableGroups] = useState<{ name: string }[]>([]);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadGroups = async () => {
      const { data } = await supabase.from("groups").select("name").order("name");
      if (data && data.length > 0) {
        setAvailableGroups(data);
        setGroupName(data[0].name);
      }
    };
    loadGroups();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignUp) {
      const normalizedFullName = fullName.trim();
      if (!normalizedFullName) {
        alert("Escribe tu nombre completo.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert(error.message);
        return;
      }

      if (data.user) {
        const baseUsername = toUsernameBase(normalizedFullName);
        const generatedUsername = `${baseUsername}-${Math.random().toString(36).slice(2, 6)}`;

        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: data.user.id,
            username: generatedUsername,
            full_name: normalizedFullName,
            group_name: groupName,
          },
        ]);

        if (profileError) {
          alert(profileError.message);
          return;
        }

        const { data: admins } = await supabase
          .from("profiles")
          .select("id")
          .eq("is_admin", true);

        if (admins && admins.length > 0) {
          const notifications = admins.map((admin) => ({
            user_id: admin.id,
            message: `Nueva solicitud de acceso: ${normalizedFullName}`,
            link: `/profile/${data.user!.id}`,
            is_read: false,
          }));

          await supabase.from("notifications").insert(notifications);
        }

        alert("¡Cuenta creada! Espera aprobación del sensei.");
        setIsSignUp(false);
        setFullName("");
      }

      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "60px auto", padding: "20px", fontFamily: "sans-serif", border: "1px solid #eee", borderRadius: "10px" }}>
      <h1 style={{ textAlign: "center" }}>{isSignUp ? "Registro de Alumno" : "Nihongo Note"}</h1>
      <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {isSignUp && (
          <>
            <input type="text" placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={{ padding: "12px", borderRadius: "5px", border: "1px solid #ddd" }} />
            <select value={groupName} onChange={(e) => setGroupName(e.target.value)} style={{ padding: "12px", borderRadius: "5px", border: "1px solid #ddd" }}>
              {availableGroups.map((g, i) => <option key={i} value={g.name}>{g.name}</option>)}
            </select>
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
