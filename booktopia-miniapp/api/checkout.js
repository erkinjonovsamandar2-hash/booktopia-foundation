// booktopia-miniapp/api/checkout.js
// Secure server-side checkout handler for Booktopia MiniApp (v1.0.1)
// ─────────────────────────────────────────────────────────────────────────────
// • Fetches real book prices from Supabase (anon can't fake prices)
// • Inserts order using service_role key
// • Fires admin notification to Telegram group with Approve/Cancel buttons
// • Generates Payme & Click payment redirect URLs server-side (merchant IDs
//   never exposed to the browser)

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const SUPABASE_URL         = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── Payment gateway credentials (set in Vercel env / .env) ───────────────────
const PAYME_TEST_MODE    = process.env.PAYME_TEST_MODE === 'true';
const PAYME_MERCHANT_ID  = (PAYME_TEST_MODE && process.env.PAYME_TEST_MERCHANT_ID)
  ? process.env.PAYME_TEST_MERCHANT_ID
  : (process.env.PAYME_MERCHANT_ID || '');   // from merchant.payme.uz
const CLICK_MERCHANT_ID  = process.env.CLICK_MERCHANT_ID  || '';   // from merchant.click.uz
const CLICK_SERVICE_ID   = process.env.CLICK_SERVICE_ID   || '';   // from merchant.click.uz
// Base URL of the miniapp — used as the return_url after payment
const MINIAPP_URL        = process.env.MINIAPP_URL || 'https://booktopia-miniapp.vercel.app';


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

// Calculate effective price with wholesale discount (10+ items).
// The discount is capped so a cheap book can never be discounted to (or near) zero —
// a flat 5 000 so'm off a 3 000 so'm book used to floor it at 0.
const WHOLESALE_MIN_QTY = 10;
const WHOLESALE_DISCOUNT = 5000;
function getEffectivePrice(price, qty) {
  if (!price) return 0;
  if (qty < WHOLESALE_MIN_QTY) return price;
  // never discount by more than 20% of the unit price
  const discount = Math.min(WHOLESALE_DISCOUNT, Math.floor(price * 0.2));
  return price - discount;
}

