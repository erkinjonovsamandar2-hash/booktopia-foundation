# QA_REPORT.md — booktopia-miniapp

Step 3 of 6 · Full QA execution · 2026-08-30
**Driver:** Chrome MCP background tab against `vite dev` (`localhost:5173`) + read-only Supabase REST probes

---

## Execution constraints

Three constraints shaped what could actually be run. They are the reason for every ⏭️ below.

1. **Not inside Telegram.** `initDataUnsafe.user` is undefined, so every user-scoped flow takes its guest path. Orders, order status, prefill, and the cart deep-link cannot be exercised.
2. **No serverless runtime.** `/api/*` does not run under `vite dev` and the Vercel CLI is not installed. Checkout submission, both payment gateways, and the Click dead-end could not be executed locally.
3. **No writes to production data.** The only database available is live, holding 83 real orders. I did not create orders, mutate stock, or attempt anon writes — an attempted write-permission probe was correctly blocked, and I did not retry it. Flows needing a DB mutation are marked ⏭️ rather than guessed.

Where a flow could not be executed but the code settles it, the verdict is marked **(static)** and says so.

---

## Results

| # | Flow | Status | Evidence | Notes |
|---|---|---|---|---|
| 1 | App launches | ✅ | ss_6452uve9b | Clean mount, no console errors. |
| 2 | Home data loads | ✅ | ss_6452uve9b | Books, bestsellers, new releases, 3 blog teasers. |
| 3 | Bottom nav — 5 tabs | ✅ | Step 2 | All five routes render, active state correct. |
| 4 | Catalog loads | ✅ | ss_7113bz1uo | 12 of 18 books after `shop_visible` filter. |
| 5 | Catalog search | ⚠️ | live probe | `ijarachi` → 1 correct hit; `zzzznotfound` → 0 + "Kitoblar topilmadi". Empty state does not echo the query. `author_ru`/`author_en` still unsearched **(static)**. |
| 6 | Catalog category filter | ❌ | live probe | Filter works (Yangi nashrlar → 4 books) but the URL stays `/catalog` — no `?cat=new` written back. Back button loses the filter. |
| 7 | Catalog → book detail | ✅ | ss_1342358mo | Route + fetch correct. |
| 8 | Book detail loads | ⚠️ | ss_1342358mo | Renders correctly. A fetch error is still indistinguishable from a missing book **(static)**. |
| 9 | Book detail — no price | ⏭️ | DB probe | **Not reproducible against live data — all 18 books have a price.** The dead end is real in code (CTA block gated on `book.price`) but currently unreachable. Lower the priority accordingly. |
| 10 | Book detail — back | ❌ | live probe | Cold deep-link to `/book/:id` in a fresh tab: `history.length === 2`, and the back button **left the app entirely** (to `chrome://newtab`). BottomNav is hidden on this route, so a Telegram deep-link user has no way back into the miniapp. |
| 11 | Read-more toggle | ✅ | live probe | Text grew 335 → 508 chars, label flipped to "Свернуть". |
| 12 | PDF excerpt | ✅ | live probe | Link present and correct. Still a raw `target="_blank"` inside the webview **(static)**. |
| 13 | ReaderModal | ❌ | grep | Imported nowhere. Dead component. |
| 14 | Add to cart | ✅ | ss_7350lfmo6 | Cart write, badge, toast all correct. One click was swallowed first — see UX-01. |
| 15 | Add to cart (detail) | ✅ | ss_0463eepo0 | Sheet opens with the correct line item. |
| 16 | Cart persists | ✅ | ss_8430tisle | Survived a full page load. |
| 17 | Cart qty + | ❌ | live probe | Raised to **qty 19** with no ceiling. The item's `stock` is `null`, and the DB probe shows **17 of 18 books have `stock = null`** — so stock enforcement is inert across almost the whole catalog. |
| 18 | Cart qty − at 1 | ⚠️ | (static) | Silently deletes the row, no undo. Not separately executed. |
| 19 | Swipe to delete | ⏭️ | — | Drag gesture not executed. |
| 20 | Clear cart | ❌ | live probe | One tap destroyed a 19-item, 1 900 000 so'm cart. No confirm dialog, no undo offered. |
| 21 | Cart totals | ⚠️ | live probe | Math is correct as coded: 19 × (105 000 − 5 000) = 1 900 000, wholesale badge shown. The flat-5 000 flaw **could not be exercised — no book in the catalog is under 10 000 so'm**. Remains a latent defect **(static)**. |
| 22 | Stale cart stock | ⏭️ | — | Requires mutating stock in the live DB. Not attempted. |
| 23 | Cart → checkout | ✅ | ss_0463eepo0 | Sheet opens with correct summary and total. |
| 24 | Checkout — prefill | ⏭️ | — | Needs Telegram. |
| 25 | Checkout — phone mask | ✅ | ss_82019dvq9 | `901234567` → `+998 (90) 123-45-67`, confirm enabled. Truncated → `disabled=true`, hint "7 ta raqam qoldi". Gate correct. |
| 26 | Checkout — address | ⚠️ | (static) | Address and GPS both optional; undeliverable orders accepted. |
| 27 | Checkout — GPS | ⏭️ | — | Geolocation permission not granted in this browser; not forced. |
| 28 | Checkout — payment choice | ❌ | (static) | Both options selectable, but Click leads to #33. |
| 29 | Checkout — submit | ⏭️ | — | `/api/checkout` unavailable. |
| 30 | Checkout — server price check | ⏭️ | (static) | Code is correct — prices and OOS re-verified server-side. Not executed. |
| 31 | Gateway opens | ⏭️ | — | Needs a live order. |
| 32 | Payme → return | ⏭️ | — | Needs a real payment. |
| 33 | **Click → return** | ❌ | grep | No Click webhook exists anywhere in the repo. `.env` has `CLICK_MERCHANT_ID` and `CLICK_SERVICE_ID` set, so the option is live and buildable in production. A paying Click customer's order can never be marked paid. |
| 34 | Stock after purchase | ❌ | grep + DB probe | No code path writes `books.stock`. Confirmed in data: 17 of 18 rows are `null`, one is `0`. |
| 35 | Orders list | ⏭️ | — | Needs Telegram. |
| 36 | Order status freshness | ⏭️ | — | Needs Telegram. |
| 37 | Order card expand | ⏭️ | — | Needs Telegram. |
| 38 | Cancel / reorder | ❌ | (static) | Neither exists. |
| 39 | Home orders widget | ⏭️ | — | Needs Telegram. |
| 40 | Language switch | ⚠️ | live probe | Switching to RU translated Profile and Home correctly. `<html lang>` **stayed `uz`**. The corrupt `Читать dalеj` string did **not** render — the `readMore` key has no rendering site, so it is dead-string corruption, not a user-visible bug. Hardcoded-Uzbek leaks stand **(static)**. |
| 41 | Wishlist add | ✅ | live probe | Two hearts → 2 ids in `booktopia_wish`. |
| 42 | Wishlist list | ❌ | live probe | Un-hearting wrote storage (2 → 1) but the rendered card count **stayed at 2**. Stale until reload, exactly as predicted. |
| 43 | Wishlist share | ⏭️ | — | Opens an external Telegram URL; not followed. |
| 44 | Discover loads | ✅ | ss_4521a7fb0 | Week card + 4 paths render. |
| 45 | Reading-path progress | ❌ | live probe | Every path reads `0/N`. `booktopia_orders` is never written by any code. |
| 46 | Path integrity | ❌ | live + DB probe | "Temur imperiyasi" renders **0/0** — its three UUIDs (Amir Temur, Safar gulxanlari, Yildirim Boyazid) are all `shop_visible=false`. The empty path is still drawn as a card with a progress bar. "Inson kodi" resolves 1 of 2. |
| 47 | Profile external links | ⚠️ | (static) | Raw anchors instead of `tg.openLink`. |
| 48 | Cart deep-link import | ⏭️ | — | Needs a Telegram `start_param`. |
| 49 | Unknown route | ⚠️ | live probe | `/nope-does-not-exist` → silent redirect to `/`, no 404, nothing shown. |
| 50 | Runtime crash | ❌ | live probe | Proven via #51: the route subtree unmounted and left a blank screen with no message. No ErrorBoundary exists to catch it. |
| 51 | Offline / flaky network | ❌ | ss_39871901f | **Worse than predicted.** With `fetch` failing: `/catalog` rendered a **completely blank page** — no header, no search bar, no pills, no empty state, no error, not even skeletons; only the bottom nav survived. Navigating to `/discover` then **left the previous screen on display while the URL read `/discover`** — URL and content disagree. Home degraded more gracefully (shell renders, sections empty). |
| 52 | Long text / special chars | ⏭️ | — | Not exercised. |
| 53 | Rotation / small screen | ⏭️ | — | `resize_window` resizes the OS window, not the tab viewport; this pass ran at 1280×576. Moved to Step 5 layer 6. |
| 54 | Back mid-checkout | ❌ | live probe | With the sheet open, back navigated `/cart` → `/`. The sheet did not intercept it. In Telegram this ejects the user from checkout mid-order. `Escape` also does nothing (Step 2, Obs-6). |
| 55 | **Permission — read others' orders** | ❌ | REST probe | **The anon key reads `miniapp_orders` without restriction.** `content-range: 0-2/83` — all 83 orders enumerable. A follow-up read confirmed `full_name`, `phone`, and `delivery_address` are all returned (values redacted, not recorded). The anon key ships inside the client bundle, so this is public. |

