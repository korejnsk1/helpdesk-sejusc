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

export async function topRequesters(req, res) {
  const where = { ...parseRange(req.query), openedById: { not: null } };
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

  const rows = await prisma.$queryRaw`
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
