import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { STATUS_ORDER, statusIndex, formatElapsed } from "../lib/statuses";
import { StatusBadge, InfoItem, Spinner } from "../components/ui";
import { Home, Clock, CheckCircle2, Circle, Star, MonitorSmartphone, Wifi } from "lucide-react";

const STATUS_LABEL = {
  OPEN:       "Aberto",
  VIEWED:     "Visualizado",
  EN_ROUTE:   "Técnico a caminho",
  IN_SERVICE: "Em atendimento",
  COMPLETED:  "Concluído",
};

const STATUS_DESC = {
  OPEN:       "Chamado registrado, aguardando análise",
  VIEWED:     "Monitor visualizou e atribuiu responsável",
  EN_ROUTE:   "Técnico a caminho do seu departamento",
  IN_SERVICE: "Atendimento em andamento",
  COMPLETED:  "Problema resolvido",
};

export default function TrackPage() {
  const { ticketNumber } = useParams();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");
  const [config, setConfig] = useState({ feedbackEnabled: false });

  useEffect(() => {
    api.get("/config").then((r) => setConfig(r.data));
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [ticketNumber]);

  async function load() {
    try {
      const { data } = await api.get(`/tickets/track/${ticketNumber}`);
      setTicket(data);
    } catch (e) {
      setError(e.response?.data?.error || "Chamado não encontrado");
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950 p-6">
        <div className="card p-8 text-center max-w-sm w-full">
          <div className="text-4xl mb-3">🔍</div>
          <div className="font-semibold text-slate-800 dark:text-gray-100 mb-1">Chamado não encontrado</div>
          <p className="text-sm text-slate-500 dark:text-gray-400 mb-5">{error}</p>
          <Link to="/" className="btn-primary w-full justify-center">
            <Home size={16} /> Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const currentIdx = statusIndex(ticket.status);
  const timestamps = {
    OPEN:       ticket.openedAt,
    VIEWED:     ticket.viewedAt,
    EN_ROUTE:   ticket.enRouteAt,
    IN_SERVICE: ticket.inServiceAt,
    COMPLETED:  ticket.completedAt,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      {/* Topbar */}
      <header className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 px-4 h-14 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition">
          <Home size={15} />
          Início
        </Link>
        <div className="h-4 w-px bg-slate-200 dark:bg-gray-700" />
        <span className="text-sm font-mono text-slate-600 dark:text-gray-300">{ticket.ticketNumber}</span>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-8 space-y-4">

        {/* Status hero */}
        <div className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500 dark:text-gray-400 mb-1">Protocolo</div>
              <div className="text-xl font-bold text-slate-900 dark:text-gray-100 font-mono tracking-wide">
                {ticket.ticketNumber}
              </div>
            </div>
            <div className="text-right">
              <StatusBadge status={ticket.status} />
              <div className="flex items-center gap-1 mt-2 text-xs text-slate-500 dark:text-gray-400 justify-end">
                <Clock size={11} />
                {formatElapsed(ticket.openedAt, ticket.completedAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Dados do chamado */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-4">Informações</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <InfoItem label="Solicitante" value={ticket.requesterName} />
            <InfoItem label="Departamento" value={ticket.department} />
            <InfoItem label="Categoria" value={ticket.category} />
            <InfoItem label="Subcategoria" value={ticket.subcategory} />
            <InfoItem label="Unidade responsável" value={ticket.unit || "Aguardando atribuição..."} />
            <InfoItem label="Técnico responsável" value={ticket.technician || "Aguardando atribuição..."} />
          </dl>
          {ticket.freeTextDescription && (
            <div className="mt-4 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 px-4 py-3">
              <div className="text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">Descrição</div>
              <p className="text-sm text-slate-700 dark:text-gray-200 whitespace-pre-wrap">
                {ticket.freeTextDescription}
              </p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-5">Acompanhamento</h2>
          <ol className="space-y-0">
            {STATUS_ORDER.map((s, i) => {
              const done = i <= currentIdx;
              const isLast = i === STATUS_ORDER.length - 1;
              return (
                <li key={s} className="flex gap-3">
                  {/* Icon + line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
                        done
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-300 dark:text-gray-600"
                      }`}
                    >
                      {done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 flex-1 min-h-[28px] my-1 ${done ? "bg-brand-600" : "bg-slate-200 dark:bg-gray-700"}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-4 min-w-0">
                    <div className={`text-sm font-medium leading-7 ${done ? "text-slate-900 dark:text-gray-100" : "text-slate-400 dark:text-gray-600"}`}>
                      {STATUS_LABEL[s]}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-gray-500 -mt-1">
                      {STATUS_DESC[s]}
                      {done && timestamps[s] && (
                        <span className="ml-2 text-slate-400 dark:text-gray-600">
                          · {new Date(timestamps[s]).toLocaleString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Banner AnyDesk — enquanto não concluído */}
        {ticket.isRemote && ticket.status !== "COMPLETED" && (
          <div className="card p-5 border-l-4 border-amber-400 dark:border-amber-500">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                <MonitorSmartphone size={20} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-amber-800 dark:text-amber-300 text-sm flex items-center gap-2">
                  <Wifi size={14} className="animate-pulse" />
                  Aguardando conexão AnyDesk
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                  Mantenha o <strong>AnyDesk aberto</strong> no seu computador.
                  Quando o técnico se conectar, aparecerá uma notificação —
                  clique em <strong>Aceitar</strong> para iniciar o atendimento.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Técnico ainda não se conectou
                  </span>
                  {ticket.status === "IN_SERVICE" && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Em atendimento
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback */}
        {ticket.status === "COMPLETED" && config.feedbackEnabled && !ticket.hasFeedback && (
          <FeedbackForm ticketNumber={ticket.ticketNumber} onSaved={load} />
        )}
        {ticket.hasFeedback && (
          <div className="card p-5 flex items-center gap-3 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            Avaliação enviada. Obrigado pelo seu feedback!
          </div>
        )}
      </main>
    </div>
  );
}

function FeedbackForm({ ticketNumber, onSaved }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    setSaving(true);
    try {
      await api.post(`/tickets/track/${ticketNumber}/feedback`, { rating, comment });
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao enviar");
    } finally {
      setSaving(false);
    }
  }

  const labels = ["", "Muito ruim", "Ruim", "Regular", "Bom", "Excelente"];

  return (
    <div className="card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100">Avalie o atendimento</h3>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Sua opinião ajuda a melhorar o serviço</p>
      </div>

      <div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={28}
                className={`transition ${
                  n <= (hover || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-slate-200 dark:text-gray-700"
                }`}
              />
            </button>
          ))}
        </div>
        {(hover || rating) > 0 && (
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">{labels[hover || rating]}</p>
        )}
      </div>

      <div>
        <label className="field-label">Comentário (opcional)</label>
        <textarea
          rows={3}
          placeholder="Conte como foi o atendimento..."
          className="field-input resize-none"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}

      <button disabled={!rating || saving} onClick={submit} className="btn-primary">
        {saving ? <Spinner className="h-4 w-4" /> : <Star size={15} />}
        {saving ? "Enviando..." : "Enviar avaliação"}
      </button>
    </div>
  );
}
