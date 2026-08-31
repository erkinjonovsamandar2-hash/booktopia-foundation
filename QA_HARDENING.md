# QA_HARDENING.md — booktopia-miniapp

Step 5 of 6 · Production hardening pass · 2026-08-30

**Deviation from the template, stated up front:** the prompt requires `Step 4 ✅ · Step 5 ⏳`. Step 4 is `⏸ DEFERRED` by your decision — fixes are documented in `QA_FIXES.md` and applied after this step. I proceeded on that basis. **Every Step 3 failure is therefore still live in the code**, and nothing below assumes otherwise.

**Method:** existing tooling first (`npm audit`, `git grep`, `gh`, production `vite build`, in-browser measurement). No new dependencies were installed. No writes to the production database. No load was generated against live payment or Telegram endpoints.

---

## Findings

Sorted by severity. **P0 = must fix before launch · P1 = week 1 · P2 = backlog.**

| Layer | Check | Status | Evidence | Sev | Fix recommendation |
|---|---|---|---|---|---|
| 1 Security | Committed secrets | ❌ | `git grep`; `gh repo view` → `"visibility":"PUBLIC"` | **P0** | **The Supabase `service_role` key is committed in a public repo, in three tracked files** — `booktopia-miniapp/test-runner.js`, `booktopia-miniapp/docs/QA_STATE.md`, `docs/QA_STATE.md`. The last was pushed today (`82cf3df`). That key bypasses RLS: full read/write/delete on the whole database. Treat as **compromised**: rotate in Supabase first, update Vercel env, then remove the files. History purge is a separate decision. |
| 1 Security | RLS on `miniapp_orders` | ❌ | REST probe, `content-range: 0-2/83` | **P0** | Anon key reads all 83 orders including `full_name`, `phone`, `delivery_address`. The anon key ships in the client bundle, so this is public. Enable RLS; move order reads behind a `SECURITY DEFINER` RPC keyed on a server-verified Telegram id. (`QA_FIXES.md` W0-1.) |
| 1 Security | Admin endpoint auth | ❌ | `api/update-order-status.js:22-27` | **P0** | **No authentication at all**, despite the "Secure API" header comment. `Access-Control-Allow-Origin: *`, accepts `{order_id, status}`, uses the service key to update `miniapp_orders`, **and sends a Telegram message to the customer**. Chained with the RLS gap above — order ids are enumerable — anyone can mark any order delivered or cancelled and push arbitrary notifications to customers. Add auth before anything else ships. *(Repo-root API, outside the declared miniapp scope, but it mutates miniapp data.)* |
| 1 Security | Broadcast endpoint auth | ❌ | `api/broadcast.js:24-27` | **P0** | Guarded by `Bearer ${SUPABASE_SERVICE_KEY}` — a key that is public in this repo. Effectively unauthenticated mass-messaging to bot users. Replace with a real admin secret, rotated. *(Repo-root API, out of scope, reported because it is reachable and severe.)* |
| 1 Security | Auth / identity | ❌ | `api/checkout.js:80,97` | **P0** | `initData` is never verified and CORS is `*`, so any origin can POST an order claiming any `telegram_user_id`. (W0-4.) |
| 1 Security | Dependency CVEs | ❌ | `npm audit` | P1 | 7 vulnerabilities, 5 high. `react-router-dom` 7.15.1 → open redirect via backslash in `<Link>`/`useNavigate`, inefficient-route-matching DoS, and others. `npm audit fix` resolves them; re-run flows #3/#7/#10 after, since routing is touched. `vite` 8.0.12 highs are dev-only. |
| 1 Security | XSS sinks | ✅ | grep | — | No `dangerouslySetInnerHTML`, no `innerHTML`. All `target="_blank"` carry `rel="noopener noreferrer"`. |
| 1 Security | Payme webhook auth | ✅ | `api/payme.js:54-60` | — | Basic auth against `PAYME_SECRET_KEY`, denies all when unset. Correct. |
| 2 Performance | Initial JS bundle | ❌ | `vite build` | P1 | **726.73 kB raw / 214.61 kB gzip in a single chunk**, over Vite's own 500 kB warning. Zero code-splitting — every route ships to every visitor. The main site already uses `React.lazy`; the miniapp does not. Split by route and lazy-load `framer-motion` and `canvas-confetti`. |
| 2 Performance | Load timing | ✅ | production preview | — | TTFB 8 ms, DOMContentLoaded 51 ms, load 52 ms on localhost. **This retires the slowness seen in Steps 2–3** — it was a `vite dev` transform artifact, exactly as flagged. |
| 2 Performance | FCP on slow 3G | ⚠️ | computed, not measured | P1 | Not measured — throttling was unavailable in this harness. 214 kB gzip on a ~400 kbps link is roughly 4–5 s before the app can paint. Treat the <2 s target as unmet until measured properly (Lighthouse on the deployed URL). |
| 2 Performance | Query efficiency | ⚠️ | code | P1 | Catalog issues `select('*')` for every book and filters client-side; `/orders` fetches every order unbounded. Fine at 18 books and 83 orders, linear from here. Select explicit columns; paginate. |
| 2 Performance | Image sizing | ⚠️ | Step 2 Obs-2; `src/index.css:193` | P2 | **Partly corrected.** `.book-card__cover-wrapper` already sets `aspect-ratio: 2/3`, so layout shift is a weaker explanation than I first gave. The swallowed add-to-cart click is still an observed fact, but its cause is **unexplained** — do not treat CLS as established. |
| 3 Accessibility | Interactive elements | ❌ | DOM probe | P1 | All 12 `.book-card` nodes are `div`s with `onClick` — not focusable, not in the a11y tree, unreachable by keyboard or screen reader. Render as `<button>`/`<Link>`. (W2-11.) |
| 3 Accessibility | Touch targets | ❌ | DOM probe @375 px | P1 | **29 of 34 interactive elements are under 44×44 px.** Category pills measure 31 px tall. Below both WCAG 2.5.5 and the iOS/Android minimum, on a phone-only product. |
| 3 Accessibility | Colour contrast | ❌ | computed WCAG ratio | P1 | `.book-card__author` at 11 px scores **2.38:1** against its surface — AA requires 4.5:1. Fails on every book card in the catalog. 12 of 14 sampled elements pass. |
| 3 Accessibility | Form labels | ❌ | DOM probe | P2 | The catalog search input has a placeholder but no `<label>` or `aria-label`. |
| 3 Accessibility | Dialog semantics | ❌ | Step 2 Obs-6 | P1 | Checkout sheet has no `role="dialog"`, no focus trap, no `inert` behind it; `Escape` does nothing. (W2-12.) |
| 3 Accessibility | Image alt text | ✅ | DOM probe | — | All 12 images carry alt text. |
| 3 Accessibility | Accessible names | ✅ | DOM probe | — | 0 of 34 interactive elements lack an accessible name. **This corrects Step 2 Obs-5**, which claimed the nav links had none — they take their name from their visible text. The book-card finding in that same observation stands. |
| 4 Observability | Crash reporting | ❌ | grep | P1 | No Sentry, Crashlytics, or Bugsnag. Combined with the missing ErrorBoundary, a production crash is invisible — no report, and the user sees a blank screen. |
| 4 Observability | Analytics | ❌ | grep | P2 | No events on any key action. There is no way to tell whether checkout is being abandoned, and no way to have noticed the Click dead-end from data. |
| 4 Observability | Structured logging | ⚠️ | grep | P2 | 13 `console.*` calls, no request ids, no correlation. Vercel captures them, but an order cannot be traced end-to-end. |
| 4 Observability | PII in logs | ✅ | reviewed | — | Server logs carry order ids and totals only — no names, phones, or addresses. Correct. |
| 5 Resilience | Offline behaviour | ❌ | Step 3 #51 | **P0** | With the network failing, `/catalog` renders a **completely blank screen**, and route changes strand the previous screen under a new URL. No service worker, no offline state, no retry. |
| 5 Resilience | Error boundaries | ❌ | Step 3 #50 | **P0** | None anywhere. A single throw unmounts the routed subtree. |
| 5 Resilience | Race conditions | ⚠️ | code | P1 | No idempotency key on checkout (W2-8); no atomic stock decrement, so two concurrent orders for the last copy both succeed (W1-2). |
| 5 Resilience | localStorage migration | ⚠️ | code | P2 | Cart, wishlist, recent, and notify keys are unversioned — an old shape from a prior release is trusted blind. (W3-19.) |
| 5 Resilience | Backup / export | ❌ | grep | P2 | No user-facing data export. Supabase's own backup policy is outside this audit. |
| 6 Fragmentation | Mobile layout @375 px | ✅ | emulated 375×812 | — | No horizontal overflow (`scrollWidth` 375). Layout holds. |
| 6 Fragmentation | Grid alignment | ⚠️ | screenshot | P2 | Cards with one-line vs two-line titles produce a ragged grid — rows do not align. Cosmetic. |
| 6 Fragmentation | Dark mode | ⚠️ | `src/index.css:94` | P2 | **CORRECTED — my original finding here was wrong.** A full `@media (prefers-color-scheme: dark)` palette exists at `src/index.css:94`. The grep behind the original claim ran from the repo root, so `src/` resolved to the main site, not the mini app. What genuinely remains: Telegram's in-app theme (`themeParams`) is not honoured, so a user whose Telegram is dark but whose OS is light still sees the light palette. |
| 6 Fragmentation | Cross-browser | ⏭️ | — | P2 | Only Chromium was exercised. Safari/iOS matters here — `dvh` units, `env(safe-area-inset)`, and the drag interactions all warrant a real device pass. |
| 7 Load / scale | 1000-row render | ⏭️ | attempted | P1 | A synthetic 1000-row injection did not take effect on the app's own request path, so **this was not measured — no claim is made**. Structurally the risk is certain: no pagination and no virtualisation anywhere, every book rendered in one grid, every order in one list. Re-test with a seeded staging dataset. |
| 7 Load / scale | Endpoint concurrency | ⏭️ | not run | P1 | Not attempted. The only deployment available is production, backed by live payment credentials and a real admin Telegram group. Needs a staging target. |
| 8 Compliance | Privacy policy / terms | ❌ | grep | **P0** | **Nothing in the miniapp.** It collects name, phone number, delivery address, and GPS coordinates, with no privacy policy, no terms, and no link to the ones that already exist on booktopia.uz. Required by Telegram's Mini App terms and by basic data-protection expectations. Lowest-effort fix in the P0 set — link the existing pages from Profile. |
| 8 Compliance | Data export / deletion | ❌ | grep | P1 | No way for a user to export or delete their data, while 83 orders of PII are retained indefinitely. |
| 8 Compliance | Consent for GPS | ⚠️ | code | P2 | The browser prompts, but nothing explains why the location is wanted — and it is discarded by the server anyway (W2-7). |
| 8 Compliance | Bot/app metadata | ⏭️ | — | P2 | Not reviewed — outside the repo. |

