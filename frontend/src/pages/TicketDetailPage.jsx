import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, InfoItem, Alert, Spinner } from "../components/ui";
import AppHeader from "../components/AppHeader";
import { formatElapsed } from "../lib/statuses";
import { ArrowLeft, Clock, CheckCircle2, ChevronRight } from "lucide-react";

const STATUS_LABEL = {
  OPEN:       "Aberto",
  VIEWED:     "Visualizado",
  EN_ROUTE:   "Técnico a caminho",
  IN_SERVICE: "Em atendimento",
  COMPLETED:  "Concluído",
};

const TRANSITION_LABEL = {
  VIEWED:     "Marcar como Visualizado",
  EN_ROUTE:   "Técnico a caminho",
  IN_SERVICE: "Iniciar atendimento",
  COMPLETED:  "Concluir chamado",
};

const TRANSITION_COLOR = {
  VIEWED:     "btn-secondary",
  EN_ROUTE:   "bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 transition",
  IN_SERVICE: "bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 transition",
  COMPLETED:  "bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 transition",
};

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [units, setUnits] = useState([]);
  const [techs, setTechs] = useState([]);
  const [form, setForm] = useState({ unitId: "", assignedTechId: "", internalNote: "", cause: "", solution: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
    api.get("/units").then((r) => setUnits(r.data));
    api.get("/technicians").then((r) => setTechs(r.data));
  }, [id]);

  async function load() {
    const { data } = await api.get(`/tickets/${id}`);
    setTicket(data);
    setForm((f) => ({ ...f, unitId: data.unit?.id || "", assignedTechId: data.technician?.id || "" }));
  }

  async function doTransition(toStatus) {
    setErr("");
    setLoading(true);
    try {
      await api.post(`/tickets/${id}/transition`, {
        toStatus,
        unitId: form.unitId || undefined,
        assignedTechId: form.assignedTechId || undefined,
        internalNote: form.internalNote || undefined,
        cause: form.cause || undefined,
        solution: form.solution || undefined,
      });
      setForm((f) => ({ ...f, internalNote: "", cause: "", solution: "" }));
      load();
    } catch (e) {
      setErr(e.response?.data?.error || "Erro na transição");
    } finally {
      setLoading(false);
    }
  }

  if (!ticket) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Spinner className="h-8 w-8" />
    </div>
  );

  const isMonitor = user?.role === "MONITOR";
  const filteredTechs = form.unitId
    ? techs.filter((t) => t.unitId === Number(form.unitId))
    : techs;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      {/* Sub-header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-3 text-sm">
          <Link to="/painel" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition">
            <ArrowLeft size={14} />
            Painel
          </Link>
          <ChevronRight size={14} className="text-slate-300" />
          <span className="font-mono text-slate-600">{ticket.ticketNumber}</span>
          <div className="ml-auto">
            <StatusBadge status={ticket.status} />
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 md:p-6 grid lg:grid-cols-3 gap-5">

        {/* ── Coluna principal ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Status + tempo */}
          <div className="card px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-900">{STATUS_LABEL[ticket.status]}</div>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                <Clock size={11} />
                Aberto há {formatElapsed(ticket.openedAt, ticket.completedAt)}
                {ticket.openedAt && (
                  <span className="text-slate-400 ml-1">
                    · {new Date(ticket.openedAt).toLocaleString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dados */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Dados do chamado</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <InfoItem label="Solicitante" value={ticket.requesterName} />
              <InfoItem label="CPF" value={ticket.requesterCpf} />
              <InfoItem label="Departamento" value={ticket.department} />
              <InfoItem label="Categoria" value={ticket.category?.name} />
              <InfoItem label="Subcategoria" value={ticket.subcategory?.name} />
              <InfoItem label="Unidade" value={ticket.unit?.name} />
              <InfoItem label="Técnico" value={ticket.technician?.name} />
            </dl>

            {ticket.freeTextDescription && (
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <div className="text-xs font-medium text-slate-500 mb-1">Descrição</div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.freeTextDescription}</p>
              </div>
            )}

            {ticket.cause && (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <div className="text-xs font-medium text-amber-700 mb-1">Causa do problema</div>
                <p className="text-sm text-amber-900">{ticket.cause}</p>
              </div>
            )}
            {ticket.solution && (
              <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                <div className="text-xs font-medium text-emerald-700 mb-1">Solução aplicada</div>
                <p className="text-sm text-emerald-900">{ticket.solution}</p>
              </div>
            )}
          </div>

          {/* Histórico */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Histórico</h3>
            <ol className="space-y-3">
              {ticket.history.map((h, i) => (
                <li key={h.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <CheckCircle2 size={13} />
                    </div>
                    {i < ticket.history.length - 1 && (
                      <div className="w-px flex-1 bg-slate-200 my-1 min-h-[16px]" />
                    )}
                  </div>
                  <div className="pb-1">
                    <div className="text-sm font-medium text-slate-800">
                      {h.fromStatus ? (
                        <><span className="text-slate-400">{STATUS_LABEL[h.fromStatus]}</span> → </>
                      ) : null}
                      {STATUS_LABEL[h.toStatus]}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {new Date(h.createdAt).toLocaleString("pt-BR")}
                      {h.actor && <span className="ml-1">· {h.actor.name}</span>}
                    </div>
                    {h.internalNote && (
                      <div className="mt-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800">
                        📌 {h.internalNote}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* ── Sidebar de ações ── */}
        <aside className="space-y-4">
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Ações</h3>

            {!isMonitor && (
              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                Apenas o monitor de plantão pode alterar o status do chamado.
              </p>
            )}

            {isMonitor && ticket.allowedNext.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                Chamado concluído
              </div>
            )}

            {isMonitor && ticket.allowedNext.length > 0 && (
              <>
                {ticket.allowedNext.includes("VIEWED") && (
                  <>
                    <div>
                      <label className="field-label">Unidade</label>
                      <select
                        className="field-input"
                        value={form.unitId}
                        onChange={(e) => setForm({ ...form, unitId: e.target.value, assignedTechId: "" })}
                      >
                        <option value="">Selecione a unidade...</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label">Técnico responsável</label>
                      <select
                        className="field-input"
                        value={form.assignedTechId}
                        onChange={(e) => setForm({ ...form, assignedTechId: e.target.value })}
                      >
                        <option value="">Selecione o técnico...</option>
                        {filteredTechs.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {ticket.allowedNext.includes("COMPLETED") && (
                  <>
                    <div>
                      <label className="field-label">Causa do problema *</label>
                      <textarea
                        rows={2}
                        className="field-input resize-none"
                        placeholder="Descreva a causa..."
                        value={form.cause}
                        onChange={(e) => setForm({ ...form, cause: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="field-label">Solução aplicada *</label>
                      <textarea
                        rows={2}
                        className="field-input resize-none"
                        placeholder="Descreva a solução..."
                        value={form.solution}
                        onChange={(e) => setForm({ ...form, solution: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="field-label">Nota interna (opcional)</label>
                  <textarea
                    rows={2}
                    className="field-input resize-none"
                    placeholder="Visível apenas para técnicos..."
                    value={form.internalNote}
                    onChange={(e) => setForm({ ...form, internalNote: e.target.value })}
                  />
                </div>

                <Alert message={err} />

                <div className="space-y-2 pt-1">
                  {ticket.allowedNext.map((next) => (
                    <button
                      key={next}
                      disabled={loading}
                      onClick={() => doTransition(next)}
                      className={`w-full justify-center ${TRANSITION_COLOR[next] || "btn-primary"}`}
                    >
                      {loading ? <Spinner className="h-4 w-4" /> : <CheckCircle2 size={15} />}
                      {TRANSITION_LABEL[next] || `→ ${STATUS_LABEL[next]}`}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
