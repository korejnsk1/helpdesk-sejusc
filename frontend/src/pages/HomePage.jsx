import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlusCircle, Search, ChevronRight, Headset } from "lucide-react";

export default function HomePage() {
  const nav = useNavigate();
  const [ticketInput, setTicketInput] = useState("");

  function handleTrack(e) {
    e.preventDefault();
    const n = ticketInput.trim();
    if (n) nav(`/acompanhar/${n}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Header mínimo */}
      <header className="px-6 py-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white text-sm font-bold">
          HD
        </span>
        <span className="text-sm font-semibold text-slate-700">
          HelpDesk <span className="text-slate-400 font-normal">SEJUSC</span>
        </span>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Icon + title */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-card-md mb-4">
              <Headset size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Central de Suporte TI</h1>
            <p className="mt-1.5 text-slate-500 text-sm">
              Secretaria de Justiça e Segurança Pública do Amazonas
            </p>
          </div>

          {/* Cards de ação */}
          <div className="space-y-3">
            <Link
              to="/novo-chamado"
              className="group flex items-center gap-4 w-full card px-5 py-4 hover:shadow-card-md hover:-translate-y-0.5 transition duration-200"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white group-hover:bg-brand-700 transition">
                <PlusCircle size={20} />
              </span>
              <div className="flex-1 text-left">
                <div className="font-semibold text-slate-800">Abrir chamado</div>
                <div className="text-xs text-slate-500 mt-0.5">Solicite suporte técnico agora</div>
              </div>
              <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-500 transition" />
            </Link>

            {/* Track inline */}
            <div className="card px-5 py-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Search size={20} />
                </span>
                <div>
                  <div className="font-semibold text-slate-800">Acompanhar chamado</div>
                  <div className="text-xs text-slate-500 mt-0.5">Informe o número do protocolo</div>
                </div>
              </div>
              <form onSubmit={handleTrack} className="flex gap-2">
                <input
                  className="field-input flex-1"
                  placeholder="Ex.: 20260417-0001"
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!ticketInput.trim()}
                  className="btn-primary shrink-0"
                >
                  Buscar
                </button>
              </form>
            </div>
          </div>

          {/* Acesso técnico */}
          <div className="mt-8 text-center">
            <Link
              to="/login"
              className="text-xs text-slate-400 hover:text-slate-600 transition"
            >
              Acesso técnico / monitor
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
