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
    `✅ <b>Buyurtmangiz tasdiqlandi!</b>\n\nSalom, ${name}! Buyurtmangiz qabul qilindi va tayyorlanmoqda.\n\n🕐 Tez orada kuryerimiz siz bilan bog'lanadi.`,
  delivering: (name) =>
    `🚚 <b>Buyurtmangiz yo'lda!</b>\n\nSalom, ${name}! Buyurtmangiz yetkazib berilmoqda.\n\n📞 Kuryer siz bilan bog'lanishi mumkin.`,
  delivered: (name) =>
    `📦 <b>Buyurtma yetkazildi!</b>\n\nSalom, ${name}! Buyurtmangiz muvaffaqiyatli yetkazildi.\n\nRahmat! Kitob zavqli bo'lsin! 📚`,
  cancelled: (name) =>
    `❌ <b>Buyurtma bekor qilindi</b>\n\nSalom, ${name}. Afsuski buyurtmangiz bekor qilindi.\n\nSavollar bo'lsa @booktopia_support ga murojaat qiling.`,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
