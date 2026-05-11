import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useSocket } from "../context/SocketContext";
import { Spinner } from "../components/ui";
import DateInput from "../components/DateInput";
import AppHeader from "../components/AppHeader";
import {
  ClipboardList, Plus, ChevronRight, Calendar, MapPin,
  Users, Filter, RefreshCw, Clock,
} from "lucide-react";

const TIPO_LABELS = {
  VISITA_TECNICA:           "Visita Técnica",
  TROCA_EQUIPAMENTO:        "Troca de Equipamento",
  ENTREGA:                  "Entrega",
  MANUTENCAO_REDE:          "Manutenção de Rede",
  MANUTENCAO_CAMERA:        "Manutenção de Câmera",
  RECOLHIMENTO_EQUIPAMENTO: "Recolhimento de Equipamento",
  ACAO:                     "Ação",
  OUTRO:                    "Outro",
};

const STATUS_STYLE = {
  ABERTA:       "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  EM_ANDAMENTO: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  CONCLUIDA:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  CANCELADA:    "bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_LABEL = {
  ABERTA:       "Aberta",
  EM_ANDAMENTO: "Em Andamento",
  CONCLUIDA:    "Concluída",
  CANCELADA:    "Cancelada",
};

const STATUS_TABS = [
  { key: "",             label: "Todas"       },
  { key: "ABERTA",       label: "Abertas"     },
  { key: "EM_ANDAMENTO", label: "Em Andamento"},
  { key: "CONCLUIDA",    label: "Concluídas"  },
];

const TIPO_OPTIONS = [
  { value: "",                         label: "Todos os tipos"            },
  { value: "VISITA_TECNICA",           label: "Visita Técnica"            },
  { value: "TROCA_EQUIPAMENTO",        label: "Troca de Equipamento"      },
  { value: "ENTREGA",                  label: "Entrega"                   },
  { value: "MANUTENCAO_REDE",          label: "Manutenção de Rede"        },
  { value: "MANUTENCAO_CAMERA",        label: "Manutenção de Câmera"      },
  { value: "RECOLHIMENTO_EQUIPAMENTO", label: "Recolhimento de Equipamento"},
  { value: "ACAO",                     label: "Ação"                      },
  { value: "OUTRO",                    label: "Outro"                     },
];

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function OsStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status] || "bg-slate-100 text-slate-600"}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

