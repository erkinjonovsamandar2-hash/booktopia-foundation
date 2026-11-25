# Booktopia

Website, Telegram mini app and Telegram bot for Booktopia, an Uzbek book project. Customers browse and order books inside Telegram, pay with Payme, and get order updates from the bot. The team runs orders from an admin dashboard.

| Part | Folder | Stack |
|---|---|---|
| Website and admin dashboard | `src/` | React 18, TypeScript, Vite, Tailwind, shadcn/ui |
| Telegram mini app (shop) | `booktopia-miniapp/` | React, Vite, JavaScript |
| Telegram bot | `api/bot.js`, `booktopia-bot/` | Telegram webhook on Vercel, or a Telegraf worker |
| Payments and orders API | `booktopia-miniapp/api/`, `api/` | Vercel serverless functions |
| Database | `supabase/` | Supabase (PostgreSQL), 26 SQL migrations, one edge function |
| Plain Node.js server | `server/` | Runs the same API on any Node host, see `server/README.md` |

## What it does

**For customers**
- Browse the catalog, discover books, keep a wishlist, add to cart, check out.
- Pay with Payme. Prices are read from the database on the server, so the browser cannot change them.
- Books out of stock show a "Tugagan" badge and cannot be bought. Hidden books never appear in lists.
- Uzbek, Russian and English text in the shop.
- Order updates and a "did it arrive?" check arrive in Telegram.

**For the team**
- Every new order lands in an admin Telegram group with Approve and Cancel buttons.
- Admin dashboard to manage orders, books, blog posts, reviews, the quiz, team, partners, links and site settings. A broadcast endpoint (`api/broadcast.js`) sends a message to past customers.
- A daily job nudges the team about paid orders not yet posted. After 3 days it reminds customers who have not confirmed delivery, and after 7 days it closes the order. The timeline records that it was closed automatically, never that the customer confirmed.

**Website pages**: library, book pages, blog, reading quiz, spotlight, team, partners, legal pages.

## How the pieces connect

```
Telegram user ──> bot (api/bot.js) ──> Supabase (orders, books, users)
       │                                   ▲
       └──> mini app ──> /api/checkout ────┤  prices from DB, order saved with the service key
                              │            │
                              └─> Payme page ──> /api/payme (Payme JSON-RPC callbacks) ──┘
Admin dashboard ──> /api/update-order-status ──> Supabase + customer message
```

- `booktopia-miniapp/api/checkout.js` builds the Payme payment link on the server, so merchant IDs never reach the browser. It also builds a Click link, but there is no Click callback in this project yet.
- `booktopia-miniapp/api/payme.js` implements Payme's merchant API (JSON-RPC 2.0, Basic auth). Set `PAYME_TEST_MODE=true` to use Payme's test cash register.
- `api/bot.js` handles `/start`, button callbacks with a two-step confirmation, and admin commands. It stores bot users in Upstash Redis when that is configured and skips it when it is not.
- `api/close-stale-deliveries.js` is the daily job above. On Vercel it runs as a cron job. On other hosts it needs `CRON_SECRET`.

## Run it locally

Needs Node 20.6 or newer.

```bash
# website and admin
npm install
cp .env.example .env      # fill in the values listed below
npm run dev

# mini app
cd booktopia-miniapp
npm install
npm run dev
```

Tests:

```bash
npm test                          # website, vitest
node --test api/_orderCard.test.mjs   # order card formatting
cd server && npm test             # 15 checks of the plain Node server
```

## Environment variables

Names only. Never commit values. Set them in the Vercel project, or in `.env` locally.

| Variable | Used for |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Browser access to Supabase |
| `SUPABASE_SERVICE_KEY` | Server-only. Writes orders. Never expose it to the browser. |
| `BOT_TOKEN` (or `TELEGRAM_BOT_TOKEN`) | Telegram bot |
| `ADMIN_GROUP_ID`, `ADMIN_DASHBOARD_URL`, `ADMIN_ORIGIN` | Admin group and dashboard links |
| `WEBAPP_URL`, `MINIAPP_URL` | Where the mini app lives |
| `PAYME_MERCHANT_ID`, `PAYME_SECRET_KEY` | Payme live |
| `PAYME_TEST_MODE`, `PAYME_TEST_MERCHANT_ID`, `PAYME_TEST_SECRET_KEY` | Payme test mode |
| `CLICK_MERCHANT_ID`, `CLICK_SERVICE_ID` | Click link (callback not built) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Optional bot user store |
| `CRON_SECRET` | Protects the daily job on hosts without Vercel cron |
| `TELEGRAM_WEBHOOK_SECRET` | Optional. Only accept webhook calls that carry this secret |

## Database

Migrations are in `supabase/migrations/`, oldest first. They cover books, orders, order archive, reviews, the quiz config, team and partner tables, and admin access rules. Apply them with the Supabase CLI. The `admin-users` edge function lives in `supabase/functions/`.

## Deploy

- **Vercel**: website, mini app and the `api/` functions. `vercel.json` has the routes, the Supabase proxy at `/_sb/*` and the cache rules.
- **Render**: `render.yaml` defines the long-polling bot worker in `booktopia-bot/`.
- **Any Node host**: use `server/`. It is tested locally with a smoke test, and not yet on a real host with real Payme, Telegram or Supabase. Test on a staging domain first.

## Quality notes

`docs/QA_STATE.md` is the QA log: 58 test cases on stock rules, hidden books, cart and checkout guards, and the checkout API, last updated 2026-08-30. It also records what was checked by hand and what by script.

## Project notes

`CLAUDE.md`, `AGENTS.md` and `MEMORY.md` are working notes for AI coding assistants used on this project.
