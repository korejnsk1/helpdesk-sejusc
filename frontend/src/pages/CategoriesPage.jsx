import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { Spinner, Alert } from "../components/ui";
import { useToast } from "../context/ToastContext";
import {
  GripVertical, ChevronDown, Plus, Trash2, Pencil, Check, X,
  Monitor, Wifi, KeyRound, HelpCircle, MonitorSmartphone, Printer, Server, BookOpen,
  Tag, ToggleLeft, ToggleRight, Clock,
} from "lucide-react";

const CAT_ICONS = {
  HARDWARE:  Monitor,
  NETWORK:   Wifi,
  NETSERVER: Server,
  ACCESS:    KeyRound,
  REMOTE:    MonitorSmartphone,
  PRINTER:   Printer,
  SIGED:     BookOpen,
  OTHER:     HelpCircle,
};

const CAT_COLORS = {
  HARDWARE:  "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  NETWORK:   "bg-blue-100   dark:bg-blue-900/30   text-blue-600   dark:text-blue-400",
  NETSERVER: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
  ACCESS:    "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
  REMOTE:    "bg-cyan-100   dark:bg-cyan-900/30   text-cyan-600   dark:text-cyan-400",
  PRINTER:   "bg-green-100  dark:bg-green-900/30  text-green-600  dark:text-green-400",
  SIGED:     "bg-amber-100  dark:bg-amber-900/30  text-amber-600  dark:text-amber-400",
  OTHER:     "bg-slate-100  dark:bg-gray-800      text-slate-500  dark:text-gray-400",
};

function getCatIcon(code) { return CAT_ICONS[code] || Tag; }
function getCatColor(code) { return CAT_COLORS[code] || CAT_COLORS.OTHER; }

// ── Pointer-based drag-to-reorder ─────────────────────────────────────────────
function useDragReorder(items, onReorder) {
  const [drag, setDrag]   = useState(null); // { fromIdx, overIdx }
  const dragRef  = useRef(null);
  const itemsRef = useRef(items);
  const listRef  = useRef(null);

  useEffect(() => { itemsRef.current = items; }, [items]);

  function startDrag(e, idx) {
    e.preventDefault();
    const container = listRef.current;
    if (!container) return;

    const itemEl = [...container.children][idx];
    if (!itemEl) return;

    const rect     = itemEl.getBoundingClientRect();
    const offsetY  = e.clientY - rect.top;

    const clone = itemEl.cloneNode(true);
    clone.style.cssText = [
      `position:fixed`,
      `left:${rect.left}px`,
      `top:${rect.top}px`,
      `width:${rect.width}px`,
      `margin:0`,
      `z-index:9999`,
      `pointer-events:none`,
      `opacity:0.93`,
      `transform:scale(1.025) rotate(0.5deg)`,
      `box-shadow:0 24px 48px -8px rgba(0,0,0,0.35),0 12px 24px -6px rgba(0,0,0,0.2)`,
      `transition:none`,
    ].join(';');
    document.body.appendChild(clone);

    dragRef.current = { fromIdx: idx, overIdx: idx };
    setDrag({ fromIdx: idx, overIdx: idx });

    function computeOver(clientY) {
      const children = [...container.children];
      let over = 0, bestDist = Infinity;
      children.forEach((el, i) => {
        const r    = el.getBoundingClientRect();
        const dist = Math.abs(clientY - (r.top + r.height / 2));
        if (dist < bestDist) { bestDist = dist; over = i; }
      });
      return over;
    }

    function onMove(ev) {
      clone.style.top = (ev.clientY - offsetY) + 'px';
      const over = computeOver(ev.clientY);
      if (over !== dragRef.current?.overIdx) {
        dragRef.current = { ...dragRef.current, overIdx: over };
        setDrag({ ...dragRef.current });
      }
    }

    function onUp() {
      document.body.removeChild(clone);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);

      const { fromIdx, overIdx } = dragRef.current || {};
      dragRef.current = null;
      setDrag(null);

      if (fromIdx != null && overIdx != null && fromIdx !== overIdx && onReorder) {
        const next = [...itemsRef.current];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(overIdx, 0, moved);
        onReorder(next);
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
  }

  return {
    listRef,
    startDrag,
    fromIdx: drag?.fromIdx ?? null,
    overIdx: drag?.overIdx ?? null,
  };
}

// ── Inline name editor ────────────────────────────────────────────────────────
function InlineName({ value, onSave, className = "" }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const inputRef = useRef(null);

  function start(e) { e.stopPropagation(); setDraft(value); setEditing(true); }
  function cancel()  { setEditing(false); }
  function confirm() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    setEditing(false);
  }

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  if (editing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") confirm(); if (e.key === "Escape") cancel(); }}
          className="field-input py-1 text-sm min-w-0 w-40"
          maxLength={80}
        />
        <button onClick={confirm} className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition" title="Confirmar">
          <Check size={14} />
        </button>
        <button onClick={cancel} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700 transition" title="Cancelar">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <button onClick={start} className={`group flex items-center gap-1.5 text-left ${className}`} title="Clique para editar">
      <span>{value}</span>
      <Pencil size={12} className="opacity-0 group-hover:opacity-60 transition text-slate-400 shrink-0" />
    </button>
  );
}

