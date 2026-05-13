import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { StatusBadge, InfoItem, Alert, Spinner } from "../components/ui";
import AppHeader from "../components/AppHeader";
import { formatElapsed, STATUS_LABEL } from "../lib/statuses";
import { ArrowLeft, Clock, CheckCircle2, ChevronRight, Trash2, AlertTriangle, MonitorSmartphone, Copy, Check as CheckIcon, ClipboardList, Plus, ExternalLink, ShieldCheck, ThumbsUp, ThumbsDown, X, MessageSquare, ArrowRight, FileText, RotateCcw, Users2, Send, Timer } from "lucide-react";

const TRANSITION_LABEL = {
  VIEWED:     "Marcar como Visualizado",
  EN_ROUTE:   "Técnico a caminho",
  IN_SERVICE: "Iniciar atendimento",
  COMPLETED:  "Concluir chamado",
};

const TRANSITION_LABEL_REMOTE = {
  VIEWED:     "Marcar como Visualizado",
  IN_SERVICE: "Iniciar atendimento remoto",
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
  const nav = useNavigate();
  const { user } = useAuth();
  const addToast = useToast();
  const [ticket, setTicket] = useState(null);
  const [units, setUnits] = useState([]);
  const [techs, setTechs] = useState([]);
  const [form, setForm] = useState({ unitId: "", assignedTechId: "", internalNote: "", cause: "", solution: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");
  const [linkedOs, setLinkedOs] = useState([]);
  const [allOs, setAllOs] = useState([]);
  const [showOsLink, setShowOsLink] = useState(false);
  const [showCreateOs, setShowCreateOs] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState({ unitId: "", assignedTechId: "" });
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isDirty = !!(form.internalNote.trim() || form.cause.trim() || form.solution.trim());

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    load();
    api.get("/units").then((r) => setUnits(r.data));
    api.get("/technicians").then((r) => setTechs(r.data));
    api.get(`/work-orders?ticketId=${id}`).then((r) => setLinkedOs(r.data));
    api.get(`/tickets/${id}/comments`).then((r) => setComments(r.data)).catch(() => {});
  }, [id]);

  async function load() {
    const { data } = await api.get(`/tickets/${id}`);
    setTicket(data);
    setForm((f) => ({ ...f, unitId: data.unit?.id || "", assignedTechId: data.technician?.id || "" }));
  }

  async function linkToOs(osId) {
    try {
      await api.post(`/work-orders/${osId}/tickets`, { ticketId: Number(id) });
      const res = await api.get(`/work-orders?ticketId=${id}`);
      setLinkedOs(res.data);
      setShowOsLink(false);
    } catch (e) { setErr(e.response?.data?.error || "Erro ao vincular OS"); }
  }

  function toggleOsLink() {
    setShowOsLink((v) => {
      if (!v && allOs.length === 0) {
        api.get("/work-orders").then((r) => setAllOs(r.data)).catch(() => {});
      }
      return !v;
    });
  }

  async function handleOsCreated(os) {
    // auto-link to current ticket
    await api.post(`/work-orders/${os.id}/tickets`, { ticketId: Number(id) });
    const res = await api.get(`/work-orders?ticketId=${id}`);
    setLinkedOs(res.data);
    setShowCreateOs(false);
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
      addToast({ message: "Status atualizado com sucesso", type: "success" });
      load();
    } catch (e) {
      setErr(e.response?.data?.error || "Erro na transição");
    } finally {
      setLoading(false);
    }
  }

  async function doReopen() {
    const reason = window.prompt("Motivo para reabrir (opcional):");
    if (reason === null) return;
    setLoading(true);
    try {
      await api.post(`/tickets/${id}/reopen`, { reason: reason.trim() || undefined });
      addToast({ message: "Chamado reaberto com sucesso", type: "success" });
      load();
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao reabrir chamado");
    } finally {
      setLoading(false);
    }
  }

  async function doTransfer() {
    setLoading(true);
    try {
      const { data } = await api.patch(`/tickets/${id}/assign`, {
        assignedTechId: transferForm.assignedTechId ? Number(transferForm.assignedTechId) : undefined,
        unitId:         transferForm.unitId         ? Number(transferForm.unitId)         : undefined,
      });
      addToast({ message: "Chamado transferido com sucesso", type: "success" });
      setShowTransfer(false);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao transferir chamado");
    } finally {
      setLoading(false);
    }
  }

  async function doAddComment() {
    if (!newComment.trim()) return;
    setCommentSending(true);
    try {
      const { data } = await api.post(`/tickets/${id}/comments`, { text: newComment });
      setComments((prev) => [...prev, data]);
      setNewComment("");
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao adicionar comentário");
    } finally {
      setCommentSending(false);
    }
  }

  async function doDelete() {
    setDeleting(true);
    try {
      await api.delete(`/tickets/${id}`);
      nav("/painel");
    } catch (e) {
      setDeleteErr(e.response?.data?.error || "Erro ao excluir chamado");
    } finally {
      setDeleting(false);
    }
  }

  if (!ticket) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
      <Spinner className="h-8 w-8" />
    </div>
  );

  const canTransition = ["TECHNICIAN", "ADMIN"].includes(user?.role);
  const isAdmin       = user?.role === "ADMIN";
  const filteredTechs = form.unitId
    ? techs.filter((t) => t.unitId === Number(form.unitId) || t.role === "ADMIN")
    : techs;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <AppHeader />

      {showTransfer && (
        <TransferModal
          units={units}
          techs={techs}
          form={transferForm}
          setForm={setTransferForm}
          onClose={() => setShowTransfer(false)}
          onConfirm={doTransfer}
          loading={loading}
        />
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowDeleteModal(false); setDeleteErr(""); } }}
        >
          <div className="card w-full max-w-sm p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                <AlertTriangle size={20} />
              </span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-gray-100">Excluir chamado</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-gray-300">
              Tem certeza que deseja excluir o chamado{" "}
              <span className="font-mono font-semibold">{ticket.ticketNumber}</span>?
              Todo o histórico será perdido permanentemente.
            </p>
            {deleteErr && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
                {deleteErr}
              </p>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteErr(""); }}
                className="btn-secondary text-sm py-2 px-4"
              >
                Cancelar
              </button>
              <button
                onClick={doDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-semibold transition disabled:opacity-60"
              >
                {deleting ? <Spinner className="h-4 w-4" /> : <Trash2 size={14} />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal criar e vincular OS */}
      {showCreateOs && (
        <CreateOsModal
          onClose={() => setShowCreateOs(false)}
          onCreate={handleOsCreated}
        />
      )}

      {/* Sub-header */}
      <div className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-3 text-sm">
          <button
            onClick={() => {
              if (isDirty && !window.confirm("Você tem informações não salvas. Deseja sair sem salvar?")) return;
              nav("/painel");
            }}
            className="flex items-center gap-1.5 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition"
          >
            <ArrowLeft size={14} />
            Painel
          </button>
          <ChevronRight size={14} className="text-slate-300 dark:text-gray-600" />
          <span className="font-mono text-slate-600 dark:text-gray-300">{ticket.ticketNumber}</span>
          <div className="ml-auto flex items-center gap-2">
            <StatusBadge status={ticket.status} />
            {isAdmin && (
              <button
                onClick={() => { setShowDeleteModal(true); setDeleteErr(""); }}
                className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Excluir chamado"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Excluir</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 md:p-6 grid lg:grid-cols-3 gap-5">

        {/* ── Coluna principal ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Status + tempo */}
          <div className="card px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-gray-100">{STATUS_LABEL[ticket.status]}</div>
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                <Clock size={11} />
                Aberto há {formatElapsed(ticket.openedAt, ticket.completedAt)}
                {ticket.openedAt && (
                  <span className="text-slate-400 dark:text-gray-500 ml-1">
                    · {new Date(ticket.openedAt).toLocaleString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
            {ticket.slaDeadline && ticket.status !== "COMPLETED" && (() => {
              const now = new Date();
              const deadline = new Date(ticket.slaDeadline);
              const breached = deadline < now;
              const diff = Math.abs(deadline - now);
              const hours = Math.floor(diff / 3600000);
              const mins  = Math.floor((diff % 3600000) / 60000);
              return (
                <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium ${
                  breached
                    ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800"
                    : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-700"
                }`}>
                  <Timer size={12} />
                  {breached
                    ? `SLA excedido há ${hours}h${mins > 0 ? ` ${mins}min` : ""}`
                    : `SLA: ${hours}h${mins > 0 ? ` ${mins}min` : ""} restantes`}
                </div>
              );
            })()}
          </div>

          {/* Painel de aprovação */}
          {ticket.approvalStatus && ticket.approvalStatus !== "NOT_REQUIRED" && (
            <ApprovalPanel approvalStatus={ticket.approvalStatus} approvals={ticket.approvals || []} />
          )}

          {/* Painel AnyDesk — visível para técnico/monitor quando é remoto */}
          {ticket.isRemote && ticket.anyDeskCode && (
            <AnyDeskPanel code={ticket.anyDeskCode} status={ticket.status} />
          )}

          {/* Dados */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-4">Dados do chamado</h3>
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
              <div className="mt-4 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 px-4 py-3">
                <div className="text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">Descrição</div>
                <p className="text-sm text-slate-700 dark:text-gray-200 whitespace-pre-wrap">{ticket.freeTextDescription}</p>
              </div>
            )}

            {ticket.cause && (
              <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Causa do problema</div>
                <p className="text-sm text-amber-900 dark:text-amber-200">{ticket.cause}</p>
              </div>
            )}
            {ticket.solution && (
              <div className="mt-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 px-4 py-3">
                <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Solução aplicada</div>
                <p className="text-sm text-emerald-900 dark:text-emerald-200">{ticket.solution}</p>
              </div>
            )}
          </div>

          {/* Ordens de Serviço vinculadas */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 flex items-center gap-2">
                <ClipboardList size={14} className="text-brand-600" />
                Ordens de Serviço
              </h3>
              {canTransition && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCreateOs(true)}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Criar e vincular
                  </button>
                  <span className="text-slate-200 dark:text-gray-700">|</span>
                  <button
                    onClick={toggleOsLink}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                  >
                    <ClipboardList size={12} /> Vincular existente
                  </button>
                </div>
              )}
            </div>

            {showOsLink && (
              <div className="mb-3 rounded-xl border border-slate-200 dark:border-gray-700 divide-y divide-slate-100 dark:divide-gray-700/60 max-h-48 overflow-y-auto">
                {allOs.filter((os) => !linkedOs.some((l) => l.id === os.id) && os.status !== "CONCLUIDA" && os.status !== "CANCELADA").length === 0 ? (
                  <div className="px-3 py-3 text-sm text-slate-400 dark:text-gray-500">
                    Nenhuma OS disponível.{" "}
                    <Link to="/painel/os" className="text-brand-600 dark:text-brand-400 hover:underline">Criar nova OS</Link>
                  </div>
                ) : (
                  allOs
                    .filter((os) => !linkedOs.some((l) => l.id === os.id) && os.status !== "CONCLUIDA" && os.status !== "CANCELADA")
                    .map((os) => (
                      <button
                        key={os.id}
                        onClick={() => linkToOs(os.id)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-gray-800 transition text-sm"
                      >
                        <span className="font-mono text-xs text-slate-400 mr-2">{os.osNumber}</span>
                        <span className="text-slate-700 dark:text-gray-300">{os.tipoLabel}</span>
                        <span className="text-slate-400 ml-1">— {os.local}</span>
                      </button>
                    ))
                )}
              </div>
            )}

            {linkedOs.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-gray-500">Nenhuma OS vinculada.</p>
            ) : (
              <div className="space-y-1.5">
                {linkedOs.map((os) => (
                  <Link
                    key={os.id}
                    to={`/painel/os/${os.id}`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 bg-slate-50 dark:bg-gray-800/60 hover:bg-slate-100 dark:hover:bg-gray-800 transition"
                  >
                    <span className="font-mono text-xs text-slate-400">{os.osNumber}</span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      os.status === "ABERTA" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                      os.status === "EM_ANDAMENTO" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" :
                      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    }`}>{os.status === "ABERTA" ? "Aberta" : os.status === "EM_ANDAMENTO" ? "Em Andamento" : "Concluída"}</span>
                    <span className="text-sm text-slate-600 dark:text-gray-400 truncate">{os.tipoLabel} — {os.local}</span>
                    <ExternalLink size={12} className="ml-auto text-slate-400 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Histórico */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-4">Histórico</h3>
            <ol className="space-y-3">
              {ticket.history.map((h, i) => {
                const hasNote = !!h.internalNote;
                const isFirst = !h.fromStatus;
                const HistIcon = hasNote ? MessageSquare : isFirst ? FileText : ArrowRight;
                const iconCls  = hasNote
                  ? "bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                  : isFirst
                  ? "bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400"
                  : "bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400";
                return (
                  <li key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${iconCls}`}>
                        <HistIcon size={12} />
                      </div>
                      {i < ticket.history.length - 1 && (
                        <div className="w-px flex-1 bg-slate-300 dark:bg-gray-600 my-1 min-h-[16px]" />
                      )}
                    </div>
                    <div className="pb-1">
                      <div className="text-sm font-medium text-slate-800 dark:text-gray-100">
                        {h.fromStatus ? (
                          <><span className="text-slate-400 dark:text-gray-500">{STATUS_LABEL[h.fromStatus]}</span>{" → "}</>
                        ) : null}
                        {STATUS_LABEL[h.toStatus]}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                        {new Date(h.createdAt).toLocaleString("pt-BR")}
                        {h.actor && <span className="ml-1">· {h.actor.name}</span>}
                      </div>
                      {h.internalNote && (
                        <div className="mt-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                          <MessageSquare size={11} className="shrink-0 mt-0.5" />
                          {h.internalNote}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
          {/* Comentários */}
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 flex items-center gap-2">
              <MessageSquare size={14} className="text-brand-600" />
              Comentários ({comments.length})
            </h3>

            {comments.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-gray-500">Nenhum comentário ainda.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => {
                  const isStaff = ["ADMIN", "TECHNICIAN"].includes(c.author?.role);
                  return (
                    <div key={c.id} className={`flex gap-3 ${isStaff ? "flex-row-reverse" : ""}`}>
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        isStaff ? "bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400" : "bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300"
                      }`}>
                        {c.author?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className={`flex-1 ${isStaff ? "items-end" : "items-start"} flex flex-col`}>
                        <div className={`rounded-xl px-3 py-2 text-sm max-w-[85%] ${
                          isStaff
                            ? "bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-100"
                            : "bg-slate-100 dark:bg-gray-800 text-slate-800 dark:text-gray-200"
                        }`}>
                          {c.text}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5 px-1">
                          {c.author?.name} · {new Date(c.createdAt).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {ticket.status !== "COMPLETED" && (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  className="field-input flex-1 text-sm"
                  placeholder="Escreva um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doAddComment(); } }}
                />
                <button
                  onClick={doAddComment}
                  disabled={!newComment.trim() || commentSending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition"
                >
                  {commentSending ? <Spinner className="h-4 w-4" /> : <Send size={15} />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar de ações ── */}
        <aside className="space-y-4">
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100">Ações</h3>

            {!canTransition && (
              <p className="text-xs text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-gray-800 rounded-lg p-3">
                Apenas técnicos e administradores podem alterar o status do chamado.
              </p>
            )}

            {canTransition && ticket.allowedNext.length === 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  Chamado concluído
                </div>
                <button
                  onClick={doReopen}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-50 transition"
                >
                  <RotateCcw size={14} /> Reabrir chamado
                </button>
              </div>
            )}

            {canTransition && ticket.status !== "OPEN" && ticket.status !== "COMPLETED" && (
              <button
                onClick={() => {
                  setTransferForm({ unitId: ticket.unit?.id || "", assignedTechId: ticket.technician?.id || "" });
                  setShowTransfer(true);
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition"
              >
                <Users2 size={14} /> Transferir responsável
              </button>
            )}

            {canTransition && ticket.allowedNext.length > 0 && (
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

                {ticket.allowedNext.includes("COMPLETED") && ticket.requiresCauseSolution !== false && (
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
                      {form.cause && !form.cause.trim() && (
                        <p className="mt-0.5 text-xs text-red-500 dark:text-red-400">Não pode conter apenas espaços em branco</p>
                      )}
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
                      {form.solution && !form.solution.trim() && (
                        <p className="mt-0.5 text-xs text-red-500 dark:text-red-400">Não pode conter apenas espaços em branco</p>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label className="field-label flex flex-wrap items-center gap-x-2 gap-y-1">
                    Nota interna (opcional)
                    <span className="whitespace-nowrap rounded-full bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400 text-[10px] font-medium px-2 py-0.5 tracking-wide">
                      NÃO VISÍVEL AO SOLICITANTE
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    className="field-input resize-none"
                    placeholder="Registre observações internas da equipe técnica..."
                    value={form.internalNote}
                    onChange={(e) => setForm({ ...form, internalNote: e.target.value })}
                  />
                </div>

                {isDirty && (
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle size={13} className="shrink-0" />
                    Informações não salvas — use um dos botões abaixo para registrar
                  </div>
                )}

                <Alert message={err} />

                <div className="space-y-2 pt-1">
                  {ticket.allowedNext
                    .filter((next) => {
                      // Oculta "Técnico a caminho" se chamado não é presencial ou é remoto
                      if (next === "EN_ROUTE" && (ticket.isRemote || ticket.presential === false)) return false;
                      return true;
                    })
                    .map((next) => {
                      const labels = ticket.isRemote ? TRANSITION_LABEL_REMOTE : TRANSITION_LABEL;
                      return (
                        <button
                          key={next}
                          disabled={loading || (next === "COMPLETED" && ticket.requiresCauseSolution !== false && (!form.cause.trim() || !form.solution.trim()))}
                          onClick={() => doTransition(next)}
                          className={`w-full justify-center ${TRANSITION_COLOR[next] || "btn-primary"} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {loading ? <Spinner className="h-4 w-4" /> : <CheckCircle2 size={15} />}
                          {labels[next] || `→ ${STATUS_LABEL[next]}`}
                        </button>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

// ── Modal transferir responsável ─────────────────────────────────────────────
function TransferModal({ units, techs, form, setForm, onClose, onConfirm, loading }) {
  const filtered = form.unitId
    ? techs.filter((t) => t.unitId === Number(form.unitId) || t.role === "ADMIN")
    : techs;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-sm p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400">
              <Users2 size={18} />
            </span>
            <h3 className="font-semibold text-slate-900 dark:text-gray-100">Transferir responsável</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 transition">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="field-label">Unidade</label>
            <select
              className="field-input"
              value={form.unitId}
              onChange={(e) => setForm({ ...form, unitId: e.target.value, assignedTechId: "" })}
            >
              <option value="">Selecione a unidade...</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
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
              {filtered.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
          <button
            onClick={onConfirm}
            disabled={loading || (!form.unitId && !form.assignedTechId)}
            className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
          >
            Confirmar transferência
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal criar OS e vincular ao chamado ──────────────────────────────────────
const OS_TIPOS = [
  { value: "VISITA_TECNICA",           label: "Visita Técnica"             },
  { value: "TROCA_EQUIPAMENTO",        label: "Troca de Equipamento"       },
  { value: "ENTREGA",                  label: "Entrega"                    },
  { value: "MANUTENCAO_REDE",          label: "Manutenção de Rede"         },
  { value: "MANUTENCAO_CAMERA",        label: "Manutenção de Câmera"       },
  { value: "RECOLHIMENTO_EQUIPAMENTO", label: "Recolhimento de Equipamento"},
  { value: "ACAO",                     label: "Ação"                       },
  { value: "OUTRO",                    label: "Outro"                      },
];

function CreateOsModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ tipo: "VISITA_TECNICA", local: "", problema: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const res = await api.post("/work-orders", {
        tipo:     form.tipo,
        local:    form.local,
        problema: form.problema || null,
      });
      await onCreate(res.data);
    } catch (ex) {
      setErr(ex.response?.data?.error || "Erro ao criar OS");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-md p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400">
              <ClipboardList size={18} />
            </span>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-gray-100">Criar e vincular OS</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">A OS será criada e vinculada automaticamente</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar modal" className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 transition">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="field-label">Tipo *</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="field-input"
            >
              {OS_TIPOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Local / Destino *</label>
            <input
              required
              type="text"
              value={form.local}
              onChange={(e) => setForm({ ...form, local: e.target.value })}
              placeholder="Ex: Setor de RH — Bloco B"
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Descrição da atividade</label>
            <textarea
              rows={3}
              value={form.problema}
              onChange={(e) => setForm({ ...form, problema: e.target.value })}
              placeholder="O que precisa ser feito..."
              className="field-input resize-none"
            />
          </div>

          {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="btn-secondary text-sm py-2 px-4">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !form.local.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-sm font-semibold transition disabled:opacity-60"
            >
              {saving ? <Spinner className="h-4 w-4" /> : <Plus size={14} />}
              Criar e vincular
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Painel de aprovação ───────────────────────────────────────────────────────
function ApprovalPanel({ approvalStatus, approvals }) {
  const colors = {
    PENDING:  "border-amber-200  dark:border-amber-700  bg-amber-50  dark:bg-amber-900/15  text-amber-800  dark:text-amber-300",
    APPROVED: "border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/15 text-emerald-800 dark:text-emerald-300",
    REJECTED: "border-red-200    dark:border-red-700    bg-red-50    dark:bg-red-900/15    text-red-800    dark:text-red-300",
  };
  const icons = {
    PENDING:  <ShieldCheck size={16} />,
    APPROVED: <ThumbsUp   size={16} />,
    REJECTED: <ThumbsDown size={16} />,
  };
  const labels = {
    PENDING:  "Aguardando aprovação do Chefe de Setor",
    APPROVED: "Aprovado pelo Chefe de Setor",
    REJECTED: "Reprovado pelo Chefe de Setor",
  };

  return (
    <div className={`card px-5 py-4 border-2 ${colors[approvalStatus] || ""}`}>
      <div className="flex items-center gap-2 font-semibold text-sm mb-2">
        {icons[approvalStatus]}
        {labels[approvalStatus] || approvalStatus}
      </div>

      {/* Motivo da reprovação em destaque */}
      {approvalStatus === "REJECTED" && approvals.filter((a) => a.status === "REJECTED" && a.note).length > 0 && (
        <div className="space-y-1.5 mt-1 mb-2">
          {approvals.filter((a) => a.status === "REJECTED" && a.note).map((a) => (
            <div key={`note-${a.id}`} className="rounded-lg bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 px-3 py-2.5">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">Motivo da reprovação</p>
              <p className="text-sm text-red-800 dark:text-red-200">"{a.note}"</p>
              {(a.chefUserName || a.decidedAt) && (
                <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1.5">
                  {a.chefUserName}{a.decidedAt ? ` · ${new Date(a.decidedAt).toLocaleString("pt-BR")}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {approvals.length > 0 && (
        <div className="space-y-1.5">
          {approvals.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-xs flex-wrap">
              <span className={`rounded-full px-2 py-0.5 font-medium ${
                a.status === "APPROVED" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                : a.status === "REJECTED" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
              }`}>
                {a.status === "APPROVED" ? "Aprovado" : a.status === "REJECTED" ? "Reprovado" : "Pendente"}
              </span>
              <span className="text-slate-600 dark:text-gray-400">
                {a.chefDeptName}
                {a.chefUserName && <span className="text-slate-400 dark:text-gray-500"> — {a.chefUserName}</span>}
              </span>
              {a.decidedAt && (
                <span className="text-slate-400 dark:text-gray-500 text-[11px] ml-auto">
                  {new Date(a.decidedAt).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Painel AnyDesk para o técnico ──────────────────────────────────────────
function AnyDeskPanel({ code, status }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(code.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isActive = ["OPEN", "VIEWED", "EN_ROUTE", "IN_SERVICE"].includes(status);

  return (
    <div className={`card p-5 border-2 ${isActive ? "border-cyan-400 dark:border-cyan-600" : "border-slate-200 dark:border-gray-700"}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          isActive ? "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400"
                   : "bg-slate-100 dark:bg-gray-800 text-slate-400 dark:text-gray-500"
        }`}>
          <MonitorSmartphone size={20} />
        </span>
        <div>
          <div className="font-semibold text-slate-900 dark:text-gray-100 text-sm">Atendimento Remoto — AnyDesk</div>
          <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
            {isActive ? "Use o código abaixo para se conectar ao computador do solicitante" : "Chamado concluído"}
          </div>
        </div>
      </div>

      {/* Código em destaque */}
      <div className="rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 px-4 py-3 mb-3">
        <div className="text-xs text-slate-500 dark:text-gray-400 mb-1">Código AnyDesk do solicitante</div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono font-bold text-2xl text-slate-800 dark:text-gray-100 tracking-widest">
            {code}
          </span>
          <button
            onClick={copyCode}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition shrink-0 ${
              copied
                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                : "bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-600"
            }`}
          >
            {copied ? <><CheckIcon size={13} /> Copiado!</> : <><Copy size={13} /> Copiar</>}
          </button>
        </div>
      </div>

      {/* Link direto */}
      {isActive && (
        <a
          href={`anydesk:${code.replace(/\s/g, "")}`}
          className="inline-flex items-center gap-2 w-full justify-center rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2.5 text-sm font-semibold transition"
        >
          <MonitorSmartphone size={16} />
          Abrir AnyDesk e conectar
        </a>
      )}
    </div>
  );
}
