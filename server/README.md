# Running the API on ordinary Node.js hosting

The API files in `api/` and `booktopia-miniapp/api/` were written as Vercel serverless functions. This folder runs them as one Node.js server so they can be hosted on any provider that runs Node, for example an Uzbek host that also sells `.uz` domains.

**Status:** tested locally on Node 24 with a smoke test (15 checks, below). **Not yet tested on a real host, with real Payme, Telegram or Supabase.** Test on a staging domain before any client uses it.

## What it does
- Mounts every handler at `/api/<file name>`: `bot`, `broadcast`, `checkout`, `payme`, `update-order-status`, `close-stale-deliveries`.
- Proxies `/_sb/*` to Supabase, as `vercel.json` does for the mini app.
- Optionally serves a built site or mini app (`STATIC_DIR`) with single-page-app fallback and the same cache rules as `vercel.json`.
- Strips the `x-vercel-cron` header from incoming requests. `close-stale-deliveries.js` accepts that header instead of the secret, and on a normal host anyone can send it. Without the strip, a bare `x-vercel-cron: 1` request is accepted (checked).
- Optional `TELEGRAM_WEBHOOK_SECRET` protects `/api/bot`: Telegram's webhook calls are accepted only with the matching secret header.

## Not covered
- `api/blog-preview.ts` (link previews for bots, TypeScript) is not served.
- Click payment: there is no Click webhook in the project yet.
- Moving the database. Orders still live in Supabase.

## Run locally
```bash
cd server
npm install
cp .env.example .env     # fill in
npm start                # syncs handlers, then starts on PORT (default 3000)
npm test                 # starts a throwaway server and runs 15 checks
```
Needs Node 20.6 or newer (`--env-file`).

`npm run sync` copies the handlers into `server/handlers/` so the server folder is self-contained. Run it again whenever `api/` changes. It stops if the two copies of `_orderCard.js` differ.

## Deploy
Upload the `server/` folder and run `npm install --omit=dev` on the host.

**A. Hosting with a Node.js app panel (for example cPanel "Setup Node.js App")**
1. Application root: the uploaded `server` folder. Startup file: `index.mjs`. Node 20.6+.
2. Add the variables from `.env.example` in the panel's environment settings (the `.env` file is read only by `npm start`).
3. Run `npm run sync` once, then start or restart the app.
4. Static site and mini app: upload their `dist` folders to the web root, or set `STATIC_DIR`.
Untested: how each panel passes the port and whether it keeps the process running. If the panel supports only PHP, use option B.

**B. A VPS**
1. Install Node 20+, copy the folder, run `npm install --omit=dev` and `npm run sync`.
2. Keep it running with `pm2 start index.mjs --name booktopia` (or a systemd service) and run it with the `.env` loaded, for example `node --env-file=.env index.mjs`.
3. Put nginx or Caddy in front with a TLS certificate, forwarding to `127.0.0.1:PORT`.

## After it runs
- **Telegram webhook:** call Telegram's `setWebhook` with `url=https://YOUR-DOMAIN/api/bot` and `secret_token=<TELEGRAM_WEBHOOK_SECRET>`. Check with `getWebhookInfo`. The address needs valid HTTPS.
- **Payme:** enter `https://YOUR-DOMAIN/api/payme` as the endpoint in the client's Payme merchant cabinet, with the key that goes in `PAYME_SECRET_KEY`. The client opens that account; keys go into `.env` only.
- **Daily cron:** the old schedule was `0 9 * * *` on Vercel (09:00 UTC, 14:00 in Tashkent). On the host, create a cron job that runs at the time you want, checking the server's time zone:
  ```bash
  curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://YOUR-DOMAIN/api/close-stale-deliveries
  ```
- **Environment:** `.env` holds secrets (the Supabase service key, bot token, Payme key). Keep it out of git and set its permissions to 600. Rotate any key that was ever committed.

## Checks to run on the real host before launch
1. `https://YOUR-DOMAIN/healthz` returns `{"ok":true}`.
2. A test order reaches the owner group.
3. Payme's test mode (`PAYME_TEST_MODE=true` with the test keys) can create and pay a test transaction.
4. The Telegram buttons in the owner group change the order status.
5. The cron call returns 200 and 401 without the secret.

## The smoke test
It starts the server with dummy settings and a fake Supabase and checks: health; unknown route 404; checkout 405, 400 and CORS preflight; Payme rejects missing and wrong keys and accepts the right key; the bot webhook refuses calls without the secret and accepts it with; the cron endpoint ignores a forged `x-vercel-cron` header and accepts the shared secret; and the `/_sb` proxy forwards paths, queries, headers and bodies. It does not call real Telegram, Payme or Supabase.
