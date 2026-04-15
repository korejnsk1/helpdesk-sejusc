import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800">HelpDesk SEJUSC</h1>
        <p className="mt-3 text-slate-600">
          Central de atendimento de Tecnologia da Informação
        </p>
        <div className="mt-10 grid md:grid-cols-2 gap-4">
          <Link
            to="/novo-chamado"
            className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-8 px-4 shadow-md transition"
          >
            <div className="text-2xl font-semibold">Abrir chamado</div>
            <div className="text-sm opacity-90 mt-1">Solicite suporte técnico</div>
          </Link>
          <Link
            to="/acompanhar"
            onClick={(e) => {
              e.preventDefault();
              const n = prompt("Digite o número do chamado:");
              if (n) window.location.href = `/acompanhar/${n.trim()}`;
            }}
            className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl py-8 px-4 shadow-sm transition"
          >
            <div className="text-2xl font-semibold">Acompanhar chamado</div>
            <div className="text-sm text-slate-500 mt-1">Informe o número do protocolo</div>
          </Link>
        </div>
        <div className="mt-10 text-xs text-slate-500">
          <Link to="/login" className="hover:underline">Acesso técnico</Link>
        </div>
      </div>
    </div>
  );
}
