import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Home, Settings, LogOut } from "lucide-react";

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
    ...(isAdmin ? [{ route: "/admin/plantillas", icon: Settings, label: "Plantillas", match: (p: string) => p === "/admin/plantillas" }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <img src="/lasttour-logo.png" alt="Last Tour" className="h-6 w-auto object-contain" />
          <span className="text-xs font-medium text-slate-400 tracking-wide uppercase">Montaje</span>
        </div>
      </header>

      <main className="pb-20">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-20">
        <div className="max-w-2xl mx-auto flex items-center justify-around px-4 py-1.5">
          {navItems.map(item => {
            const active = item.match(location.pathname);
            return (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className={`flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl transition-colors ${active ? "text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
              >
                <item.icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
          >
            <LogOut size={20} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Salir</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
