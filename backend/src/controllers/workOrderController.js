import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { allowedOsNext, canOsTransition } from "../utils/osStateMachine.js";
import { nextOsSeq } from "../utils/nextSequence.js";

const TIPO_LABELS = {
  VISITA_TECNICA:           "Visita Técnica",
  TROCA_EQUIPAMENTO:        "Troca de Equipamento",
  ENTREGA:                  "Entrega",
  MANUTENCAO_REDE:          "Manutenção de Rede",
  MANUTENCAO_CAMERA:        "Manutenção de Câmera",
  RECOLHIMENTO_EQUIPAMENTO: "Recolhimento de Equipamento",
  ACAO:                     "Ação",
  OUTRO:                    "Outro",
};

function buildOsNumber(seq) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `OS-${y}${m}${day}-${String(seq).padStart(4, "0")}`;
}

function formatOs(os) {
  return {
    id:          os.id,
    osNumber:    os.osNumber,
    tipo:        os.tipo,
    tipoLabel:   TIPO_LABELS[os.tipo] || os.tipo,
    status:      os.status,
    local:       os.local,
    problema:    os.problema,
    materiais:   os.materiais,
    prazo:       os.prazo,
    relatorio:   os.relatorio,
    unit:        os.unit ? { id: os.unit.id, name: os.unit.name } : null,
    createdBy:   os.createdBy ? { id: os.createdBy.id, name: os.createdBy.name } : null,
    tecnicos:    os.tecnicos?.map((t) => ({ id: t.user.id, name: t.user.name, unitId: t.user.unitId })) ?? [],
    tickets:     os.tickets?.map((tw) => ({
      id:           tw.ticket.id,
      ticketNumber: tw.ticket.ticketNumber,
      requesterName: tw.ticket.requesterName,
      department:   tw.ticket.department,
      status:       tw.ticket.status,
    })) ?? [],
    createdAt:   os.createdAt,
    updatedAt:   os.updatedAt,
    startedAt:   os.startedAt,
    concludedAt: os.concludedAt,
    cancelledAt: os.cancelledAt,
    allowedNext: allowedOsNext(os.status),
  };
}

const osInclude = {
  unit:      true,
  createdBy: { select: { id: true, name: true } },
  tecnicos:  { include: { user: { select: { id: true, name: true, unitId: true } } } },
  tickets:   { include: { ticket: { select: { id: true, ticketNumber: true, requesterName: true, department: true, status: true } } } },
};

