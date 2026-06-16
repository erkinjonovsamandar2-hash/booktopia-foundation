/**
 * Booktopia Image Optimizer
 * Converts large PNG/JPG images to WebP for massive size savings.
 * Run: node optimize_images.cjs
 * 
 * Uses sharp (already in devDependencies) to convert images.
 * Only processes files > 200KB to avoid unnecessary conversions.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSET_DIR = path.join(__dirname, 'src', 'assets');
const MIN_SIZE = 200 * 1024; // Only convert files > 200KB
const QUALITY = 82; // WebP quality — good balance of size vs quality

// Collect all PNG/JPG files recursively
function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(png|jpe?g)$/i.test(entry.name)) {
      const stat = fs.statSync(full);
      if (stat.size > MIN_SIZE) {
        files.push({ path: full, size: stat.size, name: entry.name });
      }
    }
  }
  return files;
}

async function main() {
  const files = walk(ASSET_DIR);
  console.log(`Found ${files.length} images > ${MIN_SIZE / 1024}KB to convert\n`);

  let totalBefore = 0;
  let totalAfter = 0;
  const results = [];

  for (const file of files) {
    const webpPath = file.path.replace(/\.(png|jpe?g)$/i, '.webp');
    
    // Skip if WebP already exists and is newer
    if (fs.existsSync(webpPath)) {
      const webpStat = fs.statSync(webpPath);
      if (webpStat.mtimeMs > fs.statSync(file.path).mtimeMs) {
        console.log(`  SKIP (exists): ${path.relative(ASSET_DIR, file.path)}`);
        continue;
      }
    }

    try {
      await sharp(file.path)
        .webp({ quality: QUALITY, effort: 6 })
        .toFile(webpPath);

      const webpStat = fs.statSync(webpPath);
      const savings = ((1 - webpStat.size / file.size) * 100).toFixed(1);
      
      totalBefore += file.size;
      totalAfter += webpStat.size;

      results.push({
        file: path.relative(ASSET_DIR, file.path),
        before: (file.size / 1024).toFixed(0) + 'KB',
        after: (webpStat.size / 1024).toFixed(0) + 'KB',
        savings: savings + '%',
      });

      console.log(`  ✓ ${path.relative(ASSET_DIR, file.path)} → ${(file.size / 1024).toFixed(0)}KB → ${(webpStat.size / 1024).toFixed(0)}KB (${savings}% saved)`);
    } catch (err) {
      console.error(`  ✗ FAILED: ${file.name}: ${err.message}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`TOTAL: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB (${((1 - totalAfter / totalBefore) * 100).toFixed(1)}% saved)`);
  console.log('═'.repeat(60));
  console.log('\nWebP files created alongside originals.');
  console.log('Next step: Update import statements in components (PNG → WebP).');
}

main().catch(console.error);
