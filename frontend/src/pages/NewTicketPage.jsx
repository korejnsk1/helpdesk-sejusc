import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { maskCpf, isValidCpf, stripCpf } from "../lib/cpf";
import { Alert, Spinner } from "../components/ui";
import { ArrowLeft, ArrowRight, Monitor, Wifi, KeyRound, HelpCircle, CheckCircle2 } from "lucide-react";

const CATEGORY_ICONS = {
  HARDWARE: Monitor,
  NETWORK:  Wifi,
  ACCESS:   KeyRound,
  OTHER:    HelpCircle,
};

const CATEGORY_COLORS = {
  HARDWARE: "bg-orange-50 text-orange-600 border-orange-200",
  NETWORK:  "bg-blue-50  text-blue-600  border-blue-200",
  ACCESS:   "bg-violet-50 text-violet-600 border-violet-200",
  OTHER:    "bg-slate-50 text-slate-600 border-slate-200",
};

const STEPS = ["Seus dados", "Tipo do problema", "Detalhes"];

export default function NewTicketPage() {
  const nav = useNavigate();
  const [categories, setCategories] = useState([]);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    requesterName: "",
    department: "",
    requesterCpf: "",
    categoryId: null,
    subcategoryId: null,
    freeTextDescription: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data));
  }, []);

  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  const canStep1 =
    form.requesterName.trim().length >= 3 &&
    form.department.trim().length >= 2 &&
    isValidCpf(form.requesterCpf);

  async function submit() {
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/tickets", {
        requesterName: form.requesterName.trim(),
        department: form.department.trim(),
        requesterCpf: stripCpf(form.requesterCpf),
        categoryId: form.categoryId,
        subcategoryId: selectedCategory?.allowsFreeText ? null : form.subcategoryId,
        freeTextDescription: selectedCategory?.allowsFreeText ? form.freeTextDescription : null,
      });
      nav(`/acompanhar/${data.ticketNumber}`);
    } catch (e) {
      setError(e.response?.data?.error || "Falha ao abrir chamado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 h-14 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition">
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <div className="h-4 w-px bg-slate-200" />
        <h1 className="text-sm font-semibold text-slate-800">Abrir chamado</h1>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-2xl w-full mx-auto">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((label, idx) => {
            const n = idx + 1;
            const done = n < step;
            const active = n === step;
            return (
              <div key={n} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition ${
                      done
                        ? "bg-brand-600 text-white"
                        : active
                        ? "bg-brand-600 text-white ring-4 ring-brand-600/20"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {done ? <CheckCircle2 size={14} /> : n}
                  </div>
                  <span className={`text-xs hidden sm:inline ${active ? "font-semibold text-slate-800" : "text-slate-400"}`}>
                    {label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-px ${n < step ? "bg-brand-600" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="card p-6">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Seus dados</h2>
                <p className="text-sm text-slate-500 mt-0.5">Preencha para identificar o chamado</p>
              </div>

              <div>
                <label className="field-label">Nome completo</label>
                <input
                  className="field-input"
                  placeholder="Seu nome completo"
                  value={form.requesterName}
                  onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
                  autoFocus
                />
              </div>

              <div>
                <label className="field-label">Departamento / Setor</label>
                <input
                  className="field-input"
                  placeholder="Ex.: Recursos Humanos"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </div>

              <div>
                <label className="field-label">CPF</label>
                <input
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  className="field-input"
                  value={form.requesterCpf}
                  onChange={(e) => setForm({ ...form, requesterCpf: maskCpf(e.target.value) })}
                />
                {form.requesterCpf.length >= 11 && !isValidCpf(form.requesterCpf) && (
                  <p className="mt-1 text-xs text-red-600">CPF inválido</p>
                )}
              </div>

              <button
                disabled={!canStep1}
                onClick={() => setStep(2)}
                className="btn-primary w-full py-3"
              >
                Continuar
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Tipo do problema</h2>
                <p className="text-sm text-slate-500 mt-0.5">Selecione a categoria que melhor descreve</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((c) => {
                  const Icon = CATEGORY_ICONS[c.code] || HelpCircle;
                  const colorClass = CATEGORY_COLORS[c.code] || CATEGORY_COLORS.OTHER;
                  const selected = form.categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setForm({ ...form, categoryId: c.id, subcategoryId: null })}
                      className={`group flex items-start gap-3 rounded-xl border-2 p-4 text-left transition duration-150 ${
                        selected
                          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${colorClass}`}>
                        <Icon size={20} />
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-800">{c.name}</div>
                        {c.allowsFreeText && (
                          <div className="text-xs text-slate-400 mt-0.5">Descreva livremente</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">
                  <ArrowLeft size={16} />
                  Voltar
                </button>
                <button
                  disabled={!form.categoryId}
                  onClick={() => setStep(3)}
                  className="btn-primary flex-1"
                >
                  Continuar
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && selectedCategory && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{selectedCategory.name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {selectedCategory.allowsFreeText
                    ? "Descreva o problema com detalhes"
                    : "Selecione a opção que mais se encaixa"}
                </p>
              </div>

              {selectedCategory.allowsFreeText ? (
                <div>
                  <label className="field-label">Descrição do problema</label>
                  <textarea
                    rows={5}
                    className="field-input resize-none"
                    placeholder="Descreva o problema com o máximo de detalhes possível..."
                    value={form.freeTextDescription}
                    onChange={(e) => setForm({ ...form, freeTextDescription: e.target.value })}
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {form.freeTextDescription.length} / mínimo 5 caracteres
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedCategory.subcategories.map((s) => {
                    const selected = form.subcategoryId === s.id;
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 rounded-xl border cursor-pointer p-3.5 transition ${
                          selected
                            ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500/30"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition ${
                            selected ? "border-brand-600 bg-brand-600" : "border-slate-300"
                          }`}
                        >
                          {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <input
                          type="radio"
                          name="sub"
                          className="sr-only"
                          checked={selected}
                          onChange={() => setForm({ ...form, subcategoryId: s.id })}
                        />
                        <span className="text-sm text-slate-700">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              <Alert message={error} />

              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">
                  <ArrowLeft size={16} />
                  Voltar
                </button>
                <button
                  disabled={
                    submitting ||
                    (selectedCategory.allowsFreeText
                      ? form.freeTextDescription.trim().length < 5
                      : !form.subcategoryId)
                  }
                  onClick={submit}
                  className="btn-primary flex-1"
                >
                  {submitting ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Abrir chamado
                      <CheckCircle2 size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
