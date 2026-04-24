import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { StatusBadge, KpiCard, Spinner } from "../components/ui";
import AppHeader from "../components/AppHeader";
import { formatElapsed } from "../lib/statuses";
import {
  Ticket, AlertCircle, Activity, CheckCircle2,
  ChevronRight, Clock, RefreshCw,
} from "lucide-react";

const ACTIVE_STATUSES = ["OPEN", "VIEWED", "EN_ROUTE", "IN_SERVICE"];

const FILTER_TABS = [
  { key: "active",    label: "Ativos" },
  { key: "completed", label: "Concluídos" },
  { key: "all",       label: "Todos" },
];

export default function DashboardPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, []);

  async function load() {
    try {
      const { data } = await api.get("/tickets");
      setTickets(data);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }

  // KPI counts
  const active    = tickets.filter((t) => ACTIVE_STATUSES.includes(t.status));
  const completed = tickets.filter((t) => t.status === "COMPLETED");
  const noUnit    = tickets.filter((t) => !t.unit);

  // Filtro de exibição
  const visible = filter === "active"
    ? active
    : filter === "completed"
    ? completed
    : tickets;

  // Agrupar por unidade
  const byUnit = visible.reduce((acc, t) => {
    const key = t.unit?.name || "__sem_unidade__";
    (acc[key] = acc[key] || []).push(t);
    return acc;
  }, {});

  const sortedUnits = Object.entries(byUnit).sort(([a]) =>
    a === "__sem_unidade__" ? -1 : 1
  );

  const now = new Date();
  const dateLabel = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <AppHeader />

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">

        {/* Cabeçalho da página */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-gray-100 capitalize">{dateLabel}</h1>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5 flex items-center gap-1.5">
              <Clock size={11} />
              Atualizado às {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition"
          >
            <RefreshCw size={13} />
            Atualizar
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            title="Total hoje"
            value={tickets.length}
            icon={Ticket}
            sub={`${active.length} ativo${active.length !== 1 ? "s" : ""}`}
          />
          <KpiCard
            title="Em andamento"
            value={active.length}
            icon={Activity}
          />
          <KpiCard
            title="Concluídos"
            value={completed.length}
            icon={CheckCircle2}
            sub={tickets.length ? `${Math.round((completed.length / tickets.length) * 100)}% do total` : "—"}
          />
          <KpiCard
            title="Sem unidade"
            value={noUnit.length}
            icon={AlertCircle}
            highlight={noUnit.length > 0}
          />
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-gray-700 pb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`relative pb-2 text-sm font-medium transition ${
                filter === tab.key
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
              {filter === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-600 dark:bg-brand-400" />
              )}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400 dark:text-gray-500">{visible.length} chamado{visible.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        )}

        {/* Empty state */}
        {!loading && visible.length === 0 && (
          <div className="card p-14 text-center">
            <div className="text-4xl mb-3">
              {filter === "completed" ? "✅" : filter === "active" ? "🎉" : "📭"}
            </div>
            <div className="font-semibold text-slate-700 dark:text-gray-300">
              {filter === "completed" ? "Nenhum chamado concluído ainda" :
               filter === "active"    ? "Nenhum chamado ativo no momento" :
               "Nenhum chamado hoje"}
            </div>
            <p className="text-sm text-slate-400 dark:text-gray-500 mt-1">
              {filter === "active" ? "Todos os chamados estão concluídos 🎉" : "Os chamados aparecerão aqui quando chegarem"}
            </p>
          </div>
        )}

        {/* Tickets por unidade */}
        {!loading && sortedUnits.map(([unit, list]) => {
          const noUnitSection = unit === "__sem_unidade__";
          const activeInSection = list.filter((t) => ACTIVE_STATUSES.includes(t.status)).length;
          const doneInSection   = list.filter((t) => t.status === "COMPLETED").length;

          return (
            <section key={unit}>
              {/* Cabeçalho da seção */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <h2 className={`text-sm font-semibold flex items-center gap-1.5 ${
                  noUnitSection ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-gray-300"
                }`}>
                  {noUnitSection && <AlertCircle size={14} className="text-red-500" />}
                  {noUnitSection ? "Sem unidade atribuída" : unit}
                </h2>
                <div className="flex items-center gap-1.5 ml-1">
                  {activeInSection > 0 && (
                    <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[11px] font-medium">
                      {activeInSection} ativo{activeInSection !== 1 ? "s" : ""}
                    </span>
                  )}
                  {doneInSection > 0 && (
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-medium">
                      {doneInSection} concluído{doneInSection !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Lista */}
              <div className="card divide-y divide-slate-100 dark:divide-gray-700/60">
                {list.map((t) => (
                  <TicketRow key={t.id} ticket={t} />
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}

function TicketRow({ ticket: t }) {
  return (
    <Link
      to={`/painel/chamado/${t.id}`}
      className="group flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-gray-800/60 transition"
    >
      {/* Stripe de status */}
      <div className={`w-1 self-stretch rounded-full shrink-0 ${statusColor(t.status)}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-slate-400 dark:text-gray-500">{t.ticketNumber}</span>
          <StatusBadge status={t.status} />
        </div>
        <div className="text-sm font-medium text-slate-800 dark:text-gray-100 mt-0.5 truncate">
          {t.requesterName}
          <span className="text-slate-400 dark:text-gray-500 font-normal"> · {t.department}</span>
        </div>
        <div className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
          {t.category?.name}
          {t.subcategory ? ` · ${t.subcategory.name}` : ""}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-xs text-slate-500 dark:text-gray-400">{formatElapsed(t.openedAt, t.completedAt)}</div>
        <div className="text-xs text-slate-400 dark:text-gray-500 mt-0.5 max-w-[120px] truncate text-right">
          {t.technician?.name || "—"}
        </div>
      </div>

      <ChevronRight
        size={16}
        className="text-slate-300 dark:text-gray-600 group-hover:text-brand-500 dark:group-hover:text-brand-400 shrink-0 transition"
      />
    </Link>
  );
}

function statusColor(s) {
  return {
    OPEN:       "bg-slate-300 dark:bg-gray-600",
    VIEWED:     "bg-blue-400",
    EN_ROUTE:   "bg-amber-400",
    IN_SERVICE: "bg-violet-500",
    COMPLETED:  "bg-emerald-500",
  }[s] || "bg-slate-300";
}
