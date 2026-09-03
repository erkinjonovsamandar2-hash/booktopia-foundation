import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Package, Wallet, ShoppingCart, Truck, Repeat } from "lucide-react";

// ── Periods ───────────────────────────────────────────────────────────────────
// Every figure used to be lifetime, which meant a good day and a bad day looked
// identical. Days, not dates: the shop is one timezone and this keeps the
// arithmetic honest.
const PERIODS = [
  { key: "today", label: "Bugun", days: 1 },
  { key: "7d",    label: "7 kun", days: 7 },
  { key: "30d",   label: "30 kun", days: 30 },
  { key: "all",   label: "Hammasi", days: null as number | null },
];

const CHART_DAYS = 14;
const DAY_MS = 86400000;

const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; };

// Local day, not toISOString(). Tashkent is UTC+5, so an order placed at 02:00
// carries a UTC date one day earlier — bucketing by ISO date would file this
// morning's orders under yesterday and shift every bar on the chart.
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtSum = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} so'm`;

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

type Order = {
  id: string;
  items: { title?: string; qty?: number }[] | null;
  total_uzs: number | null;
  status: string;
  payment_status: string | null;
  created_at: string;
  telegram_user_id: number | null;
};

const EMPTY = {
  revenue: 0,
  ordersPlaced: 0,
  ordersPaid: 0,
  conversion: 0,
  avgCheck: 0,
  medianDeliveryDays: null as number | null,
  repeatRate: null as number | null,
  topBooks: [] as { title: string; count: number }[],
  chart: [] as { day: string; placed: number; paid: number }[],
};

