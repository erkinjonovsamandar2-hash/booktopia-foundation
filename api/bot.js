// api/bot.js — Vercel Serverless Webhook for @Booktopiapress_bot
// Architecture: Vercel (webhook) + Supabase (orders) + Upstash Redis (user store)

import { Redis } from '@upstash/redis';
import { createClient } from '@supabase/supabase-js';

const TOKEN                = process.env.BOT_TOKEN;
const WEBAPP_URL           = process.env.WEBAPP_URL || 'https://booktopia-miniapp.vercel.app/';
const ADMIN_GROUP_ID       = process.env.ADMIN_GROUP_ID;
const SUPABASE_URL         = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const API                  = `https://api.telegram.org/bot${TOKEN}`;

// ── Customer notification templates ───────────────────────────────────────────
const CUSTOMER_MSG = {
  approved:   (n) => `✅ <b>Buyurtmangiz tasdiqlandi!</b>\n\nSalom, ${n}! Buyurtmangiz qabul qilindi.\n🕐 Tez orada kuryerimiz siz bilan bog'lanadi.`,
  delivering: (n) => `🚚 <b>Buyurtmangiz yo'lda!</b>\n\nSalom, ${n}! Buyurtmangiz yetkazib berilmoqda.\n📞 Kuryer siz bilan bog'lanishi mumkin.`,
  delivered:  (n) => `📦 <b>Buyurtma yetkazildi!</b>\n\nSalom, ${n}! Buyurtmangiz muvaffaqiyatli yetkazildi.\nRahmat! Kitob zavqli bo'lsin 📚`,
  cancelled:  (n) => `❌ <b>Buyurtma bekor qilindi</b>\n\nSalom, ${n}. Afsuski buyurtmangiz bekor qilindi.\nSavollar uchun @booktopia_support ga murojaat qiling.`,
};

// ── Upstash Redis — gracefully skip if not configured ─────────────────────────
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

// ── Telegram helpers ──────────────────────────────────────────────────────────
async function sendMessage(chatId, text, extra = {}) {
  const res = await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
  });
  return res.json();
}

async function editMessageText(chatId, messageId, text, extra = {}) {
  return fetch(`${API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML', ...extra }),
  }).then(r => r.json());
}

async function answerCallback(callbackQueryId, text = '') {
  return fetch(`${API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

// ── Save user to Redis ────────────────────────────────────────────────────────
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

// ── Update order status + notify customer ─────────────────────────────────────
async function updateOrderStatus(orderId, newStatus) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('Supabase not configured');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: order, error: fetchErr } = await supabase
    .from('miniapp_orders')
    .select('id, full_name, telegram_user_id, status')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) throw new Error('Order not found');

  const { error: updateErr } = await supabase
    .from('miniapp_orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (updateErr) throw updateErr;

  // Notify customer if they have a Telegram ID
  if (order.telegram_user_id && CUSTOMER_MSG[newStatus]) {
    try {
      await sendMessage(order.telegram_user_id, CUSTOMER_MSG[newStatus](order.full_name || 'Mijoz'));
    } catch (e) {
      console.warn('[Bot] Customer notification failed:', e.message);
    }
  }

  return order;
}

// ── /start handler ────────────────────────────────────────────────────────────
async function handleStart(ctx) {
  const user = ctx.from;
  await saveUser(user);

  // Remove any old reply keyboard first
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: user.id,
      text: '👋',
      reply_markup: { remove_keyboard: true },
    }),
  });

  const name = user.first_name || 'kitobxon';
  const text =
    `Assalomu alaykum, <b>${name}</b>! 📚\n\n` +
    `<b>Booktopia</b> — Uzbekiston bo'ylab kitob yetkazib berish xizmati.\n\n` +
    `✅ 500+ muvaffaqiyatli buyurtma\n` +
    `⚡️ 24 soat ichida yetkazib beramiz\n` +
    `💳 Payme, Click va naqd to'lov\n\n` +
    `Quyidagi tugmani bosib kitoblarni ko'ring 👇`;

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
    reply_markup: { inline_keyboard: [[{ text: "🏠 Bosh sahifa", callback_data: "home" }]] }
  });
}

