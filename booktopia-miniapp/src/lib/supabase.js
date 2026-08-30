import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const directUrl = SUPABASE_URL || "https://ovlqfgjdmbvstqibrqrl.supabase.co";

export const supabase = createClient(directUrl, SUPABASE_ANON_KEY || "placeholder", {
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
    }
  }
});
