// Centralized API base URL for backend requests
// If VITE_API_BASE_URL is set, use it. Otherwise, use relative URLs so Vite dev proxy works over tunnels.
// This makes requests like "/buysellapi/..." go to the frontend origin, letting vite.config.js proxy to http://localhost:8000 in dev.
const resolveEnvBase = () => {
  const candidates = [
    typeof import.meta !== "undefined" ? import.meta?.env?.VITE_API_BASE_URL : undefined,
    typeof process !== "undefined" ? process?.env?.VITE_API_BASE_URL : undefined,
    typeof window !== "undefined" ? window.__ENV__?.VITE_API_BASE_URL : undefined,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  return "";
};

const envBase = resolveEnvBase();

// Normalize the base URL: ensure it has a protocol and no trailing slash
let normalizedBase = "";
if (envBase !== "") {
  // Remove trailing slash if present
  let base = envBase.replace(/\/+$/, "");
  
  // If it doesn't start with http:// or https://, add https://
  if (!base.match(/^https?:\/\//i)) {
    base = `https://${base}`;
  }
  
  normalizedBase = base;
}

export const API_BASE_URL = normalizedBase;

// Helper function to get full API URL for a given path
export const getApiUrl = (path) => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return API_BASE_URL ? `${API_BASE_URL}/${cleanPath}` : `/${cleanPath}`;
};