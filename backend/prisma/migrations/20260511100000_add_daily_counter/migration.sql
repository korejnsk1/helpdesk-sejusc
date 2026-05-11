CREATE TABLE `DailyCounter` (
  `date`        DATE NOT NULL,
  `ticketCount` INT  NOT NULL DEFAULT 0,
  `osCount`     INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (`date`)
);
