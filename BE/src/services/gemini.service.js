/**
 * Gemini AI Service for Backend
 *
 * Gọi Google Gemini API với:
 * - System API key (từ .env)
 * - Retry logic với exponential backoff
 * - JSON response parsing và fixing
 * - Các prompts cho formula, analysis, guide
 */

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1";

// Danh sách models ưu tiên (cập nhật 2026)
// Gemini 3.0 Flash - mới nhất, nhanh và mạnh
// Gemini 2.5 Flash/Pro - ổn định, chất lượng cao
const PREFERRED_MODELS = [
  "gemini-3-flash",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash-latest",
];

// Cache model đã chọn
let cachedModel = null;

/**
 * Lấy API key từ environment
 */
function getApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.trim()) {
    throw new Error("GEMINI_API_KEY không được cấu hình trong .env!");
  }
  return key.trim();
}

/**
 * Clean và fix JSON response từ AI
 */
function cleanJSONResponse(text) {
  let cleaned = text.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```json?\n?/i, "")
      .replace(/\n?```$/, "")
      .trim();
  }

  // Extract JSON object if embedded in text
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Fix trailing commas
  cleaned = cleaned.replace(/,(\s*\])/g, "$1");
  cleaned = cleaned.replace(/,(\s*\})/g, "$1");

  // Fix malformed JSON: "key":} or "key":] -> "key":""} or "key":""]
  cleaned = cleaned.replace(/"([^"]+)":\s*([}\]])/g, '"$1":""$2');
  cleaned = cleaned.replace(/"([^"]+)":\s*,/g, '"$1":"",');

  // ============================================
  // FIX FORMULA TRUNCATION AND ESCAPE ISSUES
  // ============================================

  // Nếu công thức bị cắt (có formula: "=... nhưng không có closing quote)
  // Tìm formula field và fix
  const formulaMatch = cleaned.match(/"formula"\s*:\s*"([^"]*?)(?:\\)?$/m);
  if (formulaMatch) {
    // Công thức bị cắt, thêm closing quote
    cleaned = cleaned.replace(
      /"formula"\s*:\s*"([^"]*?)(?:\\)?$/m,
      '"formula":"$1"'
    );
  }

  // Fix backslash trước quote trong công thức (\\\" -> ")
  // AI thường viết: Orders[Payment]=\"Paid\"
  // Cần giữ nguyên backslash để JSON parse đúng

  // Fix missing closing braces/brackets
  const openBraces = (cleaned.match(/{/g) || []).length;
  const closeBraces = (cleaned.match(/}/g) || []).length;
  const openBrackets = (cleaned.match(/\[/g) || []).length;
  const closeBrackets = (cleaned.match(/\]/g) || []).length;

  if (openBrackets > closeBrackets) {
    cleaned += "]".repeat(openBrackets - closeBrackets);
  }
  if (openBraces > closeBraces) {
    cleaned += "}".repeat(openBraces - closeBraces);
  }

  return cleaned;
}

/**
 * Sau khi parse JSON, fix công thức Excel
 */
