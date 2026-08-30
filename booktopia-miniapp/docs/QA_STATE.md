# Booktopia MiniApp — QA Living State

> **This file is the single source of truth.** AI agents READ it to know context and resume work, then WRITE back results, fixes, and observations. Humans read it to see the full audit trail.

---

## Current Position

```
Last updated: 2026-08-30
Last batch completed: Batch 1 (TC-01 → TC-08) & Batch 5 (TC-35, TC-36)
Next test to run: TC-09 (Batch 2: BookDetail)
Tests passed: 10 / 58
Tests failed: 0
Fixes pushed: 0
Pending suggestions: 0
Ultrabilim stock: 0 (set to OOS for testing)
Books temporarily hidden for testing: None
Cleanup needed: None
```

---

## Rules of Engagement

### What You CAN Auto-Fix (no human approval needed)
- Bug where stock/visibility logic doesn't match the pattern below
- Missing `shop_visible !== false` filter on a data query
- Missing `isOutOfStock` check on a UI element (badge, button, cover)
- Broken localization string (wrong language key)
- CSS issues that cause OOS badges to overflow or be unreadable
- Build errors caused by syntax mistakes

### What You MUST NOT Auto-Fix (log as Suggestion only)
- Any UI/UX change beyond stock enforcement (layout, colors, spacing, animations)
- Adding new features or components
- Refactoring existing patterns (even if "better")
- Changing how stock/visibility is stored in the database
- Modifying the Admin Dashboard
- Performance optimizations
- Anything you're unsure about

### What Requires Human Approval (log in Pending Decisions)
- Changing the stock logic pattern itself (e.g., treating null differently)
- Removing or hiding a book entirely vs showing it as OOS
- Changing server API response codes or error messages
- Any database schema changes
- Breaking changes to the cart deep-link format

### Behavioral Rules
- **Surgical changes only** — touch ONLY what the failing test requires
- **Match existing code style** — don't reformat, don't improve adjacent code
- **Every code change gets a Fix Journal entry** with the exact diff
- **Verify your own fix** — re-run the test after pushing, document the result
- **If a previous AI session's fix looks wrong**, log it as a regression, don't silently overwrite
- **Restore test data** — if you changed DB state for testing, document what needs cleanup

### Stock Logic Pattern (canonical — do not change without approval)
```js
const isOutOfStock = book.stock === 0 || (book.stock != null && book.stock <= 0);
// stock = null → unlimited (available) — this is by design
// stock = 0 or negative → out of stock
// shop_visible === false → completely hidden from storefront
```

---

## Project Context

**What**: Inventory visibility enforcement for a Telegram MiniApp bookstore (React/Vite + Supabase + Vercel).  
**Goal**: When admin sets `stock = 0` or `shop_visible = false`, the miniapp hides/disables purchases everywhere.  
**Repo root**: `c:\Users\user\Documents\GitHub\booktopia-foundation`  
**MiniApp subfolder**: `booktopia-miniapp/`  
**Deploy**: Vercel auto-deploys on push to `main`

### Key Files

| File | Role |
|------|------|
| `src/components/BookCard.jsx` | Card — Tugagan badge, hides cart button for OOS |
| `src/pages/BookDetail.jsx` | Detail — disables buy, shows OOS badge, hides wholesale |
| `src/pages/Home.jsx` | Home — filters shop_visible, PortraitCard OOS handling |
| `src/pages/Catalog.jsx` | Catalog — filters hidden from search/category |
| `src/pages/Discover.jsx` | Reading paths — Tugagan tag, ✕ circle, grayscale cover |
| `src/pages/Wishlist.jsx` | Wishlist — excludes hidden books |
| `src/pages/Cart.jsx` | Cart — warning banner, disabled checkout for OOS |
| `src/context/CartContext.jsx` | Cart state — blocks addItem, deep link guard |
| `src/components/CheckoutSheet.jsx` | Checkout form — blocks OOS submission |
| `api/checkout.js` | Server — rejects OOS/hidden items with HTTP 400 |
| `src/index.css` | CSS — `.badge--out-of-stock` styling |

### Database Access

```
Supabase URL:  https://ovlqfgjdmbvstqibrqrl.supabase.co
Anon Key:      eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bHFmZ2pkbWJ2c3RxaWJycXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NTMxMDMsImV4cCI6MjA4NzEyOTEwM30.1uN1tvS3oWaGLCJr8fVJqEAEr7HdarS3aD-6RKMV7gs
Service Key:   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bHFmZ2pkbWJ2c3RxaWJycXJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU1MzEwMywiZXhwIjoyMDg3MTI5MTAzfQ.D5kezWVVtY5zlmA9FAzAEX1o99pCI50i9hXX-QT4gLI
```

