# QA_BACKLOG.md — carry-forward fix register

Standing register for **booktopia-miniapp**. Items here were found by inspection (Step 0 detection, Step 1 flow audit), not by a failing test, so nothing in the 6-step pipeline would otherwise pick them up. Step 4 fixes test failures; Step 5 fixes hardening layers. **These are the third bucket — fix them alongside Step 4.**

Nothing is fixed in this file. It is a list. Status is updated as items are resolved.

Legend — **P0** must fix before launch · **P1** fix in week 1 · **P2** backlog.
Source column points at the flow number in `QA_FLOWS.md` Table C, or the section of `QA_PLAN.md`.

---

## Security (found in Step 0 detection)

| ID | Severity | Item | Source | Status |
|---|---|---|---|---|
| SEC-01 | **P0** | `booktopia-miniapp/test-runner.js` is git-tracked and hardcodes a live Supabase **`service_role`** JWT (exp 2087). Bypasses RLS entirely. Rotate the key, remove the file from the working tree; history rewrite is a separate decision. | QA_PLAN pre-flagged | open |
| SEC-02 | P1 | Root `.env` is git-tracked. Root `.gitignore` does not cover `.env` (the miniapp `.gitignore` does). | QA_PLAN pre-flagged | open |
| SEC-03 | **P0** | `initData` is never HMAC-verified. `api/checkout.js` reads `telegram_user_id` from the request body and trusts it — order attribution and order-history scoping both rest on a client-supplied value. | #55 | open |
| SEC-04 | **P0** | **CONFIRMED 2026-08-30.** The anon key reads `miniapp_orders` with no restriction — `content-range: 0-2/83`, all 83 orders enumerable, with `full_name`, `phone`, and `delivery_address` all returned. The anon key ships in the client bundle, so this is public. RLS on `miniapp_orders` is absent or ineffective. | #55 | CONFIRMED — open |

## Money and inventory

| ID | Severity | Item | Source | Status |
|---|---|---|---|---|
| BIZ-01 | **P0** | **No Click webhook exists.** `api/` holds only `checkout.js` and `payme.js`. A Click order inserts as `unpaid` and nothing can flip it to `paid`. `/payment-return` polls 60 s, gives up, cart never clears. `CLICK_MERCHANT_ID` and `CLICK_SERVICE_ID` are set in `.env`, so Click URLs build and the option is live in the UI. | #33 | open |
| BIZ-02 | **P0** | **Stock is never decremented.** Every `update()` in `api/` targets `miniapp_orders`; nothing writes `books.stock`. Oversell is unbounded. | #34 | open |
| BIZ-03 | **P0** | Wholesale rule subtracts a flat 5 000 so'm at qty≥10 **for any price** — a 3 000 so'm book floors to 0. The banner advertising it only renders at price≥10 000, so rule and advertisement disagree. Present in both `lib/utils.js` and `api/checkout.js`. | #21 | open |
| BIZ-04 | P1 | `lat`/`lng` are captured by CheckoutSheet, destructured by `api/checkout.js`, and **omitted from the insert**. GPS is silently discarded. | #27 | open |
| BIZ-05 | P1 | Cart snapshots `stock` and `price` at add-time into localStorage and never re-validates against the DB. A book that sells out or is repriced shows stale data until checkout rejects it. | #22 | open |
| BIZ-06 | P1 | `incrementQty` has no stock ceiling — cart qty can exceed available stock. | #17 | open |
| BIZ-07 | P1 | No idempotency key on `POST /api/checkout`. Double-submit is guarded only by the in-flight flag. | #29 | open |
| BIZ-08 | P1 | An order can be created with **no address and no GPS** — both fields are optional. Undeliverable orders are accepted. | #26 | open |

## Features built but unreachable or inert

| ID | Severity | Item | Source | Status |
|---|---|---|---|---|
| DEAD-01 | P1 | `ReaderModal.jsx` is imported nowhere. Hardcoded 3-page Uzbek lorem, identical for every book. Either wire it to real excerpt content or delete it. | #13 | open |
| DEAD-02 | P1 | The Coming-Soon / notify-me feature is computed and never rendered — `comingSoon`, `handleNotify`, and the `soonTitle`/`notify` strings are all dead. `handleNotify` writes localStorage only; no backend would ever send the notification. | Table B | open |
| DEAD-03 | P1 | Reading-path progress reads `localStorage.booktopia_orders`, a key **nothing in the codebase writes**. Every path shows `0/N` permanently; "✅ Tugatildi" is unreachable. | #45 | open |
| DEAD-04 | P2 | Home defines `trustOrders` / `trustOfficial` / `trustDelivery` / `collapse` / `readMore` strings with no rendering site. Duplicate `6. CATALOG CTA` / `7. CATALOG CTA` section comments. | Home.jsx | open |

