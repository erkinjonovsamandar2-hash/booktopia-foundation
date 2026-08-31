# QA Plan for booktopia-miniapp

Platform: Web SPA running as a **Telegram Mini App** (not a PWA)
Tooling:  Chrome MCP background tab (headless-equivalent, no windows on host)
Hardening tools detected: ESLint 10 (flat config, react-hooks + react-refresh) · ad-hoc Node script `test-runner.js` (Supabase data assertions, not a test framework) · Vercel hosting (SPA rewrites, cache + frame headers)
Status: Step 0 ✅ · Step 1 ✅ · Step 2 ✅ · Step 3 ✅ · Step 4 ⏸ DEFERRED (documented in QA_FIXES.md) · Step 5 ⚠️ — P0 hardening fails, NOT production-ready

## Scope
Only `booktopia-miniapp/` is in scope. The main site (`src/`) is explicitly out of scope for this run.

## Platform detection — evidence
- `booktopia-miniapp/index.html` loads `https://telegram.org/js/telegram-web-app.js` → Telegram Mini App host.
- `vercel.json` rewrites `/((?!api/).*)` → `/index.html` → client-routed SPA.
- `vercel.json` sets `X-Frame-Options: ALLOWALL` on `/index.html` → designed to be embedded in the Telegram webview.
- `package.json`: React 19.2 + react-router-dom 7 + Vite 8, `type: module`.
- No `manifest.json`, no service worker registration anywhere in `src/` or `index.html` → **not** a PWA; no offline layer exists.
- Serverless functions in `booktopia-miniapp/api/` (`checkout.js`, `payme.js`) run on Vercel.
- Data layer: Supabase (`src/lib/supabase.js`), proxied browser-side through the `/_sb/*` rewrite.

## Tooling detection — evidence
- Driver chosen: **Chrome MCP background tab**. Playwright is not installed and will not be added.
- Selectors only (`data-testid`, `aria-label`, visible text). No pixel coordinates.
- Screenshots captured to disk, resized to ≤1800px height, read via the Read tool.

## Hardening tools — detected vs missing
| Tool class | Status | Evidence |
|---|---|---|
| Linter | ✅ present | `booktopia-miniapp/eslint.config.js`, `npm run lint` |
| Unit/integration test framework | ❌ missing | no vitest/jest/playwright in `package.json` |
| Ad-hoc test script | ⚠️ partial | `test-runner.js` — DB assertions only, no UI coverage |
| CI | ❌ missing | `.github/` contains only `copilot-instructions.md`, no workflows |
| Crash reporting (Sentry/Crashlytics) | ❌ missing | no matches in `src/`, `api/`, `package.json` |
| Analytics | ❌ missing | no gtag/posthog/analytics references |
| Lighthouse / axe | ❌ missing | not installed |
| Type checking | ❌ missing | plain JSX, no TypeScript in this app |

## Pre-flagged findings (carry into Step 5 — Security)
- **P0** `booktopia-miniapp/test-runner.js` is git-tracked and hardcodes a live Supabase **`service_role`** JWT (exp 2087). That key bypasses RLS entirely. Must be rotated and removed from the working tree; history rewrite is a separate decision.
- **P1** Root `.env` is git-tracked (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Root `.gitignore` does not ignore `.env` (the miniapp `.gitignore` does).

## The 6 steps
- Step 1 — Map flows + product-logic gaps  → QA_FLOWS.md
- Step 2 — Smoke gate (5-min sanity)        → QA_SMOKE.md
- Step 3 — Full QA execution                → QA_REPORT.md
- Step 4 — Fix all failures, re-verify      → updates QA_REPORT.md · **DEFERRED by decision 2026-08-30: fixes are documented in QA_FIXES.md and applied after Step 5**
- Step 5 — Production hardening pass        → QA_HARDENING.md

## Non-disruptive rules (every step obeys)
- Never open windows on the user's machine. No Preview, Explorer, or foreground browsers.
- No `open`/`start` or host-display commands.
- All work in a Chrome MCP background tab only.
- Screenshots resized to height ≤1800 before reading.
- Read screenshots via the Read tool only — never pop visually.
- Batch parallel work in single messages.

## Hand-off contract
- Each step reads QA_PLAN.md first to verify it's next in line.
- Each step writes its output file and updates Status.
- Files are the source of truth — chats can change, files persist.

## Prior QA context
`docs/QA_STATE.md` records 58/58 passing cases for this app, but they cover **stock and shop-visibility logic only** — no UI/UX, no navigation, no checkout, no accessibility. Treat it as background, not coverage.

## Cadence
One prompt per turn. Each step stops after writing its file and reports before the next begins.
