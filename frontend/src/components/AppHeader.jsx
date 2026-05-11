import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../lib/api";
import {
  LayoutDashboard, BarChart2, LogOut, Users,
  Crown, Sun, Moon, Building2, ChevronDown, UserCircle, Ticket, KeyRound, ClipboardList, Lightbulb,
} from "lucide-react";

const ROLE_LABEL = {
  ADMIN:      "Administrador",
  TECHNICIAN: "Técnico",
  USER:       "Usuário",
};

const STAFF_ROLES = ["TECHNICIAN", "ADMIN"];

export default function AppHeader() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const loc = useLocation();
  const nav = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [resetCount,   setResetCount]   = useState(0);
  const [osOpenCount,  setOsOpenCount]  = useState(0);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);

  const isStaff = STAFF_ROLES.includes(user?.role);
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    function handle(e) {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    function fetchCounts() {
      api.get("/users?role=USER").then((r) => setPendingCount(r.data.length));
      api.get("/password-reset-requests").then((r) => setResetCount(r.data.length)).catch(() => {});
    }
    fetchCounts();
    const t = setInterval(fetchCounts, 30000);
    return () => clearInterval(t);
  }, [isAdmin]);

  useEffect(() => {
    if (!isStaff) return;
    function fetchOsCount() {
      api.get("/work-orders?status=ABERTA").then((r) => setOsOpenCount(r.data.length)).catch(() => {});
    }
    fetchOsCount();
    const t = setInterval(fetchOsCount, 30000);
    return () => clearInterval(t);
  }, [isStaff]);

  const isActive = (path) => loc.pathname === path;
  const isActiveSearch = (path, search) => loc.pathname === path && loc.search.includes(search);

  const navCls = (active) =>
    `relative flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
      active
        ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
    }`;

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/95 backdrop-blur-md border-b border-slate-200 dark:border-gray-700">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">

        {/* ── Brand ── */}
        <Link to={isStaff ? "/painel" : "/perfil"} className="flex items-center gap-2 shrink-0 mr-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white text-sm font-bold shadow-sm">
            HD
          </span>
          <span className="hidden md:block text-sm font-semibold text-slate-800 dark:text-gray-100">
            HelpDesk <span className="text-slate-400 dark:text-gray-500 font-normal">SEJUSC</span>
          </span>
        </Link>

        {/* ── Nav ── */}
        <nav className="flex items-center gap-0.5 flex-1 min-w-0">

          {/* USER */}
          {!isStaff && (
            <Link to="/perfil" className={navCls(isActive("/perfil"))}>
              <Ticket size={15} />
              <span className="hidden sm:inline">Meus chamados</span>
            </Link>
          )}

          {/* STAFF + ADMIN */}
          {isStaff && (
            <Link to="/painel" className={navCls(isActive("/painel"))}>
              <LayoutDashboard size={15} />
              <span className="hidden sm:inline">Painel</span>
            </Link>
          )}

          {isStaff && (
            <Link to="/painel/relatorios" className={navCls(isActive("/painel/relatorios"))}>
              <BarChart2 size={15} />
              <span className="hidden sm:inline">Relatórios</span>
            </Link>
          )}

          {isStaff && (
            <Link to="/painel/os" className={navCls(loc.pathname.startsWith("/painel/os"))}>
              {osOpenCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {osOpenCount > 9 ? "9+" : osOpenCount}
                </span>
              )}
              <ClipboardList size={15} />
              <span className="hidden sm:inline">OS</span>
            </Link>
          )}

          {/* ADMIN only */}
          {isAdmin && (
            <Link to="/painel/usuarios" className={navCls(isActive("/painel/usuarios") && !loc.search.includes("tab=resets"))}>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
              <Users size={15} />
              <span className="hidden sm:inline">Usuários</span>
            </Link>
          )}

          {isAdmin && (
            <Link to="/painel/setores" className={navCls(isActive("/painel/setores"))}>
              <Building2 size={15} />
              <span className="hidden sm:inline">Setores</span>
            </Link>
          )}

          {isAdmin && (
            <Link to="/painel/n1" className={navCls(isActive("/painel/n1"))}>
              <Lightbulb size={15} />
              <span className="hidden sm:inline">N1</span>
            </Link>
          )}

          {isAdmin && (
            <Link to="/painel/usuarios?tab=resets" className={navCls(isActiveSearch("/painel/usuarios", "tab=resets"))}>
              {resetCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {resetCount > 9 ? "9+" : resetCount}
                </span>
              )}
              <KeyRound size={15} />
              <span className="hidden sm:inline">Redefinições</span>
            </Link>
          )}
        </nav>

        {/* ── Lado direito ── */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Toggle tema */}
          <button
            onClick={toggle}
            title={dark ? "Modo claro" : "Modo escuro"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Dropdown do usuário */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserOpen((o) => !o)}
              className="hidden sm:flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-gray-800 transition"
            >
              {isAdmin && <Crown size={11} className="text-amber-500 shrink-0" />}
              <div className="text-right leading-tight max-w-[120px]">
                <div className="text-sm font-medium text-slate-800 dark:text-gray-100 truncate">
                  {user?.name?.split(" ")[0]}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-gray-400 truncate">
                  {ROLE_LABEL[user?.role] || user?.role}
                </div>
              </div>
              <ChevronDown size={12} className={`text-slate-400 dark:text-gray-500 transition-transform duration-200 ${userOpen ? "rotate-180" : ""}`} />
            </button>

            {userOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden z-50">
                <Link
                  to="/perfil"
                  onClick={() => setUserOpen(false)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition ${
                    isActive("/perfil")
                      ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 font-medium"
                      : "text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <UserCircle size={15} />
                  Meu perfil
                </Link>
                <div className="h-px bg-slate-100 dark:bg-gray-700/60" />
                <button
                  onClick={async () => { setUserOpen(false); await logout(); nav("/login"); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  <LogOut size={15} />
                  Sair
                </button>
              </div>
            )}
          </div>

          {/* Logout mobile (só icone) */}
          <button
            onClick={async () => { await logout(); nav("/login"); }}
            title="Sair"
            className="sm:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
