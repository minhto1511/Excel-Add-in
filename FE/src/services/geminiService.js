/**
 * Gemini API Service for eOfficeAI
 * 
 * User nhập API key qua UI, lưu trong localStorage
 */

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1';

/**
 * Lấy API key từ localStorage
 */
function getApiKey() {
  const key = localStorage.getItem('gemini_api_key');
  if (!key || !key.trim()) {
    throw new Error('⚠️ Chưa có API key! Vui lòng nhập API key để sử dụng.');
  }
  return key.trim();
}

/**
 * Lưu API key vào localStorage
 */
export function saveApiKey(key) {
  if (!key || !key.trim()) {
    throw new Error('API key không hợp lệ');
  }
  localStorage.setItem('gemini_api_key', key.trim());
}

/**
 * Xóa API key
 */
export function clearApiKey() {
  localStorage.removeItem('gemini_api_key');
}

/**
 * Check đã có API key chưa
 */
export function hasApiKey() {
  const key = localStorage.getItem('gemini_api_key');
  return !!(key && key.trim());
}

/**
 * Lấy key masked để hiển thị
 */
export function getApiKeyMasked() {
  const key = localStorage.getItem('gemini_api_key');
  if (!key || key.length < 10) return '';
  return key.substring(0, 10) + '...' + key.substring(key.length - 4);
}

// Danh sách models ưu tiên
const PREFERRED_MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

// Cache model đã chọn
let cachedModel = null;

// Simple in-memory cache for formula results
const formulaCache = new Map();
const CACHE_MAX_SIZE = 50; // Limit cache size
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Generate cache key from prompt and context
 */
function getCacheKey(prompt, excelContext) {
  const contextKey = excelContext ? JSON.stringify({
    rowCount: excelContext.rowCount,
    columnCount: excelContext.columnCount,
    columns: excelContext.columns?.map(c => ({ name: c.name, type: c.type }))
  }) : 'no-context';
  
  return `${prompt.toLowerCase().trim()}|${contextKey}`;
}

/**
 * Get from cache if available and not expired
 */
function getFromCache(key) {
  const cached = formulaCache.get(key);
  if (!cached) return null;
  
  // Check expiry
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    formulaCache.delete(key);
    return null;
  }
  
  console.log('✅ Cache hit!');
  return cached.result;
}

/**
 * Save to cache with size limit
 */
function saveToCache(key, result) {
  // If cache is full, remove oldest entry
  if (formulaCache.size >= CACHE_MAX_SIZE) {
    const firstKey = formulaCache.keys().next().value;
    formulaCache.delete(firstKey);
  }
  
  formulaCache.set(key, {
    result,
    timestamp: Date.now()
  });
}

/**
 * Clean và fix JSON response từ AI
 */
