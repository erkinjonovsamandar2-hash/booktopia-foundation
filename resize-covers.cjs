/**
 * ── Batch Resize Existing Book Covers in Supabase ──────────────────────
 *
 * Downloads every image in the "books" bucket, resizes to MAX 800px on
 * the longest side, converts to WebP, and re-uploads (overwrites).
 *
 * Run:  node resize-covers.cjs
 *
 * Requires: npm install sharp (one-time)
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://ovlqfgjdmbvstqibrqrl.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bHFmZ2pkbWJ2c3RxaWJycXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NTMxMDMsImV4cCI6MjA4NzEyOTEwM30.1uN1tvS3oWaGLCJr8fVJqEAEr7HdarS3aD-6RKMV7gs";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET = "books";
const MAX_DIM = 800;
const QUALITY = 82;

// Skip files in these prefixes (not book covers)
const SKIP_PREFIXES = ["site/", "pdf/", "excerpts/"];

async function main() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.error("❌ 'sharp' not installed. Run:  npm install sharp");
    process.exit(1);
  }

  console.log("📂 Listing files in bucket:", BUCKET);
  const { data: files, error } = await supabase.storage.from(BUCKET).list("", {
    limit: 500,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) {
    console.error("❌ List error:", error.message);
    return;
  }
  console.log(`   Found ${files.length} top-level entries\n`);

  let resized = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    // Skip folders and non-image files
    if (!file.name || file.metadata?.mimetype?.startsWith("application/")) {
      skipped++;
      continue;
    }
    if (SKIP_PREFIXES.some((p) => file.name.startsWith(p))) {
      skipped++;
      continue;
    }
    // Only process image files
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["webp", "png", "jpg", "jpeg", "avif"].includes(ext || "")) {
      skipped++;
      continue;
    }

    const path = file.name;
    console.log(`🔄 Processing: ${path} (${(file.metadata?.size / 1024).toFixed(0)} KB)`);

    try {
      // Download
      const { data: blob, error: dlErr } = await supabase.storage
        .from(BUCKET)
        .download(path);
      if (dlErr) throw dlErr;

      const buffer = Buffer.from(await blob.arrayBuffer());
      const metadata = await sharp(buffer).metadata();
      const w = metadata.width || 0;
      const h = metadata.height || 0;

      if (w <= MAX_DIM && h <= MAX_DIM) {
        console.log(`   ✅ Already small (${w}×${h}) — skipping`);
        skipped++;
        continue;
      }

      // Resize
      const resizedBuf = await sharp(buffer)
        .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();

      const savings = ((1 - resizedBuf.length / buffer.length) * 100).toFixed(0);
      console.log(
        `   📐 ${w}×${h} → resized (${(resizedBuf.length / 1024).toFixed(0)} KB, -${savings}%)`
      );

      // Re-upload (overwrite)
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, resizedBuf, {
        contentType: "image/webp",
        upsert: true,
      });
      if (upErr) throw upErr;

      console.log(`   ✅ Uploaded`);
      resized++;
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Results:`);
  console.log(`   Resized: ${resized}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors:  ${errors}`);
}

main().catch(console.error);
