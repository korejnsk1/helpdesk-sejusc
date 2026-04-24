import { Router } from "express";
import { login, me } from "../controllers/authController.js";
import {
  register, listUsers, updateUser, deleteUser, listMonitors,
  resetPassword, changePassword, myTickets,
} from "../controllers/userController.js";
import {
  createTicket, getTicketPublic, listTickets, getTicket,
  transitionTicket, deleteTicket, submitFeedback,
} from "../controllers/ticketController.js";
import {
  listCategories, listUnits, listTechnicians, getPublicConfig,
} from "../controllers/metaController.js";
import {
  listDepartments, listAllDepartments, createDepartment,
  updateDepartment, deleteDepartment,
} from "../controllers/departmentController.js";
import {
  ticketsByUnit, ticketsByTechnician, ticketsByDepartment,
  ticketsByCategory, avgResolutionByCategory, otherReclassified,
} from "../controllers/analyticsController.js";
import { authRequired, optionalAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// ── Público ──────────────────────────────────────────────────────────────────
router.get("/config",    getPublicConfig);
router.get("/categories", listCategories);
router.get("/units",     listUnits);
router.get("/departments", listDepartments);
router.post("/tickets",  optionalAuth, createTicket);
router.get("/tickets/track/:ticketNumber", getTicketPublic);
router.post("/tickets/track/:ticketNumber/feedback", submitFeedback);

// ── Autenticação ──────────────────────────────────────────────────────────────
router.post("/auth/login",    login);
router.post("/auth/register", register);
router.get("/auth/me",        authRequired, me);
router.post("/auth/change-password", authRequired, changePassword);

// ── Monitores (público — exibição no dashboard/login) ─────────────────────────
router.get("/monitors", listMonitors);

// ── Perfil do usuário logado ───────────────────────────────────────────────────
router.get("/users/me/tickets", authRequired, myTickets);

// ── Gestão de setores (ADMIN) ──────────────────────────────────────────────────
router.get("/departments/all",  authRequired, requireRole("ADMIN"), listAllDepartments);
router.post("/departments",     authRequired, requireRole("ADMIN"), createDepartment);
router.patch("/departments/:id", authRequired, requireRole("ADMIN"), updateDepartment);
router.delete("/departments/:id", authRequired, requireRole("ADMIN"), deleteDepartment);

// ── Gestão de usuários (ADMIN) ─────────────────────────────────────────────────
router.get("/users",             authRequired, requireRole("ADMIN"), listUsers);
router.patch("/users/:id",       authRequired, requireRole("ADMIN"), updateUser);
router.delete("/users/:id",      authRequired, requireRole("ADMIN"), deleteUser);
router.post("/users/:id/reset-password", authRequired, requireRole("ADMIN"), resetPassword);

// ── Área técnica ───────────────────────────────────────────────────────────────
router.get("/technicians", authRequired, listTechnicians);
router.get("/tickets",     authRequired, listTickets);
router.get("/tickets/:id", authRequired, getTicket);
router.post("/tickets/:id/transition", authRequired, requireRole("MONITOR", "ADMIN"), transitionTicket);
router.delete("/tickets/:id", authRequired, requireRole("ADMIN"), deleteTicket);

// ── Analytics ──────────────────────────────────────────────────────────────────
router.get("/analytics/by-unit",        authRequired, ticketsByUnit);
router.get("/analytics/by-technician",  authRequired, ticketsByTechnician);
router.get("/analytics/by-department",  authRequired, ticketsByDepartment);
router.get("/analytics/by-category",    authRequired, ticketsByCategory);
router.get("/analytics/avg-resolution", authRequired, avgResolutionByCategory);
router.get("/analytics/other",          authRequired, otherReclassified);

export default router;