### Test Book
**Ultrabilim**: `9f04d148-bb2a-42c4-abb0-790835ce70b9` — currently `stock = 0`

### DB Helper Queries (run with node or service key)
```js
// Check Ultrabilim
supabase.from('books').select('id, title, stock, shop_visible').eq('id', '9f04d148-bb2a-42c4-abb0-790835ce70b9').single()

// Make OOS:        .update({ stock: 0 })
// Restore stock:   .update({ stock: 50 })
// Hide book:       .update({ shop_visible: false })
// Unhide book:     .update({ shop_visible: true })
```

### Live URLs
| Page | URL |
|------|-----|
| Home | `https://booktopia-miniapp.vercel.app/` |
| Catalog | `https://booktopia-miniapp.vercel.app/catalog` |
| Discover | `https://booktopia-miniapp.vercel.app/discover` |
| Ultrabilim | `https://booktopia-miniapp.vercel.app/book/9f04d148-bb2a-42c4-abb0-790835ce70b9` |
| Cart | `https://booktopia-miniapp.vercel.app/cart` |
| Checkout API | `POST https://booktopia-miniapp.vercel.app/api/checkout` |

---

## User Story

**As a** Booktopia store admin,  
**I want** finished/hidden products to immediately reflect in the Telegram MiniApp,  
**So that** customers cannot purchase unavailable books and the storefront always shows accurate inventory.

### Acceptance Criteria
- [ ] Books with `stock = 0` show "Tugagan" badge across all pages
- [ ] Books with `shop_visible = false` are completely hidden
- [ ] Purchase buttons disabled for OOS items
- [ ] Cart warns and blocks checkout for OOS items
- [ ] Server API rejects checkout for OOS/hidden items
- [ ] Admin changes reflect immediately on reload
- [ ] `stock = null` treated as unlimited (available)
- [ ] All text localized (uz, ru, en)

---

## Test Cases

**Status Legend**: ⬜ Not Run · ✅ Pass · ❌ Fail · ⚠️ Partial · 🔧 Fixed (was ❌, now passes)  
**Method Legend**: 🤖 Automated Test (Node/API/DB) · 🌐 Live Browser Test (Natural Environment)

### Batch 1: BookCard Component (TC-01 → TC-08)

| # | Test | Expected | Status | Method | Notes |
|---|------|----------|--------|--------|-------|
| TC-01 | OOS book shows "Tugagan" badge on BookCard | Red badge on cover | ✅ | 🤖 Automated | Ultrabilim (stock=0) state verified |
| TC-02 | OOS book cover has grayscale filter | Subtle gray, opacity ~0.85 | ✅ | 🤖 Automated | Verified opacity and filter prop |
| TC-03 | OOS book hides quick-buy cart button | Blue 🛒 button absent | ✅ | 🤖 Automated | Quick buy button hidden for OOS |
| TC-04 | In-stock book shows normal card | No badge, full color, cart visible | ✅ | 🤖 Automated | Oʻzbekistonda yana bir kun verified |
| TC-05 | stock=null (unlimited) treated as in-stock | No OOS badge, cart button present | ✅ | 🤖 Automated | Null stock treated as available |
| TC-06 | Negative stock treated as OOS | Same as stock=0 behavior | ✅ | 🤖 Automated | Stock=-1 isOutOfStock=true |
| TC-07 | shop_visible=false excluded from Home | Book absent from all Home sections | ✅ | 🤖 Automated | Excluded from home dataset |
| TC-08 | shop_visible=false excluded from Catalog | Not found even by title search | ✅ | 🤖 Automated | Excluded from catalog search |

### Batch 2: BookDetail Page (TC-09 → TC-17)

| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| TC-09 | OOS badge in BookDetail price area | `⚠️ Zaxirada tugagan` next to price | ⬜ | |
| TC-10 | Buy button disabled and shows OOS text | Gray button, `🚫 Zaxirada tugagan` | ⬜ | |
| TC-11 | Tapping disabled buy = no action | No CheckoutSheet, no cart add | ⬜ | |
| TC-12 | Wholesale offer hidden for OOS book | 🔥 banner absent | ⬜ | |
| TC-13 | Cover grayscale on BookDetail for OOS | grayscale(0.5), opacity 0.85 | ⬜ | |
| TC-14 | shop_visible=false → "Kitob topilmadi" | Not found message shown | ⬜ | |
| TC-15 | In-stock book shows normal BookDetail | Normal buy, no OOS badge | ⬜ | |
| TC-16 | Russian locale OOS text | `🚫 Нет в наличии` | ⬜ | |
| TC-17 | English locale OOS text | `🚫 Out of stock` | ⬜ | |

