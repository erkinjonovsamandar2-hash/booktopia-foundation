import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Package, Wallet, ShoppingCart } from "lucide-react";

const BotStats = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    completedOrders: 0,
    topBooks: [] as { title: string; count: number }[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("miniapp_orders")
        .select("items, total_uzs, status");

      if (error) {
        console.error("Error fetching stats:", error);
        setLoading(false);
        return;
      }

      let revenue = 0;
      let completed = 0;
      const bookCounts = new Map<string, number>();

      (data || []).forEach((order: any) => {
        // Only count non-cancelled for revenue
        if (order.status !== "cancelled") {
          revenue += order.total_uzs || 0;
          if (order.status === "delivered" || order.status === "approved" || order.status === "delivering") {
            completed += 1;
          }
          
          // Aggregate books
          if (Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              const current = bookCounts.get(item.title) || 0;
              bookCounts.set(item.title, current + (item.qty || 1));
            });
          }
        }
      });

      // Sort top books
      const sortedBooks = Array.from(bookCounts.entries())
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5

      setStats({
        totalRevenue: revenue,
        totalOrders: data?.length || 0,
        completedOrders: completed,
        avgOrderValue: completed > 0 ? Math.round(revenue / completed) : 0,
        topBooks: sortedBooks,
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={`h-14 w-14 rounded-full flex items-center justify-center ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h3 className="text-2xl font-bold text-foreground mt-1">
          {loading ? "..." : value}
        </h3>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sotuv statistikasi</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bot orqali qilingan savdolar bo'yicha umumiy hisobot
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Umumiy Daromad" 
          value={`${stats.totalRevenue.toLocaleString('ru-RU')} so'm`} 
          icon={Wallet} 
          color="bg-green-100 text-green-600" 
        />
        <StatCard 
          title="Jami Buyurtmalar" 
          value={`${stats.totalOrders} ta`} 
          icon={ShoppingCart} 
          color="bg-blue-100 text-blue-600" 
        />
        <StatCard 
          title="Muvaffaqiyatli" 
          value={`${stats.completedOrders} ta`} 
          icon={Package} 
          color="bg-purple-100 text-purple-600" 
        />
        <StatCard 
          title="O'rtacha Chek" 
          value={`${stats.avgOrderValue.toLocaleString('ru-RU')} so'm`} 
          icon={TrendingUp} 
          color="bg-orange-100 text-orange-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Books */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Eng ko'p sotilgan kitoblar</h3>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground text-sm">Yuklanmoqda...</p>
            ) : stats.topBooks.length === 0 ? (
              <p className="text-muted-foreground text-sm">Hozircha ma'lumot yo'q.</p>
            ) : (
              stats.topBooks.map((book, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-4">{idx + 1}.</span>
                    <span className="font-medium text-sm line-clamp-1">{book.title}</span>
                  </div>
                  <div className="font-bold text-primary bg-primary/10 px-2 py-1 rounded-md text-xs">
                    {book.count} ta
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-primary mb-2">Tahliliy Ma'lumotlar</h3>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Hozirgi vaqtda barcha statistika ma'lumotlari <b>barcha vaqt</b> uchun hisoblangan. 
            Tizim orqali qabul qilingan va bekor qilinmagan buyurtmalar jami daromadga qo'shiladi. 
            Mijozlarning sotib olish qarorlarini tahlil qilish orqali qaysi kitoblarga ko'proq reklama berishni hal qilishingiz mumkin.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BotStats;
