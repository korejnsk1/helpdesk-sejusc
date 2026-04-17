import { useEffect, useState } from "react";
import { api } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { Spinner } from "../components/ui";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { Calendar } from "lucide-react";

const BLUE_SHADES = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];

function ChartCard({ title, data, xKey, yKey = "total", loading }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-slate-800 mb-4">{title}</h2>
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Spinner />
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-sm text-slate-400">
          Sem dados no período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={data.length > 4 ? -25 : 0}
              textAnchor={data.length > 4 ? "end" : "middle"}
              height={data.length > 4 ? 50 : 30}
            />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgb(0 0 0 / .08)",
                fontSize: "12px",
              }}
            />
            <Bar dataKey={yKey} radius={[6, 6, 0, 0]} maxBarSize={48}>
              {data.map((_, i) => (
                <Cell key={i} fill={BLUE_SHADES[i % BLUE_SHADES.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [range, setRange] = useState({ from: thirtyAgo, to: today });
  const [data, setData] = useState({});
  const [others, setOthers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = `?from=${range.from}&to=${range.to}T23:59:59`;
    Promise.all([
      api.get(`/analytics/by-unit${q}`),
      api.get(`/analytics/by-technician${q}`),
      api.get(`/analytics/by-department${q}`),
      api.get(`/analytics/by-category${q}`),
      api.get(`/analytics/avg-resolution${q}`),
      api.get(`/analytics/other${q}`),
    ]).then(([u, t, d, c, a, o]) => {
      setData({
        byUnit: u.data,
        byTech: t.data,
        byDept: d.data,
        byCat: c.data,
        avg: a.data,
      });
      setOthers(o.data);
    }).finally(() => setLoading(false));
  }, [range]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">

        {/* Filtro de período */}
        <div className="card px-5 py-4 flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Calendar size={16} className="text-brand-600" />
            Período
          </div>
          <div className="flex items-center gap-2">
            <div>
              <label className="field-label text-xs">De</label>
              <input
                type="date"
                value={range.from}
                max={range.to}
                onChange={(e) => setRange({ ...range, from: e.target.value })}
                className="field-input py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="field-label text-xs">Até</label>
              <input
                type="date"
                value={range.to}
                min={range.from}
                onChange={(e) => setRange({ ...range, to: e.target.value })}
                className="field-input py-1.5 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Grid de gráficos */}
        <div className="grid md:grid-cols-2 gap-5">
          <ChartCard title="Chamados por unidade"    data={data.byUnit  || []} xKey="unit"        loading={loading} />
          <ChartCard title="Chamados por técnico"    data={data.byTech  || []} xKey="technician"  loading={loading} />
          <ChartCard title="Top departamentos"       data={data.byDept  || []} xKey="department"  loading={loading} />
          <ChartCard title="Categorias mais abertas" data={data.byCat   || []} xKey="category"    loading={loading} />
        </div>

        <ChartCard
          title="Tempo médio de resolução por categoria (minutos)"
          data={data.avg || []}
          xKey="category"
          yKey="avgMinutes"
          loading={loading}
        />

        {/* Outros (para reclassificação) */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">
            Chamados "Outro" — para reclassificação
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Estes chamados foram abertos com descrição livre. O monitor pode usá-los para planejar manutenção preventiva.
          </p>

          {loading ? (
            <div className="flex items-center justify-center h-20"><Spinner /></div>
          ) : others.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-6">Nenhum chamado no período</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {others.map((o) => (
                <div key={o.id} className="rounded-xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-500">{o.ticketNumber}</span>
                    <span className="text-xs text-slate-400">{o.category?.name}</span>
                  </div>
                  <p className="text-sm text-slate-700 line-clamp-2">{o.freeTextDescription}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
