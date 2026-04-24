import { useEffect, useState } from "react";
import { api } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { Alert, Spinner } from "../components/ui";
import { maskCpf } from "../lib/cpf";
import { useAuth } from "../context/AuthContext";
import {
  CheckCircle2, XCircle, UserCheck, UserX, ShieldCheck,
  Shield, Clock, Building2, Trash2, AlertTriangle, Crown,
} from "lucide-react";

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("pending"); // pending | active | monitors | admins | all
  const [confirmDelete, setConfirmDelete] = useState(null); // user obj | null
  const [confirmAdmin, setConfirmAdmin] = useState(null);   // { user, action: "grant"|"revoke" }

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

  async function deleteUser(id) {
    setErr("");
    try {
      await api.delete(`/users/${id}`);
      setConfirmDelete(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao excluir usuário");
      setConfirmDelete(null);
    }
  }

  const pending  = users.filter((u) => !u.active && u.role === "TECHNICIAN");
  const active   = users.filter((u) => u.active  && u.role === "TECHNICIAN");
  const monitors = users.filter((u) => u.role === "MONITOR");
  const admins   = users.filter((u) => u.role === "ADMIN");

  const tabData = {
    pending,
    active,
    monitors,
    admins,
    all: users,
  };

  const tabs = [
    { key: "pending",  label: "Aguardando",    count: pending.length,  highlight: pending.length > 0 },
    { key: "active",   label: "Técnicos",       count: active.length,   highlight: false },
    { key: "monitors", label: "Monitores",      count: monitors.length, highlight: false },
    { key: "admins",   label: "Admins",         count: admins.length,   highlight: false },
    { key: "all",      label: "Todos",          count: users.length,    highlight: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <AppHeader />

      {/* Modal de confirmação de permissão Admin */}
      {confirmAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                <Crown size={20} />
              </span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-gray-100">
                  {confirmAdmin.action === "grant" ? "Conceder permissão de Admin" : "Revogar permissão de Admin"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Esta ação pode ser revertida</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-gray-300">
              {confirmAdmin.action === "grant" ? (
                <>
                  <strong>{confirmAdmin.user.name}</strong> terá acesso total ao sistema,
                  incluindo gestão de usuários, setores e exclusão de chamados.
                </>
              ) : (
                <>
                  <strong>{confirmAdmin.user.name}</strong> perderá o acesso de administrador
                  e voltará a ser Técnico.
                </>
              )}
            </p>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setConfirmAdmin(null)} className="btn-secondary text-sm py-2 px-4">
                Cancelar
              </button>
              <button
                onClick={() => {
                  const newRole = confirmAdmin.action === "grant" ? "ADMIN" : "TECHNICIAN";
                  update(confirmAdmin.user.id, { role: newRole });
                  setConfirmAdmin(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition text-white ${
                  confirmAdmin.action === "grant"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-slate-600 hover:bg-slate-700"
                }`}
              >
                <Crown size={14} />
                {confirmAdmin.action === "grant" ? "Conceder Admin" : "Revogar Admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <AlertTriangle size={20} />
              </span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-gray-100">Excluir usuário</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-gray-300">
              Tem certeza que deseja excluir <strong>{confirmDelete.name}</strong>?
              O CPF <span className="font-mono">{maskCpf(confirmDelete.cpf)}</span> ficará
              disponível para novo cadastro.
            </p>
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary text-sm py-2 px-4"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteUser(confirmDelete.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-semibold transition"
              >
                <Trash2 size={14} />
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Gestão de usuários</h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
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
                  ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800 hover:bg-red-100 dark:hover:bg-red-900/50"
                  : "bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 ring-1 ring-slate-200 dark:ring-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700"
              }`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                tab === t.key ? "bg-white/20 text-white" : t.highlight ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400" : "bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300"
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
          <div className="card p-10 text-center text-slate-400 dark:text-gray-500">
            {tab === "pending" ? "Nenhum cadastro aguardando aprovação 🎉" : "Nenhum usuário nesta categoria"}
          </div>
        ) : (
          <div className="card divide-y divide-slate-100 dark:divide-gray-700/60">
            {tabData[tab].map((u) => (
              <UserRow
                key={u.id}
                user={u}
                units={units}
                me={me}
                onUpdate={update}
                onDelete={() => setConfirmDelete(u)}
                onGrantAdmin={() => setConfirmAdmin({ user: u, action: "grant" })}
                onRevokeAdmin={() => setConfirmAdmin({ user: u, action: "revoke" })}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function UserRow({ user, units, me, onUpdate, onDelete, onGrantAdmin, onRevokeAdmin }) {
  const [unitId, setUnitId] = useState(user.unit?.id || "");
  const [changing, setChanging] = useState(false);

  async function applyUnit() {
    setChanging(true);
    await onUpdate(user.id, { unitId: unitId || null });
    setChanging(false);
  }

  const isPending = !user.active && user.role === "TECHNICIAN";
  const isAdmin   = user.role === "ADMIN";
  const isMe      = me?.id === user.id;

  return (
    <div className={`px-5 py-4 flex flex-wrap items-center gap-4 ${isPending ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}>
      {/* Avatar + info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          isAdmin
            ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
            : user.role === "MONITOR"
            ? "bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400"
            : user.active
            ? "bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300"
            : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
        }`}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-900 dark:text-gray-100 text-sm">{user.name}</span>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-700">
                <Crown size={10} /> Admin
              </span>
            )}
            {user.role === "MONITOR" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-400 ring-1 ring-brand-200 dark:ring-brand-800">
                <ShieldCheck size={10} /> Monitor
              </span>
            )}
            {isPending && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800">
                <Clock size={10} /> Aguardando aprovação
              </span>
            )}
            {user.active && user.role === "TECHNICIAN" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800">
                <CheckCircle2 size={10} /> Ativo
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{maskCpf(user.cpf)}</span>
            {user.unit && (
              <span className="flex items-center gap-1">
                <Building2 size={10} />
                {user.unit.name}
              </span>
            )}
            <span className="text-slate-400 dark:text-gray-500">
              Cadastrado em {new Date(user.createdAt).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 shrink-0">
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
              className="btn-secondary text-xs py-1.5 px-2.5 whitespace-nowrap"
            >
              {changing ? <Spinner className="h-3 w-3" /> : <Building2 size={13} />}
              Salvar
            </button>
          )}
        </div>

        {/* Promover a monitor / rebaixar para técnico */}
        {user.active && user.role === "TECHNICIAN" && (
          <button
            onClick={() => onUpdate(user.id, { role: "MONITOR" })}
            className="btn-secondary text-xs py-1.5 px-2.5 whitespace-nowrap"
            title="Promover a monitor"
          >
            <Shield size={13} className="text-brand-600 dark:text-brand-400" />
            Monitor
          </button>
        )}
        {user.role === "MONITOR" && (
          <button
            onClick={() => onUpdate(user.id, { role: "TECHNICIAN" })}
            className="btn-secondary text-xs py-1.5 px-2.5 whitespace-nowrap"
            title="Rebaixar a técnico"
          >
            <UserX size={13} className="text-slate-500 dark:text-gray-400" />
            Técnico
          </button>
        )}

        {/* Conceder / Revogar Admin — apenas para o próprio Admin, e não em si mesmo */}
        {me?.role === "ADMIN" && !isMe && !isAdmin && user.active && (
          <button
            onClick={onGrantAdmin}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-700 px-2.5 py-1.5 text-xs font-semibold transition whitespace-nowrap"
            title="Conceder permissão de administrador"
          >
            <Crown size={12} />
            Admin
          </button>
        )}
        {me?.role === "ADMIN" && !isMe && isAdmin && (
          <button
            onClick={onRevokeAdmin}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-600 dark:text-gray-300 ring-1 ring-slate-200 dark:ring-gray-600 px-2.5 py-1.5 text-xs font-semibold transition whitespace-nowrap"
            title="Revogar permissão de administrador"
          >
            <Crown size={12} />
            Revogar
          </button>
        )}

        {/* Aprovar / Desativar — não aplicável a ADMINs */}
        {isPending && !isAdmin && (
          <button
            onClick={() => onUpdate(user.id, { active: true })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap"
          >
            <UserCheck size={13} />
            Aprovar
          </button>
        )}
        {user.active && !isAdmin && !isMe && (
          <button
            onClick={() => onUpdate(user.id, { active: false })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800 px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap"
          >
            <XCircle size={13} />
            Desativar
          </button>
        )}
        {!user.active && user.role !== "TECHNICIAN" && !isAdmin && (
          <button
            onClick={() => onUpdate(user.id, { active: true })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap"
          >
            <UserCheck size={13} />
            Reativar
          </button>
        )}

        {/* Excluir — não disponível para ADMINs nem para si mesmo */}
        {!isAdmin && !isMe && (
          <button
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition shrink-0"
            title="Excluir usuário"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
