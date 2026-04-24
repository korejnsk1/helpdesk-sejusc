import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../lib/api";
import {
  LayoutDashboard, BarChart2, LogOut, Users, ShieldCheck,
  Crown, Sun, Moon, Building2, ChevronDown,
} from "lucide-react";

const ROLE_LABEL = {
  ADMIN:      "Administrador",
  MONITOR:    "Monitor de plantão",
  TECHNICIAN: "Técnico",
};

export default function AppHeader() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const loc = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [monitors, setMonitors] = useState([]);
  const [adminOpen, setAdminOpen] = useState(false);
  const adminRef = useRef(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handle(e) {
      if (adminRef.current && !adminRef.current.contains(e.target)) {
        setAdminOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    api.get("/monitors").then((r) => setMonitors(r.data));
    if (user?.role === "ADMIN") {
      api.get("/users?active=false").then((r) =>
        setPendingCount(r.data.filter((u) => u.role === "TECHNICIAN").length)
      );
    }
    const t = setInterval(() => {
      api.get("/monitors").then((r) => setMonitors(r.data));
      if (user?.role === "ADMIN") {
        api.get("/users?active=false").then((r) =>
          setPendingCount(r.data.filter((u) => u.role === "TECHNICIAN").length)
        );
      }
    }, 30000);
    return () => clearInterval(t);
  }, [user]);

  const isActive = (to) => loc.pathname === to;

  const navCls = (to) =>
    `flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
      isActive(to)
        ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
    }`;

  const adminIsActive = ["/painel/usuarios", "/painel/setores"].includes(loc.pathname);

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/95 backdrop-blur-md border-b border-slate-200 dark:border-gray-700">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">

        {/* ── Brand ── */}
        <Link to="/painel" className="flex items-center gap-2 shrink-0 mr-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white text-sm font-bold shadow-sm">
            HD
          </span>
          <span className="hidden md:block text-sm font-semibold text-slate-800 dark:text-gray-100">
            HelpDesk <span className="text-slate-400 dark:text-gray-500 font-normal">SEJUSC</span>
          </span>
        </Link>

        {/* ── Nav principal ── */}
        <nav className="flex items-center gap-0.5 flex-1 min-w-0">
          <Link to="/painel" className={navCls("/painel")}>
            <LayoutDashboard size={15} />
            <span className="hidden sm:inline">Painel</span>
          </Link>

          <Link to="/painel/relatorios" className={navCls("/painel/relatorios")}>
            <BarChart2 size={15} />
            <span className="hidden sm:inline">Relatórios</span>
          </Link>

          {/* Dropdown Admin */}
          {user?.role === "ADMIN" && (
            <div className="relative" ref={adminRef}>
              <button
                onClick={() => setAdminOpen((o) => !o)}
                className={`relative flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition ${
                  adminIsActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {/* Badge de pendentes */}
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold z-10">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
                <Crown size={14} className="text-amber-500" />
                <span className="hidden sm:inline">Admin</span>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${adminOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown */}
              {adminOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-44 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden z-50">
                  <Link
                    to="/painel/usuarios"
                    onClick={() => setAdminOpen(false)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition ${
                      isActive("/painel/usuarios")
                        ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 font-medium"
                        : "text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Users size={15} />
                    Usuários
                    {pendingCount > 0 && (
                      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-bold">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/painel/setores"
                    onClick={() => setAdminOpen(false)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition ${
                      isActive("/painel/setores")
                        ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 font-medium"
                        : "text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Building2 size={15} />
                    Setores
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* ── Lado direito ── */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Monitor de plantão */}
          {monitors.length > 0 && user?.role !== "ADMIN" && (
            <div className="hidden lg:flex items-center gap-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/30 px-2.5 py-1 text-xs text-brand-700 dark:text-brand-400">
              <ShieldCheck size={12} />
              <span className="font-medium truncate max-w-[120px]">
                {monitors.map((m) => m.name.split(" ")[0]).join(", ")}
              </span>
            </div>
          )}

          {/* Toggle tema */}
          <button
            onClick={toggle}
            title={dark ? "Modo claro" : "Modo escuro"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Usuário */}
          <div className="hidden sm:block text-right leading-tight max-w-[140px]">
            <div className="flex items-center gap-1 justify-end">
              {user?.role === "ADMIN" && <Crown size={11} className="text-amber-500 shrink-0" />}
              <span className="text-sm font-medium text-slate-800 dark:text-gray-100 truncate">
                {user?.name?.split(" ")[0]}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-gray-400 truncate">
              {ROLE_LABEL[user?.role] || user?.role}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            title="Sair"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
