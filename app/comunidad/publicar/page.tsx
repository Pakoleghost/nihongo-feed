"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { optimizeImageFile, validateImageFile } from "@/lib/client-image-upload";

export default function PublicarPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubmitError(null);
    try {
      validateImageFile(file);
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo usar esta imagen.");
      e.target.value = "";
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  }

  async function handleSubmit() {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const user = session.user;

      let imageUrl: string | null = null;

      if (imageFile) {
        const optimizedImage = await optimizeImageFile(imageFile, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.8,
        });
        const ext = optimizedImage.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("comunidad-images")
          .upload(path, optimizedImage, { upsert: false });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        if (!uploadData) {
          throw new Error("No se pudo subir la imagen.");
        }

        const { data: urlData } = supabase.storage
          .from("comunidad-images")
          .getPublicUrl(uploadData.path);
        imageUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase.from("comunidad_posts").insert({
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrl,
        likes: 0,
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      router.push("/comunidad");
    } catch (error) {
      setSubmitError(
        imageFile
          ? `No se publicó. No pudimos completar la publicación con imagen: ${error instanceof Error ? error.message : "intenta otra vez."}`
          : "No pudimos publicar. Intenta otra vez.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Scrollable area */}
      <div style={{ flex: 1, padding: "52px 20px 120px" }}>
        {/* Back button + title */}
        <button
          onClick={() => router.back()}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "#FFFFFF",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 10px rgba(26,26,46,0.10)",
            marginBottom: "24px",
          }}
          aria-label="Volver"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M12 5l-7 7 7 7"
              stroke="#1A1A2E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <h1
          style={{
            fontSize: "28px",
            fontWeight: 800,
            color: "#1A1A2E",
            margin: "0 0 28px",
          }}
        >
          Nueva publicación
        </h1>

        {/* Text area */}
        <div
          style={{
            borderBottom: "2px solid #E5E7EB",
            marginBottom: "28px",
          }}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe en japonés..."
            rows={5}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: "18px",
              color: "#1A1A2E",
              fontFamily: "var(--font-noto-sans-jp), sans-serif",
              resize: "none",
              padding: "8px 0",
              lineHeight: 1.6,
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Image area */}
        {imagePreview ? (
          <div style={{ position: "relative", marginBottom: "16px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="preview"
              style={{
                width: "100%",
                borderRadius: "16px",
                display: "block",
                maxHeight: "260px",
                objectFit: "cover",
              }}
            />
            <button
              onClick={clearImage}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.55)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontSize: "16px",
              }}
            >
              ×
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "100%",
              padding: "24px",
              borderRadius: "16px",
              border: "2px dashed #D1D5DB",
              background: "transparent",
              cursor: "pointer",
              fontSize: "20px",
              color: "#9CA3AF",
              fontWeight: 600,
            }}
          >
            ＋ Agregar imagen
          </button>
        )}

        {submitError && (
          <p style={{ color: "#C53340", fontSize: 14, fontWeight: 700, margin: "14px 0 0", lineHeight: 1.4 }}>
            {submitError}
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>

      {/* Fixed bottom button */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "16px 20px 36px",
          background: "linear-gradient(to top, #FFF8E7 70%, transparent)",
        }}
      >
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
          style={{
            width: "100%",
            padding: "18px",
            borderRadius: "999px",
            border: "none",
            cursor: !content.trim() || submitting ? "not-allowed" : "pointer",
            background: !content.trim() || submitting ? "#C4BAB0" : "#E63946",
            color: "#FFFFFF",
            fontSize: "17px",
            fontWeight: 700,
            transition: "background 0.15s",
            boxShadow: !content.trim() || submitting ? "none" : "0 4px 20px rgba(230,57,70,0.3)",
          }}
        >
          {submitting ? "Publicando..." : "Publicar"}
        </button>
      </div>
    </div>
  );
}
