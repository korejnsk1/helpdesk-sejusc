import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { maskCpf, isValidCpf, stripCpf } from "../lib/cpf";
import { Alert, Spinner } from "../components/ui";
import { useTheme } from "../context/ThemeContext";
import { UserPlus, ArrowLeft, CheckCircle2, Sun, Moon, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const nav = useNavigate();
  const { dark, toggle } = useTheme();
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(true);
  const [form, setForm] = useState({ name: "", cpf: "", departmentId: "", password: "", confirmPassword: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get("/departments")
      .then((r) => setDepartments(r.data))
      .catch(() => setDepartments([]))
      .finally(() => setDeptLoading(false));
  }, []);

  const cpfValid = isValidCpf(form.cpf);
  const passMatch = form.password === form.confirmPassword;
  const canSubmit =
    form.name.trim().length >= 3 &&
    cpfValid &&
    form.departmentId &&
    form.password.length >= 6 &&
    passMatch;

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await api.post("/auth/register", {
        name: form.name.trim(),
        cpf: stripCpf(form.cpf),
        departmentId: Number(form.departmentId),
        password: form.password,
      });
      setSuccess(true);
    } catch (ex) {
      setErr(ex.response?.data?.error || "Falha no cadastro");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
        <div className="card p-8 text-center max-w-sm w-full space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 mx-auto">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Conta criada!</h2>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
              Seu acesso está pronto. Faça login para continuar.
            </p>
          </div>
          <button onClick={() => nav("/login")} className="btn-primary w-full justify-center">
            Fazer login
          </button>
        </div>
      </div>
    );
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100">Criar conta</h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            HelpDesk SEJUSC
          </p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4">
          <div>
            <label className="field-label">Nome completo</label>
            <input
              className="field-input"
              placeholder="Seu nome completo"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>

          <div>
            <label className="field-label">CPF</label>
            <input
              inputMode="numeric"
              placeholder="000.000.000-00"
              className="field-input"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })}
            />
            {form.cpf.length >= 11 && !cpfValid && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">CPF inválido</p>
            )}
          </div>

          <div>
            <label className="field-label">Setor / Departamento</label>
            {deptLoading ? (
              <div className="field-input flex items-center gap-2 text-slate-400 dark:text-gray-500">
                <Spinner className="h-4 w-4" /> Carregando setores...
              </div>
            ) : (
              <select
                className="field-input"
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              >
                <option value="">Selecione seu setor...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="field-label">Senha</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                className="field-input pr-10"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="field-label">Confirmar senha</label>
            <input
              type="password"
              placeholder="Repita a senha"
              className="field-input"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            />
            {form.confirmPassword && !passMatch && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">As senhas não coincidem</p>
            )}
          </div>

          <Alert message={err} />

          <button type="submit" disabled={!canSubmit || loading} className="btn-primary w-full py-2.5">
            {loading ? <Spinner className="h-4 w-4" /> : <UserPlus size={16} />}
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <div className="mt-5 text-center space-y-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition"
          >
            <ArrowLeft size={14} />
            Já tenho conta — fazer login
          </Link>
        </div>
      </div>
    </div>
  );
}
