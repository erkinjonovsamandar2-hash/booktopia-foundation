// api/close-stale-deliveries.js
// Daily cron. Closes orders whose delivery confirmation never came back.
//
// The customer is asked to confirm delivery ("Qo'limga tegdi"). Most people
// answer; some never do. Without this an order sits open forever, so the
// statistics never settle and nobody knows which deliveries actually landed.
//
// Two stages, deliberately gentle:
//   after 3 days  — one reminder, nothing changes
//   after 7 days  — auto-close as delivered, recorded in the timeline as
//                   closed automatically. It never claims the customer confirmed.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BOT_TOKEN            = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const CRON_SECRET          = process.env.CRON_SECRET;
const ADMIN_GROUP_ID       = process.env.ADMIN_GROUP_ID;
const TG_API               = `https://api.telegram.org/bot${BOT_TOKEN}`;

const REMINDER_AFTER_DAYS = 3;
const AUTO_CLOSE_AFTER_DAYS = 7;

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

async function tg(method, body) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`${TG_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error(`[StaleDeliveries] ${method} failed:`, e.message);
  }
}

export default async function handler(req, res) {
  // Vercel cron sends this header; a manual call needs the shared secret.
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const provided = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!isVercelCron && (!CRON_SECRET || provided !== CRON_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const summary = { reminded: 0, closed: 0, escalated: 0 };

  // ── Stage 1: remind ────────────────────────────────────────────────────────
  const { data: toRemind } = await db
    .from('miniapp_orders')
    .select('id, full_name, telegram_user_id, updated_at')
    .eq('status', 'delivering')
    .is('archived_at', null)
    .lt('updated_at', daysAgo(REMINDER_AFTER_DAYS))
    .gte('updated_at', daysAgo(AUTO_CLOSE_AFTER_DAYS));

  for (const order of toRemind ?? []) {
    if (!order.telegram_user_id) continue;
    await tg('sendMessage', {
      chat_id: order.telegram_user_id,
      parse_mode: 'HTML',
      text: `📦 <b>Buyurtmangiz yetib bordimi?</b>\n\nSalom, ${order.full_name || 'Mijoz'}! Kitoblaringiz qo'lingizga tegganini tasdiqlasangiz, buyurtmani yopamiz.`,
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Ha, qo'limga tegdi", callback_data: `got_${order.id}` },
          { text: "❌ Hali yo'q", callback_data: `notgot_${order.id}` },
        ]],
      },
    });
    summary.reminded++;
  }

  // ── Stage 2: auto-close ────────────────────────────────────────────────────
  const { data: toClose } = await db
    .from('miniapp_orders')
    .select('id, telegram_user_id, updated_at')
    .eq('status', 'delivering')
    .is('archived_at', null)
    .lt('updated_at', daysAgo(AUTO_CLOSE_AFTER_DAYS));

  // An order the customer actively disputed must never be auto-closed as
  // delivered — they told us it did not arrive. Closing it would bury a real
  // problem and record a delivery that never happened. Escalate instead.
  const closeIds = (toClose ?? []).map((o) => o.id);
  const disputed = new Set();
  if (closeIds.length) {
    const { data: disputeEvents } = await db
      .from('miniapp_order_events')
      .select('order_id')
      .eq('status', 'delivery_disputed')
      .in('order_id', closeIds);
    for (const e of disputeEvents ?? []) disputed.add(e.order_id);
  }

  for (const order of toClose ?? []) {
    if (disputed.has(order.id)) {
      summary.escalated++;
      if (ADMIN_GROUP_ID) {
        await tg('sendMessage', {
          chat_id: ADMIN_GROUP_ID,
          parse_mode: 'HTML',
          text: `🔴 <b>Hal qilinmagan yetkazish</b>

` +
                `Buyurtma <code>#${String(order.id).slice(0, 8)}</code> — mijoz olmaganini bildirgan, ` +
                `${AUTO_CLOSE_AFTER_DAYS} kundan beri hal qilinmagan.
` +
                `Avtomatik yopilmadi. Iltimos, qo'lda hal qiling.`,
          reply_markup: {
            inline_keyboard: [[
              { text: '📦 Yetkazildi', callback_data: `delivered_${order.id}` },
              { text: '❌ Bekor qilish', callback_data: `cancel_${order.id}` },
            ]],
          },
        });
      }
      continue;
    }

    const now = new Date().toISOString();
    const { error } = await db
      .from('miniapp_orders')
      .update({ status: 'delivered', updated_at: now })
      .eq('id', order.id);
    if (error) {
      console.error('[StaleDeliveries] close failed:', order.id, error.message);
      continue;
    }
    await db.from('miniapp_order_events').insert({
      order_id: order.id,
      status: 'delivered',
      // Honest wording: nobody confirmed this, it timed out.
      note: `${AUTO_CLOSE_AFTER_DAYS} kun javob bo'lmagani uchun avtomatik yopildi (mijoz tasdiqlamagan)`,
      created_at: now,
    });
    summary.closed++;
  }

  console.log('[StaleDeliveries]', summary);
  return res.status(200).json({ ok: true, ...summary });
}