function cleanJSONResponse(text) {
  let cleaned = text.trim();
  
  // Remove markdown code blocks
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json?\n?/i, '').replace(/\n?```$/, '').trim();
  }
  
  // Extract JSON object if embedded in text (find first { and last })
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  // Fix unterminated strings - more robust approach
  // Track string state while parsing to find unterminated strings
  let inString = false;
  let stringStartIndex = -1;
  let escapeNext = false;
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const prevChar = i > 0 ? cleaned[i - 1] : '';
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && prevChar !== '\\') {
      if (!inString) {
        // Check if this is a value (after :)
        const beforeQuote = cleaned.substring(Math.max(0, i - 50), i).trim();
        if (beforeQuote.endsWith(':')) {
          inString = true;
          stringStartIndex = i;
        }
      } else {
        // Check if this is a valid closing quote
        const afterQuote = cleaned.substring(i + 1).trim();
        if (afterQuote.startsWith(',') || afterQuote.startsWith('}') || 
            afterQuote.startsWith(']') || afterQuote.length === 0) {
          inString = false;
          stringStartIndex = -1;
        }
      }
    }
  }
  
  // If we're still in a string at the end, close it
  if (inString && stringStartIndex !== -1) {
    // Find where to close - look for next structural character
    let closePos = cleaned.length;
    
    // Check if there's any structural character after current position
    for (let i = cleaned.length - 1; i >= stringStartIndex; i--) {
      const char = cleaned[i];
      if (char === ',' || char === '}' || char === ']') {
        // Close before this character
        closePos = i;
        break;
      }
    }
    
    // If we found a position, close before it; otherwise just add quote at end
    if (closePos < cleaned.length) {
      cleaned = cleaned.substring(0, closePos) + '"' + cleaned.substring(closePos);
    } else {
      cleaned += '"';
    }
  }
  
  // Also check for odd number of unescaped quotes as fallback
  let unescapedQuoteCount = 0;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '"' && (i === 0 || cleaned[i - 1] !== '\\')) {
      unescapedQuoteCount++;
    }
  }
  
  if (unescapedQuoteCount % 2 !== 0) {
    // Still odd - try to find and close the last open string
    // Look for last quote that's not followed by , } or ]
    for (let i = cleaned.length - 1; i >= 0; i--) {
      if (cleaned[i] === '"' && (i === 0 || cleaned[i - 1] !== '\\')) {
        const afterQuote = cleaned.substring(i + 1).trim();
        if (!afterQuote.startsWith(',') && !afterQuote.startsWith('}') && 
            !afterQuote.startsWith(']') && afterQuote.length > 0) {
          // This quote might need to be closed
          // Find next delimiter or just close at end
          let closePos = cleaned.length;
          const nextComma = cleaned.indexOf(',', i + 1);
          const nextBrace = cleaned.indexOf('}', i + 1);
          const nextBracket = cleaned.indexOf(']', i + 1);
          
          if (nextComma !== -1) closePos = Math.min(closePos, nextComma);
          if (nextBrace !== -1) closePos = Math.min(closePos, nextBrace);
          if (nextBracket !== -1) closePos = Math.min(closePos, nextBracket);
          
          if (closePos < cleaned.length) {
            cleaned = cleaned.substring(0, closePos) + '"' + cleaned.substring(closePos);
          } else {
            cleaned += '"';
          }
          break;
        }
      }
    }
  }
  
  // Remove trailing commas (multiple passes)
  cleaned = cleaned.replace(/,(\s*\])/g, '$1');
  cleaned = cleaned.replace(/,(\s*\})/g, '$1');
  
  // Fix malformed JSON: "key":} or "key":] -> "key":""} or "key":""]
  cleaned = cleaned.replace(/"([^"]+)":\s*([}\]])/g, '"$1":""$2');
  
  // Fix malformed JSON: "key":, -> "key":"",
  cleaned = cleaned.replace(/"([^"]+)":\s*,/g, '"$1":"",');
  
  // Fix missing closing braces/brackets
  const openBraces = (cleaned.match(/{/g) || []).length;
  const closeBraces = (cleaned.match(/}/g) || []).length;
  const openBrackets = (cleaned.match(/\[/g) || []).length;
  const closeBrackets = (cleaned.match(/\]/g) || []).length;
  
  if (openBrackets > closeBrackets) {
    cleaned += ']'.repeat(openBrackets - closeBrackets);
  }
  if (openBraces > closeBraces) {
    cleaned += '}'.repeat(openBraces - closeBraces);
  }
  
  // Final attempt: Try to parse and if it fails, try smarter fixes
  try {
    JSON.parse(cleaned);
    // If parse succeeds, return as-is
    return cleaned;
  } catch (e) {
    // Parse failed - apply aggressive fixes for truncated JSON
    
    // Strategy: Find if JSON ends with unterminated string value
    // Look for the pattern where we have ": "something... that's not properly closed
    const lastColonIndex = cleaned.lastIndexOf(':');
    if (lastColonIndex !== -1) {
      const afterColon = cleaned.substring(lastColonIndex + 1).trim();
      if (afterColon.startsWith('"')) {
        // String value started - check if it's properly closed
        // Count unescaped quotes after the colon
        let quoteCount = 0;
        let lastQuotePos = -1;
        for (let i = lastColonIndex + 1; i < cleaned.length; i++) {
          if (cleaned[i] === '"' && (i === 0 || cleaned[i - 1] !== '\\')) {
            quoteCount++;
            lastQuotePos = i;
          }
        }
        
        // If odd number of quotes, string is not closed
        if (quoteCount % 2 !== 0) {
          // String is unterminated - close it before the last }
          const lastBracePos = cleaned.lastIndexOf('}');
          if (lastBracePos > lastQuotePos || lastQuotePos === -1) {
            // There's a } after the last quote (or no quote found), close string before it
            if (lastBracePos > lastColonIndex) {
              cleaned = cleaned.substring(0, lastBracePos) + '"' + cleaned.substring(lastBracePos);
            } else {
              // No } found after colon, just add closing quote
              cleaned += '"';
            }
          } else {
            // Last quote is after last }, which is weird - just close at end
            cleaned += '"';
          }
        } else if (quoteCount === 1) {
          // Only one quote found (opening quote), string was cut immediately
          const lastBracePos = cleaned.lastIndexOf('}');
          if (lastBracePos > lastColonIndex) {
            cleaned = cleaned.substring(0, lastBracePos) + '"' + cleaned.substring(lastBracePos);
          } else {
            cleaned += '"';
          }
        }
      }
    }
    
    // Re-check and fix braces/brackets
    const finalOpenBraces = (cleaned.match(/{/g) || []).length;
    const finalCloseBraces = (cleaned.match(/}/g) || []).length;
    const finalOpenBrackets = (cleaned.match(/\[/g) || []).length;
    const finalCloseBrackets = (cleaned.match(/\]/g) || []).length;
    
    if (finalOpenBrackets > finalCloseBrackets) {
      cleaned += ']'.repeat(finalOpenBrackets - finalCloseBrackets);
    }
    if (finalOpenBraces > finalCloseBraces) {
      cleaned += '}'.repeat(finalOpenBraces - finalCloseBraces);
    }
  }
  
  return cleaned;
}

/**
 * List available models
 */
async function listModels(apiKey) {
  const url = `${GEMINI_BASE_URL}/models?key=${encodeURIComponent(apiKey)}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    
    const data = await res.json();
    const models = Array.isArray(data?.models) 
      ? data.models.map((m) => m.name.replace('models/', '')) 
      : [];
    return models;
  } catch (error) {
    console.error('List models error:', error);
    return [];
  }
}

/**
 * Pick available model from preferred list
 */
