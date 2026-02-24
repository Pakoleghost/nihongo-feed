"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [groupName, setGroupName] = useState("Genki 1"); // Grupo por defecto
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (data.user) {
        // Guardamos el nombre Y el grupo elegido
        await supabase.from("profiles").insert([
          { id: data.user.id, username, group_name: groupName }
        ]);
        alert("¡Cuenta creada! Ya puedes iniciar sesión.");
        setIsSignUp(false);
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
            <input 
              type="text" placeholder="Nombre completo" value={username} 
              onChange={(e) => setUsername(e.target.value)} required 
              style={{ padding: "12px", borderRadius: "5px", border: "1px solid #ddd" }}
            />
            <label style={{ fontSize: "14px", color: "#666" }}>Selecciona tu clase:</label>
            <select 
              value={groupName} onChange={(e) => setGroupName(e.target.value)}
              style={{ padding: "12px", borderRadius: "5px", border: "1px solid #ddd", backgroundColor: "#fff" }}
            >
              <option value="Genki 1">Genki 1 (Principiantes)</option>
              <option value="Genki 2">Genki 2 (Intermedios)</option>
              <option value="Oyentes">Oyentes / Otros</option>
            </select>
          </>
        )}
        
        <input 
          type="email" placeholder="Correo electrónico" value={email} 
          onChange={(e) => setEmail(e.target.value)} required 
          style={{ padding: "12px", borderRadius: "5px", border: "1px solid #ddd" }}
        />
        <input 
          type="password" placeholder="Contraseña" value={password} 
          onChange={(e) => setPassword(e.target.value)} required 
          style={{ padding: "12px", borderRadius: "5px", border: "1px solid #ddd" }}
        />
        
        <button type="submit" style={{ padding: "12px", backgroundColor: "#2cb696", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
          {isSignUp ? "Crear Cuenta" : "Entrar"}
        </button>
      </form>

      <button 
        onClick={() => setIsSignUp(!isSignUp)} 
        style={{ marginTop: "20px", width: "100%", background: "none", border: "none", color: "#2cb696", cursor: "pointer" }}
      >
        {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿Eres nuevo? Regístrate aquí"}
      </button>
    </div>
  );
}