---

## Counts

**P0 — 8** · **P1 — 15** · **P2 — 16** · passed 6 · not assessed 4

> **Two findings in this table were corrected after the fact** (dark mode, image sizing). Both were mine and both were overstated; the rows say what actually holds.

### Top 5 highest-risk

1. **`service_role` key committed in a PUBLIC GitHub repo** (three files, one pushed today). Full database compromise, live right now.
2. **No RLS on `miniapp_orders`** — 83 customers' names, phones, and addresses readable with the public anon key.
3. **`update-order-status.js` is completely unauthenticated** — anyone can change any order's status and trigger Telegram messages to customers; order ids are enumerable via finding 2.
4. **`broadcast.js` is gated by the publicly-leaked service key** — effectively open mass-messaging.
5. **Offline or any fetch failure blanks the app**, with no ErrorBoundary and no crash reporting to reveal it happened.

Findings 1–4 compound: the leaked key opens the database directly, and even without it the missing RLS plus the open admin endpoint allow enumerate-then-mutate against real customer orders.

---

## Gate decision

**P0 hardening failures exist — do not launch.**

`QA_PLAN.md` status → **Step 5 ⚠️ — P0 hardening fails.** Per the template these route to Prompt 4, which is deferred by agreement; the items are appended to `QA_FIXES.md` as **Wave 0H** and **Wave 1H**. Re-run Step 5 against the failed layers only, after the fixes land.

**P0 hardening fails — fix before launch.**
