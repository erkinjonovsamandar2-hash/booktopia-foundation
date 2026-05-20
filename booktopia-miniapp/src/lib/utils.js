// Format price with Uzbek locale
export const formatPrice = (price) => {
  if (!price) return "Narx yo'q";
  return new Intl.NumberFormat('ru-RU').format(price) + " so'm";
};

// Get localized field (uz/ru/en pattern matching the website's DB schema)
export const locField = (obj, field, lang) => {
  if (lang === 'ru' && obj[`${field}_ru`]) return obj[`${field}_ru`];
  if (lang === 'en' && obj[`${field}_en`]) return obj[`${field}_en`];
  return obj[field] || '';
};

// Truncate text
export const truncate = (text, maxLen = 120) => {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
};

// Category labels in 3 languages — same keys as LibraryPage.tsx
export const CATEGORY_LABELS = {
  all:            { uz: 'Barchasi',                    ru: 'Все',                      en: 'All' },
  jahon:          { uz: 'Jahon adabiyoti',             ru: 'Мировая классика',         en: 'World Classics' },
  ilmiy:          { uz: 'Ilmiy-ommabop',               ru: 'Научно-популярные',        en: 'Popular Science' },
  new:            { uz: 'Yangi nashrlar',               ru: 'Новинки',                  en: 'New Releases' },
  'amir-temur':   { uz: 'Tarixiy',                     ru: 'Исторические',             en: 'Historical' },
  'erkin-millat': { uz: 'Ijtimoiy-siyosiy',            ru: 'Общественно-политические', en: 'Socio-political' },
};

export const CATEGORIES = ['all', 'jahon', 'ilmiy', 'new', 'amir-temur', 'erkin-millat'];

export const getCategoryLabel = (key, lang = 'uz') =>
  CATEGORY_LABELS[key]?.[lang] ?? key;

// Telegram WebApp helper — safe to call even if SDK not loaded
export const tg = () => window.Telegram?.WebApp ?? null;

export const haptic = (type = 'light') => {
  tg()?.HapticFeedback?.impactOccurred(type);
};
