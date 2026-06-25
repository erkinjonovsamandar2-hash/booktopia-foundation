import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "❌ [Supabase] Missing env vars: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is undefined.\n" +
    "   → If running locally: restart the dev server (Vite reads .env on startup, not hot-reload).\n" +
    "   → If running on Lovable/Vercel/etc: add these vars in the platform's environment settings."
  );
}

// Use Vercel edge/Vite proxy in the browser for ultra-fast connection routing.
// Node environment (build-time) uses the direct env URL.
const effectiveUrl = typeof window !== "undefined"
  ? (window.location.origin + "/_sb")
  : (SUPABASE_URL ?? "https://ovlqfgjdmbvstqibrqrl.supabase.co");

export const supabase = createClient<Database>(
  effectiveUrl,
  SUPABASE_ANON_KEY ?? "placeholder",
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);