import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Proxy /api → service api (Docker) ou localhost en dev hôte.
const apiProxy = process.env.VITE_API_PROXY ?? "http://localhost:8787";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": { target: apiProxy, changeOrigin: true },
    },
  },
});
