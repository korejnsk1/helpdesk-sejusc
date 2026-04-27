import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { maskCpf, isValidCpf, stripCpf } from "../lib/cpf";
import { useTheme } from "../context/ThemeContext";
import { Alert, Spinner } from "../components/ui";
import { ArrowLeft, Sun, Moon, KeyRound, CheckCircle2, Phone } from "lucide-react";

function maskPhone(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2)  return d;
  if (d.length <= 6)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

export default function ForgotPasswordPage() {
  const { dark, toggle } = useTheme();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ cpf: "", name: "", phone: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const cpfValid = isValidCpf(form.cpf);
  const phoneDigits = form.phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length >= 10 && phoneDigits.length <= 11;
  const canSubmit = cpfValid && form.name.trim().length >= 3 && phoneValid;

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", {
        cpf: stripCpf(form.cpf),
        name: form.name.trim(),
        phone: phoneDigits,
      });
      setStep(2);
    } catch (ex) {
      setErr(ex.response?.data?.error || "Não foi possível enviar a solicitação");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      <button
        onClick={toggle}
        title={dark ? "Modo claro" : "Modo escuro"}
        className="fixed top-4 right-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-100 shadow-sm transition"
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white text-lg font-bold shadow-card-md mb-3">
            HD
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100">Esqueci minha senha</h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">HelpDesk SEJUSC</p>
        </div>

        {step === 1 ? (
          <form onSubmit={submit} className="card p-6 space-y-4">
            <p className="text-sm text-slate-600 dark:text-gray-300">
              Preencha os dados abaixo. O suporte entrará em contato pelo telefone informado com a nova senha.
            </p>

            <div>
              <label className="field-label">CPF</label>
              <input
                inputMode="numeric"
                placeholder="000.000.000-00"
                className="field-input"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })}
                autoFocus
              />
              {form.cpf.length >= 11 && !cpfValid && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">CPF inválido</p>
              )}
            </div>

            <div>
              <label className="field-label">Nome completo</label>
              <input
                className="field-input"
                placeholder="Exatamente como no cadastro"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label className="field-label">Telefone para contato</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                <input
                  inputMode="numeric"
                  placeholder="(92) 99999-9999"
                  className="field-input pl-9"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                />
              </div>
            </div>

            <Alert message={err} />

            <button type="submit" disabled={!canSubmit || loading} className="btn-primary w-full">
              {loading ? <Spinner className="h-4 w-4" /> : <KeyRound size={16} />}
              {loading ? "Enviando..." : "Solicitar redefinição"}
            </button>
          </form>
        ) : (
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={20} />
              </span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-gray-100 text-sm">Solicitação enviada!</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">O suporte foi notificado</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-gray-300">
              Sua solicitação foi registrada. Em breve a equipe de suporte entrará em contato pelo número <span className="font-semibold">{form.phone}</span> com as instruções para acessar sua conta.
            </p>

            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2">
              Aguarde o contato do suporte. Não compartilhe sua senha com ninguém.
            </p>

            <Link to="/login" className="btn-primary w-full justify-center">
              Voltar ao login
            </Link>
          </div>
        )}

        <div className="mt-5 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition"
          >
            <ArrowLeft size={14} />
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
