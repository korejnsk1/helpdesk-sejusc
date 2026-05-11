import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, Spinner } from "../components/ui";
import DateInput from "../components/DateInput";
import AppHeader from "../components/AppHeader";
import {
  ArrowLeft, ChevronRight, MapPin, Users, Clock,
  Wrench, Edit2, Check, X, Plus, Trash2, Link2, Unlink,
  AlertTriangle, CheckCircle2, Play, XCircle,
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

const TIPO_OPTIONS = [
  "VISITA_TECNICA","TROCA_EQUIPAMENTO","ENTREGA",
  "MANUTENCAO_REDE","MANUTENCAO_CAMERA","RECOLHIMENTO_EQUIPAMENTO","ACAO","OUTRO",
];

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

const TRANSITION_CONFIG = {
  EM_ANDAMENTO: { label: "Iniciar",   icon: Play,        cls: "bg-blue-600 hover:bg-blue-700 text-white" },
  CONCLUIDA:    { label: "Concluir",  icon: CheckCircle2, cls: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  CANCELADA:    { label: "Cancelar",  icon: XCircle,     cls: "bg-red-600 hover:bg-red-700 text-white" },
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDateInput(d) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function OsStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status] || ""}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-400 dark:text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm text-slate-800 dark:text-gray-100 whitespace-pre-wrap">{value || "—"}</div>
    </div>
  );
}

