/** Where /media/ files are served (Railway volume). */
const DEFAULT_MEDIA_ORIGIN =
  "https://buysellclub-backend-production.up.railway.app";
const PUBLIC_MEDIA_ROUTE = "/buysellapi/public-media";

/** Any absolute URL still pointing at the old Asura host. */
const ASURA_ORIGIN_RE = /^https?:\/\/(?:www\.)?apibuysellclub\.org(\/.*)?$/i;

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

/** Use Django public-media route when direct /media/ is blocked. */
function toPublicMediaUrl(url) {
  if (url.includes(PUBLIC_MEDIA_ROUTE + "/")) return url;
  const marker = "/media/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const suffix = url.slice(idx + marker.length);
  return `${url.slice(0, idx)}${PUBLIC_MEDIA_ROUTE}/${suffix}`;
}

/**
 * Turn stored media paths into absolute URLs on the Railway media host.
 * Remaps old Asura absolute URLs (both /media/ and /buysellapi/public-media/).
 */
export function resolveMediaUrl(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return "";

  const mediaBase = getMediaBaseUrl();

  if (url.startsWith("http://") || url.startsWith("https://")) {
    const asura = url.match(ASURA_ORIGIN_RE);
    if (asura) {
      const path = asura[1] || "/";
      return toPublicMediaUrl(`${mediaBase}${path}`);
    }
    return toPublicMediaUrl(url);
  }

  if (url.startsWith("/media/")) {
    return `${mediaBase}${PUBLIC_MEDIA_ROUTE}/${url.slice("/media/".length)}`;
  }

  if (url.startsWith(PUBLIC_MEDIA_ROUTE + "/")) {
    return `${mediaBase}${url}`;
  }

  const path = url.startsWith("/") ? url : `/${url}`;
  return toPublicMediaUrl(`${mediaBase}${path}`);
}
