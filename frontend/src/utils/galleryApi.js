import { getApiUrl } from "../config/api";

/** Gallery API uses the same Railway backend as the rest of the app. */
export function galleryApiUrl(path = "") {
  if (!path) return getApiUrl("");
  const clean = path.startsWith("/") ? path.slice(1) : path;
  return getApiUrl(clean);
}
