"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type KanaHandwritingRating = "wrong" | "almost" | "correct";

type StrokePoint = { x: number; y: number };
type Stroke = StrokePoint[];

type RecognitionResult = {
  score: number;
  status: "empty" | "uncertain" | "confident";
};

type KanaHandwritingPadProps = {
  targetKana: string;
  onRated: (rating: KanaHandwritingRating, score: number) => void;
};

function getStrokeBounds(strokes: Stroke[]) {
  const points = strokes.flat();
  if (points.length === 0) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function getCanvasPoint(event: PointerEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function renderStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "#FFFDFC";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#1A1A2E";
  ctx.lineWidth = 16;

  strokes.forEach((stroke) => {
    if (stroke.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let index = 1; index < stroke.length; index += 1) {
      ctx.lineTo(stroke[index].x, stroke[index].y);
    }
    if (stroke.length === 1) {
      ctx.lineTo(stroke[0].x + 0.1, stroke[0].y + 0.1);
    }
    ctx.stroke();
  });
}

function normalizeCanvas(sourceCanvas: HTMLCanvasElement) {
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = 48;
  sampleCanvas.height = 48;
  const sampleCtx = sampleCanvas.getContext("2d");
  if (!sampleCtx) return null;

  sampleCtx.fillStyle = "#FFFFFF";
  sampleCtx.fillRect(0, 0, 48, 48);
  sampleCtx.drawImage(sourceCanvas, 0, 0, 48, 48);
  const data = sampleCtx.getImageData(0, 0, 48, 48).data;
  const pixels = new Uint8Array(48 * 48);

  for (let index = 0; index < 48 * 48; index += 1) {
    const base = index * 4;
    const darkness = 255 - data[base];
    pixels[index] = darkness > 40 ? 1 : 0;
  }

  return pixels;
}

function buildTargetCanvas(targetKana: string, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#1A1A2E";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.floor(width * 0.52)}px "Noto Sans JP", "Hiragino Sans", sans-serif`;
  ctx.fillText(targetKana, width / 2, height / 2 + 6);
  return canvas;
}

function compareDrawingToTarget(drawingCanvas: HTMLCanvasElement, targetKana: string): RecognitionResult {
  const drawingPixels = normalizeCanvas(drawingCanvas);
  if (!drawingPixels) return { score: 0, status: "uncertain" };

  const activePixels = drawingPixels.reduce((sum, value) => sum + value, 0);
  if (activePixels < 40) return { score: 0, status: "empty" };

  const targetCanvas = buildTargetCanvas(targetKana, drawingCanvas.width, drawingCanvas.height);
  const targetPixels = normalizeCanvas(targetCanvas);
  if (!targetPixels) return { score: 0, status: "uncertain" };

  let intersection = 0;
  let union = 0;
  for (let index = 0; index < drawingPixels.length; index += 1) {
    const drawingValue = drawingPixels[index];
    const targetValue = targetPixels[index];
    if (drawingValue || targetValue) union += 1;
    if (drawingValue && targetValue) intersection += 1;
  }

  const score = union > 0 ? intersection / union : 0;
  return { score, status: score >= 0.32 ? "confident" : "uncertain" };
}

export default function KanaHandwritingPad({ targetKana, onRated }: KanaHandwritingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<StrokePoint[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [recognition, setRecognition] = useState<RecognitionResult>({ score: 0, status: "empty" });

  useEffect(() => {
    setStrokes([]);
    setActiveStroke([]);
    setReviewMode(false);
    setRecognition({ score: 0, status: "empty" });
  }, [targetKana]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 300;
    canvas.height = 240;
    canvas.style.width = "100%";
    canvas.style.height = "240px";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderStrokes(ctx, []);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderStrokes(ctx, [...strokes, activeStroke]);
  }, [strokes, activeStroke]);

  const drawingBounds = useMemo(() => getStrokeBounds([...strokes, activeStroke]), [strokes, activeStroke]);

  const evaluateRecognition = () => {
    const canvas = canvasRef.current;
    if (!canvas) return { score: 0, status: "empty" as const };
    const result = compareDrawingToTarget(canvas, targetKana);
    setRecognition(result);
    return result;
  };

  useEffect(() => {
    if (!reviewMode && strokes.length > 0) {
      evaluateRecognition();
    }
  }, [reviewMode, strokes, targetKana]);

  const clearCanvas = () => {
    setStrokes([]);
    setActiveStroke([]);
    setReviewMode(false);
    setRecognition({ score: 0, status: "empty" });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (reviewMode) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      setActiveStroke([getCanvasPoint(event, canvas)]);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (reviewMode || activeStroke.length === 0) return;
      event.preventDefault();
      setActiveStroke((previous) => [...previous, getCanvasPoint(event, canvas)]);
    };

    const endStroke = (event: PointerEvent) => {
      if (reviewMode || activeStroke.length === 0) return;
      event.preventDefault();
      const nextStroke = [...activeStroke, getCanvasPoint(event, canvas)];
      setStrokes((previous) => [...previous, nextStroke]);
      setActiveStroke([]);
      window.setTimeout(() => {
        evaluateRecognition();
      }, 16);
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointerleave", endStroke);
    canvas.addEventListener("pointercancel", endStroke);
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", endStroke);
      canvas.removeEventListener("pointerleave", endStroke);
      canvas.removeEventListener("pointercancel", endStroke);
    };
  }, [activeStroke, reviewMode, targetKana]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          borderRadius: 24,
          background: "color-mix(in srgb, var(--color-surface) 84%, white)",
          padding: 14,
          border: "1px solid var(--color-border)",
          display: "grid",
          gap: 10,
        }}
      >
        <canvas
          ref={canvasRef}
          aria-label="Área de escritura manual"
          style={{
            width: "100%",
            height: 240,
            borderRadius: 18,
            background: "#FFFDFC",
            touchAction: "none",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 700 }}>
            {recognition.status === "confident"
              ? "✓ Se parece bien"
              : recognition.status === "empty"
                ? "Traza el kana"
                : "Reconocimiento aproximado"}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={clearCanvas} className="ds-btn-secondary">
              Borrar
            </button>
            <button
              type="button"
              onClick={() => {
                evaluateRecognition();
                setReviewMode(true);
              }}
              className="ds-btn"
              disabled={!drawingBounds}
            >
              Submit
            </button>
          </div>
        </div>
      </div>

      {reviewMode && (
        <div
          style={{
            borderRadius: 24,
            background: "color-mix(in srgb, var(--color-surface-muted) 70%, white)",
            border: "1px solid var(--color-border)",
            padding: 14,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>
              Objetivo
            </div>
            <div style={{ fontSize: 42, lineHeight: 1, fontWeight: 800, color: "var(--color-text)" }}>{targetKana}</div>
          </div>

          <div style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 700 }}>
            {recognition.status === "confident"
              ? `Reconocimiento aproximado: ${Math.round(recognition.score * 100)}%`
              : "La app no está segura. Usa tu criterio para evaluarte."}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            <button type="button" onClick={() => onRated("wrong", recognition.score)} className="ds-btn-secondary" aria-label="Incorrecto">
              ✕
            </button>
            <button type="button" onClick={() => onRated("almost", recognition.score)} className="ds-btn-secondary" aria-label="Casi correcto">
              ～
            </button>
            <button type="button" onClick={() => onRated("correct", recognition.score)} className="ds-btn" aria-label="Correcto">
              ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
