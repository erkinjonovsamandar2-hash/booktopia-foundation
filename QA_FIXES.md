# QA_FIXES.md — remediation plan

**booktopia-miniapp** · compiled 2026-08-30 from `QA_REPORT.md` (Step 3) and `QA_BACKLOG.md`

Nothing in this file has been applied. It is the agreed plan of record: what to change, where, how to prove it worked, and what each change risks. Execution happens after Step 5, in wave order.

Each item carries the backlog ID so the two files stay in sync. **Verify** is the check that must pass before the item is marked fixed — most map to a numbered flow in `QA_FLOWS.md`, so Step 3 can be re-run selectively.

---

## Wave 0 — outside this repo, needs your decision first

These cannot be fixed by editing code, and each has a real blast radius. Nothing else should ship until W0-1 and W0-2 are done, because they are live exposures.

| # | ID | Fix | Risk | Verify |
|---|---|---|---|---|
| W0-1 | SEC-04 | **Enable RLS on `miniapp_orders`.** Today the anon key reads all 83 orders with names, phones, and addresses. Target policy: anon gets **no** direct read; the app reads its own orders through a `SECURITY DEFINER` RPC that takes a **server-verified** Telegram user id, never a client-supplied one. `/payment-return` moves to a narrow RPC returning only `payment_status` for a given order id. | **High.** A wrong policy silently breaks `/orders`, the Home orders widget, and payment polling for real customers. Write the migration, apply to a branch/staging DB, re-run flows #35/#36/#32 before production. | Repeat the Step 3 REST probe: anon `select` on `miniapp_orders` must return `401`/`403` or zero rows. |
| W0-2 | SEC-01 | **Rotate the leaked Supabase `service_role` key** and delete `booktopia-miniapp/test-runner.js` from the working tree. The key is git-tracked and valid to 2087. Update `SUPABASE_SERVICE_KEY` in Vercel env before removing the old key, or `/api/checkout` and `/api/payme` go down. Purging git history is a separate decision — the key must be rotated regardless. | **High.** Rotate-then-deploy ordering matters; get it backwards and checkout breaks. | New key in Vercel, old key revoked in Supabase, `git ls-files` no longer lists the file, checkout still succeeds. |
| W0-3 | SEC-02 | Add `.env` to the **root** `.gitignore` and `git rm --cached .env`. Root `.env` holds only the URL and anon key, so no rotation is strictly required — but it should not be tracked. | Low. | `git ls-files .env` returns nothing. |
| W0-4 | SEC-03 | **Verify Telegram `initData` server-side.** `api/checkout.js:97` trusts a client-supplied `telegram_user_id`. Add HMAC-SHA256 validation of the raw `initData` string against `BOT_TOKEN` and derive the user id from the verified payload; reject on mismatch. This is the precondition for W0-1's RPC to mean anything. | Medium. Requires the client to send raw `initData` (`tg().initData`), which it does not send today — client and server change together. | An order posted with a forged `telegram_user_id` and no valid `initData` is rejected with 401. |

---

## Wave 1 — P0 code fixes

| # | ID | Fix | Files | Verify |
|---|---|---|---|---|
| W1-1 | BIZ-01 | **Build the Click webhook.** Add `api/click.js` implementing Click's Prepare/Complete callbacks: verify the signature against `CLICK_SECRET_KEY`, look up the order by `transaction_param`, set `payment_status='paid'`, and fire the same admin Telegram notification `api/payme.js` sends. Until it exists, either ship it or **remove Click from `PAYMENT_OPTIONS`** — do not keep taking Click money that can never be confirmed. | new `api/click.js`; `src/components/CheckoutSheet.jsx` `PAYMENT_OPTIONS` | Flow #33: a Click payment flips the order to `paid` and clears the cart. |
| W1-2 | BIZ-02 | **Decrement stock on payment.** In the Payme `Perform` handler (and the new Click one), decrement `books.stock` for each line item in the same transaction that sets `payment_status='paid'`. Use an atomic RPC (`decrement_stock(book_id, qty)`) so concurrent orders cannot oversell. Note: 17 of 18 books currently have `stock = null` — decide whether `null` means "untracked" (skip) or should be backfilled to a real count, otherwise this fix protects nothing. | `api/payme.js`, new `api/click.js`, new Supabase RPC | Flow #34: stock drops by the ordered quantity after payment. |
| W1-3 | ERR-01, ERR-09 | **Add an ErrorBoundary** around the routed subtree in `App.jsx:49–62`, with a real fallback (message + retry). Today a throw inside a route unmounts the subtree and leaves a blank screen under a live bottom nav. | `src/App.jsx`, new `src/components/ErrorBoundary.jsx` | Flow #50: force a throw; a fallback renders instead of a blank page. |
| W1-4 | ERR-02, ERR-03 | **Give every fetch an error state.** `Catalog.jsx:30`, `BookDetail.jsx:44`, `Home.jsx:99`, `Discover.jsx`, `Orders.jsx` all swallow failures into an empty state or a blank render. Add `error` state alongside `loading`, render a retry affordance, and distinguish "nothing found" from "could not load". Add an `online`/`offline` listener for a clear offline banner. | all five pages | Flow #51: with `fetch` failing, `/catalog` shows an error + retry, not a blank screen; route changes no longer strand the previous screen under a new URL. |
| W1-5 | NAV-03 | **Make the checkout sheet survive back.** Push a history entry when the sheet opens and close it on `popstate`; also close on `Escape`. Today back navigates `/cart` → `/` mid-order. | `src/components/CheckoutSheet.jsx`, `src/pages/Cart.jsx`, `src/pages/BookDetail.jsx` | Flow #54: back closes the sheet and stays on `/cart`. |

