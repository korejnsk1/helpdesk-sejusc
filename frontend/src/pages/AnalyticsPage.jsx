import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { Spinner } from "../components/ui";
import { useTheme } from "../context/ThemeContext";
import { useSocket } from "../context/SocketContext";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie, Legend, AreaChart, Area,
} from "recharts";
import {
  Calendar, BarChart2, PieChart as PieChartIcon, TrendingUp,
  FileText, Ticket, ClipboardList, Layers,
} from "lucide-react";
import DateInput from "../components/DateInput";

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

function ascii(s) { return String(s ?? ""); }

// ── PDF shared helpers ────────────────────────────────────────────────────────
const PDF_COLORS = [
  [37,99,235],[124,58,237],[5,150,105],[217,119,6],
  [220,38,38],[8,145,178],[147,51,234],[22,163,74],
];
const BLUE  = [37, 99, 235];
const SLATE = [71, 85, 105];
const DARK  = [15, 23, 42];
const LIGHT = [241, 245, 249];

function buildPdfHelpers(doc, autoTable) {
  const W  = doc.internal.pageSize.getWidth();
  const H  = doc.internal.pageSize.getHeight();
  const M  = 12;
  const GAP  = 5;
  const CW   = W - M * 2;
  const COL2 = (CW - GAP) / 2;
  const COL3 = (CW - GAP * 2) / 3;
  const RX2  = M + COL2 + GAP;
  const RX3  = [M, M + COL3 + GAP, M + (COL3 + GAP) * 2];

  let curY = 0;

  function needPage(h) {
    if (curY + h > H - 12) { doc.addPage(); curY = 12; }
  }

  function halfTable(startY, x, w, title, head, body, maxRows = 7) {
    const rows     = body.slice(0, maxRows);
    const colTotal = rows.reduce((s, row) => s + (Number(row[row.length - 1]) || 0), 0);
    const footRow  = head[0].map((_, i) => i === 0 ? ascii("Total") : (i === head[0].length - 1 ? colTotal : ""));

    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...BLUE);
    doc.text(ascii(title), x, startY);
    doc.setDrawColor(...BLUE); doc.setLineWidth(0.2);
    doc.line(x, startY + 1.2, x + w, startY + 1.2);

    autoTable(doc, {
      startY: startY + 4,
      head, body: rows, foot: [footRow],
      margin: { left: x, right: W - x - w },
      tableWidth: w,
      headStyles:          { fillColor: BLUE, textColor: 255, fontSize: 7.5, fontStyle: "bold" },
      bodyStyles:          { textColor: DARK, fontSize: 7.5 },
      alternateRowStyles:  { fillColor: LIGHT },
      footStyles:          { fillColor: [226, 232, 240], textColor: DARK, fontSize: 7.5, fontStyle: "bold" },
      styles:              { cellPadding: 1.5, font: "helvetica" },
      columnStyles:        { [head[0].length - 1]: { cellWidth: 18 } },
      didParseCell: (data) => { if (data.column.index > 0) data.cell.styles.halign = "right"; },
    });
    return doc.lastAutoTable.finalY;
  }

  function tableRow(lTitle, lHead, lBody, rTitle, rHead, rBody) {
    const needed = Math.max(lBody.length, rBody?.length ?? 0, 1) * 6 + 22;
    needPage(needed);
    const sy   = curY;
    const lEnd = halfTable(sy, M,   COL2, lTitle, lHead, lBody);
    const rEnd = rBody?.length > 0 ? halfTable(sy, RX2, COL2, rTitle, rHead, rBody) : sy;
    curY = Math.max(lEnd, rEnd) + 5;
  }

  function pieChart(startY, colIdx, title, rows, labelKey, valueKey, maxRows = 6) {
    const x     = RX3[colIdx];
    const w     = COL3;
    const slice = rows.slice(0, maxRows).filter((r) => (Number(r[valueKey]) || 0) > 0);
    if (slice.length === 0) return startY + 52;
    const total = slice.reduce((s, r) => s + Number(r[valueKey] || 0), 0);

    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...BLUE);
    doc.text(ascii(title), x + w / 2, startY, { align: "center" });
    doc.setDrawColor(...BLUE); doc.setLineWidth(0.2);
    doc.line(x, startY + 1.2, x + w, startY + 1.2);

    const cx = x + w / 2;
    const pieR = Math.min(w / 2 - 4, 16);
    const cy   = startY + 6 + pieR;
    let angle  = -Math.PI / 2;

    slice.forEach((item, i) => {
      const sweep = (Number(item[valueKey]) / total) * 2 * Math.PI;
      const steps = Math.max(20, Math.ceil(Math.abs(sweep) * 20));
      const color = PDF_COLORS[i % PDF_COLORS.length];
      const pts   = [];
      for (let s = 0; s <= steps; s++) {
        const a = angle + (sweep * s) / steps;
        pts.push([cx + pieR * Math.cos(a), cy + pieR * Math.sin(a)]);
      }
      const segs = [[pts[0][0] - cx, pts[0][1] - cy]];
      for (let s = 1; s < pts.length; s++) segs.push([pts[s][0] - pts[s-1][0], pts[s][1] - pts[s-1][1]]);
      doc.setFillColor(...color);
      doc.lines(segs, cx, cy, [1, 1], "F", true);
      angle += sweep;
    });

    const legendY = cy + pieR + 5;
    slice.forEach((item, i) => {
      const col = i % 2; const row = Math.floor(i / 2);
      const lx = x + col * (w / 2); const ly = legendY + row * 5.5;
      doc.setFillColor(...PDF_COLORS[i % PDF_COLORS.length]);
      doc.rect(lx, ly - 2.5, 2.5, 2.5, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); doc.setTextColor(...SLATE);
      doc.text(ascii(String(item[labelKey])).substring(0, 11), lx + 3.5, ly - 0.3);
    });

    return legendY + Math.ceil(slice.length / 2) * 5.5 + 2;
  }

  function chartRow(s0, s1, s2) {
    needPage(65);
    const sy   = curY;
    const ends = [s0, s1, s2].map((s, i) => s ? pieChart(sy, i, s.title, s.rows, s.lk, s.vk) : sy);
    curY = Math.max(...ends) + 4;
  }

  function sectionHeader(title) {
    needPage(16);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...BLUE);
    doc.setFillColor(...BLUE); doc.rect(M, curY, CW, 0.5, "F");
    curY += 4;
    doc.text(title, M, curY);
    curY += 6;
  }

  function addMonthlyTable(monthly, cols) {
    if (!monthly.length) return;
    needPage(monthly.length * 6 + 18);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...BLUE);
    doc.text("Resumo Mensal", M, curY);
    doc.setDrawColor(...BLUE); doc.setLineWidth(0.25);
    doc.line(M, curY + 1.2, M + CW, curY + 1.2);
    curY += 4;
    autoTable(doc, {
      startY: curY,
      head: [cols.head],
      body: cols.rows(monthly),
      foot: [cols.foot(monthly)],
      margin: { left: M, right: M }, tableWidth: CW,
      headStyles:         { fillColor: BLUE, textColor: 255, fontSize: 8, fontStyle: "bold" },
      bodyStyles:         { textColor: DARK, fontSize: 8 },
      alternateRowStyles: { fillColor: LIGHT },
      footStyles:         { fillColor: [226, 232, 240], textColor: DARK, fontSize: 8, fontStyle: "bold" },
      styles:             { cellPadding: 1.8, font: "helvetica" },
      columnStyles:       { 0: { cellWidth: 58 }, 1: { cellWidth: 30 }, 2: { cellWidth: 34 }, 3: { cellWidth: 34 }, 4: { cellWidth: 30 } },
      didParseCell: (data) => { if (data.column.index > 0) data.cell.styles.halign = "right"; },
    });
    curY = doc.lastAutoTable.finalY + 6;
  }

  function footer() {
    const pages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
      doc.text(`Pagina ${p} de ${pages}  —  HelpDesk SEJUSC`, W / 2, H - 6, { align: "center" });
    }
  }

  return { needPage, halfTable, tableRow, pieChart, chartRow, sectionHeader, addMonthlyTable, footer, get curY() { return curY; }, set curY(v) { curY = v; }, W, H, M, CW };
}

