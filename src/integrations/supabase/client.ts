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
        // Route ALL Supabase traffic (REST + auth + storage + realtime) through
        // the same-origin /_sb proxy. This is NOT just a dev CORS shim — it is a
        // real performance fix for the target audience: a direct browser->
        // supabase.co connection from Uzbekistan/Central Asia takes the slow
        // international route and can hang for 8-20s. The /_sb rewrite (see
        // vercel.json) sends the request through Vercel's edge, which has fast,
        // well-peered connectivity to Supabase. In DEV, Vite's proxy handles /_sb.
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