// booktopia-miniapp/api/payme.js
// ─────────────────────────────────────────────────────────────────────────────
// Payme (Paycom) JSONRPC 2.0 endpoint — "billing bilan" integration
// Docs: https://developer.help.paycom.uz/ru/metody-merchant-api
//
// Payme calls this endpoint with Basic Auth:
//   Authorization: Basic base64(PAYME_LOGIN:PAYME_KEY)
//
// Required env vars:
//   PAYME_MERCHANT_ID   — kassa ID (already set)
//   PAYME_SECRET_KEY    — from Payme merchant cabinet → Kassa → Key
//   VITE_SUPABASE_URL   — already set
//   SUPABASE_SERVICE_KEY — already set
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL        = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PAYME_MERCHANT_ID   = process.env.PAYME_MERCHANT_ID || '';
const PAYME_SECRET_KEY    = process.env.PAYME_TEST_MODE === 'true'
  ? (process.env.PAYME_TEST_SECRET_KEY || '')
  : (process.env.PAYME_SECRET_KEY || '');

// Payme error codes
const ERROR = {
  INVALID_AMOUNT:       -31001,
  TRANSACTION_NOT_FOUND: -31003,
  INVALID_STATE:        -31008,
  UNABLE_TO_PERFORM:    -31008,
  ORDER_NOT_FOUND:      -31050,
  ORDER_CANNOT_PAY:     -31051,
};

// Transaction states
const STATE = {
  PENDING:    1,
  COMPLETED:  2,
  CANCELLED:  -1,
  CANCEL_AFTER_COMPLETE: -2,
};

function supabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ── Auth check ────────────────────────────────────────────────────────────────
function isAuthorized(req) {
  if (!PAYME_SECRET_KEY) return false; // deny all if key not set
  const auth = req.headers['authorization'] || '';
  const b64  = auth.replace(/^Basic\s+/i, '');
  const decoded = Buffer.from(b64, 'base64').toString('utf8');
  // Format: "Paycom:<secret_key>"
  const [, key] = decoded.split(':');
  return key === PAYME_SECRET_KEY;
}

// ── Method handlers ───────────────────────────────────────────────────────────

// 1. CheckPerformTransaction — can this order be paid?
async function checkPerformTransaction({ account, amount }) {
  const db = supabase();
  const orderId = account?.order_id;
  if (!orderId) {
    return { error: { code: ERROR.ORDER_NOT_FOUND, message: { uz: 'Buyurtma topilmadi', ru: 'Заказ не найден', en: 'Order not found' } } };
  }

  const { data: order, error } = await db
    .from('miniapp_orders')
    .select('id, total_uzs, payment_status, status')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return { error: { code: ERROR.ORDER_NOT_FOUND, message: { uz: 'Buyurtma topilmadi', ru: 'Заказ не найден', en: 'Order not found' } } };
  }

  if (order.payment_status === 'paid') {
    return { error: { code: ERROR.UNABLE_TO_PERFORM, message: { uz: 'Buyurtma allaqachon to\'langan', ru: 'Заказ уже оплачен', en: 'Order already paid' } } };
  }

  if (order.status === 'cancelled') {
    return { error: { code: ERROR.ORDER_CANNOT_PAY, message: { uz: 'Buyurtma bekor qilingan', ru: 'Заказ отменён', en: 'Order cancelled' } } };
  }

  // Payme sends amount in tiyins; our DB stores in so'm
  const expectedTiyins = order.total_uzs * 100;
  if (amount !== expectedTiyins) {
    return { error: { code: ERROR.INVALID_AMOUNT, message: { uz: 'Noto\'g\'ri summa', ru: 'Неверная сумма', en: 'Invalid amount' } } };
  }

  return { result: { allow: true } };
}

