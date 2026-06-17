import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Home, LogOut, Settings } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  const homeRoute = isAdmin ? "/admin" : "/";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 h-0 overflow-hidden" />

      <main>{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-20 safe-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-around px-6 py-2 pb-safe">
          <button
            onClick={() => navigate(homeRoute)}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors ${location.pathname === homeRoute || location.pathname === "/" ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
          >
            <Home size={20} />
            <span className="text-[10px] font-medium">Inicio</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate("/admin/plantillas")}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors ${location.pathname === "/admin/plantillas" ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
            >
              <Settings size={20} />
              <span className="text-[10px] font-medium">Plantillas</span>
            </button>
          )}

          <button
            onClick={handleSignOut}
            className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
          >
            <LogOut size={20} />
            <span className="text-[10px] font-medium">Salir</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