---

## Wave 2 — P1

| # | ID | Fix | Files | Verify |
|---|---|---|---|---|
| W2-1 | NAV-02 | Back on `/book/:id` must not leave the app. Replace bare `navigate(-1)` with a guarded fallback to `/catalog` when there is no in-app history, **and** stop hiding BottomNav on that route (or add a persistent home affordance). | `src/pages/BookDetail.jsx:79`, `src/App.jsx:63` | Flow #10: cold deep-link + back stays inside the miniapp. |
| W2-2 | BIZ-06 | Cap `incrementQty` at available stock; disable `+` at the ceiling with a reason. Depends on stock actually being populated (W1-2). | `src/context/CartContext.jsx:95`, `src/pages/Cart.jsx:223` | Flow #17: qty cannot exceed stock. |
| W2-3 | ERR-04 | Confirm before `clearCart`, and offer undo. One tap currently destroys the cart — observed wiping a 1 900 000 so'm cart. Same treatment for qty − at 1. | `src/pages/Cart.jsx:58`, `src/context/CartContext.jsx:109` | Flow #20: clearing requires confirmation; undo restores. |
| W2-4 | SYNC-02 | Lift wishlist state out of `WishBtn`'s local `useState` into a context (or a storage-event subscription) so un-hearting re-renders every view. Observed: storage 2 → 1, cards stayed 2. | `src/components/BookCard.jsx:113–130`, `src/pages/Wishlist.jsx` | Flow #42: un-hearting removes the card immediately. |
| W2-5 | BIZ-05 | Re-validate the cart against the DB on `/cart` mount — refresh `price` and `stock`, and tell the user what changed. Cart currently trusts an add-time localStorage snapshot. | `src/pages/Cart.jsx`, `src/context/CartContext.jsx` | Flow #22: a book that sold out after being added is flagged on the cart screen. |
| W2-6 | DEAD-03, MGMT-02 | Reading paths: either populate `booktopia_orders` from real order history (so progress works) or **remove the progress bar** — it reads `0/N` for every user, always. Separately, skip rendering a path whose books all resolve to nothing: "Temur imperiyasi" draws an empty `0/0` card because its three UUIDs are all `shop_visible=false`. | `src/pages/Discover.jsx:79`, `PATHS` at `:20` | Flows #45, #46: progress reflects reality, no empty path cards. |
| W2-7 | BIZ-04 | Persist `lat`/`lng`. `api/checkout.js:94–95` destructures them and `:169` omits them from the insert — GPS the user captured is discarded. Add the columns and write them. | `api/checkout.js`, Supabase schema | Flow #27: coordinates appear on the stored order. |
| W2-8 | BIZ-07 | Add an idempotency key to `POST /api/checkout` so a retry or double-submit cannot create two orders. | `api/checkout.js`, `src/components/CheckoutSheet.jsx` | Flow #29: the same key twice yields one order. |
| W2-9 | BIZ-08 | Require a deliverable address — either a typed address or GPS. Both are optional today, so undeliverable orders are accepted. | `src/components/CheckoutSheet.jsx`, `api/checkout.js` | Flow #26: submit blocked with neither. |
| W2-10 | SYNC-01 | Refresh order status — poll on focus or subscribe via Supabase realtime. `/orders` and the Home widget are stale until remount. | `src/pages/Orders.jsx`, `src/pages/Home.jsx` | Flows #36, #39: an admin status change appears without a manual reload. |
| W2-11 | A11Y-01 | Make books reachable: render `BookCard`/`PortraitCard` as `<button>` or `<Link>` instead of `div onClick`, and give the five nav links accessible names. Nothing in the catalog is currently reachable by keyboard or screen reader. | `src/components/BookCard.jsx`, `src/components/BottomNav.jsx`, `src/pages/Home.jsx` | Every book exposes an interactive node in the a11y tree; tab order reaches it. |
| W2-12 | A11Y-02 | Give the sheet `role="dialog"`, `aria-modal`, a focus trap, and `inert`/`aria-hidden` on the page behind it. | `src/components/CheckoutSheet.jsx` | Focus cannot escape the open sheet. |
| W2-13 | ERR-05 | Give the toast an error variant (icon + colour) and `role="status"` / `aria-live`. It is success-only today, so failures cannot be announced. | `src/context/ToastContext.jsx` | An error toast renders in error styling and is announced. |
| W2-14 | ERR-06 | Show a message when geolocation is denied or unsupported — currently a haptic and a silent no-op. | `src/components/CheckoutSheet.jsx` | Flow #27: denial produces visible feedback. |
| W2-15 | UX-01 | Reserve layout space for book covers (`aspect-ratio` + explicit dimensions) so cards do not shift as images decode. A first add-to-cart click was swallowed during smoke. | `src/index.css`, `src/components/BookCard.jsx` | Flow #14: no CLS on the grid; taps land during image load. |
| W2-16 | SYNC-06 | Stabilise `clearCart` with `useCallback` in `CartContext` so `PaymentReturn`'s polling effect stops re-running on every provider render. | `src/context/CartContext.jsx`, `src/pages/PaymentReturn.jsx` | Flow #32: one interval, no stacking. |
| W2-17 | DEAD-02 | Coming-Soon / notify-me: either render the section and wire `handleNotify` to a real backend, or delete `comingSoon` (`Home.jsx:121`), `handleNotify` (`:103`), and the `soonTitle`/`notify` strings. Half-built today — computed, never rendered, no backend. | `src/pages/Home.jsx` | No dead branch remains; if kept, a notification actually sends. |
| W2-18 | DEAD-01 | `ReaderModal.jsx` is imported nowhere and shows the same hardcoded Uzbek lorem for every book. Wire it to real excerpt content or delete it. | `src/components/ReaderModal.jsx` | Flow #13: reachable and real, or gone. |
| W2-19 | NAV-04 | Cart deep-link import should **merge**, not replace, and should tell the user what was added or skipped. Replace the `replaceState` + synthetic `PopStateEvent` hack (`CartContext.jsx:73–74`) with router navigation. | `src/context/CartContext.jsx:60–78` | Flow #48: an existing cart survives the import. |
| W2-20 | SYNC-03 | Write the category filter back to the URL (`?cat=`) so back/refresh preserve it. | `src/pages/Catalog.jsx:22,72` | Flow #6: URL reflects the active filter. |

