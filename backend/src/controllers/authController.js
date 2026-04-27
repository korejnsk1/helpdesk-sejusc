import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { stripCpf, isValidCpf, maskCpf } from "../utils/cpf.js";

const normalize = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");

export async function login(req, res) {
  const { cpf, password } = req.body || {};
  if (!cpf || !password) {
    return res.status(400).json({ error: "CPF e senha são obrigatórios" });
  }
  const cleanCpf = stripCpf(cpf);
  if (!isValidCpf(cleanCpf)) {
    return res.status(400).json({ error: "CPF inválido" });
  }

  const user = await prisma.user.findUnique({
    where: { cpf: cleanCpf },
    include: {
      unit: true,
      department: true,
    },
  });
  if (!user || !user.active) {
    return res.status(401).json({ error: "Credenciais inválidas ou conta inativa" });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas ou conta inativa" });

  const expiresIn = process.env.JWT_EXPIRES_IN || "8h";
  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name, unitId: user.unitId },
    process.env.JWT_SECRET,
    { expiresIn }
  );

  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("hd_token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 8 * 60 * 60 * 1000, // 8h em ms
  });

  res.json({
    user: {
      id: user.id,
      name: user.name,
      cpf: maskCpf(user.cpf),
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      unit: user.unit ? { id: user.unit.id, name: user.unit.name } : null,
      department: user.department ? { id: user.department.id, name: user.department.name } : null,
    },
  });
}

export function logout(req, res) {
  res.clearCookie("hd_token", { httpOnly: true, sameSite: "strict" });
  res.json({ ok: true });
}

export async function forgotPassword(req, res) {
  const { cpf, name, phone } = req.body || {};
  if (!cpf || !name || !phone) {
    return res.status(400).json({ error: "CPF, nome e telefone são obrigatórios" });
  }
  const cleanCpf = stripCpf(cpf);
  if (!isValidCpf(cleanCpf)) {
    return res.status(400).json({ error: "CPF inválido" });
  }
  if (!/^\d{10,11}$/.test(phone.replace(/\D/g, ""))) {
    return res.status(400).json({ error: "Telefone inválido" });
  }

  const user = await prisma.user.findUnique({ where: { cpf: cleanCpf } });
  if (!user || !user.active || normalize(user.name) !== normalize(name)) {
    return res.status(400).json({ error: "CPF e nome não correspondem a nenhuma conta ativa" });
  }

  // Cancela solicitações pendentes anteriores do mesmo CPF
  await prisma.passwordResetRequest.updateMany({
    where: { cpf: cleanCpf, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  await prisma.passwordResetRequest.create({
    data: { cpf: cleanCpf, name: user.name, phone: phone.replace(/\D/g, "") },
  });

  res.json({ ok: true });
}

export async function listResetRequests(req, res) {
  const requests = await prisma.passwordResetRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  res.json(requests.map((r) => ({
    id: r.id,
    name: r.name,
    cpf: maskCpf(r.cpf),
    phone: r.phone,
    createdAt: r.createdAt,
  })));
}

export async function resolveResetRequest(req, res) {
  const id = Number(req.params.id);
  const request = await prisma.passwordResetRequest.findUnique({ where: { id } });
  if (!request || request.status !== "PENDING") {
    return res.status(404).json({ error: "Solicitação não encontrada ou já resolvida" });
  }

  const user = await prisma.user.findUnique({ where: { cpf: request.cpf } });
  if (!user || !user.active) {
    return res.status(400).json({ error: "Usuário não encontrado ou inativo" });
  }

  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const tempPassword = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");

  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: true },
  });

  await prisma.passwordResetRequest.update({
    where: { id },
    data: { status: "RESOLVED", resolvedAt: new Date(), resolvedById: req.user.id },
  });

  res.json({ ok: true, tempPassword, phone: request.phone, name: request.name });
}

export async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { unit: true, department: true },
  });
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
  res.json({
    id: user.id,
    name: user.name,
    cpf: maskCpf(user.cpf),
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    unit: user.unit ? { id: user.unit.id, name: user.unit.name } : null,
    department: user.department ? { id: user.department.id, name: user.department.name } : null,
  });
}
