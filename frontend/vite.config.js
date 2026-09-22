import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5000",
      "/og": "http://localhost:5000"
    }
  },
  preview: {
    port: 4173,
    proxy: {
      "/api": "http://localhost:5000",
      "/og": "http://localhost:5000"
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-router")) return "react-vendor";
          if (id.includes("react-dom") || id.includes("react/") || id.includes("scheduler")) return "react-vendor";
          if (id.includes("i18next") || id.includes("react-i18next")) return "i18n-vendor";
          if (id.includes("axios")) return "http";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("firebase")) return "firebase-vendor";
          return undefined;
        }
      }
    }
  }
});