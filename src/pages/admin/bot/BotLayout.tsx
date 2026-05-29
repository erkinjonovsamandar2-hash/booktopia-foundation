import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Package, Users, BarChart3, Megaphone, Menu, X, Home, LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const BotLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await (supabase as any)
        .from("miniapp_orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (count != null) setPendingCount(count);
    };
    fetchPending();

    const channel = (supabase as any)
      .channel("miniapp_orders_badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "miniapp_orders" }, fetchPending)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const navItems = [
    { label: "Buyurtmalar",  to: "/admin/bot",          icon: Package,    end: true, badge: pendingCount },
    { label: "Mijozlar",     to: "/admin/bot/customers", icon: Users },
    { label: "Statistika",   to: "/admin/bot/stats",     icon: BarChart3 },
    { label: "Xabarnoma",    to: "/admin/bot/broadcast", icon: Megaphone },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-60
        bg-white border-r border-gray-200
        flex flex-col transition-transform lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <span className="font-bold text-foreground text-lg">
              Booktopia <span style={{ color: "#38A169" }}>Sales</span>
            </span>
            <div style={{
              display: "inline-block", marginLeft: 8,
              background: "#EBF8F0", color: "#38A169",
              fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
              padding: "2px 7px", borderRadius: 20,
            }}>
              BOT
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded hover:bg-gray-100">
            <X className="h-5 w-5 text-muted-foreground/80" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? "bg-green-50 text-green-700"
                  : "text-foreground/70 hover:bg-gray-100 hover:text-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {"badge" in item && (item.badge ?? 0) > 0 && (
                <span className="ml-auto rounded-full bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {(item.badge ?? 0) > 99 ? "99+" : item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-1">
          <button
            onClick={() => navigate("/admin/select")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-gray-100 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Rejimni o'zgartirish
          </button>
          <a
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-gray-100 hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" /> Saytga qaytish
          </a>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Chiqish
          </button>
          {user && (
            <p className="px-3 pt-1 text-xs text-muted-foreground/80 truncate">{user.email}</p>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
          >
            <Menu className="h-5 w-5 text-foreground/70" />
          </button>
          <span className="text-sm text-muted-foreground font-medium">Bot Savdo Paneli</span>
          {pendingCount > 0 && (
            <span className="ml-auto text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">
              {pendingCount} ta yangi buyurtma
            </span>
          )}
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default BotLayout;