function pdfHeader(doc, subtitle, range) {
  const W = doc.internal.pageSize.getWidth();
  const M = 12;
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 8, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...DARK);
  doc.text("HelpDesk SEJUSC", M, 19);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...SLATE);
  doc.text(subtitle, M, 26);
  doc.text(`Periodo: ${range.from} a ${range.to}   |   Gerado: ${new Date().toLocaleDateString("pt-BR")}`, M, 32);
  return 40;
}

// ── Ticket PDF section ────────────────────────────────────────────────────────
function renderTicketSection(h, data, monthly) {
  h.addMonthlyTable(monthly, {
    head: ["Mês", "Abertos", "Em Atend.", "Concluídos", "Total"],
    rows: (m) => m.map((r) => [ascii(fmtMonthLong(r.month)), r.open, r.inProgress, r.completed, r.total]),
    foot: (m) => [
      ascii("Total"),
      m.reduce((s, r) => s + (r.open       || 0), 0),
      m.reduce((s, r) => s + (r.inProgress || 0), 0),
      m.reduce((s, r) => s + (r.completed  || 0), 0),
      m.reduce((s, r) => s + (r.total      || 0), 0),
    ],
  });
  h.tableRow(
    "Chamados por Núcleo",    [["Núcleo",   "Total"]], (data.byUnit  || []).map((r) => [ascii(r.unit),       r.total]),
    "Chamados por Técnico",   [["Técnico",  "Total"]], (data.byTech  || []).map((r) => [ascii(r.technician), r.total]),
  );
  h.tableRow(
    "Por Categoria",          [["Categoria","Total"]], (data.byCat   || []).map((r) => [ascii(r.category),   r.total]),
    "Por Setor",              [["Setor",    "Total"]], (data.byDept  || []).map((r) => [ascii(r.department),  r.total]),
  );
  h.tableRow(
    "Mais Solicitantes",                  [["Nome",   "Total"]], (data.topRequesters || []).map((r) => [ascii(r.name),  r.total]),
    "Tempo Médio por Núcleo (min)",       [["Núcleo", "Média"]], (data.avgByUnit     || []).map((r) => [ascii(r.unit),  r.avgMinutes]),
  );
  h.sectionHeader("Gráficos — Chamados");
  h.chartRow(
    { title: "Por Núcleo",    rows: data.byUnit  || [], lk: "unit",       vk: "total" },
    { title: "Por Técnico",   rows: data.byTech  || [], lk: "technician", vk: "total" },
    { title: "Por Categoria", rows: data.byCat   || [], lk: "category",   vk: "total" },
  );
  h.chartRow(
    { title: "Por Setor",         rows: data.byDept        || [], lk: "department", vk: "total"      },
    { title: "Mais Solicitantes", rows: data.topRequesters || [], lk: "name",       vk: "total"      },
    { title: "Tempo Médio (min)", rows: data.avgByUnit     || [], lk: "unit",       vk: "avgMinutes" },
  );
}

