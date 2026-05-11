import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useSocket } from "../context/SocketContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, KpiCard, Spinner } from "../components/ui";
import AppHeader from "../components/AppHeader";
import { formatElapsed } from "../lib/statuses";
import {
  Ticket, AlertCircle, Activity, CheckCircle2,
  ChevronRight, Clock, RefreshCw, Filter, History,
} from "lucide-react";

const ACTIVE_STATUSES = ["OPEN", "VIEWED", "EN_ROUTE", "IN_SERVICE"];

const FILTER_TABS = [
  { key: "active",    label: "Ativos" },
  { key: "completed", label: "Concluídos" },
  { key: "all",       label: "Todos" },
];

const HIST_RANGES = [
  { key: "7",  label: "7 dias"  },
  { key: "30", label: "30 dias" },
  { key: "90", label: "90 dias" },
  { key: "0",  label: "Tudo"   },
];

export default function DashboardPage() {
  const socket  = useSocket();
  const addToast = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [tickets, setTickets]         = useState([]);
  const [history, setHistory]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [histLoading, setHistLoading] = useState(false);
  const [filter, setFilter]           = useState("active");
  const [histRange, setHistRange]     = useState("30");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Filtros avançados
  const [departments, setDepartments]     = useState([]);
  const [categories, setCategories]       = useState([]);
  const [deptFilter, setDeptFilter]       = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const load = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeParams = {};
      const completedParams = { status: "COMPLETED", from: today.toISOString() };
      if (categoryFilter) {
        activeParams.categoryId = categoryFilter;
        completedParams.categoryId = categoryFilter;
      }

      // Ativos: sem filtro de data (mostra todos em aberto independente de quando foram criados)
      // Concluídos: apenas os de hoje
      const [activeRes, completedRes] = await Promise.all([
        api.get("/tickets", { params: { ...activeParams, limit: 500 } }),
        api.get("/tickets", { params: completedParams }),
      ]);

      const activeTickets    = activeRes.data.tickets.filter((t) => ACTIVE_STATUSES.includes(t.status));
      const completedTickets = completedRes.data.tickets;

      setTickets([...activeTickets, ...completedTickets]);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const params = { status: "COMPLETED", limit: 500 };
      if (histRange !== "0") {
        const from = new Date(Date.now() - Number(histRange) * 86400000);
        from.setHours(0, 0, 0, 0);
        params.from = from.toISOString();
      }
      const res = await api.get("/tickets", { params });
      setHistory(res.data.tickets);
    } finally {
      setHistLoading(false);
    }
  }, [histRange]);

  // Carrega filtros disponíveis
  useEffect(() => {
    api.get("/departments").then((r) => setDepartments(r.data));
    api.get("/categories").then((r) => setCategories(r.data));
  }, []);

  // Carrega histórico ao trocar para essa aba ou mudar o período
  useEffect(() => {
    if (filter === "history") loadHistory();
  }, [filter, loadHistory, histRange]);

  // Carrega tickets e escuta socket (sem polling)
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const s = socket?.current;
    if (!s) return;

    const onCreated = ({ ticketNumber }) => {
      addToast({ message: `Novo chamado: ${ticketNumber}`, type: "info" });
      load();
    };

    const onUpdated  = () => load();
    const onDeleted  = ({ id }) => setTickets((prev) => prev.filter((t) => t.id !== id));

    s.on("ticket:created", onCreated);
    s.on("ticket:updated", onUpdated);
    s.on("ticket:deleted", onDeleted);
    return () => {
      s.off("ticket:created", onCreated);
      s.off("ticket:updated", onUpdated);
      s.off("ticket:deleted", onDeleted);
    };
  }, [socket, load, addToast]);

  // KPI counts
  const active    = tickets.filter((t) => ACTIVE_STATUSES.includes(t.status));
  const completed = tickets.filter((t) => t.status === "COMPLETED");
  const noUnit    = tickets.filter((t) => ACTIVE_STATUSES.includes(t.status) && !t.unit);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayTotal = tickets.filter((t) => new Date(t.openedAt) >= todayStart);

  // Filtro de exibição
  let visible = filter === "active"    ? active
              : filter === "completed" ? completed
              : filter === "history"   ? history
              : tickets;
  if (deptFilter && filter !== "history") visible = visible.filter((t) => t.department === deptFilter);

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
  const hasFilters = deptFilter || categoryFilter;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <AppHeader />

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-gray-100 capitalize">{dateLabel}</h1>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5 flex items-center gap-1.5">
              <Clock size={11} />
              Atualizado às {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
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
          <KpiCard title="Total hoje"    value={todayTotal.length} icon={Ticket}       sub={`${active.length} ativo${active.length !== 1 ? "s" : ""}`} />
          <KpiCard title="Em andamento" value={active.length}     icon={Activity} />
          <KpiCard title="Concluídos"   value={completed.length}  icon={CheckCircle2} sub={todayTotal.length ? `${Math.round((completed.length / todayTotal.length) * 100)}% de hoje` : "—"} />
          <KpiCard title="Sem unidade"  value={noUnit.length}     icon={AlertCircle}  highlight={noUnit.length > 0} />
        </div>

        {/* Filtros */}
        <div className="space-y-2">
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
            {isAdmin && (
              <button
                onClick={() => setFilter(filter === "history" ? "active" : "history")}
                className={`relative pb-2 text-sm font-medium transition flex items-center gap-1 ${
                  filter === "history"
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"
                }`}
              >
                <History size={13} />
                Histórico
                {filter === "history" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-600 dark:bg-brand-400" />
                )}
              </button>
            )}
          </div>

          {/* Seletor de período — só na aba Histórico */}
          {filter === "history" && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-400 dark:text-gray-500">Período:</span>
              {HIST_RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setHistRange(r.key)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                    histRange === r.key
                      ? "bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400"
                      : "text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}

          {/* Filtros avançados */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-slate-400 dark:text-gray-500 shrink-0" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="field-input py-1.5 text-xs w-auto min-w-0 max-w-[200px]"
            >
              <option value="">Todos os setores</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="field-input py-1.5 text-xs w-auto min-w-0 max-w-[180px]"
            >
              <option value="">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {hasFilters && (
              <button
                onClick={() => { setDeptFilter(""); setCategoryFilter(""); }}
                className="text-xs text-slate-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {(loading || (filter === "history" && histLoading)) && (
          <div className="flex items-center justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        )}

        {/* Empty state */}
        {!(loading || (filter === "history" && histLoading)) && visible.length === 0 && (
          <div className="card p-14 text-center">
            <div className="text-4xl mb-3">
              {filter === "completed" ? "✅" : filter === "active" ? "🎉" : "📭"}
            </div>
            <div className="font-semibold text-slate-700 dark:text-gray-300">
              {filter === "completed" ? "Nenhum chamado concluído ainda" :
               filter === "active"    ? "Nenhum chamado ativo no momento" :
               filter === "history"   ? "Nenhum chamado no histórico" :
               "Nenhum chamado hoje"}
            </div>
            <p className="text-sm text-slate-400 dark:text-gray-500 mt-1">
              {filter === "active" ? "Todos os chamados estão concluídos 🎉" : "Os chamados aparecerão aqui quando chegarem"}
            </p>
          </div>
        )}

        {/* Tickets por unidade */}
        {!(loading || (filter === "history" && histLoading)) && sortedUnits.map(([unit, list]) => {
          const noUnitSection   = unit === "__sem_unidade__";
          const activeInSection = list.filter((t) => ACTIVE_STATUSES.includes(t.status)).length;
          const doneInSection   = list.filter((t) => t.status === "COMPLETED").length;

          return (
            <section key={unit}>
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
    VIEWED:     "bg-blue-400 dark:bg-blue-500",
    EN_ROUTE:   "bg-amber-400 dark:bg-amber-500",
    IN_SERVICE: "bg-violet-500",
    COMPLETED:  "bg-emerald-500",
  }[s] || "bg-slate-300";
}
