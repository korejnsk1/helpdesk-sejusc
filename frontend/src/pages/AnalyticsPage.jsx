import { useEffect, useState } from "react";
import { api } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { Spinner } from "../components/ui";
import { useTheme } from "../context/ThemeContext";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie, Legend, AreaChart, Area,
} from "recharts";
import { Calendar, BarChart2, PieChart as PieChartIcon, TrendingUp, FileText } from "lucide-react";

// ── Month helpers ─────────────────────────────────────────────────────────────
const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmtMonth(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[Number(m) - 1]}/${y.slice(2)}`;
}

function fmtMonthLong(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} de ${y}`;
}

// Strips diacritics for jsPDF default fonts
function ascii(s) {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}


// ── PDF export ────────────────────────────────────────────────────────────────
async function exportPdf(data, monthly, range) {
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");

  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W    = doc.internal.pageSize.getWidth();
  const H    = doc.internal.pageSize.getHeight();
  const M    = 12;
  const GAP  = 5;
  const CW   = W - M * 2;                      // 186 mm
  const COL2 = (CW - GAP) / 2;                 // ~90.5 mm — 2-col tables
  const COL3 = (CW - GAP * 2) / 3;             // ~58.7 mm — 3-col charts
  const RX2  = M + COL2 + GAP;
  const RX3  = [M, M + COL3 + GAP, M + (COL3 + GAP) * 2];

  const BLUE   = [37, 99, 235];
  const SLATE  = [71, 85, 105];
  const DARK   = [15, 23, 42];
  const LIGHT  = [241, 245, 249];
  const COLORS = [
    [37,99,235],[124,58,237],[5,150,105],[217,119,6],
    [220,38,38],[8,145,178],[147,51,234],[22,163,74],
  ];

  let curY = 0;

  function needPage(h) {
    if (curY + h > H - 12) { doc.addPage(); curY = 12; }
  }

  // ── Tabela compacta numa coluna ─────────────────────────────────────────────
  function halfTable(startY, x, w, title, head, body, maxRows = 7) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BLUE);
    doc.text(ascii(title), x, startY);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.2);
    doc.line(x, startY + 1.2, x + w, startY + 1.2);

    autoTable(doc, {
      startY: startY + 4,
      head,
      body: body.slice(0, maxRows),
      margin: { left: x, right: W - x - w },
      tableWidth: w,
      headStyles: { fillColor: BLUE, textColor: 255, fontSize: 7.5, fontStyle: "bold" },
      bodyStyles: { textColor: DARK, fontSize: 7.5 },
      alternateRowStyles: { fillColor: LIGHT },
      styles: { cellPadding: 1.5, font: "helvetica" },
      columnStyles: { [head[0].length - 1]: { cellWidth: 18, halign: "right" } },
    });
    return doc.lastAutoTable.finalY;
  }

  // ── Par de tabelas lado a lado ──────────────────────────────────────────────
  function tableRow(lTitle, lHead, lBody, rTitle, rHead, rBody) {
    const needed = Math.max(lBody.length, rBody?.length ?? 0, 1) * 6 + 22;
    needPage(needed);
    const sy   = curY;
    const lEnd = halfTable(sy, M,   COL2, lTitle, lHead, lBody);
    const rEnd = rBody?.length > 0
      ? halfTable(sy, RX2, COL2, rTitle, rHead, rBody)
      : sy;
    curY = Math.max(lEnd, rEnd) + 5;
  }

  // ── Gráfico vertical numa coluna de 3 ──────────────────────────────────────
  function vertChart(startY, colIdx, title, rows, labelKey, valueKey, maxRows = 6) {
    const x     = RX3[colIdx];
    const w     = COL3;
    const slice = rows.slice(0, maxRows);
    if (slice.length === 0) return startY + 52;

    const maxVal = Math.max(...slice.map((d) => d[valueKey]), 1);
    const chartH = 36;
    const n      = slice.length;
    const spacing = 2;
    const barW   = Math.min(Math.floor((w - 10) / n) - spacing, 14);
    const totalW = n * (barW + spacing) - spacing;
    const ox     = x + (w - totalW) / 2;

    // col title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...BLUE);
    doc.text(ascii(title), x + w / 2, startY, { align: "center" });
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.2);
    doc.line(x, startY + 1.2, x + w, startY + 1.2);

    const chartTop = startY + 5;

    // grid lines
    for (let lvl = 1; lvl <= 3; lvl++) {
      const ly = chartTop + chartH - (lvl / 3) * chartH;
      doc.setDrawColor(235, 240, 245);
      doc.setLineWidth(0.15);
      doc.line(x + 3, ly, x + w, ly);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(185, 195, 210);
      doc.text(String(Math.round((lvl / 3) * maxVal)), x + 2, ly + 1, { align: "right" });
    }

    // baseline
    doc.setDrawColor(200, 210, 225);
    doc.setLineWidth(0.3);
    doc.line(x + 3, chartTop + chartH, x + w, chartTop + chartH);

    slice.forEach((item, i) => {
      const bh    = Math.max((item[valueKey] / maxVal) * chartH, 1.5);
      const bx    = ox + i * (barW + spacing);
      const by    = chartTop + chartH - bh;
      const color = COLORS[i % COLORS.length];

      doc.setFillColor(...color);
      const r = Math.min(2, barW / 2);
      doc.roundedRect(bx, by, barW, bh, r, r, "F");
      doc.rect(bx, by + bh / 2, barW, bh / 2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(...DARK);
      doc.text(String(item[valueKey]), bx + barW / 2, by - 1.5, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(...SLATE);
      const label = ascii(String(item[labelKey])).substring(0, 9);
      doc.text(label, bx + barW / 2, chartTop + chartH + 4.5, { align: "center" });
    });

    return chartTop + chartH + 9;
  }

  // ── Grade de gráficos 3 colunas ─────────────────────────────────────────────
  function chartRow(s0, s1, s2) {
    needPage(58);
    const sy = curY;
    const ends = [s0, s1, s2].map((s, i) =>
      s ? vertChart(sy, i, s.title, s.rows, s.lk, s.vk) : sy
    );
    curY = Math.max(...ends) + 4;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...DARK);
  doc.text("HelpDesk SEJUSC", M, 19);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE);
  doc.text("Relatorio de Chamados", M, 26);
  doc.text(
    `Periodo: ${range.from} a ${range.to}   |   Gerado: ${new Date().toLocaleDateString("pt-BR")}`,
    M, 32,
  );
  curY = 40;

  // ═══════════════════════════════════════════════════════════════════════════
  // PARTE SUPERIOR — TABELAS NUMÉRICAS
  // ═══════════════════════════════════════════════════════════════════════════

  // Resumo mensal (largura total)
  if (monthly.length > 0) {
    needPage(monthly.length * 6 + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BLUE);
    doc.text("Resumo Mensal", M, curY);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.25);
    doc.line(M, curY + 1.2, M + CW, curY + 1.2);
    curY += 4;

    autoTable(doc, {
      startY: curY,
      head: [["Mes", "Total", "Concluidos", "Em Atend.", "Abertos"]],
      body: monthly.map((m) => [
        ascii(fmtMonthLong(m.month)), m.total, m.completed, m.inProgress, m.open,
      ]),
      margin: { left: M, right: M },
      headStyles: { fillColor: BLUE, textColor: 255, fontSize: 8, fontStyle: "bold" },
      bodyStyles: { textColor: DARK, fontSize: 8 },
      alternateRowStyles: { fillColor: LIGHT },
      styles: { cellPadding: 1.8, font: "helvetica" },
      columnStyles: {
        0: { cellWidth: 46 },
        1: { cellWidth: 20, halign: "right" },
        2: { cellWidth: 26, halign: "right" },
        3: { cellWidth: 26, halign: "right" },
        4: { cellWidth: 20, halign: "right" },
      },
    });
    curY = doc.lastAutoTable.finalY + 6;
  }

  // Pares de tabelas 2 colunas
  tableRow(
    "Chamados por Unidade",
    [["Unidade", "Total"]],
    (data.byUnit || []).map((r) => [ascii(r.unit), r.total]),
    "Chamados por Tecnico",
    [["Tecnico", "Total"]],
    (data.byTech || []).map((r) => [ascii(r.technician), r.total]),
  );
  tableRow(
    "Por Categoria",
    [["Categoria", "Total"]],
    (data.byCat || []).map((r) => [ascii(r.category), r.total]),
    "Por Departamento",
    [["Departamento", "Total"]],
    (data.byDept || []).map((r) => [ascii(r.department), r.total]),
  );
  tableRow(
    "Mais Solicitantes",
    [["Nome", "Total"]],
    (data.topRequesters || []).map((r) => [ascii(r.name), r.total]),
    "Tempo Medio de Resolucao (min)",
    [["Categoria", "Media"]],
    (data.avg || []).map((r) => [ascii(r.category), r.avgMinutes]),
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SEPARADOR
  // ═══════════════════════════════════════════════════════════════════════════
  curY += 2;
  doc.setFillColor(...BLUE);
  doc.rect(M, curY, CW, 0.5, "F");
  curY += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLUE);
  doc.text("Graficos", M, curY);
  curY += 6;

  // ═══════════════════════════════════════════════════════════════════════════
  // PARTE INFERIOR — GRÁFICOS VERTICAIS (grade 3 colunas)
  // ═══════════════════════════════════════════════════════════════════════════
  chartRow(
    { title: "Por Unidade",   rows: data.byUnit  || [], lk: "unit",       vk: "total" },
    { title: "Por Tecnico",   rows: data.byTech  || [], lk: "technician", vk: "total" },
    { title: "Por Categoria", rows: data.byCat   || [], lk: "category",   vk: "total" },
  );
  chartRow(
    { title: "Por Departamento", rows: data.byDept  || [], lk: "department", vk: "total" },
    { title: "Mais Solicitantes",rows: data.topRequesters || [], lk: "name", vk: "total" },
    { title: "Tempo Medio (min)",rows: data.avg     || [], lk: "category",   vk: "avgMinutes" },
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Pagina ${p} de ${pages}  —  HelpDesk SEJUSC`,
      W / 2, H - 6, { align: "center" },
    );
  }

  doc.save(`relatorio-helpdesk-${range.from}-${range.to}.pdf`);
}

// ── Chart helpers ─────────────────────────────────────────────────────────────
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
        <div className="flex items-center justify-center h-40"><Spinner /></div>
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
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
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
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltip} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function DailyChart({ data, loading }) {
  const [type, setType] = useState("area");
  const { grid, tick, tooltip } = useChartTheme();

  const fmt = (d) => { const [, m, day] = d.split("-"); return `${day}/${m}`; };
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
          {[["area", TrendingUp, "Área"], ["bar", BarChart2, "Barras"]].map(([v, Icon, label]) => (
            <button
              key={v}
              onClick={() => setType(v)}
              title={label}
              className={`rounded-md p-1.5 transition ${
                type === v
                  ? "bg-white dark:bg-gray-700 shadow-sm text-brand-600 dark:text-brand-400"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
              }`}
            >
              <Icon size={13} />
            </button>
          ))}
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
            <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 11, fill: tick }} tickLine={false} axisLine={false} interval={tickInterval} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: tick }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={tooltip}
              labelFormatter={(d) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; }}
              formatter={(v) => [v, "Chamados"]}
            />
            <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} fill="url(#areaGrad)"
              dot={data.length <= 14 ? { r: 3, fill: "#2563eb" } : false} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 11, fill: tick }} tickLine={false} axisLine={false} interval={tickInterval} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: tick }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={tooltip}
              labelFormatter={(d) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; }}
              formatter={(v) => [v, "Chamados"]}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={32} fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function MonthlyChart({ data, loading }) {
  const { grid, tick, tooltip } = useChartTheme();

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={15} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-100">
          Volume mensal de chamados
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner /></div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-sm text-slate-400 dark:text-gray-500">
          Sem dados no período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis
              dataKey="month"
              tickFormatter={fmtMonth}
              tick={{ fontSize: 11, fill: tick }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: tick }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={tooltip}
              labelFormatter={fmtMonthLong}
              formatter={(v, name) => {
                const labels = { completed: "Concluídos", inProgress: "Em Atendimento", open: "Abertos" };
                return [v, labels[name] ?? name];
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
              formatter={(v) => ({ completed: "Concluídos", inProgress: "Em Atend.", open: "Abertos" }[v] ?? v)}
            />
            <Bar dataKey="completed"  name="completed"  stackId="a" fill="#059669" />
            <Bar dataKey="inProgress" name="inProgress" stackId="a" fill="#d97706" />
            <Bar dataKey="open"       name="open"       stackId="a" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const today     = new Date().toISOString().slice(0, 10);
  const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [range,    setRange]   = useState({ from: thirtyAgo, to: today });
  const [data,     setData]    = useState({});
  const [daily,    setDaily]   = useState([]);
  const [monthly,  setMonthly] = useState([]);
  const [others,   setOthers]  = useState([]);
  const [loading,  setLoading] = useState(true);
  const [pdfBusy,  setPdfBusy] = useState(false);

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
      api.get(`/analytics/by-month${q}`),
    ]).then(([u, t, d, c, a, o, r, day, mon]) => {
      setData({
        byUnit:        u.data,
        byTech:        t.data,
        byDept:        d.data,
        byCat:         c.data,
        avg:           a.data,
        topRequesters: r.data.map((x) => ({ name: x.name, total: x.total })),
      });
      setOthers(o.data);
      setDaily(day.data);
      setMonthly(mon.data);
    }).finally(() => setLoading(false));
  }, [range]);

  async function handleExportPdf() {
    setPdfBusy(true);
    try {
      await exportPdf(data, monthly, range);
    } finally {
      setPdfBusy(false);
    }
  }

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
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              disabled={loading || pdfBusy}
              className="flex items-center gap-2 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/30 px-3.5 py-2 text-sm font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 disabled:opacity-40 transition"
            >
              <FileText size={14} />
              {pdfBusy ? "Gerando…" : "PDF"}
            </button>
          </div>
        </div>

        {/* Volume mensal */}
        {(monthly.length > 1 || loading) && (
          <MonthlyChart data={monthly} loading={loading} />
        )}

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
