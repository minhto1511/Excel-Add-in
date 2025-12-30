/**
 * Excel Context Service
 * Đọc context từ Excel để tạo công thức chính xác hơn
 */

/**
 * Đọc context từ Excel worksheet hiện tại
 * Bao gồm: headers, data types, sample data, selected range
 */
export async function getExcelContext() {
  try {
    return await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      sheet.load('name');
      
      const usedRange = sheet.getUsedRange();
      
      // Load properties
      usedRange.load('address, rowCount, columnCount, values, numberFormat');
      
      await context.sync();
      
      // Analyze context
      const contextInfo = {
        sheetName: sheet.name,
        usedRange: usedRange.address,
        rowCount: usedRange.rowCount,
        columnCount: usedRange.columnCount,
        headers: [],
        columns: [],
        sampleData: []
      };
      
      // Get values
      const values = usedRange.values;
      const formats = usedRange.numberFormat;
      
      // Detect headers (first row)
      if (values.length > 0) {
        contextInfo.headers = values[0].map((h, idx) => {
          // Ensure name is always a string
          let headerName;
          if (h === null || h === undefined || h === '') {
            headerName = `Column${String.fromCharCode(65 + idx)}`;
          } else if (typeof h === 'string') {
            headerName = h;
          } else {
            // Convert numbers or other types to string
            headerName = String(h);
          }
          
          return {
            name: headerName,
            column: String.fromCharCode(65 + idx),
            index: idx
          };
        });
      }
      
      // Analyze each column
      contextInfo.headers.forEach((header, colIdx) => {
        const columnData = [];
        const dataTypes = new Set();
        
        // Get sample data (skip header, max 10 rows)
        for (let rowIdx = 1; rowIdx < Math.min(values.length, 11); rowIdx++) {
          const value = values[rowIdx][colIdx];
          if (value !== null && value !== undefined && value !== '') {
            columnData.push(value);
            dataTypes.add(typeof value);
          }
        }
        
        // Infer column type
        let columnType = 'text';
        if (dataTypes.has('number')) {
          columnType = 'number';
        } else if (columnData.length > 0) {
          const sample = columnData[0];
          // Check if date (Excel stores dates as numbers, or string format)
          if (typeof sample === 'number' && sample > 40000 && sample < 50000) {
            // Excel date serial number range
            columnType = 'date';
          } else if (typeof sample === 'string' && /\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/.test(sample)) {
            columnType = 'date';
          }
        }
        
        contextInfo.columns.push({
          name: header.name,
          column: header.column,
          type: columnType,
          sampleData: columnData.slice(0, 5),
          hasData: columnData.length > 0,
          rowsWithData: columnData.length,
          // Nếu là cột số, gửi TẤT CẢ data (chỉ giá trị số thực sự) để AI tính toán chính xác
          allNumericData: columnType === 'number' 
            ? columnData.filter(v => typeof v === 'number' && !isNaN(v))
            : null
        });
      });
      
      // Get sample rows (first 5 data rows để tiết kiệm tokens)
      const maxSampleRows = Math.min(values.length, 6); // 5 data rows + 1 header
      for (let i = 1; i < maxSampleRows; i++) {
        const row = {};
        contextInfo.headers.forEach((header, idx) => {
          row[header.name] = values[i][idx];
        });
        contextInfo.sampleData.push(row);
      }
      
      return contextInfo;
    });
  } catch (error) {
    console.error('Get Excel context error:', error);
    return null;
  }
}

/**
 * Đọc context của vùng đang chọn
 */
export async function getSelectedRangeContext() {
  try {
    return await Excel.run(async (context) => {
      const range = context.workbook.getSelectedRange();
      range.load('address, rowCount, columnCount, values, numberFormat');
      
      await context.sync();
      
      return {
        address: range.address,
        rowCount: range.rowCount,
        columnCount: range.columnCount,
        values: range.values,
        formats: range.numberFormat,
        // Parse address to get columns
        columns: parseRangeColumns(range.address),
        rows: parseRangeRows(range.address)
      };
    });
  } catch (error) {
    console.error('Get selected range error:', error);
    return null;
  }
}

/**
 * Parse range address to get column letters
 */
function parseRangeColumns(address) {
  // Example: "Sheet1!A1:D10" -> ["A", "B", "C", "D"]
  const match = address.match(/([A-Z]+)\d+:([A-Z]+)\d+/);
  if (!match) return [];
  
  const start = match[1];
  const end = match[2];
  
  const columns = [];
  let current = start;
  columns.push(current);
  
  while (current !== end) {
    current = nextColumn(current);
    columns.push(current);
  }
  
  return columns;
}

/**
 * Get next column letter
 */
function nextColumn(col) {
  if (col === 'Z') return 'AA';
  if (col === 'AZ') return 'BA';
  
  const lastChar = col.charAt(col.length - 1);
  if (lastChar === 'Z') {
    return col.slice(0, -1) + 'A' + 'A';
  }
  
  return col.slice(0, -1) + String.fromCharCode(lastChar.charCodeAt(0) + 1);
}

/**
 * Parse range rows
 */
function parseRangeRows(address) {
  const match = address.match(/[A-Z]+(\d+):[A-Z]+(\d+)/);
  if (!match) return { start: 1, end: 1 };
  
  return {
    start: parseInt(match[1]),
    end: parseInt(match[2])
  };
}