// ── Telegram initData verification ────────────────────────────────────────────
// Docs: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// Returns the verified user object, or null when the payload is absent/invalid.
function verifyInitData(initData) {
  if (!initData || !BOT_TOKEN) return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    // timing-safe compare
    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    // reject payloads older than 24h to limit replay
    const authDate = Number(params.get('auth_date') || 0);
    if (!authDate || Date.now() / 1000 - authDate > 86400) return null;

    const userRaw = params.get('user');
    return userRaw ? JSON.parse(userRaw) : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS — restricted to the miniapp origin instead of "*"
  res.setHeader('Access-Control-Allow-Origin', MINIAPP_URL);
  res.setHeader('Vary', 'Origin');
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
    init_data,            // raw Telegram WebApp initData — verified below
    idempotency_key,
  } = req.body || {};

  // ── Identity: never trust a client-supplied telegram_user_id ───────────────
  // The verified user wins. If initData is absent or invalid the order is still
  // accepted (the miniapp is usable outside Telegram) but it is stored
  // unattributed, so it can never be read back as somebody else's order.
  const verifiedUser = verifyInitData(init_data);
  const verifiedUserId = verifiedUser?.id ?? null;
  const verifiedUsername = verifiedUser?.username ?? null;
  if (!verifiedUserId && telegram_user_id) {
    console.warn('[Checkout] Unverified telegram_user_id supplied by client — discarding');
  }

  // ── Basic validation ──────────────────────────────────────────────────────
  if (!phone || !items?.length) {
    return res.status(400).json({ error: 'Phone and items are required' });
  }

  if (!['payme', 'click'].includes(payment_method)) {
    return res.status(400).json({ error: 'Invalid payment method. Only Payme and Click are accepted.' });
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  // An order must be deliverable: either a written address or GPS coordinates.
  const hasCoords = typeof lat === 'number' && typeof lng === 'number';
  if (!address?.trim() && !hasCoords) {
    return res.status(400).json({ error: 'Manzil yoki GPS joylashuvi kerak' });
  }

  // ── Supabase admin client ─────────────────────────────────────────────────
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── Fetch REAL prices & stock from database ────────────────────────────────
  const bookIds = items.map(i => i.book_id);
  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('id, title, price, stock, shop_visible')
    .in('id', bookIds);

  if (booksError) {
    console.error('[Checkout] Failed to fetch books:', booksError);
    return res.status(500).json({ error: 'Failed to verify prices' });
  }

  const priceMap = Object.fromEntries((books || []).map(b => [b.id, b]));

  // ── Validate all book_ids exist in the database ───────────────────────────
  const missingIds = items.filter(i => !priceMap[i.book_id]).map(i => i.book_id);
  if (missingIds.length > 0) {
    return res.status(400).json({ error: `Books not found: ${missingIds.join(', ')}` });
  }

  // ── Reject hidden or out-of-stock items ───────────────────────────────────
  const unavailable = items.map(i => priceMap[i.book_id]).filter(b => b && (b.shop_visible === false || b.stock === 0 || (b.stock != null && b.stock <= 0)));
  if (unavailable.length > 0) {
    const titles = unavailable.map(b => `"${b.title}"`).join(', ');
    return res.status(400).json({ error: `Ushbu kitob(lar) zaxirada tugagan yoki sotuvda yo'q: ${titles}` });
  }

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

  // ── Reject zero-amount orders ─────────────────────────────────────────────
  if (total_uzs <= 0) {
    return res.status(400).json({ error: 'Order total must be greater than zero' });
  }

  // ── Insert order ──────────────────────────────────────────────────────────
  const method = payment_method;
  // Idempotency: if the client retries with the same key, return the existing order
  // instead of creating a duplicate.
  if (idempotency_key) {
    const { data: existing } = await supabase
      .from('miniapp_orders')
      .select('id, total_uzs, payment_method')
      .eq('idempotency_key', idempotency_key)
      .maybeSingle();
    if (existing) {
      return res.status(200).json({
        ok: true,
        order_id: existing.id,
        payme_url: existing.payment_method === 'payme' ? buildPaymeUrl(existing.id, existing.total_uzs) : null,
        click_url: existing.payment_method === 'click' ? buildClickUrl(existing.id, existing.total_uzs) : null,
        deduplicated: true,
      });
    }
  }

  const { data: order, error: insertError } = await supabase
    .from('miniapp_orders')
    .insert({
      telegram_user_id:  verifiedUserId,
      telegram_username: verifiedUsername ?? (verifiedUserId ? telegram_username ?? null : null),
      full_name:         name || 'Noma\'lum',
      phone:             phone.trim(),
      items:             orderItems,
      total_uzs,
      payment_method:    method,
      delivery_address:  address || null,
      delivery_lat:      typeof lat === 'number' ? lat : null,
      delivery_lng:      typeof lng === 'number' ? lng : null,
      idempotency_key:   idempotency_key ?? null,
      status:            'pending',
      payment_status:    'unpaid',
    })
    .select()
    .single();

  if (insertError) {
    console.error('[Checkout] Insert error:', insertError);
    return res.status(500).json({ error: 'Failed to create order' });
  }

  // ── Build payment redirect URLs (server-side — merchant IDs never leave server) ──
  const payme_url = method === 'payme' ? buildPaymeUrl(order.id, total_uzs) : null;
  const click_url = method === 'click' ? buildClickUrl(order.id, total_uzs) : null;

  // NOTE: Admin Telegram notification is sent by the Payme webhook (api/payme.js)
  // only AFTER payment is confirmed. No notification fires here on order creation.

  return res.status(200).json({
    ok:        true,
    order_id:  order.id,
    payme_url,
    click_url,
  });
}