function fixFormulaEscapes(formula) {
  if (!formula || typeof formula !== "string") return formula;

  // Loại bỏ backslash thừa trước quotes
  // \"Paid\" -> "Paid"
  let fixed = formula.replace(/\\"/g, '"');

  // Fix double backslash
  fixed = fixed.replace(/\\\\/g, "\\");

  return fixed;
}

/**
 * List available models
 */
async function listModels() {
  const apiKey = getApiKey();
  const url = `${GEMINI_BASE_URL}/models?key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const models = Array.isArray(data?.models)
      ? data.models.map((m) => m.name.replace("models/", ""))
      : [];
    return models;
  } catch (error) {
    console.error("List models error:", error);
    return [];
  }
}

/**
 * Pick available model from preferred list
 */
async function pickAvailableModel() {
  const availableModels = await listModels();
  const modelSet = new Set(availableModels);

  for (const model of PREFERRED_MODELS) {
    if (modelSet.has(model)) {
      return model;
    }
  }

  // Fallback to first available
  return availableModels[0] || PREFERRED_MODELS[0];
}

/**
 * Call Gemini API with retry logic
 */
async function callGenerateContent(modelName, payload, retryCount = 0) {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000;

  const apiKey = getApiKey();
  const url = `${GEMINI_BASE_URL}/models/${modelName}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}`;
      const errorCode = response.status;

      // Retry logic for specific errors
      if (retryCount < MAX_RETRIES) {
        if (errorCode === 429 || errorCode === 503 || errorCode >= 500) {
          // Đối với lỗi 429, đợi lâu hơn một chút
          const multiplier = errorCode === 429 ? 3 : 2;
          const delay = BASE_DELAY * Math.pow(multiplier, retryCount);

          console.warn(
            `⚠️ API error ${errorCode}. Retrying in ${delay}ms... (${
              retryCount + 1
            }/${MAX_RETRIES})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          return callGenerateContent(modelName, payload, retryCount + 1);
        }
      }

      if (errorCode === 400) {
        throw new Error(`❌ Request không hợp lệ: ${errorMsg}`);
      } else if (errorCode === 401 || errorCode === 403) {
        throw new Error(`❌ API Key không hợp lệ hoặc hết hạn!`);
      } else if (errorCode === 429) {
        throw new Error(`❌ Quá nhiều requests. Vui lòng thử lại sau!`);
      }

      throw new Error(`❌ Lỗi API (${errorCode}): ${errorMsg}`);
    }

    const candidate = data.candidates?.[0];
    const text =
      candidate?.content?.parts
        ?.map((p) => p.text || "")
        .join("\n")
        .trim() || "";

    if (!text) {
      throw new Error("❌ AI trả về response rỗng!");
    }

    return { text };
  } catch (error) {
    if (error.name === "AbortError") {
      if (retryCount < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retryCount);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return callGenerateContent(modelName, payload, retryCount + 1);
      }
      throw new Error("❌ Request timeout sau 30 giây!");
    }

    throw error;
  }
}

/**
 * Ensure model is cached
 */
async function ensureModel() {
  if (!cachedModel) {
    cachedModel = await pickAvailableModel();
    console.log(`📦 Using Gemini model: ${cachedModel}`);
  }
  return cachedModel;
}

// ============================================================================
// PROMPTS TEMPLATES
// ============================================================================

const FORMULA_SYSTEM_PROMPT = `Bạn là CHUYÊN GIA EXCEL 15 năm kinh nghiệm, hỗ trợ Excel 365/2024. Tạo công thức CHÍNH XÁC 100%.

🔥 QUY TẮC BẮT BUỘC:
1. CHỈ dùng cột/table có trong CONTEXT. KHÔNG bịa!
2. Nếu có Named Tables (Ctrl+T), dùng Table[Column] syntax
3. Dùng range CỤ THỂ (B2:B10) không dùng toàn cột B:B
4. Có thể dùng: LET, FILTER, UNIQUE, SORT, XLOOKUP, SUMPRODUCT, MAXIFS, IF

📊 VÍ DỤ VỚI NAMED TABLES:
Nếu có Tables: Customers, Orders, Products
- "Tổng Qty theo CustomerID" → =SUMIF(Orders[CustomerID], A2, Orders[Qty])
- "Lookup Category từ ProductID" → =XLOOKUP(E2, Products[ProductID], Products[Category])
- "Phức tạp với LET" → =LET(cid, A2, orders, FILTER(Orders, Orders[CustomerID]=cid), SUM(orders))

⚠️ QUAN TRỌNG VỀ JSON:
- Trong JSON, dấu " trong công thức phải escape thành \\"
- Ví dụ: Orders[Payment]="Paid" → viết là Orders[Payment]=\\"Paid\\"

✅ TRẢ VỀ JSON VALID (không markdown, escape đúng):
{
  "formula": "=công thức hoàn chỉnh, không cắt xén",
  "explanation": "giải thích ngắn tiếng Việt",
  "example": "ví dụ cụ thể"
}

⛔ KHÔNG BAO GIỜ cắt công thức giữa chừng. Viết đầy đủ.`;

const ANALYSIS_SYSTEM_PROMPT = `Bạn là DATA ANALYST chuyên nghiệp. Phân tích dữ liệu Excel.

QUY TẮC:
- CHỈ dùng số liệu từ context, KHÔNG bịa
- Tính: SUM, AVERAGE, MAX, MIN, COUNT
- Format số: thêm đơn vị, làm tròn đẹp

TRẢ VỀ JSON (không markdown):
{
  "summary": "Tóm tắt ngắn gọn",
  "keyMetrics": [{"label": "Tên", "value": "Giá trị", "icon": "💰"}],
  "trends": [{"type": "positive|negative|neutral", "description": "Mô tả"}],
  "insights": ["Phát hiện quan trọng"],
  "recommendations": ["Đề xuất cụ thể"],
  "warnings": ["Cảnh báo nếu có"],
  "chartSuggestion": {"type": "column|line|pie", "title": "Tiêu đề", "description": "Mô tả"}
}`;

