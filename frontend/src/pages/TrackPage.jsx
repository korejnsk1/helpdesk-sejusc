import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { STATUS_ORDER, STATUS_LABEL, statusIndex, formatElapsed } from "../lib/statuses";

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
      setError(e.response?.data?.error || "Erro ao carregar chamado");
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <Link to="/" className="text-brand-600 hover:underline mt-4 inline-block">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }
  if (!ticket) return <div className="p-6 text-slate-500">Carregando...</div>;

  const currentIdx = statusIndex(ticket.status);
  const timestamps = {
    OPEN: ticket.openedAt,
    VIEWED: ticket.viewedAt,
    EN_ROUTE: ticket.enRouteAt,
    IN_SERVICE: ticket.inServiceAt,
    COMPLETED: ticket.completedAt,
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto">
      <Link to="/" className="text-sm text-slate-500 hover:underline">← Início</Link>

      <div className="bg-white rounded-xl shadow p-6 mt-4">
        <div className="flex flex-wrap justify-between items-start gap-2">
          <div>
            <div className="text-xs text-slate-500">Protocolo</div>
            <div className="text-xl font-bold text-slate-800">{ticket.ticketNumber}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Tempo decorrido</div>
            <div className="font-semibold text-slate-800">
              {formatElapsed(ticket.openedAt, ticket.completedAt)}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
          <Info label="Solicitante" value={ticket.requesterName} />
          <Info label="Departamento" value={ticket.department} />
          <Info label="Categoria" value={ticket.category} />
          <Info label="Subcategoria" value={ticket.subcategory || "—"} />
          {ticket.freeTextDescription && (
            <div className="sm:col-span-2">
              <Info label="Descrição" value={ticket.freeTextDescription} />
            </div>
          )}
          <Info label="Unidade responsável" value={ticket.unit || "Aguardando..."} />
          <Info label="Técnico responsável" value={ticket.technician || "Aguardando..."} />
        </div>

        <div className="mt-8">
          <h2 className="font-semibold mb-4">Acompanhamento</h2>
          <ol className="relative border-l-2 border-slate-200 ml-2">
            {STATUS_ORDER.map((s, i) => {
              const done = i <= currentIdx;
              return (
                <li key={s} className="ml-4 pb-4">
                  <span
                    className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ${
                      done ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <div className={done ? "text-slate-800" : "text-slate-400"}>
                    <div className="font-medium">{STATUS_LABEL[s]}</div>
                    {timestamps[s] && (
                      <div className="text-xs text-slate-500">
                        {new Date(timestamps[s]).toLocaleString("pt-BR")}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {ticket.status === "COMPLETED" && config.feedbackEnabled && !ticket.hasFeedback && (
          <FeedbackForm ticketNumber={ticket.ticketNumber} onSaved={load} />
        )}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-slate-800">{value}</div>
    </div>
  );
}

function FeedbackForm({ ticketNumber, onSaved }) {
  const [rating, setRating] = useState(0);
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

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="font-semibold">Avalie o atendimento</h3>
      <div className="flex gap-1 mt-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            className={`text-3xl ${n <= rating ? "text-yellow-400" : "text-slate-300"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        placeholder="Comentário (opcional)"
        className="w-full border rounded-lg px-3 py-2 mt-3"
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {err && <div className="text-sm text-red-600 mt-1">{err}</div>}
      <button
        disabled={!rating || saving}
        onClick={submit}
        className="mt-3 bg-brand-600 disabled:bg-slate-300 text-white rounded-lg py-2 px-4"
      >
        {saving ? "Enviando..." : "Enviar avaliação"}
      </button>
    </div>
  );
}