// ── Create OS modal ───────────────────────────────────────────────────────────
function CreateOsModal({ onClose, onCreate, units }) {
  const [form, setForm] = useState({
    tipo: "VISITA_TECNICA", local: "", problema: "",
    materiais: "", prazo: "", unitId: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const payload = {
        tipo:      form.tipo,
        local:     form.local,
        problema:  form.problema || null,
        materiais: form.materiais || null,
        prazo:     form.prazo ? new Date(form.prazo).toISOString() : null,
        unitId:    form.unitId ? Number(form.unitId) : null,
      };
      const res = await api.post("/work-orders", payload);
      onCreate(res.data);
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao criar OS");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400">
            <ClipboardList size={20} />
          </span>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-gray-100">Nova Ordem de Serviço</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">Campos marcados com * são obrigatórios</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Tipo *</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="field-input">
                {TIPO_OPTIONS.slice(1).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Núcleo responsável</label>
              <select value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })} className="field-input">
                <option value="">A definir</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="field-label">Local / Destino *</label>
            <input
              type="text" required
              value={form.local}
              onChange={(e) => setForm({ ...form, local: e.target.value })}
              placeholder="Ex: Setor de RH — Bloco B, ou Órgão X — Rua Y"
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label">Descrição do problema / atividade</label>
            <textarea
              rows={3}
              value={form.problema}
              onChange={(e) => setForm({ ...form, problema: e.target.value })}
              placeholder="O que precisa ser feito..."
              className="field-input resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Materiais / equipamentos</label>
              <input
                type="text"
                value={form.materiais}
                onChange={(e) => setForm({ ...form, materiais: e.target.value })}
                placeholder="Ex: Cabo UTP, Switch 8p..."
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Prazo</label>
              <DateInput
                value={form.prazo}
                onChange={(v) => setForm({ ...form, prazo: v })}
              />
            </div>
          </div>

          {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
            <button
              type="submit" disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-sm font-semibold transition disabled:opacity-60"
            >
              {saving ? <Spinner className="h-4 w-4" /> : <Plus size={14} />}
              Criar OS
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function WorkOrdersPage() {
  const socket = useSocket();
  const nav = useNavigate();

  const [orders, setOrders]       = useState([]);
  const [units, setUnits]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatus] = useState("");
  const [tipoFilter, setTipo]     = useState("");
  const [unitFilter, setUnit]     = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (tipoFilter) params.tipo   = tipoFilter;
      if (unitFilter) params.unitId = unitFilter;
      const res = await api.get("/work-orders", { params });
      setOrders(res.data);
    } finally {
      setLoading(false);
    }
  }, [tipoFilter, unitFilter]);

  useEffect(() => {
    api.get("/units").then((r) => setUnits(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const s = socket?.current;
    if (!s) return;
    const refresh = () => load();
    s.on("workorder:created", refresh);
    s.on("workorder:updated", refresh);
    s.on("workorder:deleted", refresh);
    return () => {
      s.off("workorder:created", refresh);
      s.off("workorder:updated", refresh);
      s.off("workorder:deleted", refresh);
    };
  }, [socket, load]);

  function handleCreated(os) {
    setShowCreate(false);
    nav(`/painel/os/${os.id}`);
  }

  const hasFilters = tipoFilter || unitFilter;
  const visible    = statusFilter ? orders.filter((o) => o.status === statusFilter) : orders;
  const tabCounts  = STATUS_TABS.reduce((acc, tab) => {
    acc[tab.key] = tab.key ? orders.filter((o) => o.status === tab.key).length : orders.length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <AppHeader />

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={20} className="text-brand-600" />
            <h1 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Ordens de Serviço</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition"
            >
              <RefreshCw size={13} /> Atualizar
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-2 text-sm font-semibold transition"
            >
              <Plus size={15} /> Nova OS
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-gray-700 pb-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatus(tab.key)}
                className={`relative pb-2 text-sm font-medium transition ${
                  statusFilter === tab.key
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {tab.label}
                  {tabCounts[tab.key] > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none ${
                      statusFilter === tab.key
                        ? "bg-brand-200 dark:bg-brand-800/60 text-brand-800 dark:text-brand-300"
                        : "bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400"
                    }`}>
                      {tabCounts[tab.key]}
                    </span>
                  )}
                </span>
                {statusFilter === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-600 dark:bg-brand-400" />
                )}
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-400 dark:text-gray-500">{visible.length} OS</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-slate-400 dark:text-gray-500 shrink-0" />
            <select value={tipoFilter} onChange={(e) => setTipo(e.target.value)} className="field-input py-1.5 text-xs w-auto min-w-0 max-w-[220px]">
              {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={unitFilter} onChange={(e) => setUnit(e.target.value)} className="field-input py-1.5 text-xs w-auto min-w-0 max-w-[180px]">
              <option value="">Todos os núcleos</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            {hasFilters && (
              <button
                onClick={() => { setTipo(""); setUnit(""); }}
                className="text-xs text-slate-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        )}

        {/* Empty */}
        {!loading && visible.length === 0 && (
          <div className="card p-14 text-center">
            <div className="text-4xl mb-3">📋</div>
            <div className="font-semibold text-slate-700 dark:text-gray-300">Nenhuma OS encontrada</div>
            <p className="text-sm text-slate-400 dark:text-gray-500 mt-1">Crie uma nova ordem de serviço clicando em "Nova OS"</p>
          </div>
        )}

        {/* Lista */}
        {!loading && visible.length > 0 && (
          <div className="card divide-y divide-slate-100 dark:divide-gray-700/60">
            {visible.map((os) => (
              <Link
                key={os.id}
                to={`/painel/os/${os.id}`}
                className="group flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-gray-800/60 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-slate-400 dark:text-gray-500">{os.osNumber}</span>
                    <OsStatusBadge status={os.status} />
                    <span className="text-xs text-slate-400 dark:text-gray-500 bg-slate-100 dark:bg-gray-800 rounded px-1.5 py-0.5">
                      {TIPO_LABELS[os.tipo]}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-slate-800 dark:text-gray-100 mt-0.5 truncate flex items-center gap-1.5">
                    <MapPin size={11} className="text-slate-400 shrink-0" />
                    {os.local}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {os.unit && (
                      <span className="text-xs text-slate-400 dark:text-gray-500">{os.unit.name}</span>
                    )}
                    {os.tecnicos.length > 0 && (
                      <span className="text-xs text-slate-400 dark:text-gray-500 flex items-center gap-1">
                        <Users size={10} />
                        {os.tecnicos.length} técnico{os.tecnicos.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {os.tickets.length > 0 && (
                      <span className="text-xs text-slate-400 dark:text-gray-500">
                        {os.tickets.length} chamado{os.tickets.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  {os.prazo && (() => {
                    const overdue = new Date(os.prazo) < new Date() && !["CONCLUIDA", "CANCELADA"].includes(os.status);
                    return (
                      <div className={`text-xs flex items-center gap-1 justify-end ${overdue ? "text-red-500 dark:text-red-400 font-medium" : "text-slate-500 dark:text-gray-400"}`}>
                        <Clock size={10} />
                        {fmtDate(os.prazo)}
                        {overdue && <span className="text-[10px] uppercase tracking-wide">vencido</span>}
                      </div>
                    );
                  })()}
                  <div className="text-xs text-slate-400 dark:text-gray-500">
                    {fmtDate(os.createdAt)}
                  </div>
                </div>

                <ChevronRight size={16} className="text-slate-300 dark:text-gray-600 group-hover:text-brand-500 dark:group-hover:text-brand-400 shrink-0 transition" />
              </Link>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateOsModal
          units={units}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreated}
        />
      )}
    </div>
  );
}
