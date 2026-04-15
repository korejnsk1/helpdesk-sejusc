export const STATUS = {
  OPEN: "OPEN",
  VIEWED: "VIEWED",
  EN_ROUTE: "EN_ROUTE",
  IN_SERVICE: "IN_SERVICE",
  COMPLETED: "COMPLETED",
};

export const STATUS_LABEL_PT = {
  OPEN: "Aberto",
  VIEWED: "Visualizado",
  EN_ROUTE: "Técnico a caminho",
  IN_SERVICE: "Em atendimento",
  COMPLETED: "Concluído",
};

const TRANSITIONS = {
  OPEN: ["VIEWED"],
  VIEWED: ["EN_ROUTE", "IN_SERVICE"],
  EN_ROUTE: ["IN_SERVICE"],
  IN_SERVICE: ["COMPLETED"],
  COMPLETED: [],
};

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

export function allowedNext(from) {
  return TRANSITIONS[from] || [];
}
