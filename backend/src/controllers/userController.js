import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { stripCpf, isValidCpf } from "../utils/cpf.js";

const registerSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  cpf: z.string(),
  password: z.string().min(6, "Senha mínima de 6 caracteres"),
  unitId: z.number().int().positive().optional().nullable(),
});

// POST /api/auth/register — público, cria técnico pendente de aprovação
export async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados inválidos", details: parsed.error.issues });
  }
  const { name, password, unitId } = parsed.data;
  const cleanCpf = stripCpf(parsed.data.cpf);
  if (!isValidCpf(cleanCpf)) {
    return res.status(400).json({ error: "CPF inválido" });
  }
  const exists = await prisma.user.findUnique({ where: { cpf: cleanCpf } });
  if (exists) {
    return res.status(409).json({ error: "CPF já cadastrado" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      cpf: cleanCpf,
      passwordHash,
      role: "TECHNICIAN",
      active: false, // aguarda aprovação do monitor
      unitId: unitId || null,
    },
  });
  res.status(201).json({
    ok: true,
    message: "Cadastro enviado. Aguarde a aprovação do monitor de plantão.",
    id: user.id,
  });
}

// GET /api/users — lista técnicos (monitor only)
export async function listUsers(req, res) {
  const { role, active } = req.query;
  const where = {};
  if (role) where.role = role;
  if (active !== undefined) where.active = active === "true";

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      cpf: true,
      role: true,
      active: true,
      createdAt: true,
      unit: { select: { id: true, name: true } },
    },
    orderBy: [{ active: "asc" }, { createdAt: "desc" }],
  });
  res.json(users);
}

// PATCH /api/users/:id — atualiza técnico (monitor only)
export async function updateUser(req, res) {
  const id = Number(req.params.id);
  const { active, unitId, role } = req.body || {};

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

  // Monitor não pode alterar o próprio papel nem desativar a si mesmo
  if (id === req.user.id && active === false) {
    return res.status(400).json({ error: "Você não pode desativar sua própria conta" });
  }

  const data = {};
  if (active !== undefined) data.active = active;
  if (unitId !== undefined) data.unitId = unitId ? Number(unitId) : null;

  if (role !== undefined) {
    const validRoles = ["MONITOR", "TECHNICIAN", "ADMIN"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Papel inválido" });
    }
    // Apenas ADMIN pode conceder ou revogar papel de ADMIN
    if ((role === "ADMIN" || user.role === "ADMIN") && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Apenas administradores podem alterar permissões de administrador" });
    }
    // Não pode remover o próprio ADMIN
    if (id === req.user.id && role !== "ADMIN") {
      return res.status(400).json({ error: "Você não pode remover sua própria permissão de administrador" });
    }
    data.role = role;
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    include: { unit: { select: { id: true, name: true } } },
  });

  res.json({
    id: updated.id,
    name: updated.name,
    role: updated.role,
    active: updated.active,
    unit: updated.unit,
  });
}

// DELETE /api/users/:id — exclui usuário (ADMIN only)
export async function deleteUser(req, res) {
  const id = Number(req.params.id);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

  if (id === req.user.id) {
    return res.status(400).json({ error: "Você não pode excluir sua própria conta" });
  }

  // Não permite excluir outro ADMIN
  if (user.role === "ADMIN") {
    return res.status(403).json({ error: "Não é possível excluir um administrador" });
  }

  await prisma.user.delete({ where: { id } });
  res.json({ ok: true, message: "Usuário excluído com sucesso" });
}

// GET /api/monitors — monitores ativos (para exibir no dashboard)
export async function listMonitors(req, res) {
  const monitors = await prisma.user.findMany({
    where: { role: "MONITOR", active: true },
    select: { id: true, name: true, unit: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  res.json(monitors);
}
