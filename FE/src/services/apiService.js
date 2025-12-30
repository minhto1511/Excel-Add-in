/**
 * API Service - Frontend API Client
 *
 * ARCHITECTURE DECISION:
 * - Frontend (React) CHỈ gọi API, KHÔNG xử lý business logic
 * - Backend (Node.js + Express) xử lý TẤT CẢ business logic
 * - Frontend chỉ giữ UI state và hiển thị dữ liệu từ API
 *
 * TODO BACKEND: Implement các endpoint sau trong Express server
 */

// ============================================================================
// API CONFIGURATION
// ============================================================================

// TODO PRODUCTION: Thay đổi URL này khi deploy backend lên production
const API_BASE_URL = "http://localhost:3001/api";

/**
 * Generic API call wrapper với error handling
 */
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `API Error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Call failed [${endpoint}]:`, error);
    throw error;
  }
}

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

/**
 * Save API key
 * TODO BACKEND: POST /api/config/api-key
 * - Validate API key format
 * - Encrypt và store securely (không lưu localStorage ở production!)
 * - Return success status
 */
export async function saveApiKey(apiKey) {
  // TEMPORARY: Lưu localStorage (chỉ để demo)
  // Production: Phải gọi backend để encrypt và lưu secure
  localStorage.setItem("gemini_api_key", apiKey.trim());

  /* TODO BACKEND:
  return apiCall('/config/api-key', {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
  });
  */

  return { success: true, message: "API key saved" };
}

/**
 * Clear API key
 * TODO BACKEND: DELETE /api/config/api-key
 */
export async function clearApiKey() {
  // TEMPORARY
  localStorage.removeItem("gemini_api_key");

  /* TODO BACKEND:
  return apiCall('/config/api-key', {
    method: 'DELETE',
  });
  */

  return { success: true };
}

/**
 * Check if API key exists
 * TODO BACKEND: GET /api/config/api-key/status
 */
export function hasApiKey() {
  // TEMPORARY
  const key = localStorage.getItem("gemini_api_key");
  return !!(key && key.trim());

  /* TODO BACKEND:
  return apiCall('/config/api-key/status');
  */
}

/**
 * Get masked API key for display
 * TODO BACKEND: GET /api/config/api-key/masked
 */
export function getApiKeyMasked() {
  // TEMPORARY
  const key = localStorage.getItem("gemini_api_key");
  if (!key || key.length < 10) return "";
  return key.substring(0, 10) + "..." + key.substring(key.length - 4);

  /* TODO BACKEND:
  return apiCall('/config/api-key/masked');
  */
}

// ============================================================================
// FORMULA GENERATION
// ============================================================================

/**
 * Generate Excel formula from prompt
 *
 * TODO BACKEND: POST /api/formula/generate
 * Request body: {
 *   prompt: string,
 *   excelContext?: {
 *     sheetName: string,
 *     rowCount: number,
 *     columnCount: number,
 *     headers: array,
 *     columns: array,
 *     sampleData: array
 *   }
 * }
 *
 * Response: {
 *   formula: string,
 *   explanation: string,
 *   example?: string
 * }
 *
 * BACKEND RESPONSIBILITIES:
 * - Validate prompt (length, content)
 * - Get API key từ secure storage
 * - Call Gemini API với prompt engineering
 * - Parse và validate AI response
 * - Handle errors, retries, rate limits
 * - Log requests for analytics
 * - Cache results để optimize
 */
export async function generateExcelFormula(prompt, excelContext = null) {
  if (!prompt || !prompt.trim()) {
    throw new Error("Prompt không được rỗng!");
  }

  /* TODO BACKEND: Uncomment khi backend ready
  return apiCall('/formula/generate', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      excelContext,
    }),
  });
  */

  // FALLBACK: Temporary - gọi trực tiếp geminiService (sẽ xóa sau khi có backend)
  const { generateExcelFormula: legacyGenerate } = await import("./geminiService.js");
  return legacyGenerate(prompt, excelContext);
}

