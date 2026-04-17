import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { StatusBadge, KpiCard, Spinner } from "../components/ui";
import AppHeader from "../components/AppHeader";
import { formatElapsed } from "../lib/statuses";
import { Ticket, AlertCircle, Activity, ChevronRight } from "lucide-react";

export default function DashboardPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, []);

  async function load() {
    try {
      const { data } = await api.get("/tickets");
      setTickets(data);
    } finally {
      setLoading(false);
    }
  }

  const unassigned = tickets.filter((t) => !t.unit);
  const active = tickets.filter((t) =>
    ["OPEN", "VIEWED", "EN_ROUTE", "IN_SERVICE"].includes(t.status)
  );

  const byUnit = tickets.reduce((acc, t) => {
    const key = t.unit?.name || "⚠ Sem unidade atribuída";
    (acc[key] = acc[key] || []).push(t);
    return acc;
  }, {});

  // Unidades sem atribuição primeiro
  const sortedUnits = Object.entries(byUnit).sort(([a]) =>
    a.startsWith("⚠") ? -1 : 1
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard title="Chamados hoje" value={tickets.length} icon={Ticket} />
          <KpiCard title="Em andamento" value={active.length} icon={Activity} />
          <KpiCard
            title="Sem unidade atribuída"
            value={unassigned.length}
            icon={AlertCircle}
            highlight={unassigned.length > 0}
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        )}

        {/* Tickets por unidade */}
        {!loading && tickets.length === 0 && (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <div className="font-semibold text-slate-700">Nenhum chamado hoje</div>
            <p className="text-sm text-slate-400 mt-1">Os chamados aparecerão aqui assim que forem abertos</p>
          </div>
        )}

        {sortedUnits.map(([unit, list]) => {
          const noUnit = unit.startsWith("⚠");
          return (
            <section key={unit}>
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className={`text-sm font-semibold flex items-center gap-2 ${noUnit ? "text-red-700" : "text-slate-700"}`}>
                  {noUnit && <AlertCircle size={14} className="text-red-500" />}
                  {noUnit ? "Sem unidade atribuída" : unit}
                  <span className="text-xs font-normal text-slate-400">({list.length})</span>
                </h2>
              </div>

              <div className="card divide-y divide-slate-100">
                {list.map((t) => (
                  <Link
                    key={t.id}
                    to={`/painel/chamado/${t.id}`}
                    className="group flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition"
                  >
                    {/* Status stripe */}
                    <div className={`w-1 self-stretch rounded-full shrink-0 ${statusColor(t.status)}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">{t.ticketNumber}</span>
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="text-sm font-medium text-slate-800 mt-0.5 truncate">
                        {t.requesterName}
                        <span className="text-slate-400 font-normal"> · {t.department}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {t.category?.name}
                        {t.subcategory ? ` · ${t.subcategory.name}` : ""}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-500">{formatElapsed(t.openedAt, t.completedAt)}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {t.technician?.name || "—"}
                      </div>
                    </div>

                    <ChevronRight
                      size={16}
                      className="text-slate-300 group-hover:text-brand-500 shrink-0 transition"
                    />
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}

function statusColor(s) {
  return {
    OPEN:       "bg-slate-300",
    VIEWED:     "bg-blue-400",
    EN_ROUTE:   "bg-amber-400",
    IN_SERVICE: "bg-violet-500",
    COMPLETED:  "bg-emerald-500",
  }[s] || "bg-slate-300";
}
