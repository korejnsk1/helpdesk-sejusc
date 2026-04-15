import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { maskCpf, isValidCpf } from "../lib/cpf";

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
    if (!isValidCpf(cpf)) return setErr("CPF inválido");
    setLoading(true);
    try {
      await login(cpf, password);
      nav("/painel");
    } catch (ex) {
      setErr(ex.response?.data?.error || "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="bg-white rounded-xl shadow p-6 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold text-slate-800">Acesso técnico</h1>
        <div>
          <label className="text-sm text-slate-600">CPF</label>
          <input
            inputMode="numeric"
            placeholder="000.000.000-00"
            className="w-full border rounded-lg px-3 py-2"
            value={cpf}
            onChange={(e) => setCpf(maskCpf(e.target.value))}
          />
        </div>
        <div>
          <label className="text-sm text-slate-600">Senha</label>
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button
          disabled={loading}
          className="w-full bg-brand-600 disabled:bg-slate-300 text-white rounded-lg py-2 font-medium"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <Link to="/" className="block text-center text-sm text-slate-500 hover:underline">
          Voltar
        </Link>
      </form>
    </div>
  );
}
