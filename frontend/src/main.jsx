import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import NewTicketPage from "./pages/NewTicketPage";
import TrackPage from "./pages/TrackPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import UsersPage from "./pages/UsersPage";
import "./index.css";

function Protected({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "ADMIN") return <Navigate to="/painel" replace />;
  return children;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Público */}
          <Route path="/" element={<HomePage />} />
          <Route path="/novo-chamado" element={<NewTicketPage />} />
          <Route path="/acompanhar/:ticketNumber" element={<TrackPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />

          {/* Área autenticada */}
          <Route path="/painel" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/painel/chamado/:id" element={<Protected><TicketDetailPage /></Protected>} />
          <Route path="/painel/relatorios" element={<Protected><AnalyticsPage /></Protected>} />

          {/* Monitor only */}
          <Route path="/painel/usuarios" element={<Protected adminOnly><UsersPage /></Protected>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
