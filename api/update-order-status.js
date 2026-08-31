// api/update-order-status.js
// Secure API to update miniapp order status from admin dashboard
// Also sends customer notification via Telegram bot
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL        = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BOT_TOKEN           = process.env.BOT_TOKEN;
const TG_API              = `https://api.telegram.org/bot${BOT_TOKEN}`;

const STATUS_MESSAGES = {
  approved: (name) =>
    `✅ <b>Buyurtmangiz tasdiqlandi</b>\n\nSalom, ${name}! Buyurtmangizni qabul qildik va joʻnatishga tayyorlayapmiz.\n\n📦 Pochtaga topshirganimizda xabar beramiz.`,
  delivering: (name) =>
    `🚚 <b>Buyurtmangiz yoʻlda</b>\n\nSalom, ${name}! Kitoblaringizni pochtaga topshirdik.\n\n📮 Pochta boʻlimingizga yetib borgach xabar beramiz.`,
  delivered: (name) =>
    `📮 <b>Buyurtmangiz pochtaga yetib bordi</b>\n\nSalom, ${name}! Kitoblaringizni pochta boʻlimidan olib ketishingiz mumkin.\n\nYoqimli mutolaa tilaymiz 📚`,
  cancelled: (name) =>
    `❌ <b>Buyurtma bekor qilindi</b>\n\nSalom, ${name}. Afsuski buyurtmangiz bekor qilindi.\n\nSavollar bo'lsa @white_crow_8 ga murojaat qiling.`,
};

const ADMIN_ORIGIN     = process.env.ADMIN_ORIGIN || 'https://booktopia.uz';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ADMIN_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Admin authentication ──────────────────────────────────────────────────
  // This endpoint changes order status AND messages the customer on Telegram.
  // It was previously unauthenticated with CORS "*", so anyone who knew an
  // order id could cancel orders and push notifications to customers.
  //
  // The caller sends their own Supabase session token; we verify it and check
  // that the user really holds the admin role. No shared secret to distribute,
  // and access follows the same user_roles table as the rest of the admin.
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const auth = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: userData, error: userErr } = await auth.auth.getUser(token);
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { data: roleRow } = await auth
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .eq('role', 'admin')
    .maybeSingle();
  if (!roleRow) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { order_id, status } = req.body || {};
  const VALID_STATUSES = ['approved', 'delivering', 'delivered', 'cancelled'];

  if (!order_id || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid order_id or status' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch the order first to get customer info
  const { data: order, error: fetchErr } = await supabase
    .from('miniapp_orders')
    .select('id, status, full_name, telegram_user_id')
    .eq('id', order_id)
    .single();

  if (fetchErr || !order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Update status in Supabase
  const { error: updateErr } = await supabase
    .from('miniapp_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', order_id);

  if (updateErr) {
    console.error('[UpdateOrderStatus] Update error:', updateErr);
    return res.status(500).json({ error: 'Failed to update status' });
  }

  // Send notification to customer via Telegram (if they have a TG user ID)
  if (BOT_TOKEN && order.telegram_user_id && STATUS_MESSAGES[status]) {
    try {
      await fetch(`${TG_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: order.telegram_user_id,
          text: STATUS_MESSAGES[status](order.full_name || 'Mijoz'),
          parse_mode: 'HTML',
        }),
      });
    } catch (notifErr) {
      console.error('[UpdateOrderStatus] Customer notification failed:', notifErr);
      // Don't fail the whole request
    }
  }

  return res.status(200).json({ ok: true });
}
