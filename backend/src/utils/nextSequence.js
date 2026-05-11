import { prisma } from "../config/prisma.js";

async function nextSeq(column) {
  // Garante que a linha do dia existe (idempotente)
  await prisma.$executeRaw`
    INSERT IGNORE INTO DailyCounter (\`date\`, ticketCount, osCount)
    VALUES (CURDATE(), 0, 0)
  `;

  // Incremento atômico via LAST_INSERT_ID (MySQL garante valor por conexão)
  if (column === "ticket") {
    await prisma.$executeRaw`
      UPDATE DailyCounter
      SET ticketCount = LAST_INSERT_ID(ticketCount + 1)
      WHERE \`date\` = CURDATE()
    `;
  } else {
    await prisma.$executeRaw`
      UPDATE DailyCounter
      SET osCount = LAST_INSERT_ID(osCount + 1)
      WHERE \`date\` = CURDATE()
    `;
  }

  const [{ seq }] = await prisma.$queryRaw`SELECT LAST_INSERT_ID() AS seq`;
  return Number(seq);
}

export const nextTicketSeq = () => nextSeq("ticket");
export const nextOsSeq     = () => nextSeq("os");
