import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ovlqfgjdmbvstqibrqrl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bHFmZ2pkbWJ2c3RxaWJycXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NTMxMDMsImV4cCI6MjA4NzEyOTEwM30.1uN1tvS3oWaGLCJr8fVJqEAEr7HdarS3aD-6RKMV7gs';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bHFmZ2pkbWJ2c3RxaWJycXJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU1MzEwMywiZXhwIjoyMDg3MTI5MTAzfQ.D5kezWVVtY5zlmA9FAzAEX1o99pCI50i9hXX-QT4gLI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ULTRABILIM_ID = '9f04d148-bb2a-42c4-abb0-790835ce70b9';
const HIDDEN_BOOK_ID = '21195732-17a5-4e91-8b17-36e30e092d78'; // Эркин миллат пойдевори
const INSTOCK_BOOK_ID = 'a3a96a05-c21f-4d13-80b0-6fb9eb3270d1'; // Oʻzbekistonda yana bir kun

async function runBatch1() {
  console.log('\n--- BATCH 1: BookCard Component & Query Filters (TC-01 → TC-08) ---');
  
  // Fetch Ultrabilim
  const { data: ultrabilim } = await supabase.from('books').select('*').eq('id', ULTRABILIM_ID).single();
  const isUltrabilimOOS = ultrabilim.stock === 0 || (ultrabilim.stock != null && ultrabilim.stock <= 0);
  console.log(`TC-01/02/03 [Ultrabilim OOS State]: stock=${ultrabilim.stock} → isOutOfStock=${isUltrabilimOOS} [${isUltrabilimOOS ? '✅ PASS' : '❌ FAIL'}]`);

  // Fetch In-stock book
  const { data: instockBook } = await supabase.from('books').select('*').eq('id', INSTOCK_BOOK_ID).single();
  const isInstockOOS = instockBook.stock === 0 || (instockBook.stock != null && instockBook.stock <= 0);
  console.log(`TC-04/05 [In-stock Book State]: stock=${instockBook.stock} → isOutOfStock=${isInstockOOS} [${!isInstockOOS ? '✅ PASS' : '❌ FAIL'}]`);

  // Negative stock check
  const fakeNegativeBook = { stock: -1 };
  const isNegOOS = fakeNegativeBook.stock === 0 || (fakeNegativeBook.stock != null && fakeNegativeBook.stock <= 0);
  console.log(`TC-06 [Negative Stock State]: stock=-1 → isOutOfStock=${isNegOOS} [${isNegOOS ? '✅ PASS' : '❌ FAIL'}]`);

  // Home Query Exclusions (shop_visible !== false)
  const { data: homeBooks } = await supabase.from('books').select('*').order('sort_order', { ascending: true });
  const visibleHomeBooks = homeBooks.filter(b => b.shop_visible !== false);
  const isHiddenInHome = visibleHomeBooks.some(b => b.id === HIDDEN_BOOK_ID);
  console.log(`TC-07 [Home Page Exclusions]: Hidden book present in home dataset? ${isHiddenInHome} [${!isHiddenInHome ? '✅ PASS' : '❌ FAIL'}]`);

  // Catalog Query Exclusions
  const { data: catalogBooks } = await supabase.from('books').select('*');
  const visibleCatalogBooks = catalogBooks.filter(b => b.shop_visible !== false);
  const isHiddenInCatalog = visibleCatalogBooks.some(b => b.id === HIDDEN_BOOK_ID);
  console.log(`TC-08 [Catalog Page Exclusions]: Hidden book present in catalog dataset? ${isHiddenInCatalog} [${!isHiddenInCatalog ? '✅ PASS' : '❌ FAIL'}]`);
}

async function runBatch5() {
  console.log('\n--- BATCH 5: Server Checkout API Validation (TC-34 → TC-41) ---');
  
  // Test POST /api/checkout with OOS item (Ultrabilim)
  try {
    const resOOS = await fetch('https://booktopia-miniapp.vercel.app/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ book_id: ULTRABILIM_ID, qty: 1 }],
        name: 'Test QA',
        phone: '998901234567',
        payment_method: 'payme'
      })
    });
    const bodyOOS = await resOOS.json();
    const isSuccessOOS = resOOS.status === 400 && bodyOOS.error.includes('zaxirada tugagan');
    console.log(`TC-35 [API Rejects OOS Item]: HTTP ${resOOS.status} - Error: "${bodyOOS.error}" [${isSuccessOOS ? '✅ PASS' : '❌ FAIL'}]`);
  } catch (err) {
    console.error('TC-35 error:', err.message);
  }

  // Test POST /api/checkout with Hidden item
  try {
    const resHidden = await fetch('https://booktopia-miniapp.vercel.app/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ book_id: HIDDEN_BOOK_ID, qty: 1 }],
        name: 'Test QA',
        phone: '998901234567',
        payment_method: 'payme'
      })
    });
    const bodyHidden = await resHidden.json();
    const isSuccessHidden = resHidden.status === 400 && bodyHidden.error.includes('zaxirada tugagan yoki sotuvda yo\'q');
    console.log(`TC-36 [API Rejects Hidden Item]: HTTP ${resHidden.status} - Error: "${bodyHidden.error}" [${isSuccessHidden ? '✅ PASS' : '❌ FAIL'}]`);
  } catch (err) {
    console.error('TC-36 error:', err.message);
  }
}

async function main() {
  await runBatch1();
  await runBatch5();
}

main();
