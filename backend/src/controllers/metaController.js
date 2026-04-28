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
    where: { active: true, role: { in: ["TECHNICIAN", "MONITOR", "ADMIN"] } },
    select: { id: true, name: true, unitId: true, unit: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  res.json(techs);
}

export async function getPublicConfig(req, res) {
  res.json({
    feedbackEnabled: process.env.FEEDBACK_ENABLED === "true",
  });
}
