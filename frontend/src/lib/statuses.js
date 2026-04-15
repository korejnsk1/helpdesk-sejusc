export const STATUS_ORDER = ["OPEN", "VIEWED", "EN_ROUTE", "IN_SERVICE", "COMPLETED"];

export const STATUS_LABEL = {
  OPEN: "Aberto",
  VIEWED: "Visualizado",
  EN_ROUTE: "Técnico a caminho",
  IN_SERVICE: "Em atendimento",
  COMPLETED: "Concluído",
};

export function statusIndex(s) {
  return STATUS_ORDER.indexOf(s);
}

export function formatElapsed(fromIso, toIso = null) {
  const start = new Date(fromIso).getTime();
  const end = toIso ? new Date(toIso).getTime() : Date.now();
  const mins = Math.max(0, Math.floor((end - start) / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return `${h}h ${m}min`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}