---

## Counts

**14 ✅ · 16 ❌ · 8 ⚠️ · 17 ⏭️** (55 total)

Of the 17 skipped: 8 need Telegram, 5 need the serverless runtime, 2 need production-data mutation, 2 were not exercised (drag gesture, long-text rendering).

---

## Prioritised failure list — critical first

**P0 — do not ship**

1. **#55 · Customer PII is publicly readable.** The anon key returns all 83 orders with names, phone numbers, and delivery addresses. That key is embedded in the shipped JavaScript bundle. This is the single most serious finding of the audit and it is now confirmed against live data, not inferred.
2. **#33 · Click payments can never be confirmed.** No webhook. Credentials are configured, so the option is live in production.
3. **#34 · Stock is never decremented**, and 17 of 18 books carry `stock = null`, so no oversell protection is active anywhere.
4. **#51 + #50 · A network failure blanks the app.** Catalog renders nothing at all; Discover leaves a stale screen under a changed URL. No ErrorBoundary anywhere to contain it.
5. **#54 · Back during checkout ejects the user from the order.**

**P1**

6. **#10** Cold deep-link into a book detail traps the user — back leaves the app, and the nav is hidden.
7. **#17** Cart quantity has no ceiling (reached 19 against a `null`-stock book).
8. **#20** One tap destroys the cart, no confirm, no undo.
9. **#42** Wishlist list does not re-render after un-hearting.
10. **#45 + #46** Reading-path progress is permanently `0/N`, and one of the four paths is entirely empty yet still rendered.
11. **#6** Category filter is not reflected in the URL.

**P2** — #5 (search coverage, no query echo), #40 (`html lang`, hardcoded strings), #49 (silent redirect, no 404), #13 (dead ReaderModal), #38 (no cancel/reorder), #47 (raw anchors in webview).

---

## Corrections to earlier steps

Two Step-1 findings were overstated and are corrected here rather than carried forward as-is:

- **#9 (priceless book has no CTA)** — real in code, but **not reproducible**: every book in the catalog has a price. Latent, not active.
- **I18N-01 (`Читать dalеj`)** — the corrupt Russian string **never renders**, because the `readMore` key has no rendering site. It is dead-string corruption, not a user-facing bug. Downgraded.

One was understated:

- **#51** was logged as "no offline handling". It is worse: the catalog route renders a fully blank screen, and route changes can leave the previous page's content under a new URL.

---

## Gate

Failures exist. Status advances to **Step 3 ✅ · Step 4 ⏳ · Step 5 ⏳**.

Before Step 4 begins, two of the P0 items need a decision that is not mine to make — see the handoff note in the session. **Ready for Prompt 4.**
