"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      // Proceso de Registro
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (data.user) {
        // Creamos el perfil en la base de datos inmediatamente
        await supabase.from("profiles").insert([{ id: data.user.id, username }]);
        alert("¡Cuenta creada! Revisa tu correo o intenta iniciar sesión.");
        setIsSignUp(false);
      }
      if (error) alert("Error: " + error.message);
    } else {
      // Proceso de Login
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert("Error: " + error.message);
      else {
        router.push("/");
        router.refresh();
      }
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "80px auto", padding: "20px", fontFamily: "sans-serif", border: "1px solid #eee", borderRadius: "10px" }}>
      <h1 style={{ textAlign: "center", color: "#333" }}>{isSignUp ? "Registro de Alumno" : "Iniciar Sesión"}</h1>
      
      <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {isSignUp && (
          <input 
            type="text" 
            placeholder="Nombre de usuario (ej. Pako-sensei)" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
            style={{ padding: "12px", borderRadius: "5px", border: "1px solid #ddd" }}
          />
        )}
        <input 
          type="email" 
          placeholder="Correo electrónico" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: "12px", borderRadius: "5px", border: "1px solid #ddd" }}
        />
        <input 
          type="password" 
          placeholder="Contraseña" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: "12px", borderRadius: "5px", border: "1px solid #ddd" }}
        />
        <button type="submit" style={{ padding: "12px", backgroundColor: "#2cb696", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
          {isSignUp ? "Crear Cuenta" : "Entrar a la Clase"}
        </button>
      </form>

      <button 
        onClick={() => setIsSignUp(!isSignUp)} 
        style={{ marginTop: "20px", width: "100%", background: "none", border: "none", color: "#2cb696", cursor: "pointer", fontSize: "14px" }}
      >
        {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿Eres nuevo? Regístrate aquí"}
      </button>
    </div>
  );
}