// ── Callback query handler (2-step confirmation) ──────────────────────────────
async function handleCallbackQuery(update) {
  const query  = update.callback_query;
  const chatId = query.message.chat.id;
  const msgId  = query.message.message_id;
  const data   = query.data;
  const adminName = query.from.first_name || 'Admin';

  await answerCallback(query.id);

  // ── Helper to prevent HTML parsing errors from original text ──────────────
  const escapeHTML = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ── STEP 1: First click — ask for confirmation ────────────────────────────
  if (data.startsWith('approve_') || data.startsWith('cancel_')) {
    const isApprove = data.startsWith('approve_');
    const orderId   = data.replace(/^(approve_|cancel_)/, '');
    const emoji     = isApprove ? '✅' : '❌';
    const actionLabel = isApprove ? 'Tasdiqlash' : 'Bekor qilish';
    const originalText = escapeHTML(query.message.text || '');

    try {
      const res = await editMessageText(chatId, msgId,
        originalText + `\n\n⚠️ <b>${escapeHTML(adminName)}</b> ${actionLabel.toLowerCase()}ni tasdiqlayapti...`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: `${emoji} Ha, ${actionLabel}`, callback_data: `confirm_${isApprove ? 'approve' : 'cancel'}_${orderId}` },
              { text: "↩️ Yo'q, qaytish",            callback_data: `dismiss_${orderId}` },
            ]],
          },
        }
      );
      if (!res.ok) console.error('[Bot] editMessageText step 1 failed:', res);
    } catch (err) {
      console.error('[Bot] Step 1 exception:', err);
    }
    return;
  }

  // ── STEP 2: Confirmation click — execute the action ───────────────────────
  if (data.startsWith('confirm_approve_') || data.startsWith('confirm_cancel_')) {
    const isApprove = data.startsWith('confirm_approve_');
    const orderId   = data.replace(/^confirm_(approve|cancel)_/, '');
    const newStatus = isApprove ? 'approved' : 'cancelled';

    try {
      await updateOrderStatus(orderId, newStatus);

      // Strip the confirmation warning from message text
      const cleanText = escapeHTML(query.message.text.split('\n\n⚠️')[0] || '');
      const resultLine = isApprove
        ? '\n\n✅ <b>Tasdiqlandi.</b> Mijozga xabar yuborildi.'
        : '\n\n❌ <b>Bekor qilindi.</b> Mijozga xabar yuborildi.';

      const res = await editMessageText(chatId, msgId, cleanText + resultLine, {
        reply_markup: { inline_keyboard: [] },
      });
      if (!res.ok) console.error('[Bot] editMessageText step 2 failed:', res);
    } catch (err) {
      console.error('[Bot] Confirm callback error:', err);
      const cleanText = escapeHTML(query.message.text.split('\n\n⚠️')[0] || '');
      await editMessageText(chatId, msgId, cleanText + '\n\n🔴 Xatolik yuz berdi: ' + escapeHTML(err.message || 'Noma\'lum xato'), {
        reply_markup: { inline_keyboard: [] },
      });
    }
    return;
  }

  // ── Dismiss — restore original buttons ───────────────────────────────────
  if (data.startsWith('dismiss_')) {
    const orderId   = data.replace('dismiss_', '');
    const cleanText = escapeHTML(query.message.text.split('\n\n⚠️')[0] || '');

    const res = await editMessageText(chatId, msgId, cleanText, {
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Tasdiqlash',    callback_data: `approve_${orderId}` },
          { text: '❌ Bekor qilish', callback_data: `cancel_${orderId}` },
        ]],
      },
    });
    if (!res.ok) console.error('[Bot] editMessageText dismiss failed:', res);
    return;
  }

  // ── Simple callbacks ──────────────────────────────────────────────────────
  if (data === 'help') {
    await handleHelp(chatId);
  } else if (data === 'home' || data === 'my_orders') {
    await sendMessage(chatId, "Ilovani oching 👇", {
      reply_markup: { inline_keyboard: [[{ text: "📖 Ilovani ochish", web_app: { url: WEBAPP_URL } }]] }
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
      const msg  = update.message;
      const text = msg.text || '';

      if (text === '/start') {
        await handleStart({ from: msg.from });
      } else {
        await sendMessage(msg.chat.id,
          "Salom! Kitoblarni ko'rish uchun ilovani oching 👇",
          { reply_markup: { inline_keyboard: [[{ text: "📖 Kitoblarni ko'rish", web_app: { url: WEBAPP_URL } }]] } }
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
