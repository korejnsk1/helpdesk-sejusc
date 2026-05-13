import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { maskCpf } from "../utils/cpf.js";
import { buildTicketNumber } from "../utils/ticketNumber.js";
import { nextTicketSeq } from "../utils/nextSequence.js";
import { STATUS, canTransition, allowedNext, canReopen } from "../utils/ticketStateMachine.js";

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const createTicketSchema = z.object({
  departmentId:        z.number().int().positive().optional().nullable(),
  categoryId:          z.number().int().positive(),
  subcategoryId:       z.number().int().positive().optional().nullable(),
  freeTextDescription: z.string().max(2000).optional().nullable(),
  anyDeskCode:         z.string().max(20).optional().nullable(),
  extraData:           z.record(z.unknown()).optional().nullable(),
  priority:            z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
});

export async function createTicket(req, res) {
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados inválidos", details: parsed.error.issues });
  }
  const data = parsed.data;

  const requester = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!requester || !requester.active) {
    return res.status(401).json({ error: "Usuário não encontrado" });
  }

  const deptId = data.departmentId || requester.departmentId;
  if (!deptId) return res.status(400).json({ error: "Selecione um setor" });

  const dept = await prisma.department.findUnique({ where: { id: deptId } });
  if (!dept || !dept.active) {
    return res.status(400).json({ error: "Setor inválido ou inativo" });
  }

  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
    include: { subcategories: true },
  });
  if (!category) return res.status(400).json({ error: "Categoria inexistente" });

  const isRemote    = category.code === "REMOTE";
  const selectedSub = (!isRemote && data.subcategoryId)
    ? category.subcategories.find((s) => s.id === data.subcategoryId)
    : null;
  const isOutro = selectedSub?.name === "Outro";

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
    if (!selectedSub) return res.status(400).json({ error: "Subcategoria inválida para essa categoria" });
    if (isOutro && (!data.freeTextDescription || data.freeTextDescription.trim().length < 5)) {
      return res.status(400).json({ error: "Descreva o problema (mínimo 5 caracteres)" });
    }
  }

  // ── Flags da subcategoria ────────────────────────────────────────────────
  const requiresApproval      = selectedSub?.requiresApproval      ?? false;
  const dualApproval          = selectedSub?.dualApproval           ?? false;
  const requiresPresential    = isRemote ? false : (selectedSub?.requiresPresential    ?? true);
  const requiresCauseSolution = isRemote ? true  : (selectedSub?.requiresCauseSolution ?? true);

  // Para aprovação dupla (SIGED_SECTOR_MOVE), o targetDeptId vem em extraData
  const extraData   = data.extraData ?? null;
  const targetDeptId = dualApproval && extraData?.targetDeptId
    ? Number(extraData.targetDeptId)
    : null;

  // Valida setor alvo para aprovação dupla
  if (dualApproval && !targetDeptId) {
    return res.status(400).json({ error: "Selecione o setor de destino para a realocação" });
  }
  if (targetDeptId) {
    const targetDept = await prisma.department.findUnique({ where: { id: targetDeptId } });
    if (!targetDept || !targetDept.active) {
      return res.status(400).json({ error: "Setor de destino inválido ou inativo" });
    }
  }

  // ── Monta registros de aprovação ────────────────────────────────────────
  const approvalRecords = requiresApproval
    ? [
        { chefDeptId: deptId },
        ...(targetDeptId ? [{ chefDeptId: targetDeptId }] : []),
      ]
    : [];

  const slaDeadline = category.slaHours
    ? new Date(Date.now() + category.slaHours * 60 * 60 * 1000)
    : null;

  const ticketPayload = {
    requesterName:       requester.name,
    requesterCpf:        requester.cpf,
    department:          dept.name,
    departmentId:        dept.id,
    priority:            data.priority ?? "MEDIUM",
    slaDeadline,
    categoryId:          data.categoryId,
    subcategoryId:       (!isRemote && !category.allowsFreeText) ? data.subcategoryId : null,
    freeTextDescription: isRemote
      ? (data.freeTextDescription?.trim() || null)
      : (!isRemote && (category.allowsFreeText || isOutro))
        ? data.freeTextDescription.trim()
        : (data.freeTextDescription?.trim() || null),
    anyDeskCode:    isRemote ? data.anyDeskCode.trim() : null,
    extraData,
    presential:            requiresPresential,
    requiresCauseSolution: requiresCauseSolution,
    approvalStatus: requiresApproval ? "PENDING" : "NOT_REQUIRED",
    openedById:     req.user?.id ?? null,
    status:         STATUS.OPEN,
    history: { create: { toStatus: STATUS.OPEN } },
    ...(approvalRecords.length > 0 && {
      approvals: { create: approvalRecords },
    }),
  };

  const seq          = await nextTicketSeq();
  const ticketNumber = buildTicketNumber(seq);
  const ticket       = await prisma.ticket.create({ data: { ticketNumber, ...ticketPayload } });

  req.app.get("io")?.emit("ticket:created", { ticketNumber: ticket.ticketNumber });

  res.status(201).json({
    ticketNumber: ticket.ticketNumber,
    openedAt:     ticket.openedAt,
    approvalStatus: ticket.approvalStatus,
  });
}