/**
 * Format context thành text cho AI prompt
 */
export function formatContextForPrompt(context) {
  if (!context) return '';
  
  let contextText = '\n📊 CONTEXT TỪNG EXCEL HIỆN TẠI:\n';
  contextText += '═══════════════════════════════════════════════════════════════════\n';
  
  // Sheet info
  contextText += `📄 Sheet: ${context.sheetName}\n`;
  contextText += `📏 Kích thước: ${context.rowCount} hàng × ${context.columnCount} cột\n`;
  contextText += `📍 Vùng dữ liệu: ${context.usedRange}\n\n`;
  
  // Headers and columns
  contextText += '📋 CẤU TRÚC CỘT:\n';
  context.columns.forEach((col, idx) => {
    if (col.hasData) {
      contextText += `  • Cột ${col.column} "${col.name}": ${col.type}`;
      if (col.sampleData.length > 0) {
        contextText += ` (VD: ${col.sampleData.slice(0, 2).join(', ')})`;
      }
      contextText += ` [${col.rowsWithData} dòng]`;
      contextText += `\n`;
    }
  });
  
  // Numeric columns - CHỈ GỬI STATS để tiết kiệm tokens
  const numericColumns = context.columns.filter(col => col.type === 'number' && col.allNumericData && col.allNumericData.length > 0);
  if (numericColumns.length > 0) {
    contextText += '\n🔢 CỘT SỐ (ĐÃ TÍNH SẴN):\n';
    numericColumns.forEach(col => {
      // Ensure we only process valid numbers
      const validNumbers = col.allNumericData.filter(v => typeof v === 'number' && !isNaN(v));
      
      if (validNumbers.length === 0) {
        return; // Skip if no valid numbers
      }
      
      const sum = validNumbers.reduce((a, b) => a + b, 0);
      const avg = sum / validNumbers.length;
      const max = Math.max(...validNumbers);
      const min = Math.min(...validNumbers);
      const count = validNumbers.length;
      // Chỉ gửi 5 giá trị mẫu thay vì toàn bộ
      const samples = validNumbers.slice(0, 5);
      contextText += `  • ${col.name}: Tổng=${sum.toFixed(0)}, TB=${avg.toFixed(0)}, Max=${max}, Min=${min}, Count=${count}\n`;
      contextText += `    Sample: [${samples.join(', ')}${validNumbers.length > 5 ? '...' : ''}]\n`;
    });
  }
  
  // Sample data
  if (context.sampleData.length > 0) {
    contextText += `\n📊 DỮ LIỆU MẪU (${context.sampleData.length} hàng):\n`;
    context.sampleData.forEach((row, idx) => {
      contextText += `  Hàng ${idx + 2}: `;
      const entries = Object.entries(row).slice(0, 5);
      contextText += entries.map(([k, v]) => `${k}=${v}`).join(', ');
      if (Object.keys(row).length > 5) {
        contextText += '...';
      }
      contextText += '\n';
    });
  }
  
  contextText += '═══════════════════════════════════════════════════════════════════\n\n';
  
  return contextText;
}

/**
 * Phân tích intent và suggest columns
 */
export function analyzeIntentWithContext(userPrompt, context) {
  if (!context || !context.columns) return null;
  
  const prompt = userPrompt.toLowerCase();
  const suggestions = {
    intent: null,
    suggestedColumns: [],
    suggestedRange: null
  };
  
  // Detect intent
  if (prompt.includes('tổng') || prompt.includes('sum') || prompt.includes('cộng')) {
    suggestions.intent = 'SUM';
  } else if (prompt.includes('trung bình') || prompt.includes('average') || prompt.includes('tb')) {
    suggestions.intent = 'AVERAGE';
  } else if (prompt.includes('đếm') || prompt.includes('count')) {
    suggestions.intent = 'COUNT';
  } else if (prompt.includes('lớn nhất') || prompt.includes('max')) {
    suggestions.intent = 'MAX';
  } else if (prompt.includes('nhỏ nhất') || prompt.includes('min')) {
    suggestions.intent = 'MIN';
  }
  
  // Find relevant columns based on prompt keywords
  const keywords = prompt.split(/\s+/);
  context.columns.forEach(col => {
    // Safety check: col.name must be a string
    if (!col || !col.name || typeof col.name !== 'string') {
      return;
    }
    
    const colNameLower = col.name.toLowerCase();
    
    // Check if column name mentioned in prompt
    keywords.forEach(keyword => {
      if (colNameLower.includes(keyword) && keyword.length > 2) {
        suggestions.suggestedColumns.push(col);
      }
    });
    
    // For numeric operations, prefer number columns
    if (suggestions.intent && ['SUM', 'AVERAGE', 'MAX', 'MIN'].includes(suggestions.intent)) {
      if (col.type === 'number' && !suggestions.suggestedColumns.includes(col)) {
        suggestions.suggestedColumns.push(col);
      }
    }
  });
  
  // Suggest range
  if (suggestions.suggestedColumns.length > 0) {
    const firstCol = suggestions.suggestedColumns[0];
    // From row 2 to last row (skip header)
    suggestions.suggestedRange = `${firstCol.column}2:${firstCol.column}${context.rowCount}`;
  }
  
  return suggestions;
}

