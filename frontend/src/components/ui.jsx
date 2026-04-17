import { Loader2 } from "lucide-react";

// ── Spinner ────────────────────────────────────────────────────────────────
export function Spinner({ className = "h-5 w-5" }) {
  return <Loader2 className={`animate-spin text-brand-600 ${className}`} />;
}

// ── Badge de status ────────────────────────────────────────────────────────
const BADGE_STYLES = {
  OPEN:       "bg-slate-100  text-slate-600  ring-slate-200",
  VIEWED:     "bg-blue-50    text-blue-700   ring-blue-200",
  EN_ROUTE:   "bg-amber-50   text-amber-700  ring-amber-200",
  IN_SERVICE: "bg-violet-50  text-violet-700 ring-violet-200",
  COMPLETED:  "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export const STATUS_LABEL = {
  OPEN:       "Aberto",
  VIEWED:     "Visualizado",
  EN_ROUTE:   "Técnico a caminho",
  IN_SERVICE: "Em atendimento",
  COMPLETED:  "Concluído",
};

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE_STYLES[status] || "bg-slate-100 text-slate-600"}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ── Campo de formulário ────────────────────────────────────────────────────
export function Field({ label, error, children, className = "" }) {
  return (
    <div className={className}>
      {label && <label className="field-label">{label}</label>}
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ── Alerta de erro inline ──────────────────────────────────────────────────
export function Alert({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
      <span className="mt-0.5 shrink-0">⚠</span>
      <span>{message}</span>
    </div>
  );
}

// ── Divisor com texto ──────────────────────────────────────────────────────
export function Divider({ label }) {
  return (
    <div className="relative flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-slate-200" />
      {label && <span className="shrink-0 text-xs text-slate-400">{label}</span>}
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

// ── Info pair ─────────────────────────────────────────────────────────────
export function InfoItem({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-slate-800 break-words">{value || "—"}</dd>
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────
export function KpiCard({ title, value, icon: Icon, highlight = false }) {
  return (
    <div
      className={`card px-5 py-4 flex items-center gap-4 ${
        highlight ? "ring-2 ring-red-300 bg-red-50" : ""
      }`}
    >
      {Icon && (
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            highlight ? "bg-red-100 text-red-600" : "bg-brand-50 text-brand-600"
          }`}
        >
          <Icon size={20} />
        </span>
      )}
      <div>
        <div className="text-xs text-slate-500">{title}</div>
        <div className={`text-2xl font-bold ${highlight ? "text-red-700" : "text-slate-800"}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ── Page shell (área autenticada) ─────────────────────────────────────────
export function PageShell({ children }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