// ── GET público ──────────────────────────────────────────────────────────────
export async function getTicketPublic(req, res) {
  const { ticketNumber } = req.params;
  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber },
    include: {
      category:   true,
      subcategory: true,
      unit:        true,
      assignedTech: { select: { name: true } },
      feedback:    true,
    },
  });
  if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });

  res.json({
    ticketNumber:        ticket.ticketNumber,
    status:              ticket.status,
    approvalStatus:      ticket.approvalStatus,
    requesterName:       ticket.requesterName,
    requesterCpf:        maskCpf(ticket.requesterCpf),
    department:          ticket.department,
    category:            ticket.category?.name,
    subcategory:         ticket.subcategory?.name,
    freeTextDescription: ticket.freeTextDescription,
    anyDeskCode:         ticket.anyDeskCode || null,
    isRemote:            !!(ticket.anyDeskCode),
    unit:                ticket.unit?.name || null,
    technician:          ticket.assignedTech?.name || null,
    openedAt:            ticket.openedAt,
    viewedAt:            ticket.viewedAt,
    enRouteAt:           ticket.enRouteAt,
    inServiceAt:         ticket.inServiceAt,
    completedAt:         ticket.completedAt,
    hasFeedback:         !!ticket.feedback,
  });
}

// ── LIST ─────────────────────────────────────────────────────────────────────
export async function listTickets(req, res) {
  const { status, unitId, technicianId, from, to, categoryId, cursor, limit, search } = req.query;
  const where = {};

  if (status)       where.status      = status;
  if (unitId)       where.unitId      = Number(unitId);
  if (technicianId) where.assignedTechId = Number(technicianId);
  if (categoryId)   where.categoryId  = Number(categoryId);
  if (from || to) {
    where.openedAt = {};
    if (from) where.openedAt.gte = new Date(from);
    if (to)   where.openedAt.lte = new Date(to);
  }
  if (search) {
    const q = search.trim();
    where.OR = [
      { ticketNumber:        { contains: q } },
      { requesterName:       { contains: q } },
      { freeTextDescription: { contains: q } },
      { department:          { contains: q } },
    ];
  }

  // ── Filtros por role ────────────────────────────────────────────────────
  if (req.user.role === "CHEFE_SETOR") {
    // Chefe vê apenas chamados PENDENTES da aprovação do seu setor
    const chefeUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { departmentId: true },
    });
    if (!chefeUser?.departmentId) return res.json({ tickets: [], nextCursor: null });

    where.approvalStatus = "PENDING";
    where.approvals = {
      some: { chefDeptId: chefeUser.departmentId, status: "PENDING" },
    };
  } else if (req.user.role === "TECHNICIAN") {
    // Técnico não vê chamados aguardando aprovação
    where.approvalStatus = { not: "PENDING" };
    const techUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { unitId: true } });
    where.OR = [
      { assignedTechId: req.user.id },
      { unitId: techUser?.unitId || -1 },
    ];
  }
  // ADMIN vê tudo (sem filtro adicional)

  const take        = Math.min(Number(limit) || 200, 500);
  const cursorClause = cursor ? { cursor: { id: Number(cursor) }, skip: 1 } : {};

  const rows = await prisma.ticket.findMany({
    where,
    include: {
      category:    true,
      subcategory: true,
      unit:        true,
      assignedTech: { select: { id: true, name: true } },
      approvals: {
        include: {
          chefDept: { select: { name: true } },
          chefUser: { select: { name: true } },
        },
      },
    },
    orderBy: { openedAt: "asc" },
    take:    take + 1,
    ...cursorClause,
  });

  const hasMore   = rows.length > take;
  const tickets   = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? tickets[tickets.length - 1].id : null;

  res.json({ tickets: tickets.map(formatTicket), nextCursor });
}

