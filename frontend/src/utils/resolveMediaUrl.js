/** Where /media/ files are served (Railway volume). */
const DEFAULT_MEDIA_ORIGIN =
  "https://buysellclub-backend-production.up.railway.app";
const PUBLIC_MEDIA_ROUTE = "/buysellapi/public-media";

/** Any absolute URL still pointing at the old Asura host. */
const ASURA_ORIGIN_RE = /^https?:\/\/(?:www\.)?apibuysellclub\.org(\/.*)?$/i;
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

/** Keep local/LAN absolute URLs (dev Django /media/) — don't rewrite to Railway. */
function isLocalDevMediaUrl(url) {
  try {
    const host = new URL(url).hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "10.0.2.2" ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)
    );
  } catch {
    return false;
  }
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
    if (isLocalDevMediaUrl(url)) {
      return url;
    }
    const asura = url.match(ASURA_ORIGIN_RE);
    if (asura) {
      const path = asura[1] || "/";
      return toPublicMediaUrl(`${mediaBase}${path}`);
    }
    // Prefer HTTPS media origin (API may still return http://…/media/…).
    const railway = url.match(RAILWAY_MEDIA_RE);
    if (railway) {
      return toPublicMediaUrl(`${mediaBase}${railway[1]}`);
    }
    if (url.includes("/media/")) {
      const marker = "/media/";
      const idx = url.indexOf(marker);
      const suffix = url.slice(idx + marker.length);
      return `${mediaBase}${PUBLIC_MEDIA_ROUTE}/${suffix}`;
    }
    return toPublicMediaUrl(url);
  }

  if (url.startsWith("/media/")) {
    // Local admin / Vite: prefer same-origin Django media when developing.
    if (
      typeof window !== "undefined" &&
      /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
    ) {
      return `${window.location.protocol}//${window.location.hostname}:8000${url}`;
    }
    return `${mediaBase}${PUBLIC_MEDIA_ROUTE}/${url.slice("/media/".length)}`;
  }

  if (url.startsWith(PUBLIC_MEDIA_ROUTE + "/")) {
    return `${mediaBase}${url}`;
  }

  const path = url.startsWith("/") ? url : `/${url}`;
  return toPublicMediaUrl(`${mediaBase}${path}`);
}
