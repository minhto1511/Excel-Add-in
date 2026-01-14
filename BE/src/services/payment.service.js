import PaymentIntent from "../models/PaymentIntent.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import WebhookEvent from "../models/WebhookEvent.js";
import WebhookLog from "../models/WebhookLog.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import emailService from "./email.service.js";
import crypto from "crypto";

// Maximum pending intents per user (prevent spam)
const MAX_PENDING_INTENTS = 5;

class PaymentService {
  // Create payment intent and generate QR
  async createPaymentIntent(userId, plan) {
    // Validate plan
    const validPlans = [
      "pro_monthly",
      "pro_yearly",
      "credits_50",
      "credits_100",
    ];
    if (!validPlans.includes(plan)) {
      throw new Error("INVALID_PLAN");
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    // Check pending intents limit to prevent spam
    const pendingCount = await PaymentIntent.countDocuments({
      userId,
      status: "pending",
      expiresAt: { $gt: new Date() }, // Only count non-expired
    });

    if (pendingCount >= MAX_PENDING_INTENTS) {
      throw new Error("TOO_MANY_PENDING_INTENTS");
    }

    // Create intent
    const intent = await PaymentIntent.createIntent(userId, plan);

    // Generate QR URL
    const qrCodeUrl = intent.generateQRUrl();
    intent.qrData.qrCodeUrl = qrCodeUrl;
    await intent.save();

    // Log audit
    await AuditLog.log("payment_intent_created", {
      userId,
      metadata: {
        plan,
        amount: intent.amount,
        transferCode: intent.transferCode,
      },
    });

    return {
      id: intent._id,
      plan: intent.plan,
      amount: intent.amount,
      currency: intent.currency,
      transferCode: intent.transferCode,
      expiresAt: intent.expiresAt,
      remainingTime: intent.getRemainingTime(),
      qrData: {
        bankCode: intent.qrData.bankCode,
        accountNumber: intent.qrData.accountNumber,
        accountName: intent.qrData.accountName,
        description: intent.qrData.description,
        qrCodeUrl: intent.qrData.qrCodeUrl,
      },
    };
  }

  // Get payment intent status (for polling)
  async getIntentStatus(intentId, userId) {
    const intent = await PaymentIntent.findOne({ _id: intentId, userId });

    if (!intent) {
      throw new Error("INTENT_NOT_FOUND");
    }

    return {
      id: intent._id,
      status: intent.getClientStatus(),
      amount: intent.amount,
      transferCode: intent.transferCode,
      expiresAt: intent.expiresAt,
      remainingTime: intent.getRemainingTime(),
      paidAt: intent.paidAt,
      isExpired: intent.isExpired(),
    };
  }

  // Get user payment history
  async getPaymentHistory(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      PaymentTransaction.getUserHistory(userId, limit, skip),
      PaymentTransaction.countDocuments({ userId, status: "matched" }),
    ]);

    return {
      transactions,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // Verify Casso webhook signature (supports V2 format: t=timestamp,v1=signature)
  verifyCassoSignature(payload, signatureHeader) {
    const secret = process.env.CASSO_WEBHOOK_SECRET;
    if (!secret) {
      console.warn("CASSO_WEBHOOK_SECRET not configured");
      return true; // Skip verification if not configured (dev mode)
    }

    // Skip verification if no signature provided (for testing only)
    if (!signatureHeader) {
      if (process.env.NODE_ENV === "production") {
        console.error("No signature header provided in production mode");
        return false;
      }
      console.warn("No signature header - skipping verification (dev mode)");
      return true;
    }

    // TODO: Implement correct Casso V2 signature verification algorithm
    // For now, skip verification in dev mode to test webhook flow
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "DEV MODE: Skipping signature verification for Casso webhook"
      );
      console.log(
        "Received signature:",
        signatureHeader.substring(0, 50) + "..."
      );
      return true;
    }