// ── DETAIL ────────────────────────────────────────────────────────────────────
export async function getTicket(req, res) {
  const id = Number(req.params.id);
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      category:    true,
      subcategory: true,
      unit:        true,
      assignedTech: { select: { id: true, name: true } },
      history: {
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      feedback: true,
      comments: {
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      approvals: {
        include: {
          chefDept: { select: { id: true, name: true } },
          chefUser: { select: { name: true } },
        },
      },
    },
  });
  if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });
  res.json({
    ...formatTicket(ticket),
    anyDeskCode:  ticket.anyDeskCode || null,
    isRemote:     !!(ticket.anyDeskCode),
    cause:        ticket.cause,
    solution:     ticket.solution,
    history:      ticket.history,
    comments:     ticket.comments,
    allowedNext:  allowedNext(ticket.status),
    feedback:     ticket.feedback,
  });
}

// ── APPROVE / REJECT (Chefe de Setor ou Admin) ────────────────────────────────
export async function approveTicket(req, res) {
  const id = Number(req.params.id);
  const { status, note } = req.body || {};

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ error: "Status inválido. Use APPROVED ou REJECTED." });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { approvals: true },
  });
  if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });
  if (ticket.approvalStatus !== "PENDING") {
    return res.status(400).json({ error: "Este chamado não está aguardando aprovação." });
  }

  // Determina qual registro de aprovação atualizar
  let targetApproval = null;

  if (req.user.role === "ADMIN") {
    // Admin pode aprovar qualquer pendência
    targetApproval = ticket.approvals.find((a) => a.status === "PENDING");
  } else {
    // Chefe de Setor: busca o registro do seu departamento
    const chefeUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { departmentId: true },
    });
    if (!chefeUser?.departmentId) {
      return res.status(403).json({ error: "Você não está associado a nenhum setor." });
    }
    targetApproval = ticket.approvals.find(
      (a) => a.chefDeptId === chefeUser.departmentId && a.status === "PENDING"
    );
  }

  if (!targetApproval) {
    return res.status(403).json({ error: "Você não tem uma aprovação pendente neste chamado." });
  }

  await prisma.ticketApproval.update({
    where: { id: targetApproval.id },
    data: {
      status,
      note:      note || null,
      decidedAt: new Date(),
      chefUserId: req.user.id,
    },
  });

  // Recalcula o status geral de aprovação
  const allApprovals = await prisma.ticketApproval.findMany({ where: { ticketId: id } });
  let newApprovalStatus;
  if (allApprovals.some((a) => a.status === "REJECTED")) {
    newApprovalStatus = "REJECTED";
  } else if (allApprovals.every((a) => a.status === "APPROVED")) {
    newApprovalStatus = "APPROVED";
  } else {
    newApprovalStatus = "PENDING"; // ainda há pendências (dual approval)
  }

  await prisma.ticket.update({
    where: { id },
    data: { approvalStatus: newApprovalStatus },
  });

  req.app.get("io")?.emit("ticket:approval", {
    ticketId:       id,
    approvalStatus: newApprovalStatus,
  });

  res.json({ ok: true, approvalStatus: newApprovalStatus });
}

