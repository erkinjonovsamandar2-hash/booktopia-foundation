import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Package, Phone, MapPin, CreditCard, ChevronDown, ChevronUp, Search, Filter, Download, Trash2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrderItem { book_id: string; title: string; price: number; qty: number; }
interface Order {
  id: string;
  status: string;
  payment_status: string | null;
  created_at: string;
  full_name: string;
  phone: string;
  delivery_address: string | null;
  payment_method: string;
  items: OrderItem[];
  total_uzs: number;
  telegram_user_id: number | null;
  telegram_username: string | null;
  updated_at?: string | null;
  archived_at?: string | null;
  payme_transaction_id?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
}

interface OrderEvent {
  id: string;
  order_id: string;
  status: string;
  note: string | null;
  created_at: string;
}

interface CustomerSummary {
  orderCount: number;
  lifetimeTotal: number;
  firstOrderAt: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_FLOW: Record<string, string[]> = {
  pending:    ["approved", "cancelled"],
  approved:   ["delivering", "cancelled"],
  delivering: ["delivered", "cancelled"],
  delivered:  [],
  cancelled:  [],
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "Kutilmoqda",    color: "#D5AD36", bg: "#FBF6E3" },
  approved:   { label: "Tasdiqlandi",   color: "#3182CE", bg: "#EBF8FF" },
  delivering: { label: "Yetkazilmoqda", color: "#805AD5", bg: "#FAF5FF" },
  delivered:  { label: "Yetkazildi",    color: "#38A169", bg: "#EBF8F0" },
  cancelled:  { label: "Bekor qilindi", color: "#E53E3E", bg: "#FFF5F5" },
  archived:   { label: "Arxivlandi",    color: "#9ca3af", bg: "#F3F4F6" },
};

const STATUS_TABS = [
  { key: "all",       label: "Barchasi" },
  { key: "pending",   label: "Yangi" },
  { key: "approved",  label: "Tasdiqlandi" },
  { key: "delivering",label: "Yo'lda" },
  { key: "delivered", label: "Yetkazildi" },
  { key: "cancelled", label: "Bekor" },
];

const NEXT_ACTION_LABELS: Record<string, { label: string; color: string; nextStatus: string }[]> = {
  pending:    [{ label: "✅ Tasdiqlash", color: "#38A169", nextStatus: "approved" }, { label: "❌ Bekor", color: "#E53E3E", nextStatus: "cancelled" }],
  approved:   [{ label: "🚚 Yo'lga chiqdi", color: "#805AD5", nextStatus: "delivering" }, { label: "❌ Bekor", color: "#E53E3E", nextStatus: "cancelled" }],
  delivering: [{ label: "📦 Yetkazildi", color: "#3182CE", nextStatus: "delivered" }, { label: "❌ Bekor", color: "#E53E3E", nextStatus: "cancelled" }],
};

const PAYMENT_LABELS: Record<string, string> = {
  payme: "💳 Payme",
  click: "💳 Click",
};

const PAYMENT_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  paid:             { label: "✅ To'langan",    color: "#38A169", bg: "#EBF8F0" },
  unpaid:           { label: "⏳ Kutilmoqda",   color: "#D5AD36", bg: "#FBF6E3" },
  pending_payment:  { label: "⏳ Jarayonda",    color: "#805AD5", bg: "#FAF5FF" },
  failed:           { label: "❌ Bekor",        color: "#E53E3E", bg: "#FFF5F5" },
  cash:             { label: "💵 Naqd",         color: "#6b7280", bg: "#F3F4F6" },
};

