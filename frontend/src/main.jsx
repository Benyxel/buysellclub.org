import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { BrowserRouter } from "react-router-dom";
import ShopContextProvider from "./context/ShopContext";
// Note: Dev API mock removed to use real backend

// Determine base path for the router.
// - In production builds (GitHub Pages) we use `VITE_BASE_PATH` or fallback
//   to '/buysellclubproject'.
// - In development we keep the basename empty so the dev server serves the
//   app at the root (http://localhost:5173/) and routing works as expected.
const isDev =
  import.meta.env.DEV === true || import.meta.env.MODE === "development";
// Normalize VITE_BASE_PATH: allow full URLs (dev servers sometimes inject origin)
function normalizeBasePath(raw) {
  if (!raw) return "";
  try {
    // If it's a full URL, extract the pathname
    const u = new URL(raw);
    return u.pathname.replace(/\/$/, "");
  } catch (e) {
    // Not a full URL, ensure no trailing slash
    return raw.replace(/\/$/, "");
  }
}
const envBase = normalizeBasePath(import.meta.env.VITE_BASE_PATH || "");
const BASE_PATH = isDev ? envBase || "" : envBase || "/buysellclubproject";

// Debug: Log base path and environment info
console.log("[App] Initializing...");
console.log("[App] Base path:", BASE_PATH);
console.log(
  "[App] Environment VITE_BASE_PATH:",
  import.meta.env.VITE_BASE_PATH
);
console.log("[App] Current pathname:", window.location.pathname);
console.log("[App] Current hostname:", window.location.hostname);

// Error boundary for rendering
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  console.log("[App] Root element found, rendering React app...");

  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter basename={BASE_PATH}>
        <ShopContextProvider>
          <App />
        </ShopContextProvider>
      </BrowserRouter>
    </StrictMode>
  );

  console.log("[App] React app rendered successfully");
} catch (error) {
  console.error("[App] Failed to render:", error);
  console.error("[App] Error stack:", error.stack);
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto;">
        <h1 style="color: #dc2626;">Application Error</h1>
        <p>Failed to load the application.</p>
        <pre style="background: #f3f4f6; padding: 15px; border-radius: 5px; overflow-x: auto;">${
          error.message
        }\n\n${error.stack || ""}</pre>
        <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 5px;">
          <p><strong>Debug Info:</strong></p>
          <ul>
            <li>Base path: ${BASE_PATH}</li>
            <li>Pathname: ${window.location.pathname}</li>
            <li>Hostname: ${window.location.hostname}</li>
            <li>Environment VITE_BASE_PATH: ${
              import.meta.env.VITE_BASE_PATH || "undefined"
            }</li>
          </ul>
        </div>
      </div>
    `;
  }
}

// Register service worker if supported. The service worker file is placed in
// the Vite `public/` folder so it will be copied to the site root on build.
if ("serviceWorker" in navigator) {
  try {
    const base = (
      import.meta.env.VITE_BASE_PATH || "/buysellclubproject"
    ).replace(/\/$/, "");
    const swUrl = `${base}/sw.js`;
    navigator.serviceWorker
      .register(swUrl)
      .then((reg) => {
        console.log("[SW] Registered service worker at", swUrl, reg);
        // Optionally listen for updates
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              console.log("[SW] New service worker installed");
            }
          });
        });
      })
      .catch((e) => console.warn("[SW] Registration failed", e));
  } catch (e) {
    console.warn("[SW] Registration error", e);
  }
}
