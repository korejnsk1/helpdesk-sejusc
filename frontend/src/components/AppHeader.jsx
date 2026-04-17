import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { LayoutDashboard, BarChart2, LogOut, Users, ShieldCheck } from "lucide-react";

export default function AppHeader() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [monitors, setMonitors] = useState([]);

  useEffect(() => {
    api.get("/monitors").then((r) => setMonitors(r.data));
    if (user?.role === "MONITOR") {
      api.get("/users?active=false").then((r) => {
        setPendingCount(r.data.filter((u) => u.role === "TECHNICIAN").length);
      });
    }
    const t = setInterval(() => {
      api.get("/monitors").then((r) => setMonitors(r.data));
      if (user?.role === "MONITOR") {
        api.get("/users?active=false").then((r) => {
          setPendingCount(r.data.filter((u) => u.role === "TECHNICIAN").length);
        });
      }
    }, 30000);
    return () => clearInterval(t);
  }, [user]);

  const navLink = (to, label, Icon, badge = 0) => (
    <Link
      to={to}
      className={`relative flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition ${
        loc.pathname === to
          ? "bg-brand-50 text-brand-700"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
      }`}
    >
      <Icon size={15} />
      {label}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
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
          {user?.role === "MONITOR" &&
            navLink("/painel/usuarios", "Usuários", Users, pendingCount)}
        </nav>

        {/* Monitor de plantão + user */}
        <div className="flex items-center gap-3 text-sm shrink-0">
          {/* Badge monitor de plantão */}
          {monitors.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs text-brand-700">
              <ShieldCheck size={12} />
              <span className="font-medium">
                {monitors.map((m) => m.name.split(" ")[0]).join(", ")}
              </span>
            </div>
          )}

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
