"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function StudentProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: me } = await supabase.from("profiles").select("*").eq("id", user?.id).single();
    const { data: target } = await supabase.from("profiles").select("*").eq("id", id).single();
    setMyProfile(me);
    setProfile(target);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !profile) return <div style={{ padding: "50px", textAlign: "center" }}>Cargando...</div>;

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#2cb696", cursor: "pointer", fontWeight: "bold", marginBottom: "20px" }}>← Volver</button>
      <section style={{ textAlign: "center", padding: "30px", backgroundColor: "#fff", borderRadius: "20px", border: "1px solid #eee" }}>
        <div style={{ width: "100px", height: "100px", borderRadius: "50%", overflow: "hidden", margin: "0 auto 15px", border: "3px solid #2cb696" }}>
          {profile.avatar_url ? <img src={profile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
        </div>
        <h1 style={{ margin: 0 }}>{profile.full_name || profile.username}</h1>
        <p style={{ color: "#888" }}>@{profile.username} • {profile.group_name || "Sin grupo"}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
          <div style={{ padding: "10px", backgroundColor: "#eefaf5", borderRadius: "10px", border: "1px solid #2cb696" }}>
            <div style={{ fontSize: "10px", color: "#2cb696" }}>CURSO</div>
            <strong>{profile.cefr_level || "A1.1"}</strong>
          </div>
          <div style={{ padding: "10px", backgroundColor: "#fff5f5", borderRadius: "10px", border: "1px solid #f87171" }}>
            <div style={{ fontSize: "10px", color: "#f87171" }}>JLPT</div>
            <strong>{profile.jlpt_level || "---"}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}