## Dead ends and broken journeys

| ID | Severity | Item | Source | Status |
|---|---|---|---|---|
| NAV-01 | P2 | A priceless book has **no call to action at all** — the fixed CTA block is gated on `book.price`, so "Narxi so'rash" is shown with no way to ask. | #9 | open |
| NAV-02 | P1 | `/book/:id` back button is `navigate(-1)` and BottomNav is hidden on that route. A deep-linked entry has no history — the user is stranded. | #10 | open |
| NAV-03 | P1 | The checkout sheet is not a history entry. Hardware / Telegram back exits the page instead of closing the sheet. | #54 | open |
| NAV-04 | P1 | Cart deep-link import **overwrites** an existing cart instead of merging, with no notice. Router is bypassed via `replaceState` + a synthetic `PopStateEvent`. | #48 | open |
| NAV-05 | P2 | Wishlist share sends a link to the **bot**, not to the book. Bot username is hardcoded and disagrees with Profile's contact link (`Booktopiapress_bot` vs `booktopia_uz`). | #43 | open |
| NAV-06 | P2 | Unknown routes silently redirect to `/` with no 404 — a mistyped deep link looks like a normal launch. | #49 | open |

## State sync

| ID | Severity | Item | Source | Status |
|---|---|---|---|---|
| SYNC-01 | P1 | Order status never refreshes — no polling, no realtime. Stale until the route remounts. Affects `/orders` and the Home widget. | #36, #39 | open |
| SYNC-02 | P1 | `WishBtn` holds per-instance state initialised once from localStorage. Un-hearting on `/wishlist` does not remove the card until reload; the same book in two places drifts. | #42 | open |
| SYNC-03 | P2 | Catalog reads `?cat=` once at mount and never writes it back — the back button loses the filter. | #6 | open |
| SYNC-04 | P2 | `trackView` is called only from Bestsellers and Recently-Viewed. New Releases passes bare `navigate`, so views from that strip are never recorded. Nothing is recorded from Catalog, Discover, or Wishlist. | Table B | open |
| SYNC-05 | P2 | `checkStatus` depends on `clearCart`, whose identity changes on every CartProvider render — the polling effect may re-run and stack. Verify in Step 3. | #32 | open |

## Error handling and feedback

| ID | Severity | Item | Source | Status |
|---|---|---|---|---|
| ERR-01 | **P0** | **No ErrorBoundary anywhere.** A single render throw blanks the whole miniapp. | #50 | open |
| ERR-02 | **P0** | **No offline handling.** No detection, no retry, no service worker. Skeletons resolve into empty sections indistinguishable from "no results". | #51 | open |
| ERR-03 | P1 | Every Supabase fetch error is swallowed into an empty state — "no books found", "no orders", empty Discover. There is no error state anywhere in the app. | #2, #4, #8, #35, #44 | open |
| ERR-04 | P1 | `clearCart` is a one-tap destructive action with no confirm and no undo. Qty − at 1 silently deletes the row. | #18, #20 | open |
| ERR-05 | P1 | The toast is single-slot and success-only — hardcoded green `CheckCircle`, so it cannot express an error. Not announced to screen readers. | Table B | open |
| ERR-06 | P1 | GPS denial gives a haptic and no message; an unsupported browser is a silent no-op. | #27 | open |
| ERR-07 | P2 | A revealed swipe-to-delete row has no way to close except dragging back. | #19 | open |
| ERR-08 | P2 | The `window.open` fallback when `tg.openLink` is absent may be popup-blocked, unhandled. | #31 | open |

## i18n

| ID | Severity | Item | Source | Status |
|---|---|---|---|---|
| I18N-01 | P2 | **Corrupt Russian string** — `readMore` is `'Читать dalеj'` in `Home.jsx`. | #40 | open |
| I18N-02 | P1 | Ten strings bypass the `T` maps and are hardcoded Uzbek or English: `← swipe`, `Ulgurji narx`, `Zaxirada tugagan`, `Yuborilmoqda...`, `N ta raqam qoldi`, `▴ Yopish`, `✅ Tugatildi`, `TUGAGAN`, `O'qish`, and all of `ReaderModal`. | #40 | open |
| I18N-03 | P2 | `<html lang="uz">` is never updated when the language changes. | #40 | open |
| I18N-04 | P2 | Catalog search never matches `author_ru` / `author_en`. | #5 | open |

