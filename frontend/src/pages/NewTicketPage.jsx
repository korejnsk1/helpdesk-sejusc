import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Alert, Spinner } from "../components/ui";
import {
  ArrowLeft, ArrowRight, Monitor, Wifi, KeyRound, HelpCircle,
  CheckCircle2, MonitorSmartphone, Copy, Check as CheckIcon, ChevronDown, Printer,
} from "lucide-react";

const CATEGORY_ICONS = {
  HARDWARE: Monitor,
  NETWORK:  Wifi,
  ACCESS:   KeyRound,
  OTHER:    HelpCircle,
  REMOTE:   MonitorSmartphone,
  PRINTER:  Printer,
};

const CATEGORY_COLORS = {
  HARDWARE: "bg-orange-50  dark:bg-orange-900/30  text-orange-600  dark:text-orange-400  border-orange-200  dark:border-orange-700",
  NETWORK:  "bg-blue-50    dark:bg-blue-900/30    text-blue-600    dark:text-blue-400    border-blue-200    dark:border-blue-700",
  ACCESS:   "bg-violet-50  dark:bg-violet-900/30  text-violet-600  dark:text-violet-400  border-violet-200  dark:border-violet-700",
  OTHER:    "bg-slate-50   dark:bg-gray-800       text-slate-600   dark:text-gray-400    border-slate-200   dark:border-gray-700",
  REMOTE:   "bg-cyan-50    dark:bg-cyan-900/30    text-cyan-600    dark:text-cyan-400    border-cyan-200    dark:border-cyan-700",
  PRINTER:  "bg-green-50   dark:bg-green-900/30   text-green-600   dark:text-green-400   border-green-200   dark:border-green-700",
};

const STEPS = ["Tipo do problema", "Detalhes"];

