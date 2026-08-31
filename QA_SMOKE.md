# QA_SMOKE.md — booktopia-miniapp

Step 2 of 6 · Smoke gate · executed 2026-08-30

**Driver:** Chrome MCP background tab against `vite dev` on `http://localhost:5173`
**Build:** dev server (`npm run dev`, Vite 8.0.13), not a production build
**Scope:** only the 10 rows marked `Smoke = YES` in `QA_FLOWS.md` Table C

**Environment caveats — true for every row below**
- Plain browser, not the Telegram client. `telegram-web-app.js` loads and `web_app_ready` / `web_app_expand` fire, so `window.Telegram.WebApp` exists, but `initDataUnsafe.user` is undefined. Everything user-scoped therefore renders its guest path: Profile shows "Mehmon", `/orders` would show "open via Telegram".
- Vercel serverless functions do not run under `vite dev`, so `/api/checkout` is unreachable. No smoke row submits an order; the checkout row stops at the form gate by design.
- Viewport was 1280×576. `resize_window` resizes the OS window, not the tab viewport, so this pass is **desktop-width**. Responsive checks belong to Step 5 layer 6.
- Evidence IDs below are session-scoped Chrome screenshot IDs, not files on disk.

---

| Smoke # | Flow | Check | Status | Evidence | Notes |
|---|---|---|---|---|---|
| 1 | #1 | App launches | ✅ | ss_6452uve9b | Home renders fully. No console errors. Telegram SDK handshake logs only. |
| 2 | #2 | Home data loads | ✅ | ss_6452uve9b | Books, bestsellers, new releases and 3 blog teasers all populated from Supabase. |
| 3 | #3 | All 5 nav tabs load | ✅ | ss_8414wx5w9, ss_8430tisle, ss_4521a7fb0, ss_55834icxx | Home / Catalog / Cart / Discover / Profile all render. Active state correct on each. |
| 4 | #4 | Catalog loads | ✅ | ss_7113bz1uo | 12 books after filtering `shop_visible`. Category pills and search render. Took ~5 s under `vite dev` — see Obs-1. |
| 5 | #7 | Catalog → book detail | ✅ | ss_1342358mo | `/book/9f04d148-…` opened. OOS book correctly showed a disabled CTA and the "Zaxirada tugagan" badge. ~12 s under `vite dev` — see Obs-1. |
| 6 | #14 | Add to cart | ✅ | ss_7350lfmo6 | Cart badge → `1`, `localStorage.booktopia_cart` → `Bygone days x1`, success toast rendered. **First click did nothing** — see Obs-2. |
| 7 | #16 | Cart survives reload | ✅ | ss_8430tisle | Full page load of `/cart` restored the item, qty, and total (105 000 so'm). |
| 8 | #23 | Cart → checkout sheet | ✅ | ss_0463eepo0 | Sheet opens with correct line item and total. Payme preselected, Click present. |
| 9 | #25 | Phone mask + submit gate | ✅ | ss_82019dvq9 | `901234567` → `+998 (90) 123-45-67`, confirm enabled. Truncated to `90` → confirm `disabled=true`, hint "7 ta raqam qoldi". Gate works. |
| 10 | #44 | Discover loads | ✅ | ss_4521a7fb0 | Book of the week + all 4 reading paths render. Two paths render with broken contents — see Obs-3. |

**Summary: 10 of 10 smoke checks passed.**

---

## Observations recorded during the run

Not smoke failures — the checks passed. Logged to `QA_BACKLOG.md` and carried into Step 3.

- **Obs-1 — apparent slowness is a dev-mode artifact, not a product defect.** Catalog took ~5 s and book detail ~12 s to first paint. Measured in-page: the Supabase round trip through the `/_sb` proxy is **409 ms** and navigation duration was 4.3 s, so the latency is Vite's on-demand transform, not the app or the network. **Do not treat this as a performance finding.** Step 5 must re-measure against `vite build` + `vite preview`.
- **Obs-2 — a click on an add-to-cart button was silently swallowed.** The first click on a located, visible button produced no cart write, no badge, no toast; an identical click moments later worked. Book covers were still decoding at the time, so layout shift moving the button between hit-test and click is the leading hypothesis. Real users tapping while covers load would hit the same thing. Needs a deliberate reproduction in Step 3.
- **Obs-3 — two of the four Discover reading paths are broken against live data.** "Temur imperiyasi" renders **0/0** — all three hardcoded UUIDs resolve to nothing, and the card is still drawn with an empty progress bar. "Inson kodi" renders 0/1 of 2 hardcoded ids. This is `MGMT-02` confirmed in production data, not a theoretical risk.
- **Obs-4 — the Discover hero promotes an out-of-stock book with no indication.** "HAFTA TANLOVI" resolved to *Ultrabilim*, which the catalog correctly marks TUGAGAN. The week card shows the price and "Ko'proq →" with no OOS treatment at all.
- **Obs-5 — the app is not reachable by keyboard or screen reader.** The five bottom-nav links expose **no accessible name** (icon + styled span only). Book cards are plain `div`s with `onClick` — the accessibility tree contains no interactive element for any book. Only the quick add-to-cart and wishlist buttons carry labels, and those are hardcoded Uzbek.
- **Obs-6 — the checkout sheet is not a dialog.** `Escape` does not close it (verified: sheet still mounted after the keypress). Every control on the page behind it — Tozalash, the qty steppers, all five nav links — stays in the interactive tree and focusable. No focus trap, no `inert`, no `role="dialog"`. Backdrop click does close it correctly. Confirms `NAV-03`.
- **Obs-7 — the root Tailwind/PostCSS config leaks into the miniapp build.** `vite dev` emits *"The `content` option in your Tailwind CSS configuration is missing or empty"*, even though `booktopia-miniapp/package.json` has no Tailwind dependency and the app is written in plain CSS. Vite is walking up to the repo root's `postcss.config.js` + `tailwind.config.ts`.

---

## Gate decision

All 10 smoke checks passed. **Smoke passed. Ready for Prompt 3.**