// ── Drop indicator ────────────────────────────────────────────────────────────
function DropLine({ show }) {
  if (!show) return null;
  return <div className="h-0.5 rounded-full bg-brand-500 mx-1" />;
}

// ── Subcategory row ───────────────────────────────────────────────────────────
function SubRow({ sub, catId, onRename, onDelete, onGripPointerDown, isDragging }) {
  const [deleteErr, setDeleteErr] = useState("");

  async function handleDelete() {
    setDeleteErr("");
    try {
      await api.delete(`/categories/${catId}/subcategories/${sub.id}`);
      onDelete(sub.id);
    } catch (e) {
      setDeleteErr(e.response?.data?.error || "Erro ao excluir");
    }
  }

  return (
    <div className="flex flex-col" style={isDragging ? { opacity: 0.3 } : undefined}>
      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-gray-800/60 hover:bg-slate-100 dark:hover:bg-gray-800 transition group">
        <GripVertical
          size={14}
          className="text-slate-300 dark:text-gray-600 shrink-0 cursor-grab active:cursor-grabbing select-none"
          onPointerDown={onGripPointerDown}
          style={{ touchAction: "none" }}
        />
        <InlineName
          value={sub.name}
          onSave={(name) => onRename(sub.id, name)}
          className="flex-1 text-sm text-slate-700 dark:text-gray-200 font-medium"
        />
        <button
          onClick={handleDelete}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition opacity-0 group-hover:opacity-100"
          title="Excluir subcategoria"
        >
          <Trash2 size={12} />
        </button>
      </div>
      {deleteErr && <p className="text-xs text-red-500 dark:text-red-400 mt-1 px-3">{deleteErr}</p>}
    </div>
  );
}

