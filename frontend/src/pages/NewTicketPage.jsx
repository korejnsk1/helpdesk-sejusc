import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { maskCpf, isValidCpf, stripCpf } from "../lib/cpf";

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

  function canContinueStep1() {
    return (
      form.requesterName.trim().length >= 3 &&
      form.department.trim().length >= 2 &&
      isValidCpf(form.requesterCpf)
    );
  }

  async function submit() {
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        requesterName: form.requesterName.trim(),
        department: form.department.trim(),
        requesterCpf: stripCpf(form.requesterCpf),
        categoryId: form.categoryId,
        subcategoryId: selectedCategory?.allowsFreeText ? null : form.subcategoryId,
        freeTextDescription: selectedCategory?.allowsFreeText
          ? form.freeTextDescription
          : null,
      };
      const { data } = await api.post("/tickets", payload);
      nav(`/acompanhar/${data.ticketNumber}`);
    } catch (e) {
      setError(e.response?.data?.error || "Falha ao abrir chamado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link to="/" className="text-sm text-slate-500 hover:underline">← Voltar</Link>
        <h1 className="text-xl font-semibold text-slate-800">Abrir chamado</h1>
        <span />
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        {step === 1 && (
          <>
            <h2 className="font-semibold">Seus dados</h2>
            <div>
              <label className="text-sm text-slate-600">Nome completo</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.requesterName}
                onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Departamento / Setor</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">CPF</label>
              <input
                inputMode="numeric"
                placeholder="000.000.000-00"
                className="w-full border rounded-lg px-3 py-2"
                value={form.requesterCpf}
                onChange={(e) => setForm({ ...form, requesterCpf: maskCpf(e.target.value) })}
              />
              {form.requesterCpf && !isValidCpf(form.requesterCpf) && (
                <p className="text-xs text-red-600 mt-1">CPF inválido</p>
              )}
            </div>
            <button
              disabled={!canContinueStep1()}
              onClick={() => setStep(2)}
              className="w-full bg-brand-600 disabled:bg-slate-300 text-white rounded-lg py-3 font-medium"
            >
              Continuar
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-semibold">Qual o tipo do problema?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setForm({ ...form, categoryId: c.id, subcategoryId: null })}
                  className={`p-6 rounded-xl border-2 text-left transition ${
                    form.categoryId === c.id
                      ? "border-brand-600 bg-brand-50"
                      : "border-slate-200 hover:border-brand-500"
                  }`}
                >
                  <div className="text-lg font-semibold text-slate-800">{c.name}</div>
                  {c.allowsFreeText && (
                    <div className="text-xs text-slate-500 mt-1">Descreva livremente</div>
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 border rounded-lg py-3">
                Voltar
              </button>
              <button
                disabled={!form.categoryId}
                onClick={() => setStep(3)}
                className="flex-1 bg-brand-600 disabled:bg-slate-300 text-white rounded-lg py-3 font-medium"
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 3 && selectedCategory && (
          <>
            <h2 className="font-semibold">{selectedCategory.name}</h2>
            {selectedCategory.allowsFreeText ? (
              <div>
                <label className="text-sm text-slate-600">Descreva o problema</label>
                <textarea
                  rows={6}
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.freeTextDescription}
                  onChange={(e) =>
                    setForm({ ...form, freeTextDescription: e.target.value })
                  }
                />
              </div>
            ) : (
              <div className="space-y-2">
                {selectedCategory.subcategories.map((s) => (
                  <label
                    key={s.id}
                    className={`block p-3 rounded-lg border cursor-pointer ${
                      form.subcategoryId === s.id
                        ? "border-brand-600 bg-brand-50"
                        : "border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="sub"
                      className="mr-2"
                      checked={form.subcategoryId === s.id}
                      onChange={() => setForm({ ...form, subcategoryId: s.id })}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="flex-1 border rounded-lg py-3">
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
                className="flex-1 bg-brand-600 disabled:bg-slate-300 text-white rounded-lg py-3 font-medium"
              >
                {submitting ? "Enviando..." : "Abrir chamado"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