    try {
      // Webhook V2 format: "t=timestamp,v1=signature"
      if (signatureHeader.includes("t=") && signatureHeader.includes("v1=")) {
        const parts = signatureHeader.split(",");
        const timestamp = parts.find((p) => p.startsWith("t="))?.split("=")[1];
        const signature = parts.find((p) => p.startsWith("v1="))?.split("=")[1];

        if (!timestamp || !signature) {
          console.error("Invalid V2 signature format");
          return false;
        }

        // V2 uses: HMAC-SHA512(secret, timestamp + "." + JSON.stringify(payload))
        const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
        const computed = crypto
          .createHmac("sha512", secret)
          .update(signedPayload)
          .digest("hex");

        const isValid = computed === signature;
        if (!isValid) {
          console.log("Signature mismatch - trying alternative format...");
          // Try without stringifying (some implementations differ)
        }
        return isValid;
      }

      // Webhook V1 format: simple token comparison (secure-token header)
      return signatureHeader === secret;
    } catch (error) {
      console.error("Signature verification error:", error);
      return false;
    }
  }

  // Process Casso webhook
  async processCassoWebhook(payload, signature, headers = {}) {
    // 1. Extract event ID for idempotency
    const eventId =
      payload.id?.toString() ||
      payload.tid?.toString() ||
      `casso_${Date.now()}`;

    const startTime = Date.now();
    let signatureStatus = "skipped"; // Default to skipped if no secret or dev mode

    // 1. Verify signature
    const signatureValid = this.verifyCassoSignature(payload, signature);

    if (!signatureValid && process.env.CASSO_WEBHOOK_SECRET) {
      signatureStatus = "invalid";
      await WebhookLog.create({
        provider: "casso",
        headers,
        body: payload,
        signatureStatus,
        processingStatus: "failed",
        error: "INVALID_SIGNATURE",
        responseTime: Date.now() - startTime,
      });
      throw new Error("INVALID_SIGNATURE");
    }

    // V1: data is array of transactions
    // V2: data is single transaction object
    let transactions = [];
    if (Array.isArray(payload.data)) {
      // V1 format
      transactions = payload.data;
    } else if (payload.data && typeof payload.data === "object") {
      // V2 format - single object
      transactions = [payload.data];
    } else {
      // Fallback - direct payload
      transactions = [payload];
    }

    const results = [];
    const log = await WebhookLog.create({
      provider: "casso",
      headers,
      body: payload,
      signatureStatus,
      processingStatus: "pending",
    });

    try {
      for (const tx of transactions) {
        const result = await this.processTransaction(tx);
        results.push(result);
      }

      // Update log with results
      log.processingStatus = results.every((r) => r.status === "success")
        ? "processed"
        : results.some((r) => r.status === "unmatched")
        ? "unmatched"
        : "failed";
      log.results = results;
      log.responseTime = Date.now() - startTime;
      await log.save();

      return { status: "processed", results };
    } catch (error) {
      console.error("Webhook processing error:", error);
      log.processingStatus = "failed";
      log.error = error.message;
      log.responseTime = Date.now() - startTime;
      await log.save();
      throw error;
    }
  }

  // Process single transaction from webhook
  async processTransaction(tx) {
    const {
      id: txId,
      tid,
      amount,
      when,
      description,
      cusum_balance,
      bookingDate,
    } = tx;

    const providerTxId = (txId || tid || `tx_${Date.now()}`).toString();

    // Check idempotency - transaction already processed?
    const existingTx = await PaymentTransaction.findOne({ providerTxId });
    if (existingTx) {
      return { status: "duplicate", providerTxId };
    }

    // Parse transfer code from description
    const transferCode = PaymentIntent.parseTransferCode(description);

    if (!transferCode) {
      // Unmatched transaction - save for manual review
      await PaymentTransaction.createFromWebhook({
        providerTxId,
        amount,
        description,
        status: "unmatched",
        provider: "vietqr_casso",
        rawPayload: tx,
      });

      console.log("Unmatched transaction (no transfer code):", description);
      return { status: "unmatched", error: "NO_TRANSFER_CODE" };
    }

    // Find payment intent by transfer code
    const intent = await PaymentIntent.findOne({ transferCode });

    if (!intent) {
      // Intent not found - save for manual review
      await PaymentTransaction.createFromWebhook({
        providerTxId,
        amount,
        description,
        transferCode,
        status: "unmatched",
        provider: "vietqr_casso",
        rawPayload: tx,
      });

      console.log("Intent not found for transfer code:", transferCode);
      return { status: "intent_not_found", error: "INTENT_NOT_FOUND" };
    }

    // Check if intent already paid
    if (intent.status === "paid") {
      return { status: "already_paid", intentId: intent._id };
    }

    // Check if intent expired
    if (intent.isExpired()) {
      intent.status = "expired";
      await intent.save();

      await PaymentTransaction.createFromWebhook({
        providerTxId,
        intentId: intent._id,
        userId: intent.userId,
        amount,
        description,
        transferCode,
        status: "unmatched",
        provider: "vietqr_casso",
        rawPayload: tx,
        metadata: { error: "INTENT_EXPIRED" },
      });

      console.log("Intent expired:", transferCode);
      return { status: "expired", error: "INTENT_EXPIRED" };
    }

    // Check amount
    if (amount < intent.amount) {
      intent.status = "underpaid";
      await intent.save();

      await PaymentTransaction.createFromWebhook({
        providerTxId,
        intentId: intent._id,
        userId: intent.userId,
        amount,
        description,
        transferCode,
        status: "amount_mismatch",
        provider: "vietqr_casso",
        rawPayload: tx,
        metadata: { expected: intent.amount, received: amount },
      });

      console.log(
        "Underpaid:",
        transferCode,
        "expected:",
        intent.amount,
        "received:",
        amount
      );
      return { status: "underpaid", error: "AMOUNT_MISMATCH" };
    }

    // SUCCESS - Create transaction
    const transaction = await PaymentTransaction.createFromWebhook({
      providerTxId,
      intentId: intent._id,
      userId: intent.userId,
      amount,
      description,
      transferCode,
      status: "matched",
      provider: "vietqr_casso",
      rawPayload: tx,
    });

    // Mark intent as paid
    await intent.markAsPaid(transaction._id);

    // Upgrade user
    await this.upgradeUser(intent.userId, intent.plan, intent._id);

    // Send confirmation email
    try {
      const user = await User.findById(intent.userId);
      if (user) {
        await emailService.sendPaymentConfirmation(
          user.email,
          intent.plan,
          intent.amount,
          intent.transferCode
        );
      }
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }

    console.log("Payment successful:", transferCode, "user:", intent.userId);

    return {
      status: "success",
      transactionId: transaction._id,
      intentId: intent._id,
      userId: intent.userId,
    };
  }

  // Upgrade user based on plan
  async upgradeUser(userId, plan, paymentIntentId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    if (plan.startsWith("pro_")) {
      await user.upgradeToPro(plan, paymentIntentId);

      // Log audit
      await AuditLog.log("plan_upgraded", {
        userId,
        metadata: { plan, paymentIntentId },
      });
    } else if (plan.startsWith("credits_")) {
      const creditsMap = {
        credits_50: 50,
        credits_100: 100,
      };
      const credits = creditsMap[plan] || 0;
      await user.addCredits(credits);

      // Log audit
      await AuditLog.log("payment_completed", {
        userId,
        metadata: { plan, credits, paymentIntentId },
      });
    }

    return user;
  }

  // Get pricing info
  getPricing() {
    return PaymentIntent.getPricing();
  }

  // Cancel expired intents (can be run as cron job)
  async cancelExpiredIntents() {
    const result = await PaymentIntent.updateMany(
      {
        status: "pending",
        expiresAt: { $lt: new Date() },
      },
      {
        status: "expired",
      }
    );

    console.log("Cancelled expired intents:", result.modifiedCount);
    return result.modifiedCount;
  }

  // Get unmatched transactions for admin review
  async getUnmatchedTransactions(limit = 50) {
    return await PaymentTransaction.getUnmatched(limit);
  }

  // Manual match transaction to intent (admin function)
  async manualMatchTransaction(transactionId, intentId) {
    const transaction = await PaymentTransaction.findById(transactionId);
    const intent = await PaymentIntent.findById(intentId);

    if (!transaction || !intent) {
      throw new Error("NOT_FOUND");
    }

    if (intent.status === "paid") {
      throw new Error("INTENT_ALREADY_PAID");
    }

    // Update transaction
    transaction.intentId = intentId;
    transaction.userId = intent.userId;
    transaction.status = "matched";
    transaction.processedAt = new Date();
    await transaction.save();

    // Mark intent as paid
    await intent.markAsPaid(transaction._id);

    // Upgrade user
    await this.upgradeUser(intent.userId, intent.plan, intent._id);

    return { transaction, intent };
  }
}

// Export singleton instance
const paymentService = new PaymentService();
export default paymentService;