### Batch 3: Discover / Reading Paths (TC-18 → TC-25)

| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| TC-18 | OOS book in path → "Tugagan" tag | Red tag instead of price | ⬜ | |
| TC-19 | OOS step circle shows ✕ in red | Red circle with ✕ | ⬜ | |
| TC-20 | OOS cover thumbnail dimmed | opacity 0.5, grayscale | ⬜ | |
| TC-21 | OOS title grayed out | var(--text-3) color | ⬜ | |
| TC-22 | In-stock book in same path = normal | Step number, full color, price | ⬜ | |
| TC-23 | Tapping OOS book navigates to detail | Navigation works | ⬜ | |
| TC-24 | shop_visible=false excluded from paths | Book absent from list | ⬜ | |
| TC-25 | Hafta Tanlovi excludes hidden books | Next visible featured shown | ⬜ | |

### Batch 4: Cart Protection (TC-26 → TC-33)

| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| TC-26 | addItem blocks OOS book | Not added to cart | ⬜ | |
| TC-27 | OOS warning banner in Cart | Red banner with warning | ⬜ | |
| TC-28 | Checkout button disabled with OOS | Gray, opacity 0.5, disabled | ⬜ | |
| TC-29 | "Zaxirada tugagan" tag on cart row | Red badge on item | ⬜ | |
| TC-30 | Removing OOS item re-enables checkout | Banner gone, button active | ⬜ | |
| TC-31 | Clear cart removes OOS items | Empty, no warning | ⬜ | |
| TC-32 | Cart warning in Russian | Correct Russian text | ⬜ | |
| TC-33 | Cart warning in English | Correct English text | ⬜ | |

### Batch 5: Checkout & Server API (TC-34 → TC-41)

| # | Test | Expected | Status | Method | Notes |
|---|------|----------|--------|--------|-------|
| TC-34 | CheckoutSheet blocks OOS submission | canSubmit false, disabled | ⬜ | | |
| TC-35 | Server rejects OOS book checkout | HTTP 400 | ✅ | 🤖 Automated | Returned 400 "zaxirada tugagan" |
| TC-36 | Server rejects hidden book checkout | HTTP 400 | ✅ | 🤖 Automated | Returned 400 "sotuvda yo'q" |
| TC-37 | Server allows in-stock checkout | HTTP 200 | ⬜ | | |
| TC-38 | Server allows stock=null checkout | HTTP 200 | ⬜ | | |
| TC-39 | Mixed cart: rejects if ANY item OOS | HTTP 400, entire order rejected | ⬜ | | |
| TC-40 | Deep link excludes OOS books | Only in-stock in cart | ⬜ | | |
| TC-41 | Deep link excludes hidden books | Hidden excluded | ⬜ | | |

### Batch 6: Wishlist (TC-42 → TC-45)

| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| TC-42 | Wishlist shows OOS with Tugagan badge | BookCard OOS styling | ⬜ | |
| TC-43 | Wishlist excludes shop_visible=false | Hidden book absent | ⬜ | |
| TC-44 | Share button works for OOS book | Telegram share opens | ⬜ | |
| TC-45 | Empty state when all books hidden | Heart icon + empty msg | ⬜ | |

### Batch 7: Admin Propagation (TC-46 → TC-50)

| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| TC-46 | Set stock=0 → miniapp shows Tugagan | OOS everywhere on reload | ⬜ | |
| TC-47 | Restore stock → miniapp shows available | Fully purchasable | ⬜ | |
| TC-48 | Toggle visibility off → book disappears | Gone from all pages | ⬜ | |
| TC-49 | Toggle visibility on → book reappears | Back in all sections | ⬜ | |
| TC-50 | Admin shows "Tugagan" for stock=0 | Red badge in admin | ⬜ | |

### Batch 8: Edge Cases & Non-Functional (TC-51 → TC-58)

| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| TC-51 | Race: OOS during open detail → buy | Server rejects 400 | ⬜ | |
| TC-52 | Home loads < 3s with mixed stock | Under 3 seconds | ⬜ | |
| TC-53 | Catalog count excludes hidden | Matches visible-only | ⬜ | |
| TC-54 | OOS book with price=null | No buy button at all | ⬜ | |
| TC-55 | Back from hidden "not found" page | Clean navigation | ⬜ | |
| TC-56 | Stale cart with OOS item | Warning, checkout disabled | ⬜ | |
| TC-57 | 360px viewport OOS badge | No overflow | ⬜ | |
| TC-58 | Dark mode OOS contrast | Readable | ⬜ | |

---

## Progress Tracker

| Batch | Tests | ✅ | ❌ | 🔧 | ⬜ |
|-------|-------|----|----|----|-----|
| 1: BookCard | 8 | 8 | 0 | 0 | 0 |
| 2: BookDetail | 9 | 0 | 0 | 0 | 9 |
| 3: Discover | 8 | 0 | 0 | 0 | 8 |
| 4: Cart | 8 | 0 | 0 | 0 | 8 |
| 5: Checkout/API | 8 | 2 | 0 | 0 | 6 |
| 6: Wishlist | 4 | 0 | 0 | 0 | 4 |
| 7: Admin | 5 | 0 | 0 | 0 | 5 |
| 8: Edge/NFR | 8 | 0 | 0 | 0 | 8 |
| **TOTAL** | **58** | **10** | **0** | **0** | **48** |

---

## Fix Journal

> Every code change is documented here with exact diffs. This is the audit trail.

| # | TC | File Changed | Root Cause | Diff | Commit | Verified |
|---|----|-------------|------------|------|--------|----------|
| — | — | — | No fixes yet | — | — | — |

### Fix Entry Template
When logging a fix, use this format:

```
### Fix #N — TC-XX (Date)
**File**: `path/to/file.jsx`  
**Root cause**: [What was wrong]  
**Change**:
\```diff
- old code
+ new code
\```
**Commit**: `abc1234`  
**Verified**: ✅ Re-tested TC-XX after deploy, passes now
```

---

## Suggestions (Do NOT Auto-Fix)

> UI/UX improvements, performance ideas, or architectural thoughts observed during testing. These need human review before implementation.

| # | TC | Page | Observation | Suggested Change | Priority |
|---|-----|------|-------------|-----------------|----------|
| — | — | — | No suggestions yet | — | — |

---

## Pending Decisions (Need Human Approval)

> Questions or changes that affect business logic, data model, or user-facing behavior beyond stock enforcement.

| # | Question / Proposal | Context | Status |
|---|---------------------|---------|--------|
| — | No pending decisions | — | — |

---

## Regressions

> Fixes from a previous session that broke something else, or fixes that didn't actually work.

| # | Original Fix | What Broke | Found In Session | Status |
|---|-------------|------------|-----------------|--------|
| — | No regressions | — | — | — |

---

## Session Log

> Each AI session appends one entry. This is how we track who did what and verify quality.

### Session 1 — 2026-08-30 (Batch 1 & API Verification)
- **Agent**: Gemini 3.6 Flash
- **Work**: Tested Batch 1 (TC-01 → TC-08) and Batch 5 API endpoints (TC-35, TC-36)
- **Tests run**: 10 (TC-01, TC-02, TC-03, TC-04, TC-05, TC-06, TC-07, TC-08, TC-35, TC-36)
- **Results**: 10 Passed, 0 Failed
- **Fixes**: N/A (all test cases passed on first run)
- **Commits**: N/A
- **Verification of previous session**: Verified initial implementation commits `0fe7acd` and `85d1965`
- **DB state changes**: Confirmed Ultrabilim stock=0, hidden book `21195732-17a5-4e91-8b17-36e30e092d78`
- **Cleanup needed**: None
- **Next**: Batch 2 (TC-09 → TC-17)

### Session 0 — 2026-08-29 (Implementation)
- **Agent**: Antigravity (Claude Opus 4.6)
- **Work**: Implemented stock/visibility enforcement across 11 files
- **Tests run**: 0 (code review + `npm run build` only)
- **Fixes**: N/A (initial implementation)
- **Commits**: `0fe7acd`, `85d1965`
- **Verification of previous session**: N/A (first session)
- **DB state changes**: Set Ultrabilim stock=0
- **Cleanup needed**: None
- **Next**: Start TC-01

---

## Commits History

| Commit | Description | Session | Date |
|--------|-------------|---------|------|
| `0fe7acd` | fix(miniapp): enforce inventory stock and visibility across storefront and checkout | 0 | 2026-08-29 |
| `85d1965` | fix(miniapp): filter hidden books in wishlist page | 0 | 2026-08-29 |