---

## Wave 3 — P2 and cleanup

| # | ID | Fix | Files |
|---|---|---|---|
| W3-1 | I18N-02 | Move the ten hardcoded strings into the `T` maps: `← swipe`, `Ulgurji narx`, `Zaxirada tugagan`, `Yuborilmoqda...`, `N ta raqam qoldi`, `▴ Yopish`, `✅ Tugatildi`, `TUGAGAN`, `O'qish`, and all of `ReaderModal`. Also the `aria-label`s on the cart and wishlist buttons. | `Cart.jsx`, `CheckoutSheet.jsx`, `Orders.jsx`, `Discover.jsx`, `Home.jsx`, `BookCard.jsx` |
| W3-2 | I18N-03 | Set `document.documentElement.lang` when the language changes. | `src/context/LangContext.jsx` |
| W3-3 | I18N-01 | Fix or delete the corrupt `readMore` RU value `'Читать dalеj'`. It never renders today — fix it as part of W3-5, not on its own. | `src/pages/Home.jsx` |
| W3-4 | I18N-04 | Include `author_ru` / `author_en` in catalog search; echo the query in the empty state. | `src/pages/Catalog.jsx` |
| W3-5 | DEAD-04 | Remove the unused `trustOrders` / `trustOfficial` / `trustDelivery` / `collapse` / `readMore` strings and the duplicate `6. CATALOG CTA` / `7. CATALOG CTA` comments. | `src/pages/Home.jsx` |
| W3-6 | UX-03 | The Home hero CTA uses the `seeAll` label ("Barchasini ko'rish →") on a button that opens the catalog. Give it its own string. | `src/pages/Home.jsx` |
| W3-7 | UX-02 | Do not promote an out-of-stock book as "HAFTA TANLOVI" — filter OOS out of the week pick, or show the OOS state on the hero card. | `src/pages/Discover.jsx` |
| W3-8 | SYNC-04 | Call `trackView` from every entry point. `Home.jsx:367` passes bare `navigate`, so New Releases views are never recorded; Catalog, Discover, and Wishlist record nothing. | `src/pages/Home.jsx`, `Catalog.jsx`, `Discover.jsx` |
| W3-9 | NAV-06 | Add a real 404 route instead of the silent `<Navigate to="/">` at `App.jsx:60`. | `src/App.jsx` |
| W3-10 | NAV-05 | Wishlist share should link to the **book**, not the bot, and the bot username should come from one source — `Booktopiapress_bot` and `booktopia_uz` currently disagree across files. | `src/pages/Wishlist.jsx`, `src/pages/Profile.jsx` |
| W3-11 | ERR-07 | Let a revealed swipe row close by tapping elsewhere. | `src/pages/Cart.jsx:134` |
| W3-12 | ERR-08 | Handle a blocked `window.open` fallback when `tg.openLink` is unavailable. | `CheckoutSheet.jsx`, `Home.jsx`, `Wishlist.jsx` |
| W3-13 | NAV-01 | Give a priceless book a real CTA ("ask for price"). Currently latent — every book has a price — so this is cleanup, not a live bug. | `src/pages/BookDetail.jsx:182` |
| W3-14 | BIZ-03 | Make the wholesale rule proportional (or floor it sensibly) so a cheap book cannot fall to 0, and align the ≥10 000 banner with the rule. Latent today — no book is under 10 000 so'm. Fix in **both** `lib/utils.js` and `api/checkout.js`; they duplicate the logic. | `src/lib/utils.js`, `api/checkout.js` |
| W3-15 | MGMT-01 | Add order cancel and reorder, or an order-detail route. None exist. | `src/pages/Orders.jsx` |
| W3-16 | MGMT-04 | Paginate the catalog and the order list — both fetch everything with `select('*')`. | `Catalog.jsx`, `Orders.jsx` |
| W3-17 | MGMT-03 | Make "book of the week" actually weekly, or rename the badge. | `src/pages/Discover.jsx` |
| W3-18 | BUILD-01 | Stop the repo-root `postcss.config.js` / `tailwind.config.ts` leaking into the miniapp build — add a local PostCSS config or scope the root one. | `booktopia-miniapp/` |
| W3-19 | ERR-10 | Version the localStorage cart schema so a stale shape from an old release cannot be trusted blind. | `src/context/CartContext.jsx` |

