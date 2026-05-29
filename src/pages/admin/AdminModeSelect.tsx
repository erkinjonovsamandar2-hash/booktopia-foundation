import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, ShoppingBag, LogOut, ArrowRight } from "lucide-react";

const MODES = [
  {
    id: "cms",
    icon: BookOpen,
    color: "#265999",
    bg: "#EBF4FF",
    title: "Kontent Boshqaruvi",
    subtitle: "CMS",
    desc: "Kitoblar, Blog, Quiz, Jamoa, Hamkorlar, Sozlamalar",
    route: "/admin",
    items: ["📚 Kitoblar katalogi", "✍️ Blog maqolalari", "🎯 Quiz savollari", "👥 Jamoa", "⚙️ Sozlamalar"],
  },
  {
    id: "bot",
    icon: ShoppingBag,
    color: "#38A169",
    bg: "#EBF8F0",
    title: "Bot Savdo Boshqaruvi",
    subtitle: "SALES",
    desc: "Buyurtmalar, Mijozlar, Statistika",
    route: "/admin/bot",
    items: ["📦 Buyurtmalar", "👤 Mijozlar", "📊 Statistika", "📣 Xabarnoma"],
  },
];

export default function AdminModeSelect() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleSelect = (mode: typeof MODES[0]) => {
    localStorage.setItem("booktopia_admin_mode", mode.id);
    navigate(mode.route);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0A192F 0%, #132D55 60%, #1A3A6B 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background texture */}
      <div
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(rgba(0,205,254,0.06) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Gold glow orb */}
      <div style={{
        position: "absolute", top: -100, right: -100, width: 400, height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(213,173,54,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 680 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            width: 56, height: 56,
            background: "rgba(255,255,255,0.1)",
            borderRadius: 16, backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
            border: "1px solid rgba(255,255,255,0.15)",
          }}>
            <BookOpen style={{ width: 28, height: 28, color: "#00CDFE" }} />
          </div>
          <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 800, margin: "0 0 8px" }}>
            Booktopia Admin
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, fontWeight: 500, margin: 0 }}>
            Ish rejimini tanlang
          </p>
        </div>

        {/* Mode cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => handleSelect(mode)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 20,
                  padding: "28px 24px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  backdropFilter: "blur(12px)",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)";
                  (e.currentTarget as HTMLElement).style.borderColor = mode.color;
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
                  (e.currentTarget as HTMLElement).style.transform = "none";
                }}
              >
                {/* Top badge */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 20,
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: mode.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon style={{ width: 24, height: 24, color: mode.color }} />
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
                    color: mode.color, background: `${mode.color}18`,
                    padding: "4px 10px", borderRadius: 20,
                  }}>
                    {mode.subtitle}
                  </span>
                </div>

                {/* Title */}
                <h2 style={{ color: "#fff", fontSize: 17, fontWeight: 800, margin: "0 0 6px" }}>
                  {mode.title}
                </h2>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 500, margin: "0 0 20px" }}>
                  {mode.desc}
                </p>

                {/* Items list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {mode.items.map((item) => (
                    <div key={item} style={{
                      fontSize: 12, color: "rgba(255,255,255,0.55)",
                      fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                {/* Arrow */}
                <div style={{
                  position: "absolute", bottom: 20, right: 20,
                  color: mode.color, opacity: 0.7,
                }}>
                  <ArrowRight style={{ width: 18, height: 18 }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 32, display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4px",
        }}>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>
            {user?.email}
          </p>
          <button
            onClick={() => signOut()}
            style={{
              background: "none", border: "none",
              color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              padding: "6px 0",
            }}
          >
            <LogOut style={{ width: 14, height: 14 }} />
            Chiqish
          </button>
        </div>
      </div>
    </div>
  );
}
