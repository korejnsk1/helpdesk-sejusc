import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, me, logout, forgotPassword, listResetRequests, resolveResetRequest } from "../controllers/authController.js";
import {
  register, listUsers, updateUser, deleteUser,
  resetPassword, changePassword, myTickets,
} from "../controllers/userController.js";
import {
  createTicket, getTicketPublic, listTickets, getTicket,
  transitionTicket, approveTicket, deleteTicket, submitFeedback,
  reopenTicket, assignTicket, listComments, addComment, submitFeedbackAuth,
} from "../controllers/ticketController.js";
import {
  listCategories, listUnits, listTechnicians, getPublicConfig,
  updateCategory, createCategory, deleteCategory, reorderCategories,
  createSubcategory, updateSubcategory, deleteSubcategory, reorderSubcategories,
} from "../controllers/metaController.js";
import {
  listDepartments, listAllDepartments, createDepartment,
  updateDepartment, deleteDepartment,
} from "../controllers/departmentController.js";
import { listAuditLogs } from "../controllers/auditController.js";
import {
  ticketsByUnit, ticketsByTechnician, ticketsByDepartment,
  ticketsByCategory, avgResolutionByCategory, avgResolutionByUnit, otherReclassified,
  topRequesters, ticketsByDay, ticketsByMonth,
  osByStatus, osByTipo, osByUnit, osByTecnico, osByMonth,
} from "../controllers/analyticsController.js";
import {
  createWorkOrder, listWorkOrders, getWorkOrder, updateWorkOrder,
  transitionWorkOrder, addTecnico, removeTecnico, linkTicket, unlinkTicket,
  deleteWorkOrder,
} from "../controllers/workOrderController.js";
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

// 300 requisições por IP por minuto — proteção geral contra abuso/DoS
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente em breve." },
});

const router = Router();
router.use(generalLimiter);

// ── Público ──────────────────────────────────────────────────────────────────
router.get("/config",          getPublicConfig);
router.get("/categories",                    listCategories);
router.post("/categories",                   authRequired, requireRole("ADMIN"), createCategory);
router.patch("/categories/reorder",          authRequired, requireRole("ADMIN"), reorderCategories);
router.patch("/categories/:id",              authRequired, requireRole("ADMIN"), updateCategory);
router.delete("/categories/:id",             authRequired, requireRole("ADMIN"), deleteCategory);

router.post("/categories/:catId/subcategories",              authRequired, requireRole("ADMIN"), createSubcategory);
router.patch("/categories/:catId/subcategories/reorder",     authRequired, requireRole("ADMIN"), reorderSubcategories);
router.patch("/categories/:catId/subcategories/:subId",      authRequired, requireRole("ADMIN"), updateSubcategory);
router.delete("/categories/:catId/subcategories/:subId",     authRequired, requireRole("ADMIN"), deleteSubcategory);
router.get("/units",           listUnits);
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
router.get("/password-reset-requests",              authRequired, requireRole("ADMIN"), listResetRequests);
router.post("/password-reset-requests/:id/resolve", authRequired, requireRole("ADMIN"), resolveResetRequest);

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
router.get("/tickets",     authRequired, requireRole("TECHNICIAN", "ADMIN", "CHEFE_SETOR"), listTickets);
router.get("/tickets/:id", authRequired, requireRole("TECHNICIAN", "ADMIN", "CHEFE_SETOR"), getTicket);
router.post("/tickets/:id/transition", authRequired, requireRole("TECHNICIAN", "ADMIN"), transitionTicket);
router.post("/tickets/:id/approve",    authRequired, requireRole("CHEFE_SETOR", "ADMIN"), approveTicket);
router.post("/tickets/:id/reopen",     authRequired, reopenTicket);
router.patch("/tickets/:id/assign",    authRequired, requireRole("TECHNICIAN", "ADMIN"), assignTicket);
router.get("/tickets/:id/comments",   authRequired, listComments);
router.post("/tickets/:id/comments",  authRequired, addComment);
router.post("/tickets/:id/feedback",  authRequired, submitFeedbackAuth);
router.delete("/tickets/:id", authRequired, requireRole("ADMIN"), deleteTicket);

// ── Ordens de Serviço ──────────────────────────────────────────────────────────
const staffAccess = [authRequired, requireRole("TECHNICIAN", "ADMIN")];
const adminOnly   = [authRequired, requireRole("ADMIN")];
router.get("/work-orders",                          ...staffAccess, listWorkOrders);
router.post("/work-orders",                         ...staffAccess, createWorkOrder);
router.get("/work-orders/:id",                      ...staffAccess, getWorkOrder);
router.patch("/work-orders/:id",                    ...staffAccess, updateWorkOrder);
router.delete("/work-orders/:id",                   ...adminOnly,   deleteWorkOrder);
router.post("/work-orders/:id/transition",          ...staffAccess, transitionWorkOrder);
router.post("/work-orders/:id/tecnicos",            ...staffAccess, addTecnico);
router.delete("/work-orders/:id/tecnicos/:userId",  ...staffAccess, removeTecnico);
router.post("/work-orders/:id/tickets",             ...staffAccess, linkTicket);
router.delete("/work-orders/:id/tickets/:ticketId", ...staffAccess, unlinkTicket);

// ── Auditoria ──────────────────────────────────────────────────────────────────
router.get("/audit-logs", authRequired, requireRole("ADMIN"), listAuditLogs);

// ── Analytics ──────────────────────────────────────────────────────────────────
const analyticsAccess = [authRequired, requireRole("TECHNICIAN", "ADMIN")];
router.get("/analytics/by-unit",        ...analyticsAccess, ticketsByUnit);
router.get("/analytics/by-technician",  ...analyticsAccess, ticketsByTechnician);
router.get("/analytics/by-department",  ...analyticsAccess, ticketsByDepartment);
router.get("/analytics/by-category",    ...analyticsAccess, ticketsByCategory);
router.get("/analytics/avg-resolution",          ...analyticsAccess, avgResolutionByCategory);
router.get("/analytics/avg-resolution-by-unit",  ...analyticsAccess, avgResolutionByUnit);
router.get("/analytics/other",          ...analyticsAccess, otherReclassified);
router.get("/analytics/top-requesters", ...analyticsAccess, topRequesters);
router.get("/analytics/by-day",         ...analyticsAccess, ticketsByDay);
router.get("/analytics/by-month",       ...analyticsAccess, ticketsByMonth);
// OS analytics
router.get("/analytics/os/by-status",  ...analyticsAccess, osByStatus);
router.get("/analytics/os/by-tipo",    ...analyticsAccess, osByTipo);
router.get("/analytics/os/by-unit",    ...analyticsAccess, osByUnit);
router.get("/analytics/os/by-tecnico", ...analyticsAccess, osByTecnico);
router.get("/analytics/os/by-month",   ...analyticsAccess, osByMonth);

export default router;