// 2. CreateTransaction — record a pending payment attempt
async function createTransaction({ id, time, amount, account }) {
  const db = supabase();
  const orderId = account?.order_id;

  // Check order still valid
  const check = await checkPerformTransaction({ account, amount });
  if (check.error) return check;

  // Check if transaction already exists for this payme_transaction_id
  const { data: existing } = await db
    .from('miniapp_orders')
    .select('id, payment_status, payme_transaction_id')
    .eq('payme_transaction_id', id)
    .maybeSingle();

  if (existing) {
    // Already created — return same state
    return {
      result: {
        create_time: time,
        transaction: existing.id,
        state: STATE.PENDING,
      },
    };
  }

  // Save transaction ID to the order
  const { error: updateError } = await db
    .from('miniapp_orders')
    .update({
      payme_transaction_id: id,
      payment_status: 'pending_payment',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateError) {
    console.error('[Payme] CreateTransaction update error:', updateError);
    return { error: { code: ERROR.UNABLE_TO_PERFORM, message: { uz: 'Server xatosi', ru: 'Ошибка сервера', en: 'Server error' } } };
  }

  return {
    result: {
      create_time: time,
      transaction: orderId,
      state: STATE.PENDING,
    },
  };
}

// 3. PerformTransaction — payment confirmed! Mark order as paid ✅
async function performTransaction({ id }) {
  const db = supabase();

  const { data: order, error } = await db
    .from('miniapp_orders')
    .select('id, payment_status, total_uzs, updated_at')
    .eq('payme_transaction_id', id)
    .maybeSingle();

  if (error || !order) {
    return { error: { code: ERROR.TRANSACTION_NOT_FOUND, message: { uz: 'Tranzaksiya topilmadi', ru: 'Транзакция не найдена', en: 'Transaction not found' } } };
  }

  if (order.payment_status === 'paid') {
    // Already performed — idempotent response using saved updated_at timestamp
    return {
      result: {
        transaction: order.id,
        perform_time: new Date(order.updated_at).getTime(),
        state: STATE.COMPLETED,
      },
    };
  }

  const performTime = Date.now();
  const performDate = new Date(performTime).toISOString();

  // Mark order as paid
  await db.from('miniapp_orders').update({
    payment_status: 'paid',
    status: 'confirmed',   // auto-confirm paid orders
    updated_at: performDate,
  }).eq('id', order.id);

  // Log the payment event
  await db.from('miniapp_order_events').insert({
    order_id: order.id,
    status: 'paid',
    note: `Payme to'lov tasdiqlandi. Tranzaksiya: ${id}`,
  });

  console.log(`[Payme] ✅ Order ${order.id} paid — ${order.total_uzs.toLocaleString()} so'm`);

  return {
    result: {
      transaction: order.id,
      perform_time: performTime,
      state: STATE.COMPLETED,
    },
  };
}

// 4. CancelTransaction — payment cancelled or reversed
async function cancelTransaction({ id, reason }) {
  const db = supabase();

  const { data: order } = await db
    .from('miniapp_orders')
    .select('id, payment_status')
    .eq('payme_transaction_id', id)
    .maybeSingle();

  if (!order) {
    return { error: { code: ERROR.TRANSACTION_NOT_FOUND, message: { uz: 'Tranzaksiya topilmadi', ru: 'Транзакция не найдена', en: 'Transaction not found' } } };
  }

  const newPaymentStatus = 'failed';
  const newState = order.payment_status === 'paid'
    ? STATE.CANCEL_AFTER_COMPLETE
    : STATE.CANCELLED;

  await db.from('miniapp_orders').update({
    payment_status: newPaymentStatus,
    updated_at: new Date().toISOString(),
  }).eq('id', order.id);

  await db.from('miniapp_order_events').insert({
    order_id: order.id,
    status: 'payment_cancelled',
    note: `Payme to'lov bekor qilindi. Sabab: ${reason}`,
  });

  return {
    result: {
      transaction: order.id,
      cancel_time: Date.now(),
      state: newState,
    },
  };
}

// 5. CheckTransaction — return current transaction state
async function checkTransaction({ id }) {
  const db = supabase();

  const { data: order } = await db
    .from('miniapp_orders')
    .select('id, payment_status, created_at')
    .eq('payme_transaction_id', id)
    .maybeSingle();

  if (!order) {
    return { error: { code: ERROR.TRANSACTION_NOT_FOUND, message: { uz: 'Tranzaksiya topilmadi', ru: 'Транзакция не найдена', en: 'Transaction not found' } } };
  }

  const stateMap = {
    pending_payment: STATE.PENDING,
    paid:            STATE.COMPLETED,
    failed:          STATE.CANCELLED,
  };

  return {
    result: {
      create_time:  new Date(order.created_at).getTime(),
      perform_time: order.payment_status === 'paid' ? Date.now() : 0,
      cancel_time:  order.payment_status === 'failed' ? Date.now() : 0,
      transaction:  order.id,
      state:        stateMap[order.payment_status] ?? STATE.PENDING,
      reason:       null,
    },
  };
}

// 6. GetStatement — list of transactions in a time range (for reconciliation)
async function getStatement({ from, to }) {
  const db = supabase();

  const { data: orders } = await db
    .from('miniapp_orders')
    .select('id, total_uzs, payment_status, created_at, payme_transaction_id')
    .not('payme_transaction_id', 'is', null)
    .gte('created_at', new Date(from).toISOString())
    .lte('created_at', new Date(to).toISOString());

  const transactions = (orders || []).map(o => ({
    id:           o.payme_transaction_id,
    time:         new Date(o.created_at).getTime(),
    amount:       o.total_uzs * 100, // tiyins
    account:      { order_id: o.id },
    create_time:  new Date(o.created_at).getTime(),
    perform_time: o.payment_status === 'paid' ? new Date(o.created_at).getTime() : 0,
    cancel_time:  o.payment_status === 'failed' ? new Date(o.created_at).getTime() : 0,
    transaction:  o.id,
    state:        o.payment_status === 'paid' ? STATE.COMPLETED : STATE.PENDING,
    reason:       null,
  }));

  return { result: { transactions } };
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Payme Basic Auth
  if (!isAuthorized(req)) {
    return res.status(200).json({
      id: req.body?.id ?? null,
      error: { code: -32504, message: { uz: 'Ruxsat yo\'q', ru: 'Нет доступа', en: 'Unauthorized' } },
    });
  }

  const { method, params, id } = req.body || {};

  const METHODS = {
    CheckPerformTransaction: checkPerformTransaction,
    CreateTransaction:       createTransaction,
    PerformTransaction:      performTransaction,
    CancelTransaction:       cancelTransaction,
    CheckTransaction:        checkTransaction,
    GetStatement:            getStatement,
  };

  const handler_fn = METHODS[method];
  if (!handler_fn) {
    return res.status(200).json({
      id,
      error: { code: -32601, message: { uz: 'Metod topilmadi', ru: 'Метод не найден', en: 'Method not found' } },
    });
  }

  try {
    const response = await handler_fn(params || {});
    return res.status(200).json({ id, ...response });
  } catch (err) {
    console.error(`[Payme] Unhandled error in ${method}:`, err);
    return res.status(200).json({
      id,
      error: { code: -31008, message: { uz: 'Server xatosi', ru: 'Ошибка сервера', en: 'Server error' } },
    });
  }
}
