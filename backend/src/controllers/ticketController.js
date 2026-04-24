import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { stripCpf, isValidCpf, maskCpf } from "../utils/cpf.js";
import { buildTicketNumber } from "../utils/ticketNumber.js";
import { STATUS, canTransition, allowedNext } from "../utils/ticketStateMachine.js";
import { exportTicketToGlpi } from "../services/glpiService.js";

const createTicketSchema = z.object({
  requesterName: z.string().min(3, "Nome muito curto"),
  requesterCpf: z.string(),
  departmentId: z.number().int().positive("Selecione um setor"),
  categoryId: z.number().int().positive(),
  subcategoryId: z.number().int().positive().optional().nullable(),
  freeTextDescription: z.string().optional().nullable(),
  anyDeskCode: z.string().optional().nullable(),
});

export async function createTicket(req, res) {
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados inválidos", details: parsed.error.issues });
  }
  const data = parsed.data;
  const cleanCpf = stripCpf(data.requesterCpf);
  if (!isValidCpf(cleanCpf)) {
    return res.status(400).json({ error: "CPF inválido" });
  }

  // Valida e busca o nome do setor
  const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
  if (!dept || !dept.active) {
    return res.status(400).json({ error: "Setor inválido ou inativo" });
  }

  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
    include: { subcategories: true },
  });
  if (!category) return res.status(400).json({ error: "Categoria inexistente" });

  const isRemote = category.code === "REMOTE";

  if (isRemote) {
    if (!data.anyDeskCode || data.anyDeskCode.trim().length < 3) {
      return res.status(400).json({ error: "Informe o código do AnyDesk (mínimo 3 caracteres)" });
    }
  } else if (category.allowsFreeText) {
    if (!data.freeTextDescription || data.freeTextDescription.trim().length < 5) {
      return res.status(400).json({ error: "Descreva o problema (mínimo 5 caracteres)" });
    }
  } else {
    if (!data.subcategoryId) {
      return res.status(400).json({ error: "Subcategoria é obrigatória" });
    }
    const sub = category.subcategories.find((s) => s.id === data.subcategoryId);
    if (!sub) return res.status(400).json({ error: "Subcategoria inválida para essa categoria" });
  }

  // Generate next sequence number for the day
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const countToday = await prisma.ticket.count({
    where: { openedAt: { gte: startOfDay } },
  });
  const ticketNumber = buildTicketNumber(countToday + 1);

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      requesterName: data.requesterName.trim(),
      requesterCpf: cleanCpf,
      department: dept.name,
      departmentId: dept.id,
      categoryId: data.categoryId,
      subcategoryId: (!isRemote && !category.allowsFreeText) ? data.subcategoryId : null,
      freeTextDescription: (!isRemote && category.allowsFreeText) ? data.freeTextDescription.trim() : null,
      anyDeskCode: isRemote ? data.anyDeskCode.trim() : null,
      status: STATUS.OPEN,
      history: {
        create: { toStatus: STATUS.OPEN },
      },
    },
  });

  req.app.get("io")?.emit("ticket:created", { ticketNumber: ticket.ticketNumber });

  res.status(201).json({
    ticketNumber: ticket.ticketNumber,
    openedAt: ticket.openedAt,
  });
}

export async function getTicketPublic(req, res) {
  const { ticketNumber } = req.params;
  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber },
    include: {
      category: true,
      subcategory: true,
      unit: true,
      assignedTech: { select: { name: true } },
      feedback: true,
    },
  });
  if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });

  res.json({
    ticketNumber: ticket.ticketNumber,
    status: ticket.status,
    requesterName: ticket.requesterName,
    requesterCpf: maskCpf(ticket.requesterCpf),
    department: ticket.department,
    category: ticket.category?.name,
    subcategory: ticket.subcategory?.name,
    freeTextDescription: ticket.freeTextDescription,
    anyDeskCode: ticket.anyDeskCode || null,
    isRemote: !!(ticket.anyDeskCode),
    unit: ticket.unit?.name || null,
    technician: ticket.assignedTech?.name || null,
    openedAt: ticket.openedAt,
    viewedAt: ticket.viewedAt,
    enRouteAt: ticket.enRouteAt,
    inServiceAt: ticket.inServiceAt,
    completedAt: ticket.completedAt,
    hasFeedback: !!ticket.feedback,
  });
}

export async function listTickets(req, res) {
  const { status, unitId, technicianId, from, to, categoryId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (unitId) where.unitId = Number(unitId);
  if (technicianId) where.assignedTechId = Number(technicianId);
  if (categoryId) where.categoryId = Number(categoryId);
  if (from || to) {
    where.openedAt = {};
    if (from) where.openedAt.gte = new Date(from);
    if (to) where.openedAt.lte = new Date(to);
  }

  // Technicians see only their unit + their assigned tickets
  if (req.user.role === "TECHNICIAN") {
    where.OR = [
      { assignedTechId: req.user.id },
      { unitId: req.user.unitId || -1 },
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      category: true,
      subcategory: true,
      unit: true,
      assignedTech: { select: { id: true, name: true } },
    },
    orderBy: { openedAt: "asc" },
    take: 500,
  });
  res.json(tickets.map(formatTicket));
}

