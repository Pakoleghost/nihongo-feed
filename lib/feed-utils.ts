export function normalizeGroupValue(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export function isPublicTargetGroup(value?: string | null) {
  const normalized = normalizeGroupValue(value);
  return !normalized || normalized === "todos" || normalized === "general";
}

export function normalizeAssignmentSubtype(value?: string | null) {
  const normalized = normalizeGroupValue(value);
  if (!normalized) return "post";
  if (normalized === "external") return "post";
  if (normalized === "internal") return "forum";
  if (normalized === "announcement") return "announcement";
  if (normalized === "forum") return "forum";
  return "post";
}

export function isForumTaskSubtype(value?: string | null) {
  return normalizeAssignmentSubtype(value) === "forum";
}

export function isTaskAnnouncementSubtype(value?: string | null) {
  return normalizeAssignmentSubtype(value) === "announcement";
}

export function isTaskPostSubtype(value?: string | null) {
  return normalizeAssignmentSubtype(value) === "post";
}

export function cleanFeedText(value: string) {
  return String(value || "")
    .replace(/!\[[^\]]*]\((https?:\/\/[^\s)]+)\)/gi, "")
    .replace(/https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg)(?:\?\S+)?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPostParts(content?: string | null) {
  const lines = String(content || "").split("\n");
  const title = cleanFeedText(lines[0] || "");
  const bodyLines = lines.slice(1).filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^!\[[^\]]*]\((https?:\/\/[^\s)]+)\)\s*$/i.test(trimmed)) return false;
    if (/^https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg)(?:\?\S+)?$/i.test(trimmed)) return false;
    return true;
  });
  return {
    title: title || "Sin título",
    preview: cleanFeedText(bodyLines.join(" ")),
  };
}

