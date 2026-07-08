/** Where /media/ files are served (Asura disk). API may run on Railway. */
const DEFAULT_MEDIA_ORIGIN = "https://apibuysellclub.org";
const PUBLIC_MEDIA_ROUTE = "/buysellapi/public-media";

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

/** Use Django route when direct /media/ is blocked on the host (Asura Passenger). */
function toPublicMediaUrl(url) {
  if (url.includes(PUBLIC_MEDIA_ROUTE + "/")) return url;
  const marker = "/media/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const suffix = url.slice(idx + marker.length);
  return `${url.slice(0, idx)}${PUBLIC_MEDIA_ROUTE}/${suffix}`;
}

/**
 * Turn stored media paths into absolute URLs on the media host (Asura).
 * Rewrites /media/ to /buysellapi/public-media/ so Django serves the file.
 */
export function resolveMediaUrl(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return "";

  const mediaBase = getMediaBaseUrl();

  if (url.startsWith("http://") || url.startsWith("https://")) {
    const railway = url.match(RAILWAY_MEDIA_RE);
    if (railway) return toPublicMediaUrl(`${mediaBase}${railway[1]}`);
    return toPublicMediaUrl(url);
  }

  if (url.startsWith("/media/")) {
    return `${mediaBase}${PUBLIC_MEDIA_ROUTE}/${url.slice("/media/".length)}`;
  }

  const path = url.startsWith("/") ? url : `/${url}`;
  return toPublicMediaUrl(`${mediaBase}${path}`);
}
