import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Spinner, Alert } from "../components/ui";
import { KeyRound, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function ChangePasswordPage() {
  const { user, refreshUser } = useAuth();
  const nav = useNavigate();
  const isForced = user?.mustChangePassword;

  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const passMatch = form.newPassword === form.confirmPassword;
  const canSubmit =
    (isForced || form.currentPassword.length >= 6) &&
    form.newPassword.length >= 6 &&
    passMatch;

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: isForced ? undefined : form.currentPassword,
        newPassword: form.newPassword,
      });
      await refreshUser();
      nav(isForced ? "/painel" : "/perfil");
    } catch (ex) {
      setErr(ex.response?.data?.error || "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-card-md mb-3">
            <KeyRound size={26} />
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100">
            {isForced ? "Defina sua nova senha" : "Alterar senha"}
          </h1>
          {isForced && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1 text-center">
              Por segurança, você precisa criar uma nova senha antes de continuar.
            </p>
          )}
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4">
          {!isForced && (
            <div>
              <label className="field-label">Senha atual</label>
              <input
                type="password"
                placeholder="Sua senha atual"
                className="field-input"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="field-label">Nova senha</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                className="field-input pr-10"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                autoFocus={isForced}
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
            <label className="field-label">Confirmar nova senha</label>
            <input
              type="password"
              placeholder="Repita a nova senha"
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
            {loading ? <Spinner className="h-4 w-4" /> : <ShieldCheck size={16} />}
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
