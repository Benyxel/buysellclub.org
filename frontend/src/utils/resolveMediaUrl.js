/** Where /media/ files are served (Asura disk). API may run on Railway. */
const DEFAULT_MEDIA_ORIGIN = "https://apibuysellclub.org";

const RAILWAY_MEDIA_RE = /^https?:\/\/[^/]+\.railway\.app(\/media\/.*)$/i;

export function getMediaBaseUrl() {
  const raw =
    (typeof import.meta !== "undefined" && import.meta?.env?.VITE_MEDIA_BASE_URL) ||
    (typeof window !== "undefined" && window.__ENV__?.VITE_MEDIA_BASE_URL) ||
    "";
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim().replace(/\/+$/, "");
  }
  return DEFAULT_MEDIA_ORIGIN;
}

/**
 * Turn stored media paths into absolute URLs on the media host (Asura).
 * Leaves external URLs unchanged except Railway /media/ links (rewritten to Asura).
 */
export function resolveMediaUrl(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return "";

  const mediaBase = getMediaBaseUrl();

  if (url.startsWith("http://") || url.startsWith("https://")) {
    const railway = url.match(RAILWAY_MEDIA_RE);
    if (railway) return `${mediaBase}${railway[1]}`;
    return url;
  }

  const path = url.startsWith("/") ? url : `/${url}`;
  return `${mediaBase}${path}`;
}
