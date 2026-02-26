"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

async function compressAvatar(file: File) {
  if (!file.type.startsWith("image/")) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("avatar"));
      el.src = url;
    });

    const max = 900;
    let { width, height } = img;
    const scale = Math.min(1, max / width, max / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function EditProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>({ username: "", full_name: "", bio: "", avatar_url: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    const getProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) setProfile(data);
    };
    void getProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAvatarFile(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  };

  const uploadAvatarIfNeeded = async (userId: string) => {
    if (!avatarFile) return profile.avatar_url || null;

    setUploadingAvatar(true);
    const compressed = await compressAvatar(avatarFile);
    const ext = compressed.name.split(".").pop() || "jpg";
    const path = `avatars/${userId}-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from("uploads").upload(path, compressed);
    setUploadingAvatar(false);

    if (error || !data?.path) throw new Error("avatar upload failed");

    const { data: publicUrlData } = supabase.storage.from("uploads").getPublicUrl(data.path);
    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const avatarUrl = await uploadAvatarIfNeeded(user.id);

      await supabase
        .from("profiles")
        .update({
          username: profile.username,
          full_name: profile.full_name,
          bio: profile.bio,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);

      router.push(`/profile/${user.id}`);
    } catch {
      alert("No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="editProfilePage">
        <div className="editShell">
          <header className="editTop">
            <Link href="/" className="ghostBtn">← Volver</Link>
            <div>
              <div className="eyebrow">Perfil</div>
              <h1>Editar perfil</h1>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="editGrid">
            <section className="mainCard">
              <div className="field">
                <label>Nombre de usuario</label>
                <input
                  type="text"
                  value={profile.username || ""}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Nombre completo</label>
                <input
                  type="text"
                  value={profile.full_name || ""}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Biografía</label>
                <textarea
                  value={profile.bio || ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Escribe algo sobre ti..."
                  rows={7}
                />
              </div>

              <div className="actions">
                <button type="submit" disabled={saving || uploadingAvatar} className="primaryBtn">
                  {uploadingAvatar ? "Subiendo foto..." : saving ? "Guardando..." : "Guardar cambios"}
                </button>
                <button type="button" onClick={() => router.back()} className="secondaryBtn">
                  Cancelar
                </button>
              </div>
            </section>

            <aside className="sideCard">
              <div className="sideHeader">
                <div className="eyebrow">Avatar</div>
                <strong>Foto de perfil</strong>
              </div>

              <div className="avatarPreviewWrap">
                {avatarPreview || profile.avatar_url ? (
                  <img src={avatarPreview || profile.avatar_url} alt="" className="avatarPreviewImg" />
                ) : (
                  <div className="avatarFallback">👤</div>
                )}
              </div>

              <label className="uploadBtn">
                Seleccionar foto
                <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
              </label>

              <p className="sideHint">
                Toca la foto en tu perfil para venir aquí rápidamente y cambiarla.
              </p>
            </aside>
          </form>
        </div>
      </div>

      <style jsx>{`
        .editProfilePage {
          min-height: 100vh;
          background: radial-gradient(900px 420px at 50% -10%, rgba(44, 182, 150, 0.08), transparent 65%), #f6f7f8;
          padding: 14px;
        }
        .editShell {
          max-width: 1080px;
          margin: 0 auto;
        }
        .editTop {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          position: sticky;
          top: 0;
          z-index: 10;
          background: rgba(246,247,248,.84);
          backdrop-filter: blur(10px);
          padding: 10px 0;
        }
        .ghostBtn {
          border: 1px solid rgba(17,17,20,.1);
          background: #fff;
          color: #222;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 13px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #7a7a84;
          font-weight: 800;
        }
        .editTop h1 {
          margin: 4px 0 0;
          font-size: 24px;
          line-height: 1;
          letter-spacing: -.02em;
          color: #111114;
        }
        .editGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 14px;
        }
        .mainCard, .sideCard {
          background: #fff;
          border: 1px solid rgba(17,17,20,.07);
          border-radius: 20px;
          box-shadow: 0 12px 30px rgba(0,0,0,.035);
          padding: 16px;
        }
        .field {
          display: grid;
          gap: 6px;
          margin-bottom: 12px;
        }
        .field label {
          font-size: 12px;
          color: #666a73;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
        }
        .field input, .field textarea {
          width: 100%;
          border: 1px solid rgba(17,17,20,.1);
          background: #fbfbfc;
          border-radius: 12px;
          padding: 11px 12px;
          font-size: 14px;
          font-family: inherit;
          color: #222;
          outline: none;
        }
        .field textarea {
          resize: vertical;
          line-height: 1.6;
          min-height: 130px;
        }
        .field input:focus, .field textarea:focus {
          border-color: rgba(44,182,150,.32);
          box-shadow: 0 0 0 4px rgba(44,182,150,.08);
          background: #fff;
        }
        .actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 8px;
        }
        .primaryBtn, .secondaryBtn {
          border-radius: 999px;
          padding: 11px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .primaryBtn {
          border: 0;
          color: #fff;
          background: linear-gradient(135deg, #34c5a6, #25a98f);
          box-shadow: 0 8px 18px rgba(44,182,150,.2);
        }
        .secondaryBtn {
          border: 1px solid rgba(17,17,20,.1);
          background: #fff;
          color: #444;
        }
        .primaryBtn:disabled { opacity: .6; cursor: not-allowed; box-shadow: none; }
        .sideHeader strong {
          display: block;
          margin-top: 4px;
          color: #111114;
          font-size: 16px;
        }
        .avatarPreviewWrap {
          margin-top: 12px;
          width: 140px;
          height: 140px;
          border-radius: 999px;
          overflow: hidden;
          border: 2px solid #fff;
          box-shadow: 0 0 0 1px rgba(17,17,20,.08);
          background: #f5f5f5;
          display: grid;
          place-items: center;
        }
        .avatarPreviewImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .avatarFallback {
          color: #999;
          font-size: 32px;
        }
        .uploadBtn {
          margin-top: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(17,17,20,.1);
          background: #fff;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          color: #222;
        }
        .sideHint {
          margin: 10px 0 0;
          font-size: 12px;
          color: #7c7c85;
          line-height: 1.45;
        }

        @media (min-width: 980px) {
          .editProfilePage { padding: 18px 22px 28px; }
          .editGrid {
            grid-template-columns: minmax(0, 1fr) 320px;
            align-items: start;
          }
          .sideCard {
            position: sticky;
            top: 76px;
          }
        }
      `}</style>
    </>
  );
}
