// Starts the server with dummy settings and a fake Supabase, then checks the
// behaviour that matters when the handlers run outside Vercel.

import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SERVER_PORT = 34567;
const UPSTREAM_PORT = 34568;
const base = `http://127.0.0.1:${SERVER_PORT}`;

// Fake Supabase: records what it receives and answers with JSON.
const seen = [];
const upstream = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    seen.push({ method: req.method, url: req.url, apikey: req.headers.apikey, body });
    res.setHeader('content-type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ echo: req.url }));
  });
});
await new Promise((r) => upstream.listen(UPSTREAM_PORT, '127.0.0.1', r));

const env = {
  ...process.env,
  PORT: String(SERVER_PORT),
  VITE_SUPABASE_URL: `http://127.0.0.1:${UPSTREAM_PORT}`,
  SUPABASE_SERVICE_KEY: 'test-service-key',
  BOT_TOKEN: '',
  ADMIN_GROUP_ID: '',
  PAYME_SECRET_KEY: 'payme-test-secret',
  CRON_SECRET: 'cron-test-secret',
  TELEGRAM_WEBHOOK_SECRET: 'tg-test-secret',
};
const child = spawn(process.execPath, ['index.mjs'], { cwd: here, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stdout.on('data', (d) => (log += d));
child.stderr.on('data', (d) => (log += d));

async function waitUp() {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${base}/healthz`)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('server did not start:\n' + log);
}

const results = [];
async function check(name, fn) {
  try { await fn(); results.push(['ok', name]); }
  catch (e) { results.push(['FAIL', name + ' -> ' + e.message]); }
}
const json = (r) => r.json();

try {
  await waitUp();

  await check('GET /healthz is 200', async () => assert.equal((await fetch(`${base}/healthz`)).status, 200));

  await check('unknown /api route is 404 JSON', async () => {
    const r = await fetch(`${base}/api/nope`);
    assert.equal(r.status, 404);
    assert.equal((await json(r)).error, 'Not found');
  });

  await check('checkout: GET is 405', async () => assert.equal((await fetch(`${base}/api/checkout`)).status, 405));
  await check('checkout: OPTIONS is 200', async () =>
    assert.equal((await fetch(`${base}/api/checkout`, { method: 'OPTIONS' })).status, 200));
  await check('checkout: empty order is 400 with the handler message', async () => {
    const r = await fetch(`${base}/api/checkout`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    });
    assert.equal(r.status, 400);
    assert.match((await json(r)).error, /Phone and items are required/);
  });

  await check('payme: no Basic Auth returns the JSON-RPC unauthorized error', async () => {
    const r = await fetch(`${base}/api/payme`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'CheckTransaction', params: {} }),
    });
    const body = await json(r);
    assert.equal(r.status, 200);
    assert.equal(body.id, 7);
    assert.equal(body.error.code, -32504);
  });

  await check('payme: wrong key is rejected', async () => {
    const auth = 'Basic ' + Buffer.from('Paycom:wrong').toString('base64');
    const r = await fetch(`${base}/api/payme`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: auth },
      body: JSON.stringify({ jsonrpc: '2.0', id: 8, method: 'CheckTransaction', params: {} }),
    });
    assert.equal((await json(r)).error.code, -32504);
  });

  await check('payme: right key reaches the method table (unknown method gives -32601)', async () => {
    const auth = 'Basic ' + Buffer.from('Paycom:payme-test-secret').toString('base64');
    const r = await fetch(`${base}/api/payme`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: auth },
      body: JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'Nope', params: {} }),
    });
    assert.equal((await json(r)).error.code, -32601);
  });

  await check('bot: POST without the Telegram secret header is 401', async () => {
    const r = await fetch(`${base}/api/bot`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    });
    assert.equal(r.status, 401);
  });

  await check('bot: GET health message needs no secret', async () => {
    const r = await fetch(`${base}/api/bot`);
    assert.equal(r.status, 200);
    assert.equal((await json(r)).ok, true);
  });

  await check('bot: POST with the secret and an empty update is 200', async () => {
    const r = await fetch(`${base}/api/bot`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'tg-test-secret' },
      body: '{}',
    });
    assert.equal(r.status, 200);
  });

  await check('cron: x-vercel-cron header from outside does NOT skip the secret', async () => {
    const r = await fetch(`${base}/api/close-stale-deliveries`, { method: 'POST', headers: { 'x-vercel-cron': '1' } });
    assert.equal(r.status, 401);
  });

  await check('cron: the shared secret is accepted (anything but 401)', async () => {
    const r = await fetch(`${base}/api/close-stale-deliveries`, {
      method: 'POST', headers: { authorization: 'Bearer cron-test-secret' },
    });
    assert.notEqual(r.status, 401);
  });

  await check('/_sb proxies GET with path, query and headers', async () => {
    seen.length = 0;
    const r = await fetch(`${base}/_sb/rest/v1/books?select=id`, { headers: { apikey: 'anon-key' } });
    assert.equal(r.status, 200);
    assert.equal((await json(r)).echo, '/rest/v1/books?select=id');
    assert.equal(seen[0].apikey, 'anon-key');
  });

  await check('/_sb proxies POST with its body', async () => {
    seen.length = 0;
    const r = await fetch(`${base}/_sb/rest/v1/rpc/x`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ a: 1 }),
    });
    assert.equal(r.status, 200);
    assert.equal(seen[0].method, 'POST');
    assert.equal(seen[0].body, '{"a":1}');
  });
} finally {
  child.kill();
  upstream.close();
}

for (const [state, name] of results) console.log(`${state === 'ok' ? 'PASS' : 'FAIL'}  ${name}`);
const failed = results.filter(([s]) => s !== 'ok').length;
console.log(`\n${results.length - failed}/${results.length} passed`);
if (failed) { console.log('\nserver log:\n' + log); process.exit(1); }
