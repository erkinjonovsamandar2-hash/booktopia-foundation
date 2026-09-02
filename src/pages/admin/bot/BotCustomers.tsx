import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, Phone, User, ShoppingBag } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  tgId: string | null;
  tgUsername: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
  phones: string[];
}

const BotCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("miniapp_orders")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders for customers:", error);
        setLoading(false);
        return;
      }

      // Group by Telegram id first, falling back to phone. Grouping on phone
      // alone split one person into several customers whenever they ordered
      // with a different number — the same Telegram account appearing three
      // times as three "different" people.
      const customerMap = new Map<string, Customer>();

      (data || []).forEach((order: any) => {
        const key = order.telegram_user_id
          ? `tg:${order.telegram_user_id}`
          : `phone:${order.phone || "unknown"}`;

        if (!customerMap.has(key)) {
          customerMap.set(key, {
            id: key,
            name: order.full_name || "Noma'lum",
            phone: order.phone || "Noma'lum",
            tgId: order.telegram_user_id,
            tgUsername: order.telegram_username,
            orderCount: 0,
            totalSpent: 0,
            lastOrderDate: order.created_at,
            phones: [],
          });
        }

        const cust = customerMap.get(key)!;
        cust.orderCount += 1;
        if (order.payment_status === 'paid') {
          cust.totalSpent += order.total_uzs || 0;
        }
        // Keep every number they have ordered with, so support can reach them.
        if (order.phone && !cust.phones.includes(order.phone)) {
          cust.phones.push(order.phone);
        }
        // Newest order wins for the display name and the last-order date.
        if (order.created_at > cust.lastOrderDate) {
          cust.lastOrderDate = order.created_at;
          if (order.full_name) cust.name = order.full_name;
        }
      });

      setCustomers(Array.from(customerMap.values()));
      setLoading(false);
    };

    fetchCustomers();
  }, []);

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phones.some((p) => p.includes(search)) ||
    c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mijozlar bazasi</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Bot orqali xarid qilgan barcha mijozlaringiz ro'yxati ({customers.length} ta)
          </p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Ism yoki raqam bo'yicha qidirish..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-muted-foreground font-medium">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Mijoz</th>
                <th className="px-4 py-3 whitespace-nowrap">Aloqa</th>
                <th className="px-4 py-3 whitespace-nowrap text-center">Xaridlar</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Umumiy summa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Yuklanmoqda...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Mijozlar topilmadi.</td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{c.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Oxirgi: {new Date(c.lastOrderDate).toLocaleDateString('uz-UZ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{c.phone}</span>
                      </div>
                      {c.tgId && (
                        <div className="flex items-center gap-2 mt-1">
                          <User className="h-3 w-3 text-[#0088cc]" />
                          <a 
                            href={`tg://user?id=${c.tgId}`} 
                            className="text-xs text-[#0088cc] hover:underline"
                          >
                            {c.tgUsername ? `@${c.tgUsername}` : "Telegram profil"}
                          </a>
                        </div>
                      )}
                      {c.phones.length > 1 && (
                        <div className="text-[11px] text-muted-foreground mt-1">
                          +{c.phones.length - 1} boshqa raqam
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {/* Reading that someone has 3 orders is only half useful
                          if you cannot then go and look at them. This carries
                          the customer's phone into the orders search. */}
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/bot?q=${encodeURIComponent(c.phones[0] || c.phone)}`)}
                        title="Buyurtmalarini ko'rish"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        <ShoppingBag className="h-3 w-3" />
                        {c.orderCount} ta
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">
                      {c.totalSpent.toLocaleString('ru-RU')} so'm
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BotCustomers;
