import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, BookOpen, Eye, EyeOff, Package, TrendingUp, AlertTriangle, DollarSign, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { LIBRARY_FILTER_MAP } from "@/lib/constants";

interface BookRow {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  category: string;
  price: number | null;
  stock: number | null;
  shop_visible: boolean | null;
  featured: boolean | null;
  sort_order: number | null;
}

interface SalesData { [bookTitle: string]: { qty: number; revenue: number } }

const imgUrl = (url: string | null) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${url}`;
};

const fmt = (n: number) => n ? `${n.toLocaleString("ru-RU")} so'm` : "—";

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ title, value, icon: Icon, color, bg }: { title: string; value: string; icon: any; color: string; bg: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon style={{ width: 22, height: 22, color }} />
      </div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", margin: 0 }}>{title}</p>
        <p style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: "2px 0 0" }}>{value}</p>
      </div>
    </div>
  );
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 42, height: 24, borderRadius: 12, border: "none", padding: 2,
        background: on ? "#38A169" : "#d1d5db", cursor: disabled ? "wait" : "pointer",
        transition: "background 0.2s", display: "flex", alignItems: "center",
        justifyContent: on ? "flex-end" : "flex-start", flexShrink: 0,
      }}
    >
      <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "all 0.2s" }} />
    </button>
  );
}

// ── Inline Editable Field ─────────────────────────────────────────────────────
function InlineEdit({ value, onSave, prefix, suffix, placeholder }: { value: string; onSave: (v: string) => void; prefix?: string; suffix?: string; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => { setEditing(false); if (draft !== value) onSave(draft); };
  const cancel = () => { setEditing(false); setDraft(value); };

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        style={{ background: "none", border: "1px dashed transparent", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 13, fontWeight: 700, color: value ? "#111827" : "#9ca3af", transition: "all 0.15s", minWidth: 60, textAlign: "left" }}
        onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = "#d1d5db"; (e.target as HTMLElement).style.background = "#f9fafb"; }}
        onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = "transparent"; (e.target as HTMLElement).style.background = "none"; }}
      >
        {prefix}{value || placeholder || "—"}{suffix}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
        onBlur={commit}
        style={{ width: 80, padding: "3px 8px", borderRadius: 6, border: "1px solid #38A169", fontSize: 13, fontWeight: 700, outline: "none" }}
      />
    </div>
  );
}

// ── Stock Badge ───────────────────────────────────────────────────────────────
function StockBadge({ stock }: { stock: number | null }) {
  if (stock === null || stock === undefined) return <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>♾️ Cheksiz</span>;
  if (stock === 0) return <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fef2f2", padding: "2px 8px", borderRadius: 10 }}>Tugagan</span>;
  if (stock <= 5) return <span style={{ fontSize: 11, fontWeight: 700, color: "#d97706", background: "#fffbeb", padding: "2px 8px", borderRadius: 10 }}>⚠️ {stock} ta</span>;
  return <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "2px 8px", borderRadius: 10 }}>✓ {stock} ta</span>;
}

// ── Sales Badge ───────────────────────────────────────────────────────────────
function SalesBadge({ qty, revenue }: { qty: number; revenue: number }) {
  if (qty === 0) return <span style={{ fontSize: 11, color: "#9ca3af" }}>Sotilmagan</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#38A169" }}>{qty} ta sotildi</span>
      <span style={{ fontSize: 10, color: "#6b7280" }}>{fmt(revenue)}</span>
    </div>
  );
}

