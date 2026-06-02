import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Load `VITE_*` from server/.env (single project env file)
  envDir: path.resolve(__dirname, "../server"),
  server: {
    host: "::",
    port: 8080,
    // When VITE_API_BASE_URL is empty, the app uses same-origin `/api/...` (Docker nginx).
    // This proxy lets `npm run dev` reach the backend without changing `.env`.
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
