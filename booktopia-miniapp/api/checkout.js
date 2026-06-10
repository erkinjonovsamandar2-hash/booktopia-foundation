// booktopia-miniapp/api/checkout.js
// Secure server-side checkout handler for Booktopia MiniApp (v1.0.1)
// ─────────────────────────────────────────────────────────────────────────────
// • Fetches real book prices from Supabase (anon can't fake prices)
// • Inserts order using service_role key
// • Fires admin notification to Telegram group with Approve/Cancel buttons
// • Generates Payme & Click payment redirect URLs server-side (merchant IDs
//   never exposed to the browser)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BOT_TOKEN            = process.env.BOT_TOKEN;
const ADMIN_GROUP_ID       = process.env.ADMIN_GROUP_ID;

// ── Payment gateway credentials (set in Vercel env / .env) ───────────────────
const PAYME_MERCHANT_ID  = process.env.PAYME_MERCHANT_ID  || '';   // from merchant.payme.uz
const CLICK_MERCHANT_ID  = process.env.CLICK_MERCHANT_ID  || '';   // from merchant.click.uz
const CLICK_SERVICE_ID   = process.env.CLICK_SERVICE_ID   || '';   // from merchant.click.uz
// Base URL of the miniapp — used as the return_url after payment
const MINIAPP_URL        = process.env.MINIAPP_URL || 'https://booktopia-miniapp.vercel.app';

const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const PAYMENT_LABELS = {
  payme: 'Payme',
  click: 'Click',
  cash:  'Naqd pul (yetkazganda)',
};

// ── Payme checkout URL builder ────────────────────────────────────────────────
// Docs: https://developer.help.paycom.uz/ru/initsializatsiya-platezhey/
// Params encoded as "key=value" pairs separated by ";", then base64 encoded.
// Amount must be in tiyins (so'm × 100).
function buildPaymeUrl(orderId, amountUzs, lang = 'uz') {
  if (!PAYME_MERCHANT_ID) return null;
  const amountTiyins = amountUzs * 100;
  const returnUrl = `${MINIAPP_URL}/?payment=success&order_id=${orderId}`;
  const params = [
    `m=${PAYME_MERCHANT_ID}`,
    `ac.order_id=${orderId}`,
    `a=${amountTiyins}`,
    `l=${lang}`,
    `c=${encodeURIComponent(returnUrl)}`,
  ].join(';');
  const encoded = Buffer.from(params).toString('base64');
  const baseUrl = process.env.PAYME_TEST_MODE === 'true' 
    ? 'https://checkout.test.paycom.uz/' 
    : 'https://checkout.paycom.uz/';
  return `${baseUrl}${encoded}`;
}

// ── Click checkout URL builder ────────────────────────────────────────────────
// Docs: https://docs.click.uz/en/click-api-request/
// Amount in so'm (not tiyins). transaction_param is our order reference.
function buildClickUrl(orderId, amountUzs) {
  if (!CLICK_MERCHANT_ID || !CLICK_SERVICE_ID) return null;
  const returnUrl = encodeURIComponent(`${MINIAPP_URL}/?payment=success&order_id=${orderId}`);
  return (
    `https://my.click.uz/services/pay` +
    `?service_id=${CLICK_SERVICE_ID}` +
    `&merchant_id=${CLICK_MERCHANT_ID}` +
    `&amount=${amountUzs}` +
    `&transaction_param=${orderId}` +
    `&return_url=${returnUrl}`
  );
}

// Calculate effective price with wholesale discount (10+ items)
function getEffectivePrice(price, qty) {
  if (!price) return 0;
  return qty >= 10 ? Math.max(0, price - 5000) : price;
}

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
    lat,
    lng,
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
    const qty = Math.max(1, parseInt(item.qty) || 1);
    const basePrice = book?.price || 0;
    return {
      book_id: item.book_id,
      title:   book?.title || item.title || 'Noma\'lum',
      price:   getEffectivePrice(basePrice, qty),
      qty:     qty,
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

  // ── Build payment redirect URLs (server-side — merchant IDs never leave server) ──
  const payme_url = payment_method === 'payme' ? buildPaymeUrl(order.id, total_uzs) : null;
  const click_url = payment_method === 'click' ? buildClickUrl(order.id, total_uzs) : null;

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

      const mapLink = (lat && lng)
        ? `\n📍 <a href="https://yandex.uz/maps/?ll=${lng},${lat}&z=16&pt=${lng},${lat}">Xaritada ko'rish</a>`
        : '';

      const text =
        `🛒 <b>Yangi buyurtma! #${shortId}</b>\n\n` +
        `👤 Ism: <b>${name || 'Noma\'lum'}</b>${tgLink}\n` +
        `📞 Tel: <code>${phone}</code>\n` +
        (address ? `📍 Manzil: ${address}${mapLink}\n` : `📍 Manzil: Ko'rsatilmagan\n`) +
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
            inline_keyboard: [
              [
                { text: '✅ Tasdiqlash',    callback_data: `approve_${order.id}` },
                { text: '❌ Bekor qilish', callback_data: `cancel_${order.id}` },
              ],
              [
                { text: '🙋‍♂️ O\'zim olaman',  callback_data: `assign_${order.id}` },
                { text: '📤 Kuryer nusxasi', callback_data: `slip_${order.id}` },
              ],
            ],
          },
        }),
      });
    } catch (notifErr) {
      // Never fail the order because of a notification error
      console.error('[Checkout] Admin notification failed:', notifErr);
    }
  }

  return res.status(200).json({
    ok:        true,
    order_id:  order.id,
    payme_url, // null when payment_method !== 'payme' or credentials missing
    click_url, // null when payment_method !== 'click' or credentials missing
  });
}
