import { prisma } from "../config/prisma.js";

function parseRange(q) {
  const where = {};
  if (q.from || q.to) {
    where.openedAt = {};
    if (q.from) where.openedAt.gte = new Date(q.from);
    if (q.to) where.openedAt.lte = new Date(q.to);
  }
  return where;
}

export async function ticketsByUnit(req, res) {
  const where = parseRange(req.query);
  const data = await prisma.ticket.groupBy({
    by: ["unitId"],
    where,
    _count: { _all: true },
  });
  const units = await prisma.unit.findMany();
  const map = new Map(units.map((u) => [u.id, u.name]));
  res.json(
    data.map((d) => ({
      unitId: d.unitId,
      unit: d.unitId ? map.get(d.unitId) : "Sem unidade",
      total: d._count._all,
    }))
  );
}

export async function ticketsByTechnician(req, res) {
  const where = parseRange(req.query);
  const data = await prisma.ticket.groupBy({
    by: ["assignedTechId"],
    where,
    _count: { _all: true },
  });
  const techs = await prisma.user.findMany({ select: { id: true, name: true } });
  const map = new Map(techs.map((t) => [t.id, t.name]));
  res.json(
    data.map((d) => ({
      technicianId: d.assignedTechId,
      technician: d.assignedTechId ? map.get(d.assignedTechId) : "Não atribuído",
      total: d._count._all,
    }))
  );
}

export async function ticketsByDepartment(req, res) {
  const where = parseRange(req.query);
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
  const where = parseRange(req.query);
  const data = await prisma.ticket.groupBy({
    by: ["categoryId"],
    where,
    _count: { _all: true },
  });
  const cats = await prisma.category.findMany();
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
  const where = { ...parseRange(req.query), status: "COMPLETED" };
  const tickets = await prisma.ticket.findMany({
    where,
    select: { categoryId: true, openedAt: true, completedAt: true },
  });
  const cats = await prisma.category.findMany();
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

export async function otherReclassified(req, res) {
  const where = {
    ...parseRange(req.query),
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