// ── OS PDF section ────────────────────────────────────────────────────────────
function renderOsSection(h, osData, osMonthly) {
  h.addMonthlyTable(osMonthly, {
    head: ["Mês", "Abertas", "Em Andamento", "Concluídas", "Total"],
    rows: (m) => m.map((r) => [ascii(fmtMonthLong(r.month)), r.aberta, r.emAndamento, r.concluida, r.total]),
    foot: (m) => [
      ascii("Total"),
      m.reduce((s, r) => s + (r.aberta      || 0), 0),
      m.reduce((s, r) => s + (r.emAndamento || 0), 0),
      m.reduce((s, r) => s + (r.concluida   || 0), 0),
      m.reduce((s, r) => s + (r.total       || 0), 0),
    ],
  });
  h.tableRow(
    "OS por Status",    [["Status",  "Total"]], (osData.byStatus || []).map((r) => [ascii(r.label),   r.total]),
    "OS por Tipo",      [["Tipo",    "Total"]], (osData.byTipo   || []).map((r) => [ascii(r.label),   r.total]),
  );
  h.tableRow(
    "OS por Núcleo",    [["Núcleo",  "Total"]], (osData.byUnit   || []).map((r) => [ascii(r.unit),    r.total]),
    "OS por Técnico",   [["Técnico", "Total"]], (osData.byTecnico|| []).map((r) => [ascii(r.tecnico), r.total]),
  );
  h.sectionHeader("Gráficos — Ordens de Serviço");
  h.chartRow(
    { title: "Por Status",  rows: osData.byStatus  || [], lk: "label",   vk: "total" },
    { title: "Por Tipo",    rows: osData.byTipo    || [], lk: "label",   vk: "total" },
    { title: "Por Núcleo",  rows: osData.byUnit    || [], lk: "unit",    vk: "total" },
  );
  h.chartRow(
    { title: "Por Técnico", rows: osData.byTecnico || [], lk: "tecnico", vk: "total" },
    null, null,
  );
}

