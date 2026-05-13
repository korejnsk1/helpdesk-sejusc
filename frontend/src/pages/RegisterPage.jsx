import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye, EyeOff, Sun, Moon, CheckCircle2, ChevronDown,
  AlertTriangle, User, Hash, Briefcase, Mail, Phone, Shield, ArrowLeft,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { maskCpf, stripCpf, isValidCpf } from "../lib/cpf";
import { api } from "../lib/api";

const PREFIXOS = [
  { value: "GOVERNO",      label: "Servidor do Governo" },
  { value: "TERCEIRIZADO", label: "Terceirizado" },
  { value: "ESTAGIARIO",   label: "Estagiário" },
];

// ── Setor com busca ──────────────────────────────────────────────────────────
function DeptSelect({ value, onChange, departments }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const ref               = useRef(null);

  const filtered = departments.filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase())
  );
  const selected = departments.find((d) => d.id === value);

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="field-input w-full flex items-center justify-between text-left"
      >
        <span className={selected ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"}>
          {selected ? selected.name : "Selecione seu setor..."}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <input
              autoFocus
              type="text"
              placeholder="Filtrar setor..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-400">Nenhum setor encontrado</li>
            )}
            {filtered.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => { onChange(d.id); setOpen(false); setQuery(""); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                    ${value === d.id
                      ? "bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-medium"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                >
                  {d.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { theme, toggle } = useTheme();
  const navigate           = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [done, setDone]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const [err, setErr]                 = useState("");

  const [name,         setName]         = useState("");
  const [cpf,          setCpf]          = useState("");
  const [matricula,    setMatricula]    = useState("");
  const [prefixo,      setPrefixo]      = useState("");
  const [departmentId, setDepartmentId] = useState(null);
  const [email,        setEmail]        = useState("");
  const [telefone,     setTelefone]     = useState("");
  const [password,     setPassword]     = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [showPwd,      setShowPwd]      = useState(false);
  const [showConf,     setShowConf]     = useState(false);
  const [isChefe,      setIsChefe]      = useState(false);

  useEffect(() => {
    api.get("/departments").then(({ data }) => setDepartments(data)).catch(() => {});
  }, []);

  const cpfClean  = stripCpf(cpf);
  const cpfValid  = cpf.length > 0 && isValidCpf(cpfClean);
  const pwdMatch  = password === confirm;
  const canSubmit = (
    name.trim().length >= 3 &&
    cpfValid &&
    !!prefixo &&
    !!departmentId &&
    password.length >= 6 &&
    pwdMatch
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setErr("");
    try {
      await api.post("/auth/register", {
        name:         name.trim(),
        cpf:          cpfClean,
        matricula:    matricula.trim() || null,
        prefixo,
        departmentId,
        email:        email.trim() || null,
        telefone:     telefone.replace(/\D/g, "") || null,
        isChefe,
        password,
      });
      setDone(true);
    } catch (ex) {
      setErr(ex.response?.data?.error || "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // ── Tela de sucesso ──────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950 px-4">
        <div className="card max-w-md w-full p-8 text-center space-y-4">
          <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Conta criada!</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Sua conta foi criada com sucesso. Você já pode fazer login.
          </p>
          <button onClick={() => navigate("/login")} className="btn-primary w-full">
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  // ── Formulário ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-start justify-center py-10 px-4">
      {/* Toggle tema */}
      <button
        onClick={toggle}
        className="fixed top-4 right-4 p-2 rounded-full bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:scale-110 transition-transform"
        aria-label="Alternar tema"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="w-full max-w-lg">
        {/* Botão voltar */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <img src="/logo-gov.svg" alt="Logo" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Criar conta</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Preencha os dados abaixo para criar sua conta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-5">

          {err && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {err}
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="field-label flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Nome completo <span className="text-red-500">*</span>
            </label>
            <input
              className="field-input w-full"
              type="text"
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* CPF */}
          <div>
            <label className="field-label flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" /> CPF <span className="text-red-500">*</span>
            </label>
            <input
              className={`field-input w-full ${cpf && !cpfValid ? "border-red-400 dark:border-red-600" : ""}`}
              type="text"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
              maxLength={14}
              required
            />
            {cpf && !cpfValid && (
              <p className="text-xs text-red-500 mt-1">CPF inválido</p>
            )}
          </div>

          {/* Matrícula */}
          <div>
            <label className="field-label flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" /> Matrícula{" "}
              <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
            </label>
            <input
              className="field-input w-full"
              type="text"
              placeholder="Número de matrícula funcional"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
            />
          </div>

          {/* Vínculo funcional */}
          <div>
            <label className="field-label flex items-center gap-1.5 mb-2">
              <Briefcase className="h-3.5 w-3.5" /> Vínculo funcional <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {PREFIXOS.map((p) => (
                <label
                  key={p.value}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all select-none text-sm font-medium
                    ${prefixo === p.value
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-brand-300 dark:hover:border-brand-700"
                    }`}
                >
                  <input
                    type="radio"
                    name="prefixo"
                    value={p.value}
                    checked={prefixo === p.value}
                    onChange={() => { setPrefixo(p.value); if (p.value !== "GOVERNO") setIsChefe(false); }}
                    className="sr-only"
                  />
                  <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0
                    ${prefixo === p.value ? "border-brand-500" : "border-gray-300 dark:border-gray-600"}`}>
                    {prefixo === p.value && (
                      <span className="h-2 w-2 rounded-full bg-brand-500 block" />
                    )}
                  </span>
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          {/* Setor */}
          <div>
            <label className="field-label mb-1.5">
              Setor <span className="text-red-500">*</span>
            </label>
            <DeptSelect
              value={departmentId}
              onChange={setDepartmentId}
              departments={departments}
            />
          </div>

          {/* E-mail */}
          <div>
            <label className="field-label flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> E-mail{" "}
              <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
            </label>
            <input
              className="field-input w-full"
              type="email"
              placeholder="seu@email.gov.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="field-label flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Telefone para contato{" "}
              <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
            </label>
            <input
              className="field-input w-full"
              type="tel"
              placeholder="(92) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>

          {/* Chefe de Setor — visível apenas para Servidor do Governo */}
          {prefixo === "GOVERNO" && <div>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <div className="mt-0.5 shrink-0">
                <div
                  onClick={() => setIsChefe((v) => !v)}
                  className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer
                    ${isChefe
                      ? "border-amber-500 bg-amber-500"
                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    }`}
                >
                  {isChefe && (
                    <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <span
                  onClick={() => setIsChefe((v) => !v)}
                  className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5"
                >
                  <Shield className="h-4 w-4 text-amber-500" />
                  Sou Chefe de Setor
                </span>
                {isChefe && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 flex items-start gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    Esta informação está sujeita a verificação e validação. Declarações incorretas podem causar problemas no seu acesso ao sistema.
                  </p>
                )}
              </div>
            </label>
          </div>}

          {/* Senha */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Senha de acesso
            </p>

            <div>
              <label className="field-label">Senha <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  className="field-input w-full pr-10"
                  type={showPwd ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="field-label">Confirmar senha <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  className={`field-input w-full pr-10 ${confirm && !pwdMatch ? "border-red-400 dark:border-red-600" : ""}`}
                  type={showConf ? "text" : "password"}
                  placeholder="Repita a senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConf((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirm && !pwdMatch && (
                <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            )}
            {loading ? "Criando conta..." : "Criar conta"}
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Já tem conta?{" "}
            <Link to="/login" className="text-brand-600 hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
