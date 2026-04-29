import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, me, logout, forgotPassword, listResetRequests, resolveResetRequest } from "../controllers/authController.js";
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
  topRequesters, ticketsByDay, ticketsByMonth,
} from "../controllers/analyticsController.js";
import { authRequired, optionalAuth, requireRole } from "../middleware/auth.js";

// 10 tentativas por IP a cada 15 minutos nos endpoints de autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// 5 solicitações por IP a cada hora no forgot-password (evita spam)
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas solicitações. Tente novamente em 1 hora." },
});

const router = Router();

// ── Público ──────────────────────────────────────────────────────────────────
router.get("/config",    getPublicConfig);
router.get("/categories", listCategories);
router.get("/units",     listUnits);
router.get("/departments", listDepartments);
router.post("/tickets",  authRequired, createTicket);
router.get("/tickets/track/:ticketNumber", getTicketPublic);
router.post("/tickets/track/:ticketNumber/feedback", submitFeedback);

// ── Autenticação ──────────────────────────────────────────────────────────────
router.post("/auth/login",           authLimiter, login);
router.post("/auth/logout",          logout);
router.post("/auth/register",        authLimiter, register);
router.post("/auth/forgot-password", forgotLimiter, forgotPassword);
router.get("/auth/me",               authRequired, me);
router.post("/auth/change-password", authRequired, changePassword);

// ── Solicitações de reset de senha ────────────────────────────────────────────
router.get("/password-reset-requests",           authRequired, requireRole("MONITOR", "ADMIN"), listResetRequests);
router.post("/password-reset-requests/:id/resolve", authRequired, requireRole("MONITOR", "ADMIN"), resolveResetRequest);

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
const analyticsAccess = [authRequired, requireRole("TECHNICIAN", "MONITOR", "ADMIN")];
router.get("/analytics/by-unit",        ...analyticsAccess, ticketsByUnit);
router.get("/analytics/by-technician",  ...analyticsAccess, ticketsByTechnician);
router.get("/analytics/by-department",  ...analyticsAccess, ticketsByDepartment);
router.get("/analytics/by-category",    ...analyticsAccess, ticketsByCategory);
router.get("/analytics/avg-resolution", ...analyticsAccess, avgResolutionByCategory);
router.get("/analytics/other",          ...analyticsAccess, otherReclassified);
router.get("/analytics/top-requesters", ...analyticsAccess, topRequesters);
router.get("/analytics/by-day",         ...analyticsAccess, ticketsByDay);
router.get("/analytics/by-month",       ...analyticsAccess, ticketsByMonth);

export default router;