// ── TRANSITION ────────────────────────────────────────────────────────────────
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

  if (!["TECHNICIAN", "ADMIN"].includes(req.user.role)) {
    return res.status(403).json({ error: "Apenas técnicos e administradores podem alterar o status" });
  }

  if (req.user.role === "TECHNICIAN" && ticket.assignedTechId !== null && ticket.assignedTechId !== req.user.id) {
    return res.status(403).json({ error: "Este chamado está atribuído a outro técnico" });
  }

  // Bloqueia transição se aprovação ainda pendente ou rejeitada
  if (toStatus === STATUS.VIEWED) {
    if (ticket.approvalStatus === "PENDING") {
      return res.status(400).json({ error: "Este chamado aguarda aprovação do Chefe de Setor antes de ser atendido." });
    }
    if (ticket.approvalStatus === "REJECTED") {
      return res.status(400).json({ error: "Este chamado foi reprovado pelo Chefe de Setor e não pode ser atendido." });
    }
  }

  const updateData = { status: toStatus };
  const now = new Date();

  if (toStatus === STATUS.VIEWED) {
    updateData.viewedAt = now;
    if (!unitId || !assignedTechId) {
      return res.status(400).json({ error: "Unidade e técnico são obrigatórios ao visualizar" });
    }
    updateData.unitId          = Number(unitId);
    updateData.assignedTechId  = Number(assignedTechId);
  }
  if (toStatus === STATUS.EN_ROUTE)   updateData.enRouteAt   = now;
  if (toStatus === STATUS.IN_SERVICE) updateData.inServiceAt = now;
  if (toStatus === STATUS.COMPLETED) {
    if (ticket.requiresCauseSolution && (!cause || !solution)) {
      return res.status(400).json({ error: "Causa e solução são obrigatórias para concluir" });
    }
    updateData.completedAt = now;
    updateData.cause       = cause   || null;
    updateData.solution    = solution || null;
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      ...updateData,
      history: {
        create: {
          fromStatus:   ticket.status,
          toStatus,
          actorId:      req.user.id,
          internalNote: internalNote || null,
        },
      },
    },
  });

  req.app.get("io")?.emit("ticket:updated", {
    ticketNumber: updated.ticketNumber,
    status:       updated.status,
  });

  res.json({ ok: true, status: updated.status });
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function deleteTicket(req, res) {
  const id = Number(req.params.id);
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });
  await prisma.ticket.delete({ where: { id } });
  req.app.get("io")?.emit("ticket:deleted", { id });
  res.json({ ok: true });
}

// ── FEEDBACK ─────────────────────────────────────────────────────────────────
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

// ── REOPEN ────────────────────────────────────────────────────────────────────
export async function reopenTicket(req, res) {
  const id = Number(req.params.id);
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });
  if (!canReopen(ticket.status)) {
    return res.status(400).json({ error: "Apenas chamados concluídos podem ser reabertos" });
  }

  // Usuário comum só pode reabrir o próprio chamado
  if (req.user.role === "USER" && ticket.openedById !== req.user.id) {
    return res.status(403).json({ error: "Você não tem permissão para reabrir este chamado" });
  }

  const { reason } = req.body || {};

  await prisma.ticket.update({
    where: { id },
    data: {
      status:      STATUS.OPEN,
      completedAt: null,
      cause:       null,
      solution:    null,
      history: {
        create: {
          fromStatus:   STATUS.COMPLETED,
          toStatus:     STATUS.OPEN,
          actorId:      req.user.id,
          internalNote: reason ? `Reaberto: ${reason}` : "Chamado reaberto",
        },
      },
    },
  });

  req.app.get("io")?.emit("ticket:updated", { ticketNumber: ticket.ticketNumber, status: STATUS.OPEN });
  res.json({ ok: true });
}

// ── ASSIGN (transferir técnico/unidade sem mudar status) ──────────────────────
export async function assignTicket(req, res) {
  const id = Number(req.params.id);
  const { assignedTechId, unitId } = req.body || {};
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });
  if (ticket.status === STATUS.OPEN || ticket.status === STATUS.COMPLETED) {
    return res.status(400).json({ error: "Chamado precisa estar em andamento para transferir" });
  }

  const patch = {};
  if (assignedTechId !== undefined) patch.assignedTechId = assignedTechId ? Number(assignedTechId) : null;
  if (unitId !== undefined)         patch.unitId         = unitId         ? Number(unitId)         : null;

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      ...patch,
      history: {
        create: {
          fromStatus:   ticket.status,
          toStatus:     ticket.status,
          actorId:      req.user.id,
          internalNote: "Transferência de responsabilidade",
        },
      },
    },
    include: { assignedTech: { select: { id: true, name: true } }, unit: true },
  });

  req.app.get("io")?.emit("ticket:updated", { ticketNumber: updated.ticketNumber, status: updated.status });
  res.json({ ok: true, technician: updated.assignedTech, unit: updated.unit ? { id: updated.unit.id, name: updated.unit.name } : null });
}

