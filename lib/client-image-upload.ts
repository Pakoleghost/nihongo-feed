"use client";

export type OptimizeImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxFileSizeMb?: number;
};

const DEFAULT_MAX_WIDTH = 1600;
const DEFAULT_MAX_HEIGHT = 1600;
const DEFAULT_QUALITY = 0.8;
const DEFAULT_MAX_FILE_SIZE_MB = 20;

export function validateImageFile(file: File, options?: { maxFileSizeMb?: number }) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecciona una imagen válida.");
  }

  const maxFileSizeMb = options?.maxFileSizeMb ?? DEFAULT_MAX_FILE_SIZE_MB;
  const maxBytes = maxFileSizeMb * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new Error(`La imagen es demasiado pesada. Máximo ${maxFileSizeMb} MB.`);
  }
}

export async function optimizeImageFile(file: File, options?: OptimizeImageOptions) {
  validateImageFile(file, { maxFileSizeMb: options?.maxFileSizeMb });

  const maxWidth = options?.maxWidth ?? DEFAULT_MAX_WIDTH;
  const maxHeight = options?.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("No se pudo leer la imagen."));
      el.src = imageUrl;
    });

    let { width, height } = img;
    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, width, height);

    const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outType, outType === "image/png" ? undefined : quality),
    );

    if (!blob) return file;

    const optimizedName =
      outType === "image/png"
        ? file.name.replace(/\.[^.]+$/, ".png")
        : file.name.replace(/\.[^.]+$/, ".jpg");

    return new File([blob], optimizedName, {
      type: outType,
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
