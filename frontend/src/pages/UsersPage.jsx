import { useEffect, useState } from "react";
import { api } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { Alert, Spinner } from "../components/ui";
import { maskCpf } from "../lib/cpf";
import {
  CheckCircle2, XCircle, UserCheck, UserX, ShieldCheck,
  Shield, Clock, Building2,
} from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("pending"); // pending | active | all

  useEffect(() => {
    load();
    api.get("/units").then((r) => setUnits(r.data));
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }

  async function update(id, patch) {
    setErr("");
    try {
      await api.patch(`/users/${id}`, patch);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao atualizar");
    }
  }

  const pending = users.filter((u) => !u.active && u.role === "TECHNICIAN");
  const active  = users.filter((u) => u.active && u.role === "TECHNICIAN");
  const monitors = users.filter((u) => u.role === "MONITOR");

  const tabData = {
    pending: pending,
    active: active,
    monitors: monitors,
    all: users,
  };

  const tabs = [
    { key: "pending",  label: "Aguardando aprovação", count: pending.length,  highlight: pending.length > 0 },
    { key: "active",   label: "Técnicos ativos",       count: active.length,   highlight: false },
    { key: "monitors", label: "Monitores",              count: monitors.length, highlight: false },
    { key: "all",      label: "Todos",                  count: users.length,    highlight: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Gestão de usuários</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Aprove cadastros, atribua unidades e gerencie permissões
          </p>
        </div>

        <Alert message={err} />

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                tab === t.key
                  ? "bg-brand-600 text-white"
                  : t.highlight
                  ? "bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                tab === t.key ? "bg-white/20 text-white" : t.highlight ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : tabData[tab].length === 0 ? (
          <div className="card p-10 text-center text-slate-400">
            {tab === "pending" ? "Nenhum cadastro aguardando aprovação 🎉" : "Nenhum usuário nesta categoria"}
          </div>
        ) : (
          <div className="card divide-y divide-slate-100">
            {tabData[tab].map((u) => (
              <UserRow
                key={u.id}
                user={u}
                units={units}
                onUpdate={update}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function UserRow({ user, units, onUpdate }) {
  const [unitId, setUnitId] = useState(user.unit?.id || "");
  const [changing, setChanging] = useState(false);

  async function applyUnit() {
    setChanging(true);
    await onUpdate(user.id, { unitId: unitId || null });
    setChanging(false);
  }

  const isPending = !user.active && user.role === "TECHNICIAN";

  return (
    <div className={`px-5 py-4 flex flex-wrap items-start gap-4 ${isPending ? "bg-amber-50/50" : ""}`}>
      {/* Avatar + info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          user.role === "MONITOR" ? "bg-brand-100 text-brand-700" : user.active ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700"
        }`}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-900 text-sm">{user.name}</span>
            {user.role === "MONITOR" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
                <ShieldCheck size={10} /> Monitor
              </span>
            )}
            {isPending && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                <Clock size={10} /> Aguardando aprovação
              </span>
            )}
            {user.active && user.role === "TECHNICIAN" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 size={10} /> Ativo
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{maskCpf(user.cpf)}</span>
            {user.unit && (
              <span className="flex items-center gap-1">
                <Building2 size={10} />
                {user.unit.name}
              </span>
            )}
            <span className="text-slate-400">
              Cadastrado em {new Date(user.createdAt).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        {/* Atribuir unidade */}
        <div className="flex items-center gap-1.5">
          <select
            className="field-input py-1.5 text-xs min-w-[160px]"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
          >
            <option value="">Sem unidade</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          {String(unitId) !== String(user.unit?.id || "") && (
            <button
              onClick={applyUnit}
              disabled={changing}
              className="btn-secondary text-xs py-1.5 px-2.5"
            >
              {changing ? <Spinner className="h-3 w-3" /> : <Building2 size={13} />}
              Salvar
            </button>
          )}
        </div>

        {/* Promover a monitor / rebaixar */}
        {user.active && user.role === "TECHNICIAN" && (
          <button
            onClick={() => onUpdate(user.id, { role: "MONITOR" })}
            className="btn-secondary text-xs py-1.5 px-2.5"
            title="Promover a monitor"
          >
            <Shield size={13} className="text-brand-600" />
            Tornar monitor
          </button>
        )}
        {user.role === "MONITOR" && (
          <button
            onClick={() => onUpdate(user.id, { role: "TECHNICIAN" })}
            className="btn-secondary text-xs py-1.5 px-2.5"
            title="Rebaixar a técnico"
          >
            <UserX size={13} className="text-slate-500" />
            Remover monitor
          </button>
        )}

        {/* Aprovar / Desativar */}
        {isPending && (
          <button
            onClick={() => onUpdate(user.id, { active: true })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold transition"
          >
            <UserCheck size={13} />
            Aprovar
          </button>
        )}
        {user.active && (
          <button
            onClick={() => onUpdate(user.id, { active: false })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 ring-1 ring-red-200 px-3 py-1.5 text-xs font-semibold transition"
          >
            <XCircle size={13} />
            Desativar
          </button>
        )}
        {!user.active && user.role !== "TECHNICIAN" && (
          <button
            onClick={() => onUpdate(user.id, { active: true })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold transition"
          >
            <UserCheck size={13} />
            Reativar
          </button>
        )}
      </div>
    </div>
  );
}
