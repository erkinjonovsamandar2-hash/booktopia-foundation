// api/broadcast.js — Vercel Serverless Endpoint
// Sends a broadcast message to all unique customers from miniapp_orders

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
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
  // committed to a public repo, making mass-messaging effectively open.
  // Now verifies the caller's own Supabase session and admin role, matching
  // /api/update-order-status. No shared secret to distribute or leak.
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: roleRow } = await authClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .eq('role', 'admin')
    .maybeSingle();
  if (!roleRow) return res.status(403).json({ error: 'Admin access required' });

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
      .not('telegram_user_id', 'is', null)
      // Archived orders are pre-launch and test data — those people are not
      // customers and must not receive broadcasts.
      .is('archived_at', null);

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