export async function getTicket(req, res) {
  const id = Number(req.params.id);
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      category: true,
      subcategory: true,
      unit: true,
      assignedTech: { select: { id: true, name: true } },
      history: {
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      feedback: true,
    },
  });
  if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });
  res.json({
    ...formatTicket(ticket),
    anyDeskCode: ticket.anyDeskCode || null,
    isRemote: !!(ticket.anyDeskCode),
    cause: ticket.cause,
    solution: ticket.solution,
    history: ticket.history,
    allowedNext: allowedNext(ticket.status),
    feedback: ticket.feedback,
  });
}

function formatTicket(t) {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    requesterName: t.requesterName,
    requesterCpf: maskCpf(t.requesterCpf),
    department: t.department,
    category: t.category ? { id: t.category.id, name: t.category.name } : null,
    subcategory: t.subcategory ? { id: t.subcategory.id, name: t.subcategory.name } : null,
    freeTextDescription: t.freeTextDescription,
    anyDeskCode: t.anyDeskCode || null,
    isRemote: !!(t.anyDeskCode),
    status: t.status,
    unit: t.unit ? { id: t.unit.id, name: t.unit.name } : null,
    technician: t.assignedTech || null,
    openedAt: t.openedAt,
    viewedAt: t.viewedAt,
    enRouteAt: t.enRouteAt,
    inServiceAt: t.inServiceAt,
    completedAt: t.completedAt,
  };
}

export async function transitionTicket(req, res) {
  const id = Number(req.params.id);
  const { toStatus, unitId, assignedTechId, internalNote, cause, solution } = req.body || {};

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });

  if (!canTransition(ticket.status, toStatus)) {
    return res.status(400).json({
      error: `Transição inválida: ${ticket.status} → ${toStatus}`,
    });
  }

  // Only monitors can transition tickets
  if (!["MONITOR", "ADMIN"].includes(req.user.role)) {
    return res.status(403).json({ error: "Apenas o monitor de plantão pode alterar o status" });
  }

  const updateData = { status: toStatus };
  const now = new Date();

  if (toStatus === STATUS.VIEWED) {
    updateData.viewedAt = now;
    if (!unitId || !assignedTechId) {
      return res.status(400).json({ error: "Unidade e técnico são obrigatórios ao visualizar" });
    }
    updateData.unitId = Number(unitId);
    updateData.assignedTechId = Number(assignedTechId);
  }
  if (toStatus === STATUS.EN_ROUTE) updateData.enRouteAt = now;
  if (toStatus === STATUS.IN_SERVICE) updateData.inServiceAt = now;
  if (toStatus === STATUS.COMPLETED) {
    if (!cause || !solution) {
      return res.status(400).json({ error: "Causa e solução são obrigatórias para concluir" });
    }
    updateData.completedAt = now;
    updateData.cause = cause;
    updateData.solution = solution;
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      ...updateData,
      history: {
        create: {
          fromStatus: ticket.status,
          toStatus,
          actorId: req.user.id,
          internalNote: internalNote || null,
        },
      },
    },
  });

  req.app.get("io")?.emit("ticket:updated", {
    ticketNumber: updated.ticketNumber,
    status: updated.status,
  });

  // Exportação para o GLPI ocorre em background ao concluir
  if (toStatus === STATUS.COMPLETED && process.env.GLPI_ENABLED === "true") {
    const full = await prisma.ticket.findUnique({
      where: { id: updated.id },
      include: { category: true, subcategory: true, unit: true, assignedTech: true },
    });
    exportTicketToGlpi(full)
      .then(async (r) => {
        if (r?.glpiTicketId) {
          await prisma.ticket.update({
            where: { id: updated.id },
            data: { glpiExportedAt: new Date(), glpiTicketId: r.glpiTicketId },
          });
        }
      })
      .catch((err) => console.error("Erro ao exportar para GLPI:", err));
  }

  res.json({ ok: true, status: updated.status });
}

// DELETE /api/tickets/:id — apenas ADMIN, apenas COMPLETED
export async function deleteTicket(req, res) {
  const id = Number(req.params.id);
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });
  if (ticket.status !== "COMPLETED") {
    return res.status(400).json({ error: "Apenas chamados concluídos podem ser excluídos" });
  }
  // Remove registros relacionados antes (histórico + feedback)
  await prisma.ticketHistory.deleteMany({ where: { ticketId: id } });
  await prisma.feedback.deleteMany({ where: { ticketId: id } });
  await prisma.ticket.delete({ where: { id } });
  res.json({ ok: true });
}

export async function submitFeedback(req, res) {
  if (process.env.FEEDBACK_ENABLED !== "true") {
    return res.status(404).json({ error: "Módulo de avaliação desativado" });
  }
  const { ticketNumber } = req.params;
  const { rating, comment } = req.body || {};
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return res.status(400).json({ error: "Avaliação deve ser entre 1 e 5" });
  }
  const ticket = await prisma.ticket.findUnique({ where: { ticketNumber } });
  if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });
  if (ticket.status !== STATUS.COMPLETED) {
    return res.status(400).json({ error: "Chamado ainda não foi concluído" });
  }
  const existing = await prisma.feedback.findUnique({ where: { ticketId: ticket.id } });
  if (existing) return res.status(400).json({ error: "Avaliação já enviada" });

  const fb = await prisma.feedback.create({
    data: { ticketId: ticket.id, rating: r, comment: comment || null },
  });
  res.status(201).json({ ok: true, id: fb.id });
}
