-- CreateIndex
CREATE INDEX `User_role_active_idx` ON `User`(`role`, `active`);

-- RenameIndex
ALTER TABLE `Ticket` RENAME INDEX `Ticket_categoryId_fkey` TO `Ticket_categoryId_idx`;

-- RenameIndex
ALTER TABLE `Ticket` RENAME INDEX `Ticket_departmentId_fkey` TO `Ticket_departmentId_idx`;
