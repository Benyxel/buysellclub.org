// Production frontends on buysellclub.org call the Railway Django API (VITE_API_BASE_URL).
// Local dev: unset VITE_API_BASE_URL → Vite proxy to localhost:8000.

const DEFAULT_RAILWAY_API_BASE =
  "https://buysellclub-backend-production.up.railway.app";

/** Live site hostnames — use Railway API when env is unset. */
const PRODUCTION_FRONTEND_HOSTS = new Set([
  "buysellclub.org",
  "www.buysellclub.org",
  "buysellclub.com.buysellclub.org",
]);

const resolveEnvBase = () => {
  const candidates = [
    typeof import.meta !== "undefined" ? import.meta?.env?.VITE_API_BASE_URL : undefined,
    typeof window !== "undefined" ? window.__ENV__?.VITE_API_BASE_URL : undefined,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  return "";
};

export const normalizeApiBaseUrl = (raw) => {
  if (typeof raw !== "string" || raw.trim() === "") {
    return "";
  }

  let base = raw.trim().replace(/\/+$/, "");

  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base}`;
  }

  return base;
};

function resolveRuntimeApiBase(envNormalized) {
  if (
    typeof window === "undefined" ||
    import.meta.env?.DEV ||
    window.location.hostname === "localhost"
  ) {
    return envNormalized;
  }

  const host = window.location.hostname.toLowerCase();
  const onProductionFrontend =
    PRODUCTION_FRONTEND_HOSTS.has(host) || host.endsWith(".buysellclub.org");

  if (onProductionFrontend) {
    return envNormalized || DEFAULT_RAILWAY_API_BASE;
  }

  return envNormalized;
}

const envBase = resolveEnvBase();
const normalizedBase = normalizeApiBaseUrl(envBase);

export const API_BASE_URL = resolveRuntimeApiBase(normalizedBase);

export const getApiUrl = (path) => {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return API_BASE_URL ? `${API_BASE_URL}/${cleanPath}` : `/${cleanPath}`;
};
