import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export default function AnalyticsPage() {
  const [range, setRange] = useState(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  });
  const [byUnit, setByUnit] = useState([]);
  const [byTech, setByTech] = useState([]);
  const [byDept, setByDept] = useState([]);
  const [byCat, setByCat] = useState([]);
  const [avg, setAvg] = useState([]);
  const [others, setOthers] = useState([]);

  useEffect(() => {
    const q = `?from=${range.from}&to=${range.to}T23:59:59`;
    Promise.all([
      api.get(`/analytics/by-unit${q}`),
      api.get(`/analytics/by-technician${q}`),
      api.get(`/analytics/by-department${q}`),
      api.get(`/analytics/by-category${q}`),
      api.get(`/analytics/avg-resolution${q}`),
      api.get(`/analytics/other${q}`),
    ]).then(([u, t, d, c, a, o]) => {
      setByUnit(u.data);
      setByTech(t.data);
      setByDept(d.data);
      setByCat(c.data);
      setAvg(a.data);
      setOthers(o.data);
    });
  }, [range]);

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between">
          <Link to="/painel" className="text-sm text-slate-500 hover:underline">← Painel</Link>
          <h1 className="font-semibold">Relatórios</h1>
          <span />
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="bg-white rounded-xl shadow p-4 flex gap-3 items-end flex-wrap">
          <div>
            <label className="text-xs text-slate-500">De</label>
            <input
              type="date"
              value={range.from}
              onChange={(e) => setRange({ ...range, from: e.target.value })}
              className="border rounded px-2 py-1 block"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Até</label>
            <input
              type="date"
              value={range.to}
              onChange={(e) => setRange({ ...range, to: e.target.value })}
              className="border rounded px-2 py-1 block"
            />
          </div>
        </div>

        <Chart title="Chamados por unidade" data={byUnit} xKey="unit" />
        <Chart title="Chamados por técnico" data={byTech} xKey="technician" />
        <Chart title="Departamentos com mais chamados" data={byDept} xKey="department" />
        <Chart title="Categorias mais frequentes" data={byCat} xKey="category" />
        <Chart
          title="Tempo médio de resolução por categoria (min)"
          data={avg}
          xKey="category"
          yKey="avgMinutes"
        />

        <section className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold mb-2">Chamados "Outro" (para reclassificação)</h2>
          <div className="text-sm space-y-2 max-h-80 overflow-auto">
            {others.length === 0 && <div className="text-slate-500">Nenhum registro.</div>}
            {others.map((o) => (
              <div key={o.id} className="border-b pb-2">
                <div className="font-medium">{o.ticketNumber}</div>
                <div className="text-slate-600">{o.freeTextDescription}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Chart({ title, data, xKey, yKey = "total" }) {
  return (
    <section className="bg-white rounded-xl shadow p-4">
      <h2 className="font-semibold mb-2">{title}</h2>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey={yKey} fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
