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
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: me } = await supabase.from("profiles").select("*").eq("id", user?.id).single();
    const { data: target } = await supabase.from("profiles").select("*").eq("id", id).single();
    const { data: posts } = await supabase.from("posts").select("*").eq("user_id", id).order("created_at", { ascending: false });
    const { data: grps } = await supabase.from("groups").select("name");

    setMyProfile(me);
    setProfile(target);
    setUserPosts(posts || []);
    setGroups(grps || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateProfile = async (field: string, val: string) => {
    await supabase.from("profiles").update({ [field]: val }).eq("id", id);
    fetchData();
  };

  if (loading || !profile) return <div style={{ textAlign: "center", padding: "50px" }}>Cargando...</div>;

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <Link href="/" style={{ color: "#2cb696", textDecoration: "none", fontWeight: "bold" }}>← Volver</Link>
      
      <section style={{ textAlign: "center", padding: "30px", borderBottom: "1px solid #eee" }}>
        <div style={{ width: "100px", height: "100px", borderRadius: "50%", margin: "0 auto 15px", overflow: "hidden", border: "3px solid #2cb696" }}>
          <img src={profile.avatar_url || "https://via.placeholder.com/100"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <h1 style={{ margin: 0 }}>{profile.username}</h1>
        <p style={{ color: "#888" }}>{profile.group_name || "Sin grupo"}</p>

        {myProfile?.is_admin && (
          <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "12px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <select value={profile.group_name || ""} onChange={e => updateProfile("group_name", e.target.value)}>
              <option value="">Cambiar Grupo</option>
              {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
            </select>
            <select value={profile.cefr_level || ""} onChange={e => updateProfile("cefr_level", e.target.value)}>
              {["A1.1", "A1.2", "A2.1", "A2.2", "A2+", "B1.1"].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        )}
      </section>

      <section style={{ marginTop: "30px" }}>
        <h3>Publicaciones de {profile.username}</h3>
        {userPosts.map(p => (
          <Link key={p.id} href={`/post/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ padding: "15px", borderBottom: "1px solid #f5f5f5" }}>
              <strong>{p.content.split('\n')[0]}</strong>
              <div style={{ fontSize: "12px", color: "#999" }}>{new Date(p.created_at).toLocaleDateString()}</div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}