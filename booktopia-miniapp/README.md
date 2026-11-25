# Booktopia mini app

The Telegram mini app where customers browse books and order them. Part of the [Booktopia](../README.md) project.

Live: https://booktopia-miniapp.vercel.app/

## Stack
React, Vite, React Router, Supabase. Plain JavaScript.

## Screens
`src/pages/`: Home, Catalog, Discover, BookDetail, Wishlist, Cart, Orders, PaymentReturn, Profile.

## Rules the shop follows
- A book with stock 0 shows a "Tugagan" badge, a disabled buy button, and cannot be checked out. The server enforces this too: `/api/checkout` answers HTTP 400 for out-of-stock items.
- A book with `shop_visible = false` never appears in Home, Catalog, Discover or Wishlist.
- A cart that holds an out-of-stock book shows a warning and keeps Checkout disabled until the book is removed.
- Text is available in Uzbek, Russian and English.

## API (`api/`)
Vercel serverless functions.
- `checkout.js` reads real prices from Supabase, saves the order, notifies the admin group in Telegram, and returns the Payme payment link.
- `payme.js` is Payme's merchant callback endpoint (JSON-RPC 2.0, Basic auth).
- `_orderCard.js` formats the order message for Telegram.

## Run locally
Needs Node 20.6 or newer.

```bash
npm install
npm run dev
```

The mini app needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The API functions need the server variables listed in the [main README](../README.md#environment-variables). The service key stays on the server.

## SQL
`migration.sql`, `add_stock_column.sql`, `admin_message_columns.sql` and `stock_trigger.sql` set up the order and stock tables. Newer changes are in `../supabase/migrations/`.

## QA
Test cases and results: [`docs/QA_STATE.md`](docs/QA_STATE.md).
