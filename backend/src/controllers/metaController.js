import { prisma } from "../config/prisma.js";

export async function listCategories(req, res) {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { subcategories: { orderBy: { name: "asc" } } },
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

export async function updateCategory(req, res) {
  const id = Number(req.params.id);
  const { n1Tips } = req.body;
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) return res.status(404).json({ error: "Categoria não encontrada" });
  const updated = await prisma.category.update({
    where: { id },
    data: { n1Tips: n1Tips !== undefined ? (n1Tips || null) : undefined },
  });
  res.json(updated);
}
