import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { BrowserRouter } from "react-router-dom";
import ShopContextProvider from "./context/ShopContext";
// Note: Dev API mock removed to use real backend

// Get base path from environment variable (set during build for GitHub Pages)
// Defaults to '/buysellclubproject' to match vite.config.js
// Vite replaces import.meta.env.VITE_BASE_PATH at build time
const BASE_PATH = import.meta.env.VITE_BASE_PATH || '/buysellclubproject';

// Debug: Log base path (will be removed in production by minification)
console.log('[App] Base path:', BASE_PATH);
console.log('[App] Current pathname:', window.location.pathname);

// Error boundary for rendering
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter basename={BASE_PATH}>
        <ShopContextProvider>
          <App />
        </ShopContextProvider>
      </BrowserRouter>
    </StrictMode>
  );
} catch (error) {
  console.error('[App] Failed to render:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1>Application Error</h1>
      <p>Failed to load the application.</p>
      <pre>${error.message}</pre>
      <p>Base path: ${BASE_PATH}</p>
      <p>Pathname: ${window.location.pathname}</p>
    </div>
  `;
}