function fmt(n: number) { return n ? `${Number(n).toLocaleString("ru-RU")} so'm` : "—"; }
function fmtDate(s: string) {
  return s ? new Date(s).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({
  order, nextStatus, label, onConfirm, onCancel, working
}: {
  order: Order; nextStatus: string; label: string;
  onConfirm: () => void; onCancel: () => void; working: boolean;
}) {
  const meta = STATUS_META[nextStatus];
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "rgba(0,0,0,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "32px 28px",
        maxWidth: 380, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>
          {nextStatus === "cancelled" ? "❌" : nextStatus === "delivered" ? "📦" : "✅"}
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#111827" }}>
          Tasdiqlaysizmi?
        </h3>
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "#6b7280" }}>
          <strong>{order.full_name}</strong> ning buyurtmasi
        </p>
        <div style={{
          display: "inline-block", marginBottom: 20,
          background: meta.bg, color: meta.color,
          fontSize: 12, fontWeight: 700, padding: "4px 14px",
          borderRadius: 20,
        }}>
          → {meta.label}
        </div>
        <p style={{ margin: "0 0 24px", fontSize: 12, color: "#9ca3af" }}>
          Mijozga Telegram orqali xabar yuboriladi.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} disabled={working} style={{
            flex: 1, padding: "10px", borderRadius: 10,
            border: "1px solid #e5e7eb", background: "#f9fafb",
            color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: 14,
          }}>
            Bekor
          </button>
          <button onClick={onConfirm} disabled={working} style={{
            flex: 1, padding: "10px", borderRadius: 10, border: "none",
            background: nextStatus === "cancelled" ? "#ef4444" : "#38A169",
            color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14,
            opacity: working ? 0.6 : 1,
          }}>
            {working ? "..." : label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
      color: meta.color, background: meta.bg,
      padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
    }}>
      {meta.label}
    </span>
  );
}

// ── Payment Status Badge ───────────────────────────────────────────────────────
function PaymentStatusBadge({ paymentStatus }: { paymentStatus: string | null }) {
  const meta = PAYMENT_STATUS_META[paymentStatus || 'unpaid'] ?? PAYMENT_STATUS_META.unpaid;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      color: meta.color, background: meta.bg,
      padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap",
    }}>
      {meta.label}
    </span>
  );
}

