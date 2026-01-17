/**
 * API Service - Frontend API Client
 *
 * ARCHITECTURE:
 * - Frontend (React) CHỈ gọi API, KHÔNG xử lý business logic
 * - Backend (Node.js + Express) xử lý TẤT CẢ business logic bao gồm Gemini AI
 * - Frontend chỉ giữ UI state và hiển thị dữ liệu từ API
 *
 * AUTH FLOW:
 * - Bắt buộc login để sử dụng AI
 * - Free users: 10 lệnh miễn phí
 * - Hết credits = không sử dụng được nữa
 */

import { getExcelContext as getExcelContextFromService } from "./excelContextService.js";

// ============================================================================
// API CONFIGURATION
// ============================================================================

// Backend API URL - Production
const API_BASE_URL = "https://excel-add-in-production-141f.up.railway.app/api/v1";

/**
 * Lấy JWT token từ localStorage
 */
function getAuthToken() {
  return localStorage.getItem("auth_token");
}

/**
 * Lưu JWT token
 */
export function setAuthToken(token) {
  localStorage.setItem("auth_token", token);
}

/**
 * Xóa JWT token (logout)
 */
export function clearAuthToken() {
  localStorage.removeItem("auth_token");
}

/**
 * Kiểm tra đã login chưa
 */
export function isLoggedIn() {
  const token = getAuthToken();
  return !!(token && token.trim());
}

/**
 * Generic API call wrapper với error handling và auth
 * ✅ AUTO-REFRESH: Automatically refresh token on 401 and retry
 */
let isRefreshing = false;
let refreshPromise = null;

async function apiCall(endpoint, options = {}, isRetry = false) {
  try {
    const token = getAuthToken();
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Thêm Authorization header nếu có token
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers,
      ...options,
    });

    // Handle 401 - Try to refresh token (but NOT for login/register endpoints)
    const isAuthEndpoint = endpoint.includes("/auth/login") || endpoint.includes("/auth/register");
    if (response.status === 401 && !isRetry && !isAuthEndpoint) {
      console.log("[API] 401 detected, attempting token refresh...");

      // Get refresh token
      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        try {
          // Prevent multiple simultaneous refresh calls
          if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken }),
            }).then(async (res) => {
              if (!res.ok) throw new Error("Refresh failed");
              return res.json();
            });
          }

          const refreshData = await refreshPromise;
          isRefreshing = false;

          if (refreshData.token) {
            console.log("[API] Token refreshed successfully!");
            setAuthToken(refreshData.token);
            if (refreshData.refreshToken) {
              localStorage.setItem("refresh_token", refreshData.refreshToken);
            }

            // Retry original request with new token
            return apiCall(endpoint, options, true);
          }
        } catch (refreshError) {
          console.error("[API] Token refresh failed:", refreshError);
          isRefreshing = false;
        }
      }

      // Refresh failed or no refresh token - clear auth
      clearAuthToken();
      localStorage.removeItem("refresh_token");
      throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
    }

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(data.message || "Hết lượt sử dụng. Vui lòng nâng cấp!");
      }
      throw new Error(data.message || `Lỗi API: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Call failed [${endpoint}]:`, error);
    throw error;
  }
}

// ============================================================================
// AUTHENTICATION (NEW API with OTP)
// ============================================================================

/**
 * Lưu refresh token
 */
export function setRefreshToken(token) {
  localStorage.setItem("refresh_token", token);
}

/**
 * Lấy refresh token
 */
function getRefreshToken() {
  return localStorage.getItem("refresh_token");
}

/**
 * Xóa tất cả tokens
 */
export function clearAllTokens() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("refresh_token");
}

/**
 * Đăng ký user mới (sends OTP email)
 * @returns { message, otpSent, email }
 */
export async function register(email, password, confirmPassword, name) {
  const data = await apiCall("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, confirmPassword, name }),
  });
  return data;
}

/**
 * Verify email OTP sau khi đăng ký
 * @returns { user, token, refreshToken }
 */
