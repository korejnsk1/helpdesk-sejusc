import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { Alert, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import {
  CheckCircle2, XCircle, UserCheck, Building2, Shield, Trash2,
  AlertTriangle, Crown, KeyRound, Copy, Check as CheckIcon, Phone,
  Bell, Pencil, X, ChevronRight, Mail, Hash, Briefcase, Users, ShieldCheck,
} from "lucide-react";

// ── Constantes de label ──────────────────────────────────────────────────────
const ROLE_LABEL = {
  ADMIN:       "Admin",
  TECHNICIAN:  "Técnico",
  CHEFE_SETOR: "Chefe de Setor",
  USER:        "Usuário",
};

const PREFIXO_LABEL = {
  GOVERNO:      "Servidor do Governo",
  TERCEIRIZADO: "Terceirizado",
  ESTAGIARIO:   "Estagiário",
};

const ROLE_COLORS = {
  ADMIN:       "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-700",
  TECHNICIAN:  "bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-gray-300 ring-slate-200 dark:ring-gray-700",
  CHEFE_SETOR: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 ring-purple-200 dark:ring-purple-700",
  USER:        "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-800",
};

// ── Badge de role ────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const icon = role === "ADMIN"       ? <Crown size={10} />
             : role === "CHEFE_SETOR" ? <ShieldCheck size={10} />
             : role === "TECHNICIAN"  ? <CheckCircle2 size={10} />
             : null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${ROLE_COLORS[role] || ROLE_COLORS.USER}`}>
      {icon} {ROLE_LABEL[role] || role}
    </span>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function UsersPage() {
  const { user: me } = useAuth();
  const [searchParams] = useSearchParams();
  const [users,          setUsers]          = useState([]);
  const [units,          setUnits]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [err,            setErr]            = useState("");
  const [tab,            setTab]            = useState(searchParams.get("tab") || "all");
  const [selectedUser,   setSelectedUser]   = useState(null);   // painel lateral
  const [confirmDelete,  setConfirmDelete]  = useState(null);
  const [confirmAdmin,   setConfirmAdmin]   = useState(null);
  const [resetResult,    setResetResult]    = useState(null);
  const [copied,         setCopied]         = useState(false);
  const [resetRequests,  setResetRequests]  = useState([]);
  const [resolvingId,    setResolvingId]    = useState(null);

  useEffect(() => {
    load();
    api.get("/units").then((r) => setUnits(r.data)).catch(() => {});
    loadResetRequests();
  }, []);

  // Ao mudar um usuário, atualiza o painel lateral se ele estiver aberto
  function syncSelected(updated) {
    if (selectedUser && selectedUser.id === updated.id) {
      setSelectedUser((prev) => ({ ...prev, ...updated }));
    }
  }

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

  async function loadResetRequests() {
    try {
      const { data } = await api.get("/password-reset-requests");
      setResetRequests(data);
    } catch {}
  }

  async function update(id, patch) {
    setErr("");
    try {
      const { data } = await api.patch(`/users/${id}`, patch);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...data } : u));
      syncSelected({ id, ...data });
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao atualizar");
    }
  }

  async function deleteUser(id) {
    setErr("");
    try {
      await api.delete(`/users/${id}`);
      setConfirmDelete(null);
      setSelectedUser(null);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao excluir usuário");
      setConfirmDelete(null);
    }
  }

  async function doResetPassword(id, name) {
    setErr("");
    try {
      const { data } = await api.post(`/users/${id}/reset-password`);
      setResetResult({ name, tempPassword: data.tempPassword });
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao resetar senha");
    }
  }

  async function resolveRequest(id) {
    setResolvingId(id);
    try {
      const { data } = await api.post(`/password-reset-requests/${id}/resolve`);
      setResetResult({ name: data.name, tempPassword: data.tempPassword, phone: data.phone });
      loadResetRequests();
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao resolver solicitação");
    } finally {
      setResolvingId(null);
    }
  }

  function copyTempPassword() {
    navigator.clipboard.writeText(resetResult.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Agrupamentos de tabs ─────────────────────────────────────────────────
  const active    = users.filter((u) => u.active);
  const chefes    = active.filter((u) => u.role === "CHEFE_SETOR" || u.isChefe);
  const usuarios  = active.filter((u) => u.role === "USER");
  const tecnicos  = active.filter((u) => u.role === "TECHNICIAN");
  const admins    = active.filter((u) => u.role === "ADMIN");

  const tabData = { all: active, usuarios, tecnicos, admins, chefes };
  const tabs = [
    { key: "all",      label: "Todos",          count: active.length   },
    { key: "usuarios", label: "Usuários",        count: usuarios.length },
    { key: "tecnicos", label: "Técnicos",        count: tecnicos.length },
    { key: "chefes",   label: "Chefes de Setor", count: chefes.length   },
    { key: "admins",   label: "Admins",          count: admins.length   },
  ];

  const displayList = tabData[tab] ?? active;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <AppHeader />

      {/* ── Modal: senha temporária ─────────────────────────────────────── */}
      {resetResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setResetResult(null); setCopied(false); } }}
        >
          <div className="card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400">
                <KeyRound size={20} />
              </span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-gray-100">Senha temporária gerada</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Anote e comunique ao usuário</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-gray-300 mb-2">
                Senha para <strong>{resetResult.name}</strong>:
              </p>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 px-4 py-3">
                <span className="font-mono font-bold text-lg tracking-widest text-slate-800 dark:text-gray-100 flex-1">
                  {resetResult.tempPassword}
                </span>
                <button onClick={copyTempPassword} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-brand-600 transition">
                  {copied ? <CheckIcon size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            {resetResult.phone && (
              <div className="flex items-center gap-3 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-700 px-4 py-3">
                <Phone size={16} className="text-brand-600 dark:text-brand-400 shrink-0" />
                <div>
                  <p className="text-xs text-brand-700 dark:text-brand-300 font-medium">Entre em contato</p>
                  <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">{resetResult.phone}</p>
                </div>
              </div>
            )}
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
              ⚠️ Esta senha é exibida apenas uma vez. O usuário deverá alterá-la no próximo login.
            </div>
            <button onClick={() => { setResetResult(null); setCopied(false); }} className="btn-primary w-full">
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: confirmação de Admin ─────────────────────────────────── */}
      {confirmAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmAdmin(null); }}
        >
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
              {confirmAdmin.action === "grant"
                ? <><strong>{confirmAdmin.user.name}</strong> terá acesso total ao sistema.</>
                : <><strong>{confirmAdmin.user.name}</strong> perderá o acesso de administrador.</>
              }
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmAdmin(null)} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
              <button
                onClick={() => {
                  update(confirmAdmin.user.id, { role: confirmAdmin.action === "grant" ? "ADMIN" : "TECHNICIAN" });
                  setConfirmAdmin(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition text-white ${
                  confirmAdmin.action === "grant" ? "bg-amber-500 hover:bg-amber-600" : "bg-slate-600 hover:bg-slate-700"
                }`}
              >
                <Crown size={14} />
                {confirmAdmin.action === "grant" ? "Conceder Admin" : "Revogar Admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: confirmação de exclusão ──────────────────────────────── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}
        >
          <div className="card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                <AlertTriangle size={20} />
              </span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-gray-100">Excluir usuário</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-gray-300">
              Excluir <strong>{confirmDelete.name}</strong>? O CPF ficará disponível para novo cadastro.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
              <button
                onClick={() => deleteUser(confirmDelete.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-semibold transition"
              >
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Layout principal ─────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Gestão de usuários</h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
            Gerencie perfis, atribua funções e redefina senhas
          </p>
        </div>

        <Alert message={err} />

        {/* Tabs */}
        {tab !== "resets" && (
          <div className="flex gap-2 flex-wrap">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSelectedUser(null); }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  tab === t.key
                    ? t.alert ? "bg-amber-500 text-white" : "bg-brand-600 text-white"
                    : t.alert
                      ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 ring-1 ring-amber-300 dark:ring-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                      : "bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 ring-1 ring-slate-200 dark:ring-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  tab === t.key
                    ? "bg-white/20 text-white"
                    : t.alert
                      ? "bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200"
                      : "bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300"
                }`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Conteúdo por tab ────────────────────────────────────────── */}
        {tab === "resets" ? (
          <ResetRequestsList
            requests={resetRequests}
            resolvingId={resolvingId}
            onResolve={resolveRequest}
            onBack={() => setTab("all")}
          />
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <div className={`flex gap-4 items-start transition-all ${selectedUser ? "" : ""}`}>
            {/* ── Lista compacta ──────────────────────────────────── */}
            <div className={`flex-1 min-w-0 card divide-y divide-slate-100 dark:divide-gray-700/60 transition-all ${selectedUser ? "hidden md:block" : ""}`}>
              {displayList.length === 0 ? (
                <div className="p-10 text-center text-slate-400 dark:text-gray-500">
                  Nenhum usuário nesta categoria
                </div>
              ) : displayList.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  isSelected={selectedUser?.id === u.id}
                  onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                />
              ))}
            </div>

            {/* ── Painel de detalhes ──────────────────────────────── */}
            {selectedUser && (
              <UserDetailPanel
                user={users.find((u) => u.id === selectedUser.id) ?? selectedUser}
                units={units}
                me={me}
                onUpdate={update}
                onDelete={() => setConfirmDelete(selectedUser)}
                onGrantAdmin={() => setConfirmAdmin({ user: selectedUser, action: "grant" })}
                onRevokeAdmin={() => setConfirmAdmin({ user: selectedUser, action: "revoke" })}
                onResetPassword={() => doResetPassword(selectedUser.id, selectedUser.name)}
                onClose={() => setSelectedUser(null)}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Linha compacta da lista ─────────────────────────────────────────────────
function UserRow({ user, isSelected, onClick }) {
  const initial = user.name.charAt(0).toUpperCase();
  const bgAvatar = user.role === "ADMIN"       ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                 : user.role === "CHEFE_SETOR"  ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400"
                 : user.role === "TECHNICIAN"   ? "bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300"
                 : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors ${
        isSelected
          ? "bg-brand-50 dark:bg-brand-900/10"
          : "hover:bg-slate-50 dark:hover:bg-gray-800/50"
      }`}
    >
      {/* Avatar */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${bgAvatar}`}>
        {initial}
      </div>

      {/* Nome + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-900 dark:text-gray-100 truncate">{user.name}</span>
          <RoleBadge role={user.role} />
          {/* Badge auto-declarado chefe (quando role ainda é USER) */}
          {user.isChefe && user.role === "USER" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-700">
              <Shield size={9} /> Chefe*
            </span>
          )}
          {!user.active && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-900/20 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800">
              Inativo
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5 truncate">
          {user.department?.name ?? "Sem setor"}
        </p>
      </div>

      <ChevronRight size={16} className={`shrink-0 transition-transform ${isSelected ? "rotate-90 text-brand-500" : "text-slate-300 dark:text-gray-600"}`} />
    </button>
  );
}

// ── Painel lateral de detalhes ───────────────────────────────────────────────
function UserDetailPanel({ user, units, me, onUpdate, onDelete, onGrantAdmin, onRevokeAdmin, onResetPassword, onClose }) {
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);

  // Campos editáveis
  const [name,      setName]      = useState(user.name);
  const [matricula, setMatricula] = useState(user.matricula ?? "");
  const [email,     setEmail]     = useState(user.email ?? "");
  const [telefone,  setTelefone]  = useState(user.telefone ?? "");
  const [prefixo,   setPrefixo]   = useState(user.prefixo ?? "");
  const [unitId,    setUnitId]    = useState(user.unit?.id ?? "");
  const [isChefe,   setIsChefe]   = useState(user.isChefe ?? false);

  // Sincroniza quando o user muda (ex: refresh após update)
  useEffect(() => {
    setName(user.name);
    setMatricula(user.matricula ?? "");
    setEmail(user.email ?? "");
    setTelefone(user.telefone ?? "");
    setPrefixo(user.prefixo ?? "");
    setUnitId(user.unit?.id ?? "");
    setIsChefe(user.isChefe ?? false);
    setEditing(false);
  }, [user.id]);

  async function saveEdits() {
    setSaving(true);
    await onUpdate(user.id, {
      name: name.trim(),
      matricula: matricula.trim() || null,
      email: email.trim() || null,
      telefone: telefone.replace(/\D/g, "") || null,
      prefixo: prefixo || null,
      unitId: unitId || null,
      isChefe,
    });
    setSaving(false);
    setEditing(false);
  }

  const isAdmin = user.role === "ADMIN";
  const isTech  = user.role === "TECHNICIAN";
  const isChefRole = user.role === "CHEFE_SETOR";
  const isBase  = user.role === "USER";
  const isMe    = me?.id === user.id;

  const initial  = user.name.charAt(0).toUpperCase();
  const bgAvatar = isAdmin    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                 : isChefRole ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400"
                 : isTech     ? "bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300"
                 : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400";

  return (
    <div className="w-full md:w-96 shrink-0 card overflow-hidden">
      {/* Header do painel */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-200">Detalhes do usuário</h2>
        <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700 transition">
          <X size={15} />
        </button>
      </div>

      <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-220px)]">

        {/* Avatar + nome + role */}
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold ${bgAvatar}`}>
            {initial}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 dark:text-gray-100">{user.name}</span>
              {!user.active && (
                <span className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-900/20 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800">
                  Inativo
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <RoleBadge role={user.role} />
              {user.isChefe && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-700">
                  <Shield size={9} />
                  {user.role === "CHEFE_SETOR" ? "Chefe de Setor" : "Auto-declarado Chefe*"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dados do perfil */}
        {!editing ? (
          <div className="space-y-3">
            <DataRow icon={<Hash size={13} />}      label="CPF"          value={user.cpf} mono />
            <DataRow icon={<Hash size={13} />}      label="Matrícula"    value={user.matricula || "—"} />
            <DataRow icon={<Briefcase size={13} />} label="Vínculo"      value={PREFIXO_LABEL[user.prefixo] || "—"} />
            <DataRow icon={<Building2 size={13} />} label="Setor"        value={user.department?.name || "—"} />
            <DataRow icon={<Shield size={13} />}    label="Unidade TI"   value={user.unit?.name || "—"} />
            <DataRow icon={<Mail size={13} />}      label="E-mail"       value={user.email || "—"} />
            <DataRow icon={<Phone size={13} />}     label="Telefone"     value={user.telefone || "—"} />
            <DataRow icon={<Users size={13} />}     label="Cadastrado em" value={new Date(user.createdAt).toLocaleDateString("pt-BR")} />

            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:underline"
            >
              <Pencil size={12} /> Editar dados
            </button>
          </div>
        ) : (
          /* Formulário de edição */
          <div className="space-y-3">
            <div>
              <label className="field-label text-xs">Nome</label>
              <input className="field-input w-full text-sm" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="field-label text-xs">Matrícula</label>
              <input className="field-input w-full text-sm" placeholder="—" value={matricula} onChange={(e) => setMatricula(e.target.value)} />
            </div>
            <div>
              <label className="field-label text-xs">Vínculo funcional</label>
              <select className="field-input w-full text-sm" value={prefixo} onChange={(e) => setPrefixo(e.target.value)}>
                <option value="">—</option>
                <option value="GOVERNO">Servidor do Governo</option>
                <option value="TERCEIRIZADO">Terceirizado</option>
                <option value="ESTAGIARIO">Estagiário</option>
              </select>
            </div>
            <div>
              <label className="field-label text-xs">Unidade TI</label>
              <select className="field-input w-full text-sm" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">Sem unidade</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label text-xs">E-mail</label>
              <input className="field-input w-full text-sm" type="email" placeholder="—" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="field-label text-xs">Telefone</label>
              <input className="field-input w-full text-sm" type="tel" placeholder="—" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            {/* Toggle isChefe */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none mt-1">
              <div
                onClick={() => setIsChefe((v) => !v)}
                className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer shrink-0
                  ${isChefe ? "border-amber-500 bg-amber-500" : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"}`}
              >
                {isChefe && (
                  <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span onClick={() => setIsChefe((v) => !v)} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Shield size={13} className="text-amber-500" /> Chefe de Setor
              </span>
            </label>

            <div className="flex gap-2 pt-1">
              <button
                onClick={saveEdits}
                disabled={saving || !name.trim()}
                className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? <Spinner className="h-3.5 w-3.5" /> : <CheckIcon size={13} />}
                Salvar
              </button>
              <button onClick={() => setEditing(false)} className="btn-secondary text-sm py-2 px-4">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── Ações de role / status ─────────────────────────────── */}
        <div className="border-t border-slate-100 dark:border-gray-700 pt-4 space-y-2">
          <p className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Ações</p>

          <div className="flex flex-wrap gap-2">
            {/* USER → Técnico */}
            {isBase && (
              <button onClick={() => onUpdate(user.id, { role: "TECHNICIAN" })}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 text-xs font-semibold transition">
                <UserCheck size={12} /> Tornar Técnico
              </button>
            )}

            {/* USER → Chefe de Setor */}
            {isBase && (
              <button onClick={() => onUpdate(user.id, { role: "CHEFE_SETOR" })}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 text-xs font-semibold transition">
                <ShieldCheck size={12} /> Tornar Chefe de Setor
              </button>
            )}

            {/* Chefe de Setor → USER */}
            {isChefRole && !isMe && (
              <button onClick={() => onUpdate(user.id, { role: "USER" })}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-300 px-3 py-1.5 text-xs font-semibold transition">
                <X size={12} /> Remover Chefe de Setor
              </button>
            )}

            {/* Conceder/Revogar Admin */}
            {me?.role === "ADMIN" && !isMe && !isAdmin && user.active && (
              <button onClick={onGrantAdmin}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-700 px-3 py-1.5 text-xs font-semibold transition">
                <Crown size={12} /> Tornar Admin
              </button>
            )}
            {me?.role === "ADMIN" && !isMe && isAdmin && (
              <button onClick={onRevokeAdmin}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-600 dark:text-gray-300 ring-1 ring-slate-200 dark:ring-gray-600 px-3 py-1.5 text-xs font-semibold transition">
                <Crown size={12} /> Revogar Admin
              </button>
            )}

            {/* Ativar/Desativar */}
            {user.active && !isAdmin && !isMe && (
              <button onClick={() => onUpdate(user.id, { active: false })}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800 px-3 py-1.5 text-xs font-semibold transition">
                <XCircle size={12} /> Desativar
              </button>
            )}
            {!user.active && !isAdmin && (
              <button onClick={() => onUpdate(user.id, { active: true })}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold transition">
                <UserCheck size={12} /> Reativar
              </button>
            )}

            {/* Reset senha */}
            {!isMe && (
              <button onClick={onResetPassword}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 ring-1 ring-slate-200 dark:ring-gray-700 px-3 py-1.5 text-xs font-semibold transition">
                <KeyRound size={12} /> Redefinir senha
              </button>
            )}

            {/* Excluir */}
            {!isAdmin && !isMe && (
              <button onClick={onDelete}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800 px-3 py-1.5 text-xs font-semibold transition">
                <Trash2 size={12} /> Excluir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Par chave-valor ──────────────────────────────────────────────────────────
function DataRow({ icon, label, value, mono }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-slate-400 dark:text-gray-500 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 dark:text-gray-500">{label}</p>
        <p className={`text-sm text-slate-800 dark:text-gray-200 truncate ${mono ? "font-mono" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Lista de redefinições de senha ───────────────────────────────────────────
function ResetRequestsList({ requests, resolvingId, onResolve, onBack }) {
  return (
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="text-sm text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
      >
        ← Voltar para usuários
      </button>
      {requests.length === 0 ? (
        <div className="card p-10 text-center text-slate-400 dark:text-gray-500">
          Nenhuma solicitação de redefinição pendente 🎉
        </div>
      ) : requests.map((r) => (
        <div key={r.id} className="card px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Bell size={18} />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 dark:text-gray-100 truncate">{r.name}</p>
              <p className="text-xs text-slate-500 dark:text-gray-400">{r.cpf}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300 shrink-0">
            <Phone size={14} className="text-brand-500" />
            <span className="font-medium">{r.phone}</span>
          </div>
          <div className="text-xs text-slate-400 dark:text-gray-500 shrink-0">
            {new Date(r.createdAt).toLocaleString("pt-BR")}
          </div>
          <button
            onClick={() => onResolve(r.id)}
            disabled={resolvingId === r.id}
            className="btn-primary text-sm py-2 px-4 shrink-0 flex items-center gap-1.5"
          >
            {resolvingId === r.id ? <Spinner className="h-4 w-4" /> : <KeyRound size={14} />}
            Resetar senha
          </button>
        </div>
      ))}
    </div>
  );
}
