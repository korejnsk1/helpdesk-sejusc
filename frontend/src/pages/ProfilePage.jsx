import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, Spinner } from "../components/ui";
import AppHeader from "../components/AppHeader";
import { User, Building2, Shield, Clock, Ticket, KeyRound, ChevronRight } from "lucide-react";
import { maskCpf } from "../lib/cpf";

const ROLE_LABEL = {
  ADMIN:      "Administrador",
  MONITOR:    "Monitor de plantão",
  TECHNICIAN: "Técnico",
  USER:       "Usuário",
};

const ROLE_COLOR = {
  ADMIN:      "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-700",
  MONITOR:    "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 ring-brand-200 dark:ring-brand-700",
  TECHNICIAN: "bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-gray-300 ring-slate-200 dark:ring-gray-600",
  USER:       "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-700",
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/users/me/tickets")
      .then((r) => setTickets(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <AppHeader />

      <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">

        {/* Cabeçalho */}
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Meu perfil</h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">Suas informações e chamados abertos</p>
        </div>

        {/* Card do usuário */}
        <div className="card p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 text-xl font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 dark:text-gray-100 text-base">{user?.name}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${ROLE_COLOR[user?.role] || ROLE_COLOR.USER}`}>
                  <Shield size={10} />
                  {ROLE_LABEL[user?.role] || user?.role}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-gray-800/60 px-4 py-3">
              <User size={15} className="text-slate-400 dark:text-gray-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-slate-400 dark:text-gray-500 mb-0.5">CPF</div>
                <div className="text-sm font-mono font-medium text-slate-800 dark:text-gray-100">
                  {maskCpf(user?.cpf || "")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-gray-800/60 px-4 py-3">
              <Building2 size={15} className="text-slate-400 dark:text-gray-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-slate-400 dark:text-gray-500 mb-0.5">Setor</div>
                <div className="text-sm font-medium text-slate-800 dark:text-gray-100 truncate">
                  {user?.department?.name || "—"}
                </div>
              </div>
            </div>

            {user?.unit && (
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-gray-800/60 px-4 py-3">
                <Shield size={15} className="text-slate-400 dark:text-gray-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-slate-400 dark:text-gray-500 mb-0.5">Unidade GTI</div>
                  <div className="text-sm font-medium text-slate-800 dark:text-gray-100 truncate">
                    {user.unit.name}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-gray-700/60">
            <Link
              to="/trocar-senha"
              className="inline-flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium transition"
            >
              <KeyRound size={14} />
              Alterar senha
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Chamados abertos */}
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

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="card p-10 text-center">
              <Ticket size={32} className="mx-auto text-slate-300 dark:text-gray-600 mb-3" />
              <div className="font-medium text-slate-600 dark:text-gray-400">Nenhum chamado aberto ainda</div>
              <p className="text-sm text-slate-400 dark:text-gray-500 mt-1">
                Seus chamados aparecerão aqui quando você abrir um
              </p>
              <Link to="/novo-chamado" className="btn-primary mt-4 inline-flex">
                Abrir chamado
              </Link>
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
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 dark:text-gray-500 flex items-center gap-1 justify-end">
                        <Clock size={10} />
                        {new Date(t.openedAt).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 dark:text-gray-600" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
