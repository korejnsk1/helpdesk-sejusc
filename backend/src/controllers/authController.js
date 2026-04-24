import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { stripCpf, isValidCpf, maskCpf } from "../utils/cpf.js";

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

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name, unitId: user.unitId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );

  res.json({
    token,
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
