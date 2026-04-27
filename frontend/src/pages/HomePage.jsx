import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { PlusCircle, Search, ChevronRight, Headset, Sun, Moon, LogIn, UserPlus } from "lucide-react";

export default function HomePage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const [ticketInput, setTicketInput] = useState("");

  function handleTrack(e) {
    e.preventDefault();
    const n = ticketInput.trim();
    if (n) nav(`/acompanhar/${n}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">

      {/* Barra institucional */}
      <header className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          {/* Logo Governo do Amazonas */}
          <img
            src="/logo-governo-am.png"
            alt="Governo do Estado do Amazonas"
            className="h-10 object-contain dark:brightness-90"
          />

          {/* Divisor */}
          <div className="h-8 w-px bg-slate-200 dark:bg-gray-700 shrink-0" />

          {/* Identidade SEJUSC */}
          <div className="flex-1 text-right">
            <div className="text-xs font-bold text-slate-700 dark:text-gray-200 leading-tight tracking-wide">SEJUSC</div>
            <div className="text-[10px] text-slate-500 dark:text-gray-400 leading-tight">
              Secretaria de Estado de Justiça,<br />
              Direitos Humanos e Cidadania
            </div>
          </div>

          {/* Toggle de tema */}
          <button
            onClick={toggle}
            title={dark ? "Modo claro" : "Modo escuro"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition shrink-0"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Icon + title */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-card-md mb-4">
              <Headset size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Central de Suporte TI</h1>
            <p className="mt-1.5 text-slate-500 dark:text-gray-400 text-sm">SEJUSC</p>
          </div>

          {/* Cards de ação */}
          <div className="space-y-3">
            {user ? (
              /* ── Usuário autenticado ── */
              <>
                <Link
                  to="/novo-chamado"
                  className="group flex items-center gap-4 w-full card px-5 py-4 hover:shadow-card-md hover:-translate-y-0.5 transition duration-200"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white group-hover:bg-brand-700 transition">
                    <PlusCircle size={20} />
                  </span>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-slate-800 dark:text-gray-100">Abrir chamado</div>
                    <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Solicite suporte técnico</div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 dark:text-gray-600 group-hover:text-brand-500 transition" />
                </Link>

                <div className="card px-5 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300">
                      <Search size={20} />
                    </span>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-gray-100">Acompanhar chamado</div>
                      <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Informe o número do protocolo</div>
                    </div>
                  </div>
                  <form onSubmit={handleTrack} className="flex gap-2">
                    <input
                      className="field-input flex-1"
                      placeholder="Ex.: 20260417-0001"
                      value={ticketInput}
                      onChange={(e) => setTicketInput(e.target.value)}
                    />
                    <button type="submit" disabled={!ticketInput.trim()} className="btn-primary shrink-0">
                      Buscar
                    </button>
                  </form>
                </div>
              </>
            ) : (
              /* ── Usuário não autenticado ── */
              <>
                <div className="card px-6 py-6 text-center">
                  <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">
                    Para abrir um chamado, acesse sua conta ou crie uma nova.
                  </p>
                  <div className="flex gap-3">
                    <Link
                      to="/login"
                      className="flex-1 flex items-center justify-center gap-2 btn-primary py-2.5 text-sm"
                    >
                      <LogIn size={15} />
                      Entrar
                    </Link>
                    <Link
                      to="/cadastro"
                      className="flex-1 flex items-center justify-center gap-2 btn-secondary py-2.5 text-sm"
                    >
                      <UserPlus size={15} />
                      Criar conta
                    </Link>
                  </div>
                </div>

                <div className="card px-5 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300">
                      <Search size={20} />
                    </span>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-gray-100">Acompanhar chamado</div>
                      <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Informe o número do protocolo</div>
                    </div>
                  </div>
                  <form onSubmit={handleTrack} className="flex gap-2">
                    <input
                      className="field-input flex-1"
                      placeholder="Ex.: 20260417-0001"
                      value={ticketInput}
                      onChange={(e) => setTicketInput(e.target.value)}
                    />
                    <button type="submit" disabled={!ticketInput.trim()} className="btn-primary shrink-0">
                      Buscar
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Rodapé institucional */}
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
