import { z } from "zod";
import { prisma } from "../config/prisma.js";

const schema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(100),
});

// GET /api/departments — público (usado no formulário de abertura de chamado)
export async function listDepartments(req, res) {
  const depts = await prisma.department.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  res.json(depts);
}

// GET /api/departments/all — todos (admin)
export async function listAllDepartments(req, res) {
  const depts = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tickets: true } } },
  });
  res.json(depts);
}

// POST /api/departments — admin
export async function createDepartment(req, res) {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { name } = parsed.data;
  const exists = await prisma.department.findUnique({ where: { name: name.trim() } });
  if (exists) return res.status(409).json({ error: "Setor já cadastrado" });

  const dept = await prisma.department.create({ data: { name: name.trim() } });
  res.status(201).json(dept);
}

// PATCH /api/departments/:id — admin
export async function updateDepartment(req, res) {
  const id = Number(req.params.id);
  const { name, active } = req.body || {};

  const dept = await prisma.department.findUnique({ where: { id } });
  if (!dept) return res.status(404).json({ error: "Setor não encontrado" });

  const data = {};
  if (name !== undefined) {
    const parsed = schema.safeParse({ name });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    data.name = name.trim();
  }
  if (active !== undefined) data.active = Boolean(active);

  const updated = await prisma.department.update({ where: { id }, data });
  res.json(updated);
}

// DELETE /api/departments/:id — admin
export async function deleteDepartment(req, res) {
  const id = Number(req.params.id);
  const dept = await prisma.department.findUnique({
    where: { id },
    include: { _count: { select: { tickets: true } } },
  });
  if (!dept) return res.status(404).json({ error: "Setor não encontrado" });
  if (dept._count.tickets > 0) {
    return res.status(400).json({
      error: `Não é possível excluir: ${dept._count.tickets} chamado(s) vinculado(s). Desative o setor ao invés disso.`,
    });
  }

  await prisma.department.delete({ where: { id } });
  res.json({ ok: true });
}
