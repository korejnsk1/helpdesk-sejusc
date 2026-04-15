import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { STATUS_LABEL, formatElapsed } from "../lib/statuses";

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [units, setUnits] = useState([]);
  const [techs, setTechs] = useState([]);
  const [form, setForm] = useState({
    toStatus: "",
    unitId: "",
    assignedTechId: "",
    internalNote: "",
    cause: "",
    solution: "",
  });
  const [err, setErr] = useState("");

  useEffect(() => {
    load();
    api.get("/units").then((r) => setUnits(r.data));
    api.get("/technicians").then((r) => setTechs(r.data));
  }, [id]);

  async function load() {
    const { data } = await api.get(`/tickets/${id}`);
    setTicket(data);
    setForm((f) => ({
      ...f,
      unitId: data.unit?.id || "",
      assignedTechId: data.technician?.id || "",
    }));
  }

  async function doTransition(toStatus) {
    setErr("");
    try {
      await api.post(`/tickets/${id}/transition`, {
        toStatus,
        unitId: form.unitId || undefined,
        assignedTechId: form.assignedTechId || undefined,
        internalNote: form.internalNote || undefined,
        cause: form.cause || undefined,
        solution: form.solution || undefined,
      });
      setForm({ ...form, internalNote: "", cause: "", solution: "" });
      load();
    } catch (e) {
      setErr(e.response?.data?.error || "Erro na transição");
    }
  }

  if (!ticket) return <div className="p-6 text-slate-500">Carregando...</div>;

  const isMonitor = user?.role === "MONITOR";
  const filteredTechs = form.unitId
    ? techs.filter((t) => t.unitId === Number(form.unitId))
    : techs;

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between">
          <Link to="/painel" className="text-sm text-slate-500 hover:underline">← Painel</Link>
          <span className="text-sm text-slate-600">{ticket.ticketNumber}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-xl shadow p-6 space-y-4">
          <div>
            <div className="text-xs text-slate-500">Status atual</div>
            <div className="text-xl font-semibold text-slate-800">
              {STATUS_LABEL[ticket.status]}
            </div>
            <div className="text-xs text-slate-500">
              Aberto há {formatElapsed(ticket.openedAt, ticket.completedAt)}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Info label="Solicitante" value={ticket.requesterName} />
            <Info label="CPF" value={ticket.requesterCpf} />
            <Info label="Departamento" value={ticket.department} />
            <Info label="Categoria" value={ticket.category?.name} />
            <Info label="Subcategoria" value={ticket.subcategory?.name || "—"} />
            <Info label="Unidade" value={ticket.unit?.name || "—"} />
            <Info label="Técnico" value={ticket.technician?.name || "—"} />
          </div>

          {ticket.freeTextDescription && (
            <Info label="Descrição" value={ticket.freeTextDescription} />
          )}
          {ticket.cause && <Info label="Causa" value={ticket.cause} />}
          {ticket.solution && <Info label="Solução" value={ticket.solution} />}

          <div>
            <h3 className="font-semibold mt-4">Histórico</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {ticket.history.map((h) => (
                <li key={h.id} className="border-l-2 border-slate-200 pl-3">
                  <div className="text-slate-800">
                    {h.fromStatus ? `${STATUS_LABEL[h.fromStatus]} → ` : ""}
                    <strong>{STATUS_LABEL[h.toStatus]}</strong>
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(h.createdAt).toLocaleString("pt-BR")}
                    {h.actor ? ` · ${h.actor.name}` : ""}
                  </div>
                  {h.internalNote && (
                    <div className="text-xs text-amber-700 bg-amber-50 rounded p-2 mt-1">
                      Nota interna: {h.internalNote}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="bg-white rounded-xl shadow p-6 space-y-3">
          <h3 className="font-semibold">Ações</h3>
          {!isMonitor && (
            <p className="text-sm text-slate-500">
              Apenas o monitor de plantão pode alterar o status.
            </p>
          )}
          {isMonitor && ticket.allowedNext.length === 0 && (
            <p className="text-sm text-slate-500">Chamado concluído.</p>
          )}
          {isMonitor && ticket.allowedNext.length > 0 && (
            <>
              {ticket.allowedNext.includes("VIEWED") && (
                <>
                  <label className="text-xs text-slate-600">Unidade</label>
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={form.unitId}
                    onChange={(e) => setForm({ ...form, unitId: e.target.value, assignedTechId: "" })}
                  >
                    <option value="">Selecione...</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <label className="text-xs text-slate-600">Técnico</label>
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={form.assignedTechId}
                    onChange={(e) => setForm({ ...form, assignedTechId: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {filteredTechs.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </>
              )}

              {ticket.allowedNext.includes("COMPLETED") && (
                <>
                  <label className="text-xs text-slate-600">Causa do problema *</label>
                  <textarea
                    rows={2}
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={form.cause}
                    onChange={(e) => setForm({ ...form, cause: e.target.value })}
                  />
                  <label className="text-xs text-slate-600">Solução aplicada *</label>
                  <textarea
                    rows={2}
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={form.solution}
                    onChange={(e) => setForm({ ...form, solution: e.target.value })}
                  />
                </>
              )}

              <label className="text-xs text-slate-600">Nota interna (opcional)</label>
              <textarea
                rows={2}
                className="w-full border rounded px-2 py-1 text-sm"
                value={form.internalNote}
                onChange={(e) => setForm({ ...form, internalNote: e.target.value })}
              />

              {err && <div className="text-sm text-red-600">{err}</div>}

              <div className="space-y-2 pt-2">
                {ticket.allowedNext.map((next) => (
                  <button
                    key={next}
                    onClick={() => doTransition(next)}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded py-2 text-sm"
                  >
                    Marcar como: {STATUS_LABEL[next]}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
      </main>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-slate-800 whitespace-pre-wrap">{value}</div>
    </div>
  );
}