// ── Expanded Detail Panel ─────────────────────────────────────────────────────
function BookDetail({ book, sales, onClose }: { book: BookRow; sales: { qty: number; revenue: number }; onClose: () => void }) {
  return (
    <div style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb", padding: "16px 20px", animation: "fadeIn 0.2s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", border: "1px solid #f0f0f0" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase" }}>Jami sotildi</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>{sales.qty} ta</p>
        </div>
        <div style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", border: "1px solid #f0f0f0" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase" }}>Daromad</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: "#38A169", margin: 0 }}>{fmt(sales.revenue)}</p>
        </div>
        <div style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", border: "1px solid #f0f0f0" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase" }}>Kategoriya</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: 0 }}>{LIBRARY_FILTER_MAP[book.category as keyof typeof LIBRARY_FILTER_MAP] ?? book.category}</p>
        </div>
      </div>
      <a href={`/book/${book.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#265999", fontWeight: 600, textDecoration: "none" }}>
        🔗 Saytda ko'rish →
      </a>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Main Component ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function BotBooksManager() {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [salesData, setSalesData] = useState<SalesData>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterVisibility, setFilterVisibility] = useState<"all" | "visible" | "hidden">("all");
  const [filterStock, setFilterStock] = useState<"all" | "in" | "low" | "out">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"title" | "price" | "sales">("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch books ──────────────────────────────────────────────────────────
  const fetchBooks = useCallback(async () => {
    const { data, error } = await (supabase as any).from("books").select("id, title, author, cover_url, category, price, stock, shop_visible, featured, sort_order").order("sort_order", { ascending: true });
    if (error) { console.error("BotBooks fetch:", error); return; }
    if (data) setBooks(data);
    setLoading(false);
  }, []);

  // ── Fetch sales data from orders ─────────────────────────────────────────
  const fetchSales = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("miniapp_orders")
      .select("items, total_uzs, status")
      .neq("status", "cancelled")
      .neq("status", "archived")
      // Pre-launch orders are archived; per-book sales start from zero too.
      .is("archived_at", null);
    if (!data) return;
    const map: SalesData = {};
    data.forEach((order: any) => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const key = item.title || "";
          if (!map[key]) map[key] = { qty: 0, revenue: 0 };
          map[key].qty += item.qty || 1;
          map[key].revenue += (item.price || 0) * (item.qty || 1);
        });
      }
    });
    setSalesData(map);
  }, []);

  useEffect(() => { fetchBooks(); fetchSales(); }, [fetchBooks, fetchSales]);

  // ── Update a single book field ───────────────────────────────────────────
  const updateField = async (id: string, field: string, value: any) => {
    setUpdating(id);
    const { error } = await (supabase as any).from("books").update({ [field]: value }).eq("id", id);
    if (error) { showToast(`Xatolik: ${error.message}`, "error"); }
    else {
      setBooks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
      showToast("Saqlandi ✓");
    }
    setUpdating(null);
  };

  // ── Computed ─────────────────────────────────────────────────────────────
  const getSales = (title: string) => salesData[title] || { qty: 0, revenue: 0 };

  const filtered = books.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
    const matchVis = filterVisibility === "all" || (filterVisibility === "visible" ? b.shop_visible : !b.shop_visible);
    let matchStock = true;
    if (filterStock === "in") matchStock = b.stock === null || (b.stock ?? 0) > 5;
    if (filterStock === "low") matchStock = b.stock !== null && b.stock > 0 && b.stock <= 5;
    if (filterStock === "out") matchStock = b.stock === 0;
    return matchSearch && matchVis && matchStock;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortBy === "title") cmp = a.title.localeCompare(b.title);
    if (sortBy === "price") cmp = (a.price ?? 0) - (b.price ?? 0);
    if (sortBy === "sales") cmp = getSales(a.title).qty - getSales(b.title).qty;
    return sortDir === "desc" ? -cmp : cmp;
  });

  const shopCount = books.filter(b => b.shop_visible).length;
  const totalValue = books.filter(b => b.shop_visible).reduce((s, b) => s + (b.price ?? 0), 0);
  const outOfStock = books.filter(b => b.stock === 0).length;
  const avgPrice = shopCount > 0 ? Math.round(totalValue / shopCount) : 0;

  const toggleSort = (col: "title" | "price" | "sales") => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: "title" | "price" | "sales" }) => {
    if (sortBy !== col) return null;
    return sortDir === "asc" ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />;
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: toast.type === "error" ? "#fee2e2" : "#dcfce7", border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#86efac"}`, color: toast.type === "error" ? "#991b1b" : "#15803d", borderRadius: 12, padding: "10px 18px", fontWeight: 600, fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>Kitoblar boshqaruvi</h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Bot do'konidagi kitoblarni boshqarish — narx, zaxira va ko'rinishni sozlash</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KpiCard title="Do'kondagi kitoblar" value={`${shopCount} ta`} icon={BookOpen} color="#38A169" bg="#EBF8F0" />
        <KpiCard title="Katalog qiymati" value={fmt(totalValue)} icon={DollarSign} color="#265999" bg="#EBF4FF" />
        <KpiCard title="Tugagan kitoblar" value={`${outOfStock} ta`} icon={AlertTriangle} color={outOfStock > 0 ? "#dc2626" : "#6b7280"} bg={outOfStock > 0 ? "#fef2f2" : "#f3f4f6"} />
        <KpiCard title="O'rtacha narx" value={fmt(avgPrice)} icon={TrendingUp} color="#7c3aed" bg="#f5f3ff" />
      </div>

      {/* Search + Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#9ca3af" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kitob nomi yoki muallif..." style={{ width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        <select value={filterVisibility} onChange={e => setFilterVisibility(e.target.value as any)} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12, fontWeight: 600, color: "#374151", background: "#fff", cursor: "pointer" }}>
          <option value="all">Barchasi</option>
          <option value="visible">👁 Ko'rinadigan</option>
          <option value="hidden">🚫 Yashirin</option>
        </select>
        <select value={filterStock} onChange={e => setFilterStock(e.target.value as any)} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12, fontWeight: 600, color: "#374151", background: "#fff", cursor: "pointer" }}>
          <option value="all">Barcha zaxira</option>
          <option value="in">✓ Mavjud</option>
          <option value="low">⚠ Kam qolgan</option>
          <option value="out">✗ Tugagan</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>Yuklanmoqda...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <BookOpen style={{ width: 48, height: 48, color: "#d1d5db", margin: "0 auto 12px" }} />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>Kitoblar topilmadi</p>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          {/* Table Header */}
          <div style={{ display: "grid", gridTemplateColumns: "48px 1.5fr 1fr 100px 100px 90px 100px", gap: 0, padding: "12px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", alignItems: "center" }}>
            <span></span>
            <button onClick={() => toggleSort("title")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 2, padding: 0 }}>Kitob <SortIcon col="title" /></button>
            <span className="hidden md:block">Kategoriya</span>
            <button onClick={() => toggleSort("price")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 2, padding: 0 }}>Narx <SortIcon col="price" /></button>
            <span>Zaxira</span>
            <span>Do'kon</span>
            <button onClick={() => toggleSort("sales")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 2, padding: 0 }}>Sotildi <SortIcon col="sales" /></button>
          </div>

          {/* Rows */}
          {filtered.map(book => {
            const sales = getSales(book.title);
            const isExpanded = expanded === book.id;
            const isUpdating = updating === book.id;

            return (
              <div key={book.id} style={{ borderBottom: "1px solid #f3f4f6", transition: "background 0.15s" }}>
                <div
                  style={{ display: "grid", gridTemplateColumns: "48px 1.5fr 1fr 100px 100px 90px 100px", gap: 0, padding: "10px 16px", alignItems: "center", cursor: "pointer", opacity: isUpdating ? 0.6 : 1 }}
                  onClick={() => setExpanded(isExpanded ? null : book.id)}
                >
                  {/* Cover */}
                  <div>
                    {book.cover_url ? (
                      <img src={`${imgUrl(book.cover_url)}?t=${Date.now()}`} alt="" style={{ width: 32, height: 44, borderRadius: 4, objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 32, height: 44, borderRadius: 4, background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <BookOpen style={{ width: 14, height: 14, color: "#9ca3af" }} />
                      </div>
                    )}
                  </div>

                  {/* Title + Author */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{book.title}</p>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{book.author}</p>
                  </div>

                  {/* Category */}
                  <div className="hidden md:block">
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 10 }}>
                      {LIBRARY_FILTER_MAP[book.category as keyof typeof LIBRARY_FILTER_MAP] ?? book.category}
                    </span>
                  </div>

                  {/* Price (inline edit) */}
                  <div onClick={e => e.stopPropagation()}>
                    <InlineEdit
                      value={book.price != null ? String(book.price) : ""}
                      onSave={v => updateField(book.id, "price", v ? Number(v) : null)}
                      suffix=" so'm"
                      placeholder="Narxsiz"
                    />
                  </div>

                  {/* Stock (inline edit — always editable) */}
                  <div onClick={e => e.stopPropagation()}>
                    <InlineEdit
                      value={book.stock != null ? String(book.stock) : ""}
                      onSave={v => updateField(book.id, "stock", v !== "" ? Number(v) : null)}
                      placeholder="♾️ Cheksiz"
                    />
                  </div>

                  {/* Shop visible toggle */}
                  <div onClick={e => e.stopPropagation()}>
                    <Toggle
                      on={!!book.shop_visible}
                      onChange={v => updateField(book.id, "shop_visible", v)}
                      disabled={isUpdating}
                    />
                  </div>

                  {/* Sales */}
                  <SalesBadge qty={sales.qty} revenue={sales.revenue} />
                </div>

                {/* Expanded detail */}
                {isExpanded && <BookDetail book={book} sales={sales} onClose={() => setExpanded(null)} />}
              </div>
            );
          })}

          {/* Footer */}
          <div style={{ padding: "12px 16px", background: "#f9fafb", fontSize: 12, color: "#9ca3af", display: "flex", justifyContent: "space-between" }}>
            <span>{filtered.length} ta kitob</span>
            <span>Jami katalogda: {books.length} ta</span>
          </div>
        </div>
      )}
    </div>
  );
}
