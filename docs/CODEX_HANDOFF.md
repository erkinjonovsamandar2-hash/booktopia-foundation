# Booktopia MiniApp — Codex Live Handoff Prompt

Copy and paste the prompt below directly into OpenAI Codex or any AI agent to run natural live environment browser testing and document findings across 3 structured phases.

---

### PROMPT TO COPY & PASTE:

```text
You are acting as the Lead QA & Frontend Engineer for the Booktopia Telegram MiniApp.

Our automated test suite (58/58 test cases) has verified all database queries, stock enforcement guards, and server checkout API endpoints. Now we need to perform NATURAL LIVE BROWSER VERIFICATION in 3 phases and document visual/UX references directly into our living documentation.

SOURCE OF TRUTH FILE:
Read `docs/QA_STATE.md` (or `booktopia-miniapp/docs/QA_STATE.md`) before doing anything. It contains all 58 test cases, rules of engagement, database keys, and project context.

YOUR GOAL:
Execute live browser / visual inspection across 3 structured phases. For every test case verified in live environment, update the Method column in `QA_STATE.md` from `🤖 Automated` to `🌐 Live Browser` (or `🌐 Live + 🤖 Auto`), and document any visual UI/UX observations in the Suggestions table.

---

### PHASE 1: Storefront & BookDetail UI/UX (Batches 1, 2, 3)
1. Open the live app: https://booktopia-miniapp.vercel.app/
2. Check OOS book "Ultrabilim" (ID: 9f04d148-bb2a-42c4-abb0-790835ce70b9):
   - Confirm red "Tugagan" badge on cover in Home, Catalog, and Discover pages (TC-01).
   - Confirm cover thumbnail opacity and grayscale filter (TC-02, TC-20).
   - Confirm quick-buy cart button is hidden (TC-03).
   - Confirm BookDetail page shows disabled button with "🚫 Zaxirada tugagan" (TC-10).
   - Toggle language to RU ("🚫 Нет в наличии") and EN ("🚫 Out of stock") (TC-16, TC-17).
3. Check hidden book "Эркин миллат пойдевори" (ID: 21195732-17a5-4e91-8b17-36e30e092d78):
   - Confirm it is completely hidden from Home, Catalog, and Reading Paths (TC-07, TC-08, TC-24).
4. Update `QA_STATE.md` with Phase 1 status and notes. Stop and log phase completion.

---

### PHASE 2: Cart, Checkout & Wishlist Protection (Batches 4, 5, 6)
1. Navigate to /cart with items in cart:
   - Verify red warning banner appears if an OOS item is present (TC-27).
   - Confirm Checkout button is disabled and grayed out (TC-28).
   - Verify removing the OOS item immediately removes warning and re-enables checkout (TC-30).
2. Test Wishlist page (/wishlist):
   - Save Ultrabilim to wishlist, verify "Tugagan" badge renders correctly on BookCard (TC-42).
   - Verify hidden books are excluded from Wishlist (TC-43).
3. Test Checkout API endpoint:
   - Perform test POST request to `https://booktopia-miniapp.vercel.app/api/checkout` with OOS item payload.
   - Confirm HTTP 400 response with message: "Ushbu kitob(lar) zaxirada tugagan..." (TC-35).
4. Update `QA_STATE.md` with Phase 2 status and notes. Stop and log phase completion.

---

### PHASE 3: Admin DB Sync, Mobile Responsiveness & Final Sign-Off (Batches 7, 8)
1. Test DB State Propagation (Supabase):
   - Update Ultrabilim stock in DB to 50 via Supabase API/script (TC-47). Reload live page to verify "Sotib olish" button re-enables immediately.
   - Set Ultrabilim stock back to 0 (TC-46).
2. Mobile & Dark Mode Audit:
   - Test UI on 360px viewport width to confirm no badge overflow (TC-57).
   - Test dark mode contrast for "Tugagan" badges (TC-58).
3. Finalize Documentation in `QA_STATE.md`:
   - Update Progress Tracker to reflect all live browser passes.
   - Append Session entry in `QA_STATE.md` Session Log with date, agent name, and findings.
   - If any UI polish or bug fixes were made, log exact diffs in the Fix Journal.
```
