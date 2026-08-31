# QA_FLOWS.md — booktopia-miniapp

Step 1 of 6 · Product-logic completeness audit · static (no build, no run)
Source: `booktopia-miniapp/` @ commit 82cf3df

---

## TABLE A — Platform Map

| Area | Screen/Route | Entity | Main user actions | Related screens | Risk |
|---|---|---|---|---|---|
| Shell | `App.jsx` (BrowserRouter) | — | Route, payment-return interception, mount Telegram SDK | all | P0 |
| Nav | `BottomNav` (5 tabs) | — | Switch Home/Catalog/Cart/Discover/Profile; cart badge | all | P0 |
| Home | `/` | Book, Order, Article | Browse hero, my-orders widget, recently viewed, bestsellers, new releases, blog teasers, add-to-cart | Catalog, BookDetail, Orders | P0 |
| Catalog | `/catalog` (`?cat=`) | Book | Search, filter by 6 categories, open book, quick add-to-cart, wishlist toggle | BookDetail, Cart | P0 |
| Book detail | `/book/:id` | Book | Read description, expand/collapse, open PDF excerpt, add to cart, open checkout | Cart, CheckoutSheet | P0 |
| Cart | `/cart` | CartItem | Qty +/-, swipe-to-delete, clear all, checkout, go to catalog | CheckoutSheet, Catalog | P0 |
| Checkout | `CheckoutSheet` (overlay on `/book/:id` and `/cart`) | Order | Enter name/phone/address, GPS capture, pick Payme/Click, submit | PaymentReturn, Orders | P0 |
| Payment return | `/payment-return?order_id=` | Order, Payment | Poll payment status 60 s, confetti on paid, go to orders | Orders | P0 |
| Orders | `/orders` | Order | List own orders, expand card, view status stepper | Home widget | P1 |
| Wishlist | `/wishlist` | Wishlist | View saved books, share to Telegram, open book | BookDetail | P2 |
| Discover | `/discover` | ReadingPath, Book | View book of the week, expand 4 reading paths, open book | BookDetail | P2 |
| Profile | `/profile` | User, Language | Switch uz/ru/en, open Orders/Wishlist/Cart, open external links | Orders, Wishlist, Cart | P1 |
| API | `POST /api/checkout` | Order | Server-side price/stock verification, order insert, gateway URL build | — | P0 |
| API | `POST /api/payme` | Payment | Payme Merchant API (Check/Create/Perform/Cancel/CheckTransaction), admin Telegram notify | — | P0 |
| Data | Supabase `books` | Book | Read (anon, via `/_sb` proxy) | all | P0 |
| Data | Supabase `miniapp_orders` | Order | Read (anon, client) / write (service_role, server) | Orders, Home, PaymentReturn | P0 |
| Data | Supabase `blog_posts` | Article | Read (anon) | Home | P2 |
| Data | `localStorage` | Cart, Wishlist, Recent, Notify, Lang | Read/write, no expiry, no schema version | all | P1 |
| Orphan | `ReaderModal.jsx` | — | none — component is never imported | — | P2 |

---

## TABLE B — Entity Lifecycle Matrix

Cells: ✅ exists · ❌ missing · ⚠️ partial

