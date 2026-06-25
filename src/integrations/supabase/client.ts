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

const directUrl = SUPABASE_URL ?? "https://ovlqfgjdmbvstqibrqrl.supabase.co";

export const supabase = createClient<Database>(
  directUrl,
  SUPABASE_ANON_KEY ?? "placeholder",
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      fetch: (url, options) => {
        // Swap direct Supabase URL with relative proxy path in the browser
        if (typeof window !== "undefined") {
          const urlStr = url.toString();
          if (urlStr.startsWith(directUrl)) {
            const proxiedUrl = urlStr.replace(directUrl, window.location.origin + "/_sb");
            return fetch(proxiedUrl, options);
          }
        }
        return fetch(url, options);
      },
    },
  }
);