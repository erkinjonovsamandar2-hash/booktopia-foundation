// server/index.mjs
// Runs the project's API handlers (originally Vercel serverless functions) as one
// ordinary Node.js server, so they can be hosted on any provider that runs Node.
//
// The handlers are copied into ./handlers by `npm run sync` and mounted at /api/<name>.
// Optional: serves the built site or mini app from STATIC_DIR and proxies /_sb to Supabase.

import express from 'express';
import { Readable } from 'node:stream';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const HANDLERS_DIR = path.join(here, 'handlers');
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const STATIC_DIR = process.env.STATIC_DIR ? path.resolve(process.env.STATIC_DIR) : '';
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  // On Vercel this header is set by the platform and cannot come from outside.
  // Here anyone can send it, and close-stale-deliveries.js trusts it to skip its
  // secret check, so it must never reach a handler.
  app.use((req, _res, next) => {
    delete req.headers['x-vercel-cron'];
    next();
  });

  app.get('/healthz', (_req, res) => res.json({ ok: true }));

  // Optional shared secret for the Telegram webhook. Set the same value as
  // secret_token when calling setWebhook; Telegram then sends it in this header.
  app.use('/api/bot', (req, res, next) => {
    if (!TELEGRAM_WEBHOOK_SECRET || req.method !== 'POST') return next();
    if (req.headers['x-telegram-bot-api-secret-token'] !== TELEGRAM_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });

  // Orders, Telegram updates and Payme calls are small JSON bodies.
  app.use('/api', express.json({ limit: '1mb' }));

  if (existsSync(HANDLERS_DIR)) {
    for (const file of readdirSync(HANDLERS_DIR)) {
      if (!file.endsWith('.js') || file.startsWith('_')) continue;
      const name = file.slice(0, -3);
      const modulePromise = import(pathToFileURL(path.join(HANDLERS_DIR, file)).href);
      app.all(`/api/${name}`, async (req, res) => {
        try {
          const mod = await modulePromise;
          await mod.default(req, res);
        } catch (err) {
          console.error(`[server] /api/${name} failed:`, err);
          if (!res.headersSent) res.status(500).json({ error: 'Internal error' });
        }
      });
    }
  } else {
    console.warn('[server] ./handlers is missing. Run `npm run sync` first.');
  }

  app.all('/api/*', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // The mini app calls Supabase through /_sb (see vercel.json). Same behaviour here.
  if (SUPABASE_URL) {
    app.all('/_sb/*', async (req, res) => {
      try {
        const target = SUPABASE_URL + req.originalUrl.replace(/^\/_sb/, '');
        const headers = {};
        for (const [k, v] of Object.entries(req.headers)) {
          if (['host', 'connection', 'content-length', 'accept-encoding', 'transfer-encoding'].includes(k)) continue;
          headers[k] = v;
        }
        const hasBody = !['GET', 'HEAD'].includes(req.method);
        const upstream = await fetch(target, {
          method: req.method,
          headers,
          body: hasBody ? req : undefined,
          duplex: hasBody ? 'half' : undefined,
          redirect: 'manual',
        });
        res.status(upstream.status);
        upstream.headers.forEach((value, key) => {
          if (['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(key)) return;
          res.setHeader(key, value);
        });
        if (!upstream.body) return res.end();
        Readable.fromWeb(upstream.body).pipe(res);
      } catch (err) {
        console.error('[server] /_sb proxy failed:', err.message);
        if (!res.headersSent) res.status(502).json({ error: 'Bad gateway' });
      }
    });
  }

  // Optional: serve a built site or mini app, with the same caching as vercel.json.
  if (STATIC_DIR && existsSync(STATIC_DIR)) {
    app.use(express.static(STATIC_DIR, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (/\.(png|jpe?g|webp|svg|ico|woff2)$/i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=604800');
        }
      },
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(STATIC_DIR, 'index.html'));
    });
  }

  return app;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  createApp().listen(PORT, () => console.log(`[server] listening on ${PORT}`));
}
