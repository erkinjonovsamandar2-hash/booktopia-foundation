const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  "src/components/BookFlipModal.tsx",
  "src/components/BookOfTheMonth.tsx",
  "src/components/CuratedLibrary.tsx",
  "src/components/GlobalClassics.tsx",
  "src/components/Hero.tsx",
  "src/components/MatchmakerQuiz.tsx",
  "src/components/SearchModal.tsx",
  "src/pages/BizHaqimizda.tsx",
  "src/pages/BlogPostDetail.tsx",
  "src/pages/LibraryPage.tsx"
];

for (const file of filesToUpdate) {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Add import if needed
  if (content.includes('/book/') && !content.includes('getBookSlug')) {
    // Replace various patterns
    content = content.replace(/\/book\/\$\{book\.id\}/g, '/book/${getBookSlug(book)}');
    content = content.replace(/\/book\/\$\{\(book as any\)\.id\}/g, '/book/${getBookSlug(book)}');
    content = content.replace(/\/book\/\$\{\(bk as any\)\.id\}/g, '/book/${getBookSlug(bk)}');
    content = content.replace(/\/book\/\$\{spotlightBook\.id\}/g, '/book/${getBookSlug(spotlightBook)}');
    content = content.replace(/\/book\/\$\{activeBook\.id\}/g, '/book/${getBookSlug(activeBook)}');
    content = content.replace(/\/book\/\$\{featuredBook\.id\}/g, '/book/${getBookSlug(featuredBook)}');

    // Add import statement at the top (after the first block of imports or after 'react')
    const importRegex = /^import .+?;/gm;
    let match;
    let lastImportPos = 0;
    while ((match = importRegex.exec(content)) !== null) {
      lastImportPos = match.index + match[0].length;
    }
    
    if (lastImportPos > 0) {
      content = content.slice(0, lastImportPos) + '\nimport { getBookSlug } from "@/lib/slugify";' + content.slice(lastImportPos);
    } else {
      content = 'import { getBookSlug } from "@/lib/slugify";\n' + content;
    }
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
