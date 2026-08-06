import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  // Load `VITE_*` from server/.env (single project env file)
  envDir: path.resolve(__dirname, "../server"),
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    headers: {
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self';",
    },
    // When VITE_API_BASE_URL is empty, the app uses same-origin `/api/...` (Docker nginx).
    // This proxy lets `npm run dev` reach the backend without changing `.env`.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        // Keep session cookies usable on http://localhost:8080 (never require Secure in local).
        cookieDomainRewrite: "",
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            const raw = proxyRes.headers["set-cookie"];
            if (!raw) return;
            const list = Array.isArray(raw) ? raw : [raw];
            proxyRes.headers["set-cookie"] = list.map((cookie) =>
              String(cookie)
                .replace(/;\s*Secure/gi, "")
                .replace(/;\s*Domain=[^;]*/gi, ""),
            );
          });
        },
      },
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Coolify builders are often RAM-constrained; skip gzip size reporting (extra heap at end of build).
  build: {
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      maxParallelFileOps: 2,
    },
  },
});
