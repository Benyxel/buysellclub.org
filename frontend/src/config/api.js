// Centralized API base URL for backend requests
// If VITE_API_BASE_URL is set, use it. Otherwise, use relative URLs so Vite dev proxy works over tunnels.
// This makes requests like "/buysellapi/..." go to the frontend origin, letting vite.config.js proxy to http://localhost:8000 in dev.
const envBase =
  typeof import.meta.env.VITE_API_BASE_URL === "string"
    ? import.meta.env.VITE_API_BASE_URL.trim()
    : "";

export const API_BASE_URL = envBase !== "" ? envBase : "";

// Helper function to get full API URL for a given path
export const getApiUrl = (path) => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return API_BASE_URL ? `${API_BASE_URL}/${cleanPath}` : `/${cleanPath}`;
};