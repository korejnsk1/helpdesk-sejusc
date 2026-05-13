import { prisma } from "../config/prisma.js";

export async function listAuditLogs(req, res) {
  const { limit = 100, cursor, action, actorId } = req.query;
  const where = {};
  if (action)  where.action  = action;
  if (actorId) where.actorId = Number(actorId);

  const take = Math.min(Number(limit), 200);
  const cursorClause = cursor ? { cursor: { id: Number(cursor) }, skip: 1 } : {};

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...cursorClause,
  });

  const hasMore    = rows.length > take;
  const logs       = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? logs[logs.length - 1].id : null;

  res.json({ logs, nextCursor });
}

export async function createAuditLog(prismaClient, { actorId, actorName, action, targetType, targetId, details }) {
  return prismaClient.auditLog.create({
    data: { actorId: actorId || null, actorName, action, targetType, targetId: targetId ? String(targetId) : null, details: details || null },
  });
}
