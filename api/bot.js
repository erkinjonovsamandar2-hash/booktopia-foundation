// api/bot.js — Vercel Serverless Webhook for @Booktopiapress_bot
// Architecture: Vercel (webhook) + Upstash Redis (user store + broadcast)

import { Redis } from '@upstash/redis';

const TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://www.booktopia.uz';
const API = `https://api.telegram.org/bot${TOKEN}`;

// ── Upstash Redis — gracefully skip if not configured ────────────────────────
let redis = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (e) {
  console.warn('[Redis] Failed to initialize:', e.message);
}

// ── Telegram helper ──────────────────────────────────────────────────────────
async function sendMessage(chatId, text, extra = {}) {
  const res = await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
  });
  return res.json();
}

// ── Save user to Redis — never throws ───────────────────────────────────────
async function saveUser(user) {
  if (!redis) return;
  try {
    await redis.sadd('booktopia:users', String(user.id));
    await redis.hset(`booktopia:user:${user.id}`, {
      id: user.id,
      first_name: user.first_name || '',
      username: user.username || '',
      lang: user.language_code || 'uz',
      joined: Date.now(),
    });
  } catch (e) {
    console.warn('[Redis] saveUser failed:', e.message);
  }
}

// ── Handlers ─────────────────────────────────────────────────────────────────
async function handleStart(ctx) {
  const user = ctx.from;
  await saveUser(user);

  // 1. First wipe any old Reply Keyboard (e.g. from Robosell) silently
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: user.id,
      text: '.',
      reply_markup: { remove_keyboard: true },
    }),
  }).then(async r => {
    // Delete that "." message immediately so user doesn't see it
    const data = await r.json();
    if (data.ok) {
      await fetch(`${API}/deleteMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.id, message_id: data.result.message_id }),
      });
    }
  });

  const name = user.first_name || 'kitobxon';
  const text =
    `Assalomu alaykum, <b>${name}</b>! 👋\n\n` +
    `<b>📚 Booktopia</b> — Uzbekiston bo'ylab kitob yetkazib berish xizmati.\n\n` +
    `✅ 500+ buyurtma bajarilgan\n` +
    `⚡️ 24 soat ichida yetkazib beramiz\n` +
    `💳 Payme, Click va naqd to'lov\n\n` +
    `Kitoblarni ko'rish va buyurtma berish uchun quyidagi tugmani bosing 👇`;

  await sendMessage(user.id, text, {
    reply_markup: {
      inline_keyboard: [[
        { text: "📖 Kitoblarni ko'rish", web_app: { url: WEBAPP_URL } },
      ], [
        { text: "📦 Buyurtmalarim", callback_data: "my_orders" },
        { text: "❓ Yordam", callback_data: "help" },
      ]],
    },
  });
}

async function handleHelp(chatId) {
  const text =
    `<b>Booktopia yordam markazi</b> 📞\n\n` +
    `❓ Savol yoki muammo bo'lsa:\n` +
    `👉 @booktopia_support bilan bog'laning\n\n` +
    `🕐 Ish vaqti: Har kuni 9:00 — 21:00`;

  await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [[
        { text: "🏠 Bosh sahifa", callback_data: "home" }
      ]]
    }
  });
}

async function handleCallbackQuery(update) {
  const query = update.callback_query;
  const chatId = query.message.chat.id;
  const data = query.data;

  // Acknowledge the callback immediately
  await fetch(`${API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: query.id }),
  });

  if (data === 'help') {
    await handleHelp(chatId);
  } else if (data === 'home' || data === 'my_orders') {
    await sendMessage(chatId, "Ilovani oching 👇", {
      reply_markup: {
        inline_keyboard: [[
          { text: "📖 Ilovani ochish", web_app: { url: WEBAPP_URL } }
        ]]
      }
    });
  }
}

// ── Main webhook handler ──────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'Booktopia Bot Webhook' });
  }

  try {
    const update = req.body;

    if (update.message) {
      const msg = update.message;
      const text = msg.text || '';

      if (text === '/start') {
        await handleStart({ from: msg.from });
      } else {
        // Any other message — nudge them to the app
        await sendMessage(msg.chat.id,
          "Salom! Kitoblarni ko'rish uchun ilovani oching 👇",
          {
            reply_markup: {
              inline_keyboard: [[
                { text: "📖 Kitoblarni ko'rish", web_app: { url: WEBAPP_URL } }
              ]]
            }
          }
        );
      }
    } else if (update.callback_query) {
      await handleCallbackQuery(update);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Bot Webhook Error]', err);
    res.status(200).json({ ok: true }); // Always 200 to Telegram
  }
}
