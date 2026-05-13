import { prisma } from "../config/prisma.js";
import { maskCpf } from "../utils/cpf.js";

function parseRange(q) {
  const where = {};
  if (q.from || q.to) {
    where.openedAt = {};
    if (q.from) where.openedAt.gte = new Date(q.from);
    if (q.to) where.openedAt.lte = new Date(q.to);
  }
  return where;
}

function unitScope(user) {
  return user.role === "TECHNICIAN" && user.unitId ? { unitId: user.unitId } : {};
}

function osUnitScope(user) {
  return user.role === "TECHNICIAN" && user.unitId ? { unitId: user.unitId } : {};
}

export async function ticketsByUnit(req, res) {
  const where = { ...parseRange(req.query), ...unitScope(req.user) };
  const data = await prisma.ticket.groupBy({
    by: ["unitId"],
    where,
    _count: { _all: true },
  });
  const unitIds = data.map((d) => d.unitId).filter(Boolean);
  const units = unitIds.length > 0
    ? await prisma.unit.findMany({ where: { id: { in: unitIds } }, select: { id: true, name: true } })
    : [];
  const map = new Map(units.map((u) => [u.id, u.name]));
  res.json(
    data.map((d) => ({
      unitId: d.unitId,
      unit: d.unitId ? (map.get(d.unitId) || "Unidade removida") : "Sem unidade",
      total: d._count._all,
    }))
  );
}

export async function ticketsByTechnician(req, res) {
  const where = { ...parseRange(req.query), ...unitScope(req.user) };
  const data = await prisma.ticket.groupBy({
    by: ["assignedTechId"],
    where,
    _count: { _all: true },
  });
  const techIds = data.map((d) => d.assignedTechId).filter(Boolean);
  const techs = techIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: techIds } }, select: { id: true, name: true } })
    : [];
  const map = new Map(techs.map((t) => [t.id, t.name]));
  res.json(
    data.map((d) => ({
      technicianId: d.assignedTechId,
      technician: d.assignedTechId ? (map.get(d.assignedTechId) || "Técnico removido") : "Não atribuído",
      total: d._count._all,
    }))
  );
}

export async function ticketsByDepartment(req, res) {
  const where = { ...parseRange(req.query), ...unitScope(req.user) };
  const data = await prisma.ticket.groupBy({
    by: ["department"],
    where,
    _count: { _all: true },
    orderBy: { _count: { department: "desc" } },
    take: 20,
  });
  res.json(data.map((d) => ({ department: d.department, total: d._count._all })));
}

export async function ticketsByCategory(req, res) {
  const where = { ...parseRange(req.query), ...unitScope(req.user) };
  const data = await prisma.ticket.groupBy({
    by: ["categoryId"],
    where,
    _count: { _all: true },
  });
  const catIds = data.map((d) => d.categoryId).filter(Boolean);
  const cats = catIds.length > 0
    ? await prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } })
    : [];
  const map = new Map(cats.map((c) => [c.id, c.name]));
  res.json(
    data.map((d) => ({
      categoryId: d.categoryId,
      category: map.get(d.categoryId) || "-",
      total: d._count._all,
    }))
  );
}

export async function avgResolutionByCategory(req, res) {
  const where = { ...parseRange(req.query), ...unitScope(req.user), status: "COMPLETED" };
  const tickets = await prisma.ticket.findMany({
    where,
    select: { categoryId: true, openedAt: true, completedAt: true },
  });
  const catIds = [...new Set(tickets.map((t) => t.categoryId).filter(Boolean))];
  const cats = catIds.length > 0
    ? await prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } })
    : [];
  const map = new Map(cats.map((c) => [c.id, c.name]));
  const buckets = {};
  for (const t of tickets) {
    if (!t.completedAt) continue;
    const mins = (t.completedAt - t.openedAt) / 60000;
    buckets[t.categoryId] = buckets[t.categoryId] || { sum: 0, n: 0 };
    buckets[t.categoryId].sum += mins;
    buckets[t.categoryId].n += 1;
  }
  const result = Object.entries(buckets).map(([catId, b]) => ({
    categoryId: Number(catId),
    category: map.get(Number(catId)) || "-",
    avgMinutes: Math.round(b.sum / b.n),
    samples: b.n,
  }));
  res.json(result);
}

export async function topRequesters(req, res) {
  const where = { ...parseRange(req.query), ...unitScope(req.user), openedById: { not: null } };
  const data = await prisma.ticket.groupBy({
    by: ["openedById"],
    where,
    _count: { _all: true },
    orderBy: { _count: { openedById: "desc" } },
    take: Math.min(Number(req.query.limit) || 10, 50),
  });
  const ids = data.map((d) => d.openedById);
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, cpf: true, department: { select: { name: true } } },
  });
  const map = new Map(users.map((u) => [u.id, u]));
  res.json(
    data.map((d) => {
      const u = map.get(d.openedById);
      return {
        userId: d.openedById,
        name: u?.name || "—",
        cpf: u ? maskCpf(u.cpf) : "—",
        department: u?.department?.name || "—",
        total: d._count._all,
      };
    })
  );
}