// ── COMMENTS ─────────────────────────────────────────────────────────────────
export async function listComments(req, res) {
  const id = Number(req.params.id);
  const ticket = await prisma.ticket.findUnique({ where: { id }, select: { id: true, openedById: true } });
  if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });

  // Usuário comum só vê comentários do próprio chamado
  if (req.user.role === "USER" && ticket.openedById !== req.user.id) {
    return res.status(403).json({ error: "Acesso negado" });
  }

  const comments = await prisma.ticketComment.findMany({
    where: { ticketId: id },
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(comments);
}

export async function addComment(req, res) {
  const id = Number(req.params.id);
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: "Comentário não pode ser vazio" });

  const ticket = await prisma.ticket.findUnique({ where: { id }, select: { id: true, openedById: true, status: true } });
  if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });

  // Usuário comum só comenta no próprio chamado e apenas se não estiver concluído
  if (req.user.role === "USER") {
    if (ticket.openedById !== req.user.id) return res.status(403).json({ error: "Acesso negado" });
    if (ticket.status === STATUS.COMPLETED) return res.status(400).json({ error: "Não é possível comentar em chamados concluídos" });
  }

  const comment = await prisma.ticketComment.create({
    data: { ticketId: id, authorId: req.user.id, text: text.trim() },
    include: { author: { select: { id: true, name: true, role: true } } },
  });

  req.app.get("io")?.emit("ticket:comment", { ticketId: id });
  res.status(201).json(comment);
}

// ── FEEDBACK (autenticado — por id do ticket) ─────────────────────────────────
export async function submitFeedbackAuth(req, res) {
  if (process.env.FEEDBACK_ENABLED !== "true") {
    return res.status(404).json({ error: "Módulo de avaliação desativado" });
  }
  const id = Number(req.params.id);
  const { rating, comment } = req.body || {};
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return res.status(400).json({ error: "Avaliação deve ser entre 1 e 5" });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });
  if (ticket.openedById !== req.user.id) return res.status(403).json({ error: "Acesso negado" });
  if (ticket.status !== STATUS.COMPLETED) return res.status(400).json({ error: "Chamado ainda não foi concluído" });

  const existing = await prisma.feedback.findUnique({ where: { ticketId: id } });
  if (existing) return res.status(400).json({ error: "Avaliação já enviada" });

  const fb = await prisma.feedback.create({
    data: { ticketId: id, rating: r, comment: comment || null },
  });
  res.status(201).json({ ok: true, id: fb.id });
}

// ── Formato base de ticket para listagens ─────────────────────────────────────
function formatTicket(t) {
  return {
    id:                  t.id,
    ticketNumber:        t.ticketNumber,
    requesterName:       t.requesterName,
    requesterCpf:        maskCpf(t.requesterCpf),
    department:          t.department,
    category:            t.category     ? { id: t.category.id,     name: t.category.name }     : null,
    subcategory:         t.subcategory  ? { id: t.subcategory.id,  name: t.subcategory.name, code: t.subcategory.code } : null,
    freeTextDescription: t.freeTextDescription,
    extraData:           t.extraData,
    anyDeskCode:         t.anyDeskCode || null,
    priority:            t.priority ?? "MEDIUM",
    isRemote:             !!(t.anyDeskCode),
    presential:           t.presential,
    requiresCauseSolution: t.requiresCauseSolution,
    approvalStatus:       t.approvalStatus,
    approvals:           t.approvals?.map((a) => ({
      id:           a.id,
      chefDeptId:   a.chefDeptId,
      chefDeptName: a.chefDept?.name,
      chefUserName: a.chefUser?.name,
      status:       a.status,
      note:         a.note,
      decidedAt:    a.decidedAt,
    })) ?? [],
    status:        t.status,
    unit:          t.unit        ? { id: t.unit.id,        name: t.unit.name }        : null,
    technician:    t.assignedTech || null,
    slaDeadline:   t.slaDeadline,
    openedAt:      t.openedAt,
    viewedAt:      t.viewedAt,
    enRouteAt:     t.enRouteAt,
    inServiceAt:   t.inServiceAt,
    completedAt:   t.completedAt,
  };
}
