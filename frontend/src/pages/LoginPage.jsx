import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { maskCpf, isValidCpf } from "../lib/cpf";
import { Alert, Spinner } from "../components/ui";
import { LogIn, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!isValidCpf(cpf)) return setErr("CPF inválido. Verifique e tente novamente.");
    setLoading(true);
    try {
      await login(cpf, password);
      nav("/painel");
    } catch (ex) {
      setErr(ex.response?.data?.error || "Credenciais incorretas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white text-lg font-bold shadow-card-md mb-3">
            HD
          </span>
          <h1 className="text-xl font-bold text-slate-900">Acesso restrito</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor de plantão e técnicos</p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4">
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
          </div>

          <div>
            <label className="field-label">Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Alert message={err} />

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? <Spinner className="h-4 w-4" /> : <LogIn size={16} />}
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
          >
            <ArrowLeft size={14} />
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
