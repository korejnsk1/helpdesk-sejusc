import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { STATUS_LABEL, formatElapsed } from "../lib/statuses";

export default function DashboardPage() {
  const { user, logout } = useAuth();
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

  const byUnit = tickets.reduce((acc, t) => {
    const key = t.unit?.name || "Sem unidade atribuída";
    (acc[key] = acc[key] || []).push(t);
    return acc;
  }, {});
  const unassigned = tickets.filter((t) => !t.unit);
  const openOrViewed = tickets.filter((t) =>
    ["OPEN", "VIEWED", "EN_ROUTE", "IN_SERVICE"].includes(t.status)
  );

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-slate-800">HelpDesk SEJUSC</h1>
            <nav className="text-sm flex gap-3">
              <Link to="/painel" className="hover:underline">Painel</Link>
              <Link to="/painel/relatorios" className="hover:underline">Relatórios</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">
              {user?.name} ({user?.role === "MONITOR" ? "Monitor" : "Técnico"})
            </span>
            <button onClick={logout} className="text-red-600 hover:underline">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <section className="grid sm:grid-cols-3 gap-3">
          <Kpi title="Chamados hoje" value={tickets.length} />
          <Kpi title="Em andamento" value={openOrViewed.length} />
          <Kpi
            title="Sem unidade atribuída"
            value={unassigned.length}
            highlight={unassigned.length > 0}
          />
        </section>

        {loading && <div className="text-slate-500">Carregando...</div>}

        {Object.entries(byUnit).map(([unit, list]) => (
          <section key={unit}>
            <h2 className="font-semibold text-slate-800 mb-2">{unit}</h2>
            <div className="bg-white rounded-xl shadow divide-y">
              {list.map((t) => (
                <Link
                  key={t.id}
                  to={`/painel/chamado/${t.id}`}
                  className="p-4 flex items-center justify-between hover:bg-slate-50"
                >
                  <div>
                    <div className="font-medium text-slate-800">{t.ticketNumber}</div>
                    <div className="text-sm text-slate-600">
                      {t.requesterName} — {t.department}
                    </div>
                    <div className="text-xs text-slate-500">
                      {t.category?.name}
                      {t.subcategory ? ` · ${t.subcategory.name}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={t.status} />
                    <div className="text-xs text-slate-500 mt-1">
                      {formatElapsed(t.openedAt, t.completedAt)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {t.technician?.name || "— sem técnico"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

function Kpi({ title, value, highlight }) {
  return (
    <div
      className={`rounded-xl p-4 shadow ${
        highlight ? "bg-red-50 border border-red-200" : "bg-white"
      }`}
    >
      <div className="text-xs text-slate-500">{title}</div>
      <div className={`text-2xl font-bold ${highlight ? "text-red-700" : "text-slate-800"}`}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const color = {
    OPEN: "bg-slate-200 text-slate-700",
    VIEWED: "bg-blue-100 text-blue-700",
    EN_ROUTE: "bg-amber-100 text-amber-700",
    IN_SERVICE: "bg-indigo-100 text-indigo-700",
    COMPLETED: "bg-green-100 text-green-700",
  }[status];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${color}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
