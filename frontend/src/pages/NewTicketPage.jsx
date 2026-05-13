import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Alert, Spinner } from "../components/ui";
import {
  ArrowLeft, ArrowRight, Monitor, Wifi, Server, FileText,
  CheckCircle2, MonitorSmartphone, Copy, Check as CheckIcon, Printer, LogOut,
  Lightbulb, AlertTriangle, ShieldCheck, ChevronDown,
} from "lucide-react";

// ── Ícones e cores por código de categoria ───────────────────────────────────
const CATEGORY_ICONS = {
  HARDWARE:  Monitor,
  NETWORK:   Wifi,
  NETSERVER: Server,
  SIGED:     FileText,
  REMOTE:    MonitorSmartphone,
  PRINTER:   Printer,
};

const CATEGORY_COLORS = {
  HARDWARE:  "bg-orange-50  dark:bg-orange-900/30  text-orange-600  dark:text-orange-400  border-orange-200  dark:border-orange-700",
  NETWORK:   "bg-blue-50    dark:bg-blue-900/30    text-blue-600    dark:text-blue-400    border-blue-200    dark:border-blue-700",
  NETSERVER: "bg-indigo-50  dark:bg-indigo-900/30  text-indigo-600  dark:text-indigo-400  border-indigo-200  dark:border-indigo-700",
  SIGED:     "bg-teal-50    dark:bg-teal-900/30    text-teal-600    dark:text-teal-400    border-teal-200    dark:border-teal-700",
  REMOTE:    "bg-cyan-50    dark:bg-cyan-900/30    text-cyan-600    dark:text-cyan-400    border-cyan-200    dark:border-cyan-700",
  PRINTER:   "bg-green-50   dark:bg-green-900/30   text-green-600   dark:text-green-400   border-green-200   dark:border-green-700",
};

// Subcategorias que têm campos extras (valor = tipo de formulário)
const EXTRA_FORM_TYPE = {
  // Impressoras: nome da impressora + bloco
  PRINTER_NOT_VISIBLE: "printer",
  PRINTER_OFFLINE:     "printer",
  PRINTER_NO_PRINT:    "printer",
  PRINTER_PAPER_JAM:   "printer",
  PRINTER_NO_PAPER:    "printer",
  PRINTER_TONER:       "printer",
  // Rede/Servidor
  NETSERVER_USER_CREATE:    "net_user_create",
  NETSERVER_USER_DELETE:    "net_user_delete",
  NETSERVER_PASSWORD_RESET: "net_password_reset",
  NETSERVER_USER_UPDATE:    "freetext",
  NETSERVER_FOLDER_CREATE:  "freetext",
  NETSERVER_FOLDER_MAP:     "freetext",
  NETSERVER_VPN:            "freetext",
  NETSERVER_TRUST_FAIL:     "none",
  // SIGED
  SIGED_USER_CREATE:    "freetext",
  SIGED_SECTOR_MOVE:    "siged_sector_move",
  SIGED_USER_DELETE:    "siged_user_delete",
  SIGED_PASSWORD_RESET: "freetext",
  SIGED_SECTOR_CREATE:  "freetext",
  // Computador / Internet (descri livre só para "Outro")
  HARDWARE_OTHER: "freetext",
};

