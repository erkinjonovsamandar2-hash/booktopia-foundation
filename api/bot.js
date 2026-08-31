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
  approved:   (n) => `✅ <b>Buyurtmangiz tasdiqlandi</b>\n\nSalom, ${n}! Buyurtmangizni qabul qildik va tayyorlayapmiz.\n📞 Yetkazish vaqtini kelishish uchun tez orada bog'lanamiz.`,
  delivering: (n) => `🚚 <b>Buyurtmangiz yo'lda</b>\n\nSalom, ${n}! Kitoblaringiz yetkazishga chiqdi.\n📞 Kuryerimiz manzilga yaqinlashganda qo'ng'iroq qiladi.`,
  // We no longer tell the customer their order arrived — we ask them.
  delivered:  (n) => `📦 <b>Buyurtmangiz yetkazildi deb belgilandi</b>\n\nSalom, ${n}! Kitoblaringiz qo'lingizga tegdimi?`,
  cancelled:  (n) => `❌ <b>Buyurtma bekor qilindi</b>\n\nSalom, ${n}. Afsuski buyurtmangiz bekor qilindi.\nSavollar uchun @white_crow_8 ga murojaat qiling.`,
};

// Buttons attached to the customer's "delivered?" message. The person who
// actually knows whether the books arrived is the one who confirms it.
const CUSTOMER_KEYBOARD = {
  delivered: (orderId) => ({
    inline_keyboard: [[
      { text: '✅ Ha, qo\'limga tegdi', callback_data: `got_${orderId}` },
      { text: '❌ Hali yo\'q',          callback_data: `notgot_${orderId}` },
    ]],
  }),
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
      const extra = CUSTOMER_KEYBOARD[newStatus]
        ? { reply_markup: CUSTOMER_KEYBOARD[newStatus](orderId) }
        : {};
      await sendMessage(order.telegram_user_id, CUSTOMER_MSG[newStatus](order.full_name || 'Mijoz'), extra);
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
    `<b>Booktopia</b> — o'zbek va jahon adabiyotini uyingizgacha yetkazamiz.\n\n` +
    `📚 Saralangan kitoblar — nashriyotdan to'g'ridan-to'g'ri\n` +
    `🚚 O'zbekiston bo'ylab yetkazib berish\n` +
    `💳 Payme orqali xavfsiz to'lov\n\n` +
    `Katalogni ochib, o'zingizga kitob tanlang 👇`;

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
    `Savolingiz yoki buyurtma bo'yicha muammoyingiz bormi?\n` +
    `👉 @white_crow_8 ga yozing — javob beramiz.\n\n` +
    `🕐 Ish vaqti: har kuni 9:00 — 21:00`;

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

  // ── Helper for dynamic buttons based on status ────────────────────────────
  const escapeHTML = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const getButtonsForStatus = (status, orderId) => {
    if (status === 'pending') {
      return [
        [
          { text: '✅ Tasdiqlash', callback_data: `approve_${orderId}` },
          { text: '❌ Bekor qilish', callback_data: `cancel_${orderId}` }
        ],
        [
          { text: '🙋‍♂️ O\'zim olaman', callback_data: `assign_${orderId}` },
          { text: '📤 Kuryer nusxasi', callback_data: `slip_${orderId}` },
        ]
      ];
    } else if (status === 'approved') {
      return [
        [{ text: "🚚 Yo'lda", callback_data: `delivering_${orderId}` },
         { text: "📦 Yetkazildi", callback_data: `delivered_${orderId}` }],
        [{ text: "❌ Bekor qilish", callback_data: `cancel_${orderId}` },
         { text: '📤 Kuryer nusxasi', callback_data: `slip_${orderId}` }]
      ];
    } else if (status === 'delivering') {
      return [[
        { text: "📦 Yetkazildi", callback_data: `delivered_${orderId}` },
        { text: "❌ Bekor qilish", callback_data: `cancel_${orderId}` }
      ]];
    }
    return []; // delivered or cancelled have no buttons
  };

  // ── STEP 1: First click — ask for confirmation ────────────────────────────
  const actions = ['approve', 'cancel', 'delivering', 'delivered'];
  const matchedAction = actions.find(a => data.startsWith(`${a}_`));
  
  if (matchedAction) {
    const orderId = data.replace(`${matchedAction}_`, '');
    
    let emoji, actionLabel;
    if (matchedAction === 'approve') { emoji = '✅'; actionLabel = 'Tasdiqlash'; }
    if (matchedAction === 'cancel') { emoji = '❌'; actionLabel = 'Bekor qilish'; }
    if (matchedAction === 'delivering') { emoji = '🚚'; actionLabel = "Yo'lda deb belgilash"; }
    if (matchedAction === 'delivered') { emoji = '📦'; actionLabel = 'Yetkazildi deb belgilash'; }

    const originalText = escapeHTML(query.message.text || '');

    try {
      const res = await editMessageText(chatId, msgId,
        originalText + `\n\n⚠️ <b>${escapeHTML(adminName)}</b> ${actionLabel.toLowerCase()}ni tasdiqlayapti...`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: `${emoji} Ha, tasdiqlayman`, callback_data: `confirm_${matchedAction}_${orderId}` },
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
  // ── Customer confirms delivery ─────────────────────────────────────────────
  // Closes the loop with the only person who can actually verify it.
  if (data.startsWith('got_') || data.startsWith('notgot_')) {
    const gotIt = data.startsWith('got_');
    const orderId = data.replace(gotIt ? 'got_' : 'notgot_', '');

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      await supabase.from('miniapp_order_events').insert({
        order_id: orderId,
        status: gotIt ? 'delivery_confirmed' : 'delivery_disputed',
        note: gotIt
          ? 'Mijoz yetkazilganini tasdiqladi'
          : 'Mijoz hali olmaganini bildirdi',
        created_at: new Date().toISOString(),
      });

      if (gotIt) {
        await editMessageText(chatId, msgId,
          `📦 <b>Rahmat!</b>\n\nYetkazilganini tasdiqladingiz. Yoqimli mutolaa tilaymiz 📚\n\nFikringizni @white_crow_8 ga yozsangiz, biz uchun qimmatli.`,
          { reply_markup: { inline_keyboard: [] } });
      } else {
        // Put it back on the road and tell the team, rather than leaving the
        // customer with a "delivered" order they never received.
        await supabase.from('miniapp_orders')
          .update({ status: 'delivering', updated_at: new Date().toISOString() })
          .eq('id', orderId);

        await editMessageText(chatId, msgId,
          `🙏 <b>Xabar berganingiz uchun rahmat</b>\n\nTekshiramiz va tezda bog'lanamiz.\nShoshilinch bo'lsa: @white_crow_8`,
          { reply_markup: { inline_keyboard: [] } });

        if (ADMIN_GROUP_ID) {
          await sendMessage(ADMIN_GROUP_ID,
            `⚠️ <b>Yetkazish tasdiqlanmadi</b>\n\nBuyurtma <code>#${String(orderId).slice(0, 8)}</code> — mijoz kitoblarni olmaganini bildirdi.\nHolat "Yo'lda" ga qaytarildi.`);
        }
      }
    } catch (err) {
      console.error('[Bot] Delivery confirmation error:', err);
    }
    return;
  }

  if (data.startsWith('confirm_')) {
    const parts = data.split('_'); // confirm, action, orderId
    const action = parts[1];
    const orderId = parts.slice(2).join('_');
    
    let newStatus, resultLine;
    if (action === 'approve') { newStatus = 'approved'; resultLine = '\n\n✅ <b>Tasdiqlandi.</b> Mijozga xabar yuborildi.'; }
    else if (action === 'delivering') { newStatus = 'delivering'; resultLine = '\n\n🚚 <b>Yo\'lda.</b> Mijozga xabar yuborildi.'; }
    else if (action === 'delivered') { newStatus = 'delivered'; resultLine = '\n\n📦 <b>Yetkazildi.</b> Mijozga xabar yuborildi.'; }
    else if (action === 'cancel') { newStatus = 'cancelled'; resultLine = '\n\n❌ <b>Bekor qilindi.</b> Mijozga xabar yuborildi.'; }

    try {
      await updateOrderStatus(orderId, newStatus);

      // Strip the confirmation warning from message text
      const cleanText = escapeHTML(query.message.text.split('\n\n⚠️')[0] || '');

      const res = await editMessageText(chatId, msgId, cleanText + resultLine, {
        reply_markup: { inline_keyboard: getButtonsForStatus(newStatus, orderId) },
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

  // ── Dismiss — restore original buttons by fetching current status ────────
  if (data.startsWith('dismiss_')) {
    const orderId = data.replace('dismiss_', '');
    const cleanText = escapeHTML(query.message.text.split('\n\n⚠️')[0] || '');

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: order } = await supabase.from('miniapp_orders').select('status').eq('id', orderId).single();
      
      const res = await editMessageText(chatId, msgId, cleanText, {
        reply_markup: { inline_keyboard: getButtonsForStatus(order?.status || 'pending', orderId) },
      });
      if (!res.ok) console.error('[Bot] editMessageText dismiss failed:', res);
    } catch (err) {
      console.error('[Bot] Dismiss error:', err);
    }
    return;
  }

  // ── Admin assign to self ──────────────────────────────────────────────────
  if (data.startsWith('assign_')) {
    const orderId = data.replace('assign_', '');
    const cleanText = escapeHTML(query.message.text.split('\n\n⚠️')[0] || '');
    const assignLine = `\n\n👨‍💻 <b>Mas'ul:</b> ${escapeHTML(adminName)} qabul qildi.`;
    try {
      await editMessageText(chatId, msgId, cleanText + assignLine, {
        reply_markup: { inline_keyboard: getButtonsForStatus('pending', orderId) },
      });
    } catch (err) { console.error('[Bot] Assign error:', err); }
    return;
  }

  // ── Courier slip ─────────────────────────────────────────────────────────
  if (data.startsWith('slip_')) {
    const orderId = data.replace('slip_', '');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { return; }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: order } = await supabase.from('miniapp_orders')
      .select('full_name, phone, delivery_address, total_uzs, items')
      .eq('id', orderId).single();
    if (!order) { return; }
    const shortId = orderId.slice(0, 8).toUpperCase();
    const itemLines = (order.items || []).map(i => `• ${i.title} × ${i.qty}`).join('\n');
    const slipText = `📋 <b>Kuryer nusxasi — #${shortId}</b>\n\n` +
      `👤 ${order.full_name}\n📞 ${order.phone}\n📍 ${order.delivery_address || 'Ko\'rsatilmagan'}\n\n` +
      `${itemLines}\n\n💰 Jami: <b>${Number(order.total_uzs).toLocaleString()} so'm</b>`;
    await sendMessage(chatId, slipText);
    return;
  }

  // ── Simple callbacks ──────────────────────────────────────────────────────
  if (data === 'help') {
    await handleHelp(chatId);
  } else if (data === 'home') {
    await sendMessage(chatId, "Ilovani oching 👇", {
      reply_markup: { inline_keyboard: [[{ text: "📖 Ilovani ochish", web_app: { url: WEBAPP_URL } }]] }
    });
  } else if (data === 'my_orders') {
    const userId = query.from.id;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { return; }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: orders } = await supabase.from('miniapp_orders')
      .select('id, status, total_uzs, created_at, items')
      .eq('telegram_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (!orders || orders.length === 0) {
      await sendMessage(userId, '📦 Sizda hali buyurtmalar yo\'q.\n\nKitob tanlash uchun ilovani oching 👇', {
        reply_markup: { inline_keyboard: [[{ text: '📖 Kitoblarni ko\'rish', web_app: { url: WEBAPP_URL } }]] }
      });
      return;
    }
    const statusEmoji = { pending: '⏳', approved: '✅', delivering: '🚚', delivered: '📦', cancelled: '❌' };
    const statusLabel = { pending: 'Kutilmoqda', approved: 'Tasdiqlandi', delivering: 'Yo\'lda', delivered: 'Yetkazildi', cancelled: 'Bekor' };
    let msg = `📦 <b>So'nggi buyurtmalaringiz:</b>\n\n`;
    orders.forEach((o, i) => {
      const s = o.status || 'pending';
      msg += `${i+1}. ${statusEmoji[s] || '⏳'} <b>${statusLabel[s] || s}</b> — ${Number(o.total_uzs).toLocaleString()} so'm\n`;
      msg += `   Sana: ${new Date(o.created_at).toLocaleDateString('uz-UZ')}\n\n`;
    });
    await sendMessage(userId, msg, {
      reply_markup: { inline_keyboard: [[{ text: '📖 Ilovani ochish', web_app: { url: WEBAPP_URL } }]] }
    });
  }
}

// ── Admin Helper Commands ─────────────────────────────────────────────────────
async function handleAdminCommand(msg) {
  const text = msg.text || '';
  const chatId = msg.chat.id;

  // Clean the command (handles /stats@bot_username)
  const cmd = text.split('@')[0].trim();

  if (cmd === '/help') {
    const helpMsg = `🛠 <b>Admin yordamchi buyruqlari</b>\n\n` +
      `/stats - Savdo statistikasi\n` +
      `/pending - Tasdiqlanmagan buyurtmalar\n` +
      `/search [raqam] - Telefon bo'yicha qidirish\n` +
      `/ping - Bot holatini tekshirish`;
    await sendMessage(chatId, helpMsg);
    return;
  }

  if (cmd === '/ping') {
    await sendMessage(chatId, `🟢 Bot faol holatda. Server vaqti: ${new Date().toLocaleTimeString('uz-UZ', {timeZone: 'Asia/Tashkent'})}`);
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
     await sendMessage(chatId, `🔴 Baza ulanmagan (Supabase keys missing)`);
     return;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  if (cmd === '/pending') {
    const { data: pendingOrders } = await supabase.from('miniapp_orders')
      .select('id, full_name, phone, total_uzs, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);
      
    if (!pendingOrders || pendingOrders.length === 0) {
      await sendMessage(chatId, `✅ <b>Ajoyib!</b> Tasdiqlanmagan (kutilayotgan) buyurtmalar yo'q.`);
      return;
    }

    const { count: totalPending } = await supabase.from('miniapp_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    let pendingMsg = `⏳ <b>Kutilayotgan buyurtmalar (${totalPending} ta):</b>\n\n`;
    pendingOrders.forEach((o, i) => {
       pendingMsg += `${i+1}. 👤 <b>${o.full_name}</b> (${o.phone})\n`;
       pendingMsg += `   💰 ${Number(o.total_uzs).toLocaleString()} so'm | 🕒 ${new Date(o.created_at).toLocaleTimeString('uz-UZ', {timeZone: 'Asia/Tashkent'})}\n\n`;
    });
    
    if (totalPending > 10) {
       pendingMsg += `<i>...va yana ${totalPending - 10} ta buyurtma bor.</i>\n`;
    }
    pendingMsg += `\n<i>Guruhdagi xabarlarni topib tasdiqlang yoki bekor qiling!</i>`;
    
    await sendMessage(chatId, pendingMsg);
    return;
  }

  if (cmd === '/stats') {
    const { count: totalOrders } = await supabase.from('miniapp_orders').select('*', { count: 'exact', head: true });
    
    const { data: revData } = await supabase.from('miniapp_orders')
      .select('total_uzs')
      .in('status', ['approved', 'delivering', 'delivered']);
    
    const totalRev = revData ? revData.reduce((acc, curr) => acc + (Number(curr.total_uzs) || 0), 0) : 0;

    const statsMsg = `📊 <b>Guruhdagi tezkor statistika</b>\n\n` +
      `📦 Barcha buyurtmalar: <b>${totalOrders || 0} ta</b>\n` +
      `💰 Tasdiqlangan tushum: <b>${totalRev.toLocaleString()} so'm</b>\n\n` +
      `<i>Batafsil ma'lumot Dashboard'ning Statistika bo'limida.</i>`;
    await sendMessage(chatId, statsMsg);
    return;
  }

  if (cmd.startsWith('/search')) {
    const phone = text.replace('/search', '').split('@')[0].trim();
    if (!phone) {
       await sendMessage(chatId, `⚠️ Kiritish xato. Namuna:\n/search 998901234567`);
       return;
    }
    const { data: orders } = await supabase.from('miniapp_orders')
      .select('id, full_name, total_uzs, status, created_at')
      .ilike('phone', `%${phone}%`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!orders || orders.length === 0) {
       await sendMessage(chatId, `❌ Ushbu raqam bo'yicha topilmadi.`);
       return;
    }

    let searchMsg = `🔍 <b>Natija: ${phone}</b>\n\n`;
    orders.forEach((o, i) => {
       const statusEmoji = o.status === 'delivered' ? '📦' : o.status === 'cancelled' ? '❌' : o.status === 'pending' ? '⏳' : '🚚';
       searchMsg += `👤 ${o.full_name} — ${Number(o.total_uzs).toLocaleString()} so'm\n`;
       searchMsg += `Holati: ${statusEmoji} ${o.status.toUpperCase()} | Sana: ${new Date(o.created_at).toLocaleDateString()}\n\n`;
    });
    
    await sendMessage(chatId, searchMsg);
    return;
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

      // Check if message is from the Admin Group
      if (ADMIN_GROUP_ID && msg.chat.id.toString() === ADMIN_GROUP_ID.toString()) {
        // Direct reply forwarding — if admin replies to an order message, forward the text to the customer
        if (msg.reply_to_message && !text.startsWith('/')) {
          const originalText = msg.reply_to_message.text || '';
          const orderIdMatch = originalText.match(/#([a-f0-9]{8})/i);
          if (orderIdMatch && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
            const shortId = orderIdMatch[1].toLowerCase();
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
            const { data: orders } = await supabase.from('miniapp_orders')
              .select('telegram_user_id, full_name')
              .ilike('id', `${shortId}%`)
              .limit(1);
            const order = orders?.[0];
            if (order?.telegram_user_id) {
              const adminMsg = `📩 <b>Menejerdan xabar:</b>\n\n${text}`;
              await sendMessage(order.telegram_user_id, adminMsg);
              // Confirm to admin that it was sent
              await sendMessage(chatId, `✅ Xabar <b>${order.full_name}</b> ga yuborildi.`);
            }
          }
          return res.status(200).json({ ok: true });
        }

        if (text.startsWith('/')) {
          await handleAdminCommand(msg);
        }
        return res.status(200).json({ ok: true });
      }

      // Regular user commands
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
