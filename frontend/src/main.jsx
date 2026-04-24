import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import HomePage from "./pages/HomePage";
import NewTicketPage from "./pages/NewTicketPage";
import TrackPage from "./pages/TrackPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import UsersPage from "./pages/UsersPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import ProfilePage from "./pages/ProfilePage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import "./index.css";

const STAFF_ROLES = ["TECHNICIAN", "MONITOR", "ADMIN"];

function Protected({ children, adminOnly = false, staffOnly = false }) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
      <div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  // Troca de senha obrigatória
  if (user.mustChangePassword && loc.pathname !== "/trocar-senha") {
    return <Navigate to="/trocar-senha" replace />;
  }

  // Rotas admin-only
  if (adminOnly && user.role !== "ADMIN") return <Navigate to="/painel" replace />;

  // Rotas staff-only: USER simples vai para o perfil
  if (staffOnly && !STAFF_ROLES.includes(user.role)) {
    return <Navigate to="/perfil" replace />;
  }

  return children;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Público */}
            <Route path="/" element={<HomePage />} />
            <Route path="/novo-chamado" element={<NewTicketPage />} />
            <Route path="/acompanhar/:ticketNumber" element={<TrackPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<RegisterPage />} />
            <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />

            {/* Qualquer usuário logado */}
            <Route path="/perfil" element={<Protected><ProfilePage /></Protected>} />
            <Route path="/trocar-senha" element={<Protected><ChangePasswordPage /></Protected>} />

            {/* Staff (TECHNICIAN, MONITOR, ADMIN) */}
            <Route path="/painel" element={<Protected staffOnly><DashboardPage /></Protected>} />
            <Route path="/painel/chamado/:id" element={<Protected staffOnly><TicketDetailPage /></Protected>} />
            <Route path="/painel/relatorios" element={<Protected staffOnly><AnalyticsPage /></Protected>} />

            {/* Admin only */}
            <Route path="/painel/usuarios" element={<Protected adminOnly><UsersPage /></Protected>} />
            <Route path="/painel/setores" element={<Protected adminOnly><DepartmentsPage /></Protected>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
