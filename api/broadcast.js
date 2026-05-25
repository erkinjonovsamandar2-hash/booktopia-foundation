// api/broadcast.js — Send a message to ALL registered users
// Protected by a secret key — only you can call this.
// Usage: POST /api/broadcast
// Body: { "secret": "...", "text": "Yangi kitoblar keldi! 📚", "button_text": "Ko'rish", "button_url": "https://..." }

import { Redis } from '@upstash/redis';

const TOKEN = process.env.BOT_TOKEN;
const BROADCAST_SECRET = process.env.BROADCAST_SECRET;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://booktopia-foundation.vercel.app';
const API = `https://api.telegram.org/bot${TOKEN}`;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function sendToUser(userId, text, buttonText, buttonUrl) {
  try {
    await fetch(`${API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userId,
        text,
        parse_mode: 'HTML',
        reply_markup: buttonText ? {
          inline_keyboard: [[
            buttonUrl?.startsWith('https://')
              ? { text: buttonText, url: buttonUrl }
              : { text: buttonText, web_app: { url: WEBAPP_URL } }
          ]]
        } : undefined,
      }),
    });
  } catch {
    // User may have blocked the bot — skip silently
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { secret, text, button_text, button_url } = req.body;

  if (!secret || secret !== BROADCAST_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    const userIds = await redis.smembers('booktopia:users');

    if (!userIds || userIds.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, message: 'No users registered yet' });
    }

    // Send in batches of 25 to avoid Telegram rate limits
    let sent = 0;
    const BATCH = 25;
    for (let i = 0; i < userIds.length; i += BATCH) {
      const batch = userIds.slice(i, i + BATCH);
      await Promise.all(batch.map(id => sendToUser(id, text, button_text, button_url)));
      sent += batch.length;
      // Small delay between batches
      if (i + BATCH < userIds.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return res.status(200).json({ ok: true, sent, total: userIds.length });
  } catch (err) {
    console.error('[Broadcast Error]', err);
    return res.status(500).json({ error: err.message });
  }
}
