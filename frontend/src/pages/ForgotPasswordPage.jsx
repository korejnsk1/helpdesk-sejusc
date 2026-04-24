import { useState } from "react";
import { Link } from "react-router-dom";
import { maskCpf, isValidCpf } from "../lib/cpf";
import { useTheme } from "../context/ThemeContext";
import { ArrowLeft, Sun, Moon, KeyRound, ShieldAlert } from "lucide-react";

export default function ForgotPasswordPage() {
  const { dark, toggle } = useTheme();
  const [cpf, setCpf] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const cpfValid = isValidCpf(cpf);

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

        {!submitted ? (
          <div className="card p-6 space-y-4">
            <p className="text-sm text-slate-600 dark:text-gray-300">
              Informe seu CPF para identificarmos sua conta.
            </p>
            <div>
              <label className="field-label">CPF</label>
              <input
                inputMode="numeric"
                placeholder="000.000.000-00"
                className="field-input"
                value={cpf}
                onChange={(e) => setCpf(maskCpf(e.target.value))}
                autoFocus
              />
              {cpf.length >= 11 && !cpfValid && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">CPF inválido</p>
              )}
            </div>
            <button
              disabled={!cpfValid}
              onClick={() => setSubmitted(true)}
              className="btn-primary w-full"
            >
              <KeyRound size={16} />
              Continuar
            </button>
          </div>
        ) : (
          <div className="card p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                <ShieldAlert size={20} />
              </span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-gray-100 text-sm">Contate o administrador</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  Redefinição de senha manual
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-gray-300 leading-relaxed">
              A redefinição de senha é feita pelo administrador do sistema. Entre em contato com a GTI/SEJUSC informando seu CPF:
            </p>
            <div className="rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 px-4 py-3 text-center">
              <span className="font-mono font-semibold text-slate-800 dark:text-gray-100 tracking-widest">{cpf}</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-gray-500 leading-relaxed">
              O administrador gerará uma senha temporária que você deverá alterar no primeiro acesso.
            </p>
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
