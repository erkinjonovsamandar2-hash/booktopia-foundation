// api/broadcast.js — Vercel Serverless Endpoint
// Sends a broadcast message to all unique customers from miniapp_orders

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET;
const ADMIN_ORIGIN = process.env.ADMIN_ORIGIN || 'https://booktopia.uz';

const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Helper for delays to prevent Telegram rate limits (30 msgs / second max)
const delay = ms => new Promise(res => setTimeout(res, ms));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ADMIN_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Admin authentication ──────────────────────────────────────────────────
  // This previously accepted `Bearer ${SUPABASE_SERVICE_KEY}` — a key that was
  // committed to a public repo, making mass-messaging effectively open. It now
  // uses a dedicated admin secret that is never shipped to a client.
  if (!ADMIN_API_SECRET) {
    console.error('[Broadcast] ADMIN_API_SECRET is not set — refusing all requests');
    return res.status(503).json({ error: 'Server not configured' });
  }
  const provided = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (provided !== ADMIN_API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { message, target } = req.body || {};
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch all customers with a Telegram ID
    const { data: orders, error } = await supabase
      .from('miniapp_orders')
      .select('telegram_user_id')
      .not('telegram_user_id', 'is', null);

    if (error) throw error;

    // Get unique TG IDs
    const uniqueIds = [...new Set(orders.map(o => String(o.telegram_user_id)))];
    
    if (uniqueIds.length === 0) {
      return res.status(200).json({ successCount: 0, total: 0, message: 'No targets found' });
    }

    let successCount = 0;
    let failCount = 0;

    // Broadcast loop (with basic rate limiting)
    for (let i = 0; i < uniqueIds.length; i++) {
      const tgId = uniqueIds[i];
      try {
        const tgRes = await fetch(`${TG_API}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgId,
            text: message,
            parse_mode: 'HTML',
          }),
        });

        if (tgRes.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
      
      // Sleep 50ms to respect Telegram's 30 msg/sec limit
      await delay(50);
    }

    return res.status(200).json({ 
      ok: true, 
      successCount, 
      failCount, 
      total: uniqueIds.length 
    });

  } catch (error) {
    console.error('[Broadcast Error]', error);
    return res.status(500).json({ error: error.message || 'Internal error' });
  }
}
