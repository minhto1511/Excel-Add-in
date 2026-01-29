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

// Model mặc định - KHÔNG gọi API để kiểm tra
const DEFAULT_MODEL = "gemini-2.5-flash";

// Cache model đã chọn
let cachedModel = DEFAULT_MODEL;

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
 * Clean AI response to extract pure JSON
 */
function cleanJSONResponse(text) {
  if (!text) return "{}";

  let cleaned = text.trim();

  // Remove markdown code fences (```json, ```, ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/gm, "");
  cleaned = cleaned.replace(/```\s*$/gm, "");

  // Remove any text before first { and after last }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  cleaned = cleaned.replace(/,\s*}/g, "}");
  cleaned = cleaned.replace(/,\s*]/g, "]");

  return cleaned;
}

/**
 * Fix placeholder <<Q>> trong công thức thành dấu nháy kép
 */
function fixFormulaPlaceholder(formula) {
  if (!formula || typeof formula !== "string") return formula;
  return formula.replace(/<<Q>>/g, '"');
}

/**
 * Fallback: Trích xuất công thức từ raw text khi JSON parse fail
 */
function extractFormulaFromText(text) {
  // Ưu tiên 1: Tìm "formula": "..." trong text
  const formulaFieldMatch = text.match(/"formula"\s*:\s*"([\s\S]*?)"/);
  if (formulaFieldMatch && formulaFieldMatch[1]) {
    return fixFormulaPlaceholder(formulaFieldMatch[1]);
  }

  // Ưu tiên 2: Tìm dòng bắt đầu bằng =
  const formulaLineMatch = text.match(/^\s*(=.+)$/m);
  if (formulaLineMatch && formulaLineMatch[1]) {
    return fixFormulaPlaceholder(formulaLineMatch[1].trim());
  }

  return null;
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
 * Call Gemini API with retry logic and signal support
 */
async function callGenerateContent(modelName, payload, options = {}) {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000;
  const { signal: externalSignal, retryCount = 0 } = options;

  const apiKey = getApiKey();
  const url = `${GEMINI_BASE_URL}/models/${modelName}:generateContent?key=${encodeURIComponent(
    apiKey,
  )}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // Listen to external abort signal
    if (externalSignal) {
      externalSignal.addEventListener("abort", () => {
        controller.abort();
        clearTimeout(timeoutId);
      });
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
          const multiplier = errorCode === 429 ? 3 : 2;
          const delay = BASE_DELAY * Math.pow(multiplier, retryCount);

          console.warn(
            `⚠️ API error ${errorCode}. Retrying in ${delay}ms... (${
              retryCount + 1
            }/${MAX_RETRIES})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          return callGenerateContent(modelName, payload, {
            ...options,
            retryCount: retryCount + 1,
          });
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
      // Check if it's external cancel vs timeout
      if (externalSignal?.aborted) {
        throw new Error("Request cancelled");
      }

      if (retryCount < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retryCount);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return callGenerateContent(modelName, payload, {
          ...options,
          retryCount: retryCount + 1,
        });
      }
      throw new Error("❌ Request timeout sau 30 giây!");
    }

    throw error;
  }
}

/**
 * Đảm bảo có model - KHÔNG gọi listModels để tiết kiệm request
 */
async function ensureModel() {
  // Dùng thẳng DEFAULT_MODEL thay vì gọi API
  return cachedModel || DEFAULT_MODEL;
}

// ============================================================================
// PROMPTS TEMPLATES
// ============================================================================

const FORMULA_SYSTEM_PROMPT = `Bạn là CHUYÊN GIA EXCEL 15 năm kinh nghiệm, hỗ trợ Excel 365/2024.

QUY TẮC BẮT BUỘC:
1. CHỈ dùng cột/table có trong CONTEXT. KHÔNG bịa tên bảng/cột.
2. Nếu CONTEXT có "NAMED TABLES" → dùng Table[Column] (Ưu tiên số 1).
3. Nếu CONTEXT KHÔNG có "NAMED TABLES" → TUYỆT ĐỐI không dùng syntax Table[...]. Dùng range A2:A10.
4. LET PHẢI có biểu thức kết quả cuối cùng. Ví dụ: =LET(x, A2, x*2).

VÍ DỤ:
CÓ Named Tables: =SUMIF(Orders[CustomerID], A2, Orders[Qty])
KHÔNG CÓ Tables: =SUMIF(C2:C20, A2, F2:F20)

DẤU NHÁY KÉP:
- Dùng <<Q>> thay cho dấu ".
- Ví dụ: =FILTER(Orders, Orders[Status]=<<Q>>Paid<<Q>>)
- System sẽ tự động chuyển <<Q>> thành " thật.

TRẢ VỀ JSON:
{
  "formula": "=công thức hoàn chỉnh dùng <<Q>>",
  "explanation": "giải thích ngắn gọn",
  "example": "ví dụ cụ thể"
}

TUYỆT ĐỐI KHÔNG:
- Cắt công thức giữa chừng.
- Dùng tên bảng không có trong context.`;

const ANALYSIS_SYSTEM_PROMPT = `Bạn là DATA ANALYST chuyên nghiệp.

NGUYÊN TẮC:
1. MULTI-TABLE: Nếu context có nhiều bảng → phân tích TẤT CẢ
2. ACCURATE COUNT: Dùng rowCount, KHÔNG đếm sample
3. DATE PARSING: Số 30000-60000 = Excel date serial → PHẢI convert sang ngày (1899-12-30 + N ngày)
   VD: 45530 = 2024-08-07 (hiển thị "7/8/2024" hoặc "2024-08-07")
4. NO GUESSING: Không đoán nếu không rõ
5. VIETNAMESE: TRẢ LỜI 100% TIẾNG VIỆT - label, value, description TẤT CẢ phải tiếng Việt

QUAN TRỌNG - OUTPUT:
- TRẢ VỀ DUY NHẤT 1 JSON OBJECT
- KHÔNG viết markdown \`\`\`json
- KHÔNG viết heading/tiêu đề
- KHÔNG giải thích
- CHỈ JSON thuần túy
- TẤT CẢ nội dung TIẾNG VIỆT

SCHEMA:
{
  "summary": "string (tiếng Việt)",
  "keyMetrics": [{"label": "string (tiếng Việt)", "value": "string (tiếng Việt)"}],
  "trends": [{"type": "positive|negative|neutral", "description": "string (tiếng Việt)"}],
  "insights": ["string (tiếng Việt)"],
  "recommendations": ["string (tiếng Việt)"],
  "warnings": ["string (tiếng Việt)"],
  "chartSuggestion": {"type": "column|line|pie", "title": "string (tiếng Việt)", "description": "string (tiếng Việt)"}
}`;

const GUIDE_SYSTEM_PROMPT = `Bạn là GIÁO VIÊN EXCEL chuyên nghiệp. Tạo hướng dẫn CHI TIẾT.

QUY TẮC:
- Mỗi bước CỰC KỲ CỤ THỂ: "Click ô A1" thay vì "Chọn dữ liệu"
- Luôn có ví dụ thực tế
- Luôn có tips và phím tắt
- Cảnh báo lỗi hay gặp

TRẢ VỀ JSON:
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

const VBA_SYSTEM_PROMPT = `Bạn là CHUYÊN GIA VBA/MACRO lập trình Excel với 15 năm kinh nghiệm.

NHIỆM VỤ:
- Viết code VBA hoàn chỉnh, có thể chạy ngay
- Code phải có comments giải thích
- Xử lý errors (On Error)
- Tương thích Excel 2016+

QUY TẮC CODE:
1. Sub/Function phải có tên rõ ràng
2. Declare biến (Dim) đầy đủ
3. Dùng With...End With để tối ưu
4. Có MsgBox thông báo hoàn thành
5. Xử lý ActiveSheet/ActiveWorkbook an toàn

VÍ DỤ OUTPUT:
\`\`\`vba
Sub HighlightEvenRows()
    ' Tô màu các hàng chẵn
    Dim ws As Worksheet
    Dim lastRow As Long
    Dim i As Long
    
    On Error GoTo ErrorHandler
    
    Set ws = ActiveSheet
    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    
    For i = 2 To lastRow Step 2
        ws.Rows(i).Interior.Color = RGB(220, 230, 241)
    Next i
    
    MsgBox "Đã tô màu " & (lastRow \\ 2) & " hàng chẵn!", vbInformation
    Exit Sub
    
ErrorHandler:
    MsgBox "Lỗi: " & Err.Description, vbCritical
End Sub
\`\`\`

TRẢ VỀ JSON:
{
  "macroName": "Tên macro ngắn gọn",
  "description": "Mô tả chức năng",
  "code": "// Code VBA đầy đủ, có comments",
  "howToUse": ["Bước 1", "Bước 2", "..."],
  "warnings": ["Cảnh báo 1 (nếu có)"]
}

TUYỆT ĐỐI KHÔNG:
- Code thiếu Sub/End Sub
- Code không chạy được
- Không xử lý lỗi
- TUYỆT ĐỐI KHÔNG dùng emoji trong comments hay MsgBox`;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generate Excel formula from prompt
 * @param {string} prompt - User's request
 * @param {object} excelContext - Excel context data
 * @param {object} options - { signal }
 */
export async function generateFormula(
  prompt,
  excelContext = null,
  options = {},
) {
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

  const result = await callGenerateContent(model, payload, options);
  const cleanText = cleanJSONResponse(result.text);

  try {
    const parsed = JSON.parse(cleanText);
    if (parsed.formula) {
      parsed.formula = fixFormulaPlaceholder(parsed.formula);
    }
    return parsed;
  } catch (parseError) {
    console.warn("JSON Parse failed, attempting fallback extraction...");

    // Fallback: Dùng extractFormulaFromText
    const extractedFormula = extractFormulaFromText(result.text);
    if (extractedFormula) {
      return {
        formula: extractedFormula,
        explanation: "Đã trích xuất công thức từ JSON lỗi định dạng.",
        example: "",
      };
    }

    // Fallback cuối: Trả về text từ AI
    return {
      formula: "",
      explanation: result.text.substring(0, 500),
      example: "",
    };
  }
}

/**
 * Analyze Excel data
 * @param {object} excelContext - Excel context
 * @param {object} options - { signal }
 */
export async function analyzeData(excelContext, options = {}) {
  if (!excelContext) {
    throw new Error("Excel context không được rỗng!");
  }
  if (!excelContext.sampleData || excelContext.sampleData.length === 0) {
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

  const result = await callGenerateContent(model, payload, options);
  const cleanText = cleanJSONResponse(result.text);

  try {
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("JSON Parse Error:", error);

    // Fallback: Trích xuất insights từ raw text
    const summary = result.text.substring(0, 200);
    const insights = [];

    // Tìm các câu quan trọng
    const sentences = result.text
      .split(/[.!?]\s+/)
      .filter((s) => s.length > 20);
    insights.push.apply(insights, sentences.slice(0, 3));

    return {
      summary: summary || "Đã đọc dữ liệu nhưng gặp lỗi định dạng.",
      keyMetrics: [],
      trends: [],
      insights:
        insights.length > 0 ? insights : ["Dữ liệu đã được đọc thành công"],
      recommendations: ["Thử lại để nhận phân tích chi tiết"],
      warnings: [],
      chartSuggestion: null,
    };
  }
}

/**
 * Generate step-by-step guide
 * @param {string} task - Task description
 * @param {object} options - { signal }
 */
export async function generateGuide(task, options = {}) {
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

  const result = await callGenerateContent(model, payload, options);
  const cleanText = cleanJSONResponse(result.text);

  try {
    const parsed = JSON.parse(cleanText);
    if (!parsed.taskName || !parsed.steps || !Array.isArray(parsed.steps)) {
      throw new Error("Invalid response structure");
    }
    return parsed;
  } catch (error) {
    console.error("JSON Parse Error:", error);

    // Fallback: Trích xuất steps từ raw text
    const lines = result.text.split("\n").filter((l) => l.trim());
    const steps = [];

    // Tìm các bước (dòng bắt đầu bằng số hoặc -, •)
    lines.forEach((line) => {
      if (/^[\d\-•]/.test(line.trim())) {
        steps.push({
          title: line.trim().replace(/^[\d\-•.)\s]+/, ""),
          description: "",
          details: [],
          tips: "",
          warning: "",
        });
      }
    });

    if (steps.length > 0) {
      return {
        taskName: task,
        steps: steps,
      };
    }

    throw new Error("Không thể trích xuất hướng dẫn. Thử mô tả ngắn gọn hơn!");
  }
}

/**
 * Generate VBA/Macro code from description
 * @param {string} description - User's description of what the macro should do
 * @param {object} excelContext - Excel context data (optional)
 * @param {object} options - { signal }
 */
export async function generateVBA(
  description,
  excelContext = null,
  options = {},
) {
  if (!description || !description.trim()) {
    throw new Error("Mô tả macro không được rỗng!");
  }

  console.log("📝 Generating VBA for:", description.substring(0, 50));

  try {
    const model = await ensureModel();

    let userPrompt = `Yêu cầu: ${description}`;

    // VBA chỉ cần structure info, không cần sample data (tránh timeout)
    if (excelContext) {
      console.log("📊 Excel context detected, formatting lightweight...");
      try {
        userPrompt = formatLightweightContext(excelContext) + userPrompt;
      } catch (ctxErr) {
        console.error("❌ Error formatting VBA context:", ctxErr);
        // Continue even if context formatting fails
      }
    }

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `${VBA_SYSTEM_PROMPT}\n\n${userPrompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
      },
    };

    console.log("🚀 Calling Gemini for VBA...");
    const result = await callGenerateContent(model, payload, options);
    const cleanText = cleanJSONResponse(result.text);

    try {
      const parsed = JSON.parse(cleanText);
      if (!parsed.code || !parsed.macroName) {
        throw new Error("Invalid VBA response structure");
      }
      console.log("✅ VBA generated successfully!");
      return parsed;
    } catch (error) {
      console.warn("JSON Parse failed for VBA, attempting code extraction...");

      // Fallback: Tìm code VBA trong raw text
      const codeMatch =
        result.text.match(/```vba([\s\S]*?)```/i) ||
        result.text.match(/```([\s\S]*?)```/) ||
        result.text.match(/(Sub\s+\w+[\s\S]*?End Sub)/i);

      if (codeMatch && codeMatch[1]) {
        console.log("✅ VBA extracted via fallback!");
        return {
          macroName: "GeneratedMacro",
          description: description,
          code: codeMatch[1].trim(),
          howToUse: [
            "Mở VBA Editor (Alt+F11)",
            "Insert → Module",
            "Paste code vào module",
            "Chạy macro (F5)",
          ],
          warnings: [],
        };
      }

      throw new Error("Không thể tạo VBA code. Thử mô tả cụ thể hơn!");
    }
  } catch (err) {
    console.error("❌ generateVBA main error:", err);
    throw err; // Re-throw to be caught by controller
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

  let contextText = "\nCONTEXT TỪ EXCEL HIỆN TẠI:\n";
  contextText +=
    "═══════════════════════════════════════════════════════════════════\n";

  // Sheet info + VỊ TRÍ QUAN TRỌNG
  contextText += `Sheet: ${context.sheetName}\n`;
  contextText += `Vùng dữ liệu: ${context.usedRange}\n`;

  // THÔNG TIN VỊ TRÍ CHÍNH XÁC
  if (context.startRow) {
    contextText += `Header bắt đầu từ hàng: ${context.startRow}\n`;
    contextText += `Data bắt đầu từ hàng: ${context.startRow + 1}\n`;
  }

  // Ô đang được chọn - RẤT QUAN TRỌNG cho việc tạo công thức
  if (context.selectedCell) {
    contextText += `Ô đang chọn: ${context.selectedCell.address} (Hàng ${context.selectedCell.row}, Cột ${context.selectedCell.column})\n`;
  }
  contextText += "\n";

  // Headers and columns VỚI ĐỊA CHỈ CHÍNH XÁC
  if (context.columns && context.columns.length > 0) {
    contextText += "CẤU TRÚC CỘT (với địa chỉ thực tế):\n";
    context.columns.forEach((col) => {
      if (col && col.hasData) {
        contextText += `  - Cột ${col.column || "?"} "${col.name || "Untitled"}": ${col.type || "unknown"}`;
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
    contextText += `\nDỮ LIỆU VỚI ĐỊA CHỈ Ô:\n`;
    context.rawDataPreview.forEach((rowData) => {
      if (!rowData) return;
      contextText += `  Hàng ${rowData.row}: `;
      const cells = rowData.cells
        ? Object.entries(rowData.cells).slice(0, 5)
        : [];
      contextText += cells.map(([addr, val]) => `${addr}="${val}"`).join(", ");
      contextText += "\n";
    });
  } else if (context.sampleData && context.sampleData.length > 0) {
    // Fallback to old format
    const startRow = context.startRow || 1;
    contextText += `\nDỮ LIỆU MẪU:\n`;
    context.sampleData.forEach((row) => {
      if (!row) return;
      const rowNum = row._rowNumber || "?";
      contextText += `  Hàng ${rowNum}: `;
      const entries = Object.entries(row)
        .filter(([k]) => k !== "_rowNumber")
        .slice(0, 5);
      contextText += entries.map(([k, v]) => `${k}=${v}`).join(", ");
      contextText += "\n";
    });
  }

  // NAMED TABLES (Excel Tables created with Ctrl+T)
  if (context.namedTables && context.namedTables.length > 0) {
    contextText += `\nNAMED TABLES (Excel Tables):\n`;
    context.namedTables.forEach((table) => {
      if (!table) return;
      const cols = table.columns ? table.columns.join(", ") : "unknown";
      contextText += `  - Table "${table.name}":\n`;
      contextText += `    Columns: ${cols}\n`;
      contextText += `    Data Range: ${table.dataRange} (${table.rowCount} rows)\n`;
      contextText += `    Có thể dùng: ${table.name}[ColumnName] trong công thức\n`;
    });
    contextText += `\n  GỢI Ý: Dùng Table references như Customers[CustomerID], Orders[Qty] thay vì A:A, B:B\n`;
  }

  contextText +=
    "═══════════════════════════════════════════════════════════════════\n\n";

  return contextText;
}

/**
 * Format lightweight context cho VBA - chỉ structure, không data
 * Giúp giảm token count và tránh timeout
 */
function formatLightweightContext(context) {
  if (!context) return "";

  let contextText = "\nEXCEL STRUCTURE INFO:\n";
  contextText += "───────────────────────────────────────\n";

  try {
    // Basic info
    contextText += `Sheet: ${context.sheetName || "Sheet1"}\n`;
    contextText += `Data Range: ${context.usedRange || "A1:?"}\n`;
    contextText += `Size: ${context.rowCount || "?"} rows × ${context.columnCount || "?"} cols\n`;

    // Headers only (max 15)
    if (
      context.headers &&
      Array.isArray(context.headers) &&
      context.headers.length > 0
    ) {
      const headers = context.headers.slice(0, 15);
      contextText += `Columns: ${headers.join(", ")}${context.headers.length > 15 ? "..." : ""}\n`;
    }

    // Column types (without sample data)
    if (
      context.columns &&
      Array.isArray(context.columns) &&
      context.columns.length > 0
    ) {
      const colTypes = context.columns
        .filter((c) => c && c.hasData)
        .slice(0, 10)
        .map(
          (c) =>
            `${c.column || "?"}:${c.name || "Untitled"}(${c.type || "unknown"})`,
        )
        .join(", ");
      if (colTypes) {
        contextText += `Column Types: ${colTypes}\n`;
      }
    }

    // Named Tables (important for VBA)
    if (
      context.namedTables &&
      Array.isArray(context.namedTables) &&
      context.namedTables.length > 0
    ) {
      contextText += `\nNamed Tables:\n`;
      context.namedTables.forEach((table) => {
        if (!table) return;
        const cols = table.columns
          ? table.columns.slice(0, 8).join(", ")
          : "unknown";
        contextText += `  - ${table.name || "Table"}: ${cols}${
          table.columns && table.columns.length > 8 ? "..." : ""
        } (${table.rowCount || "?"} rows)\n`;
      });
    }
  } catch (err) {
    console.error("❌ Error in formatLightweightContext:", err);
    contextText += "[Error extracting full structure info]\n";
  }

  contextText += "───────────────────────────────────────\n\n";

  return contextText;
}
