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
const BASE_PATH = import.meta.env.VITE_BASE_PATH || '/buysellclubproject';

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter basename={BASE_PATH}>
      <ShopContextProvider>
        <App />
      </ShopContextProvider>
    </BrowserRouter>
  </StrictMode>
);
