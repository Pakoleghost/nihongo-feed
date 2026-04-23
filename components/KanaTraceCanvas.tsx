"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  buildTraceStrokeTemplates,
  evaluateTraceStroke,
  getTraceInputLength,
  hasKanaTraceData,
  mapClientPointToViewBox,
  pointsToSvgPath,
  TRACE_MIN_JUDGABLE_LENGTH,
  TRACE_MIN_JUDGABLE_POINTS,
  TRACE_VIEWBOX_SIZE,
  type TracePoint,
} from "@/lib/kana-trace";

type Props = {
  kana: string;
  disabled?: boolean;
  onKanaComplete: (result: { retries: number; strokes: number }) => void;
};

type StatusTone = "neutral" | "success" | "error";

type StatusMessage = {
  tone: StatusTone;
  text: string;
};

const DEFAULT_STATUS: StatusMessage = {
  tone: "neutral",
  text: "Dibuja sobre el trazo marcado.",
};

export default function KanaTraceCanvas({ kana, disabled = false, onKanaComplete }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pointsRef = useRef<TracePoint[]>([]);
  const isDrawingRef = useRef(false);
  const completionSentRef = useRef(false);

  const templates = useMemo(() => buildTraceStrokeTemplates(kana), [kana]);
  const [activeStrokeIndex, setActiveStrokeIndex] = useState(0);
  const [currentPoints, setCurrentPoints] = useState<TracePoint[]>([]);
  const [status, setStatus] = useState<StatusMessage>(DEFAULT_STATUS);
  const [retryCount, setRetryCount] = useState(0);
  const traceAvailable = hasKanaTraceData(kana) && templates.length > 0;
  const activeStroke = templates[activeStrokeIndex] ?? null;

  useEffect(() => {
    setActiveStrokeIndex(0);
    setCurrentPoints([]);
    pointsRef.current = [];
    setRetryCount(0);
    setStatus(DEFAULT_STATUS);
    isDrawingRef.current = false;
    completionSentRef.current = false;
  }, [kana]);

  function resetCurrentStroke(statusOverride?: StatusMessage) {
    pointsRef.current = [];
    setCurrentPoints([]);
    isDrawingRef.current = false;
    if (statusOverride) setStatus(statusOverride);
  }

  function getEventPoint(event: ReactPointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return mapClientPointToViewBox(event.clientX, event.clientY, rect, TRACE_VIEWBOX_SIZE);
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (disabled || !activeStroke || !traceAvailable) return;
    event.preventDefault();
    const point = getEventPoint(event);
    if (!point) return;
    svgRef.current?.setPointerCapture?.(event.pointerId);
    isDrawingRef.current = true;
    pointsRef.current = [point];
    setCurrentPoints([point]);
    if (activeStroke) {
      const startNearGuide = Math.hypot(point.x - activeStroke.start.x, point.y - activeStroke.start.y) <= 26;
      setStatus(startNearGuide ? { tone: "neutral", text: "Bien. Sigue el trazo." } : DEFAULT_STATUS);
    } else {
      setStatus(DEFAULT_STATUS);
    }
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!isDrawingRef.current || disabled || !activeStroke || !traceAvailable) return;
    event.preventDefault();
    const point = getEventPoint(event);
    if (!point) return;

    const previous = pointsRef.current[pointsRef.current.length - 1];
    if (previous) {
      const dx = point.x - previous.x;
      const dy = point.y - previous.y;
      if (Math.sqrt(dx * dx + dy * dy) < 1.4) return;
    }

    const nextPoints = [...pointsRef.current, point];
    pointsRef.current = nextPoints;
    setCurrentPoints(nextPoints);
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (!isDrawingRef.current || disabled || !activeStroke || !traceAvailable) return;
    event.preventDefault();
    svgRef.current?.releasePointerCapture?.(event.pointerId);
    isDrawingRef.current = false;

    const pointCount = pointsRef.current.length;
    const inputLength = getTraceInputLength(pointsRef.current);

    if (pointCount < TRACE_MIN_JUDGABLE_POINTS || inputLength < TRACE_MIN_JUDGABLE_LENGTH) {
      resetCurrentStroke(DEFAULT_STATUS);
      return;
    }

    const evaluation = evaluateTraceStroke(activeStroke, pointsRef.current);
    if (!evaluation.ok) {
      setRetryCount((count) => count + 1);
      resetCurrentStroke({ tone: "error", text: evaluation.reason || "Intenta otra vez." });
      return;
    }

    if (activeStrokeIndex + 1 >= templates.length) {
      setStatus({ tone: "success", text: "Kana completo." });
      setCurrentPoints([]);
      pointsRef.current = [];

      if (!completionSentRef.current) {
        completionSentRef.current = true;
        window.setTimeout(() => {
          onKanaComplete({ retries: retryCount, strokes: templates.length });
        }, 360);
      }
      return;
    }

    setStatus({ tone: "success", text: "Buen trazo. Siguiente." });
    setCurrentPoints([]);
    pointsRef.current = [];
    setActiveStrokeIndex((index) => index + 1);
  }

  function handlePointerLeave(event: ReactPointerEvent<SVGSVGElement>) {
    if (!isDrawingRef.current) return;
    handlePointerUp(event);
  }

  const userPath = pointsToSvgPath(currentPoints);
  const completedStrokes = templates.slice(0, activeStrokeIndex);
  const upcomingStrokes = templates.slice(activeStrokeIndex + 1);
  const statusColor =
    status.tone === "success" ? "#178A83" : status.tone === "error" ? "#C53340" : "#6E737F";
  const statusBg =
    status.tone === "success"
      ? "rgba(78,205,196,0.12)"
      : status.tone === "error"
        ? "rgba(230,57,70,0.10)"
        : "rgba(26,26,46,0.04)";

  if (!traceAvailable) {
    return (
      <div
        style={{
          borderRadius: "24px",
          background: "#F7F3ED",
          padding: "18px",
          display: "grid",
          gap: "10px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "52px",
            fontFamily: "var(--font-noto-sans-jp), sans-serif",
            color: "#1A1A2E",
            lineHeight: 1,
          }}
        >
          {kana}
        </div>
        <div style={{ fontSize: "14px", color: "#6E737F", lineHeight: 1.4 }}>
          Este kana aún no tiene guía de trazos lista.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "12px", minHeight: 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            borderRadius: "999px",
            background: "#F7F3ED",
            color: "#5E6472",
            padding: "8px 12px",
            fontSize: "12px",
            fontWeight: 800,
          }}
        >
          Trazo {Math.min(activeStrokeIndex + 1, templates.length)} de {templates.length}
        </div>
        <button
          type="button"
          onClick={() => resetCurrentStroke(DEFAULT_STATUS)}
          disabled={disabled}
          style={{
            border: "none",
            borderRadius: "999px",
            background: "#F7F3ED",
            color: "#1A1A2E",
            padding: "8px 12px",
            fontSize: "12px",
            fontWeight: 800,
            cursor: disabled ? "default" : "pointer",
            opacity: disabled ? 0.55 : 1,
          }}
        >
          Borrar trazo
        </button>
      </div>

      <div
        style={{
          borderRadius: "28px",
          background: "#FAF7F1",
          padding: "14px",
          boxShadow: "inset 0 0 0 1px rgba(26,26,46,0.05)",
          width: "100%",
          maxWidth: "320px",
          justifySelf: "center",
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${TRACE_VIEWBOX_SIZE} ${TRACE_VIEWBOX_SIZE}`}
          width="100%"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            aspectRatio: "1 / 1",
            touchAction: "none",
            userSelect: "none",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerLeave}
          onPointerLeave={handlePointerLeave}
        >
          <line x1="54.5" y1="6" x2="54.5" y2="103" stroke="#ECE4D9" strokeWidth="0.6" strokeDasharray="4 4" />
          <line x1="6" y1="54.5" x2="103" y2="54.5" stroke="#ECE4D9" strokeWidth="0.6" strokeDasharray="4 4" />

          {upcomingStrokes.map((stroke) => (
            <path
              key={`upcoming-${stroke.d}`}
              d={stroke.d}
              fill="none"
              stroke="rgba(26,26,46,0.08)"
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {completedStrokes.map((stroke) => (
            <path
              key={`done-${stroke.d}`}
              d={stroke.d}
              fill="none"
              stroke="rgba(78,205,196,0.42)"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {activeStroke && (
            <>
              <path
              d={activeStroke.d}
              fill="none"
              stroke="#1A1A2E"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={0.28}
              />
            </>
          )}

          {userPath && (
            <path
              d={userPath}
              fill="none"
              stroke="#1A1A2E"
              strokeWidth="5.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>

      <div
        style={{
          borderRadius: "18px",
          background: statusBg,
          color: statusColor,
          padding: "10px 12px",
          fontSize: "13px",
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.35,
        }}
      >
        {status.text}
      </div>
    </div>
  );
}
