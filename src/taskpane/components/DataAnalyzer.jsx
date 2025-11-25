import * as React from "react";
import { useState } from "react";
import {
  Button,
  Card,
  Spinner,
  Text,
  tokens,
  makeStyles
} from "@fluentui/react-components";
import {
  DataUsage24Regular,
  ArrowUp24Regular,
  ArrowDown24Regular,
  Lightbulb24Regular,
  Warning24Regular,
  ChartMultiple24Regular,
  Sparkle24Filled
} from "@fluentui/react-icons";
import { analyzeExcelData, hasApiKey } from "../../services/geminiService";
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
  summaryCard: {
    backgroundColor: "#d1fae5",
    borderLeft: "4px solid #10b981",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
    marginTop: "12px",
  },
  metricCard: {
    padding: "16px",
    backgroundColor: "#d1fae5",
    borderRadius: "8px",
    border: "1px solid #6ee7b7",
  },
  metricIcon: {
    fontSize: "24px",
    marginBottom: "8px",
  },
  metricLabel: {
    fontSize: "12px",
    color: "#047857",
    marginBottom: "4px",
  },
  metricValue: {
    fontSize: "18px",
    fontWeight: tokens.fontWeightSemibold,
    color: "#065f46",
  },
  trendItem: {
    padding: "12px",
    marginBottom: "8px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  trendPositive: {
    backgroundColor: "#d1fae5",
    border: "1px solid #6ee7b7",
  },
  trendNegative: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fca5a5",
  },
  trendNeutral: {
    backgroundColor: "#fef9c3",
    border: "1px solid #fde047",
  },
  insightsList: {
    listStyle: "none",
    padding: 0,
    margin: "12px 0 0 0",
  },
  insightItem: {
    padding: "12px",
    marginBottom: "8px",
    backgroundColor: "#d1fae5",
    borderRadius: "8px",
    border: "1px solid #6ee7b7",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  recommendationsList: {
    listStyle: "none",
    padding: 0,
    margin: "12px 0 0 0",
  },
  recommendationItem: {
    padding: "12px",
    marginBottom: "8px",
    backgroundColor: "#d1fae5",
    borderRadius: "8px",
    border: "1px solid #6ee7b7",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  warningsList: {
    listStyle: "none",
    padding: 0,
    margin: "12px 0 0 0",
  },
  warningItem: {
    padding: "12px",
    marginBottom: "8px",
    backgroundColor: "#fef3c7",
    borderRadius: "8px",
    border: "1px solid #fde047",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  chartSuggestionCard: {
    backgroundColor: "#d1fae5",
    borderLeft: "4px solid #10b981",
  },
  loadingCard: {
    textAlign: "center",
    padding: "48px 20px",
  },
  emptyState: {
    textAlign: "center",
    padding: "48px 20px",
    color: "#6b7280",
  },
});

const DataAnalyzer = () => {
  const styles = useStyles();
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!hasApiKey()) {
      setError("Vui lòng cấu hình API Key trước!");
      return;
    }

    setIsLoading(true);
    setError("");
    setAnalysis(null);

    try {
      // Get Excel context
      const excelContext = await getExcelContext();
      
      if (!excelContext || !excelContext.sampleData || excelContext.sampleData.length === 0) {
        throw new Error("Không có dữ liệu để phân tích! Vui lòng chọn vùng dữ liệu trong Excel.");
      }

      // Analyze data
      const result = await analyzeExcelData(excelContext);
      setAnalysis(result);
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi!");
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (type) => {
    if (type === "positive") return <ArrowUp24Regular style={{ color: "#10b981" }} />;
    if (type === "negative") return <ArrowDown24Regular style={{ color: "#ef4444" }} />;
    return <ArrowUp24Regular style={{ color: "#f59e0b" }} />;
  };

  const getTrendStyle = (type) => {
    if (type === "positive") return styles.trendPositive;
    if (type === "negative") return styles.trendNegative;
    return styles.trendNeutral;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <DataUsage24Regular /> Smart Data Analyzer
        </h2>
        <p className={styles.subtitle}>
          AI phân tích dữ liệu và đưa ra insights thông minh
        </p>
      </div>

      <Card className={styles.card}>
        <Button
          appearance="primary"
          icon={isLoading ? <Spinner size="tiny" /> : <Sparkle24Filled />}
          onClick={handleAnalyze}
          disabled={isLoading}
          style={{ 
            width: "100%",
            backgroundColor: "#10b981",
            borderColor: "#10b981",
          }}
        >
          {isLoading ? "Đang phân tích..." : "Phân tích dữ liệu"}
        </Button>

        <Text size={200} style={{ display: "block", marginTop: "12px", color: "#6b7280" }}>
          💡 AI sẽ đọc dữ liệu trong Excel và đưa ra insights, trends, recommendations
        </Text>
      </Card>

      {error && (
        <Card className={styles.card} style={{ backgroundColor: "#fee2e2", border: "1px solid #fca5a5" }}>
          <Text style={{ color: "#991b1b" }}>{error}</Text>
        </Card>
      )}

      {isLoading && (
        <Card className={styles.loadingCard}>
          <Spinner size="large" />
          <Text style={{ display: "block", marginTop: "16px", color: "#6b7280" }}>
            AI đang phân tích dữ liệu của bạn...
          </Text>
        </Card>
      )}

      {analysis && (
        <>
          {/* Summary */}
          <Card className={`${styles.card} ${styles.summaryCard}`}>
            <Text weight="semibold" size={400} style={{ display: "block", marginBottom: "8px", color: "#047857" }}>
              📊 Tóm tắt
            </Text>
            <Text size={300} style={{ color: "#065f46", lineHeight: "1.6" }}>
              {analysis.summary}
            </Text>
          </Card>

          {/* Key Metrics */}
          {analysis.keyMetrics && analysis.keyMetrics.length > 0 && (
            <Card className={styles.card}>
              <Text weight="semibold" size={400} style={{ display: "block", marginBottom: "12px" }}>
                📈 Chỉ số quan trọng
              </Text>
              <div className={styles.metricsGrid}>
                {analysis.keyMetrics.map((metric, idx) => (
                  <div key={idx} className={styles.metricCard}>
                    <div className={styles.metricIcon}>{metric.icon}</div>
                    <Text size={200} className={styles.metricLabel}>{metric.label}</Text>
                    <Text className={styles.metricValue}>{metric.value}</Text>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Trends */}
          {analysis.trends && analysis.trends.length > 0 && (
            <Card className={styles.card}>
              <Text weight="semibold" size={400} style={{ display: "block", marginBottom: "12px" }}>
                📊 Xu hướng
              </Text>
              {analysis.trends.map((trend, idx) => (
                <div key={idx} className={`${styles.trendItem} ${getTrendStyle(trend.type)}`}>
                  {getTrendIcon(trend.type)}
                  <Text size={300} style={{ flex: 1, lineHeight: "1.6" }}>
                    {trend.description}
                  </Text>
                </div>
              ))}
            </Card>
          )}

          {/* Insights */}
          {analysis.insights && analysis.insights.length > 0 && (
            <Card className={styles.card}>
              <Text weight="semibold" size={400} style={{ display: "block", marginBottom: "12px" }}>
                💡 Phát hiện thú vị
              </Text>
              <ul className={styles.insightsList}>
                {analysis.insights.map((insight, idx) => (
                  <li key={idx} className={styles.insightItem}>
                    <Lightbulb24Regular style={{ color: "#10b981", flexShrink: 0 }} />
                    <Text size={300} style={{ flex: 1, lineHeight: "1.6" }}>
                      {insight}
                    </Text>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <Card className={styles.card}>
              <Text weight="semibold" size={400} style={{ display: "block", marginBottom: "12px" }}>
                🎯 Đề xuất hành động
              </Text>
              <ul className={styles.recommendationsList}>
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className={styles.recommendationItem}>
                    <Text size={300} weight="semibold" style={{ color: "#047857", flexShrink: 0 }}>
                      {idx + 1}.
                    </Text>
                    <Text size={300} style={{ flex: 1, lineHeight: "1.6" }}>
                      {rec}
                    </Text>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Warnings */}
          {analysis.warnings && analysis.warnings.length > 0 && (
            <Card className={styles.card}>
              <Text weight="semibold" size={400} style={{ display: "block", marginBottom: "12px" }}>
                ⚠️ Cảnh báo
              </Text>
              <ul className={styles.warningsList}>
                {analysis.warnings.map((warning, idx) => (
                  <li key={idx} className={styles.warningItem}>
                    <Warning24Regular style={{ color: "#f59e0b", flexShrink: 0 }} />
                    <Text size={300} style={{ flex: 1, lineHeight: "1.6" }}>
                      {warning}
                    </Text>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Chart Suggestion */}
          {analysis.chartSuggestion && (
            <Card className={`${styles.card} ${styles.chartSuggestionCard}`}>
              <Text weight="semibold" size={400} style={{ display: "block", marginBottom: "8px", color: "#047857" }}>
                📊 Gợi ý biểu đồ
              </Text>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                <ChartMultiple24Regular style={{ color: "#10b981" }} />
                <Text weight="semibold" size={300}>{analysis.chartSuggestion.title}</Text>
              </div>
              <Text size={300} style={{ color: "#065f46", lineHeight: "1.6" }}>
                {analysis.chartSuggestion.description}
              </Text>
            </Card>
          )}
        </>
      )}

      {!analysis && !isLoading && !error && (
        <div className={styles.emptyState}>
          <DataUsage24Regular style={{ fontSize: "64px", marginBottom: "16px", opacity: 0.3 }} />
          <Text>Kết quả phân tích sẽ xuất hiện ở đây</Text>
        </div>
      )}
    </div>
  );
};

export default DataAnalyzer;

