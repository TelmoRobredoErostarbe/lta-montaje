import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoginPage } from "@/pages/LoginPage";
import { Layout } from "@/components/Layout";
import { CoordEventosPage } from "@/pages/coord/CoordEventosPage";
import { CoordEventoDetallePage } from "@/pages/coord/CoordEventoDetallePage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminEventoDetallePage } from "@/pages/admin/AdminEventoDetallePage";
import { AdminPlantillasPage } from "@/pages/admin/AdminPlantillasPage";
import { GuidePage } from "@/pages/GuidePage";

function AuthGuard({ children, require: req }: { children: React.ReactNode; require?: "admin" }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (req === "admin" && !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { loading, isAdmin } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  return isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/eventos" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Coordinador */}
        <Route path="/eventos" element={<AuthGuard><Layout><CoordEventosPage /></Layout></AuthGuard>} />
        <Route path="/evento/:id" element={<AuthGuard><Layout><CoordEventoDetallePage /></Layout></AuthGuard>} />

        {/* Admin */}
        <Route path="/admin" element={<AuthGuard require="admin"><Layout><AdminDashboardPage /></Layout></AuthGuard>} />
        <Route path="/admin/evento/:id" element={<AuthGuard require="admin"><Layout><AdminEventoDetallePage /></Layout></AuthGuard>} />
        <Route path="/admin/plantillas" element={<AuthGuard require="admin"><Layout><AdminPlantillasPage /></Layout></AuthGuard>} />

        {/* Guía (todos) */}
        <Route path="/guia" element={<AuthGuard><Layout><GuidePage /></Layout></AuthGuard>} />

        <Route path="/" element={<AuthGuard><RootRedirect /></AuthGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
