import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { Spinner } from "../components/ui";
import { Shield, ChevronDown, RefreshCw, Search, X } from "lucide-react";

const ACTION_LABELS = {
  UPDATE_USER:   "Usuário atualizado",
  DELETE_USER:   "Usuário excluído",
  CREATE_TICKET: "Chamado criado",
  DELETE_TICKET: "Chamado excluído",
  TRANSITION:    "Transição de status",
  ASSIGN:        "Atribuição de técnico",
  REOPEN:        "Chamado reaberto",
};

function label(action) {
  return ACTION_LABELS[action] || action;
}

function actionColor(action) {
  if (action.startsWith("DELETE")) return "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 ring-red-200 dark:ring-red-700";
  if (action.startsWith("UPDATE") || action === "ASSIGN") return "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 ring-blue-200 dark:ring-blue-700";
  return "bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-gray-300 ring-slate-200 dark:ring-gray-600";
}

function fmt(dt) {
  return new Date(dt).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AuditPage() {
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [search,     setSearch]     = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const load = useCallback(async (cursor = null, replace = true) => {
    if (replace) setLoading(true); else setLoadingMore(true);
    try {
      const params = { limit: 50 };
      if (cursor)       params.cursor = cursor;
      if (actionFilter) params.action = actionFilter;
      const res = await api.get("/audit-logs", { params });
      setLogs((prev) => replace ? res.data.logs : [...prev, ...res.data.logs]);
      setNextCursor(res.data.nextCursor);
    } finally {
      if (replace) setLoading(false); else setLoadingMore(false);
    }
  }, [actionFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? logs.filter((l) =>
        l.actorName?.toLowerCase().includes(search.toLowerCase()) ||
        l.details?.toLowerCase().includes(search.toLowerCase()) ||
        l.targetType?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <AppHeader />

      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-gray-100 flex items-center gap-2">
              <Shield size={18} className="text-brand-600 dark:text-brand-400" />
              Auditoria
            </h1>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">Registro de ações administrativas</p>
          </div>
          <button
            onClick={() => load()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-gray-700 px-3 py-1.5 text-sm text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ator, detalhe..."
              className="field-input pl-8 py-2 text-sm w-full"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition">
                <X size={13} />
              </button>
            )}
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="field-input py-2 text-sm w-auto"
          >
            <option value="">Todas as ações</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="h-7 w-7" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Shield size={32} className="mx-auto text-slate-300 dark:text-gray-600 mb-3" />
            <div className="font-medium text-slate-600 dark:text-gray-400">Nenhum registro encontrado</div>
          </div>
        ) : (
          <>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-gray-700/60 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide">Data</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide">Ator</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide">Ação</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Alvo</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-gray-800/60">
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-gray-800/30 transition">
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">
                        {fmt(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-gray-100 whitespace-nowrap">
                        {log.actorName || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${actionColor(log.action)}`}>
                          {label(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-gray-400 hidden md:table-cell">
                        {log.targetType}{log.targetId ? ` #${log.targetId}` : ""}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-gray-400 max-w-xs truncate hidden lg:table-cell" title={log.details || ""}>
                        {log.details || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {nextCursor && (
              <div className="flex justify-center">
                <button
                  onClick={() => load(nextCursor, false)}
                  disabled={loadingMore}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-gray-700 px-4 py-2 text-sm text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {loadingMore ? <Spinner className="h-4 w-4" /> : <ChevronDown size={14} />}
                  Carregar mais
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
