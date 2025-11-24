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

// Debug: Log base path and environment info
console.log('[App] Initializing...');
console.log('[App] Base path:', BASE_PATH);
console.log('[App] Environment VITE_BASE_PATH:', import.meta.env.VITE_BASE_PATH);
console.log('[App] Current pathname:', window.location.pathname);
console.log('[App] Current hostname:', window.location.hostname);

// Error boundary for rendering
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  console.log('[App] Root element found, rendering React app...');

  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter basename={BASE_PATH}>
        <ShopContextProvider>
          <App />
        </ShopContextProvider>
      </BrowserRouter>
    </StrictMode>
  );

  console.log('[App] React app rendered successfully');
} catch (error) {
  console.error('[App] Failed to render:', error);
  console.error('[App] Error stack:', error.stack);
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto;">
        <h1 style="color: #dc2626;">Application Error</h1>
        <p>Failed to load the application.</p>
        <pre style="background: #f3f4f6; padding: 15px; border-radius: 5px; overflow-x: auto;">${error.message}\n\n${error.stack || ''}</pre>
        <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 5px;">
          <p><strong>Debug Info:</strong></p>
          <ul>
            <li>Base path: ${BASE_PATH}</li>
            <li>Pathname: ${window.location.pathname}</li>
            <li>Hostname: ${window.location.hostname}</li>
            <li>Environment VITE_BASE_PATH: ${import.meta.env.VITE_BASE_PATH || 'undefined'}</li>
          </ul>
        </div>
      </div>
    `;
  }
}
