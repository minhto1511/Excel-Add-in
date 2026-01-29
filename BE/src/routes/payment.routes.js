import { Router } from "express";
import {
  createPaymentIntent,
  getPaymentIntentStatus,
  getPaymentHistory,
  getPricing,
  handleCassoWebhook,
  handleSePayWebhook,
  handleVNPayWebhook,
  getUnmatchedTransactions,
  manualMatchTransaction,
} from "../controllers/payment.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { paymentIntentLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// ==================== PUBLIC ROUTES (Webhooks) ====================

// Casso Webhook V2 (bank transfer notification)
// Format theo tài liệu Casso: /api/webhook-event-handler
router.post("/webhook-event-handler", handleCassoWebhook);

// Casso webhook (alternative path)
router.post("/webhook/casso", handleCassoWebhook);

// SePay webhook
router.post("/webhook/sepay", handleSePayWebhook);

// VNPay webhook (placeholder)
router.post("/webhook/vnpay", handleVNPayWebhook);

// ==================== PUBLIC ROUTES ====================

// Get pricing info
router.get("/pricing", getPricing);

// ==================== PROTECTED ROUTES ====================

// Create payment intent (generate QR)
router.post(
  "/intents",
  authMiddleware,
  paymentIntentLimiter,
  createPaymentIntent,
);

// Get payment intent status (for polling)
router.get("/intents/:id", authMiddleware, getPaymentIntentStatus);

// Get payment history
router.get("/history", authMiddleware, getPaymentHistory);

// ==================== ADMIN ROUTES ====================

// Get unmatched transactions (admin only)
router.get("/admin/unmatched", authMiddleware, getUnmatchedTransactions);

// Manual match transaction (admin only)
router.post("/admin/match", authMiddleware, manualMatchTransaction);

export default router;
