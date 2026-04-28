import { useEffect, useState } from "react";
import { api } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { Spinner } from "../components/ui";
import { useTheme } from "../context/ThemeContext";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie, Legend, AreaChart, Area,
} from "recharts";
import { Calendar, BarChart2, PieChart as PieChartIcon, TrendingUp, Download } from "lucide-react";

function exportCsv(data, range) {
  const sections = [
    { title: "Por Unidade",     rows: data.byUnit  || [], cols: ["unit", "total"] },
    { title: "Por Técnico",     rows: data.byTech  || [], cols: ["technician", "total"] },
    { title: "Por Departamento",rows: data.byDept  || [], cols: ["department", "total"] },
    { title: "Por Categoria",   rows: data.byCat   || [], cols: ["category", "total"] },
    { title: "Mais Solicitantes", rows: data.topRequesters || [], cols: ["name", "total"] },
    { title: "Tempo Médio (min)", rows: data.avg   || [], cols: ["category", "avgMinutes"] },
  ];

  const lines = [`Relatório HelpDesk SEJUSC — ${range.from} a ${range.to}`, ""];
  for (const { title, rows, cols } of sections) {
    lines.push(title);
    lines.push(cols.join(";"));
    for (const row of rows) lines.push(cols.map((c) => row[c] ?? "").join(";"));
    lines.push("");
  }

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `relatorio-helpdesk-${range.from}-${range.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const PALETTE = [
  "#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626",
  "#0891b2", "#9333ea", "#16a34a", "#ea580c", "#0284c7",
];

function useChartTheme() {
  const { dark } = useTheme();
  return {
    grid:    dark ? "#1f2937" : "#f1f5f9",
    tick:    dark ? "#6b7280" : "#94a3b8",
    tooltip: dark
      ? { background: "#1f2937", border: "none", borderRadius: "12px", boxShadow: "0 4px 12px rgb(0 0 0 / .4)", fontSize: "12px", color: "#f3f4f6" }
      : { background: "#ffffff", border: "none", borderRadius: "12px", boxShadow: "0 4px 12px rgb(0 0 0 / .08)", fontSize: "12px" },
  };
}

function TypeToggle({ type, onChange }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 dark:bg-gray-800 p-0.5">
      <button
        onClick={() => onChange("bar")}
        title="Barras"
        className={`rounded-md p-1.5 transition ${
          type === "bar"
            ? "bg-white dark:bg-gray-700 shadow-sm text-brand-600 dark:text-brand-400"
            : "text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
        }`}
      >
        <BarChart2 size={13} />
      </button>
      <button
        onClick={() => onChange("pie")}
        title="Pizza"
        className={`rounded-md p-1.5 transition ${
          type === "pie"
            ? "bg-white dark:bg-gray-700 shadow-sm text-brand-600 dark:text-brand-400"
            : "text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
        }`}
      >
        <PieChartIcon size={13} />
      </button>
    </div>
  );
}

function ChartCard({ title, data, xKey, yKey = "total", loading, onlyBar = false }) {
  const [type, setType] = useState("bar");
  const { grid, tick, tooltip } = useChartTheme();

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-100">{title}</h2>
        {!onlyBar && <TypeToggle type={type} onChange={setType} />}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Spinner />
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-sm text-slate-400 dark:text-gray-500">
          Sem dados no período
        </div>
      ) : type === "bar" ? (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11, fill: tick }}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={data.length > 4 ? -25 : 0}
              textAnchor={data.length > 4 ? "end" : "middle"}
              height={data.length > 4 ? 50 : 30}
            />
            <YAxis tick={{ fontSize: 11, fill: tick }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltip} />
            <Bar dataKey={yKey} radius={[6, 6, 0, 0]} maxBarSize={48}>
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              dataKey={yKey}
              nameKey={xKey}
              cx="50%"
              cy="44%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltip} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function DailyChart({ data, loading }) {
  const [type, setType] = useState("area");
  const { grid, tick, tooltip } = useChartTheme();

  const fmt = (d) => {
    const [, m, day] = d.split("-");
    return `${day}/${m}`;
  };

  const tickInterval = data.length > 20 ? Math.floor(data.length / 10) : 0;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-brand-600" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-100">
            Volume diário de chamados
          </h2>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 dark:bg-gray-800 p-0.5">
          <button
            onClick={() => setType("area")}
            title="Área"
            className={`rounded-md p-1.5 transition ${
              type === "area"
                ? "bg-white dark:bg-gray-700 shadow-sm text-brand-600 dark:text-brand-400"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
            }`}
          >
            <TrendingUp size={13} />
          </button>
          <button
            onClick={() => setType("bar")}
            title="Barras"
            className={`rounded-md p-1.5 transition ${
              type === "bar"
                ? "bg-white dark:bg-gray-700 shadow-sm text-brand-600 dark:text-brand-400"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
            }`}
          >
            <BarChart2 size={13} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner /></div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-sm text-slate-400 dark:text-gray-500">
          Sem dados no período
        </div>
      ) : type === "area" ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis
              dataKey="date"
              tickFormatter={fmt}
              tick={{ fontSize: 11, fill: tick }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: tick }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={tooltip}
              labelFormatter={(d) => {
                const [y, m, day] = d.split("-");
                return `${day}/${m}/${y}`;
              }}
              formatter={(v) => [v, "Chamados"]}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#areaGrad)"
              dot={data.length <= 14 ? { r: 3, fill: "#2563eb" } : false}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis
              dataKey="date"
              tickFormatter={fmt}
              tick={{ fontSize: 11, fill: tick }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: tick }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={tooltip}
              labelFormatter={(d) => {
                const [y, m, day] = d.split("-");
                return `${day}/${m}/${y}`;
              }}
              formatter={(v) => [v, "Chamados"]}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={32} fill="#2563eb" />
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
  const [daily, setDaily] = useState([]);
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
      api.get(`/analytics/top-requesters${q}&limit=10`),
      api.get(`/analytics/by-day${q}`),
    ]).then(([u, t, d, c, a, o, r, day]) => {
      setData({
        byUnit: u.data,
        byTech: t.data,
        byDept: d.data,
        byCat: c.data,
        avg: a.data,
        topRequesters: r.data.map((x) => ({ name: x.name, total: x.total })),
      });
      setOthers(o.data);
      setDaily(day.data);
    }).finally(() => setLoading(false));
  }, [range]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <AppHeader />

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">

        {/* Filtro de período */}
        <div className="card px-5 py-4 flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-gray-200">
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
          <button
            onClick={() => exportCsv(data, range)}
            disabled={loading}
            className="ml-auto flex items-center gap-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-40 transition"
          >
            <Download size={14} />
            Exportar CSV
          </button>
        </div>

        {/* Volume diário */}
        <DailyChart data={daily} loading={loading} />

        {/* Grid de gráficos */}
        <div className="grid md:grid-cols-2 gap-5">
          <ChartCard title="Chamados por unidade"    data={data.byUnit  || []} xKey="unit"        loading={loading} />
          <ChartCard title="Chamados por técnico"    data={data.byTech  || []} xKey="technician"  loading={loading} />
          <ChartCard title="Top departamentos"       data={data.byDept  || []} xKey="department"  loading={loading} />
          <ChartCard title="Categorias mais abertas" data={data.byCat   || []} xKey="category"    loading={loading} />
          <ChartCard title="Mais solicitantes"       data={data.topRequesters || []} xKey="name"  loading={loading} />
        </div>

        <ChartCard
          title="Tempo médio de resolução por categoria (minutos)"
          data={data.avg || []}
          xKey="category"
          yKey="avgMinutes"
          loading={loading}
          onlyBar
        />

        {/* Outros (para reclassificação) */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-100 mb-1">
            Chamados "Outro" — para reclassificação
          </h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
            Estes chamados foram abertos com descrição livre. O monitor pode usá-los para planejar manutenção preventiva.
          </p>

          {loading ? (
            <div className="flex items-center justify-center h-20"><Spinner /></div>
          ) : others.length === 0 ? (
            <div className="text-sm text-slate-400 dark:text-gray-500 text-center py-6">Nenhum chamado no período</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {others.map((o) => (
                <div key={o.id} className="rounded-xl border border-slate-200 dark:border-gray-700 px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-500 dark:text-gray-400">{o.ticketNumber}</span>
                    <span className="text-xs text-slate-400 dark:text-gray-500">{o.category?.name}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-gray-300 line-clamp-2">{o.freeTextDescription}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