// ── Transition modal ──────────────────────────────────────────────────────────
function TransitionModal({ toStatus, onConfirm, onClose }) {
  const [note, setNote]           = useState("");
  const [relatorio, setRelatorio] = useState("");
  const [saving, setSaving]       = useState(false);
  const needsRelatorio = toStatus === "CONCLUIDA";

  async function confirm() {
    setSaving(true);
    try { await onConfirm({ toStatus, note: note || null, relatorio: relatorio || null }); }
    finally { setSaving(false); }
  }

  const cfg = TRANSITION_CONFIG[toStatus];
  const Icon = cfg?.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            toStatus === "CANCELADA" ? "bg-red-100 dark:bg-red-900/40 text-red-600" : "bg-brand-100 dark:bg-brand-900/40 text-brand-600"
          }`}>
            {Icon && <Icon size={20} />}
          </span>
          <h3 className="font-semibold text-slate-900 dark:text-gray-100">{cfg?.label} OS</h3>
        </div>

        {needsRelatorio && (
          <div>
            <label className="field-label">Relatório de conclusão</label>
            <textarea
              rows={3} value={relatorio}
              onChange={(e) => setRelatorio(e.target.value)}
              placeholder="Descreva o que foi realizado (opcional)..."
              className="field-input resize-none text-sm"
            />
          </div>
        )}

        <div>
          <label className="field-label">Observação {needsRelatorio ? "(opcional)" : ""}</label>
          <textarea
            rows={2} value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Observação para o histórico..."
            className="field-input resize-none text-sm"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
          <button
            onClick={confirm} disabled={saving}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${cfg?.cls}`}
          >
            {saving ? <Spinner className="h-4 w-4" /> : Icon && <Icon size={14} />}
            {cfg?.label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Link ticket modal ─────────────────────────────────────────────────────────
function LinkTicketModal({ onLink, onClose }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  async function search() {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await api.get("/tickets", { params: { limit: 20 } });
      const filtered = res.data.tickets.filter((t) =>
        t.ticketNumber.toLowerCase().includes(q.toLowerCase()) ||
        t.requesterName.toLowerCase().includes(q.toLowerCase())
      );
      setResults(filtered);
    } finally { setSearching(false); }
  }

  useEffect(() => {
    const t = setTimeout(search, 400);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-md p-6 space-y-3">
        <h3 className="font-semibold text-slate-900 dark:text-gray-100 flex items-center gap-2">
          <Link2 size={16} className="text-brand-600" /> Vincular chamado
        </h3>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por protocolo ou nome..."
          className="field-input"
          autoFocus
        />
        {searching && <div className="flex justify-center py-4"><Spinner className="h-5 w-5" /></div>}
        {results.length > 0 && (
          <div className="divide-y divide-slate-100 dark:divide-gray-700/60 max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-gray-700">
            {results.map((t) => (
              <button
                key={t.id}
                onClick={() => onLink(t.id)}
                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-gray-800 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">{t.ticketNumber}</span>
                  <StatusBadge status={t.status} />
                </div>
                <div className="text-sm text-slate-700 dark:text-gray-300">{t.requesterName}</div>
                <div className="text-xs text-slate-400">{t.department}</div>
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <button onClick={onClose} className="btn-secondary text-sm py-2 px-4">Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteOsModal({ osNumber, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  async function confirm() {
    setDeleting(true);
    try { await onConfirm(); }
    finally { setDeleting(false); }
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600">
            <Trash2 size={20} />
          </span>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-gray-100">Excluir OS</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Esta ação não pode ser desfeita.</p>
          </div>
        </div>
        <p className="text-sm text-slate-700 dark:text-gray-300">
          Confirmar exclusão de <span className="font-mono font-medium">{osNumber}</span>? Todo o histórico e vínculos serão removidos.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
          <button
            onClick={confirm}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-semibold transition disabled:opacity-60"
          >
            {deleting ? <Spinner className="h-4 w-4" /> : <Trash2 size={14} />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function WorkOrderDetailPage() {
  const { id }  = useParams();
  const nav     = useNavigate();
  const { user } = useAuth();

  const [os, setOs]               = useState(null);
  const [units, setUnits]         = useState([]);
  const [techs, setTechs]         = useState([]);
  const [transition, setTrans]    = useState(null);
  const [showLinkTicket, setShowLink] = useState(false);
  const [showDelete, setShowDelete]   = useState(false);
  const [err, setErr]             = useState("");
  const [editing, setEditing]     = useState(false);
  const [editForm, setEditForm]   = useState({});
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async () => {
    const [osRes, unitsRes, techsRes] = await Promise.all([
      api.get(`/work-orders/${id}`),
      api.get("/units"),
      api.get("/technicians"),
    ]);
    setOs(osRes.data);
    setUnits(unitsRes.data);
    setTechs(techsRes.data);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const canEdit = os && os.status !== "CONCLUIDA" && os.status !== "CANCELADA";
  const isAdmin = user?.role === "ADMIN";

  function startEdit() {
    setEditForm({
      tipo:      os.tipo,
      local:     os.local,
      problema:  os.problema || "",
      materiais: os.materiais || "",
      prazo:     os.prazo ? new Date(os.prazo).toISOString().slice(0, 10) : "",
      unitId:    os.unit ? String(os.unit.id) : "",
    });
    setEditing(true);
    setErr("");
  }

  async function saveEdit() {
    setSaving(true);
    setErr("");
    try {
      const res = await api.patch(`/work-orders/${id}`, {
        tipo:      editForm.tipo,
        local:     editForm.local,
        problema:  editForm.problema || null,
        materiais: editForm.materiais || null,
        prazo:     editForm.prazo ? new Date(editForm.prazo).toISOString() : null,
        unitId:    editForm.unitId ? Number(editForm.unitId) : null,
      });
      setOs(res.data);
      setEditing(false);
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function doTransition({ toStatus, note, relatorio }) {
    setErr("");
    try {
      const res = await api.post(`/work-orders/${id}/transition`, { toStatus, note, relatorio });
      setOs(res.data);
      setTrans(null);
    } catch (e) { setErr(e.response?.data?.error || "Erro na transição"); }
  }

  async function addTecnico(userId) {
    try {
      const res = await api.post(`/work-orders/${id}/tecnicos`, { userId });
      setOs(res.data);
    } catch (e) { setErr(e.response?.data?.error || "Erro ao adicionar técnico"); }
  }

  async function removeTecnico(userId) {
    try {
      const res = await api.delete(`/work-orders/${id}/tecnicos/${userId}`);
      setOs(res.data);
    } catch (e) { setErr(e.response?.data?.error || "Erro ao remover técnico"); }
  }

  async function linkTicket(ticketId) {
    try {
      const res = await api.post(`/work-orders/${id}/tickets`, { ticketId });
      setOs(res.data);
      setShowLink(false);
    } catch (e) { setErr(e.response?.data?.error || "Erro ao vincular chamado"); }
  }

  async function unlinkTicket(ticketId) {
    try {
      const res = await api.delete(`/work-orders/${id}/tickets/${ticketId}`);
      setOs(res.data);
    } catch (e) { setErr(e.response?.data?.error || "Erro ao desvincular chamado"); }
  }

  async function deleteOs() {
    await api.delete(`/work-orders/${id}`);
    nav("/painel/os");
  }

  if (!os) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
      <Spinner className="h-8 w-8" />
    </div>
  );

  const unitOptions = [
    { value: "", label: "A definir" },
    ...units.map((u) => ({ value: String(u.id), label: u.name })),
  ];

  const assignedTechIds = new Set(os.tecnicos.map((t) => t.id));
  const availableTechs  = techs.filter((t) => !assignedTechIds.has(t.id));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <AppHeader />

      {/* Sub-header */}
      <div className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-3 text-sm">
          <Link to="/painel/os" className="flex items-center gap-1.5 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition">
            <ArrowLeft size={14} /> OS
          </Link>
          <ChevronRight size={14} className="text-slate-300 dark:text-gray-600" />
          <span className="font-mono text-slate-600 dark:text-gray-300">{os.osNumber}</span>
          <div className="ml-auto flex items-center gap-2">
            <OsStatusBadge status={os.status} />
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
        {err && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            <AlertTriangle size={15} /> {err}
            <button onClick={() => setErr("")} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {/* Barra de ações */}
        <div className="flex items-center gap-2 flex-wrap">
          {os.allowedNext.map((next) => {
            const cfg = TRANSITION_CONFIG[next];
            if (!cfg) return null;
            const Icon = cfg.icon;
            return (
              <button
                key={next}
                onClick={() => setTrans(next)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${cfg.cls}`}
              >
                <Icon size={14} /> {cfg.label}
              </button>
            );
          })}
          {canEdit && !editing && (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 px-4 py-2 text-sm font-semibold transition"
            >
              <Edit2 size={14} /> Editar OS
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowDelete(true)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 px-4 py-2 text-sm font-semibold transition"
            >
              <Trash2 size={14} /> Excluir OS
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-5">

          {/* Coluna principal */}
          <div className="md:col-span-2 space-y-4">

            {/* Informações gerais */}
            <div className="card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-2">
                <Wrench size={14} className="text-brand-600" /> Informações da OS
              </h2>

              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="field-label">Tipo</label>
                      <select value={editForm.tipo} onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })} className="field-input text-sm">
                        {TIPO_OPTIONS.map((t) => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="field-label">Núcleo responsável</label>
                      <select value={editForm.unitId} onChange={(e) => setEditForm({ ...editForm, unitId: e.target.value })} className="field-input text-sm">
                        <option value="">A definir</option>
                        {units.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="field-label">Local / Destino *</label>
                    <input
                      type="text" required
                      value={editForm.local}
                      onChange={(e) => setEditForm({ ...editForm, local: e.target.value })}
                      className="field-input text-sm"
                    />
                  </div>

                  <div>
                    <label className="field-label">Descrição / Problema</label>
                    <textarea
                      rows={3} value={editForm.problema}
                      onChange={(e) => setEditForm({ ...editForm, problema: e.target.value })}
                      className="field-input text-sm resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="field-label">Materiais / Equipamentos</label>
                      <input
                        type="text" value={editForm.materiais}
                        onChange={(e) => setEditForm({ ...editForm, materiais: e.target.value })}
                        className="field-input text-sm"
                      />
                    </div>
                    <div>
                      <label className="field-label">Prazo</label>
                      <DateInput
                        value={editForm.prazo}
                        onChange={(v) => setEditForm({ ...editForm, prazo: v })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={() => { setEditing(false); setErr(""); }}
                      className="btn-secondary text-sm py-2 px-4"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={saving || !editForm.local?.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-sm font-semibold transition disabled:opacity-60"
                    >
                      {saving ? <Spinner className="h-4 w-4" /> : <Check size={14} />}
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Tipo" value={TIPO_LABELS[os.tipo]} />
                    <InfoRow label="Núcleo responsável" value={os.unit?.name} />
                  </div>
                  <InfoRow label="Local / Destino" value={os.local} />
                  <InfoRow label="Descrição / Problema" value={os.problema} />
                  <InfoRow label="Materiais / Equipamentos" value={os.materiais} />
                  {os.prazo && <InfoRow label="Prazo" value={fmtDate(os.prazo)} />}
                </div>
              )}

              {os.relatorio && (
                <div>
                  <div className="text-xs text-slate-400 dark:text-gray-500 mb-0.5">Relatório de conclusão</div>
                  <div className="text-sm text-slate-800 dark:text-gray-100 whitespace-pre-wrap bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                    {os.relatorio}
                  </div>
                </div>
              )}
            </div>

            {/* Chamados vinculados */}
            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-2">
                  <Link2 size={14} className="text-brand-600" />
                  Chamados vinculados
                  {os.tickets.length > 0 && (
                    <span className="text-xs font-normal text-slate-400">({os.tickets.length})</span>
                  )}
                </h2>
                {canEdit && (
                  <button
                    onClick={() => setShowLink(true)}
                    className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    <Plus size={12} /> Vincular
                  </button>
                )}
              </div>

              {os.tickets.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-gray-500">Nenhum chamado vinculado.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-gray-700/60 rounded-xl border border-slate-200 dark:border-gray-700 overflow-hidden">
                  {os.tickets.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">{t.ticketNumber}</span>
                          <StatusBadge status={t.status} />
                        </div>
                        <div className="text-sm text-slate-700 dark:text-gray-300 truncate">{t.requesterName}</div>
                        <div className="text-xs text-slate-400">{t.department}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Link to={`/painel/chamado/${t.id}`} className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
                          Ver
                        </Link>
                        {canEdit && (
                          <button onClick={() => unlinkTicket(t.id)} className="ml-1 text-slate-400 hover:text-red-500 transition">
                            <Unlink size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-4">

            {/* Datas */}
            <div className="card p-4 space-y-2">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide">Datas</h2>
              {[
                { label: "Criada",       val: os.createdAt   },
                { label: "Iniciada",     val: os.startedAt   },
                { label: "Concluída",    val: os.concludedAt },
                { label: "Cancelada",    val: os.cancelledAt },
                { label: "Prazo limite", val: os.prazo       },
              ].map(({ label, val }) => val ? (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-slate-400 dark:text-gray-500">{label}</span>
                  <span className="text-slate-700 dark:text-gray-300 font-medium">{fmtDate(val)}</span>
                </div>
              ) : null)}
              {os.createdBy && (
                <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-gray-700/60 mt-1">
                  <span className="text-slate-400 dark:text-gray-500">Aberta por</span>
                  <span className="text-slate-700 dark:text-gray-300">{os.createdBy.name.split(" ")[0]}</span>
                </div>
              )}
            </div>

            {/* Técnicos */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Users size={12} /> Equipe
                </h2>
              </div>

              {os.tecnicos.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-gray-500">Nenhum técnico atribuído.</p>
              )}

              <div className="space-y-1.5">
                {os.tecnicos.map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 dark:text-gray-300">{t.name}</span>
                    {canEdit && (
                      <button onClick={() => removeTecnico(t.id)} className="text-slate-400 hover:text-red-500 transition">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {canEdit && availableTechs.length > 0 && (
                <div>
                  <select
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) { addTecnico(Number(e.target.value)); e.target.value = ""; } }}
                    className="field-input py-1.5 text-xs w-full"
                  >
                    <option value="">+ Adicionar técnico</option>
                    {availableTechs.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Histórico */}
            {os.history?.length > 0 && (
              <div className="card p-4 space-y-2">
                <h2 className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide">Histórico</h2>
                <div className="space-y-2">
                  {os.history.map((h) => (
                    <div key={h.id} className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">{new Date(h.createdAt).toLocaleDateString("pt-BR")}</span>
                        {h.fromStatus && <span className="text-slate-400">{STATUS_LABEL[h.fromStatus]} →</span>}
                        <span className="font-medium text-slate-700 dark:text-gray-300">{STATUS_LABEL[h.toStatus]}</span>
                        {h.actor && <span className="text-slate-400">por {h.actor.name.split(" ")[0]}</span>}
                      </div>
                      {h.note && <div className="text-slate-500 dark:text-gray-400 mt-0.5 pl-2 border-l border-slate-200 dark:border-gray-700">{h.note}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {transition && (
        <TransitionModal
          toStatus={transition}
          onConfirm={doTransition}
          onClose={() => setTrans(null)}
        />
      )}

      {showLinkTicket && (
        <LinkTicketModal
          onLink={linkTicket}
          onClose={() => setShowLink(false)}
        />
      )}

      {showDelete && (
        <DeleteOsModal
          osNumber={os.osNumber}
          onConfirm={deleteOs}
          onClose={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
