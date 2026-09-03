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
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('@radix-ui')) return 'vendor-radix';
            if (id.includes('recharts')) return 'vendor-charts';
            return 'vendor';
          }
        },
      },
    },
  },
}));

