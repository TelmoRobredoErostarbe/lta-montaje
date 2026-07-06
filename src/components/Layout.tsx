import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Home, Settings, LogOut, BookOpen, Boxes } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  const homeRoute = isAdmin ? "/admin" : "/eventos";

  const navItems = [
    { route: homeRoute, icon: Home, label: "Inicio", match: (p: string) => p === "/admin" || p === "/eventos" || p.startsWith("/evento/") || p.startsWith("/admin/evento/") },
    ...(isAdmin ? [
      { route: "/admin/plantillas", icon: Settings, label: "Plantillas", match: (p: string) => p === "/admin/plantillas" },
      { route: "/admin/inventario", icon: Boxes, label: "Inventario", match: (p: string) => p === "/admin/inventario" },
    ] : []),
    { route: "/guia", icon: BookOpen, label: "Guía", match: (p: string) => p === "/guia" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "hsl(220 13% 95%)" }}>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b" style={{ background: "hsl(0 0% 100%)", borderColor: "hsl(220 13% 91%)", height: "56px", boxShadow: "var(--shadow-sm)" }}>
        <div className="max-w-2xl mx-auto px-4 h-full flex items-center justify-between">
          <img src="/lasttour-logo.png" alt="Last Tour" className="h-7 w-auto object-contain" />
          <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "hsl(24 95% 53%)" }}>Montaje</span>
        </div>
      </header>

      <main className="pb-24">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 pb-safe" style={{ background: "hsl(0 0% 100% / 0.95)", backdropFilter: "blur(12px)", borderTop: "1px solid hsl(220 13% 91%)" }}>
        <div className="max-w-2xl mx-auto flex items-center justify-around px-2" style={{ height: "64px" }}>
          {navItems.map(item => {
            const active = item.match(location.pathname);
            return (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors focus:outline-none"
              >
                <item.icon
                  size={20}
                  style={{ color: active ? "hsl(24 95% 53%)" : "hsl(218 11% 65%)" }}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span
                  className="text-[10px] font-semibold leading-none"
                  style={{ color: active ? "hsl(24 95% 53%)" : "hsl(218 11% 65%)" }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors focus:outline-none"
          >
            <LogOut size={20} style={{ color: "hsl(218 11% 65%)" }} strokeWidth={1.8} />
            <span className="text-[10px] font-semibold leading-none" style={{ color: "hsl(218 11% 65%)" }}>Salir</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
