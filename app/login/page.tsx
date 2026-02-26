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

export default function LoginPage() { // <--- ESTO ES LO QUE BUSCA VERCEL
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [groupName, setGroupName] = useState("");
  const [availableGroups, setAvailableGroups] = useState<{name: string}[]>([]);
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
      if (!fullName.trim()) return alert("Escribe tu nombre completo.");
      if (!gender) return alert("Selecciona tu género.");
      if (!birthDate) return alert("Selecciona tu fecha de nacimiento.");
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (data.user) {
        const generatedUsername = `${toUsernameBase(fullName.trim())}-${Math.random().toString(36).slice(2, 6)}`;
        const profilePayload = {
          id: data.user.id,
          username: generatedUsername,
          full_name: fullName.trim(),
          group_name: groupName,
          gender,
          birth_date: birthDate,
        };
        const { error: profileError } = await supabase.from("profiles").insert([profilePayload]);
        if (profileError) {
          // Fallback if newer research fields are not in the schema yet.
          const { error: fallbackError } = await supabase.from("profiles").insert([{
            id: data.user.id,
            username: generatedUsername,
            full_name: fullName.trim(),
            group_name: groupName,
          }]);
          if (fallbackError) {
            alert(`Cuenta creada pero no se pudo guardar el perfil: ${fallbackError.message}`);
            return;
          }
          alert(`Cuenta creada. Nota: género/fecha de nacimiento no se guardaron aún (falta actualizar la base de datos).`);
        } else {
          alert("¡Cuenta creada!");
        }
        setIsSignUp(false);
        setFullName("");
        setGender("");
        setBirthDate("");
      }
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else {
        router.push("/");
        router.refresh();
      }
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
