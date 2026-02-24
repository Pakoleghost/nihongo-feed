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

      // 2. Cargar Datos del Perfil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, avatar_url")
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
        <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 16px 0" }}>{profile?.username || "Usuario"}</h1>
        
        {/* BOTONERA: Editar y Cerrar Sesión */}
        <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
          <Link href="/profile/edit" style={{ 
            textDecoration: "none",
            padding: "8px 20px", 
            border: "1px solid #2cb696", 
            backgroundColor: "#fff",