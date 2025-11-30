import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Default to root for local development. If you ever need a different
  // base for production, set `VITE_BASE_PATH` in your production env.
  const basePath = env.VITE_BASE_PATH?.trim() || "/";

  return {
    plugins: [react()],
    // GitHub Pages base path (fallbacks to repo name, overridable via env)
    base: basePath,
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
    build: {
      // Ensure index.html is always generated
      emptyOutDir: true,
      // Optimize image assets
      assetsInlineLimit: 4096, // Inline small images as base64 (4KB limit)
      rollupOptions: {
        output: {
          // Optimize asset file names for better caching
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split(".");
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
        },
      },
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom"],
    },
  };
});
