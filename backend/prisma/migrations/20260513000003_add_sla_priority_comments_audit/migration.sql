-- Adiciona SLA, prioridade, comentários e logs de auditoria
-- (features do PR #2 que não tinham migration correspondente)

-- Prioridade do chamado
ALTER TABLE `Ticket`
  ADD COLUMN `priority`    ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN `slaDeadline` DATETIME(3) NULL;

-- SLA por categoria (horas)
ALTER TABLE `Category`
  ADD COLUMN `slaHours` INT NULL;

-- Comentários de chamado
CREATE TABLE `TicketComment` (
  `id`        INT AUTO_INCREMENT NOT NULL,
  `ticketId`  INT NOT NULL,
  `authorId`  INT NOT NULL,
  `text`      TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `TicketComment_ticketId_idx` (`ticketId`),
  CONSTRAINT `TicketComment_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TicketComment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User` (`id`) ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Log de auditoria
CREATE TABLE `AuditLog` (
  `id`         INT AUTO_INCREMENT NOT NULL,
  `actorId`    INT NULL,
  `actorName`  VARCHAR(191) NOT NULL,
  `action`     VARCHAR(191) NOT NULL,
  `targetType` VARCHAR(191) NOT NULL,
  `targetId`   VARCHAR(191) NULL,
  `details`    TEXT NULL,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `AuditLog_actorId_idx` (`actorId`),
  INDEX `AuditLog_action_idx` (`action`),
  INDEX `AuditLog_createdAt_idx` (`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
