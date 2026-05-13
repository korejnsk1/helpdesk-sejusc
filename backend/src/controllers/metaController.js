import { prisma } from "../config/prisma.js";

export async function listCategories(req, res) {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { subcategories: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
  });
  res.json(categories);
}

export async function listUnits(req, res) {
  const units = await prisma.unit.findMany({ orderBy: { name: "asc" } });
  res.json(units);
}

export async function listTechnicians(req, res) {
  const techs = await prisma.user.findMany({
    where: { active: true, role: { in: ["TECHNICIAN", "ADMIN"] } },
    select: { id: true, name: true, role: true, unitId: true, unit: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  res.json(techs);
}

export async function getPublicConfig(req, res) {
  res.json({
    feedbackEnabled: process.env.FEEDBACK_ENABLED === "true",
  });
}

function slugify(name) {
  return name
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30);
}

export async function updateCategory(req, res) {
  const id = Number(req.params.id);
  const { n1Tips, name, allowsFreeText, slaHours } = req.body;
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) return res.status(404).json({ error: "Categoria não encontrada" });
  const data = {};
  if (n1Tips !== undefined)        data.n1Tips        = n1Tips || null;
  if (allowsFreeText !== undefined) data.allowsFreeText = Boolean(allowsFreeText);
  if (slaHours !== undefined)       data.slaHours       = slaHours ? Number(slaHours) : null;
  if (name !== undefined) {
    const trimmed = name.trim();
    if (!trimmed) return res.status(400).json({ error: "Nome obrigatório" });
    data.name = trimmed;
  }
  const updated = await prisma.category.update({ where: { id }, data,
    include: { subcategories: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
  });
  res.json(updated);
}

export async function createCategory(req, res) {
  const { name, allowsFreeText } = req.body || {};
  const trimmed = name?.trim();
  if (!trimmed) return res.status(400).json({ error: "Nome obrigatório" });

  let code = slugify(trimmed);
  let attempt = 0;
  while (await prisma.category.findUnique({ where: { code } })) {
    attempt++;
    code = `${slugify(trimmed)}_${attempt}`;
  }

  const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (max._max.sortOrder ?? -1) + 1;

  const cat = await prisma.category.create({
    data: { name: trimmed, code, sortOrder, allowsFreeText: Boolean(allowsFreeText) },
    include: { subcategories: true },
  });
  res.status(201).json(cat);
}

export async function deleteCategory(req, res) {
  const id = Number(req.params.id);
  const count = await prisma.ticket.count({ where: { categoryId: id } });
  if (count > 0) {
    return res.status(409).json({ error: `Esta categoria possui ${count} chamado(s) e não pode ser excluída` });
  }
  await prisma.category.delete({ where: { id } });
  res.json({ ok: true });
}

export async function reorderCategories(req, res) {
  const { ids } = req.body || {};
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids deve ser um array" });
  await prisma.$transaction(
    ids.map((id, idx) => prisma.category.update({ where: { id: Number(id) }, data: { sortOrder: idx } }))
  );
  res.json({ ok: true });
}

// ── Subcategorias ─────────────────────────────────────────────────────────────

export async function createSubcategory(req, res) {
  const catId = Number(req.params.catId);
  const { name } = req.body || {};
  const trimmed = name?.trim();
  if (!trimmed) return res.status(400).json({ error: "Nome obrigatório" });
  const cat = await prisma.category.findUnique({ where: { id: catId } });
  if (!cat) return res.status(404).json({ error: "Categoria não encontrada" });
  const max = await prisma.subcategory.aggregate({ where: { categoryId: catId }, _max: { sortOrder: true } });
  const sortOrder = (max._max.sortOrder ?? -1) + 1;
  const sub = await prisma.subcategory.create({ data: { name: trimmed, categoryId: catId, sortOrder } });
  res.status(201).json(sub);
}

export async function updateSubcategory(req, res) {
  const subId = Number(req.params.subId);
  const { name } = req.body || {};
  const trimmed = name?.trim();
  if (!trimmed) return res.status(400).json({ error: "Nome obrigatório" });
  const sub = await prisma.subcategory.findUnique({ where: { id: subId } });
  if (!sub) return res.status(404).json({ error: "Subcategoria não encontrada" });
  const updated = await prisma.subcategory.update({ where: { id: subId }, data: { name: trimmed } });
  res.json(updated);
}

export async function deleteSubcategory(req, res) {
  const subId = Number(req.params.subId);
  const count = await prisma.ticket.count({ where: { subcategoryId: subId } });
  if (count > 0) {
    return res.status(409).json({ error: `Esta subcategoria possui ${count} chamado(s) e não pode ser excluída` });
  }
  await prisma.subcategory.delete({ where: { id: subId } });
  res.json({ ok: true });
}

export async function reorderSubcategories(req, res) {
  const { ids } = req.body || {};
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids deve ser um array" });
  await prisma.$transaction(
    ids.map((id, idx) => prisma.subcategory.update({ where: { id: Number(id) }, data: { sortOrder: idx } }))
  );
  res.json({ ok: true });
}