| Entity | Create | Read/List | Edit | Delete/Archive/Disable | Manage/Configure | Missing logic | Priority |
|---|---|---|---|---|---|---|---|
| **Book** | ❌ (admin lives on the main site) | ✅ Home/Catalog/Detail/Discover | ❌ | ⚠️ `shop_visible=false` hides it | ❌ | Miniapp is read-only on books — fine by design. But **`stock` is never decremented** by any code path (`api/` only ever updates `miniapp_orders`), so stock is manual-only and oversell is unbounded. | **P0** |
| **CartItem** | ✅ `addItem` | ✅ `/cart` | ⚠️ qty +/- only | ✅ swipe + `removeItem`, `clearCart` | ⚠️ | `incrementQty` has **no stock ceiling** — qty can exceed available stock. `clearCart` is a **one-tap destructive action with no confirm and no undo**. Cart snapshots `stock`/`price` at add-time into localStorage and **never re-validates against the DB** on mount, so a book that sells out or is repriced after being added shows stale data until checkout rejects it. | **P0** |
| **Cart (deep-link import)** | ✅ `cart_<id>x<qty>` startapp param | — | ❌ | ❌ | ❌ | Import **replaces** the whole cart via `setItems(newItems)` instead of merging — silently destroys an existing cart. Navigation after import uses `history.replaceState` plus a synthetic `PopStateEvent` rather than the router; brittle. No feedback when a book in the link is missing or out of stock. | P1 |
| **Wishlist** | ✅ heart on BookCard | ✅ `/wishlist` | — | ⚠️ un-heart writes localStorage | ❌ | `WishBtn` holds **per-instance local state** initialised once from localStorage. Un-hearting on `/wishlist` updates storage but **does not remove the card from the list** until reload; the same book rendered twice will not stay in sync. Wishlist is device-local, never synced to the account. | P1 |
| **Order** | ✅ `POST /api/checkout` | ✅ `/orders` + Home widget | ❌ | ❌ no user-side cancel | ⚠️ status changed only by an admin via the bot | No **cancel**, no **reorder**, no order-detail route, no receipt. The list does not refresh or poll — status is whatever it was at mount. `lat`/`lng` are accepted by the API and **never written into the insert**, so GPS the user captured is silently discarded. | **P0** |
| **Payment (Payme)** | ✅ URL built server-side | ✅ polled on `/payment-return` | — | ✅ Cancel via webhook | ✅ full Merchant API | Reasonably complete. | P1 |
| **Payment (Click)** | ⚠️ URL built | ❌ never confirmed | — | ❌ | ❌ | **There is no Click webhook.** `api/` contains only `checkout.js` and `payme.js`. A Click order is inserted as `unpaid` and nothing can ever flip it to `paid` — `/payment-return` polls for 60 s, gives up, and the **cart is never cleared**. Click is offered as a first-class payment option in the UI. | **P0** |
| **Notify-me ("Tez kunda")** | ⚠️ writes `booktopia_notified` | ❌ | ❌ | ❌ | ❌ | `handleNotify` is **defined and never called**; the whole Coming-Soon section (`comingSoon`, `soonTitle`, `notify` strings) is computed but **never rendered**. Nothing is sent to any backend, so even if it were wired it would notify nobody. | P1 |
| **Reading path** | ❌ 4 paths hardcoded as UUID arrays in `Discover.jsx` | ✅ | ❌ | ❌ | ❌ | Progress reads `localStorage.booktopia_orders`, a key **nothing in the codebase ever writes**. `readCount` is therefore permanently `0/N` for every user; "✅ Tugatildi" is unreachable. Hardcoded UUIDs break silently if a book is hidden or deleted. | P1 |
| **Recently viewed** | ⚠️ `trackView` | ✅ Home strip | — | ❌ no clear | ❌ | Only Bestsellers and Recently-Viewed call `trackView`; **New Releases passes bare `navigate`**, so views from that strip are never recorded. Nothing is recorded from Catalog, Discover, or Wishlist either. | P2 |
| **Book of the week** | ❌ | ✅ Discover | ❌ | ❌ | ❌ | Not weekly — it is `featured` books sorted by `created_at desc`, take first. The "HAFTA TANLOVI · N-HAFTA" badge shows a computed ISO week next to a book that only changes when a new featured book is added. | P2 |
| **Language** | ✅ | ✅ | ✅ Profile switcher | — | ⚠️ | Persisted to localStorage, but `<html lang="uz">` is never updated. Several strings bypass the `T` maps and are hardcoded Uzbek (Table C #40). The `readMore` RU value is corrupt: `Читать dalеj`. | P1 |
| **User / session** | ❌ | ✅ read from `initDataUnsafe` | ❌ | ❌ | ❌ | No auth. `telegram_user_id` is **sent by the client and trusted by the server** — `initData` is never HMAC-verified. Orders are read client-side with the anon key, filtered by `telegram_user_id`. Outside Telegram the app degrades to a guest with no order history. | **P0** |
| **Article** | ❌ | ✅ Home teasers | ❌ | ❌ | ❌ | Read-only teasers opening booktopia.uz externally. Acceptable. | P2 |
| **Toast** | ✅ | ✅ | — | ⚠️ auto-dismiss 3.5 s | ❌ | Single-slot (a second toast replaces the first) and **success-only** — hardcoded green `CheckCircle`, so it cannot express an error. Not announced to screen readers. | P2 |

**"If this exists, what else must exist?" — unresolved chains**

- Order created → ❌ not cancellable · ❌ not reorderable · ❌ no detail view · ❌ list never refreshes.
- Payment method offered → ❌ Click has no confirmation path at all.
- Stock exists and is enforced at add-time and at checkout → ❌ never decremented on purchase.
- GPS captured → ❌ dropped by the server, never reaches the order.
- Permission implied (`telegram_user_id` scoping) → ❌ not enforced server-side; `initData` unverified.
- Wishlist toggled → ❌ list does not re-render · ❌ no account sync.
- Notify-me built → ❌ never rendered · ❌ no backend.
- Reading progress shown → ❌ its data source is never populated.
- Dashboard counts (Home orders widget, nav cart badge) → ⚠️ orders widget stale after a status change; cart badge is correct.

---

## TABLE C — Flow Inventory

Gap types: **A** missing management action · **B** incomplete CRUD · **C** broken journey / dead end · **D** missing state sync · **E** missing relationship handling · **F** missing permission logic · **G** missing automation control · **H** missing feedback / error handling · **I** UI looks interactive but isn't · **J** missing audit / history

| # | Flow | Trigger | Steps | Expected result | Edge cases | Gap | Critical? | Smoke? |
|---|---|---|---|---|---|---|---|---|
| 1 | App launches | Open miniapp | Telegram SDK `ready()`+`expand()`, mount Home | Home renders, no crash, no blank | SDK absent (plain browser); slow network | — | YES | **YES** |
| 2 | Home data loads | Mount `/` | Parallel fetch books + blog_posts + orders | Sections populate, skeletons resolve | Supabase down → `catch` logs, sections silently vanish, no error UI | H | YES | **YES** |
| 3 | Bottom nav — 5 tabs | Tap each tab | Route change | Each route renders | Rapid tab spam; active state on `/book/*` | — | YES | **YES** |
| 4 | Catalog loads | Tap Catalog | Fetch all books, filter `shop_visible` | Grid + count | Fetch error shows "no books found", not an error state | H | YES | **YES** |
| 5 | Catalog search | Type query | Client-side filter | Matching books | Searches `title`, `title_<lang>`, `author` only — **`author_ru`/`author_en` are never searched**; no debounce; no "0 results for X" echo | H | no | no |
| 6 | Catalog category filter | Tap a pill | Set category | Filtered grid | `?cat=` is read once at mount and **never written back** — the back button loses the filter; an unknown `?cat=` silently shows nothing | D | no | no |
| 7 | Catalog → book detail | Tap a card | Navigate `/book/:id` | Detail renders | Slug-with-UUID handled; a bare non-UUID gives a Supabase 400 that is swallowed into "not found" | — | YES | **YES** |
| 8 | Book detail loads | Open `/book/:id` | Fetch by id | Cover, price, description | `shop_visible=false` → "not found"; a fetch error is indistinguishable from a missing book | H | YES | no |
| 9 | Book detail — no price | Open a priceless book | Render | Some way to enquire | Shows "Narxi so'rash" but the **fixed CTA block is gated on `book.price`** — there is no button at all. Dead end. | C, I | YES | no |
| 10 | Book detail — back | Tap ← | `navigate(-1)` | Previous screen | A deep-linked entry has **no history**, and BottomNav is hidden on `/book/*` → the user is stranded | C | YES | no |
| 11 | Read-more toggle | Tap | Expand description | Full text | `.slice(0,200)` can cut mid-word | — | no | no |
| 12 | PDF excerpt | Tap | Open `excerpt_url` | PDF opens | Plain `<a target="_blank">` inside the Telegram webview instead of `tg.openLink`; a dead URL is unhandled | H | no | no |
| 13 | ReaderModal | — | — | — | **Component exists and is imported nowhere.** Hardcoded 3-page Uzbek lorem, identical for every book. Dead feature. | I | no | no |
| 14 | Add to cart (card) | Tap 🛒 | `addItem` + toast + haptic | Badge +1, toast | Blocked when OOS; **no stock ceiling on repeat taps** | B | YES | **YES** |
| 15 | Add to cart (detail) | Tap Buy | `addItem`, then open the sheet | Sheet opens | Already-in-cart path skips the add; qty stays 1 | — | YES | no |
| 16 | Cart persists | Add, kill, relaunch | Read localStorage | Items restored | **No schema version** — an old cart shape from a prior release is trusted as-is | — | YES | **YES** |
| 17 | Cart qty + | Tap + | `incrementQty` | qty+1 | **Unbounded — can exceed stock** | B | YES | no |
| 18 | Cart qty − at 1 | Tap − | Removes the row | Row gone | Silent deletion, **no undo, no confirm** | H | no | no |
| 19 | Swipe to delete | Drag left >70 px | Reveal the red zone | Delete button | A revealed row has **no way to close except dragging back**; the hint reads a hardcoded English "← swipe" | H | no | no |
| 20 | Clear cart | Tap "Tozalash" | `clearCart()` | Cart empty | **No confirmation, no undo** — one tap destroys the cart | H | YES | no |
| 21 | Cart totals | Change qty | Recompute | Correct sum | The wholesale rule subtracts a flat 5 000 at qty≥10 **for any price** — a 3 000 so'm book floors to 0; the offer banner only appears at price≥10 000, so the rule and its advertisement disagree | E | YES | no |
| 22 | Stale cart stock | Book sells out after it was added | — | Cart should re-validate | **Never re-fetched.** The row keeps its add-time `stock`; the OOS banner only fires on that stale snapshot | D | YES | no |
| 23 | Cart → checkout | Tap Buyurtma berish | Open the sheet | Sheet opens | Disabled when a stale-OOS item is present | — | YES | **YES** |
| 24 | Checkout — prefill | Sheet opens | Read `initDataUnsafe.user` | Name prefilled | Empty outside Telegram | — | no | no |
| 25 | Checkout — phone mask | Type digits | Mask to +998 (XX) XXX-XX-XX | Formatted | Submit gated at exactly 9 digits; **no operator-prefix validation**; a pasted full international number is silently truncated; the "N ta raqam qoldi" hint is **hardcoded Uzbek** | H | YES | **YES** |
| 26 | Checkout — address | Type or skip | Optional field | Order accepted | **Address and GPS are both optional** — an order can be created with no deliverable address at all | B | YES | no |
| 27 | Checkout — GPS | Tap 📍 | `getCurrentPosition` | Coords into address | Denial gives a haptic and **no message**; unsupported is a **silent no-op**; and the captured `lat`/`lng` are **dropped by the server** | H, E | YES | no |
| 28 | Checkout — payment choice | Tap Payme / Click | Select | Selected | **Click leads to a dead end (#33)** | C | YES | no |
| 29 | Checkout — submit | Tap confirm | `POST /api/checkout` | `order_id` + gateway URL | 4xx/5xx collapses to one generic message; **no retry**; double-submit is guarded only by the in-flight flag, **no idempotency key** | H | YES | no |
| 30 | Checkout — server price check | Submit | Server re-reads price and stock | Client prices ignored | Correct — prices and OOS are re-verified server-side | — | YES | no |
| 31 | Gateway opens | After a 200 | `tg.openLink(url)` | Payme page | The `window.open` fallback may be popup-blocked, **unhandled** | H | YES | no |
| 32 | Payme → return | Complete payment | Redirect `?payment=success&order_id=` → `/payment-return` | Poll → paid → confetti, cart cleared | The poll window is 60 s; "Check again" runs **one** manual check and does **not restart polling**; `checkStatus` depends on `clearCart`, whose identity changes on every CartProvider render — risk of the interval effect re-running | H | YES | no |
| 33 | **Click → return** | Complete a Click payment | — | Order marked paid | **No Click webhook exists.** The order stays `unpaid` forever, polling times out, the cart is never cleared — and the customer has paid | C | YES | no |
| 34 | Stock after purchase | Order paid | Decrement stock | Stock reflects the sale | **No code path decrements stock.** Unlimited oversell of a finite book | D, G | YES | no |
| 35 | Orders list | Open `/orders` | Fetch by `telegram_user_id` | Own orders | Outside Telegram the "open via Telegram" state is correct; a **fetch error renders as "no orders"**; no pagination; no pull-to-refresh | H | YES | no |
| 36 | Order status freshness | Admin approves | — | Status updates | **No polling, no realtime** — stale until the route remounts | D | YES | no |
| 37 | Order card expand | Tap | Toggle | Items + total | The toggle label `▴ Yopish` is **hardcoded Uzbek** | — | no | no |
| 38 | Cancel / reorder | — | — | — | **Neither exists.** No user-side cancel, no reorder, no receipt, no detail route | A | no | no |
| 39 | Home orders widget | User has orders | Show the latest 2 | Mini cards | Same staleness as #36; taps route to the list, not to that order | D | no | no |
| 40 | Language switch | Profile → O'z / Рус / Eng | Set context + localStorage | UI re-renders | `<html lang>` is never updated. Hardcoded-Uzbek leaks: `← swipe`, `Ulgurji narx`, `Zaxirada tugagan`, `Yuborilmoqda...`, `N ta raqam qoldi`, `▴ Yopish`, `✅ Tugatildi`, `TUGAGAN`, `O'qish`, `Yopish` (ReaderModal). **The `readMore` RU value is corrupt: `Читать dalеj`** | H | YES | no |
| 41 | Wishlist add | Tap the heart | Write localStorage | Heart fills | Optimistic; a storage failure is swallowed by an empty `catch` | H | no | no |
| 42 | Wishlist list | Open `/wishlist` | Fetch by ids | Saved books | **Un-hearting does not remove the card** until reload | D | no | no |
| 43 | Wishlist share | Tap Ulashish | Open t.me/share | Share sheet | Shares a link to the **bot**, not to the book — the recipient cannot reach it. The bot username is hardcoded and **disagrees with Profile's contact link** (`Booktopiapress_bot` vs `booktopia_uz`) | C | no | no |
| 44 | Discover loads | Tap Kashfiyot | Fetch week book + path books | Card + 4 paths | A fetch error renders as silently empty | H | no | **YES** |
| 45 | Reading-path progress | Expand a path | Compare against purchases | X/N read | **Always 0/N** — `booktopia_orders` is read but never written by any code | I, D | no | no |
| 46 | Path integrity | — | Hardcoded UUIDs | 3–6 books | A hidden or deleted book silently shrinks the path with no notice | E | no | no |
| 47 | Profile external links | Tap Veb-sayt / Contact / About | `<a target="_blank">` | Opens | A raw anchor inside the Telegram webview instead of `tg.openLink` | H | no | no |
| 48 | Cart deep-link import | Open with `startapp=cart_...` | Match id prefixes, set items | Cart populated, route to /cart | **Overwrites an existing cart**; no toast; unmatched or OOS ids dropped silently; the router is bypassed via `replaceState` + synthetic popstate | C, D | YES | no |
| 49 | Unknown route | Visit `/nope` | `<Navigate to="/">` | Home | A silent redirect with no 404 — a mistyped deep link looks like a working launch | H | no | no |
| 50 | Runtime crash | Any render throw | — | Graceful fallback | **No ErrorBoundary anywhere** — a single throw blanks the whole miniapp | H | YES | no |
| 51 | Offline / flaky network | Kill the connection | — | Clear offline state | **Nothing.** No offline detection, no retry, no service worker. Skeletons resolve into empty sections | H | YES | no |
| 52 | Long text / special chars | Long title, RTL, emoji | Render | Clamped, no overflow | The portrait-card title is a fixed 32 px two-line box; several rows rely on `nowrap` + ellipsis | — | no | no |
| 53 | Rotation / small screen | Rotate, 320 px width | Reflow | Usable | The sheet is `max-width: 480`; landscape with the keyboard open is untested | — | no | no |
| 54 | Back mid-checkout | Open the sheet, press back | — | Sheet closes | The sheet is **not a history entry** — hardware/Telegram back exits the page instead of closing it; no `Escape`, no focus trap, no `role="dialog"` | C | YES | no |
| 55 | Permission — read another user's orders | Craft a `telegram_user_id` or an order id | Client-side Supabase read | Denied | Rests entirely on RLS for `miniapp_orders`; `/payment-return` reads any order by id with the anon key. **The server trusts a client-supplied `telegram_user_id`; `initData` is never verified** | F | YES | no |

**Counts** — 55 flows · 27 critical · 10 smoke · gaps by type: A 2 · B 4 · C 8 · D 10 · E 4 · F 1 · G 1 · H 24 · I 4 · J 0

**Unverified from code alone** — must be settled by execution or by inspecting Supabase: RLS policies on `miniapp_orders` and `books` (#55); real Telegram-webview behaviour for the back gesture, `openLink`, and haptics (#10, #31, #47, #54); the `checkStatus`/`clearCart` effect-identity risk (#32); actual Lighthouse and bundle numbers (Step 5).

---

## Headline findings

1. **Click payments can never be confirmed** (#33) — no webhook exists. Money leaves the customer, the order stays `unpaid`.
2. **Stock is never decremented** (#34) — unbounded oversell of finite inventory.
3. **`initData` is never verified** (#55) — the server trusts a client-supplied `telegram_user_id`.
4. **Three features are built but unreachable or inert** — ReaderModal (#13), Coming-Soon + notify-me, reading-path progress (#45).
5. **GPS is collected and thrown away** (#27) — the API accepts `lat`/`lng` and omits them from the insert.
6. **No ErrorBoundary and no offline handling** (#50, #51) — every failure mode degrades into a blank section.