export async function createWorkOrder(req, res) {
  const schema = z.object({
    tipo:      z.enum(["VISITA_TECNICA","TROCA_EQUIPAMENTO","ENTREGA","MANUTENCAO_REDE","MANUTENCAO_CAMERA","RECOLHIMENTO_EQUIPAMENTO","ACAO","OUTRO"]),
    local:     z.string().min(2).max(300),
    problema:  z.string().max(2000).optional().nullable(),
    materiais: z.string().max(1000).optional().nullable(),
    prazo:     z.string().datetime({ offset: true }).optional().nullable(),
    unitId:    z.number().int().positive().optional().nullable(),
    ticketId:  z.number().int().positive().optional().nullable(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos", details: parsed.error.issues });
  const data = parsed.data;

  const seq = await nextOsSeq();
  const osNumber = buildOsNumber(seq);
  const os = await prisma.workOrder.create({
    data: {
      osNumber,
      tipo:        data.tipo,
      local:       data.local,
      problema:    data.problema ?? null,
      materiais:   data.materiais ?? null,
      prazo:       data.prazo ? new Date(data.prazo) : null,
      unitId:      data.unitId ?? null,
      createdById: req.user.id,
      history: { create: { toStatus: "ABERTA", actorId: req.user.id } },
      ...(data.ticketId ? { tickets: { create: { ticketId: data.ticketId } } } : {}),
    },
    include: osInclude,
  });

  req.app.get("io")?.emit("workorder:created", { osNumber: os.osNumber });
  res.status(201).json(formatOs(os));
}

export async function listWorkOrders(req, res) {
  const { status, unitId, tipo, limit, offset, ticketId } = req.query;
  const where = {};
  if (status)   where.status  = status;
  if (unitId)   where.unitId  = Number(unitId);
  if (tipo)     where.tipo    = tipo;
  if (ticketId) where.tickets = { some: { ticketId: Number(ticketId) } };

  const take = Math.min(Number(limit)  || 100, 500);
  const skip = Math.max(Number(offset) || 0,   0);

  const rows = await prisma.workOrder.findMany({
    where,
    include: osInclude,
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });

  res.json(rows.map(formatOs));
}

export async function getWorkOrder(req, res) {
  const id = Number(req.params.id);
  const os = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      ...osInclude,
      history: {
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!os) return res.status(404).json({ error: "OS não encontrada" });
  res.json({ ...formatOs(os), history: os.history });
}

export async function updateWorkOrder(req, res) {
  const id = Number(req.params.id);
  const schema = z.object({
    local:     z.string().min(2).max(300).optional(),
    problema:  z.string().max(2000).optional().nullable(),
    materiais: z.string().max(1000).optional().nullable(),
    prazo:     z.string().datetime({ offset: true }).optional().nullable(),
    unitId:    z.number().int().positive().optional().nullable(),
    tipo:      z.enum(["VISITA_TECNICA","TROCA_EQUIPAMENTO","ENTREGA","MANUTENCAO_REDE","MANUTENCAO_CAMERA","RECOLHIMENTO_EQUIPAMENTO","ACAO","OUTRO"]).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos", details: parsed.error.issues });

  const os = await prisma.workOrder.findUnique({ where: { id } });
  if (!os) return res.status(404).json({ error: "OS não encontrada" });
  if (os.status === "CONCLUIDA" || os.status === "CANCELADA") {
    return res.status(400).json({ error: "Não é possível editar uma OS concluída ou cancelada" });
  }

  const data = parsed.data;
  const updated = await prisma.workOrder.update({
    where: { id },
    data: {
      ...(data.local     !== undefined ? { local: data.local }         : {}),
      ...(data.problema  !== undefined ? { problema: data.problema }   : {}),
      ...(data.materiais !== undefined ? { materiais: data.materiais } : {}),
      ...(data.unitId    !== undefined ? { unitId: data.unitId }       : {}),
      ...(data.tipo      !== undefined ? { tipo: data.tipo }           : {}),
      prazo: data.prazo !== undefined ? (data.prazo ? new Date(data.prazo) : null) : undefined,
    },
    include: osInclude,
  });

  req.app.get("io")?.emit("workorder:updated", { id });
  res.json(formatOs(updated));
}

export async function transitionWorkOrder(req, res) {
  const id = Number(req.params.id);
  const { toStatus, relatorio, note } = req.body || {};

  const os = await prisma.workOrder.findUnique({ where: { id } });
  if (!os) return res.status(404).json({ error: "OS não encontrada" });

  if (!canOsTransition(os.status, toStatus)) {
    return res.status(400).json({ error: `Transição inválida: ${os.status} → ${toStatus}` });
  }

  const now = new Date();
  const timeFields = {};
  if (toStatus === "EM_ANDAMENTO") timeFields.startedAt   = now;
  if (toStatus === "CONCLUIDA")    timeFields.concludedAt = now;
  if (toStatus === "CANCELADA")    timeFields.cancelledAt = now;

  const updated = await prisma.workOrder.update({
    where: { id },
    data: {
      status: toStatus,
      ...timeFields,
      ...(relatorio !== undefined ? { relatorio } : {}),
      history: { create: { fromStatus: os.status, toStatus, actorId: req.user.id, note: note || null } },
    },
    include: osInclude,
  });

  req.app.get("io")?.emit("workorder:updated", { id });
  res.json(formatOs(updated));
}

export async function addTecnico(req, res) {
  const id     = Number(req.params.id);
  const userId = Number(req.body.userId);
  if (!userId) return res.status(400).json({ error: "userId é obrigatório" });

  const os   = await prisma.workOrder.findUnique({ where: { id } });
  if (!os) return res.status(404).json({ error: "OS não encontrada" });
  if (os.status === "CONCLUIDA" || os.status === "CANCELADA") {
    return res.status(400).json({ error: "Não é possível alterar técnicos de uma OS finalizada" });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !["TECHNICIAN", "ADMIN"].includes(user.role)) {
    return res.status(400).json({ error: "Usuário não encontrado ou não é técnico/admin" });
  }

  await prisma.osTecnico.upsert({
    where: { osId_userId: { osId: id, userId } },
    create: { osId: id, userId },
    update: {},
  });

  const updated = await prisma.workOrder.findUnique({ where: { id }, include: osInclude });
  req.app.get("io")?.emit("workorder:updated", { id });
  res.json(formatOs(updated));
}

export async function removeTecnico(req, res) {
  const id     = Number(req.params.id);
  const userId = Number(req.params.userId);

  await prisma.osTecnico.deleteMany({ where: { osId: id, userId } });
  const updated = await prisma.workOrder.findUnique({ where: { id }, include: osInclude });
  if (!updated) return res.status(404).json({ error: "OS não encontrada" });

  req.app.get("io")?.emit("workorder:updated", { id });
  res.json(formatOs(updated));
}

export async function linkTicket(req, res) {
  const id       = Number(req.params.id);
  const ticketId = Number(req.body.ticketId);
  if (!ticketId) return res.status(400).json({ error: "ticketId é obrigatório" });

  const [os, ticket] = await Promise.all([
    prisma.workOrder.findUnique({ where: { id } }),
    prisma.ticket.findUnique({ where: { id: ticketId } }),
  ]);
  if (!os)     return res.status(404).json({ error: "OS não encontrada" });
  if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });

  await prisma.ticketWorkOrder.upsert({
    where: { ticketId_workOrderId: { ticketId, workOrderId: id } },
    create: { ticketId, workOrderId: id },
    update: {},
  });

  const updated = await prisma.workOrder.findUnique({ where: { id }, include: osInclude });
  req.app.get("io")?.emit("workorder:updated", { id });
  res.json(formatOs(updated));
}

export async function unlinkTicket(req, res) {
  const id       = Number(req.params.id);
  const ticketId = Number(req.params.ticketId);

  await prisma.ticketWorkOrder.deleteMany({ where: { ticketId, workOrderId: id } });
  const updated = await prisma.workOrder.findUnique({ where: { id }, include: osInclude });
  if (!updated) return res.status(404).json({ error: "OS não encontrada" });

  req.app.get("io")?.emit("workorder:updated", { id });
  res.json(formatOs(updated));
}

export async function deleteWorkOrder(req, res) {
  const id = Number(req.params.id);
  const os = await prisma.workOrder.findUnique({ where: { id } });
  if (!os) return res.status(404).json({ error: "OS não encontrada" });

  await prisma.workOrder.delete({ where: { id } });
  req.app.get("io")?.emit("workorder:deleted", { id });
  res.status(204).end();
}
