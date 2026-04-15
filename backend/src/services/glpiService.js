// Integração GLPI v10 — Fase 6 (ativar somente após validação do núcleo)
// Requer no .env:
//   GLPI_ENABLED=true
//   GLPI_API_URL=https://glpi.sejusc.local/apirest.php
//   GLPI_APP_TOKEN=xxx
//   GLPI_USER_TOKEN=xxx

async function initSession() {
  const r = await fetch(`${process.env.GLPI_API_URL}/initSession`, {
    method: "GET",
    headers: {
      "App-Token": process.env.GLPI_APP_TOKEN,
      Authorization: `user_token ${process.env.GLPI_USER_TOKEN}`,
    },
  });
  if (!r.ok) throw new Error(`GLPI initSession falhou: ${r.status}`);
  const { session_token } = await r.json();
  return session_token;
}

async function killSession(token) {
  await fetch(`${process.env.GLPI_API_URL}/killSession`, {
    method: "GET",
    headers: {
      "App-Token": process.env.GLPI_APP_TOKEN,
      "Session-Token": token,
    },
  });
}

export async function exportTicketToGlpi(ticket) {
  if (process.env.GLPI_ENABLED !== "true") return { skipped: true };

  const sessionToken = await initSession();
  try {
    const body = {
      input: {
        name: `[${ticket.ticketNumber}] ${ticket.category?.name || "Chamado"}`,
        content: buildDescription(ticket),
        status: 6, // 6 = solved/closed
        // outros mapeamentos (entidade, técnico) devem ser ajustados conforme GLPI do SEJUSC
      },
    };
    const r = await fetch(`${process.env.GLPI_API_URL}/Ticket`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "App-Token": process.env.GLPI_APP_TOKEN,
        "Session-Token": sessionToken,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`GLPI POST /Ticket falhou: ${r.status}`);
    const data = await r.json();
    return { glpiTicketId: data.id };
  } finally {
    await killSession(sessionToken);
  }
}

function buildDescription(t) {
  return [
    `Solicitante: ${t.requesterName} (CPF: ${t.requesterCpf})`,
    `Departamento: ${t.department}`,
    `Categoria: ${t.category?.name}`,
    t.subcategory?.name ? `Subcategoria: ${t.subcategory.name}` : null,
    t.freeTextDescription ? `Descrição: ${t.freeTextDescription}` : null,
    `Unidade: ${t.unit?.name}`,
    `Técnico: ${t.assignedTech?.name}`,
    `Causa: ${t.cause}`,
    `Solução: ${t.solution}`,
    `Abertura: ${t.openedAt}`,
    `Conclusão: ${t.completedAt}`,
  ]
    .filter(Boolean)
    .join("\n");
}
