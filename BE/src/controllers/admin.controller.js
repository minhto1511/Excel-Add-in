import User from "../models/User.js";
import PaymentIntent from "../models/PaymentIntent.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import WebhookLog from "../models/WebhookLog.js";
import AuditLog from "../models/AuditLog.js";

/**
 * Lấy thống kê tổng quan cho Dashboard
 */
export const getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, proUsers, totalRevenue, todayRevenue, unmatchedCount] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ "subscription.plan": "pro" }),
        PaymentTransaction.aggregate([
          { $match: { status: "success" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        PaymentTransaction.aggregate([
          { $match: { status: "success", createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        PaymentTransaction.countDocuments({ status: "unmatched" }),
      ]);

    res.status(200).json({
      users: {
        total: totalUsers,
        pro: proUsers,
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        today: todayRevenue[0]?.total || 0,
      },
      alerts: {
        unmatched: unmatchedCount,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res
      .status(500)
      .json({ error: "INTERNAL_ERROR", message: "Lỗi lấy thống kê" });
  }
};

/**
 * Lấy danh sách giao dịch (có phân trang & filter)
 */
export const getTransactions = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { transferCode: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }

    const transactions = await PaymentTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("userId", "name email");

    const total = await PaymentTransaction.countDocuments(query);

    res.status(200).json({
      transactions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin transactions error:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Lỗi lấy danh sách giao dịch",
    });
  }
};

/**
 * Lấy danh sách người dùng
 */
export const getUsers = async (req, res) => {
  try {
    const { plan, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (plan) query["subscription.plan"] = plan;
    if (search) {
      query.$or = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    const users = await User.find(query)
      .select("-password -refreshTokens")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin users error:", error);
    res
      .status(500)
      .json({ error: "INTERNAL_ERROR", message: "Lỗi lấy danh sách user" });
  }
};

/**
 * Lấy danh sách Webhook Logs
 */
export const getWebhookLogs = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) query.processingStatus = status;

    const logs = await WebhookLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await WebhookLog.countDocuments(query);

    res.status(200).json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin webhook logs error:", error);
    res
      .status(500)
      .json({ error: "INTERNAL_ERROR", message: "Lỗi lấy danh sách logs" });
  }
};
