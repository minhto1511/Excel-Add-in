import * as React from "react";
import { useState } from "react";
import {
  Button,
  Card,
  Field,
  Textarea,
  Spinner,
  Text,
  tokens,
  makeStyles,
  Checkbox,
  Switch
} from "@fluentui/react-components";
import {
  Sparkle24Regular,
  Copy24Regular,
  Checkmark24Regular,
  Send24Filled,
  Eye24Regular
} from "@fluentui/react-icons";
import { generateExcelFormula, hasApiKey } from "../../services/geminiService";
import { getExcelContext } from "../../services/excelContextService";

const useStyles = makeStyles({
  container: {
    padding: "20px",
    backgroundColor: "#f9fafb",
    minHeight: "100%",
  },
  header: {
    textAlign: "center",
    marginBottom: "24px",
  },
  title: {
    fontSize: "24px",
    fontWeight: tokens.fontWeightSemibold,
    margin: "0 0 8px 0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    color: "#111827",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: "14px",
  },
  card: {
    marginBottom: "16px",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    backgroundColor: "white",
  },
  field: {
    marginBottom: "16px",
  },
  exampleChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "12px",
  },
  chip: {
    padding: "6px 12px",
    backgroundColor: "#e5e7eb",
    borderRadius: tokens.borderRadiusMedium,
    fontSize: "12px",
    cursor: "pointer",
    border: "1px solid #d1d5db",
    transition: "all 0.2s",
    "&:hover": {
      backgroundColor: "#d1d5db",
      transform: "translateY(-2px)",
    },
  },
  resultBox: {
    padding: "20px",
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: "12px",
  },
  formulaBox: {
    padding: "16px",
    backgroundColor: "#ffffff",
    border: "2px solid #10b981",
    borderRadius: tokens.borderRadiusMedium,
    fontFamily: "monospace",
    fontSize: "16px",
    fontWeight: tokens.fontWeightSemibold,
    wordBreak: "break-all",
    marginBottom: "12px",
  },
  explanationBox: {
    padding: "16px",
    backgroundColor: "#eff6ff",
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: "12px",
  },
  exampleBox: {
    padding: "16px",
    backgroundColor: "#fef3c7",
    borderRadius: tokens.borderRadiusMedium,
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
    marginTop: "16px",
  },
  noApiKey: {
    textAlign: "center",
    padding: "32px",
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
  },
});

