/*
  Warnings:

  - You are about to drop the column `glpiExportedAt` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `glpiTicketId` on the `Ticket` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Ticket` DROP COLUMN `glpiExportedAt`,
    DROP COLUMN `glpiTicketId`;
