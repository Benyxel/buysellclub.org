import { getMediaBaseUrl } from "./resolveMediaUrl";

/** Gallery list/metadata lives on Asura (gallery_data.json), not Railway. */
export function galleryApiUrl(path = "") {
  const base = getMediaBaseUrl().replace(/\/+$/, "");
  if (!path) return base;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