---

## Deferred until Step 5

Performance, bundle size, Lighthouse, responsive/dark-mode behaviour, dependency CVEs, and observability are **not** in the waves above. Step 5 measures them against a production build and will append its own items here.

One correction carried forward: the slow page loads seen during Steps 2–3 (catalog ~5 s, book detail ~12 s) are a `vite dev` transform artifact — the measured Supabase round trip was 409 ms. **Do not "fix" performance based on those numbers.** Step 5 re-measures against `vite build` + `vite preview`.

---

## Suggested execution order

1. **W0-1 → W0-4** — live exposures, and W0-4 gates W0-1.
2. **W1-1 → W1-5** — money, data integrity, and the crash paths.
3. **W2** — grouped by file to keep diffs small: cart items together, checkout-sheet items together, Discover together.
4. **W3** — cleanup, safe to batch.

Two dependencies worth respecting: **W2-2 depends on W1-2** (a stock ceiling is meaningless while `stock` is `null` on 17 of 18 books), and **W0-1 depends on W0-4** (scoped order reads need a verified user id).

**Total: 4 decisions + 5 P0 code fixes + 20 P1 + 19 P2.**

---

# Appended by Step 5 — production hardening (2026-08-30)

## Wave 0H — do these first, ahead of everything

| # | Fix | Risk | Verify |
|---|---|---|---|
| W0H-1 | **Rotate the Supabase `service_role` key — treat it as compromised.** It is committed in a **public** repo in three tracked files: `booktopia-miniapp/test-runner.js`, `booktopia-miniapp/docs/QA_STATE.md`, `docs/QA_STATE.md` (the last pushed today, `82cf3df`). Order: rotate in Supabase → update `SUPABASE_SERVICE_KEY` in Vercel → redeploy → delete the three files → revoke the old key. Purging git history is a separate decision; rotation is not optional either way. This supersedes W0-2. | **Critical.** Wrong ordering takes checkout and the Payme webhook down. | Old key rejected by Supabase; `git grep` finds no JWT in tracked files; checkout still succeeds. |
| W0H-2 | **Authenticate `api/update-order-status.js`.** No auth today, `CORS *`, service-key writes to `miniapp_orders`, and it sends Telegram messages to customers. Add an admin secret or signed session, and drop CORS to the admin origin. *(Repo-root API — outside the miniapp scope, but it mutates miniapp data.)* | Medium — the admin dashboard calls it and must be updated in the same change. | An unauthenticated POST returns 401. |
| W0H-3 | **Re-guard `api/broadcast.js`.** Its `Bearer ${SUPABASE_SERVICE_KEY}` check is worthless while that key is public. Move to a dedicated admin secret. *(Repo-root API, out of scope.)* | Medium. | Old credential rejected. |
| W0H-4 | **Add a privacy policy and terms to the miniapp.** It collects name, phone, address, and GPS with none linked. booktopia.uz already has both pages — link them from Profile and from the checkout sheet. Cheapest P0 in the set. | None. | Both reachable from the app. |