export default function NewTicketPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    departmentId: "",
    categoryId: null,
    subcategoryId: null,
    freeTextDescription: "",
    anyDeskCode: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data));
    api.get("/departments").then((r) => {
      setDepartments(r.data);
      // Pré-preenche o setor do usuário logado
      if (user?.department?.id) {
        setForm((f) => ({ ...f, departmentId: String(user.department.id) }));
      }
    });
  }, [user]);

  const selectedCategory = categories.find((c) => c.id === form.categoryId);
  const isRemote = selectedCategory?.code === "REMOTE";

  async function submit() {
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        departmentId: Number(form.departmentId) || null,
        categoryId: form.categoryId,
        subcategoryId: selectedCategory?.allowsFreeText || isRemote ? null : form.subcategoryId,
        freeTextDescription: selectedCategory?.allowsFreeText && !isRemote ? form.freeTextDescription : null,
        anyDeskCode: isRemote ? form.anyDeskCode.trim() : null,
      };
      const { data } = await api.post("/tickets", payload);
      setCreatedTicket({ ticketNumber: data.ticketNumber, isRemote });
    } catch (e) {
      setError(e.response?.data?.error || "Falha ao abrir chamado");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Tela de sucesso ──────────────────────────────────────────────────────
  if (createdTicket) {
    if (createdTicket.isRemote) {
      return <RemoteSuccessScreen ticketNumber={createdTicket.ticketNumber} />;
    }
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-sm w-full space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 mx-auto">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Chamado aberto!</h2>
            <p className="font-mono text-sm text-brand-600 dark:text-brand-400 mt-1">{createdTicket.ticketNumber}</p>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-2">
              Guarde o protocolo para acompanhar o andamento.
            </p>
          </div>
          <Link
            to={`/acompanhar/${createdTicket.ticketNumber}`}
            className="btn-primary w-full justify-center"
          >
            Acompanhar chamado
          </Link>
          <Link to="/" className="block text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 px-4 h-14 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition">
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <div className="h-4 w-px bg-slate-200 dark:bg-gray-700" />
        <h1 className="text-sm font-semibold text-slate-800 dark:text-gray-100">Abrir chamado</h1>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-2xl w-full mx-auto">

        {/* Identidade do solicitante */}
        <div className="mb-5 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 dark:text-gray-400">Chamado aberto por</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-gray-100 truncate">{user?.name}</p>
          </div>
          <div className="sm:w-56">
            <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Setor solicitante</label>
            {departments.length === 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-gray-500">
                <Spinner className="h-3.5 w-3.5" /> Carregando...
              </div>
            ) : (
              <div className="relative">
                <select
                  className="field-input text-sm pr-8 appearance-none"
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            )}
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((label, idx) => {
            const n = idx + 1;
            const done = n < step;
            const active = n === step;
            return (
              <div key={n} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition ${
                    done  ? "bg-brand-600 text-white"
                    : active ? "bg-brand-600 text-white ring-4 ring-brand-600/20"
                    : "bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-400"
                  }`}>
                    {done ? <CheckCircle2 size={14} /> : n}
                  </div>
                  <span className={`text-xs hidden sm:inline ${active ? "font-semibold text-slate-800 dark:text-gray-100" : "text-slate-400 dark:text-gray-600"}`}>
                    {label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-px ${n < step ? "bg-brand-600" : "bg-slate-200 dark:bg-gray-700"}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="card p-6">

          {/* ── STEP 1: Tipo do problema ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-gray-100">Tipo do problema</h2>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">Selecione a categoria que melhor descreve</p>
              </div>

              <div className="space-y-2">
                {categories.filter((c) => c.code !== "REMOTE").map((c) => {
                  const Icon = CATEGORY_ICONS[c.code] || HelpCircle;
                  const colorClass = CATEGORY_COLORS[c.code] || CATEGORY_COLORS.OTHER;
                  const selected = form.categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setForm({ ...form, categoryId: c.id, subcategoryId: null, anyDeskCode: "" })}
                      className={`w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition duration-150 ${
                        selected
                          ? "border-brand-500 dark:border-brand-400 bg-brand-50 dark:bg-brand-900/25 ring-2 ring-brand-500/20"
                          : "border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/40 hover:bg-slate-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${colorClass}`}>
                        <Icon size={21} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-sm ${selected ? "text-brand-700 dark:text-brand-300" : "text-slate-800 dark:text-gray-100"}`}>
                          {c.name}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                          {c.allowsFreeText ? "Descreva livremente" : `${c.subcategories?.length || 0} opções disponíveis`}
                        </div>
                      </div>
                      <div className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition ${
                        selected ? "border-brand-500 bg-brand-500" : "border-slate-300 dark:border-gray-600"
                      }`}>
                        {selected && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}

                {categories.some((c) => c.code === "REMOTE") && (
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-slate-200 dark:bg-gray-700" />
                    <span className="text-xs text-slate-400 dark:text-gray-500 shrink-0">ou</span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-gray-700" />
                  </div>
                )}

                {categories.filter((c) => c.code === "REMOTE").map((c) => {
                  const selected = form.categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setForm({ ...form, categoryId: c.id, subcategoryId: null, anyDeskCode: "" })}
                      className={`w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition duration-150 ${
                        selected
                          ? "border-cyan-500 bg-cyan-950/20 dark:bg-cyan-900/20 ring-2 ring-cyan-500/20"
                          : "border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/50 dark:bg-cyan-950/20 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-900/30"
                      }`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-700">
                        <MonitorSmartphone size={21} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-sm ${selected ? "text-cyan-700 dark:text-cyan-300" : "text-slate-800 dark:text-gray-100"}`}>
                          {c.name}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                          O técnico se conecta ao seu computador via AnyDesk
                        </div>
                      </div>
                      <div className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition ${
                        selected ? "border-cyan-500 bg-cyan-500" : "border-slate-300 dark:border-gray-600"
                      }`}>
                        {selected && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                disabled={!form.categoryId || !form.departmentId}
                onClick={() => setStep(2)}
                className="btn-primary w-full py-3"
              >
                {!form.departmentId ? "Selecione o setor antes de continuar" : "Continuar"} <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ── STEP 2: Detalhes ── */}
          {step === 2 && selectedCategory && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-gray-100">{selectedCategory.name}</h2>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
                  {isRemote
                    ? "Informe seu código AnyDesk para o técnico se conectar"
                    : selectedCategory.allowsFreeText
                    ? "Descreva o problema com detalhes"
                    : "Selecione a opção que mais se encaixa"}
                </p>
              </div>

              {isRemote && (
                <AnyDeskStep
                  value={form.anyDeskCode}
                  onChange={(v) => setForm({ ...form, anyDeskCode: v })}
                />
              )}

              {!isRemote && selectedCategory.allowsFreeText && (
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
                  <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">
                    {form.freeTextDescription.length} / mínimo 5 caracteres
                  </p>
                </div>
              )}

              {!isRemote && !selectedCategory.allowsFreeText && (
                <div className="space-y-2">
                  {selectedCategory.subcategories.map((s) => {
                    const selected = form.subcategoryId === s.id;
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 rounded-xl border cursor-pointer p-3.5 transition ${
                          selected
                            ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 ring-1 ring-brand-500/30"
                            : "border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        <div className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition ${
                          selected ? "border-brand-600 bg-brand-600" : "border-slate-300 dark:border-gray-600"
                        }`}>
                          {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <input type="radio" name="sub" className="sr-only" checked={selected}
                          onChange={() => setForm({ ...form, subcategoryId: s.id })} />
                        <span className="text-sm text-slate-700 dark:text-gray-200">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              <Alert message={error} />

              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">
                  <ArrowLeft size={16} /> Voltar
                </button>
                <button
                  disabled={
                    submitting ||
                    (isRemote
                      ? form.anyDeskCode.trim().length < 3
                      : selectedCategory.allowsFreeText
                      ? form.freeTextDescription.trim().length < 5
                      : !form.subcategoryId)
                  }
                  onClick={submit}
                  className="btn-primary flex-1"
                >
                  {submitting
                    ? <><Spinner className="h-4 w-4" /> Enviando...</>
                    : <>Abrir chamado <CheckCircle2 size={16} /></>}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function AnyDeskStep({ value, onChange }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-700 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-cyan-800 dark:text-cyan-300">
          <MonitorSmartphone size={16} />
          Como encontrar seu código AnyDesk
        </div>
        <ol className="text-xs text-cyan-700 dark:text-cyan-400 space-y-1 pl-1">
          <li>1. Abra o aplicativo <strong>AnyDesk</strong> no seu computador</li>
          <li>2. O código aparece no campo <strong>"Esta estação de trabalho"</strong></li>
          <li>3. Copie e cole o número abaixo</li>
        </ol>
      </div>
      <div>
        <label className="field-label">Seu código AnyDesk</label>
        <input
          className="field-input text-center text-lg font-mono tracking-widest"
          placeholder="Ex: 123 456 789"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d\s]/g, ""))}
          autoFocus
          maxLength={20}
          inputMode="numeric"
        />
        <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">
          Apenas números, como exibido no AnyDesk
        </p>
      </div>
      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <span className="text-base shrink-0 mt-0.5">⚠️</span>
        <span>Ao abrir este chamado, deixe o AnyDesk aberto e aceite a solicitação de conexão assim que o técnico entrar em contato.</span>
      </div>
    </div>
  );
}

function RemoteSuccessScreen({ ticketNumber }) {
  const [copied, setCopied] = useState(false);
  function copyProtocol() {
    navigator.clipboard.writeText(ticketNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8 space-y-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 mx-auto">
          <MonitorSmartphone size={32} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-gray-100">Chamado aberto!</h2>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Atendimento remoto via AnyDesk</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 px-4 py-3">
          <div className="text-xs text-slate-500 dark:text-gray-400 mb-1">Protocolo</div>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono font-bold text-slate-800 dark:text-gray-100 text-lg">{ticketNumber}</span>
            <button
              onClick={copyProtocol}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition"
            >
              {copied ? <CheckIcon size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4 text-left space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300 text-sm">
            <span className="text-lg">🔔</span>
            Fique de olho no AnyDesk!
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            O técnico vai enviar uma solicitação de conexão em breve. Mantenha o AnyDesk <strong>aberto</strong> e clique em{" "}
            <strong className="text-amber-800 dark:text-amber-300">Aceitar</strong> quando a notificação aparecer.
          </p>
        </div>
        <p className="text-xs text-slate-400 dark:text-gray-500">
          🔒 Apenas aceite conexões de técnicos da GTI/SEJUSC que você conheça.
        </p>
        <div className="flex flex-col gap-2">
          <Link to={`/acompanhar/${ticketNumber}`} className="btn-primary w-full justify-center">
            Acompanhar chamado
          </Link>
          <Link to="/" className="text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