export async function ticketsByDay(req, res) {
  const start = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 86400000);
  const end   = req.query.to   ? new Date(req.query.to)   : new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const isTech = req.user.role === "TECHNICIAN" && req.user.unitId;
  const rows = isTech
    ? await prisma.$queryRaw`
        SELECT DATE(openedAt) AS day, COUNT(*) AS total
        FROM Ticket
        WHERE openedAt >= ${start} AND openedAt <= ${end} AND unitId = ${req.user.unitId}
        GROUP BY DATE(openedAt)
        ORDER BY day ASC
      `
    : await prisma.$queryRaw`
        SELECT DATE(openedAt) AS day, COUNT(*) AS total
        FROM Ticket
        WHERE openedAt >= ${start} AND openedAt <= ${end}
        GROUP BY DATE(openedAt)
        ORDER BY day ASC
      `;

  // MySQL DATE() returns a JS Date; convert to YYYY-MM-DD string
  const map = new Map(
    rows.map((r) => [
      (r.day instanceof Date ? r.day : new Date(r.day)).toISOString().slice(0, 10),
      Number(r.total),
    ])
  );

  // Fill zeros for days without tickets
  const result = [];
  const cur = new Date(start);
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10);
    result.push({ date: key, total: map.get(key) ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }

  res.json(result);
}

export async function ticketsByMonth(req, res) {
  const start = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 365 * 86400000);
  const end   = req.query.to   ? new Date(req.query.to)   : new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const isTech = req.user.role === "TECHNICIAN" && req.user.unitId;
  const rows = isTech
    ? await prisma.$queryRaw`
        SELECT
          DATE_FORMAT(openedAt, '%Y-%m') AS month,
          COUNT(*) AS total,
          SUM(status = 'COMPLETED') AS completed,
          SUM(status = 'OPEN') AS open_count,
          SUM(status = 'IN_PROGRESS') AS in_progress
        FROM Ticket
        WHERE openedAt >= ${start} AND openedAt <= ${end} AND unitId = ${req.user.unitId}
        GROUP BY DATE_FORMAT(openedAt, '%Y-%m')
        ORDER BY month ASC
      `
    : await prisma.$queryRaw`
        SELECT
          DATE_FORMAT(openedAt, '%Y-%m') AS month,
          COUNT(*) AS total,
          SUM(status = 'COMPLETED') AS completed,
          SUM(status = 'OPEN') AS open_count,
          SUM(status = 'IN_PROGRESS') AS in_progress
        FROM Ticket
        WHERE openedAt >= ${start} AND openedAt <= ${end}
        GROUP BY DATE_FORMAT(openedAt, '%Y-%m')
        ORDER BY month ASC
      `;

  res.json(rows.map((r) => ({
    month:      r.month,
    total:      Number(r.total),
    completed:  Number(r.completed),
    open:       Number(r.open_count),
    inProgress: Number(r.in_progress),
  })));
}

export async function avgResolutionByUnit(req, res) {
  const where = { ...parseRange(req.query), ...unitScope(req.user), status: "COMPLETED" };
  const tickets = await prisma.ticket.findMany({
    where,
    select: { unitId: true, openedAt: true, completedAt: true },
  });
  const unitIds = [...new Set(tickets.map((t) => t.unitId).filter(Boolean))];
  const units = unitIds.length > 0
    ? await prisma.unit.findMany({ where: { id: { in: unitIds } }, select: { id: true, name: true } })
    : [];
  const map = new Map(units.map((u) => [u.id, u.name]));
  const buckets = {};
  for (const t of tickets) {
    if (!t.completedAt) continue;
    const mins = (t.completedAt - t.openedAt) / 60000;
    const key = t.unitId ?? "null";
    buckets[key] = buckets[key] || { sum: 0, n: 0 };
    buckets[key].sum += mins;
    buckets[key].n += 1;
  }
  const result = Object.entries(buckets).map(([unitId, b]) => ({
    unitId: unitId === "null" ? null : Number(unitId),
    unit: unitId === "null" ? "Sem unidade" : (map.get(Number(unitId)) || "-"),
    avgMinutes: Math.round(b.sum / b.n),
    samples: b.n,
  }));
  res.json(result);
}

export async function otherReclassified(req, res) {
  const where = {
    ...parseRange(req.query),
    ...unitScope(req.user),
    freeTextDescription: { not: null },
  };
  const tickets = await prisma.ticket.findMany({
    where,
    select: {
      id: true,
      ticketNumber: true,
      freeTextDescription: true,
      category: { select: { name: true } },
    },
    take: 200,
  });
  res.json(tickets);
}

// ── OS Analytics ──────────────────────────────────────────────────────────────

function parseOsRange(q) {
  const where = {};
  if (q.from || q.to) {
    where.createdAt = {};
    if (q.from) where.createdAt.gte = new Date(q.from);
    if (q.to)   where.createdAt.lte = new Date(q.to);
  }
  return where;
}