## Wave 1H — P1 hardening

| # | Fix | Files |
|---|---|---|
| W1H-1 | `npm audit fix` — 7 vulns, 5 high, incl. `react-router-dom` open redirect + route-matching DoS. Re-run flows #3/#7/#10 afterwards, since routing is touched. | `booktopia-miniapp/package.json` |
| W1H-2 | Code-split the 726 kB / 214 kB-gzip single chunk: `React.lazy` per route, lazy-load `framer-motion` and `canvas-confetti`. The main site already does this. | `src/App.jsx` |
| W1H-3 | Touch targets — 29 of 34 interactive elements are under 44×44 px (category pills are 31 px tall) on a phone-only product. | `src/index.css` |
| W1H-4 | Contrast — `.book-card__author` scores 2.38:1 against 4.5:1 required, on every catalog card. | `src/index.css` |
| ~~W1H-5~~ | **WITHDRAWN — the finding was wrong.** `@media (prefers-color-scheme: dark)` already exists at `src/index.css:94` with a full palette; the original grep ran in the wrong directory. Replaced by W3H-8. | — |
| W1H-6 | Add crash reporting (Sentry). With no ErrorBoundary and no reporting, a production crash is invisible. Pairs with W1-3. | `src/main.jsx` |
| W1H-7 | Add a user-facing data export / delete path; 83 orders of PII are retained with no route to remove them. | `src/pages/Profile.jsx` |
| W1H-8 | Select explicit columns instead of `select('*')`, and paginate catalog and orders. | `Catalog.jsx`, `Orders.jsx` |
| W1H-9 | Measure FCP on throttled 3G against the deployed URL — not measurable in this harness. 214 kB gzip is ~4–5 s on ~400 kbps. | — |
| W1H-10 | Re-run the scale test (1000 books, 1000 orders) against a **seeded staging** dataset, and endpoint concurrency against staging. Neither could be run here — production is the only deployment and it is backed by live payment credentials. | — |

## Wave 3H — P2 hardening

| # | Fix | Files |
|---|---|---|
| W3H-1 | Label the catalog search input (`<label>` or `aria-label`). | `Catalog.jsx` |
| W3H-2 | Structured server logging with request ids so an order can be traced end-to-end. | `api/*.js` |
| W3H-3 | Add analytics on key actions — nothing today would have surfaced the Click dead-end from data. | `src/` |
| W3H-4 | Even out the ragged catalog grid (one- vs two-line titles misalign rows). | `src/index.css` |
| W3H-5 | Explain why GPS is requested before prompting (and make it actually persist — W2-7). | `CheckoutSheet.jsx` |
| W3H-6 | Real-device pass on Safari/iOS — `dvh`, `env(safe-area-inset)`, drag gestures. Only Chromium was exercised. | — |
| W3H-7 | Remove the unused `src/assets/vite.svg` default asset. | `src/assets/` |

**Revised totals: 12 P0 · 27 P1 · 33 P2.**

| W3H-8 | Honour Telegram `themeParams` so a dark Telegram client renders dark even when the OS is light. Replaces the withdrawn W1H-5. | `src/App.jsx` |