export async function verifyEmailOTP(email, otp) {
  const data = await apiCall("/auth/verify-email-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });

  // Lưu tokens
  if (data.token) {
    setAuthToken(data.token);
  }
  if (data.refreshToken) {
    setRefreshToken(data.refreshToken);
  }

  return data;
}

/**
 * Resend OTP
 * @returns { message, cooldownRemaining, resendsRemaining }
 */
export async function resendOTP(email, purpose = "signup") {
  return apiCall("/auth/resend-otp", {
    method: "POST",
    body: JSON.stringify({ email, purpose }),
  });
}

/**
 * Đăng nhập
 */
export async function login(email, password) {
  const data = await apiCall("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  // Lưu tokens
  if (data.token) {
    setAuthToken(data.token);
  }
  if (data.refreshToken) {
    setRefreshToken(data.refreshToken);
  }

  return data;
}

/**
 * Đăng xuất
 */
export async function logout() {
  try {
    const refreshToken = getRefreshToken();
    await apiCall("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  } catch (error) {
    // Ignore logout errors
  } finally {
    clearAllTokens();
  }
}

/**
 * Forgot password - gửi OTP reset
 */
export async function forgotPassword(email) {
  return apiCall("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/**
 * Verify reset OTP
 * @returns { message, resetToken }
 */
export async function verifyResetOTP(email, otp) {
  return apiCall("/auth/verify-reset-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

/**
 * Reset password với token
 */
export async function resetPassword(resetToken, newPassword, confirmPassword) {
  return apiCall("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
  });
}

/**
 * Refresh access token
 */
export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token");
  }

  const data = await apiCall("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });

  if (data.token) {
    setAuthToken(data.token);
  }
  if (data.refreshToken) {
    setRefreshToken(data.refreshToken);
  }

  return data;
}

/**
 * Lấy thông tin profile
 */
export async function getProfile() {
  // Add timestamp to bust cache
  const cacheBuster = `t=${Date.now()}`;
  return apiCall(`/auth/profile?${cacheBuster}`);
}

/**
 * Lấy thông tin credits
 */
export async function getCredits() {
  // Add timestamp to bust cache
  const cacheBuster = `t=${Date.now()}`;
  return apiCall(`/users/credits?${cacheBuster}`);
}

// ============================================================================
// PAYMENT
// ============================================================================

/**
 * Lấy danh sách giá
 */
export async function getPricing() {
  return apiCall("/payments/pricing");
}

/**
 * Tạo payment intent (QR code)
 * @returns { intent: { id, amount, transferCode, qrData, expiresAt } }
 */
export async function createPaymentIntent(plan) {
  return apiCall("/payments/intents", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
}

/**
 * Lấy trạng thái payment intent (polling)
 * ✅ FIX: Add cache-buster to prevent Office WebView caching
 */
export async function getPaymentIntentStatus(intentId) {
  // Add timestamp to bust cache in Office WebView
  const cacheBuster = `t=${Date.now()}`;
  return apiCall(`/payments/intents/${intentId}?${cacheBuster}`);
}

/**
 * Lấy lịch sử thanh toán
 */
export async function getPaymentHistory(page = 1, limit = 10) {
  return apiCall(`/payments/history?page=${page}&limit=${limit}`);
}

// ============================================================================
// AI FEATURES - GỌI BACKEND
// ============================================================================

/**
 * Generate Excel formula từ prompt
 * Gọi BE endpoint: POST /api/v1/ai/ask với type="formula"
 */
export async function generateExcelFormula(prompt, excelContext = null) {
  if (!prompt || !prompt.trim()) {
    throw new Error("Prompt không được rỗng!");
  }

  const data = await apiCall("/ai/ask", {
    method: "POST",
    body: JSON.stringify({
      type: "formula",
      prompt,
      excelContext,
    }),
  });

  // Backend trả về { result: {...}, cached, creditsRemaining }
  return data.result;
}

/**
 * Analyze Excel data
 * Gọi BE endpoint: POST /api/v1/ai/ask với type="analysis"
 */
export async function analyzeExcelData(excelContext) {
  if (!excelContext || !excelContext.sampleData || excelContext.sampleData.length === 0) {
    throw new Error("Không có dữ liệu để phân tích!");
  }

  const data = await apiCall("/ai/ask", {
    method: "POST",
    body: JSON.stringify({
      type: "analysis",
      prompt: "analyze", // BE cần prompt cho cache key
      excelContext,
    }),
  });

  return data.result;
}

/**
 * Generate step-by-step guide
 * Gọi BE endpoint: POST /api/v1/ai/ask với type="guide"
 */
export async function generateStepByStep(task) {
  if (!task || !task.trim()) {
    throw new Error("Task description không được rỗng!");
  }

  const data = await apiCall("/ai/ask", {
    method: "POST",
    body: JSON.stringify({
      type: "guide",
      prompt: task,
    }),
  });

  return data.result;
}

// ============================================================================
// AI HISTORY
// ============================================================================

/**
 * Lấy lịch sử AI
 */
export async function getAIHistory(type = null, page = 1, limit = 20) {
  let url = `/ai/history?page=${page}&limit=${limit}`;
  if (type) {
    url += `&type=${type}`;
  }
  return apiCall(url);
}

/**
 * Xóa một mục lịch sử
 */
export async function deleteAIHistory(id) {
  return apiCall(`/ai/history/${id}`, {
    method: "DELETE",
  });
}

/**
 * Hủy request AI đang pending
 */
export async function cancelAIRequest(requestId) {
  return apiCall(`/ai/cancel/${requestId}`, {
    method: "POST",
  });
}

// ============================================================================
// EXCEL CONTEXT SERVICE (Client-side - không qua BE)
// ============================================================================

/**
 * Get Excel context từ active worksheet
 * NOTE: Chạy ở CLIENT SIDE (Excel Add-in API)
 */
export async function getExcelContext() {
  return getExcelContextFromService();
}

/**
 * Insert formula vào Excel
 * NOTE: Client-side operation qua Excel API
 */
export async function insertFormulaToExcel(formula, targetCell = null) {
  try {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const range = targetCell ? sheet.getRange(targetCell) : context.workbook.getSelectedRange();

      range.load("address");
      await context.sync();

      // Clean formula - loại bỏ các ký tự không hợp lệ
      let cleanFormula = formula.trim();

      // Đảm bảo formula bắt đầu bằng =
      if (!cleanFormula.startsWith("=")) {
        cleanFormula = "=" + cleanFormula;
      }

      // Fix escape issues - thay thế backslash sai
      cleanFormula = cleanFormula.replace(/\\\\/g, "\\");

      // Thử insert như formula trước
      try {
        range.formulas = [[cleanFormula]];
        await context.sync();
      } catch (formulaError) {
        console.warn("Formula insert failed, trying as value:", formulaError);
        // Nếu fail, thử insert như text công thức để user copy
        range.values = [[cleanFormula]];
        await context.sync();
      }

      range.format.autofitColumns();
      await context.sync();

      return { success: true, address: range.address };
    });
  } catch (error) {
    console.error("Insert formula error:", error);
    throw new Error("Không thể insert formula vào Excel: " + error.message);
  }
}

// ============================================================================
// DEPRECATED - Giữ lại cho backward compatibility nhưng sẽ xóa
// ============================================================================

/**
 * @deprecated Không còn cần API key vì BE dùng system key
 */
export function hasApiKey() {
  // Giờ chỉ cần check login
  return isLoggedIn();
}

/**
 * @deprecated Không còn cần
 */
export async function saveApiKey(apiKey) {
  console.warn("saveApiKey() is deprecated. System uses server-side API key.");
  return { success: true };
}

/**
 * @deprecated Không còn cần
 */
export async function clearApiKey() {
  console.warn("clearApiKey() is deprecated. System uses server-side API key.");
  return { success: true };
}

/**
 * @deprecated Không còn cần
 */
export function getApiKeyMasked() {
  return "System API Key";
}

// ============================================================================
// ADMIN APIs
// ============================================================================

/**
 * Lấy thống kê admin
 */
export async function getAdminStats() {
  return apiCall("/admin/stats");
}

/**
 * Lấy danh sách giao dịch admin
 */
export async function getAdminTransactions(page = 1, limit = 20, search = "", status = "") {
  let url = `/admin/transactions?page=${page}&limit=${limit}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (status) url += `&status=${status}`;
  return apiCall(url);
}

/**
 * Lấy danh sách giao dịch chưa khớp
 */
export async function getAdminUnmatchedTransactions(limit = 50) {
  return apiCall(`/admin/transactions/unmatched?limit=${limit}`);
}

/**
 * Khớp giao dịch thủ công
 */
export async function manualMatchTransaction(transactionId, intentId) {
  return apiCall("/admin/transactions/manual-match", {
    method: "POST",
    body: JSON.stringify({ transactionId, intentId }),
  });
}

/**
 * Lấy danh sách người dùng admin
 */
export async function getAdminUsers(page = 1, limit = 20, search = "", plan = "") {
  let url = `/admin/users?page=${page}&limit=${limit}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (plan) url += `&plan=${plan}`;
  return apiCall(url);
}

/**
 * Lấy logs webhook
 */
export async function getWebhookLogs(page = 1, limit = 50, status = "") {
  let url = `/admin/webhook-logs?page=${page}&limit=${limit}`;
  if (status) url += `&status=${status}`;
  return apiCall(url);
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  // Auth
  register,
  login,
  logout,
  isLoggedIn,
  getProfile,
  getCredits,

  // AI Features
  generateExcelFormula,
  analyzeExcelData,
  generateStepByStep,

  // AI History
  getAIHistory,
  deleteAIHistory,
  cancelAIRequest,

  // Excel Context (client-side)
  getExcelContext,
  insertFormulaToExcel,

  // Deprecated
  hasApiKey,
  saveApiKey,
  clearApiKey,
  getApiKeyMasked,

  // Admin
  getAdminStats,
  getAdminTransactions,
  getAdminUnmatchedTransactions,
  manualMatchTransaction,
  getAdminUsers,
  getWebhookLogs,
};
