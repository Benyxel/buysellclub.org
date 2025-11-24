import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages base path
  // Auto-detected from repository name in GitHub Actions workflow
  // Or set via VITE_BASE_PATH environment variable/GitHub Secret
  // For custom domain, set to '/'
  // Default to root if not set (works for custom domains)
  base: process.env.VITE_BASE_PATH || '/',
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
    // Optimize image assets
    assetsInlineLimit: 4096, // Inline small images as base64 (4KB limit)
    rollupOptions: {
      output: {
        // Optimize asset file names for better caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
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
    include: ['react', 'react-dom', 'react-router-dom'],
  },
});