// ── PDF exports ───────────────────────────────────────────────────────────────
async function exportTicketsPdf(data, monthly, range) {
  const { jsPDF }     = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const h   = buildPdfHelpers(doc, autoTable);
  h.curY    = pdfHeader(doc, "Relatório de Chamados", range);
  renderTicketSection(h, data, monthly);
  h.footer();
  doc.save(`relatorio-chamados-${range.from}-${range.to}.pdf`);
}

async function exportOsPdf(osData, osMonthly, range) {
  const { jsPDF }     = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const h   = buildPdfHelpers(doc, autoTable);
  h.curY    = pdfHeader(doc, "Relatório de Ordens de Serviço", range);
  renderOsSection(h, osData, osMonthly);
  h.footer();
  doc.save(`relatorio-os-${range.from}-${range.to}.pdf`);
}

async function exportCombinedPdf(data, monthly, osData, osMonthly, range) {
  const { jsPDF }     = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const h   = buildPdfHelpers(doc, autoTable);

  h.curY = pdfHeader(doc, "Relatório Completo — Chamados & Ordens de Serviço", range);
  renderTicketSection(h, data, monthly);

  doc.addPage();
  h.curY = pdfHeader(doc, "Ordens de Serviço", range);
  renderOsSection(h, osData, osMonthly);

  h.footer();
  doc.save(`relatorio-completo-${range.from}-${range.to}.pdf`);
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
      {[["bar", BarChart2, "Barras"], ["pie", PieChartIcon, "Pizza"]].map(([v, Icon, label]) => (
        <button key={v} onClick={() => onChange(v)} title={label}
          className={`rounded-md p-1.5 transition ${
            type === v
              ? "bg-white dark:bg-gray-700 shadow-sm text-brand-600 dark:text-brand-400"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
          }`}
        ><Icon size={13} /></button>
      ))}
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
        <div className="flex items-center justify-center h-40 text-sm text-slate-400 dark:text-gray-500">Sem dados no período</div>
      ) : type === "bar" ? (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: tick }} tickLine={false} axisLine={false} interval={0}
              angle={data.length > 4 ? -25 : 0} textAnchor={data.length > 4 ? "end" : "middle"} height={data.length > 4 ? 50 : 30} />
            <YAxis tick={{ fontSize: 11, fill: tick }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltip} cursor={false} />
            <Bar dataKey={yKey} radius={[6, 6, 0, 0]} maxBarSize={48}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="44%" innerRadius={55} outerRadius={90} paddingAngle={2}>
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
          <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-100">Volume diário de chamados</h2>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 dark:bg-gray-800 p-0.5">
          {[["area", TrendingUp, "Área"], ["bar", BarChart2, "Barras"]].map(([v, Icon, label]) => (
            <button key={v} onClick={() => setType(v)} title={label}
              className={`rounded-md p-1.5 transition ${type === v ? "bg-white dark:bg-gray-700 shadow-sm text-brand-600 dark:text-brand-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"}`}
            ><Icon size={13} /></button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner /></div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-sm text-slate-400 dark:text-gray-500">Sem dados no período</div>
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
            <Tooltip contentStyle={tooltip} labelFormatter={(d) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; }} formatter={(v) => [v, "Chamados"]} />
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
            <Tooltip contentStyle={tooltip} cursor={false} labelFormatter={(d) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; }} formatter={(v) => [v, "Chamados"]} />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={32} fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function MonthlyChart({ data, loading, title = "Volume mensal de chamados" }) {
  const { grid, tick, tooltip } = useChartTheme();

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={15} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-100">{title}</h2>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner /></div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-sm text-slate-400 dark:text-gray-500">Sem dados no período</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: tick }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: tick }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltip} cursor={false} labelFormatter={fmtMonthLong}
              formatter={(v, name) => {
                const labels = { completed: "Concluídos", inProgress: "Em Atendimento", open: "Abertos",
                                 concluida: "Concluídas", emAndamento: "Em Andamento", aberta: "Abertas", cancelada: "Canceladas" };
                return [v, labels[name] ?? name];
              }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }}
              formatter={(v) => ({
                completed: "Concluídos", inProgress: "Em Atend.", open: "Abertos",
                concluida: "Concluídas", emAndamento: "Em Andamento", aberta: "Abertas", cancelada: "Canceladas",
              }[v] ?? v)} />
            {/* Ticket keys */}
            {data[0]?.completed   !== undefined && <Bar dataKey="completed"   name="completed"   stackId="a" fill="#059669" />}
            {data[0]?.inProgress  !== undefined && <Bar dataKey="inProgress"  name="inProgress"  stackId="a" fill="#d97706" />}
            {data[0]?.open        !== undefined && <Bar dataKey="open"        name="open"        stackId="a" fill="#2563eb" radius={[4,4,0,0]} />}
            {/* OS keys */}
            {data[0]?.concluida   !== undefined && <Bar dataKey="concluida"   name="concluida"   stackId="a" fill="#059669" />}
            {data[0]?.emAndamento !== undefined && <Bar dataKey="emAndamento" name="emAndamento" stackId="a" fill="#d97706" />}
            {data[0]?.aberta      !== undefined && <Bar dataKey="aberta"      name="aberta"      stackId="a" fill="#2563eb" radius={[4,4,0,0]} />}
            {data[0]?.cancelada   !== undefined && <Bar dataKey="cancelada"   name="cancelada"   stackId="a" fill="#94a3b8" />}
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

  const socket = useSocket();

  const [panel,    setPanel]   = useState("chamados"); // "chamados" | "os"
  const [range,    setRange]   = useState({ from: thirtyAgo, to: today });

  // Ticket data
  const [data,     setData]    = useState({});
  const [daily,    setDaily]   = useState([]);
  const [monthly,  setMonthly] = useState([]);
  const [others,   setOthers]  = useState([]);
  const [loading,  setLoading] = useState(true);

  // OS data
  const [osData,    setOsData]    = useState({});
  const [osMonthly, setOsMonthly] = useState([]);
  const [osLoading, setOsLoading] = useState(false);
  const [osLoaded,  setOsLoaded]  = useState(false);

  // PDF
  const [pdfBusy,  setPdfBusy]  = useState(false);
  const [pdfErr,   setPdfErr]   = useState("");

  const load = useCallback((from, to) => {
    setLoading(true);
    const q = `?from=${from}&to=${to}T23:59:59`;
    Promise.all([
      api.get(`/analytics/by-unit${q}`),
      api.get(`/analytics/by-technician${q}`),
      api.get(`/analytics/by-department${q}`),
      api.get(`/analytics/by-category${q}`),
      api.get(`/analytics/avg-resolution${q}`),
      api.get(`/analytics/avg-resolution-by-unit${q}`),
      api.get(`/analytics/other${q}`),
      api.get(`/analytics/top-requesters${q}&limit=10`),
      api.get(`/analytics/by-day${q}`),
      api.get(`/analytics/by-month${q}`),
    ]).then(([u, t, d, c, a, au, o, r, day, mon]) => {
      setData({
        byUnit:        u.data,
        byTech:        t.data,
        byDept:        d.data,
        byCat:         c.data,
        avg:           a.data,
        avgByUnit:     au.data,
        topRequesters: r.data.map((x) => ({ name: x.name, total: x.total })),
      });
      setOthers(o.data);
      setDaily(day.data);
      setMonthly(mon.data);
    }).finally(() => setLoading(false));
  }, []);

  const loadOs = useCallback((from, to) => {
    setOsLoading(true);
    const q = `?from=${from}&to=${to}T23:59:59`;
    Promise.all([
      api.get(`/analytics/os/by-status${q}`),
      api.get(`/analytics/os/by-tipo${q}`),
      api.get(`/analytics/os/by-unit${q}`),
      api.get(`/analytics/os/by-tecnico${q}`),
      api.get(`/analytics/os/by-month${q}`),
    ]).then(([s, t, u, te, m]) => {
      setOsData({ byStatus: s.data, byTipo: t.data, byUnit: u.data, byTecnico: te.data });
      setOsMonthly(m.data);
      setOsLoaded(true);
    }).finally(() => setOsLoading(false));
  }, []);

  useEffect(() => { load(range.from, range.to); }, [range, load]);

  useEffect(() => {
    if (panel === "os") loadOs(range.from, range.to);
  }, [panel, range, loadOs]);

  useEffect(() => {
    const s = socket?.current;
    if (!s) return;
    const onDeleted = () => load(range.from, range.to);
    s.on("ticket:deleted", onDeleted);
    return () => s.off("ticket:deleted", onDeleted);
  }, [socket, load, range]);

  async function handlePdf() {
    setPdfBusy(true); setPdfErr("");
    try {
      if (panel === "chamados") {
        await exportTicketsPdf(data, monthly, range);
      } else {
        if (!osLoaded) await new Promise((res) => setTimeout(res, 0));
        await exportOsPdf(osData, osMonthly, range);
      }
    } catch { setPdfErr("Não foi possível gerar o PDF."); }
    finally { setPdfBusy(false); }
  }

  async function handleCombinedPdf() {
    setPdfBusy(true); setPdfErr("");
    try {
      // ensure OS data is loaded
      if (!osLoaded) {
        await new Promise((resolve) => {
          const q = `?from=${range.from}&to=${range.to}T23:59:59`;
          Promise.all([
            api.get(`/analytics/os/by-status${q}`),
            api.get(`/analytics/os/by-tipo${q}`),
            api.get(`/analytics/os/by-unit${q}`),
            api.get(`/analytics/os/by-tecnico${q}`),
            api.get(`/analytics/os/by-month${q}`),
          ]).then(([s, t, u, te, m]) => {
            const od = { byStatus: s.data, byTipo: t.data, byUnit: u.data, byTecnico: te.data };
            const om = m.data;
            setOsData(od); setOsMonthly(om); setOsLoaded(true);
            exportCombinedPdf(data, monthly, od, om, range).then(resolve);
          });
        });
      } else {
        await exportCombinedPdf(data, monthly, osData, osMonthly, range);
      }
    } catch { setPdfErr("Não foi possível gerar o PDF."); }
    finally { setPdfBusy(false); }
  }

  const tabs = [
    { key: "chamados", label: "Chamados",          Icon: Ticket        },
    { key: "os",       label: "Ordens de Serviço", Icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <AppHeader />

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">

        {/* Filtro de período + PDF */}
        <div className="card px-5 py-4 flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-gray-200">
            <Calendar size={16} className="text-brand-600" />
            Período
          </div>
          <div className="flex items-center gap-2">
            <div>
              <label className="field-label text-xs">De</label>
              <DateInput
                value={range.from}
                max={range.to}
                onChange={(v) => v && setRange({ ...range, from: v })}
                className="w-36"
              />
            </div>
            <div>
              <label className="field-label text-xs">Até</label>
              <DateInput
                value={range.to}
                min={range.from}
                onChange={(v) => v && setRange({ ...range, to: v })}
                className="w-36"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
            {pdfErr && <span className="text-xs text-red-600 dark:text-red-400">{pdfErr}</span>}
            <button
              onClick={handlePdf}
              disabled={(panel === "chamados" ? loading : osLoading) || pdfBusy}
              className="flex items-center gap-2 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/30 px-3.5 py-2 text-sm font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 disabled:opacity-40 transition"
            >
              <FileText size={14} />
              {pdfBusy ? "Gerando…" : "Exportar PDF"}
            </button>
            <button
              onClick={handleCombinedPdf}
              disabled={loading || pdfBusy}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2 text-sm font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 disabled:opacity-40 transition"
            >
              <Layers size={14} />
              {pdfBusy ? "Gerando…" : "Exportar Tudo"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-gray-700">
          {tabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setPanel(key)}
              className={`flex items-center gap-1.5 pb-2.5 px-3 text-sm font-medium transition border-b-2 -mb-px ${
                panel === key
                  ? "border-brand-600 dark:border-brand-400 text-brand-700 dark:text-brand-300"
                  : "border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ── CHAMADOS panel ── */}
        {panel === "chamados" && (
          <>
            {(monthly.length > 1 || loading) && (
              <MonthlyChart data={monthly} loading={loading} />
            )}
            <DailyChart data={daily} loading={loading} />
            <div className="grid md:grid-cols-2 gap-5">
              <ChartCard title="Chamados por Núcleo"           data={data.byUnit  || []} xKey="unit"        loading={loading} />
              <ChartCard title="Chamados por técnico"           data={data.byTech  || []} xKey="technician"  loading={loading} />
              <ChartCard title="Setores mais solicitantes"      data={data.byDept  || []} xKey="department"  loading={loading} />
              <ChartCard title="Categorias mais solicitadas"    data={data.byCat   || []} xKey="category"    loading={loading} />
              <ChartCard title="Usuários mais solicitantes"     data={data.topRequesters || []} xKey="name"  loading={loading} />
            </div>
            <ChartCard
              title="Tempo médio de resolução por núcleo (minutos)"
              data={data.avgByUnit || []} xKey="unit" yKey="avgMinutes"
              loading={loading} onlyBar
            />
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-100 mb-1">
                Chamados "Outro" — para reclassificação
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
                Chamados abertos com descrição livre, úteis para planejamento preventivo.
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
          </>
        )}

        {/* ── OS panel ── */}
        {panel === "os" && (
          <>
            {(osMonthly.length > 1 || osLoading) && (
              <MonthlyChart data={osMonthly} loading={osLoading} title="Volume mensal de OS" />
            )}
            <div className="grid md:grid-cols-2 gap-5">
              <ChartCard title="OS por Status"    data={(osData.byStatus  || []).map((r) => ({ ...r, label: r.label }))} xKey="label"   loading={osLoading} />
              <ChartCard title="OS por Tipo"      data={(osData.byTipo    || []).map((r) => ({ ...r, label: r.label }))} xKey="label"   loading={osLoading} />
              <ChartCard title="OS por Núcleo"    data={osData.byUnit    || []} xKey="unit"    loading={osLoading} />
              <ChartCard title="OS por Técnico"   data={osData.byTecnico || []} xKey="tecnico" loading={osLoading} />
            </div>
          </>
        )}

      </main>
    </div>
  );
}
