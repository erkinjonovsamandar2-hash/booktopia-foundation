// api/_orderCard.js
// One Telegram card per order in the admin group. The card is sent once when the
// order is created and then edited in place as payment and status change, so the
// group sees one message per order instead of a new message at every step.
//
// The same file lives in both api/ folders (bot project and miniapp project) —
// they deploy separately and cannot share an import. Keep the two copies equal.
//
// Needs miniapp_orders.admin_chat_id and miniapp_orders.admin_message_id
// (see booktopia-miniapp/admin_message_columns.sql). Without those columns
// refreshOrderCard returns null and callers fall back to their old behaviour.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = (n) => Number(n || 0).toLocaleString('ru-RU') + " so'm";

const STATUS_LABEL = {
  pending:    '⏳ Kutilmoqda',
  approved:   '✅ Tasdiqlangan',
  delivering: "🚚 Yo'lda",
  delivered:  '📦 Yetkazildi',
  cancelled:  '❌ Bekor qilingan',
};

export const ORDER_CARD_COLUMNS =
  'id, full_name, phone, delivery_address, delivery_lat, delivery_lng, items, total_uzs, ' +
  'payment_method, payment_status, status, cancel_reason, telegram_user_id, telegram_username, ' +
  'admin_chat_id, admin_message_id';

export function orderButtons(status, id) {
  if (status === 'pending') {
    return [
      [{ text: '✅ Tasdiqlash', callback_data: `approve_${id}` }, { text: '❌ Bekor qilish', callback_data: `cancel_${id}` }],
      [{ text: "🙋‍♂️ O'zim olaman", callback_data: `assign_${id}` }, { text: '📤 Pochta varaqasi', callback_data: `slip_${id}` }],
    ];
  }
  if (status === 'approved') {
    return [
      [{ text: "🚚 Yo'lda", callback_data: `delivering_${id}` }, { text: '📦 Yetkazildi', callback_data: `delivered_${id}` }],
      [{ text: '❌ Bekor qilish', callback_data: `cancel_${id}` }, { text: '📤 Pochta varaqasi', callback_data: `slip_${id}` }],
    ];
  }
  if (status === 'delivering') {
    return [[{ text: '📦 Yetkazildi', callback_data: `delivered_${id}` }, { text: '❌ Bekor qilish', callback_data: `cancel_${id}` }]];
  }
  return []; // delivered or cancelled: nothing left to do
}

function timeline(o) {
  const paid = o.payment_status === 'paid';
  const s = o.status;
  const tick = (on) => (on ? '✅' : '⬜');
  return [
    `${tick(true)} Qabul`,
    `${tick(paid)} To'lov`,
    `${tick(['approved', 'delivering', 'delivered'].includes(s))} Tasdiq`,
    `${tick(['delivering', 'delivered'].includes(s))} Yo'lda`,
    `${tick(s === 'delivered')} Yetkazildi`,
  ].join(' · ');
}

export function renderOrderCard(o, { adminUrl, note } = {}) {
  const shortId = String(o.id ?? '').slice(0, 8) || '—';
  const paid = o.payment_status === 'paid';
  const method = o.payment_method === 'click' ? 'Click' : o.payment_method === 'cash' ? 'Naqd' : 'Payme';
  const payLine = paid ? `💳 ${method}: <b>to'langan ✅</b>` : `💳 ${method}: <b>to'lov kutilmoqda</b>`;
  const handle = o.telegram_username ? ` (@${esc(o.telegram_username)})` : '';
  const tgLink = o.telegram_user_id
    ? `\n👤 TG: <a href="tg://user?id=${o.telegram_user_id}">${esc(o.full_name || 'Mijoz')}${handle}</a>`
    : '';
  const hasGps = o.delivery_lat != null && o.delivery_lng != null;
  const items = (o.items || []).map((i) => `  • ${esc(i.title)} × ${i.qty} — ${money(i.price * i.qty)}`).join('\n');
  const head = o.status === 'cancelled' ? '🛍 BEKOR QILINGAN BUYURTMA' : paid ? "🛍 TO'LANGAN BUYURTMA" : '🛍 YANGI BUYURTMA';

  return (
    `<b>${head} #${esc(shortId)}</b>\n` +
    `<b>${STATUS_LABEL[o.status] || esc(o.status)}</b>\n` +
    `${timeline(o)}\n\n` +
    `👤 Ism: <b>${esc(o.full_name || "Noma'lum")}</b>${tgLink}\n` +
    `📞 Tel: <code>${esc(o.phone)}</code>\n` +
    (o.delivery_address ? `📍 Manzil: ${esc(o.delivery_address)}\n` : '') +
    (hasGps ? `🗺 <a href="https://maps.google.com/?q=${o.delivery_lat},${o.delivery_lng}">Xaritada ochish</a>\n` : '') +
    `${payLine}\n\n` +
    `📚 <b>Buyurtma tarkibi:</b>\n${items}\n\n` +
    `💰 <b>Jami: ${money(o.total_uzs)}</b>` +
    (o.status === 'cancelled' && o.cancel_reason ? `\n\n❌ Sabab: ${esc(o.cancel_reason)}` : '') +
    (note ? `\n\n📝 ${esc(note)}` : '') +
    (adminUrl ? `\n\n📊 <a href="${adminUrl}">Admin panelda ko'rish</a>` : '')
  );
}

async function tg(tgApi, method, body) {
  return fetch(`${tgApi}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

// Send the card and remember where it is. Returns the Telegram message id or null.
export async function postOrderCard({ tgApi, chatId, supabase, order, adminUrl }) {
  const sent = await tg(tgApi, 'sendMessage', {
    chat_id: chatId,
    text: renderOrderCard(order, { adminUrl }),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: orderButtons(order.status, order.id) },
  });
  const messageId = sent?.result?.message_id ?? null;
  if (messageId) {
    const { error } = await supabase
      .from('miniapp_orders')
      .update({ admin_chat_id: chatId, admin_message_id: messageId })
      .eq('id', order.id);
    if (error) console.warn('[OrderCard] could not store message id (run admin_message_columns.sql):', error.message);
  }
  return messageId;
}

// Re-render the stored card from the current DB row. Returns the message id when
// the card was updated (or is already current), null when there is no stored card.
export async function refreshOrderCard({ tgApi, supabase, orderId, adminUrl, note }) {
  const { data: o, error } = await supabase
    .from('miniapp_orders')
    .select(ORDER_CARD_COLUMNS)
    .eq('id', orderId)
    .maybeSingle();
  if (error || !o?.admin_message_id || !o.admin_chat_id) return null;

  const res = await tg(tgApi, 'editMessageText', {
    chat_id: o.admin_chat_id,
    message_id: o.admin_message_id,
    text: renderOrderCard(o, { adminUrl, note }),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: orderButtons(o.status, o.id) },
  });
  if (res?.ok || /not modified/i.test(res?.description || '')) return o.admin_message_id;
  console.error('[OrderCard] edit failed:', res?.description);
  return null;
}
