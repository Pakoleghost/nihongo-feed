"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Post = {
  id: string;
  content: string;
  created_at: string;
  image_url: string | null;
};

type Profile = {
  username: string;
  avatar_url: string | null;
  group_name: string | null; // Añadido para el sistema de clases
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      setLoading(true);
      
      // 1. Verificar Usuario
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      // 2. Cargar Datos del Perfil (Incluyendo el nombre del grupo)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, avatar_url, group_name")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // 3. Cargar MIS posts (Filtrados por user_id)
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, content, created_at, image_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (postsData) {
        setMyPosts(postsData);
      }

      setLoading(false);
    };

    fetchProfileAndPosts();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>Cargando perfil...</div>;
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      
      {/* HEADER: Botón volver */}
      <div style={{ marginBottom: "20px" }}>
        <Link href="/" style={{ textDecoration: "none", color: "#888" }}>← Volver al inicio</Link>
      </div>

      {/* TARJETA DE PERFIL */}
      <div style={{ textAlign: "center", marginBottom: "40px", paddingBottom: "20px", borderBottom: "1px solid #eee" }}>
        {/* Avatar Grande */}
        <div style={{ width: "100px", height: "100px", borderRadius: "50%", backgroundColor: "#eee", margin: "0 auto 16px", overflow: "hidden" }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", color: "#999" }}>
              {profile?.username?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
        
        {/* Nombre de usuario */}
        <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 8px 0" }}>{profile?.username || "Usuario"}</h1>
        
        {/* Clase / Grupo (Lectura únicamente para el alumno) */}
        <div style={{ marginBottom: "20px" }}>
          <span style={{ 
            display: "inline-block",
            padding: "4px 12px", 
            backgroundColor: "#f0f0f0", 
            borderRadius: "15px", 
            fontSize: "13px", 
            color: "#666" 
          }}>
            🏫 Clase: <strong>{profile?.group_name || "Sin clase asignada"}</strong>
          </span>
          <p style={{ fontSize: "11px", color: "#aaa", marginTop: "5px" }}>* El cambio de grupo solo lo puede realizar el maestro.</p>
        </div>
        
        {/* BOTONERA: Editar y Cerrar Sesión */}
        <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
          <Link href="/profile/edit" style={{ 
            textDecoration: "none",
            padding: "8px 20px", 
            border: "1px solid #2cb696", 
            backgroundColor: "#fff", 
            color: "#2cb696",
            borderRadius: "20px", 
            fontSize: "14px",
            fontWeight: "bold"
          }}>
            Editar Perfil
          </Link>

          <button 
            onClick={handleLogout}
            style={{ 
              padding: "8px 20px", 
              border: "1px solid #ddd", 
              backgroundColor: "transparent", 
              borderRadius: "20px", 
              cursor: "pointer",
              fontSize: "14px",
              color: "#666"
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* LISTA DE MIS POSTS */}
      <h2 style={{ fontSize: "18px", marginBottom: "20px", fontWeight: "bold" }}>Mis Publicaciones ({myPosts.length})</h2>

      {myPosts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#f9f9f9", borderRadius: "8px", color: "#666" }}>
          <p>Aún no has escrito nada.</p>
          <Link href="/write" style={{ color: "#2cb696", fontWeight: "bold", textDecoration: "none" }}>¡Escribe tu primer post!</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {myPosts.map((post) => (
            <Link href={`/post/${post.id}`} key={post.id} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ 
                display: "flex", 
                gap: "16px", 
                padding: "16px", 
                border: "1px solid #eaeaea", 
                borderRadius: "8px",
                transition: "box-shadow 0.2s",
                backgroundColor: "#fff"
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "bold", color: "#333", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {post.content.split('\n')[0] || "Sin título"}
                  </h3>
                  <div style={{ fontSize: "12px", color: "#999" }}>
                    {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>

                {post.image_url && (
                  <div style={{ width: "60px", height: "60px", borderRadius: "4px", overflow: "hidden", flexShrink: 0, backgroundColor: "#f0f0f0" }}>
                    <img src={post.image_url} alt="Thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}