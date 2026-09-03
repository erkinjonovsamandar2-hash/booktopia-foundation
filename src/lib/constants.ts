/**
 * Static UI constants for the Booktopia application.
 *
 * These values are permanent UI configuration — not mock data —
 * and are safe to import after mockData.ts is eventually deleted.
 */

// ── Library category filter mapping ───────────────────────────────────────────
export const LIBRARY_FILTER_KEYS = ["jahon", "ilmiy", "new", "amir-temur", "erkin-millat"] as const;

// Genres a book can actually be filed under. "new" is deliberately absent:
// it is a lifecycle flag (books.is_new), and offering it as a genre is what
// stripped four books of theirs.
export const GENRE_KEYS = ["jahon", "ilmiy", "amir-temur", "erkin-millat"] as const;

export type LibraryFilterKey = (typeof LIBRARY_FILTER_KEYS)[number];

export const LIBRARY_FILTER_MAP: Record<LibraryFilterKey, string> = {
  "jahon":        "Jahon adabiyoti durdonalari",
  "ilmiy":        "Ilmiy-ommabop",
  "new":          "Yangi nashrlar",
  "amir-temur":   "Tarixiy",
  "erkin-millat": "Ijtimoiy-siyosiy",
};

export const LIBRARY_FILTER_LABELS: Record<LibraryFilterKey, { uz: string; ru: string; en: string }> = {
  "jahon":        { uz: "Jahon adabiyoti", ru: "Мировая литература",    en: "World Literature"   },
  "ilmiy":        { uz: "Ilmiy-ommabop",   ru: "Научно-популярное",     en: "Science & Education"},
  "new":          { uz: "Yangi nashrlar",  ru: "Новые издания",          en: "New Releases"       },
  "amir-temur":   { uz: "Tarixiy",         ru: "Историческое",           en: "Historical"         },
  "erkin-millat": { uz: "Ijtimoiy",        ru: "Социально-политическое", en: "Social & Political" },
};

export const LIBRARY_FILTER_ICONS: Record<LibraryFilterKey, string> = {
  "jahon":        "🌍",
  "ilmiy":        "🔬",
  "new":          "✨",
  "amir-temur":   "🏛️",
  "erkin-millat": "📜",
};

// ── EpicSpotlight – map hotspot positions ─────────────────────────────────────
export const HOTSPOT_IDS = ["winterfell", "kings-landing", "wall"] as const;

export const HOTSPOT_POSITIONS: Record<string, { x: number; y: number }> = {
  winterfell:      { x: 35, y: 25 },
  "kings-landing": { x: 55, y: 65 },
  wall:            { x: 40, y: 8  },
};