const GUIDE_SYSTEM_PROMPT = `Bạn là GIÁO VIÊN EXCEL chuyên nghiệp. Tạo hướng dẫn CHI TIẾT.

QUY TẮC:
- Mỗi bước CỰC KỲ CỤ THỂ: "Click ô A1" thay vì "Chọn dữ liệu"
- Luôn có ví dụ thực tế
- Luôn có tips và phím tắt
- Cảnh báo lỗi hay gặp

TRẢ VỀ JSON (không markdown):
{
  "taskName": "Tên task rõ ràng",
  "steps": [
    {
      "title": "Tiêu đề bước",
      "description": "Mô tả ngắn",
      "details": ["Hành động 1", "Hành động 2"],
      "tips": "Mẹo hữu ích",
      "warning": "Lỗi hay gặp"
    }
  ]
}`;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generate Excel formula from prompt
 * @param {string} prompt - User's request
 * @param {object} excelContext - Excel context data
 */
export async function generateFormula(prompt, excelContext = null) {
  const model = await ensureModel();

  let userPrompt = `Yêu cầu: ${prompt}`;

  if (excelContext) {
    userPrompt = formatContextForPrompt(excelContext) + userPrompt;

    // Add range hints
    if (excelContext.rowCount) {
      userPrompt += `\n\n⚠️ LƯU Ý: Excel có ${excelContext.rowCount} hàng. Data từ hàng 2-${excelContext.rowCount}.`;
      userPrompt += `\nDùng range CỤ THỂ, KHÔNG dùng toàn cột!`;
    }
  }

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `${FORMULA_SYSTEM_PROMPT}\n\n${userPrompt}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
  };

  const result = await callGenerateContent(model, payload);
  const cleanText = cleanJSONResponse(result.text);

  try {
    const parsed = JSON.parse(cleanText);
    // Fix escape characters trong công thức
    if (parsed.formula) {
      parsed.formula = fixFormulaEscapes(parsed.formula);
    }
    return parsed;
  } catch (error) {
    console.error("JSON Parse Error:", error);
    console.error("Raw AI response:", result.text);
    console.error("Cleaned text:", cleanText);

    // Fallback: Trích xuất công thức từ text nếu có
    const formulaMatch = result.text.match(/=\s*[A-Z]+[^"'\n]*/);
    if (formulaMatch) {
      return {
        formula: formulaMatch[0].trim(),
        explanation:
          "AI đã tạo công thức nhưng response không đúng format. Đây là công thức được trích xuất.",
        example: "",
      };
    }

    // Fallback: Trả về thông báo từ AI nếu không phải JSON
    return {
      formula: "",
      explanation: result.text.substring(0, 500),
      example: "",
    };
  }
}

/**
 * Analyze Excel data
 * @param {object} excelContext - Excel context with sample data
 */
export async function analyzeData(excelContext) {
  if (
    !excelContext ||
    !excelContext.sampleData ||
    excelContext.sampleData.length === 0
  ) {
    throw new Error("Không có dữ liệu để phân tích!");
  }

  const model = await ensureModel();

  const contextText = formatContextForPrompt(excelContext);
  const userPrompt = `${contextText}

PHÂN TÍCH dữ liệu trên:
1. Tìm CỘT SỐ (number type)
2. Tính: Tổng, TB, Max, Min
3. Tìm patterns, insights
4. Đề xuất actions

⚠️ CHỈ dùng số từ data, KHÔNG đoán.`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `${ANALYSIS_SYSTEM_PROMPT}\n\n${userPrompt}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  };

  const result = await callGenerateContent(model, payload);
  const cleanText = cleanJSONResponse(result.text);

  try {
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("JSON Parse Error:", error);
    // Return fallback response
    return {
      summary: "AI đã phân tích nhưng gặp lỗi định dạng. Vui lòng thử lại.",
      keyMetrics: [],
      trends: [],
      insights: ["Dữ liệu đã được đọc thành công"],
      recommendations: ["Thử lại để nhận phân tích chi tiết"],
      warnings: [],
      chartSuggestion: null,
    };
  }
}

/**
 * Generate step-by-step guide
 * @param {string} task - Task description
 */
