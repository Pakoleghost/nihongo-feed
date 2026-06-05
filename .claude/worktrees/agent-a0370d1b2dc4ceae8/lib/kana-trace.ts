import { kanaStrokes } from "@/lib/kana-stroke-data";

export type TracePoint = {
  x: number;
  y: number;
};

export type TraceStrokeTemplate = {
  d: string;
  samples: TracePoint[];
  start: TracePoint;
  end: TracePoint;
  length: number;
};

export type TraceEvaluation =
  | { ok: true; coverage: number }
  | { ok: false; reason: string; coverage: number };

export const TRACE_VIEWBOX_SIZE = 109;
export const TRACE_MIN_JUDGABLE_POINTS = 4;
export const TRACE_MIN_JUDGABLE_LENGTH = 8;
export const TRACE_START_TOLERANCE = 30;
export const TRACE_END_TOLERANCE = 30;
export const TRACE_COVERAGE_THRESHOLD = 0.3;
export const TRACE_AVERAGE_DISTANCE_THRESHOLD = 18;
export const TRACE_PROGRESS_THRESHOLD = 0.6;

function distance(a: TracePoint, b: TracePoint) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function polylineLength(points: TracePoint[]) {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += distance(points[i - 1], points[i]);
  }
  return total;
}

function nearestSampleIndex(samples: TracePoint[], point: TracePoint) {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < samples.length; i += 1) {
    const nextDistance = distance(samples[i], point);
    if (nextDistance < bestDistance) {
      bestDistance = nextDistance;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function nearestSampleDistance(samples: TracePoint[], point: TracePoint) {
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < samples.length; i += 1) {
    const nextDistance = distance(samples[i], point);
    if (nextDistance < bestDistance) {
      bestDistance = nextDistance;
    }
  }
  return bestDistance;
}

function createSvgPath(d: string) {
  if (typeof document === "undefined") return null;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  return path;
}

export function hasKanaTraceData(kana: string) {
  return Boolean(kanaStrokes[kana]?.length);
}

export function buildTraceStrokeTemplates(kana: string): TraceStrokeTemplate[] {
  if (typeof document === "undefined") return [];

  const strokes = kanaStrokes[kana] ?? [];

  return strokes
    .map((d) => {
      const path = createSvgPath(d);
      if (!path) return null;
      const length = path.getTotalLength();
      const sampleCount = Math.max(18, Math.ceil(length / 6));
      const samples: TracePoint[] = [];

      for (let i = 0; i <= sampleCount; i += 1) {
        const point = path.getPointAtLength((length * i) / sampleCount);
        samples.push({ x: point.x, y: point.y });
      }

      return {
        d,
        samples,
        start: samples[0],
        end: samples[samples.length - 1],
        length,
      } satisfies TraceStrokeTemplate;
    })
    .filter((stroke): stroke is TraceStrokeTemplate => Boolean(stroke));
}

export function pointsToSvgPath(points: TracePoint[]) {
  if (points.length === 0) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
}

export function getTraceInputLength(points: TracePoint[]) {
  return polylineLength(points);
}

export function mapClientPointToViewBox(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  viewBoxSize = TRACE_VIEWBOX_SIZE,
): TracePoint {
  return {
    x: ((clientX - rect.left) / rect.width) * viewBoxSize,
    y: ((clientY - rect.top) / rect.height) * viewBoxSize,
  };
}

export function evaluateTraceStroke(
  template: TraceStrokeTemplate,
  userPoints: TracePoint[],
): TraceEvaluation {
  if (userPoints.length < TRACE_MIN_JUDGABLE_POINTS) {
    return { ok: false, reason: "Traza el movimiento completo.", coverage: 0 };
  }

  const userLength = polylineLength(userPoints);
  const startDistance = distance(userPoints[0], template.start);
  const endDistance = distance(userPoints[userPoints.length - 1], template.end);

  if (startDistance > TRACE_START_TOLERANCE) {
    return { ok: false, reason: "Empieza más cerca del inicio.", coverage: 0 };
  }

  if (userLength < Math.max(10, template.length * 0.18)) {
    return { ok: false, reason: "Trazo demasiado corto.", coverage: 0 };
  }

  const maxProgressIndex = userPoints.reduce(
    (best, point) => Math.max(best, nearestSampleIndex(template.samples, point)),
    0,
  );
  const progressRatio = maxProgressIndex / Math.max(1, template.samples.length - 1);

  const coveredSamples = template.samples.filter((sample) =>
    userPoints.some((point) => distance(sample, point) <= 12),
  ).length;
  const coverage = coveredSamples / Math.max(1, template.samples.length);
  const averagePathDistance =
    userPoints.reduce((sum, point) => sum + nearestSampleDistance(template.samples, point), 0) /
    Math.max(1, userPoints.length);

  if (progressRatio < TRACE_PROGRESS_THRESHOLD) {
    return { ok: false, reason: "Llega un poco más al final.", coverage };
  }

  if (endDistance > TRACE_END_TOLERANCE) {
    return { ok: false, reason: "Termina más cerca del final.", coverage };
  }

  if (coverage < TRACE_COVERAGE_THRESHOLD) {
    return { ok: false, reason: "Intenta seguir mejor la guía.", coverage };
  }

  if (averagePathDistance > TRACE_AVERAGE_DISTANCE_THRESHOLD) {
    return { ok: false, reason: "Mantente más cerca del trazo.", coverage };
  }

  return { ok: true, coverage };
}
