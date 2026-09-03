import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BookOpen, FileText, Sparkles, Menu, X,
  Home, LogOut, Settings, ShieldCheck, MessageSquare, Newspaper, Users, GalleryHorizontal, Handshake, Library, ArrowLeftRight, Link as LinkIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await (supabase as any)
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (count != null) setPendingCount(count);
    };
    fetchPending();

    const channel = (supabase as any)
      .channel("reviews_pending_badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, fetchPending)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const navItems = [
    { label: "Kitoblar", to: "/admin", icon: BookOpen, end: true },
    { label: "Tanlangan kitoblar", to: "/admin/curated", icon: Library },
    { label: "Tez Orada", to: "/admin/new-books", icon: Newspaper },
    { label: "Blog", to: "/admin/blog", icon: FileText },
    { label: "Quiz", to: "/admin/quiz", icon: Sparkles },
    { label: "Jamoa", to: "/admin/team", icon: Users },
    { label: "Hamkorlar", to: "/admin/partners", icon: Handshake },
    { label: "Links Sahifasi", to: "/admin/links", icon: LinkIcon },
    { label: "Hero Tartibi", to: "/admin/hero-order", icon: GalleryHorizontal },
    { label: "Sharhlar", to: "/admin/reviews", icon: MessageSquare, badge: pendingCount },
    { label: "Sozlamalar", to: "/admin/settings", icon: Settings },
    { label: "Adminlar", to: "/admin/users", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-60
        bg-white border-r border-gray-200
        flex flex-col transition-transform lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <span className="font-bold text-foreground text-lg">
            Booktopia <span className="text-accent">CMS</span>
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded hover:bg-gray-100"
          >
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
                  ? "bg-primary/5 text-primary/90"
                  : "text-foreground/70 hover:bg-gray-100 hover:text-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {"badge" in item && item.badge > 0 && (
                <span className="ml-auto rounded-full bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {item.badge > 99 ? "99+" : item.badge}
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
            <ArrowLeftRight className="h-4 w-4" /> Rejimni o'zgartirish
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

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
          >
            <Menu className="h-5 w-5 text-foreground/70" />
          </button>
          <span className="text-sm text-muted-foreground font-medium">Admin Panel</span>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;