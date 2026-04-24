-- Adiciona role USER ao enum
ALTER TABLE `User` MODIFY `role` ENUM('ADMIN', 'MONITOR', 'TECHNICIAN', 'USER') NOT NULL DEFAULT 'USER';

-- Adiciona colunas ao User
ALTER TABLE `User`
  ADD COLUMN `departmentId` INTEGER NULL,
  ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false;

-- Adiciona coluna ao Ticket
ALTER TABLE `Ticket` ADD COLUMN `openedById` INTEGER NULL;

-- Foreign keys
ALTER TABLE `User` ADD CONSTRAINT `User_departmentId_fkey`
  FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_openedById_fkey`
  FOREIGN KEY (`openedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Índices
CREATE INDEX `User_departmentId_idx` ON `User`(`departmentId`);
CREATE INDEX `Ticket_openedById_idx` ON `Ticket`(`openedById`);
