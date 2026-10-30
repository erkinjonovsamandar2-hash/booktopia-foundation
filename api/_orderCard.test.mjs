import assert from 'node:assert/strict';
import { renderOrderCard, orderButtons, postOrderCard, refreshOrderCard } from './_orderCard.js';

const base = {
  id: 'abcdef12-0000-0000-0000-000000000000', full_name: 'Ali <b>X</b>', phone: '+998901234567',
  delivery_address: 'Chilonzor 5', delivery_lat: null, delivery_lng: null,
  items: [{ title: 'Tarix & Roman', qty: 2, price: 50000 }], total_uzs: 100000,
  payment_method: 'payme', payment_status: 'unpaid', status: 'pending', cancel_reason: null,
  telegram_user_id: 77, telegram_username: 'ali',
};

// render: unpaid -> waiting, escaping, timeline
let t = renderOrderCard(base);
assert.match(t, /YANGI BUYURTMA #abcdef12/);
assert.match(t, /to'lov kutilmoqda/);
assert.match(t, /Ali &lt;b&gt;X&lt;\/b&gt;/, 'name must be HTML-escaped');
assert.match(t, /Tarix &amp; Roman/);
assert.match(t, /✅ Qabul · ⬜ To'lov · ⬜ Tasdiq · ⬜ Yo'lda · ⬜ Yetkazildi/);

// render: paid + approved
t = renderOrderCard({ ...base, payment_status: 'paid', status: 'approved' }, { note: 'Admin: ok' });
assert.match(t, /TO'LANGAN BUYURTMA/);
assert.match(t, /✅ Qabul · ✅ To'lov · ✅ Tasdiq · ⬜ Yo'lda · ⬜ Yetkazildi/);
assert.match(t, /📝 Admin: ok/);

// render: cancelled shows reason, no buttons
t = renderOrderCard({ ...base, status: 'cancelled', cancel_reason: 'Mijoz so\'radi' });
assert.match(t, /BEKOR QILINGAN BUYURTMA/);
assert.match(t, /Sabab: Mijoz so&#39;radi|Sabab: Mijoz so'radi/);
assert.deepEqual(orderButtons('cancelled', 'x'), []);
assert.deepEqual(orderButtons('delivered', 'x'), []);
assert.equal(orderButtons('pending', 'x')[0][0].callback_data, 'approve_x');
assert.equal(orderButtons('approved', 'x')[0][0].callback_data, 'delivering_x');

// GPS link
t = renderOrderCard({ ...base, delivery_lat: 41.3, delivery_lng: 69.2 });
assert.match(t, /maps\.google\.com\/\?q=41\.3,69\.2/);

// post + refresh with stubs
const calls = [];
globalThis.fetch = async (url, init) => {
  const body = JSON.parse(init.body);
  calls.push({ method: url.split('/').pop(), body });
  if (url.endsWith('/sendMessage')) return { json: async () => ({ ok: true, result: { message_id: 555 } }) };
  if (url.endsWith('/editMessageText')) return { json: async () => (globalThis.__editResp || { ok: true }) };
  throw new Error('unexpected ' + url);
};
const rows = { [base.id]: { ...base, admin_chat_id: null, admin_message_id: null } };
const supabase = {
  from() {
    const q = { _id: null, _upd: null,
      update(v) { this._upd = v; return this; },
      select() { return this; },
      eq(_c, v) { this._id = v; if (this._upd) { Object.assign(rows[v], this._upd); return Promise.resolve({ error: null }); } return this; },
      maybeSingle() { return Promise.resolve({ data: rows[this._id] ?? null, error: null }); } };
    return q;
  },
};

// refresh before any card is stored -> null, no Telegram call
assert.equal(await refreshOrderCard({ tgApi: 'https://t/bot', supabase, orderId: base.id }), null);
assert.equal(calls.length, 0);

// post stores message id and sends buttons
const mid = await postOrderCard({ tgApi: 'https://t/bot', chatId: -100, supabase, order: base, adminUrl: 'https://a' });
assert.equal(mid, 555);
assert.equal(rows[base.id].admin_message_id, 555);
assert.equal(rows[base.id].admin_chat_id, -100);
assert.equal(calls[0].method, 'sendMessage');
assert.equal(calls[0].body.reply_markup.inline_keyboard[0][0].callback_data, 'approve_' + base.id);

// payment arrives -> edit in place with paid text, same message id
rows[base.id].payment_status = 'paid'; rows[base.id].status = 'approved';
assert.equal(await refreshOrderCard({ tgApi: 'https://t/bot', supabase, orderId: base.id }), 555);
const edit = calls.at(-1);
assert.equal(edit.method, 'editMessageText');
assert.equal(edit.body.message_id, 555);
assert.equal(edit.body.chat_id, -100);
assert.match(edit.body.text, /TO'LANGAN/);
assert.equal(edit.body.reply_markup.inline_keyboard[0][0].callback_data, 'delivering_' + base.id);

// Telegram says "message is not modified" -> still treated as success
globalThis.__editResp = { ok: false, description: 'Bad Request: message is not modified' };
assert.equal(await refreshOrderCard({ tgApi: 'https://t/bot', supabase, orderId: base.id }), 555);

// Telegram real failure -> null so callers fall back
globalThis.__editResp = { ok: false, description: 'Bad Request: message to edit not found' };
assert.equal(await refreshOrderCard({ tgApi: 'https://t/bot', supabase, orderId: base.id }), null);

console.log('order card tests: all passed');
