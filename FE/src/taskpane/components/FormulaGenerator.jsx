/**
 * FormulaGenerator Component - AI Formula Generation
 *
 * REFACTORED:
 * - Loại bỏ makeStyles, inline styles → CSS classes
 * - Sử dụng apiService: generateExcelFormula, insertFormulaToExcel
 * - Frontend CHỈ handle UI state + API calls
 * - Business logic (validation, AI processing) → Backend
 */

import * as React from "react";
import { useState } from "react";
import { Button, Card, Field, Textarea, Spinner, Text, Switch } from "@fluentui/react-components";
import {
  Sparkle24Regular,
  Copy24Regular,
  Checkmark24Regular,
  Send24Filled,
  Eye24Regular,
} from "@fluentui/react-icons";

// API Service
import {
  generateExcelFormula,
  getExcelContext,
  insertFormulaToExcel,
  cancelAIRequest,
} from "../../services/apiService";

import ModelSelector from "./ModelSelector";

const FormulaGenerator = ({ disabled = false, onRequestComplete }) => {
  const [prompt, setPrompt] = useState("");
  const [formula, setFormula] = useState("");
  const [explanation, setExplanation] = useState("");
  const [example, setExample] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [useContext, setUseContext] = useState(true);
  const [contextInfo, setContextInfo] = useState(null);
  const [insertSuccess, setInsertSuccess] = useState(false);
  const [currentAbortController, setCurrentAbortController] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);

  const examplePrompts = [
    "Tính tổng các ô từ A1 đến A10",
    "Tìm giá trị lớn nhất trong cột B",
    "Đếm số ô không rỗng trong C1:C50",
    "Tính trung bình nếu cột D > 100",
  ];

  /**
   * Generate formula - gọi Backend API
   * TODO BACKEND: POST /api/formula/generate
   */
  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    if (disabled) {
      setError("Bạn đã hết lượt sử dụng!");
      return;
    }

    setIsLoading(true);
    setError("");
    setFormula("");
    setExplanation("");
    setExample("");
    setContextInfo(null);

    try {
      // Get Excel context nếu enabled
      let excelContext = null;
      if (useContext) {
        try {
          excelContext = await getExcelContext();
          setContextInfo(excelContext);
          console.log("📊 Excel context:", excelContext);
        } catch (ctxErr) {
          console.warn("⚠️ Could not get Excel context:", ctxErr);
          // Continue without context if it fails
        }
      }

      // Gọi API qua apiService (auto handles auth, base URL, etc.)
      const result = await generateExcelFormula(prompt, excelContext, selectedModel);

      // Xử lý trường hợp AI trả về formula rỗng (yêu cầu không rõ ràng)
      if (!result.formula || result.formula.trim() === "") {
        // Hiển thị explanation như một warning/info message
        setError(result.explanation || "AI không thể tạo công thức. Vui lòng mô tả chi tiết hơn.");
        setFormula("");
        setExplanation("");
        setExample("");
      } else {
        setFormula(result.formula);
        setExplanation(result.explanation);
        setExample(result.example || "");
      }

      // Notify parent to refresh credits
      if (onRequestComplete) {
        onRequestComplete();
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setError("Đã hủy yêu cầu");
      } else if (err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError")) {
        setError("Lỗi kết nối mạng! Kiểm tra kết nối internet và thử lại.");
      } else if (err.message?.includes("timeout") || err.message?.includes("Timeout")) {
        setError("Yêu cầu quá thời gian. Vui lòng thử lại.");
      } else {
        setError(err.message || "Đã xảy ra lỗi không xác định!");
      }
    } finally {
      setIsLoading(false);
      setCurrentAbortController(null);
    }
  };

  /**
   * Cancel pending request - KISS: just reset loading state
   */
  const handleCancel = () => {
    setIsLoading(false);
    setError("Đã hủy yêu cầu");
  };

  /**
   * Copy formula to clipboard
   */
  const handleCopy = () => {
    navigator.clipboard.writeText(formula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Insert formula vào Excel - Client-side Excel API
   */
  const handleInsertToExcel = async () => {
    if (!formula) return;

    try {
      await insertFormulaToExcel(formula);
      setError("");
      setInsertSuccess(true);
      setTimeout(() => setInsertSuccess(false), 3000);
    } catch (err) {
      setError("❌ Lỗi khi insert vào Excel: " + err.message);
    }
  };

  const handleExampleClick = (exampleText) => {
    setPrompt(exampleText);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">
          <Sparkle24Regular /> AI Formula Generator
        </h2>
        <p className="page-subtitle">
          Mô tả những gì bạn muốn làm, AI sẽ tạo công thức Excel cho bạn
        </p>
      </div>

      <Card className="card">
        <Field label="Mô tả yêu cầu của bạn">
          <Textarea
            placeholder="VD: Tính tổng doanh thu từ cột D nếu ngày trong cột A là tháng này..."
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </Field>

        {/* Context Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}>
          <Switch checked={useContext} onChange={(e, data) => setUseContext(data.checked)} />
          <Text size={200} style={{ color: "#6b7280" }}>
            Sử dụng ngữ cảnh Excel (cột, dữ liệu mẫu)
          </Text>
        </div>

        {/* Button row with Model Selector on the RIGHT */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "16px" }}>
          {!isLoading ? (
            <Button
              appearance="primary"
              icon={<Sparkle24Regular />}
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              style={{
                flex: 1,
                background: "#10b981", // Green color
                border: "none",
                color: "white",
              }}
            >
              Tạo công thức
            </Button>
          ) : (
            <Button appearance="secondary" onClick={handleCancel} style={{ flex: 1 }}>
              <Spinner size="tiny" style={{ marginRight: "8px" }} />
              Đang tạo... (Hủy)
            </Button>
          )}

          {/* Model Selector - compact on the right */}
          <ModelSelector onModelChange={setSelectedModel} />
        </div>

        <div className="mt-16">
          <Text size={200} className="d-block mb-8">
            Ví dụ nhanh:
          </Text>
          <div className="example-chips">
            {examplePrompts.map((ex, idx) => (
              <div key={idx} className="chip" onClick={() => handleExampleClick(ex)}>
                {ex}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && <div className="alert alert--error">{error}</div>}

      {/* Success Message */}
      {insertSuccess && (
        <div className="alert alert--success">
          <Checkmark24Regular />
          <Text weight="semibold">✅ Đã insert công thức vào Excel thành công!</Text>
        </div>
      )}

      {/* Display Context Info */}
      {contextInfo && (
        <Card className="card context-info-card">
          <Text weight="semibold" size={300} className="context-info-title">
            📊 AI đã phân tích Excel của bạn:
          </Text>
          <Text size={200} className="context-info-content">
            • Sheet: <strong>{contextInfo.sheetName}</strong>
            <br />• Dữ liệu: {contextInfo.rowCount} hàng × {contextInfo.columnCount} cột
            {contextInfo.startRow && (
              <>
                <br />• Vị trí: Bắt đầu từ hàng {contextInfo.startRow}
              </>
            )}
            {contextInfo.selectedCell && (
              <>
                <br />• Ô đang chọn: {contextInfo.selectedCell.address}
              </>
            )}
          </Text>

          {/* Named Tables */}
          {contextInfo.namedTables && contextInfo.namedTables.length > 0 && (
            <Text
              size={200}
              className="context-info-content"
              style={{ marginTop: "8px", color: "#0078d4" }}
            >
              📋 <strong>Named Tables ({contextInfo.namedTables.length}):</strong>
              <br />
              {contextInfo.namedTables.map((table, idx) => (
                <span key={idx}>
                  • {table.name}: {table.columns.slice(0, 5).join(", ")}
                  {table.columns.length > 5 ? "..." : ""}
                  <br />
                </span>
              ))}
            </Text>
          )}

          {/* Regular Columns (fallback if no tables) */}
          {(!contextInfo.namedTables || contextInfo.namedTables.length === 0) && (
            <Text size={200} className="context-info-content">
              • Các cột:{" "}
              {contextInfo.columns
                .filter((c) => c.hasData)
                .map((c) => `${c.name} (${c.type})`)
                .join(", ")}
            </Text>
          )}
        </Card>
      )}

      {/* Formula Result */}
      {formula && (
        <Card className="card">
          <Text weight="semibold" size={400} className="d-block mb-12">
            Công thức được tạo:
          </Text>

          <div className="formula-box">{formula}</div>

          <div className="button-group">
            <Button
              appearance="secondary"
              icon={copied ? <Checkmark24Regular /> : <Copy24Regular />}
              onClick={handleCopy}
            >
              {copied ? "Đã sao chép!" : "Sao chép"}
            </Button>
            <Button
              appearance="primary"
              icon={<Send24Filled />}
              onClick={handleInsertToExcel}
              className="btn-primary"
            >
              Insert vào Excel
            </Button>
          </div>

          {/* Explanation */}
          {explanation && (
            <div className="explanation-box">
              <span className="explanation-box__title">💡 Giải thích:</span>
              <Text size={300} className="explanation-box__content">
                {explanation}
              </Text>
            </div>
          )}

          {/* Example */}
          {example && (
            <div className="example-box">
              <span className="example-box__title">📝 Ví dụ:</span>
              <Text size={300} className="example-box__content">
                {example}
              </Text>
            </div>
          )}
        </Card>
      )}

      {/* Empty State */}
      {!formula && !isLoading && !error && (
        <div className="empty-state">
          <Sparkle24Regular className="empty-state__icon" />
          <Text>Công thức của bạn sẽ xuất hiện ở đây</Text>
        </div>
      )}
    </div>
  );
};

export default FormulaGenerator;
