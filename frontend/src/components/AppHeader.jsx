import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LayoutDashboard, BarChart2, LogOut } from "lucide-react";

export default function AppHeader() {
  const { user, logout } = useAuth();
  const loc = useLocation();

  const navLink = (to, label, Icon) => (
    <Link
      to={to}
      className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition ${
        loc.pathname === to
          ? "bg-brand-50 text-brand-700"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
      }`}
    >
      <Icon size={15} />
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/painel" className="flex items-center gap-2 shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white text-sm font-bold">
            HD
          </span>
          <span className="hidden sm:block text-sm font-semibold text-slate-800">
            HelpDesk <span className="text-slate-400 font-normal">SEJUSC</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {navLink("/painel", "Painel", LayoutDashboard)}
          {navLink("/painel/relatorios", "Relatórios", BarChart2)}
        </nav>

        {/* User */}
        <div className="flex items-center gap-3 text-sm shrink-0">
          <div className="hidden sm:block text-right">
            <div className="font-medium text-slate-800 leading-tight">{user?.name}</div>
            <div className="text-xs text-slate-500">
              {user?.role === "MONITOR" ? "Monitor de plantão" : "Técnico"}
              {user?.unit ? ` · ${user.unit.name}` : ""}
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition text-sm"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