const BotStats = () => {
  const [period, setPeriod] = useState("30d");
  const [stats, setStats] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      const cfg = PERIODS.find((p) => p.key === period)!;
      // The chart always shows a fortnight, so the window is never narrower
      // than that even when the tiles are showing a single day. One fetch
      // serves both — the alternative was a second round-trip for the chart.
      const windowDays = cfg.days === null ? null : Math.max(cfg.days, CHART_DAYS);
      const since = windowDays === null
        ? null
        : startOfDay(new Date(Date.now() - (windowDays - 1) * DAY_MS));

      let q = (supabase as any)
        .from("miniapp_orders")
        // Lean column list on purpose: this is an admin page, but it is also
        // egress on a free tier, and the description/address fields are dead
        // weight here.
        .select("id, items, total_uzs, status, payment_status, created_at, telegram_user_id")
        // Archived orders are pre-launch and test data.
        .is("archived_at", null);
      if (since) q = q.gte("created_at", since.toISOString());

      // Delivered events carry the timestamp the order actually landed;
      // miniapp_orders only keeps the most recent update, so speed has to come
      // from here. Narrow filter + index, so it stays cheap as orders grow.
      let ev = (supabase as any)
        .from("miniapp_order_events")
        .select("order_id, created_at")
        .eq("status", "delivered");
      if (since) ev = ev.gte("created_at", since.toISOString());

      const [ordersRes, eventsRes] = await Promise.all([q, ev]);
      if (cancelled) return;

      if (ordersRes.error) {
        console.error("[BotStats]", ordersRes.error);
        setError("Ma'lumotlarni yuklab bo'lmadi.");
        setLoading(false);
        return;
      }

      const all: Order[] = ordersRes.data ?? [];
      // An events failure must not blank the whole page — speed is one tile.
      const deliveredAt = new Map<string, string>();
      for (const e of eventsRes.error ? [] : (eventsRes.data ?? [])) {
        const prev = deliveredAt.get(e.order_id);
        if (!prev || e.created_at < prev) deliveredAt.set(e.order_id, e.created_at);
      }

      const periodStart = cfg.days === null
        ? null
        : startOfDay(new Date(Date.now() - (cfg.days - 1) * DAY_MS));
      const inPeriod = periodStart
        ? all.filter((o) => new Date(o.created_at) >= periodStart)
        : all;

      const paid = inPeriod.filter((o) => o.payment_status === "paid");
      const revenue = paid.reduce((s, o) => s + (o.total_uzs || 0), 0);

      // ── Top books, from paid orders only ──
      const bookCounts = new Map<string, number>();
      for (const o of paid) {
        if (!Array.isArray(o.items)) continue;
        for (const item of o.items) {
          if (!item?.title) continue;
          bookCounts.set(item.title, (bookCounts.get(item.title) || 0) + (item.qty || 1));
        }
      }

      // ── Fulfilment speed: placed → delivered ──
      const spans: number[] = [];
      for (const o of inPeriod) {
        const at = deliveredAt.get(o.id);
        if (!at) continue;
        const days = (new Date(at).getTime() - new Date(o.created_at).getTime()) / DAY_MS;
        if (days >= 0) spans.push(days);
      }

      // ── Repeat buyers: customers who ordered more than once in the period ──
      const perCustomer = new Map<number, number>();
      for (const o of inPeriod) {
        if (o.telegram_user_id == null) continue;
        perCustomer.set(o.telegram_user_id, (perCustomer.get(o.telegram_user_id) || 0) + 1);
      }
      const buyers = perCustomer.size;
      const repeaters = [...perCustomer.values()].filter((n) => n > 1).length;

      // ── Last 14 days, whatever the tiles are showing ──
      const chartStart = startOfDay(new Date(Date.now() - (CHART_DAYS - 1) * DAY_MS));
      const buckets = new Map<string, { placed: number; paid: number }>();
      for (let i = 0; i < CHART_DAYS; i++) {
        const d = new Date(chartStart.getTime() + i * DAY_MS);
        buckets.set(dayKey(d), { placed: 0, paid: 0 });
      }
      for (const o of all) {
        const key = dayKey(new Date(o.created_at));
        const b = buckets.get(key);
        if (!b) continue;
        b.placed += 1;
        if (o.payment_status === "paid") b.paid += 1;
      }

      setStats({
        revenue,
        ordersPlaced: inPeriod.length,
        ordersPaid: paid.length,
        conversion: inPeriod.length ? Math.round((paid.length / inPeriod.length) * 100) : 0,
        avgCheck: paid.length ? Math.round(revenue / paid.length) : 0,
        medianDeliveryDays: median(spans),
        repeatRate: buyers ? Math.round((repeaters / buyers) * 100) : null,
        topBooks: [...bookCounts.entries()]
          .map(([title, count]) => ({ title, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        chart: [...buckets.entries()].map(([day, v]) => ({ day, ...v })),
      });
      setLoading(false);
    };

    fetchStats();
    return () => { cancelled = true; };
  }, [period]);

  const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h3 className="text-xl font-bold text-foreground mt-0.5 truncate">
          {loading ? "..." : value}
        </h3>
        {sub && !loading && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  const chartMax = Math.max(1, ...stats.chart.map((d) => d.placed));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sotuv statistikasi</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Bot orqali qilingan savdolar bo'yicha hisobot
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                period === p.key ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* KPI Cards. Labels say exactly which orders each number counts — the
          previous set mixed "all orders" with "paid only" and so never
          reconciled with each other. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Daromad"
          value={fmtSum(stats.revenue)}
          sub="To'langan buyurtmalar"
          icon={Wallet}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          title="Buyurtmalar"
          value={`${stats.ordersPlaced} ta`}
          sub={`${stats.ordersPaid} ta to'langan · ${stats.conversion}%`}
          icon={ShoppingCart}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="O'rtacha chek"
          value={fmtSum(stats.avgCheck)}
          sub="To'langan buyurtmalar bo'yicha"
          icon={TrendingUp}
          color="bg-orange-100 text-orange-600"
        />
        <StatCard
          title="Yetkazish tezligi"
          value={stats.medianDeliveryDays === null ? "—" : `${stats.medianDeliveryDays.toFixed(1)} kun`}
          sub="Buyurtmadan yetkazilgunicha (median)"
          icon={Truck}
          color="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Chart */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Oxirgi {CHART_DAYS} kun</h3>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-200" /> Buyurtma
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-600" /> To'langan
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Yuklanmoqda...</p>
        ) : stats.chart.every((d) => d.placed === 0) ? (
          <p className="text-muted-foreground text-sm">Bu davrda buyurtma bo'lmagan.</p>
        ) : (
          <div className="flex items-end gap-1.5 h-36">
            {stats.chart.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                <div
                  className="w-full bg-blue-200 rounded-sm relative flex items-end"
                  style={{ height: `${(d.placed / chartMax) * 100}%` }}
                  title={`${d.day}: ${d.placed} ta buyurtma, ${d.paid} ta to'langan`}
                >
                  <div
                    className="w-full bg-blue-600 rounded-sm"
                    style={{ height: d.placed ? `${(d.paid / d.placed) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{d.day.slice(8)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Books */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <Package className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Eng ko'p sotilgan kitoblar</h3>
          </div>

          <div className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground text-sm">Yuklanmoqda...</p>
            ) : stats.topBooks.length === 0 ? (
              <p className="text-muted-foreground text-sm">Bu davrda sotuv bo'lmagan.</p>
            ) : (
              stats.topBooks.map((book, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-bold text-muted-foreground w-4">{idx + 1}.</span>
                    <span className="font-medium text-sm line-clamp-1">{book.title}</span>
                  </div>
                  <div className="font-bold text-primary bg-primary/10 px-2 py-1 rounded-md text-xs shrink-0">
                    {book.count} ta
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Repeat buyers */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <Repeat className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Takroriy mijozlar</h3>
          </div>
          {loading ? (
            <p className="text-muted-foreground text-sm">Yuklanmoqda...</p>
          ) : stats.repeatRate === null ? (
            <p className="text-muted-foreground text-sm">Bu davrda mijoz bo'lmagan.</p>
          ) : (
            <>
              <p className="text-4xl font-bold text-foreground">{stats.repeatRate}%</p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Bu davrda buyurtma bergan mijozlarning shuncha qismi bir martadan
                ko'p sotib olgan. Kitob do'koni uchun bu ko'rsatkich buyurtmalar
                sonidan ko'ra muhimroq — qaytib kelgan mijoz reklama pulini talab
                qilmaydi.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BotStats;
