// booktopia-miniapp/api/checkout.js
// Secure server-side checkout handler for Booktopia MiniApp
// ─────────────────────────────────────────────────────────────────────────────
// • Fetches real book prices from Supabase (anon can't fake prices)
// • Inserts order using service_role key
// • Fires admin notification to Telegram group with Approve/Cancel buttons

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL        = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BOT_TOKEN           = process.env.BOT_TOKEN;
const ADMIN_GROUP_ID      = process.env.ADMIN_GROUP_ID;

const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const PAYMENT_LABELS = {
  payme: 'Payme',
  click: 'Click',
  cash:  'Naqd pul (yetkazganda)',
};

export default async function handler(req, res) {
  // CORS headers for miniapp origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    items,                // [{ book_id, title, qty }]
    name,
    phone,
    address,
    payment_method,
    telegram_user_id,
    telegram_username,
  } = req.body || {};

  // ── Basic validation ──────────────────────────────────────────────────────
  if (!phone || !items?.length) {
    return res.status(400).json({ error: 'Phone and items are required' });
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  // ── Supabase admin client ─────────────────────────────────────────────────
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── Fetch REAL prices from database ───────────────────────────────────────
  const bookIds = items.map(i => i.book_id);
  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('id, title, price')
    .in('id', bookIds);

  if (booksError) {
    console.error('[Checkout] Failed to fetch books:', booksError);
    return res.status(500).json({ error: 'Failed to verify prices' });
  }

  const priceMap = Object.fromEntries((books || []).map(b => [b.id, b]));

  // Build verified order items — prices come from DB, not the client
  const orderItems = items.map(item => {
    const book = priceMap[item.book_id];
    return {
      book_id: item.book_id,
      title:   book?.title || item.title || 'Noma\'lum',
      price:   book?.price || 0,
      qty:     Math.max(1, parseInt(item.qty) || 1),
    };
  });

  const total_uzs = orderItems.reduce((sum, i) => sum + (i.price * i.qty), 0);

  // ── Insert order ──────────────────────────────────────────────────────────
  const { data: order, error: insertError } = await supabase
    .from('miniapp_orders')
    .insert({
      telegram_user_id:  telegram_user_id  ?? null,
      telegram_username: telegram_username ?? null,
      full_name:         name || 'Noma\'lum',
      phone:             phone.trim(),
      items:             orderItems,
      total_uzs,
      payment_method:    payment_method || 'cash',
      delivery_address:  address || null,
      status:            'pending',
    })
    .select()
    .single();

  if (insertError) {
    console.error('[Checkout] Insert error:', insertError);
    return res.status(500).json({ error: 'Failed to create order' });
  }

  // ── Admin Telegram notification ───────────────────────────────────────────
  if (BOT_TOKEN && ADMIN_GROUP_ID) {
    try {
      const shortId = order.id?.toString().slice(0, 8) ?? '—';
      const itemLines = orderItems
        .map(i => `  • ${i.title} × ${i.qty} — ${(i.price * i.qty).toLocaleString('ru-RU')} so'm`)
        .join('\n');

      const tgHandle = telegram_username ? ` (@${telegram_username})` : '';
      const tgLink   = telegram_user_id
        ? `\n👤 TG: <a href="tg://user?id=${telegram_user_id}">${name || 'Mijoz'}${tgHandle}</a>`
        : '';

      const text =
        `🛒 <b>Yangi buyurtma! #${shortId}</b>\n\n` +
        `👤 Ism: <b>${name || 'Noma\'lum'}</b>${tgLink}\n` +
        `📞 Tel: <code>${phone}</code>\n` +
        (address ? `📍 Manzil: ${address}\n` : `📍 Manzil: Ko'rsatilmagan\n`) +
        `💳 To'lov: ${PAYMENT_LABELS[payment_method] || payment_method}\n\n` +
        `📚 <b>Buyurtma:</b>\n${itemLines}\n\n` +
        `💰 <b>Jami: ${total_uzs.toLocaleString('ru-RU')} so'm</b>`;

      await fetch(`${TG_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:    ADMIN_GROUP_ID,
          text,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Tasdiqlash', callback_data: `approve_${order.id}` },
              { text: '❌ Bekor qilish', callback_data: `cancel_${order.id}` },
            ]],
          },
        }),
      });
    } catch (notifErr) {
      // Never fail the order because of a notification error
      console.error('[Checkout] Admin notification failed:', notifErr);
    }
  }

  return res.status(200).json({ ok: true, order_id: order.id });
}