// ── Category card ─────────────────────────────────────────────────────────────
function CategoryCard({ cat, onUpdate, onDelete, onGripPointerDown, isDragging }) {
  const addToast = useToast();
  const [open,       setOpen]      = useState(false);
  const [newSub,     setNewSub]    = useState("");
  const [addingErr,  setAddingErr] = useState("");
  const [deleteErr,  setDeleteErr] = useState("");
  const [savingSub,  setSavingSub] = useState(false);
  const [subcats,    setSubcats]   = useState(cat.subcategories || []);
  const [slaDraft,   setSlaDraft]  = useState(cat.slaHours != null ? String(cat.slaHours) : "");
  const [slaEditing, setSlaEditing] = useState(false);

  useEffect(() => { setSubcats(cat.subcategories || []); }, [cat.subcategories]);

  const { listRef: subListRef, startDrag: startSubDrag, fromIdx: subFromIdx, overIdx: subOverIdx } =
    useDragReorder(subcats, (next) => {
      setSubcats(next);
      api.patch(`/categories/${cat.id}/subcategories/reorder`, { ids: next.map((s) => s.id) })
        .catch(() => addToast({ message: "Erro ao salvar ordem", type: "error" }));
    });

  const Icon = getCatIcon(cat.code);

  async function renameCategory(name) {
    try {
      const res = await api.patch(`/categories/${cat.id}`, { name });
      onUpdate({ ...cat, name: res.data.name });
      addToast({ message: "Categoria renomeada", type: "success" });
    } catch (e) {
      addToast({ message: e.response?.data?.error || "Erro ao renomear", type: "error" });
    }
  }

  async function saveSlaHours() {
    setSlaEditing(false);
    const val = slaDraft.trim();
    const parsed = val === "" ? null : Number(val);
    if (val !== "" && (isNaN(parsed) || parsed <= 0)) {
      addToast({ message: "SLA inválido — informe um número positivo", type: "error" });
      setSlaDraft(cat.slaHours != null ? String(cat.slaHours) : "");
      return;
    }
    if (parsed === cat.slaHours) return;
    try {
      const res = await api.patch(`/categories/${cat.id}`, { slaHours: parsed });
      onUpdate({ ...cat, slaHours: res.data.slaHours });
      addToast({ message: parsed ? `SLA definido: ${parsed}h` : "SLA removido", type: "success" });
    } catch (e) {
      addToast({ message: e.response?.data?.error || "Erro ao salvar SLA", type: "error" });
    }
  }

  async function toggleFreeText() {
    try {
      const res = await api.patch(`/categories/${cat.id}`, { allowsFreeText: !cat.allowsFreeText });
      onUpdate({ ...cat, allowsFreeText: res.data.allowsFreeText });
    } catch (e) {
      addToast({ message: "Erro ao atualizar", type: "error" });
    }
  }

  async function handleDeleteCat() {
    setDeleteErr("");
    try {
      await api.delete(`/categories/${cat.id}`);
      onDelete(cat.id);
    } catch (e) {
      setDeleteErr(e.response?.data?.error || "Erro ao excluir");
    }
  }

  async function addSubcategory() {
    const name = newSub.trim();
    if (!name) return;
    setAddingErr(""); setSavingSub(true);
    try {
      const res = await api.post(`/categories/${cat.id}/subcategories`, { name });
      setSubcats((prev) => [...prev, res.data]);
      setNewSub("");
    } catch (e) {
      setAddingErr(e.response?.data?.error || "Erro ao adicionar");
    } finally {
      setSavingSub(false);
    }
  }

  function renameSubcategory(subId, name) {
    api.patch(`/categories/${cat.id}/subcategories/${subId}`, { name })
      .then(() => setSubcats((prev) => prev.map((s) => s.id === subId ? { ...s, name } : s)))
      .catch((e) => addToast({ message: e.response?.data?.error || "Erro ao renomear", type: "error" }));
  }

  function deleteSubcategory(subId) {
    setSubcats((prev) => prev.filter((s) => s.id !== subId));
  }

  return (
    <div className={`card transition-opacity duration-150 ${isDragging ? "opacity-30" : "opacity-100"}`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <GripVertical
          size={16}
          className="text-slate-300 dark:text-gray-600 shrink-0 cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onPointerDown={(e) => { e.stopPropagation(); onGripPointerDown(e); }}
          onClick={(e) => e.stopPropagation()}
        />

        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${getCatColor(cat.code)}`}>
          <Icon size={18} />
        </span>

        <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
          <InlineName
            value={cat.name}
            onSave={renameCategory}
            className="font-semibold text-slate-800 dark:text-gray-100"
          />
          <button
            onClick={toggleFreeText}
            title={cat.allowsFreeText ? "Texto livre — clique para usar subcategorias" : "Subcategorias — clique para texto livre"}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
              cat.allowsFreeText
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                : "bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400"
            }`}
          >
            {cat.allowsFreeText
              ? <><ToggleRight size={13} /> Texto livre</>
              : <><ToggleLeft  size={13} /> Subcategorias</>}
          </button>
          {!cat.allowsFreeText && (
            <span className="text-xs text-slate-400 dark:text-gray-500">
              {subcats.length} {subcats.length !== 1 ? "subcategorias" : "subcategoria"}
            </span>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); handleDeleteCat(); }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition shrink-0"
          title="Excluir categoria"
        >
          <Trash2 size={14} />
        </button>

        <ChevronDown size={16} className={`text-slate-400 dark:text-gray-500 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </div>

      {deleteErr && (
        <p className="px-5 pb-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10">
          {deleteErr}
        </p>
      )}

      {/* Expanded body */}
      {open && (
        <div className="border-t border-slate-100 dark:border-gray-700/60 px-5 py-4 space-y-4">

          {/* SLA */}
          <div className="flex items-center gap-3">
            <Clock size={14} className="text-slate-400 dark:text-gray-500 shrink-0" />
            <span className="text-sm text-slate-500 dark:text-gray-400 w-20 shrink-0">SLA (horas)</span>
            {slaEditing ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  type="number"
                  min="1"
                  value={slaDraft}
                  onChange={(e) => setSlaDraft(e.target.value)}
                  onBlur={saveSlaHours}
                  onKeyDown={(e) => { if (e.key === "Enter") saveSlaHours(); if (e.key === "Escape") { setSlaEditing(false); setSlaDraft(cat.slaHours != null ? String(cat.slaHours) : ""); } }}
                  placeholder="Ex: 24"
                  className="field-input py-1 text-sm w-24"
                />
              </div>
            ) : (
              <button
                onClick={() => setSlaEditing(true)}
                className="group flex items-center gap-1.5 text-sm text-slate-700 dark:text-gray-200 rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-gray-800 transition"
                title="Clique para editar SLA"
              >
                {cat.slaHours ? (
                  <span className="font-medium">{cat.slaHours}h</span>
                ) : (
                  <span className="text-slate-400 dark:text-gray-500 italic">Sem prazo</span>
                )}
                <Pencil size={11} className="opacity-0 group-hover:opacity-60 transition text-slate-400" />
              </button>
            )}
          </div>

          {cat.allowsFreeText ? (
            <p className="text-sm text-slate-400 dark:text-gray-500 italic">
              O usuário descreve o problema livremente — nenhuma subcategoria é exibida.
            </p>
          ) : (
            <>
              {subcats.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-gray-500 border border-dashed border-slate-200 dark:border-gray-700 rounded-xl py-4 text-center">
                  Nenhuma subcategoria. Adicione abaixo.
                </p>
              ) : (
                <div ref={subListRef} className="space-y-1.5">
                  {subcats.map((sub, idx) => (
                    <div key={sub.id}>
                      <DropLine show={subFromIdx !== null && subOverIdx === idx && subFromIdx > idx} />
                      <SubRow
                        sub={sub}
                        catId={cat.id}
                        onRename={renameSubcategory}
                        onDelete={deleteSubcategory}
                        isDragging={subFromIdx === idx}
                        onGripPointerDown={(e) => { e.stopPropagation(); startSubDrag(e, idx); }}
                      />
                      <DropLine show={subFromIdx !== null && subOverIdx === idx && subFromIdx < idx} />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <input
                  className="field-input flex-1 text-sm py-2"
                  placeholder="Nova subcategoria..."
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSubcategory()}
                  maxLength={80}
                />
                <button
                  onClick={addSubcategory}
                  disabled={!newSub.trim() || savingSub}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-200 text-sm font-medium transition disabled:opacity-40 shrink-0"
                >
                  {savingSub ? <Spinner className="h-4 w-4" /> : <><Plus size={14} /> Adicionar</>}
                </button>
              </div>
              {addingErr && <p className="text-xs text-red-500 dark:text-red-400">{addingErr}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── New Category Modal ────────────────────────────────────────────────────────
function NewCategoryModal({ onClose, onCreate }) {
  const [name,           setName]           = useState("");
  const [allowsFreeText, setAllowsFreeText] = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [err,            setErr]            = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(""); setSaving(true);
    try {
      const res = await api.post("/categories", { name: name.trim(), allowsFreeText });
      onCreate(res.data);
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao criar categoria");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400">
            <Tag size={20} />
          </span>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-gray-100">Nova categoria</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Será exibida no formulário de chamado</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="field-label">Nome *</label>
            <input
              autoFocus required
              className="field-input"
              placeholder="Ex: Periféricos"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-200 dark:border-gray-700 px-4 py-3 hover:bg-slate-50 dark:hover:bg-gray-800 transition">
            <input
              type="checkbox"
              checked={allowsFreeText}
              onChange={(e) => setAllowsFreeText(e.target.checked)}
              className="rounded accent-brand-600"
            />
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-gray-200">Texto livre</div>
              <div className="text-xs text-slate-400 dark:text-gray-500">Usuário descreve em vez de escolher subcategoria</div>
            </div>
          </label>

          {err && <Alert message={err} />}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-sm font-semibold transition disabled:opacity-60"
            >
              {saving ? <Spinner className="h-4 w-4" /> : <Plus size={14} />}
              Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const addToast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showNew,    setShowNew]    = useState(false);

  const { listRef: catListRef, startDrag: startCatDrag, fromIdx: catFromIdx, overIdx: catOverIdx } =
    useDragReorder(categories, (next) => {
      setCategories(next);
      api.patch("/categories/reorder", { ids: next.map((c) => c.id) })
        .catch(() => addToast({ message: "Erro ao salvar ordem", type: "error" }));
    });

  const load = useCallback(async () => {
    try {
      const res = await api.get("/categories");
      setCategories(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleUpdate(updated) {
    setCategories((prev) => prev.map((c) => c.id === updated.id ? { ...c, ...updated } : c));
  }

  function handleDelete(catId) {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    addToast({ message: "Categoria excluída", type: "success" });
  }

  function handleCreate(cat) {
    setCategories((prev) => [...prev, { ...cat, subcategories: cat.subcategories || [] }]);
    setShowNew(false);
    addToast({ message: "Categoria criada", type: "success" });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <AppHeader />

      <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Categorias de chamado</h1>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
              Arraste para reordenar · clique no nome para editar
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-2 text-sm font-semibold transition"
          >
            <Plus size={15} /> Nova categoria
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="h-8 w-8" />
          </div>
        ) : categories.length === 0 ? (
          <div className="card p-12 text-center">
            <Tag size={32} className="mx-auto text-slate-300 dark:text-gray-600 mb-3" />
            <div className="font-medium text-slate-600 dark:text-gray-400">Nenhuma categoria cadastrada</div>
            <p className="text-sm text-slate-400 dark:text-gray-500 mt-1">Crie a primeira categoria de chamado</p>
          </div>
        ) : (
          <div ref={catListRef} className="space-y-2">
            {categories.map((cat, idx) => (
              <div key={cat.id}>
                <DropLine show={catFromIdx !== null && catOverIdx === idx && catFromIdx > idx} />
                <CategoryCard
                  cat={cat}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onGripPointerDown={(e) => startCatDrag(e, idx)}
                  isDragging={catFromIdx === idx}
                />
                <DropLine show={catFromIdx !== null && catOverIdx === idx && catFromIdx < idx} />
              </div>
            ))}
          </div>
        )}
      </main>

      {showNew && (
        <NewCategoryModal onClose={() => setShowNew(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
