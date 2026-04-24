import { useEffect, useState } from "react";
import { api } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { Alert, Spinner } from "../components/ui";
import {
  Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight,
  Building2, AlertTriangle, Hash,
} from "lucide-react";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Novo setor
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  // Edição inline
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  // Confirmação de exclusão
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/departments/all");
      setDepartments(data);
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao carregar setores");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setErr("");
    try {
      await api.post("/departments", { name: newName.trim() });
      setNewName("");
      load();
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao criar setor");
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveEdit(id) {
    if (!editName.trim()) return;
    setErr("");
    try {
      await api.patch(`/departments/${id}`, { name: editName.trim() });
      setEditingId(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao renomear");
    }
  }

  async function handleToggle(dept) {
    setErr("");
    try {
      await api.patch(`/departments/${dept.id}`, { active: !dept.active });
      load();
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao alterar status");
    }
  }

  async function handleDelete(id) {
    setDeleting(true);
    setErr("");
    try {
      await api.delete(`/departments/${id}`);
      setConfirmDelete(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao excluir");
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const active   = departments.filter((d) => d.active);
  const inactive = departments.filter((d) => !d.active);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <AppHeader />

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                <AlertTriangle size={20} />
              </span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-gray-100">Excluir setor</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-gray-300">
              Tem certeza que deseja excluir <strong>{confirmDelete.name}</strong>?
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary text-sm py-2 px-4">
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
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

      <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Setores / Departamentos</h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
            Gerencie a lista de setores disponíveis ao abrir um chamado
          </p>
        </div>

        <Alert message={err} />

        {/* Formulário de novo setor */}
        <div className="card p-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <div className="relative flex-1">
              <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
              <input
                className="field-input pl-9"
                placeholder="Nome do novo setor..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={100}
              />
            </div>
            <button
              type="submit"
              disabled={!newName.trim() || adding}
              className="btn-primary shrink-0"
            >
              {adding ? <Spinner className="h-4 w-4" /> : <Plus size={16} />}
              Adicionar
            </button>
          </form>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : departments.length === 0 ? (
          <div className="card p-12 text-center">
            <Building2 size={32} className="mx-auto text-slate-300 dark:text-gray-600 mb-3" />
            <div className="font-medium text-slate-600 dark:text-gray-400">Nenhum setor cadastrado</div>
            <p className="text-sm text-slate-400 dark:text-gray-500 mt-1">
              Adicione o primeiro setor usando o formulário acima
            </p>
          </div>
        ) : (
          <>
            {/* Setores ativos */}
            {active.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
                  Ativos ({active.length})
                </h2>
                <div className="card divide-y divide-slate-100 dark:divide-gray-700/60">
                  {active.map((dept) => (
                    <DeptRow
                      key={dept.id}
                      dept={dept}
                      editingId={editingId}
                      editName={editName}
                      setEditingId={setEditingId}
                      setEditName={setEditName}
                      onSaveEdit={handleSaveEdit}
                      onToggle={handleToggle}
                      onDelete={setConfirmDelete}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Setores inativos */}
            {inactive.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
                  Inativos ({inactive.length})
                </h2>
                <div className="card divide-y divide-slate-100 dark:divide-gray-700/60 opacity-70">
                  {inactive.map((dept) => (
                    <DeptRow
                      key={dept.id}
                      dept={dept}
                      editingId={editingId}
                      editName={editName}
                      setEditingId={setEditingId}
                      setEditName={setEditName}
                      onSaveEdit={handleSaveEdit}
                      onToggle={handleToggle}
                      onDelete={setConfirmDelete}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Resumo */}
        {departments.length > 0 && (
          <p className="text-xs text-slate-400 dark:text-gray-500 text-center pb-2">
            <Hash size={11} className="inline mr-1" />
            {active.length} ativo{active.length !== 1 ? "s" : ""} · {inactive.length} inativo{inactive.length !== 1 ? "s" : ""}
          </p>
        )}
      </main>
    </div>
  );
}

function DeptRow({ dept, editingId, editName, setEditingId, setEditName, onSaveEdit, onToggle, onDelete }) {
  const isEditing = editingId === dept.id;

  function startEdit() {
    setEditingId(dept.id);
    setEditName(dept.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Building2 size={15} className="text-slate-400 dark:text-gray-500 shrink-0" />

      {isEditing ? (
        <input
          autoFocus
          className="field-input flex-1 py-1.5 text-sm"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveEdit(dept.id);
            if (e.key === "Escape") cancelEdit();
          }}
          maxLength={100}
        />
      ) : (
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${dept.active ? "text-slate-800 dark:text-gray-100" : "text-slate-400 dark:text-gray-500 line-through"}`}>
            {dept.name}
          </span>
          {dept._count?.tickets > 0 && (
            <span className="ml-2 text-xs text-slate-400 dark:text-gray-500">
              {dept._count.tickets} chamado{dept._count.tickets !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 shrink-0">
        {isEditing ? (
          <>
            <button
              onClick={() => onSaveEdit(dept.id)}
              disabled={!editName.trim()}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition disabled:opacity-40"
              title="Salvar"
            >
              <Check size={15} />
            </button>
            <button
              onClick={cancelEdit}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-gray-800 transition"
              title="Cancelar"
            >
              <X size={15} />
            </button>
          </>
        ) : (
          <>
            {/* Ativar / Desativar */}
            <button
              onClick={() => onToggle(dept)}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                dept.active
                  ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  : "text-slate-400 dark:text-gray-600 hover:bg-slate-100 dark:hover:bg-gray-800"
              }`}
              title={dept.active ? "Desativar" : "Ativar"}
            >
              {dept.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            </button>

            {/* Editar */}
            <button
              onClick={startEdit}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition"
              title="Renomear"
            >
              <Pencil size={14} />
            </button>

            {/* Excluir — só se não tiver chamados */}
            <button
              onClick={() => onDelete(dept)}
              disabled={dept._count?.tickets > 0}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-30 disabled:cursor-not-allowed"
              title={dept._count?.tickets > 0 ? "Possui chamados vinculados" : "Excluir"}
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