// ============================================================================
// DATA ANALYSIS
// ============================================================================

/**
 * Analyze Excel data and provide insights
 *
 * TODO BACKEND: POST /api/analysis/data
 * Request body: {
 *   excelContext: {
 *     sheetName: string,
 *     rowCount: number,
 *     columnCount: number,
 *     columns: array,
 *     sampleData: array
 *   }
 * }
 *
 * Response: {
 *   summary: string,
 *   keyMetrics?: array<{ icon, label, value }>,
 *   trends?: array<{ type, description }>,
 *   insights?: array<string>,
 *   recommendations?: array<string>,
 *   warnings?: array<string>,
 *   chartSuggestion?: { title, description }
 * }
 *
 * BACKEND RESPONSIBILITIES:
 * - Validate Excel context data
 * - Get API key
 * - Call Gemini API cho analysis
 * - Parse và structure response
 * - Handle errors
 */
export async function analyzeExcelData(excelContext) {
  if (!excelContext || !excelContext.sampleData || excelContext.sampleData.length === 0) {
    throw new Error("Không có dữ liệu để phân tích!");
  }

  /* TODO BACKEND: Uncomment khi backend ready
  return apiCall('/analysis/data', {
    method: 'POST',
    body: JSON.stringify({ excelContext }),
  });
  */

  // FALLBACK: Temporary
  const { analyzeExcelData: legacyAnalyze } = await import("./geminiService.js");
  return legacyAnalyze(excelContext);
}

// ============================================================================
// STEP-BY-STEP GUIDE
// ============================================================================

/**
 * Generate step-by-step guide for Excel task
 *
 * TODO BACKEND: POST /api/guide/generate
 * Request body: {
 *   task: string  // Mô tả task user muốn làm
 * }
 *
 * Response: {
 *   taskName: string,
 *   steps: array<{
 *     title: string,
 *     description: string,
 *     details: array<string>,
 *     tips?: string,
 *     warning?: string
 *   }>
 * }
 *
 * BACKEND RESPONSIBILITIES:
 * - Validate task description
 * - Call Gemini API với prompt engineering
 * - Parse và structure steps
 * - Ensure quality của hướng dẫn
 */
export async function generateStepByStep(task) {
  if (!task || !task.trim()) {
    throw new Error("Task description không được rỗng!");
  }

  /* TODO BACKEND: Uncomment khi backend ready
  return apiCall('/guide/generate', {
    method: 'POST',
    body: JSON.stringify({ task }),
  });
  */

  // FALLBACK: Temporary
  const { generateStepByStep: legacyGenerate } = await import("./geminiService.js");
  return legacyGenerate(task);
}

// ============================================================================
// EXCEL CONTEXT SERVICE
// ============================================================================

/**
 * Get Excel context từ active worksheet
 *
 * NOTE: Function này chạy ở CLIENT SIDE (Excel Add-in API)
 * KHÔNG cần backend API vì data nhạy cảm, không nên gửi lên server
 */
export async function getExcelContext() {
  const { getExcelContext: getContext } = await import("./excelContextService.js");
  return getContext();
}

// ============================================================================
// EXCEL OPERATIONS
// ============================================================================

/**
 * Insert formula vào Excel
 * NOTE: Client-side operation qua Excel API, không cần backend
 */
export async function insertFormulaToExcel(formula, targetCell = null) {
  try {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();

      // Insert vào selected cell hoặc cell chỉ định
      const range = targetCell ? sheet.getRange(targetCell) : context.workbook.getSelectedRange();

      range.load("address");
      await context.sync();

      // Set formula
      range.values = [[formula]];
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
// EXPORT
// ============================================================================

export default {
  // Config
  saveApiKey,
  clearApiKey,
  hasApiKey,
  getApiKeyMasked,

  // Formula
  generateExcelFormula,

  // Analysis
  analyzeExcelData,

  // Guide
  generateStepByStep,

  // Excel Context
  getExcelContext,
  insertFormulaToExcel,
};
