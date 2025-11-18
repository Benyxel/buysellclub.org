import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base:process.env.VITE_BASE_PATH || '/buysellclubproject',
  resolve: {
    alias: {
      "jwt-decode": "/src/shims/jwt-decode.js",
    },
  },
  server: {
    proxy: {
      "/buysellapi": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
