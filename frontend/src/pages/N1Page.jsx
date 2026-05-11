import { useEffect, useState } from "react";
import { api } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { Alert, Spinner } from "../components/ui";
import {
  Plus, X, ChevronDown, Save,
  Lightbulb, CheckCircle2, ArrowUp, ArrowDown,
  Monitor, Wifi, KeyRound, HelpCircle, MonitorSmartphone, Printer,
} from "lucide-react";

const CAT_ICONS = {
  HARDWARE: Monitor,
  NETWORK:  Wifi,
  ACCESS:   KeyRound,
  OTHER:    HelpCircle,
  REMOTE:   MonitorSmartphone,
  PRINTER:  Printer,
};

const CAT_COLORS = {
  HARDWARE: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  NETWORK:  "bg-blue-100   dark:bg-blue-900/30   text-blue-600   dark:text-blue-400",
  ACCESS:   "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
  OTHER:    "bg-slate-100  dark:bg-gray-700       text-slate-500  dark:text-gray-400",
  REMOTE:   "bg-cyan-100   dark:bg-cyan-900/30   text-cyan-600   dark:text-cyan-400",
  PRINTER:  "bg-green-100  dark:bg-green-900/30  text-green-600  dark:text-green-400",
};

export default function N1Page() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/categories")
      .then(({ data }) => setCategories(data))
      .finally(() => setLoading(false));
  }, []);

  function onSaved(id, n1Tips) {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, n1Tips } : c))
    );
  }

  const withTips    = categories.filter((c) => c.n1Tips && JSON.parse(c.n1Tips).length > 0);
  const withoutTips = categories.filter((c) => !c.n1Tips || JSON.parse(c.n1Tips).length === 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <AppHeader />

      <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <Lightbulb size={22} />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Suporte N1</h1>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
              Configure as instruções exibidas ao usuário ao selecionar uma categoria, antes de preencher o chamado.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <div className="space-y-6">
            {withTips.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider px-1 flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  Com instruções ({withTips.length})
                </h2>
                <div className="space-y-2">
                  {withTips.map((cat) => (
                    <CategoryCard key={cat.id} cat={cat} onSaved={onSaved} />
                  ))}
                </div>
              </section>
            )}

            {withoutTips.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider px-1">
                  Sem instruções ({withoutTips.length})
                </h2>
                <div className="space-y-2">
                  {withoutTips.map((cat) => (
                    <CategoryCard key={cat.id} cat={cat} onSaved={onSaved} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function CategoryCard({ cat, onSaved }) {
  const initialTips = cat.n1Tips ? JSON.parse(cat.n1Tips) : [];
  const [open, setOpen]     = useState(false);
  const [tips, setTips]     = useState(initialTips);
  const [newTip, setNewTip] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [dirty, setDirty]   = useState(false);
  const [err, setErr]       = useState("");

  const Icon      = CAT_ICONS[cat.code] || HelpCircle;
  const iconColor = CAT_COLORS[cat.code] || CAT_COLORS.OTHER;
  const tipCount  = tips.length;

  function addTip() {
    const t = newTip.trim();
    if (!t) return;
    setTips((p) => [...p, t]);
    setNewTip("");
    setDirty(true);
    setSaved(false);
  }

  function removeTip(i) {
    setTips((p) => p.filter((_, idx) => idx !== i));
    setDirty(true);
    setSaved(false);
  }

  function move(i, dir) {
    const next = [...tips];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setTips(next);
    setDirty(true);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setErr("");
    try {
      const n1Tips = tips.length > 0 ? JSON.stringify(tips) : null;
      const { data } = await api.patch(`/categories/${cat.id}`, { n1Tips });
      onSaved(cat.id, data.n1Tips);
      setSaved(true);
      setDirty(false);
    } catch (e) {
      setErr(e.response?.data?.error || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`card overflow-hidden transition-shadow ${open ? "shadow-md dark:shadow-gray-900" : ""}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-gray-800/40 transition"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconColor}`}>
          <Icon size={17} />
        </span>

        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-800 dark:text-gray-100">{cat.name}</span>
          {tipCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={10} />
              {tipCount} instrução{tipCount !== 1 ? "ões" : ""}
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-gray-500">Sem instruções</span>
          )}
          {dirty && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">● Não salvo</span>
          )}
        </div>

        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 dark:text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-gray-700/60 px-5 py-4 space-y-4">
          <Alert message={err} />

          {tips.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-400 dark:text-gray-500 border border-dashed border-slate-200 dark:border-gray-700 rounded-xl">
              Nenhuma instrução ainda. Adicione abaixo.
            </div>
          ) : (
            <ol className="space-y-2">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 bg-slate-50 dark:bg-gray-800/50 rounded-xl px-4 py-3 group">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-slate-700 dark:text-gray-300 leading-relaxed">{tip}</span>
                  <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => move(i, -1)} disabled={i === 0}
                      className="flex h-6 w-6 items-center justify-center rounded text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 disabled:opacity-20 transition"
                      title="Mover para cima"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      onClick={() => move(i, 1)} disabled={i === tips.length - 1}
                      className="flex h-6 w-6 items-center justify-center rounded text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 disabled:opacity-20 transition"
                      title="Mover para baixo"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      onClick={() => removeTip(i)}
                      className="flex h-6 w-6 items-center justify-center rounded text-slate-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition"
                      title="Remover"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="flex gap-2">
            <input
              className="field-input flex-1 text-sm"
              placeholder="Nova instrução N1…"
              value={newTip}
              onChange={(e) => setNewTip(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTip()}
              maxLength={300}
            />
            <button
              onClick={addTip}
              disabled={!newTip.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-200 text-sm font-medium transition disabled:opacity-40 shrink-0"
            >
              <Plus size={15} />
              Adicionar
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-slate-400 dark:text-gray-500">
              {tips.length === 0
                ? "Sem instruções — nenhum card será exibido para esta categoria."
                : `${tips.length} instrução${tips.length !== 1 ? "ões" : ""} configurada${tips.length !== 1 ? "s" : ""}.`}
            </p>
            <button
              onClick={save}
              disabled={saving || !dirty}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                saved && !dirty
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  : dirty
                  ? "bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-gray-700 text-slate-400 dark:text-gray-500"
              } disabled:opacity-60`}
            >
              {saving ? (
                <Spinner className="h-4 w-4" />
              ) : saved && !dirty ? (
                <CheckCircle2 size={15} />
              ) : (
                <Save size={15} />
              )}
              {saved && !dirty ? "Salvo" : "Salvar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
