import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import NewTicketPage from "./pages/NewTicketPage";
import TrackPage from "./pages/TrackPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import "./index.css";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/novo-chamado" element={<NewTicketPage />} />
          <Route path="/acompanhar/:ticketNumber" element={<TrackPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/painel" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/painel/chamado/:id" element={<Protected><TicketDetailPage /></Protected>} />
          <Route path="/painel/relatorios" element={<Protected><AnalyticsPage /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