const OS_TIPO_LABELS = {
  VISITA_TECNICA:           "Visita Técnica",
  TROCA_EQUIPAMENTO:        "Troca de Equipamento",
  ENTREGA:                  "Entrega",
  MANUTENCAO_REDE:          "Manutenção de Rede",
  MANUTENCAO_CAMERA:        "Manutenção de Câmera",
  RECOLHIMENTO_EQUIPAMENTO: "Recolhimento de Equipamento",
  ACAO:                     "Ação",
  OUTRO:                    "Outro",
};

const OS_STATUS_LABELS = {
  ABERTA:       "Aberta",
  EM_ANDAMENTO: "Em Andamento",
  CONCLUIDA:    "Concluída",
  CANCELADA:    "Cancelada",
};

export async function osByStatus(req, res) {
  const where = { ...parseOsRange(req.query), ...osUnitScope(req.user) };
  const data = await prisma.workOrder.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });
  res.json(data.map((d) => ({
    status: d.status,
    label:  OS_STATUS_LABELS[d.status] || d.status,
    total:  d._count._all,
  })));
}

export async function osByTipo(req, res) {
  const where = { ...parseOsRange(req.query), ...osUnitScope(req.user) };
  const data = await prisma.workOrder.groupBy({
    by: ["tipo"],
    where,
    _count: { _all: true },
    orderBy: { _count: { tipo: "desc" } },
  });
  res.json(data.map((d) => ({
    tipo:  d.tipo,
    label: OS_TIPO_LABELS[d.tipo] || d.tipo,
    total: d._count._all,
  })));
}

export async function osByUnit(req, res) {
  const where = { ...parseOsRange(req.query), ...osUnitScope(req.user) };
  const data = await prisma.workOrder.groupBy({
    by: ["unitId"],
    where,
    _count: { _all: true },
  });
  const unitIds = data.map((d) => d.unitId).filter(Boolean);
  const units = unitIds.length > 0
    ? await prisma.unit.findMany({ where: { id: { in: unitIds } }, select: { id: true, name: true } })
    : [];
  const map = new Map(units.map((u) => [u.id, u.name]));
  res.json(data.map((d) => ({
    unitId: d.unitId,
    unit:   d.unitId ? (map.get(d.unitId) || "Desconhecido") : "Sem núcleo",
    total:  d._count._all,
  })));
}

export async function osByTecnico(req, res) {
  const start = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 365 * 86400000);
  const end   = req.query.to   ? new Date(req.query.to)   : new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const isTech = req.user.role === "TECHNICIAN" && req.user.unitId;
  const rows = isTech
    ? await prisma.$queryRaw`
        SELECT ot.userId, COUNT(*) AS total
        FROM OsTecnico ot
        JOIN WorkOrder wo ON wo.id = ot.osId
        WHERE wo.createdAt >= ${start} AND wo.createdAt <= ${end} AND wo.unitId = ${req.user.unitId}
        GROUP BY ot.userId
        ORDER BY total DESC
      `
    : await prisma.$queryRaw`
        SELECT ot.userId, COUNT(*) AS total
        FROM OsTecnico ot
        JOIN WorkOrder wo ON wo.id = ot.osId
        WHERE wo.createdAt >= ${start} AND wo.createdAt <= ${end}
        GROUP BY ot.userId
        ORDER BY total DESC
      `;

  const ids = rows.map((r) => Number(r.userId));
  const users = ids.length > 0
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const map = new Map(users.map((u) => [u.id, u.name]));

  res.json(rows.map((r) => ({
    userId:  Number(r.userId),
    tecnico: map.get(Number(r.userId)) || "-",
    total:   Number(r.total),
  })));
}

export async function osByMonth(req, res) {
  const start = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 365 * 86400000);
  const end   = req.query.to   ? new Date(req.query.to)   : new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const isTech = req.user.role === "TECHNICIAN" && req.user.unitId;
  const rows = isTech
    ? await prisma.$queryRaw`
        SELECT
          DATE_FORMAT(createdAt, '%Y-%m') AS month,
          COUNT(*) AS total,
          SUM(status = 'CONCLUIDA')    AS concluida,
          SUM(status = 'ABERTA')       AS aberta,
          SUM(status = 'EM_ANDAMENTO') AS em_andamento,
          SUM(status = 'CANCELADA')    AS cancelada
        FROM WorkOrder
        WHERE createdAt >= ${start} AND createdAt <= ${end} AND unitId = ${req.user.unitId}
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        ORDER BY month ASC
      `
    : await prisma.$queryRaw`
        SELECT
          DATE_FORMAT(createdAt, '%Y-%m') AS month,
          COUNT(*) AS total,
          SUM(status = 'CONCLUIDA')    AS concluida,
          SUM(status = 'ABERTA')       AS aberta,
          SUM(status = 'EM_ANDAMENTO') AS em_andamento,
          SUM(status = 'CANCELADA')    AS cancelada
        FROM WorkOrder
        WHERE createdAt >= ${start} AND createdAt <= ${end}
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        ORDER BY month ASC
      `;

  res.json(rows.map((r) => ({
    month:       r.month,
    total:       Number(r.total),
    concluida:   Number(r.concluida),
    aberta:      Number(r.aberta),
    emAndamento: Number(r.em_andamento),
    cancelada:   Number(r.cancelada),
  })));
}