export async function generateGuide(task) {
  if (!task || !task.trim()) {
    throw new Error("Task description không được rỗng!");
  }

  const model = await ensureModel();

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `${GUIDE_SYSTEM_PROMPT}\n\nTask: ${task}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 10240,
    },
  };

  const result = await callGenerateContent(model, payload);
  const cleanText = cleanJSONResponse(result.text);

  try {
    const parsed = JSON.parse(cleanText);
    if (!parsed.taskName || !parsed.steps || !Array.isArray(parsed.steps)) {
      throw new Error("Invalid response structure");
    }
    return parsed;
  } catch (error) {
    console.error("JSON Parse Error:", error);
    throw new Error("Response không hợp lệ. Thử mô tả task ngắn gọn hơn!");
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format Excel context thành text cho AI prompt
 */
function formatContextForPrompt(context) {
  if (!context) return "";

  let contextText = "\n📊 CONTEXT TỪ EXCEL HIỆN TẠI:\n";
  contextText +=
    "═══════════════════════════════════════════════════════════════════\n";

  // Sheet info + VỊ TRÍ QUAN TRỌNG
  contextText += `📄 Sheet: ${context.sheetName}\n`;
  contextText += `📍 Vùng dữ liệu: ${context.usedRange}\n`;

  // THÔNG TIN VỊ TRÍ CHÍNH XÁC
  if (context.startRow) {
    contextText += `🎯 Header bắt đầu từ hàng: ${context.startRow}\n`;
    contextText += `🎯 Data bắt đầu từ hàng: ${context.startRow + 1}\n`;
  }

  // Ô đang được chọn - RẤT QUAN TRỌNG cho việc tạo công thức
  if (context.selectedCell) {
    contextText += `📌 Ô đang chọn: ${context.selectedCell.address} (Hàng ${context.selectedCell.row}, Cột ${context.selectedCell.column})\n`;
  }
  contextText += "\n";

  // Headers and columns VỚI ĐỊA CHỈ CHÍNH XÁC
  if (context.columns && context.columns.length > 0) {
    contextText += "📋 CẤU TRÚC CỘT (với địa chỉ thực tế):\n";
    context.columns.forEach((col) => {
      if (col.hasData) {
        contextText += `  • Cột ${col.column} "${col.name}": ${col.type}`;
        // Thêm data range thực tế
        if (col.dataRange) {
          contextText += ` [Range: ${col.dataRange}]`;
        }
        if (col.sampleData && col.sampleData.length > 0) {
          contextText += ` (VD: ${col.sampleData.slice(0, 2).join(", ")})`;
        }
        contextText += `\n`;
      }
    });
  }

  // Raw data preview với địa chỉ ô chính xác
  if (context.rawDataPreview && context.rawDataPreview.length > 0) {
    contextText += `\n📊 DỮ LIỆU VỚI ĐỊA CHỈ Ô:\n`;
    context.rawDataPreview.forEach((rowData) => {
      contextText += `  Hàng ${rowData.row}: `;
      const cells = Object.entries(rowData.cells).slice(0, 5);
      contextText += cells.map(([addr, val]) => `${addr}="${val}"`).join(", ");
      contextText += "\n";
    });
  } else if (context.sampleData && context.sampleData.length > 0) {
    // Fallback to old format
    const startRow = context.startRow || 1;
    contextText += `\n📊 DỮ LIỆU MẪU:\n`;
    context.sampleData.forEach((row) => {
      const rowNum = row._rowNumber || "?";
      contextText += `  Hàng ${rowNum}: `;
      const entries = Object.entries(row)
        .filter(([k]) => k !== "_rowNumber")
        .slice(0, 5);
      contextText += entries.map(([k, v]) => `${k}=${v}`).join(", ");
      contextText += "\n";
    });
  }

  // ============================================
  // NAMED TABLES (Excel Tables created with Ctrl+T)
  // ============================================
  if (context.namedTables && context.namedTables.length > 0) {
    contextText += `\n📋 NAMED TABLES (Excel Tables):\n`;
    context.namedTables.forEach((table) => {
      contextText += `  🔹 Table "${table.name}":\n`;
      contextText += `     - Columns: ${table.columns.join(", ")}\n`;
      contextText += `     - Data Range: ${table.dataRange} (${table.rowCount} rows)\n`;
      contextText += `     - Có thể dùng: ${table.name}[ColumnName] trong công thức\n`;
    });
    contextText += `\n  💡 GỢI Ý: Dùng Table references như Customers[CustomerID], Orders[Qty] thay vì A:A, B:B\n`;
  }

  contextText +=
    "═══════════════════════════════════════════════════════════════════\n\n";

  return contextText;
}
