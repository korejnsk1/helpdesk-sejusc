import { Router } from "express";
import { login, me } from "../controllers/authController.js";
import { register, listUsers, updateUser, listMonitors } from "../controllers/userController.js";
import {
  createTicket,
  getTicketPublic,
  listTickets,
  getTicket,
  transitionTicket,
  submitFeedback,
} from "../controllers/ticketController.js";
import {
  listCategories,
  listUnits,
  listTechnicians,
  getPublicConfig,
} from "../controllers/metaController.js";
import {
  ticketsByUnit,
  ticketsByTechnician,
  ticketsByDepartment,
  ticketsByCategory,
  avgResolutionByCategory,
  otherReclassified,
} from "../controllers/analyticsController.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = Router();

// Público
router.get("/config", getPublicConfig);
router.get("/categories", listCategories);
router.post("/tickets", createTicket);
router.get("/tickets/track/:ticketNumber", getTicketPublic);
router.post("/tickets/track/:ticketNumber/feedback", submitFeedback);

// Autenticação
router.post("/auth/login", login);
router.post("/auth/register", register);
router.get("/auth/me", authRequired, me);

// Monitores ativos (público — para exibir no dashboard/login)
router.get("/monitors", listMonitors);

// Gestão de usuários (ADMIN only)
router.get("/users", authRequired, requireRole("ADMIN"), listUsers);
router.patch("/users/:id", authRequired, requireRole("ADMIN"), updateUser);

// Área restrita (técnico/monitor)
router.get("/units", authRequired, listUnits);
router.get("/technicians", authRequired, listTechnicians);
router.get("/tickets", authRequired, listTickets);
router.get("/tickets/:id", authRequired, getTicket);
router.post("/tickets/:id/transition", authRequired, requireRole("MONITOR", "ADMIN"), transitionTicket);

// Analytics
router.get("/analytics/by-unit", authRequired, ticketsByUnit);
router.get("/analytics/by-technician", authRequired, ticketsByTechnician);
router.get("/analytics/by-department", authRequired, ticketsByDepartment);
router.get("/analytics/by-category", authRequired, ticketsByCategory);
router.get("/analytics/avg-resolution", authRequired, avgResolutionByCategory);
router.get("/analytics/other", authRequired, otherReclassified);

export default router;
