import { Router } from "express";
import {
  authenticate,
  adminMiddleware,
} from "../middlewares/auth.middleware.js";
import {
  getStats,
  getTransactions,
  getUsers,
  getWebhookLogs,
} from "../controllers/admin.controller.js";
import {
  manualMatchTransaction,
  getUnmatchedTransactions,
} from "../controllers/payment.controller.js";

const router = Router();

// Tất cả các route admin đều yêu cầu Auth + Admin role
router.use(authenticate, adminMiddleware);

/**
 * Dashboard Stats
 */
router.get("/stats", getStats);

/**
 * Transactions Management
 */
router.get("/transactions", getTransactions);
router.get("/transactions/unmatched", getUnmatchedTransactions);
router.post("/transactions/manual-match", manualMatchTransaction);

/**
 * User Management
 */
router.get("/users", getUsers);

/**
 * Webhook Logs
 */
router.get("/webhook-logs", getWebhookLogs);

export default router;