## Missing management actions

| ID | Severity | Item | Source | Status |
|---|---|---|---|---|
| MGMT-01 | P1 | No user-side order cancel, no reorder, no order-detail route, no receipt. | #38 | open |
| MGMT-02 | P1 | Reading paths are four hardcoded UUID arrays in `Discover.jsx`. A hidden or deleted book silently shrinks a path. No admin control. | #46 | open |
| MGMT-03 | P2 | "Book of the week" is not weekly — it is `featured` sorted by `created_at desc`, take first, shown beside a computed ISO week number. | Table B | open |
| MGMT-04 | P2 | No pagination anywhere. Catalog fetches every book with `select('*')` and filters client-side; `/orders` fetches all orders. | #4, #35 | open |

## Added during Step 2 (smoke gate, 2026-08-30)

| ID | Severity | Item | Source | Status |
|---|---|---|---|---|
| A11Y-01 | P1 | The app is unreachable by keyboard or screen reader. The five bottom-nav links expose **no accessible name** (icon + styled span). Book cards are plain `div`s with `onClick`, so the accessibility tree contains no interactive element for any book. | Obs-5 | open |
| A11Y-02 | P1 | The checkout sheet is not a dialog — no `role="dialog"`, no focus trap, no `inert` on the page behind it. `Escape` does not close it (verified). Every control behind the sheet stays focusable. | Obs-6 | open |
| UX-01 | P1 | An add-to-cart click was silently swallowed while book covers were still decoding; an identical click moments later worked. Layout shift is the leading hypothesis. Reproduce deliberately in Step 3. | Obs-2 | open |
| UX-02 | P1 | The Discover hero ("HAFTA TANLOVI") promotes *Ultrabilim*, which is out of stock, showing its price and "Ko'proq →" with no OOS treatment. The catalog marks the same book TUGAGAN. | Obs-4 | open |
| BUILD-01 | P2 | The repo-root `postcss.config.js` + `tailwind.config.ts` leak into the miniapp build — `vite dev` warns that Tailwind's `content` option is empty, though the miniapp has no Tailwind dependency and uses plain CSS. | Obs-7 | open |

**MGMT-02 upgraded P2 → P1.** Confirmed against live data, not theoretical: "Temur imperiyasi" renders **0/0** (all three hardcoded UUIDs resolve to nothing) and "Inson kodi" renders 0/1 of 2. Two of the four reading paths are broken right now, and an empty path is still drawn as a card.

**Not a finding:** perceived slowness during smoke (catalog ~5 s, book detail ~12 s) is a `vite dev` transform artifact. Measured Supabase round trip through the `/_sb` proxy was 409 ms. Step 5 re-measures against a production build.

## Added / revised during Step 3 (full execution, 2026-08-30)

| ID | Severity | Item | Source | Status |
|---|---|---|---|---|
| ERR-09 | **P0** | Under network failure the `/catalog` route renders a **completely blank screen** — no header, search, pills, empty state, error, or skeletons; only the bottom nav survives. Navigating onward to `/discover` leaves the previous screen displayed under the new URL. Confirms ERR-01 + ERR-02 with a reproduction. | #50, #51 | open |
| UX-03 | P2 | The Home hero CTA is labelled with the `seeAll` string ("Barchasini ko'rish →" / "Смотреть все →") on a button that opens the catalog. Wrong copy for a hero action, visible in all three languages. | #2 | open |

**Revisions to earlier entries**

- **SEC-04 → CONFIRMED.** No longer "needs inspection". 83 orders, PII included, readable with the public anon key.
- **BIZ-02 severity reinforced.** DB probe: 17 of 18 books have `stock = null`, one has `0`. Stock enforcement is inert across essentially the whole catalog, so the missing decrement has no backstop.
- **MGMT-02 mechanism identified.** "Temur imperiyasi" is 0/0 because all three hardcoded UUIDs (Amir Temur, Safar gulxanlari, Yildirim Boyazid) are `shop_visible = false`.
- **NAV-01 downgraded P0 → P2.** Not reproducible: all 18 books have a price, so the priceless-book dead end is latent, not active.
- **I18N-01 downgraded P1 → P2.** The corrupt `Читать dalеj` string never renders — `readMore` has no rendering site. Dead-string corruption, not a user-facing bug.
- **BIZ-03 remains unverified live.** No book in the catalog is priced under 10 000 so'm, so the flat-5 000 floor-to-zero flaw could not be exercised. Latent.