const FormulaGenerator = () => {
  const styles = useStyles();
  const [prompt, setPrompt] = useState("");
  const [formula, setFormula] = useState("");
  const [explanation, setExplanation] = useState("");
  const [example, setExample] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [useContext, setUseContext] = useState(true); // Enable context by default
  const [contextInfo, setContextInfo] = useState(null);
  const [insertSuccess, setInsertSuccess] = useState(false);

  const examplePrompts = [
    "Tính tổng các ô từ A1 đến A10",
    "Tìm giá trị lớn nhất trong cột B",
    "Đếm số ô không rỗng trong C1:C50",
    "Tính trung bình nếu cột D > 100",
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    if (!hasApiKey()) {
      setError("Vui lòng cấu hình API Key trước!");
      return;
    }

    setIsLoading(true);
    setError("");
    setFormula("");
    setExplanation("");
    setExample("");
    setContextInfo(null);

    try {
      // Get Excel context if enabled
      let excelContext = null;
      if (useContext) {
        try {
          excelContext = await getExcelContext();
          setContextInfo(excelContext);
          console.log('📊 Excel context:', excelContext);
        } catch (ctxErr) {
          console.warn('⚠️ Could not get Excel context:', ctxErr);
          // Continue without context if it fails
        }
      }

      // Generate formula with context
      const result = await generateExcelFormula(prompt, excelContext);
      setFormula(result.formula);
      setExplanation(result.explanation);
      setExample(result.example || "");
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertToExcel = async () => {
    if (!formula) return;

    try {
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getActiveWorksheet();
        
        // Insert vào selected cell (thay vì hardcode A1)
        const range = context.workbook.getSelectedRange();
        range.load("address");
        await context.sync();
        
        // Set formula
        range.values = [[formula]];
        range.format.autofitColumns();
        await context.sync();
        
        // Show success
        setError("");
        setInsertSuccess(true);
        setTimeout(() => setInsertSuccess(false), 3000);
      });
    } catch (err) {
      setError("❌ Lỗi khi insert vào Excel: " + err.message);
    }
  };

  const handleExampleClick = (exampleText) => {
    setPrompt(exampleText);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Sparkle24Regular /> AI Formula Generator
        </h2>
        <p className={styles.subtitle}>
          Mô tả những gì bạn muốn làm, AI sẽ tạo công thức Excel cho bạn
        </p>
      </div>

      <Card className={styles.card}>
        <Field label="Mô tả yêu cầu của bạn" className={styles.field}>
          <Textarea
            placeholder="VD: Tính tổng doanh thu từ cột D nếu ngày trong cột A là tháng này..."
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </Field>

        {/* Context Toggle */}
        <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#f0fdf4", borderRadius: "8px", border: "1px solid #86efac" }}>
          <Switch
            checked={useContext}
            onChange={(e) => setUseContext(e.currentTarget.checked)}
            label={
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Eye24Regular style={{ color: "#10b981" }} />
                <div>
                  <Text weight="semibold" style={{ display: "block", color: "#065f46" }}>
                    Đọc context Excel (Recommended)
                  </Text>
                  <Text size={200} style={{ color: "#047857" }}>
                    AI sẽ phân tích dữ liệu thực tế trong sheet để tạo công thức chính xác hơn
                  </Text>
                </div>
              </div>
            }
          />
        </div>

        <Button
          appearance="primary"
          icon={isLoading ? <Spinner size="tiny" /> : <Sparkle24Regular />}
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          style={{ 
            width: "100%",
            backgroundColor: "#10b981",
            borderColor: "#10b981",
          }}
        >
          {isLoading ? "Đang tạo công thức..." : "Tạo công thức"}
        </Button>

        <div style={{ marginTop: "16px" }}>
          <Text size={200} style={{ display: "block", marginBottom: "8px" }}>
            Ví dụ nhanh:
          </Text>
          <div className={styles.exampleChips}>
            {examplePrompts.map((ex, idx) => (
              <div
                key={idx}
                className={styles.chip}
                onClick={() => handleExampleClick(ex)}
              >
                {ex}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div style={{ 
          padding: "16px", 
          backgroundColor: "#fee2e2", 
          borderRadius: tokens.borderRadiusMedium,
          marginBottom: "16px",
          color: "#991b1b",
          border: "1px solid #fca5a5"
        }}>
          {error}
        </div>
      )}

      {/* Success Message */}
      {insertSuccess && (
        <div style={{ 
          padding: "16px", 
          backgroundColor: "#d1fae5", 
          borderRadius: tokens.borderRadiusMedium,
          marginBottom: "16px",
          color: "#065f46",
          border: "1px solid #6ee7b7",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <Checkmark24Regular />
          <Text weight="semibold">✅ Đã insert công thức vào Excel thành công!</Text>
        </div>
      )}

      {/* Display Context Info if available */}
      {contextInfo && (
        <Card className={styles.card} style={{ backgroundColor: "#f0fdf4", border: "1px solid #86efac" }}>
          <Text weight="semibold" size={300} style={{ display: "block", marginBottom: "8px", color: "#065f46" }}>
            📊 AI đã phân tích Excel của bạn:
          </Text>
          <Text size={200} style={{ color: "#047857", lineHeight: "1.6" }}>
            • Sheet: <strong>{contextInfo.sheetName}</strong><br />
            • Dữ liệu: {contextInfo.rowCount} hàng × {contextInfo.columnCount} cột<br />
            • Các cột: {contextInfo.columns.filter(c => c.hasData).map(c => `${c.name} (${c.type})`).join(', ')}
          </Text>
        </Card>
      )}

      {formula && (
        <Card className={styles.card}>
          <Text weight="semibold" size={400} style={{ display: "block", marginBottom: "12px" }}>
            Công thức được tạo:
          </Text>

          <div className={styles.formulaBox}>
            {formula}
          </div>

          <div className={styles.buttonGroup}>
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
              style={{ 
                backgroundColor: "#10b981",
                borderColor: "#10b981",
              }}
            >
              Insert vào Excel
            </Button>
          </div>

          {explanation && (
            <div className={styles.explanationBox} style={{ marginTop: "16px" }}>
              <Text weight="semibold" style={{ display: "block", marginBottom: "8px", color: "#1e40af" }}>
                💡 Giải thích:
              </Text>
              <Text size={300} style={{ lineHeight: "1.6", color: "#374151" }}>
                {explanation}
              </Text>
            </div>
          )}

          {example && (
            <div className={styles.exampleBox}>
              <Text weight="semibold" style={{ display: "block", marginBottom: "8px", color: "#92400e" }}>
                📝 Ví dụ:
              </Text>
              <Text size={300} style={{ lineHeight: "1.6", color: "#78350f" }}>
                {example}
              </Text>
            </div>
          )}
        </Card>
      )}

      {!formula && !isLoading && !error && (
        <div className={styles.noApiKey}>
          <Sparkle24Regular style={{ fontSize: "48px", color: tokens.colorNeutralForeground3, marginBottom: "12px" }} />
          <Text>Công thức của bạn sẽ xuất hiện ở đây</Text>
        </div>
      )}
    </div>
  );
};

export default FormulaGenerator;

