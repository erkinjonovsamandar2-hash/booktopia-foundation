import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Phone, MapPin, CreditCard, ChevronDown, ChevronUp, Search, Filter, Download, Trash2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrderItem { book_id: string; title: string; price: number; qty: number; }
interface Order {
  id: string;
  status: string;
  created_at: string;
  full_name: string;
  phone: string;
  delivery_address: string | null;
  payment_method: string;
  items: OrderItem[];
  total_uzs: number;
  telegram_user_id: number | null;
  telegram_username: string | null;
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
  cash:  "💵 Naqd pul",
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

// ── Order Row / Card ───────────────────────────────────────────────────────────
function OrderRow({
  order, expanded, onToggle, working, onAction, onArchive
}: {
  order: Order; expanded: boolean; onToggle: () => void;
  working: boolean; onAction: (o: Order, nextStatus: string, label: string) => void;
  onArchive: (o: Order) => void;
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
export default function OrdersManager() {
  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState("all");
  const [search, setSearch]       = useState("");
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [working, setWorking]     = useState(false);
  const [confirm, setConfirm]     = useState<{ order: Order; nextStatus: string; label: string } | null>(null);
  const [toast, setToast]         = useState<{ msg: string; type: "success" | "error" } | null>(null);

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
      const res = await fetch("/api/update-order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    if (!confirm(`"${order.full_name}" ning buyurtmasini arxivlaysizmi? Bu buyurtma statistikaga kirmaydi.`)) return;
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

  // ── Filter logic ──────────────────────────────────────────────────────────
  const filtered = orders.filter((o) => {
    if (o.status === "archived" && tab !== "archived") return false; // hide archived unless on archived tab
    const matchTab = tab === "all" || o.status === tab;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (o.full_name || "").toLowerCase().includes(q) ||
      (o.phone || "").includes(q) ||
      (o.telegram_username || "").toLowerCase().includes(q) ||
      (o.items || []).some((i) => i.title?.toLowerCase().includes(q));
    return matchTab && matchSearch;
  });

  const countByTab = (key: string) => key === "all" ? orders.length : orders.filter((o) => o.status === key).length;

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
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {STATUS_TABS.map((t) => {
          const count = countByTab(t.key);
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
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
          {filtered.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              expanded={expanded === order.id}
              onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
              working={working}
              onAction={(o, ns, label) => setConfirm({ order: o, nextStatus: ns, label })}
              onArchive={archiveOrder}
            />
          ))}
          <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 12 }}>
            {filtered.length} ta buyurtma
          </p>
        </div>
      )}
    </div>
  );
}