// ── Componente select de departamento com busca ──────────────────────────────
function DeptSelect({ value, onChange, departments, placeholder = "Selecione o setor..." }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");

  const filtered = departments.filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase())
  );
  const selected = departments.find((d) => d.id === value);

  useEffect(() => {
    function handle(e) {
      if (!e.target.closest("[data-dept-select]")) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div className="relative" data-dept-select>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="field-input w-full flex items-center justify-between text-left"
      >
        <span className={selected ? "text-slate-900 dark:text-gray-100" : "text-slate-400 dark:text-gray-500"}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-gray-700">
            <input
              autoFocus
              type="text"
              placeholder="Filtrar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-lg bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <ul className="max-h-44 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-400">Nenhum setor encontrado</li>
            )}
            {filtered.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => { onChange(d.id); setOpen(false); setQuery(""); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    value === d.id
                      ? "bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-medium"
                      : "text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700"
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

// ── Formulários extras por tipo ──────────────────────────────────────────────
function ExtraFields({ formType, fields, setFields, departments }) {
  const set = (key, val) => setFields((prev) => ({ ...prev, [key]: val }));

  if (formType === "printer") return (
    <div className="space-y-3 pt-1">
      <div>
        <label className="field-label">Identificação da impressora *</label>
        <input
          className="field-input"
          placeholder="Ex: HP LaserJet Pro M404n — sala 203"
          value={fields.printerName || ""}
          onChange={(e) => set("printerName", e.target.value)}
        />
      </div>
      <div>
        <label className="field-label">Bloco / localização *</label>
        <input
          className="field-input"
          placeholder="Ex: Bloco A, 2º andar"
          value={fields.block || ""}
          onChange={(e) => set("block", e.target.value)}
        />
      </div>
    </div>
  );

  if (formType === "net_user_create") return (
    <div className="space-y-3 pt-1">
      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
        <ShieldCheck size={14} className="shrink-0 mt-0.5" />
        <span>Este chamado será enviado para <strong>aprovação do seu Chefe de Setor</strong> antes de ser processado pela GTI.</span>
      </div>
      <div>
        <label className="field-label">Nome completo do novo usuário *</label>
        <input className="field-input" placeholder="Nome completo" value={fields.nome || ""} onChange={(e) => set("nome", e.target.value)} />
      </div>
      <div>
        <label className="field-label">CPF do novo usuário *</label>
        <input className="field-input" placeholder="000.000.000-00" value={fields.cpf || ""} onChange={(e) => set("cpf", e.target.value)} />
      </div>
      <div>
        <label className="field-label">E-mail institucional</label>
        <input className="field-input" type="email" placeholder="usuario@sejusc.am.gov.br" value={fields.email || ""} onChange={(e) => set("email", e.target.value)} />
      </div>
      <div>
        <label className="field-label">Setor *</label>
        <input className="field-input" placeholder="Setor do novo usuário" value={fields.setor || ""} onChange={(e) => set("setor", e.target.value)} />
      </div>
      <div>
        <label className="field-label">Cargo / Função *</label>
        <input className="field-input" placeholder="Ex: Analista, Assistente..." value={fields.cargo || ""} onChange={(e) => set("cargo", e.target.value)} />
      </div>
      <div>
        <label className="field-label mb-2">Sistemas necessários *</label>
        <div className="flex flex-wrap gap-3">
          {["SIGED", "SAM", "AD"].map((sys) => {
            const checked = (fields.systems || []).includes(sys);
            return (
              <label key={sys} className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition text-sm font-medium ${
                checked
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400"
                  : "border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:border-brand-300"
              }`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => {
                    const cur = fields.systems || [];
                    set("systems", checked ? cur.filter((s) => s !== sys) : [...cur, sys]);
                  }}
                />
                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${checked ? "border-brand-500 bg-brand-500" : "border-slate-300 dark:border-gray-600"}`}>
                  {checked && <CheckIcon size={10} className="text-white" />}
                </div>
                {sys}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (formType === "net_user_delete") return (
    <div className="space-y-3 pt-1">
      <div>
        <label className="field-label">CPF do usuário a ser excluído *</label>
        <input className="field-input" placeholder="000.000.000-00" value={fields.cpf || ""} onChange={(e) => set("cpf", e.target.value)} />
      </div>
      <div>
        <label className="field-label">Setor do usuário *</label>
        <input className="field-input" placeholder="Setor atual do usuário" value={fields.setor || ""} onChange={(e) => set("setor", e.target.value)} />
      </div>
      <div>
        <label className="field-label">Observações</label>
        <textarea rows={2} className="field-input resize-none" placeholder="Informações adicionais..." value={fields.obs || ""} onChange={(e) => set("obs", e.target.value)} />
      </div>
    </div>
  );

  if (formType === "net_password_reset") return (
    <div className="space-y-3 pt-1">
      <div>
        <label className="field-label">Nome do usuário *</label>
        <input className="field-input" placeholder="Nome completo" value={fields.nome || ""} onChange={(e) => set("nome", e.target.value)} />
      </div>
      <div>
        <label className="field-label">CPF *</label>
        <input className="field-input" placeholder="000.000.000-00" value={fields.cpf || ""} onChange={(e) => set("cpf", e.target.value)} />
      </div>
      <div>
        <label className="field-label">Setor *</label>
        <input className="field-input" placeholder="Setor do usuário" value={fields.setor || ""} onChange={(e) => set("setor", e.target.value)} />
      </div>
    </div>
  );

  if (formType === "siged_sector_move") return (
    <div className="space-y-3 pt-1">
      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
        <ShieldCheck size={14} className="shrink-0 mt-0.5" />
        <span>Esta solicitação requer aprovação dos <strong>Chefes dos dois setores envolvidos</strong> antes de ser processada.</span>
      </div>
      <div>
        <label className="field-label">CPF do usuário *</label>
        <input className="field-input" placeholder="000.000.000-00" value={fields.cpf || ""} onChange={(e) => set("cpf", e.target.value)} />
      </div>
      <div>
        <label className="field-label">Setor de destino *</label>
        <DeptSelect
          value={fields.targetDeptId || null}
          onChange={(id) => {
            const dept = departments.find((d) => d.id === id);
            setFields((prev) => ({ ...prev, targetDeptId: id, targetDeptName: dept?.name || "" }));
          }}
          departments={departments}
          placeholder="Selecione o novo setor..."
        />
      </div>
      <div>
        <label className="field-label">Observações</label>
        <textarea rows={2} className="field-input resize-none" placeholder="Informações adicionais..." value={fields.obs || ""} onChange={(e) => set("obs", e.target.value)} />
      </div>
    </div>
  );

  if (formType === "siged_user_delete") return (
    <div className="space-y-3 pt-1">
      <div>
        <label className="field-label">CPF do usuário a ser excluído *</label>
        <input className="field-input" placeholder="000.000.000-00" value={fields.cpf || ""} onChange={(e) => set("cpf", e.target.value)} />
      </div>
      <div>
        <label className="field-label">Observações</label>
        <textarea rows={2} className="field-input resize-none" placeholder="Informações adicionais..." value={fields.obs || ""} onChange={(e) => set("obs", e.target.value)} />
      </div>
    </div>
  );

  if (formType === "freetext") return (
    <div className="pt-1">
      <label className="field-label">Descreva a solicitação *</label>
      <textarea
        rows={4}
        className="field-input resize-none"
        placeholder="Descreva com o máximo de detalhes..."
        value={fields.freetext || ""}
        onChange={(e) => set("freetext", e.target.value)}
        autoFocus
      />
      <p className={`mt-1 text-xs ${(fields.freetext?.length || 0) < 5 ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-gray-500"}`}>
        {(fields.freetext?.length || 0)} / mínimo 5 caracteres
      </p>
    </div>
  );

  return null; // formType === "none" ou não mapeado
}

// ── Valida se os campos extras estão preenchidos ─────────────────────────────
function isExtraValid(formType, fields) {
  if (!formType || formType === "none") return true;
  if (formType === "printer")          return !!(fields.printerName?.trim() && fields.block?.trim());
  if (formType === "net_user_create")  return !!(fields.nome?.trim() && fields.cpf?.trim() && fields.setor?.trim() && fields.cargo?.trim() && (fields.systems || []).length > 0);
  if (formType === "net_user_delete")  return !!(fields.cpf?.trim() && fields.setor?.trim());
  if (formType === "net_password_reset") return !!(fields.nome?.trim() && fields.cpf?.trim() && fields.setor?.trim());
  if (formType === "siged_sector_move")  return !!(fields.cpf?.trim() && fields.targetDeptId);
  if (formType === "siged_user_delete")  return !!(fields.cpf?.trim());
  if (formType === "freetext")           return (fields.freetext?.trim().length || 0) >= 5;
  return true;
}

// ── Constrói freeTextDescription e extraData a partir dos campos ──────────────
function buildPayload(formType, fields) {
  let freeTextDescription = null;
  let extraData           = null;

  if (formType === "printer") {
    freeTextDescription = `Impressora: ${fields.printerName}\nBloco: ${fields.block}`;
    extraData = { printerName: fields.printerName, block: fields.block };
  } else if (formType === "net_user_create") {
    const systems = (fields.systems || []).join(", ");
    freeTextDescription = `Nome: ${fields.nome}\nCPF: ${fields.cpf}\nE-mail: ${fields.email || "—"}\nSetor: ${fields.setor}\nCargo: ${fields.cargo}\nSistemas: ${systems}`;
    extraData = { systems: fields.systems || [] };
  } else if (formType === "net_user_delete") {
    freeTextDescription = `CPF: ${fields.cpf}\nSetor: ${fields.setor}${fields.obs ? `\nObservações: ${fields.obs}` : ""}`;
  } else if (formType === "net_password_reset") {
    freeTextDescription = `Nome: ${fields.nome}\nCPF: ${fields.cpf}\nSetor: ${fields.setor}`;
  } else if (formType === "siged_sector_move") {
    freeTextDescription = `CPF: ${fields.cpf}\nSetor de destino: ${fields.targetDeptName}${fields.obs ? `\nObservações: ${fields.obs}` : ""}`;
    extraData = { targetDeptId: fields.targetDeptId, targetDeptName: fields.targetDeptName };
  } else if (formType === "siged_user_delete") {
    freeTextDescription = `CPF: ${fields.cpf}${fields.obs ? `\nObservações: ${fields.obs}` : ""}`;
  } else if (formType === "freetext") {
    freeTextDescription = fields.freetext?.trim() || null;
  }

  return { freeTextDescription, extraData };
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function NewTicketPage() {
  const nav          = useNavigate();
  const { user, logout } = useAuth();
  const [categories,   setCategories]   = useState([]);
  const [departments,  setDepartments]  = useState([]);
  const [screen,       setScreen]       = useState("category");
  const [form,         setForm]         = useState({ categoryId: null, subcategoryId: null, anyDeskCode: "", freeTextDescription: "", priority: "MEDIUM" });
  const [extraFields,  setExtraFields]  = useState({});
  const [error,        setError]        = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);

  useEffect(() => {
    api.get("/categories").then((r)   => setCategories(r.data));
    api.get("/departments").then((r)  => setDepartments(r.data)).catch(() => {});
  }, []);

  const selectedCategory   = categories.find((c) => c.id === form.categoryId);
  const isRemote           = selectedCategory?.code === "REMOTE";
  const n1Tips             = selectedCategory?.n1Tips ? JSON.parse(selectedCategory.n1Tips) : [];
  const selectedSubcategory = selectedCategory?.subcategories?.find((s) => s.id === form.subcategoryId);
  const subCode            = selectedSubcategory?.code;
  const formType           = subCode ? (EXTRA_FORM_TYPE[subCode] ?? "none") : null;
  const requiresApproval   = selectedSubcategory?.requiresApproval ?? false;

  const steps      = ["Tipo do problema", "Detalhes"];
  const currentStep = screen === "category" ? 1 : 2;

  // Reset de campos extras ao trocar subcategoria
  function selectSub(subId) {
    setForm((f) => ({ ...f, subcategoryId: subId, freeTextDescription: "" }));
    setExtraFields({});
  }

  function canSubmit() {
    if (isRemote) return form.anyDeskCode.trim().length >= 3;
    if (selectedCategory?.allowsFreeText) return form.freeTextDescription.trim().length >= 5;
    if (!form.subcategoryId) return false;
    return isExtraValid(formType, extraFields);
  }

  async function submit() {
    setError("");
    setSubmitting(true);
    try {
      let payload = {
        categoryId:    form.categoryId,
        subcategoryId: (selectedCategory?.allowsFreeText || isRemote) ? null : form.subcategoryId,
        anyDeskCode:   isRemote ? form.anyDeskCode.trim() : null,
        priority:      form.priority,
      };

      if (isRemote) {
        payload.freeTextDescription = form.freeTextDescription?.trim() || null;
      } else if (selectedCategory?.allowsFreeText) {
        payload.freeTextDescription = form.freeTextDescription?.trim() || null;
      } else if (formType) {
        const built = buildPayload(formType, extraFields);
        payload.freeTextDescription = built.freeTextDescription;
        payload.extraData           = built.extraData;
      }

      const { data } = await api.post("/tickets", payload);
      setCreatedTicket({ ticketNumber: data.ticketNumber, isRemote, approvalStatus: data.approvalStatus });
    } catch (e) {
      setError(e.response?.data?.error || "Falha ao abrir chamado");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Tela de sucesso ──────────────────────────────────────────────────────
  if (createdTicket) {
    if (createdTicket.isRemote) return <RemoteSuccessScreen ticketNumber={createdTicket.ticketNumber} />;
    if (createdTicket.approvalStatus === "PENDING") return <ApprovalPendingScreen ticketNumber={createdTicket.ticketNumber} />;
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
          <Link to={`/acompanhar/${createdTicket.ticketNumber}`} className="btn-primary w-full justify-center">
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
        <button
          onClick={() => {
            if (screen === "details") setScreen("category");
            else nav("/");
          }}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="h-4 w-px bg-slate-200 dark:bg-gray-700" />
        <h1 className="text-sm font-semibold text-slate-800 dark:text-gray-100">Abrir chamado</h1>
        <div className="ml-auto">
          <button
            onClick={async () => { await logout(); nav("/"); }}
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-2xl w-full mx-auto">

        {/* Solicitante */}
        <div className="mb-5 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-gray-400">Chamado aberto por</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-gray-100 truncate">{user?.name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-500 dark:text-gray-400">Setor</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-gray-100">{user?.department?.name || "—"}</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((label, idx) => {
            const n      = idx + 1;
            const done   = n < currentStep;
            const active = n === currentStep;
            return (
              <div key={n} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition ${
                    done   ? "bg-brand-600 text-white"
                    : active ? "bg-brand-600 text-white ring-4 ring-brand-600/20"
                    : "bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-400"
                  }`}>
                    {done ? <CheckCircle2 size={14} /> : n}
                  </div>
                  <span className={`text-xs hidden sm:inline ${active ? "font-semibold text-slate-800 dark:text-gray-100" : "text-slate-400 dark:text-gray-600"}`}>
                    {label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-px ${n < currentStep ? "bg-brand-600" : "bg-slate-200 dark:bg-gray-700"}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="card p-6">

          {/* ── TELA 1: Tipo do problema ── */}
          {screen === "category" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-gray-100">Tipo do problema</h2>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">Selecione a categoria que melhor descreve</p>
              </div>

              <div className="space-y-2">
                {categories.filter((c) => c.code !== "REMOTE").map((c) => {
                  const Icon       = CATEGORY_ICONS[c.code] || FileText;
                  const colorClass = CATEGORY_COLORS[c.code] || "";
                  const selected   = form.categoryId === c.id;
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
                disabled={!form.categoryId}
                onClick={() => setScreen("details")}
                className="btn-primary w-full py-3"
              >
                Continuar <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ── TELA 2: Detalhes ── */}
          {screen === "details" && selectedCategory && (
            <div className="space-y-4">

              {/* Dicas N1 */}
              {n1Tips.length > 0 && !isRemote && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/15 px-4 py-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                    <Lightbulb size={15} />
                    Dicas rápidas — {selectedCategory.name}
                  </div>
                  <ul className="space-y-1.5">
                    {n1Tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                        <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-800/60 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-[10px]">
                          {i + 1}
                        </span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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

              {/* AnyDesk */}
              {isRemote && (
                <AnyDeskStep
                  value={form.anyDeskCode}
                  onChange={(v) => setForm({ ...form, anyDeskCode: v })}
                  description={form.freeTextDescription}
                  onDescriptionChange={(v) => setForm({ ...form, freeTextDescription: v })}
                />
              )}

              {/* Texto livre (categoria) */}
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
                  {form.freeTextDescription.length > 0 && (
                    <p className={`mt-1 text-xs ${form.freeTextDescription.length < 5 ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-gray-500"}`}>
                      {form.freeTextDescription.length < 5
                        ? `${form.freeTextDescription.length} / 5 mínimo`
                        : `${form.freeTextDescription.length} caracteres`}
                    </p>
                  )}
                </div>
              )}

              {/* Subcategorias */}
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
                          onChange={() => selectSub(s.id)} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-slate-700 dark:text-gray-200">{s.name}</span>
                          {s.requiresApproval && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-700">
                              <ShieldCheck size={9} /> Requer aprovação
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}

                  {/* Campos extras da subcategoria selecionada */}
                  {form.subcategoryId && formType && formType !== "none" && (
                    <div className="rounded-xl border border-slate-200 dark:border-gray-700 p-4 space-y-1 mt-1">
                      <ExtraFields
                        formType={formType}
                        fields={extraFields}
                        setFields={setExtraFields}
                        departments={departments}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Prioridade */}
              <div>
                <label className="field-label mb-2">Prioridade</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: "LOW",    label: "Baixa",   cls: "border-slate-300 dark:border-gray-600 text-slate-600 dark:text-gray-400 data-[sel=true]:border-slate-500 data-[sel=true]:bg-slate-100 dark:data-[sel=true]:bg-gray-700 data-[sel=true]:text-slate-800 dark:data-[sel=true]:text-gray-100" },
                    { value: "MEDIUM", label: "Média",   cls: "border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 data-[sel=true]:border-blue-500 data-[sel=true]:bg-blue-50 dark:data-[sel=true]:bg-blue-900/20 data-[sel=true]:text-blue-700 dark:data-[sel=true]:text-blue-300" },
                    { value: "HIGH",   label: "Alta",    cls: "border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 data-[sel=true]:border-orange-500 data-[sel=true]:bg-orange-50 dark:data-[sel=true]:bg-orange-900/20 data-[sel=true]:text-orange-700 dark:data-[sel=true]:text-orange-300" },
                    { value: "URGENT", label: "Urgente", cls: "border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 data-[sel=true]:border-red-500 data-[sel=true]:bg-red-50 dark:data-[sel=true]:bg-red-900/20 data-[sel=true]:text-red-700 dark:data-[sel=true]:text-red-300" },
                  ].map(({ value, label, cls }) => (
                    <button
                      key={value}
                      type="button"
                      data-sel={form.priority === value ? "true" : "false"}
                      onClick={() => setForm((f) => ({ ...f, priority: value }))}
                      className={`rounded-lg border-2 py-2 text-xs font-semibold transition ${cls}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <Alert message={error} />

              <div className="flex gap-2 pt-1">
                <button onClick={() => setScreen("category")} className="btn-secondary flex-1">
                  <ArrowLeft size={16} /> Voltar
                </button>
                <button
                  disabled={submitting || !canSubmit()}
                  onClick={submit}
                  className="btn-primary flex-1"
                >
                  {submitting
                    ? <><Spinner className="h-4 w-4" /> Enviando...</>
                    : <>{requiresApproval ? <><ShieldCheck size={16} /> Enviar para aprovação</> : <><CheckCircle2 size={16} /> Abrir chamado</>}</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Tela: aguardando aprovação do chefe ──────────────────────────────────────
function ApprovalPendingScreen({ ticketNumber }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="card p-8 text-center max-w-sm w-full space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 mx-auto">
          <ShieldCheck size={28} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Solicitação enviada!</h2>
          <p className="font-mono text-sm text-brand-600 dark:text-brand-400 mt-1">{ticketNumber}</p>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-2">
            Aguardando aprovação do Chefe de Setor. Após a aprovação, a GTI irá processar sua solicitação.
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 text-left">
          ⚠️ Você receberá atualização sobre o andamento da sua solicitação.
        </div>
        <Link to={`/acompanhar/${ticketNumber}`} className="btn-primary w-full justify-center">
          Acompanhar solicitação
        </Link>
        <Link to="/" className="block text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

// ── AnyDesk step ─────────────────────────────────────────────────────────────
function AnyDeskStep({ value, onChange, description, onDescriptionChange }) {
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
          <li>3. Copie e cole o número no campo abaixo:</li>
        </ol>
      </div>
      <div>
        <label className="field-label">Seu código AnyDesk</label>
        <input
          className="field-input text-center text-lg font-mono tracking-widest"
          placeholder="Ex: 123 456 789"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d\s]/g, ""))}
          autoFocus maxLength={20} inputMode="numeric"
        />
        <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">Apenas números, como exibido no AnyDesk</p>
      </div>
      <div>
        <label className="field-label">Descreva o problema <span className="text-slate-400 dark:text-gray-500 font-normal">(opcional)</span></label>
        <textarea rows={3} className="field-input resize-none"
          placeholder="Ex: Chrome não abre, preciso instalar um programa."
          value={description} onChange={(e) => onDescriptionChange(e.target.value)} />
      </div>
      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <span className="text-base shrink-0 mt-0.5">⚠️</span>
        <span>Ao abrir este chamado, deixe o AnyDesk aberto e aceite a solicitação de conexão assim que o técnico listar o chamado como em andamento.</span>
      </div>
    </div>
  );
}

// ── Remote success ────────────────────────────────────────────────────────────
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
            <button onClick={copyProtocol}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition">
              {copied ? <CheckIcon size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4 text-left space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300 text-sm">
            <span className="text-lg">🔔</span> Fique de olho no AnyDesk!
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
