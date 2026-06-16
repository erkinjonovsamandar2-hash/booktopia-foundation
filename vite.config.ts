import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "https://ovlqfgjdmbvstqibrqrl.supabase.co";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      // Proxy all Supabase traffic through localhost in development.
      // This bypasses CORS/sandbox restrictions in Lovable's preview iframe.
      "/_sb": {
        target: SUPABASE_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/_sb/, ""),
        ws: true, // also proxy WebSocket (realtime)
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // ── Production optimizations ────────────────────────────────────────────
  // Strip console.log and debugger statements from production builds.
  // Keeps console.warn and console.error for monitoring.
  esbuild:
    mode === "production"
      ? { drop: ["debugger"], pure: ["console.log"] }
      : undefined,

  build: {
    rollupOptions: {
      output: {
        // Split heavy vendor libraries into separate cacheable chunks.
        // This breaks the monolithic 761KB index.js into smaller pieces
        // that browsers can cache independently and download in parallel.
        manualChunks: {
          "vendor-motion": ["framer-motion"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-select",
            "@radix-ui/react-accordion",
          ],
          "vendor-charts": ["recharts"],
        },
      },
    },
  },
}));

