"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { useStudentViewMode } from "@/lib/use-student-view-mode";

type Profile = {
  id: string;
  username: string | null;
  avatar_url?: string | null;
  group_name: string | null;
  is_admin: boolean | null;
};

type ClassForum = {
  id: string;
  group_name: string;
  title: string;
  is_active: boolean;
};

const fieldStyle = {
  border: "none",
  borderRadius: 18,
  background: "#F8F4EE",
  color: "#1A1A2E",
  padding: "14px 15px",
  fontSize: 15,
  outline: "none",
  fontFamily: "inherit",
} satisfies React.CSSProperties;

export default function NuevoForoTemaPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [forums, setForums] = useState<ClassForum[]>([]);
  const [selectedForumId, setSelectedForumId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { studentViewActive, studentViewGroupName } = useStudentViewMode(Boolean(profile?.is_admin));

  useEffect(() => {
    async function loadCreateContext() {
      setLoading(true);
      setErrorMessage(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, group_name, is_admin")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profileData) {
        setErrorMessage("No pudimos cargar tu perfil.");
        setLoading(false);
        return;
      }

      const currentProfile = profileData as Profile;
      setProfile(currentProfile);

      const forumFromUrl = new URLSearchParams(window.location.search).get("forum") ?? "";
      const canSeeAllGroups = Boolean(currentProfile.is_admin && !studentViewActive);
      const previewGroupName = currentProfile.is_admin && studentViewActive ? studentViewGroupName : null;
      const visibleGroupName = canSeeAllGroups ? null : previewGroupName || currentProfile.group_name;

      if (!canSeeAllGroups && !visibleGroupName) {
        setForums([]);
        setLoading(false);
        return;
      }

      let forumsQuery = supabase
        .from("class_forums")
        .select("id, group_name, title, is_active")
        .eq("is_active", true)
        .order("group_name", { ascending: true });

      if (!canSeeAllGroups) {
        forumsQuery = forumsQuery.eq("group_name", visibleGroupName);
      }

      const { data: forumData, error: forumError } = await forumsQuery;
      if (forumError) {
        setErrorMessage("No pudimos cargar los foros de clase.");
        setLoading(false);
        return;
      }

      const visibleForums = (forumData as ClassForum[] | null) ?? [];
      setForums(visibleForums);

      const urlForumIsAllowed = visibleForums.some((forum) => forum.id === forumFromUrl);
      setSelectedForumId(urlForumIsAllowed ? forumFromUrl : visibleForums[0]?.id ?? "");
      setLoading(false);
    }

    void loadCreateContext();
  }, [studentViewActive, studentViewGroupName]);

  const selectedForum = useMemo(
    () => forums.find((forum) => forum.id === selectedForumId) ?? null,
    [forums, selectedForumId],
  );

  async function handleCreateThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !selectedForum || creating || !title.trim() || !body.trim()) return;

    setCreating(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("forum_threads")
      .insert({
        forum_id: selectedForum.id,
        group_name: selectedForum.group_name,
        author_id: profile.id,
        title: title.trim(),
        body: body.trim(),
        tag: tag || null,
      })
      .select("id")
      .single();

    setCreating(false);

    if (error || !data) {
      setErrorMessage("No pudimos crear el tema. Revisa tu grupo o intenta otra vez.");
      return;
    }

    router.push(`/comunidad/foros/${(data as { id: string }).id}`);
  }

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "20px 20px calc(112px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => router.push("/comunidad/foros")}
          aria-label="Volver a Foros"
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            border: "none",
            background: "#FFFFFF",
            boxShadow: "0 2px 10px rgba(26,26,46,0.10)",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M12 5l-7 7 7 7"
              stroke="#1A1A2E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#1A1A2E", margin: 0, lineHeight: 1 }}>
            Nuevo tema
          </h1>
          <p style={{ fontSize: 14, color: "#6E737F", margin: "6px 0 0", lineHeight: 1.35 }}>
            Escribe una pregunta o inicia una conversación.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#9CA3AF", padding: "48px 0" }}>Preparando formulario...</div>
      ) : !profile ? (
        <div style={{ background: "#FFFFFF", borderRadius: 26, padding: 24, color: "#53596B" }}>
          Inicia sesión para crear un tema.
        </div>
      ) : forums.length === 0 ? (
        <div style={{ background: "#FFFFFF", borderRadius: 26, padding: 24, color: "#53596B" }}>
          No hay un foro disponible para crear temas.
        </div>
      ) : (
        <form
          onSubmit={handleCreateThread}
          style={{
            background: "#FFFFFF",
            borderRadius: 28,
            padding: 18,
            boxShadow: "0 6px 22px rgba(26,26,46,0.08)",
            display: "grid",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              borderRadius: 22,
              background: "rgba(78,205,196,0.12)",
              padding: "12px 14px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, color: "#178A83", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Foro
              </p>
              <p style={{ margin: "4px 0 0", color: "#1A1A2E", fontSize: 16, fontWeight: 800, lineHeight: 1.15 }}>
                {selectedForum?.title ?? "Foro de clase"}
              </p>
            </div>
            <span
              style={{
                borderRadius: 999,
                background: "#FFFFFF",
                color: "#53596B",
                padding: "7px 10px",
                fontSize: 12,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {selectedForum?.group_name}
            </span>
          </div>

          {forums.length > 1 ? (
            <label style={{ display: "grid", gap: 7 }}>
              <span style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Grupo
              </span>
              <select value={selectedForumId} onChange={(event) => setSelectedForumId(event.target.value)} style={fieldStyle}>
                {forums.map((forum) => (
                  <option key={forum.id} value={forum.id}>
                    {forum.group_name} · {forum.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label style={{ display: "grid", gap: 7 }}>
            <span style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Título
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Duda sobre la tarea"
              maxLength={120}
              style={{ ...fieldStyle, fontWeight: 800 }}
            />
          </label>

          <label style={{ display: "grid", gap: 7 }}>
            <span style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Mensaje
            </span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Escribe el primer mensaje..."
              rows={6}
              style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.45 }}
            />
          </label>

          <label style={{ display: "grid", gap: 7 }}>
            <span style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Etiqueta
            </span>
            <select value={tag} onChange={(event) => setTag(event.target.value)} style={fieldStyle}>
              <option value="">Sin etiqueta</option>
              <option value="General">General</option>
              <option value="Kana">Kana</option>
              <option value="Vocabulario">Vocabulario</option>
              <option value="Kanji">Kanji</option>
              <option value="Tarea">Tarea</option>
            </select>
          </label>

          {errorMessage ? (
            <div
              style={{
                borderRadius: 18,
                background: "rgba(230,57,70,0.10)",
                color: "#C53340",
                padding: 13,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={creating || !title.trim() || !body.trim()}
            style={{
              border: "none",
              borderRadius: 999,
              background: creating || !title.trim() || !body.trim() ? "#C4BAB0" : "#E63946",
              color: "#FFFFFF",
              padding: "14px 16px",
              fontSize: 15,
              fontWeight: 900,
              cursor: creating || !title.trim() || !body.trim() ? "not-allowed" : "pointer",
            }}
          >
            {creating ? "Creando..." : "Crear tema"}
          </button>
        </form>
      )}

      <BottomNav />
    </div>
  );
}
