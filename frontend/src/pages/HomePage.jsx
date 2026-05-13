import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../lib/api";
import { maskCpf, isValidCpf } from "../lib/cpf";
import { Alert, Spinner, StatusBadge } from "../components/ui";
import {
  Headset, Sun, Moon, LogIn, UserPlus, PlusCircle,
  LogOut, Clock, ChevronRight, Ticket, KeyRound, Search,
} from "lucide-react";

const STAFF_ROLES = ["TECHNICIAN", "ADMIN"];

export default function HomePage() {
  const nav = useNavigate();
  const { user, login, logout, loading: authLoading } = useAuth();
  const { dark, toggle } = useTheme();

  const [cpf, setCpf]           = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr]           = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [trackNum, setTrackNum] = useState("");

  const [tickets, setTickets]           = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.mustChangePassword) { nav("/trocar-senha", { replace: true }); return; }
    if (STAFF_ROLES.includes(user.role)) { nav("/painel", { replace: true }); }
  }, [user]);

  useEffect(() => {
    if (user && !STAFF_ROLES.includes(user.role)) {
      setLoadingTickets(true);
      api.get("/users/me/tickets")
        .then((r) => setTickets(r.data))
        .finally(() => setLoadingTickets(false));
    }
  }, [user]);

  async function handleLogin(e) {
    e.preventDefault();
    setErr("");
    if (!isValidCpf(cpf)) return setErr("CPF inválido. Verifique e tente novamente.");
    setLoggingIn(true);
    try {
      const u = await login(cpf, password);
      if (STAFF_ROLES.includes(u.role)) nav("/painel", { replace: true });
    } catch (ex) {
      setErr(ex.response?.data?.error || "Credenciais incorretas.");
    } finally {
      setLoggingIn(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">

      {/* Barra institucional */}
      <header className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <img
            src="/logo-governo-am.png"
            alt="Governo do Estado do Amazonas"
            className="h-10 object-contain dark:brightness-90"
          />
          <div className="h-8 w-px bg-slate-200 dark:bg-gray-700 shrink-0" />
          <div className="flex-1 text-right">
            <div className="text-xs font-bold text-slate-700 dark:text-gray-200 leading-tight tracking-wide">SEJUSC</div>
            <div className="text-[10px] text-slate-500 dark:text-gray-400 leading-tight">
              Secretaria de Estado de Justiça,<br />
              Direitos Humanos e Cidadania
            </div>
          </div>
          <button
            onClick={toggle}
            title={dark ? "Modo claro" : "Modo escuro"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition shrink-0"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-start px-4 py-10">
        <div className="w-full max-w-md">

          {/* Brand */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-card-md mb-3">
              <Headset size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Central de Suporte TI</h1>
            <p className="mt-1 text-slate-500 dark:text-gray-400 text-sm">SEJUSC</p>
          </div>

          {/* ── Acompanhar chamado (sempre visível) ── */}
          {!user && (
            <form
              onSubmit={(e) => { e.preventDefault(); if (trackNum.trim()) nav(`/acompanhar/${trackNum.trim().toUpperCase()}`); }}
              className="card p-4 flex gap-2 mb-2"
            >
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  className="field-input pl-8 py-2 text-sm w-full font-mono"
                  placeholder="Número do chamado (ex: 20250513-0001)"
                  value={trackNum}
                  onChange={(e) => setTrackNum(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={!trackNum.trim()}
                className="btn-secondary py-2 px-4 text-sm shrink-0 disabled:opacity-40"
              >
                Acompanhar
              </button>
            </form>
          )}

          {!user ? (
            /* ── Não autenticado: formulário de login ── */
            <>
              <form onSubmit={handleLogin} className="card p-6 space-y-4">
                <div>
                  <label className="field-label">CPF</label>
                  <input
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    className="field-input"
                    value={cpf}
                    onChange={(e) => setCpf(maskCpf(e.target.value))}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="field-label">Senha</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="field-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Alert message={err} />
                <button type="submit" disabled={loggingIn} className="btn-primary w-full py-2.5">
                  {loggingIn ? <Spinner className="h-4 w-4" /> : <LogIn size={16} />}
                  {loggingIn ? "Entrando..." : "Entrar"}
                </button>
              </form>

              <div className="mt-5 flex flex-col items-center gap-2">
                <Link
                  to="/cadastro"
                  className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium transition"
                >
                  <UserPlus size={14} />
                  Primeiro acesso? Criar conta
                </Link>
                <Link
                  to="/esqueci-senha"
                  className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition"
                >
                  <KeyRound size={14} />
                  Esqueci minha senha
                </Link>
              </div>
            </>
          ) : (
            /* ── Autenticado: painel do usuário ── */
            <div className="space-y-4">

              {/* Cabeçalho do usuário */}
              <div className="card px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 font-semibold text-sm">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-gray-100 truncate">{user.name?.split(" ")[0]}</div>
                    <div className="text-xs text-slate-500 dark:text-gray-400">{maskCpf(user.cpf || "")}</div>
                  </div>
                </div>
                <button
                  onClick={async () => { await logout(); }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition shrink-0"
                  title="Sair"
                >
                  <LogOut size={14} />
                  Sair
                </button>
              </div>

              {/* Botão abrir chamado */}
              <Link
                to="/novo-chamado"
                className="group flex items-center gap-4 w-full card px-5 py-4 hover:shadow-card-md hover:-translate-y-0.5 transition duration-200"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white group-hover:bg-brand-700 transition">
                  <PlusCircle size={20} />
                </span>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-slate-800 dark:text-gray-100">Abrir novo chamado</div>
                  <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Solicite suporte técnico</div>
                </div>
                <ChevronRight size={18} className="text-slate-300 dark:text-gray-600 group-hover:text-brand-500 transition" />
              </Link>

              {/* Lista de chamados */}
              <div>
                <h2 className="text-sm font-semibold text-slate-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Ticket size={15} />
                  Meus chamados
                  {tickets.length > 0 && (
                    <span className="rounded-full bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 px-2 py-0.5 text-xs font-medium">
                      {tickets.length}
                    </span>
                  )}
                </h2>

                {loadingTickets ? (
                  <div className="flex items-center justify-center py-12">
                    <Spinner className="h-6 w-6" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="card p-8 text-center">
                    <Ticket size={28} className="mx-auto text-slate-300 dark:text-gray-600 mb-2" />
                    <div className="text-sm font-medium text-slate-600 dark:text-gray-400">Nenhum chamado aberto</div>
                    <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">Seus chamados aparecerão aqui</p>
                  </div>
                ) : (
                  <div className="card divide-y divide-slate-100 dark:divide-gray-700/60">
                    {tickets.map((t) => (
                      <Link
                        key={t.id}
                        to={`/acompanhar/${t.ticketNumber}`}
                        className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-gray-800/60 transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-semibold text-slate-600 dark:text-gray-300">
                              {t.ticketNumber}
                            </span>
                            <StatusBadge status={t.status} />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                            <span>{t.category}</span>
                            {t.unit && <><span>·</span><span>{t.unit}</span></>}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <div className="text-xs text-slate-400 dark:text-gray-500 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(t.openedAt).toLocaleDateString("pt-BR")}
                          </div>
                          <ChevronRight size={14} className="text-slate-300 dark:text-gray-600" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-4 text-center">
        <img
          src="/logo-gov.svg"
          alt="Governo do Amazonas"
          className="h-8 object-contain mx-auto opacity-40 dark:opacity-20 dark:brightness-0 dark:invert"
        />
      </footer>
    </div>
  );
}