// ── Order Row / Card ───────────────────────────────────────────────────────────
function OrderRow({
  order, expanded, onToggle, working, onAction, onArchive, customer
}: {
  order: Order; expanded: boolean; onToggle: () => void;
  working: boolean; onAction: (o: Order, nextStatus: string, label: string) => void;
  onArchive: (o: Order) => void;
  customer?: CustomerSummary;
}) {
  const actions = NEXT_ACTION_LABELS[order.status] ?? [];
  const firstItem = order.items?.[0];
  const moreCount = (order.items?.length ?? 0) - 1;

  return (
    <div style={{
      background: "#fff", borderRadius: 14, marginBottom: 10,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      border: `1px solid ${expanded ? "#265999" : "#e5e7eb"}`,
      overflow: "hidden", transition: "border-color 0.2s",
    }}>
      {/* Main row */}
      <div
        style={{ padding: "14px 16px", cursor: "pointer", userSelect: "none" }}
        onClick={onToggle}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Top: name + status + date */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{order.full_name || "—"}</span>
              <StatusBadge status={order.status} />
              <PaymentStatusBadge paymentStatus={order.payment_status} />
              <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>{fmtDate(order.created_at)}</span>
            </div>

            {/* Book title */}
            {firstItem && (
              <p style={{ fontSize: 13, color: "#374151", margin: "0 0 4px" }}>
                📚 {firstItem.title}
                {moreCount > 0 && <span style={{ color: "#9ca3af" }}> +{moreCount} ta</span>}
              </p>
            )}

            {/* Phone + total */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}>
                <Phone style={{ width: 12, height: 12 }} /> {order.phone}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#265999" }}>
                {fmt(order.total_uzs)}
              </span>
            </div>
          </div>

          {/* Chevron */}
          <div style={{ color: "#9ca3af", flexShrink: 0 }}>
            {expanded ? <ChevronUp style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: "1px solid #f3f4f6", padding: "14px 16px" }}>
          {/* Items list */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Kitoblar
            </p>
            {order.items?.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#374151", marginBottom: 4 }}>
                <span>{item.title} × {item.qty}</span>
                <span style={{ fontWeight: 600 }}>{fmt((item.price || 0) * item.qty)}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #f3f4f6", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>Jami</span>
              <span style={{ color: "#265999" }}>{fmt(order.total_uzs)}</span>
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 12px" }}>
              <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, margin: "0 0 2px" }}>TO'LOV</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>
                {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
              </p>
            </div>
            {order.delivery_address && (
              <div style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 12px" }}>
                <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, margin: "0 0 2px" }}>MANZIL</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>{order.delivery_address}</p>
              </div>
            )}
            {order.telegram_username && (
              <div style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 12px" }}>
                <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, margin: "0 0 2px" }}>TELEGRAM</p>
                <a
                  href={`https://t.me/${order.telegram_username}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, fontWeight: 600, color: "#265999", margin: 0, display: "block", textDecoration: "none" }}
                >
                  @{order.telegram_username}
                </a>
              </div>
            )}
          </div>

          {/* Full record — everything stored on the order */}
          <OrderFullDetail order={order} customer={customer} />

          {/* Action buttons */}
          {actions.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {actions.map((action) => (
                <button
                  key={action.nextStatus}
                  onClick={() => onAction(order, action.nextStatus, action.label)}
                  disabled={working}
                  style={{
                    padding: "8px 16px", borderRadius: 8, border: "none",
                    background: action.color, color: "#fff",
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                    opacity: working ? 0.6 : 1,
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Archive button */}
          <div style={{ marginTop: 10, borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>
            <button
              onClick={() => onArchive(order)}
              disabled={working}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e7eb",
                background: "#fff", color: "#9ca3af", fontWeight: 600, fontSize: 12,
                cursor: "pointer", opacity: working ? 0.6 : 1,
              }}
            >
              <Trash2 style={{ width: 13, height: 13 }} /> Arxivlash (Yashirish)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const PAGE_SIZES = [5, 10, 20, 0] as const; // 0 = show all

export default function OrdersManager() {
  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState("all");
  const [searchParams] = useSearchParams();
  const [search, setSearch]       = useState(searchParams.get("q") ?? "");
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [working, setWorking]     = useState(false);
  const [confirm, setConfirm]     = useState<{ order: Order; nextStatus: string; label: string } | null>(null);
  const [toast, setToast]         = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [pageSize, setPageSize]   = useState<number>(5);
  const [visibleCount, setVisibleCount] = useState<number>(5);

  // ── Fetch orders ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("miniapp_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setOrders(data);
      setLoading(false);
    };
    fetch();

    const channel = (supabase as any)
      .channel("orders_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "miniapp_orders" }, (payload: any) => {
        if (payload.eventType === "INSERT") {
          setOrders((prev) => [payload.new as Order, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setOrders((prev) => prev.map((o) => o.id === payload.new.id ? payload.new as Order : o));
        } else if (payload.eventType === "DELETE") {
          setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Update order status via secure API ───────────────────────────────────
  const updateStatus = useCallback(async (orderId: string, nextStatus: string) => {
    setWorking(true);
    try {
      // The endpoint verifies this token and the caller's admin role.
      const { data: sessionData } = await (supabase as any).auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const res = await fetch("/api/update-order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ order_id: orderId, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Status yangilandi → ${STATUS_META[nextStatus]?.label}`);
    } catch (err: any) {
      showToast(`Xatolik: ${err.message}`, "error");
    }
    setWorking(false);
    setConfirm(null);
  }, []);

  // ── Archive order (soft delete — sets status to 'archived') ─────────────
  const archiveOrder = useCallback(async (order: Order) => {
    // window.confirm — the local `confirm` state shadows the global here.
    if (!window.confirm(`"${order.full_name}" ning buyurtmasini arxivlaysizmi? Bu buyurtma statistikaga kirmaydi.`)) return;
    setWorking(true);
    try {
      const { error } = await (supabase as any)
        .from("miniapp_orders")
        .update({ status: "archived" })
        .eq("id", order.id);
      if (error) throw error;
      showToast(`Arxivlandi: ${order.full_name}`);
    } catch (err: any) {
      showToast(`Xatolik: ${err.message}`, "error");
    }
    setWorking(false);
  }, []);

  // Lifetime view of the customer behind an order, keyed on Telegram id when
  // present and phone otherwise, so the same person is recognised either way.
  const customerSummary = (order: Order): CustomerSummary => {
    const key = order.telegram_user_id ?? order.phone;
    const mine = orders.filter((o) =>
      (o.telegram_user_id ?? o.phone) === key && o.status !== "cancelled");
    return {
      orderCount: mine.length,
      lifetimeTotal: mine.reduce((s, o) => s + (o.total_uzs || 0), 0),
      firstOrderAt: mine.length
        ? mine.map((o) => o.created_at).sort()[0]
        : null,
    };
  };

  // ── Filter logic ──────────────────────────────────────────────────────────
  // Pre-launch orders carry archived_at; they are kept in full but excluded
  // from the working lists, exactly like a manually archived order.
  const isArchived = (o: Order) => o.status === "archived" || !!(o as any).archived_at;

  const filtered = orders.filter((o) => {
    if (isArchived(o) && tab !== "archived") return false; // hide archived unless on archived tab
    const matchTab = tab === "all" || o.status === tab || (tab === "archived" && isArchived(o));
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (o.full_name || "").toLowerCase().includes(q) ||
      (o.phone || "").includes(q) ||
      (o.telegram_username || "").toLowerCase().includes(q) ||
      (o.items || []).some((i) => i.title?.toLowerCase().includes(q));
    return matchTab && matchSearch;
  });

  const countByTab = (key: string) =>
    key === "all"      ? orders.filter((o) => !isArchived(o)).length
  : key === "archived" ? orders.filter((o) => isArchived(o)).length
  :                      orders.filter((o) => o.status === key && !isArchived(o)).length;

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["ID", "Ism", "Telefon", "Manzil", "To'lov", "Jami", "Status", "Sana"];
    const escape  = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escape).join(","),
      ...filtered.map((o) => [
        o.id?.toString().slice(0, 8),
        o.full_name, o.phone, o.delivery_address,
        o.payment_method, o.total_uzs,
        STATUS_META[o.status]?.label ?? o.status,
        new Date(o.created_at).toLocaleDateString("uz-UZ"),
      ].map(escape).join(",")),
    ].join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `buyurtmalar_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === "error" ? "#fee2e2" : "#dcfce7",
          border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#86efac"}`,
          color: toast.type === "error" ? "#991b1b" : "#15803d",
          borderRadius: 12, padding: "10px 18px", fontWeight: 600, fontSize: 13,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}>
          {toast.msg}
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          order={confirm.order}
          nextStatus={confirm.nextStatus}
          label={confirm.label}
          working={working}
          onConfirm={() => updateStatus(confirm.order.id, confirm.nextStatus)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>Buyurtmalar</h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          Bot orqali kelgan buyurtmalarni boshqarish
        </p>
      </div>

      {/* Search + Export */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#9ca3af" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism, telefon, kitob nomi..."
            style={{
              width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
              border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 13,
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <button onClick={exportCSV} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "9px 14px", borderRadius: 10, border: "1px solid #e5e7eb",
          background: "#f9fafb", color: "#374151", fontWeight: 600, fontSize: 13,
          cursor: "pointer",
        }}>
          <Download style={{ width: 14, height: 14 }} /> CSV
        </button>
      </div>

      {/* Status tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        {STATUS_TABS.map((t) => {
          const count = countByTab(t.key);
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setVisibleCount(pageSize || 9999); }}
              style={{
                padding: "6px 12px", borderRadius: 20, border: "none",
                background: active ? "#265999" : "#f3f4f6",
                color: active ? "#fff" : "#374151",
                fontWeight: 600, fontSize: 12, cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t.label}
              <span style={{ marginLeft: 4, opacity: 0.7 }}>({count})</span>
            </button>
          );
        })}

        {/* Page size selector */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>Ko'rsatish:</span>
          {PAGE_SIZES.map((size) => {
            const active = pageSize === size;
            return (
              <button
                key={size}
                onClick={() => { setPageSize(size); setVisibleCount(size || 9999); }}
                style={{
                  padding: "4px 8px", borderRadius: 6, border: "none",
                  background: active ? "#265999" : "transparent",
                  color: active ? "#fff" : "#6b7280",
                  fontWeight: 700, fontSize: 11, cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {size === 0 ? "Barchasi" : size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>Yuklanmoqda...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Package style={{ width: 48, height: 48, color: "#d1d5db", margin: "0 auto 12px" }} />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>Buyurtmalar yo'q</p>
        </div>
      ) : (
        <div>
          {filtered.slice(0, visibleCount).map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              expanded={expanded === order.id}
              onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
              working={working}
              onAction={(o, ns, label) => setConfirm({ order: o, nextStatus: ns, label })}
              onArchive={archiveOrder}
              customer={customerSummary(order)}
            />
          ))}

          {/* Pagination footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16, paddingBottom: 8 }}>
            {visibleCount < filtered.length && (
              <button
                onClick={() => setVisibleCount((prev) => Math.min(prev + (pageSize || 5), filtered.length))}
                style={{
                  padding: "8px 20px", borderRadius: 10, border: "1px solid #e5e7eb",
                  background: "#fff", color: "#265999", fontWeight: 700, fontSize: 13,
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#EBF4FF"; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "#fff"; }}
              >
                Ko'proq ko'rsatish ({Math.min(pageSize || 5, filtered.length - visibleCount)} ta)
              </button>
            )}
            {visibleCount < filtered.length && filtered.length > (pageSize || 5) && (
              <button
                onClick={() => setVisibleCount(filtered.length)}
                style={{
                  padding: "8px 14px", borderRadius: 10, border: "none",
                  background: "transparent", color: "#9ca3af", fontWeight: 600, fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Barchasini ko'rsatish ({filtered.length})
              </button>
            )}
          </div>

          <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 4 }}>
            {Math.min(visibleCount, filtered.length)} / {filtered.length} ta buyurtma
          </p>
        </div>
      )}
    </div>
  );
}


// ── Full order + customer record ──────────────────────────────────────────────
// Everything miniapp_orders stores, plus the event timeline and a lifetime view
// of the customer. Previously the expanded row showed only items, payment
// method, address and Telegram handle.
function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{
      background: "#f9fafb", borderRadius: 8, padding: "8px 12px",
      gridColumn: wide ? "1 / -1" : undefined, minWidth: 0,
    }}>
      <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, margin: "0 0 2px", letterSpacing: "0.04em" }}>{label}</p>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0, wordBreak: "break-word" }}>{children}</div>
    </div>
  );
}

function OrderFullDetail({ order, customer }: { order: Order; customer?: CustomerSummary }) {
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [eventsState, setEventsState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("miniapp_order_events")
        .select("id, order_id, status, note, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) { setEventsState("error"); return; }
      setEvents(data ?? []);
      setEventsState("ready");
    })();
    return () => { cancelled = true; };
  }, [order.id]);

  const dt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const hasCoords = typeof order.delivery_lat === "number" && typeof order.delivery_lng === "number";

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        To'liq ma'lumot
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field label="BUYURTMA ID">
          <span style={{ fontFamily: "monospace", fontSize: 11 }}>{order.id}</span>
        </Field>
        <Field label="TO'LOV HOLATI">
          <span style={{ color: order.payment_status === "paid" ? "#38A169" : "#D5AD36" }}>
            {order.payment_status === "paid" ? "To'langan" : order.payment_status || "To'lanmagan"}
          </span>
        </Field>

        <Field label="MIJOZ">{order.full_name || "—"}</Field>
        <Field label="TELEFON">
          {order.phone
            ? <a href={`tel:+${order.phone}`} style={{ color: "#265999", textDecoration: "none" }}>+{order.phone}</a>
            : "—"}
        </Field>

        <Field label="TELEGRAM ID">
          {order.telegram_user_id ?? <span style={{ color: "#9ca3af" }}>Tasdiqlanmagan</span>}
        </Field>
        <Field label="TELEGRAM">
          {order.telegram_username
            ? <a href={`https://t.me/${order.telegram_username}`} target="_blank" rel="noopener noreferrer" style={{ color: "#265999", textDecoration: "none" }}>@{order.telegram_username}</a>
            : "—"}
        </Field>

        <Field label="MANZIL" wide>{order.delivery_address || <span style={{ color: "#9ca3af" }}>Kiritilmagan</span>}</Field>

        {hasCoords && (
          <Field label="GPS" wide>
            <a
              href={`https://maps.google.com/?q=${order.delivery_lat},${order.delivery_lng}`}
              target="_blank" rel="noopener noreferrer"
              style={{ color: "#265999", textDecoration: "none" }}
            >
              {order.delivery_lat!.toFixed(5)}, {order.delivery_lng!.toFixed(5)} — xaritada ochish
            </a>
          </Field>
        )}

        {order.payme_transaction_id && (
          <Field label="PAYME TRANZAKSIYA" wide>
            <span style={{ fontFamily: "monospace", fontSize: 11 }}>{order.payme_transaction_id}</span>
          </Field>
        )}

        <Field label="YARATILGAN">{dt(order.created_at)}</Field>
        <Field label="YANGILANGAN">{dt(order.updated_at)}</Field>

        {order.archived_at && (
          <Field label="ARXIVLANGAN" wide>{dt(order.archived_at)}</Field>
        )}
      </div>

      {/* Customer lifetime view */}
      {customer && (
        <div style={{ marginTop: 12, background: "#EBF8FF", border: "1px solid #bee3f8", borderRadius: 8, padding: "10px 12px" }}>
          <p style={{ fontSize: 10, color: "#2c5282", fontWeight: 700, margin: "0 0 4px", letterSpacing: "0.04em" }}>MIJOZ TARIXI</p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#2c5282", fontWeight: 600 }}>
            <span>{customer.orderCount} ta buyurtma</span>
            <span>Jami: {fmt(customer.lifetimeTotal)}</span>
            {customer.firstOrderAt && <span>Birinchi: {dt(customer.firstOrderAt)}</span>}
          </div>
        </div>
      )}

      {/* Event timeline */}
      <div style={{ marginTop: 12 }}>
        <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, margin: "0 0 6px", letterSpacing: "0.04em" }}>TARIX</p>
        {eventsState === "loading" && <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Yuklanmoqda...</p>}
        {eventsState === "error" && <p style={{ fontSize: 12, color: "#E53E3E", margin: 0 }}>Tarixni yuklab bo'lmadi.</p>}
        {eventsState === "ready" && events.length === 0 && (
          <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Hodisalar yo'q.</p>
        )}
        {eventsState === "ready" && events.map((ev) => (
          <div key={ev.id} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12, color: "#374151", padding: "3px 0" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_META[ev.status]?.color ?? "#9ca3af", flexShrink: 0 }} />
            <span style={{ fontWeight: 700 }}>{STATUS_META[ev.status]?.label ?? ev.status}</span>
            <span style={{ color: "#9ca3af" }}>{dt(ev.created_at)}</span>
            {ev.note && <span style={{ color: "#6b7280" }}>— {ev.note}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