async function pickAvailableModel(apiKey) {
  const availableModels = await listModels(apiKey);
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
 * Call API with retry logic and exponential backoff
 */
async function callGenerateContent(modelName, payload, retryCount = 0) {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000; // 1 second
  
  const url = `${GEMINI_BASE_URL}/models/${modelName}:generateContent?key=${encodeURIComponent(getApiKey())}`;
  
  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
        // 429 Rate Limit - retry with exponential backoff
        if (errorCode === 429) {
          const delay = BASE_DELAY * Math.pow(2, retryCount);
          console.warn(`⚠️ Rate limited. Retrying in ${delay}ms... (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return callGenerateContent(modelName, payload, retryCount + 1);
        }
        
        // 503 Service Unavailable - retry
        if (errorCode === 503) {
          const delay = BASE_DELAY * Math.pow(2, retryCount);
          console.warn(`⚠️ Service unavailable. Retrying in ${delay}ms... (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return callGenerateContent(modelName, payload, retryCount + 1);
        }
        
        // 500 Internal Server Error - retry
        if (errorCode >= 500) {
          const delay = BASE_DELAY * Math.pow(2, retryCount);
          console.warn(`⚠️ Server error. Retrying in ${delay}ms... (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return callGenerateContent(modelName, payload, retryCount + 1);
        }
      }
      
      // Enhanced error messages
      if (errorCode === 400) {
        throw new Error(`❌ Request không hợp lệ: ${errorMsg}. Kiểm tra prompt hoặc context quá dài!`);
      } else if (errorCode === 404) {
        throw new Error(`❌ Model không tìm thấy: ${modelName}. Kiểm tra model name!`);
      } else if (errorCode === 429) {
        throw new Error(`❌ Quá nhiều requests. Vui lòng thử lại sau ít phút!`);
      } else if (errorCode === 401 || errorCode === 403) {
        throw new Error(`❌ API Key không hợp lệ hoặc hết hạn. Vui lòng kiểm tra lại!`);
      }
      
      throw new Error(`❌ Lỗi API (${errorCode}): ${errorMsg}`);
    }

    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text || '').join('\n').trim() || '';
    
    if (!text) {
      throw new Error('❌ AI trả về response rỗng. Vui lòng thử lại!');
    }
    
    return { text };
    
  } catch (error) {
    // Handle timeout/abort errors
    if (error.name === 'AbortError') {
      if (retryCount < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retryCount);
        console.warn(`⚠️ Request timeout. Retrying in ${delay}ms... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callGenerateContent(modelName, payload, retryCount + 1);
      }
      throw new Error('❌ Request timeout sau 30 giây. API có thể đang quá tải. Vui lòng thử lại!');
    }
    
    // Handle SSL/TLS errors
    if (error.code === 'EPROTO' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      if (retryCount < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retryCount);
        console.warn(`⚠️ Network/SSL error (${error.code}). Retrying in ${delay}ms... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callGenerateContent(modelName, payload, retryCount + 1);
      }
      
      // After all retries failed
      throw new Error(`❌ Lỗi kết nối (${error.code}): Không thể kết nối đến Gemini API. Vui lòng:\n1. Kiểm tra kết nối internet\n2. Tắt VPN/Proxy nếu có\n3. Thử lại sau vài phút`);
    }
    
    // If network error and can retry
    if (retryCount < MAX_RETRIES && (error.message.includes('fetch') || error.message.includes('network'))) {
      const delay = BASE_DELAY * Math.pow(2, retryCount);
      console.warn(`⚠️ Network error. Retrying in ${delay}ms... (${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGenerateContent(modelName, payload, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * Validate request trước khi gọi API
 */
function validateRequest(prompt, excelContext) {
  // Check prompt length
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('❌ Prompt không được rỗng!');
  }
  
  if (prompt.length > 2000) {
    throw new Error('❌ Prompt quá dài (max 2000 ký tự). Vui lòng rút gọn!');
  }
  
  // Check context size
  if (excelContext) {
    const contextStr = JSON.stringify(excelContext);
    if (contextStr.length > 50000) {
      console.warn('⚠️ Context quá lớn, có thể bị rate limit!');
    }
  }
  
  return true;
}

/**
 * Tạo công thức Excel từ mô tả (WITH EXCEL CONTEXT)
 * @param {string} prompt - Mô tả công thức cần tạo
 * @param {object} excelContext - Context từ Excel (optional)
 */
export async function generateExcelFormula(prompt, excelContext = null) {
  try {
    // Validate request
    validateRequest(prompt, excelContext);
    
    // Check cache first
    const cacheKey = getCacheKey(prompt, excelContext);
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult) {
      return cachedResult; // Return cached result immediately
    }
    
    // Chọn model
    if (!cachedModel) {
      const availableModels = await listModels(getApiKey());
      
      if (availableModels.length === 0) {
        throw new Error('Không tìm thấy model nào. Kiểm tra API key!');
      }
      
      cachedModel = await pickAvailableModel(getApiKey());
    }

    const systemPrompt = `Bạn là CHUYÊN GIA EXCEL với 15 năm kinh nghiệm, đã training trên 100,000+ công thức. Tạo công thức CHÍNH XÁC TUYỆT ĐỐI.

═══════════════════════════════════════════════════════════════════
📚 TRAINING DATA - HỌC KỸ CÁC VÍ DỤ NÀY:
═══════════════════════════════════════════════════════════════════

🔹 HIỂU RÕ CONTEXT:
"cột A đến D" = "A->D" = "từ cột A tới D" = 4 cột: A, B, C, D
"hàng 1 đến 10" = "1->10" = từ hàng 1 tới 10 = 10 hàng
"ô A1 đến D10" = range A1:D10 = vùng chữ nhật từ A1 đến D10

⚠️ PHÂN BIỆT INTENT - CỰC KỲ QUAN TRỌNG:
1. "Tính lãi CỦA TOÀN BỘ / CỦA TẤT CẢ sản phẩm" → TỔNG LÃI (1 số duy nhất)
   → Dùng SUM: =SUM(B2:B11)-SUM(C2:C11)
   
2. "Tính lãi CHO MỖI / CHO TỪNG sản phẩm" → LÃI TỪNG HÀNG (nhiều hàng)
   → Dùng phép trừ: =B2-C2
   
3. "Tính tổng doanh thu" → TỔNG (1 số)
   → =SUM(B2:B11)
   
4. "Tính doanh thu cho mỗi sản phẩm" → TỪNG HÀNG
   → =B2*C2 (nếu có số lượng và đơn giá)

⚠️ QUAN TRỌNG - ƯU TIÊN CONTEXT CỤ THỂ:
- Nếu có CONTEXT EXCEL thực tế → LUÔN dùng range CỤ THỂ (VD: B2:B50)
- Chỉ dùng toàn cột (B:B) khi KHÔNG có context hoặc user yêu cầu rõ ràng
- Header ở hàng 1 → Data bắt đầu từ hàng 2
- ĐỪNG dùng toàn cột nếu biết chính xác số hàng!

🔹 VÍ DỤ PHÂN BIỆT TỔNG vs TỪNG HÀNG (HỌC KỸ!):

📌 INTENT: TỔNG (1 KẾT QUẢ DUY NHẤT)
User: "Tính lãi của toàn bộ sản phẩm" + Context: Cột B=Doanh thu, C=Chi phí, 10 hàng
  → =SUM(B2:B11)-SUM(C2:C11)
  → Giải thích: Tổng lãi = Tổng doanh thu (B2:B11) - Tổng chi phí (C2:C11)

User: "Tính tổng doanh thu tất cả sản phẩm" + Context: Cột B=Doanh thu, 10 hàng
  → =SUM(B2:B11)
  
User: "Lợi nhuận của cả bảng" + Context: B=Doanh thu, C=Chi phí, 50 hàng
  → =SUM(B2:B51)-SUM(C2:C51)

📌 INTENT: TỪNG HÀNG (NHIỀU KẾT QUẢ)
User: "Tính lãi cho mỗi sản phẩm" + Context: B=Doanh thu, C=Chi phí, 10 hàng
  → =B2-C2 (insert vào D2, kéo xuống D11)
  
User: "Tính tổng tiền cho từng đơn hàng" + Context: B=Số lượng, C=Đơn giá, 50 hàng
  → =B2*C2 (insert vào D2, kéo xuống D51)

🔹 VÍ DỤ TÍNH TỔNG (SUM) - ƯU TIÊN CONTEXT:
User: "Tính tổng cột A" + Context: 100 hàng data → =SUM(A2:A101)  ← ĐÚNG!
User: "Tính tổng cột A" + KHÔNG có context → =SUM(A:A)  ← OK
User: "Tính tổng từ A1 đến A10" → =SUM(A1:A10)
User: "Tổng ô A1 đến D1" → =SUM(A1:D1)
User: "Tính tổng cột A đến cột D từ hàng 2 đến 100" → =SUM(A2:D100)

🔹 VÍ DỤ TRUNG BÌNH (AVERAGE):
User: "Tính trung bình cột B" + Context: 50 hàng → =AVERAGE(B2:B51)  ← ĐÚNG!
User: "TB từ B2 đến B50" → =AVERAGE(B2:B50)
User: "TB có điều kiện: cột A nếu cột B > 100" + Context: 100 hàng → =AVERAGEIF(B2:B101,">100",A2:A101)

🔹 VÍ DỤ ĐẾM (COUNT):
User: "Đếm số ô có dữ liệu trong cột A" + Context: 100 hàng → =COUNTA(A2:A101)  ← ĐÚNG!
User: "Đếm số ô không rỗng từ A1 đến A100" → =COUNTA(A1:A100)
User: "Đếm có điều kiện: cột A > 50" + Context: 80 hàng → =COUNTIF(A2:A81,">50")
User: "Đếm nếu cột B là 'Hoàn thành'" + Context: 50 hàng → =COUNTIF(B2:B51,"Hoàn thành")

🔹 VÍ DỤ TÌM GIÁ TRỊ (MAX/MIN):
User: "Tìm giá trị lớn nhất cột C" + Context: 60 hàng → =MAX(C2:C61)  ← ĐÚNG!
User: "Tìm giá trị nhỏ nhất từ D1 đến D50" → =MIN(D1:D50)

🔹 VÍ DỤ CÓ ĐIỀU KIỆN (IF):
User: "Nếu A1 > 100 thì 'Cao', không thì 'Thấp'" → =IF(A1>100,"Cao","Thấp")
User: "Nếu cột B là 'Pass' thì lấy giá trị cột C" → =IF(B1="Pass",C1,"")
User: "Nếu A1 > 50 và B1 < 100" → =IF(AND(A1>50,B1<100),"Đạt","Không đạt")

🔹 VÍ DỤ SUMIF (TỔNG CÓ ĐIỀU KIỆN):
User: "Tổng cột D nếu cột C là 'Hoàn thành'" + Context: 50 hàng → =SUMIF(C2:C51,"Hoàn thành",D2:D51)  ← ĐÚNG!
User: "Tổng doanh thu (D) nếu tháng (A) = 1" + Context: 100 hàng → =SUMIF(A2:A101,1,D2:D101)
User: "Tổng lương (E) nếu phòng ban (B) = 'Sales'" + Context: 80 hàng → =SUMIF(B2:B81,"Sales",E2:E81)

🔹 VÍ DỤ SUMIFS (NHIỀU ĐIỀU KIỆN):
User: "Tổng cột D nếu cột A = 'Nam' và cột B > 25" + Context: 60 hàng → =SUMIFS(D2:D61,A2:A61,"Nam",B2:B61,">25")
User: "Tổng doanh thu nếu khu vực HN và trạng thái hoàn thành" + Context: 100 hàng → =SUMIFS(D2:D101,B2:B101,"Hà Nội",C2:C101,"Hoàn thành")

🔹 VÍ DỤ VLOOKUP:
User: "Tìm giá trị trong bảng A:D, cột thứ 3" → =VLOOKUP(F1,A:D,3,FALSE)
User: "Lookup chính xác từ sheet khác" → =VLOOKUP(A1,Sheet2!A:C,2,FALSE)

🔹 VÍ DỤ CONCATENATE (NỐI CHUỖI):
User: "Nối họ (A) và tên (B)" → =A1&" "&B1 hoặc =CONCATENATE(A1," ",B1)
User: "Ghép 3 cột A, B, C với dấu gạch ngang" → =A1&"-"&B1&"-"&C1

🔹 VÍ DỤ TEXT & DATE:
User: "Lấy 5 ký tự đầu của cột A" → =LEFT(A1,5)
User: "Lấy năm từ ngày tháng cột B" → =YEAR(B1)
User: "Tính số ngày giữa 2 ngày" → =B1-A1
User: "Ngày hôm nay" → =TODAY()

🔹 LOGIC PHỨC TẠP:
User: "Nếu A>B thì lấy A, không thì nếu B>C thì lấy B, không thì C" → =IF(A1>B1,A1,IF(B1>C1,B1,C1))
User: "Tính thưởng: >100tr: 10%, 50-100tr: 5%, <50tr: 2%" → =IF(A1>100000000,A1*0.1,IF(A1>=50000000,A1*0.05,A1*0.02))

═══════════════════════════════════════════════════════════════════
⚠️ LỖI THƯỜNG GẶP - TRÁNH:
═══════════════════════════════════════════════════════════════════
❌ ĐỪNG dùng SUM(A1,A2,A3,...) khi có nhiều ô → Dùng SUM(A1:A100)
❌ ĐỪNG quên dấu $ khi cần lock cell reference → $A$1
❌ ĐỪNG quên dấu ngoặc kép cho text → "Hoàn thành" không phải Hoàn thành
❌ ĐỪNG nhầm COUNTIF với COUNT → COUNT đếm số, COUNTIF đếm có điều kiện
❌ ĐỪNG dùng = thay vì >= hoặc <= khi so sánh

═══════════════════════════════════════════════════════════════════
✅ CHỈ TRẢ VỀ JSON ĐÚNG FORMAT:
═══════════════════════════════════════════════════════════════════
{
  "formula": "công thức Excel bắt đầu bằng =, CHÍNH XÁC TUYỆT ĐỐI",
  "explanation": "giải thích chi tiết từng phần công thức bằng tiếng Việt",
  "example": "ví dụ cụ thể với số liệu (VD: Nếu A1=100, B1=200 thì kết quả = 300)"
}

KHÔNG viết markdown, KHÔNG giải thích thêm, CHỈ JSON thuần.`;

    // Build user prompt with context if available
    let userPrompt = `Yêu cầu của người dùng: ${prompt}`;
    
    if (excelContext) {
      // Import formatContextForPrompt dynamically
      const { formatContextForPrompt, analyzeIntentWithContext } = await import('./excelContextService.js');
      
      // Add Excel context
      const contextText = formatContextForPrompt(excelContext);
      userPrompt = contextText + userPrompt;
      
      // Detect intent: TỔNG vs TỪNG HÀNG
      const promptLower = prompt.toLowerCase();
      const isTotalIntent = 
        promptLower.includes('của toàn bộ') || 
        promptLower.includes('của tất cả') ||
        promptLower.includes('của cả') ||
        promptLower.includes('tổng ') ||
        (promptLower.includes('toàn bộ') && !promptLower.includes('cho')) ||
        (promptLower.includes('tất cả') && !promptLower.includes('cho'));
        
      const isPerRowIntent = 
        promptLower.includes('cho mỗi') ||
        promptLower.includes('cho từng') ||
        promptLower.includes('từng ') ||
        promptLower.includes('mỗi ');
      
      if (isTotalIntent) {
        userPrompt += `\n\n🎯 INTENT PHÁT HIỆN: TỔNG (1 kết quả duy nhất)`;
        userPrompt += `\n- User muốn tính TỔNG của toàn bộ dữ liệu, KHÔNG phải từng hàng`;
        userPrompt += `\n- Dùng SUM() để tính tổng các range`;
        userPrompt += `\n- VÍ DỤ: "Tính lãi của toàn bộ sản phẩm" → =SUM(Doanh thu)-SUM(Chi phí)`;
      } else if (isPerRowIntent) {
        userPrompt += `\n\n🎯 INTENT PHÁT HIỆN: TỪNG HÀNG (nhiều kết quả)`;
        userPrompt += `\n- User muốn tính cho TỪNG HÀNG riêng biệt`;
        userPrompt += `\n- Dùng phép tính trực tiếp (VD: B2-C2, B2*C2)`;
        userPrompt += `\n- Công thức sẽ được apply cho tất cả hàng`;
      }
      
      // Analyze intent and add hints
      const analysis = analyzeIntentWithContext(prompt, excelContext);
      if (analysis && analysis.suggestedColumns.length > 0) {
        userPrompt += `\n\n💡 GỢI Ý TỰ ĐỘNG (PHẢI DÙNG RANGE NÀY):`;
        userPrompt += `\n- Intent phát hiện: ${analysis.intent || 'Unknown'}`;
        userPrompt += `\n- Cột liên quan: ${analysis.suggestedColumns.map(c => `${c.column} (${c.name}, ${c.type})`).join(', ')}`;
        if (analysis.suggestedRange) {
          userPrompt += `\n- ⚠️ PHẢI DÙNG RANGE: ${analysis.suggestedRange} (Không dùng toàn cột!)`;
          userPrompt += `\n- Giải thích: Data từ hàng 2 đến ${excelContext.rowCount}, hàng 1 là header`;
        }
      } else if (excelContext.rowCount) {
        // Even without analysis, remind AI about context
        userPrompt += `\n\n⚠️ LƯU Ý: Excel có ${excelContext.rowCount} hàng. Hàng 1 là header, data từ hàng 2-${excelContext.rowCount}.`;
        userPrompt += `\nDùng range CỤ THỂ (VD: B2:B${excelContext.rowCount}), KHÔNG dùng toàn cột (B:B)!`;
      }
    }

    const payload = {
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${userPrompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.2, // Cực thấp để SIÊU CHÍNH XÁC, không đoán mò
        maxOutputTokens: 2048, // Tăng để đủ chỗ với prompt dài
      },
    };

    // Call API
    let result;
    try {
      result = await callGenerateContent(cachedModel, payload);
    } catch (error) {
      // Retry with all available models
      const allModels = await listModels(getApiKey());
      
      for (const model of allModels) {
        if (model === cachedModel) continue;
        if (!model.includes('gemini')) continue;
        
        try {
          result = await callGenerateContent(model, payload);
          cachedModel = model;
          break;
        } catch (e) {
          continue;
        }
      }
    }

    if (!result?.text) {
      throw new Error('Tất cả models đều thất bại');
    }

    // Parse JSON response with robust error handling
    let cleanText = cleanJSONResponse(result.text);
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanText);
      
      // Validate structure
      if (!parsedResponse.formula && !parsedResponse.recommendations) {
        throw new Error('Invalid response structure: missing formula or recommendations');
      }
      
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      console.error('❌ Problematic JSON:', cleanText.substring(0, 500));
      
      // Last attempt: Extract JSON using regex
      try {
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let extracted = jsonMatch[0];
          extracted = cleanJSONResponse(extracted);
          parsedResponse = JSON.parse(extracted);
          
          // Validate extracted JSON
          if (!parsedResponse.formula && !parsedResponse.recommendations) {
            throw new Error('Extracted JSON still invalid');
          }
        } else {
          throw parseError;
        }
      } catch (retryError) {
        console.error('❌ All JSON parsing attempts failed');
        throw new Error('Response từ AI không hợp lệ. Vui lòng thử lại với mô tả ngắn gọn hơn!');
      }
    }
    
    // Save to cache for future requests
    saveToCache(cacheKey, parsedResponse);
    
    return parsedResponse;
    
  } catch (error) {
    console.error('Generate formula error:', error);
    throw new Error('Không thể tạo công thức. Vui lòng thử lại!');
  }
}

/**
 * Tạo hướng dẫn Step by Step
 */
export async function generateStepByStep(task) {
  try {
    // Chọn model
    if (!cachedModel) {
      const availableModels = await listModels(getApiKey());
      
      if (availableModels.length === 0) {
        throw new Error('Không tìm thấy model nào. Kiểm tra API key!');
      }
      
      cachedModel = await pickAvailableModel(getApiKey());
    }

    const systemPrompt = `Bạn là GIÁO VIÊN EXCEL CHUYÊN NGHIỆP với 15 năm kinh nghiệm, đã training 50,000+ học viên. Tạo hướng dẫn CỰC KỲ CHI TIẾT, CHUẨN XÁC.

═══════════════════════════════════════════════════════════════════
📚 TRAINING DATA - HỌC KỸ CÁCH HƯỚNG DẪN:
═══════════════════════════════════════════════════════════════════

🎯 TASK: "Tạo biểu đồ cột"
→ Bước 1: "Chọn dữ liệu" (Click vào A1, kéo đến D10)
→ Bước 2: "Chèn biểu đồ" (Tab Insert → Column Chart)
→ Bước 3: "Tùy chỉnh" (Đổi màu, thêm title)
→ KHÔNG NÓI MƠ HỒ: "Chuẩn bị dữ liệu" mà phải NÓI CỤ THỂ: "Click vào ô A1, giữ chuột và kéo đến D10"

🎯 TASK: "Sử dụng VLOOKUP"
→ Bước 1: "Chuẩn bị bảng tra cứu" (Dữ liệu ở cột A, kết quả muốn lấy ở cột B)
→ Bước 2: "Viết công thức" (Gõ =VLOOKUP( rồi chọn tham số)
→ Bước 3: "Nhập tham số" (Lookup_value, Table_array, Col_index, FALSE)
→ CHI TIẾT: Mỗi tham số là gì, ví dụ cụ thể

🎯 TASK: "Tạo Pivot Table"
→ KHÔNG: "Chọn dữ liệu" (quá chung chung)
→ MÀ: "Click vào bất kỳ ô nào trong bảng dữ liệu, ví dụ ô A1. Excel sẽ tự động nhận diện toàn bộ bảng"

🎯 TASK: "Conditional Formatting màu đỏ nếu âm"
→ Bước 1: "Chọn vùng" (Bôi đen các ô cần format, VD: A1:A100)
→ Bước 2: "Mở menu" (Tab Home → Conditional Formatting)
→ Bước 3: "Chọn rule" (Highlight Cells Rules → Less Than → 0)
→ Bước 4: "Chọn màu" (Red fill, Done)

═══════════════════════════════════════════════════════════════════
✅ CÁCH VIẾT CHI TIẾT CHUẨN:
═══════════════════════════════════════════════════════════════════
❌ SAI: "Chọn dữ liệu cần vẽ biểu đồ"
✅ ĐÚNG: "Click vào ô A1 (ô đầu tiên của dữ liệu), giữ chuột và kéo đến ô D20"

❌ SAI: "Chèn công thức"
✅ ĐÚNG: "Click vào ô E1, gõ dấu = để bắt đầu công thức, sau đó gõ SUM("

❌ SAI: "Sử dụng tính năng Format"
✅ ĐÚNG: "Click chuột phải vào ô đã chọn, chọn 'Format Cells' từ menu hiện ra"

❌ SAI: "Điền công thức xuống"
✅ ĐÚNG: "Di chuột đến góc dưới bên phải của ô (xuất hiện dấu +), double-click để tự động fill xuống"

═══════════════════════════════════════════════════════════════════
🎓 TEMPLATE CHUẨN CHO TỪNG LOẠI TASK:
═══════════════════════════════════════════════════════════════════

📊 TẠO BIỂU ĐỒ (Chart):
1. Chọn dữ liệu (range cụ thể)
2. Insert → Chart type
3. Customize (title, colors, axis labels)
4. Move/resize chart
5. Save/update

📋 TẠO PIVOT TABLE:
1. Prepare data (structured table)
2. Insert → PivotTable
3. Choose fields (Rows, Columns, Values)
4. Apply filters/slicers
5. Format and style

🔍 VLOOKUP:
1. Prepare lookup table
2. Understand syntax
3. Write formula with correct parameters
4. Handle errors (IFERROR)
5. Copy formula down

🎨 CONDITIONAL FORMATTING:
1. Select range
2. Home → Conditional Formatting
3. Choose rule type
4. Set conditions
5. Choose format (color, icon)
6. Apply and test

═══════════════════════════════════════════════════════════════════
⚠️ LƯU Ý QUAN TRỌNG:
═══════════════════════════════════════════════════════════════════
- LUÔN cho ví dụ cụ thể: "Ví dụ: Click vào A1"
- LUÔN nói rõ vị trí menu: "Tab Home → Conditional Formatting"
- LUÔN có tips hữu ích: "Phím tắt: Ctrl+T"
- LUÔN cảnh báo lỗi: "Lưu ý: Dữ liệu phải không có hàng trống"
- Mỗi chi tiết 1-2 câu, NGẮN GỌN nhưng ĐẦY ĐỦ THÔNG TIN

═══════════════════════════════════════════════════════════════════
✅ CHỈ TRẢ VỀ JSON HỢP LỆ:
═══════════════════════════════════════════════════════════════════
{
  "taskName": "tên task RÕ RÀNG, CỤ THỂ",
  "steps": [
    {
      "title": "Tiêu đề bước (VD: Chọn dữ liệu nguồn)",
      "description": "Mô tả ngắn bước làm gì (VD: Xác định vùng dữ liệu cần phân tích)",
      "details": [
        "Hành động CỰC KỲ CỤ THỂ 1 (VD: Click vào ô A1)",
        "Hành động CỰC KỲ CỤ THỂ 2 (VD: Giữ Shift và click D20)",
        "Hành động CỰC KỲ CỤ THỂ 3 (VD: Hoặc dùng Ctrl+Shift+End)"
      ],
      "tips": "Mẹo thực tế (VD: Phím tắt Ctrl+A chọn toàn bộ)",
      "warning": "Cảnh báo lỗi hay gặp (VD: Đảm bảo không có hàng trống)"
    }
  ]
}

YÊU CẦU NGHIÊM NGẶT:
- 5-7 bước (logic, đầy đủ)
- Mỗi bước 3-4 hành động CỤ THỂ (click đâu, gõ gì, chọn gì)
- Mỗi chi tiết tối đa 2 câu, NGẮN GỌN, HÀNH ĐỘNG RÕ RÀNG
- Tips phải HỮU ÍCH (phím tắt, cách nhanh)
- Warning phải THỰC TẾ (lỗi thường gặp)
- Tiếng Việt chuẩn, dễ hiểu
- JSON HỢP LỆ - escape quotes, no newlines

KHÔNG viết markdown, KHÔNG giải thích thêm, CHỈ JSON thuần hợp lệ.`;

    const payload = {
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\nTask: ${task}`
        }]
      }],
      generationConfig: {
        temperature: 0.3, // Thấp để output consistent, chi tiết chính xác
        maxOutputTokens: 10240, // Tăng để đủ chỗ với prompt dài và output chi tiết
      },
    };

    // Call API
    let result;
    try {
      result = await callGenerateContent(cachedModel, payload);
    } catch (error) {
      // Retry with all available models
      const allModels = await listModels(getApiKey());
      
      for (const model of allModels) {
        if (model === cachedModel) continue;
        if (!model.includes('gemini')) continue;
        
        try {
          result = await callGenerateContent(model, payload);
          cachedModel = model;
          break;
        } catch (e) {
          continue;
        }
      }
    }

    if (!result?.text) {
      throw new Error('Tất cả models đều thất bại');
    }

    // Parse JSON response
    let cleanText = cleanJSONResponse(result.text);
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanText);
      
      // Validate structure
      if (!parsedResponse.taskName || !parsedResponse.steps || !Array.isArray(parsedResponse.steps)) {
        throw new Error('Invalid response structure');
      }
      
    } catch (parseError) {
      // Last attempt: Extract JSON using regex
      try {
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let extracted = jsonMatch[0];
          extracted = cleanJSONResponse(extracted);
          parsedResponse = JSON.parse(extracted);
        } else {
          throw parseError;
        }
      } catch (retryError) {
        throw new Error('Response quá phức tạp hoặc không hợp lệ. Thử mô tả task ngắn gọn hơn!');
      }
    }
    
    return parsedResponse;
    
  } catch (error) {
    console.error('Generate step by step error:', error);
    throw new Error('Không thể tạo hướng dẫn. Vui lòng thử lại!');
  }
}

/**
 * Phân tích data thông minh và đưa ra insights
 * @param {object} excelContext - Context từ Excel với data
 */
export async function analyzeExcelData(excelContext) {
  try {
    if (!excelContext || !excelContext.sampleData || excelContext.sampleData.length === 0) {
      throw new Error('Không có dữ liệu để phân tích!');
    }

    // Validate request
    validateRequest('analyze data', excelContext);
    
    // Chọn model
    if (!cachedModel) {
      const availableModels = await listModels(getApiKey());
      if (availableModels.length === 0) {
        throw new Error('Không tìm thấy model nào. Kiểm tra API key!');
      }
      cachedModel = await pickAvailableModel(getApiKey());
    }

    const systemPrompt = `Bạn là DATA ANALYST. Phân tích dữ liệu Excel và đưa ra insights chính xác.

QUY TẮC:
- CHỈ dùng số liệu THỰC TẾ từ data, KHÔNG đoán
- Tính toán: SUM, AVERAGE, MAX, MIN từ cột số
- Format số đẹp, thêm đơn vị (VND, USD, etc)

OUTPUT (JSON):
{
  "summary": "Tóm tắt ngắn",
  "keyMetrics": [{"label": "Tổng", "value": "X VND", "icon": "💰"}],
  "trends": [{"type": "positive", "description": "Xu hướng"}],
  "insights": ["Phát hiện thú vị"],
  "recommendations": ["Đề xuất hành động"],
  "warnings": ["Cảnh báo (nếu có)"],
  "chartSuggestion": {"type": "column", "title": "Tiêu đề", "description": "Mô tả"}
}

QUAN TRỌNG: Phải có ĐỦ 6 fields (summary, keyMetrics, trends, insights, recommendations, warnings, chartSuggestion). Nếu không có data cho field nào thì để [], null hoặc "".

CHỈ TRẢ JSON, KHÔNG MARKDOWN.`;

    // Format context cho AI
    const { formatContextForPrompt } = await import('./excelContextService.js');
    const contextText = formatContextForPrompt(excelContext);
    
    const userPrompt = `${contextText}

PHÂN TÍCH dữ liệu trên:
1. Tìm CỘT SỐ (number type)
2. Tính: Tổng, TB, Max, Min
3. Tìm patterns, insights
4. Đề xuất actions

⚠️ CHỈ dùng số từ data, KHÔNG đoán. Phải có ĐỦ 6 fields JSON.`;

    const payload = {
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${userPrompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 8192,
      },
    };

    // Call API
    let result;
    try {
      result = await callGenerateContent(cachedModel, payload);
    } catch (error) {
      const allModels = await listModels(getApiKey());
      for (const model of allModels) {
        if (model === cachedModel) continue;
        if (!model.includes('gemini')) continue;
        try {
          result = await callGenerateContent(model, payload);
          cachedModel = model;
          break;
        } catch (e) {
          continue;
        }
      }
    }

    if (!result?.text) {
      throw new Error('Tất cả models đều thất bại');
    }

    console.log('📊 Raw AI response:', result.text);

    // Parse JSON response
    const cleanText = cleanJSONResponse(result.text);
    console.log('🧹 Cleaned JSON:', cleanText);
    
    let analysis;
    try {
      analysis = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      console.error('❌ Problematic JSON:', cleanText);
      
      // Fallback: trả về response mặc định
      analysis = {
        summary: 'AI đã phân tích dữ liệu nhưng gặp lỗi định dạng. Vui lòng thử lại.',
        keyMetrics: [],
        trends: [],
        insights: ['Dữ liệu đã được đọc thành công'],
        recommendations: ['Thử lại để nhận phân tích chi tiết hơn'],
        warnings: [],
        chartSuggestion: null
      };
    }
    
    return analysis;
    
  } catch (error) {
    console.error('Analyze data error:', error);
    throw new Error('Không thể phân tích dữ liệu. Vui lòng thử lại!');
  }
}

/**
 * Test connection với Gemini API
 */
export async function testGeminiConnection() {
  try {
    const models = await listModels(getApiKey());
    return models.length > 0;
  } catch (error) {
    console.error('Test connection error:', error);
    return false;
  }
}

