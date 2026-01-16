/**
 * DataAnalyzer Component - AI Data Analysis
 *
 * REFACTORED:
 * - Loại bỏ makeStyles, inline styles → CSS classes
 * - Sử dụng apiService
 * - Frontend CHỈ handle UI state, business logic ở Backend
 */

import * as React from "react";
import { useState } from "react";
import { Button, Card, Spinner, Text } from "@fluentui/react-components";
import {
  DataUsage24Regular,
  ArrowUp24Regular,
  ArrowDown24Regular,
  Lightbulb24Regular,
  Warning24Regular,
  ChartMultiple24Regular,
  Sparkle24Filled,
} from "@fluentui/react-icons";

// API Service
import { analyzeExcelData, getExcelContext, cancelAIRequest } from "../../services/apiService";

const DataAnalyzer = ({ disabled = false, onRequestComplete }) => {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentAbortController, setCurrentAbortController] = useState(null);

  /**
   * Analyze data - gọi Backend API
   * TODO BACKEND: POST /api/analysis/data
   */
  const handleAnalyze = async () => {
    if (disabled) {
      setError("Bạn đã hết lượt sử dụng!");
      return;
    }

    setIsLoading(true);
    setError("");
    setAnalysis(null);

    try {
      // Get Excel context (client-side)
      const excelContext = await getExcelContext();

      if (!excelContext || !excelContext.sampleData || excelContext.sampleData.length === 0) {
        throw new Error("Không có dữ liệu để phân tích! Vui lòng chọn vùng dữ liệu trong Excel.");
      }

      // Gọi API qua apiService (auto handles auth, base URL, etc.)
      const result = await analyzeExcelData(excelContext);
      setAnalysis(result);

      // Notify parent to refresh credits
      if (onRequestComplete) {
        onRequestComplete();
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setError("Đã hủy phân tích");
      } else {
        setError(err.message || "Đã xảy ra lỗi!");
      }
    } finally {
      setIsLoading(false);
      setCurrentAbortController(null);
    }
  };

  /**
   * Cancel pending request
   */
  const handleCancel = () => {
    if (currentAbortController) {
      currentAbortController.abort();
      setCurrentAbortController(null);
    }
  };

  const getTrendIcon = (type) => {
    if (type === "positive") return <ArrowUp24Regular style={{ color: "#10b981" }} />;
    if (type === "negative") return <ArrowDown24Regular style={{ color: "#ef4444" }} />;
    return <ArrowUp24Regular style={{ color: "#f59e0b" }} />;
  };

  const getTrendClass = (type) => {
    if (type === "positive") return "trend-item trend-positive";
    if (type === "negative") return "trend-item trend-negative";
    return "trend-item trend-neutral";
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">
          <DataUsage24Regular /> Smart Data Analyzer
        </h2>
        <p className="page-subtitle">AI phân tích dữ liệu và đưa ra insights thông minh</p>
      </div>

      <Card className="card">
        {!isLoading ? (
          <Button
            appearance="primary"
            icon={<Sparkle24Filled />}
            onClick={handleAnalyze}
            className="btn-primary w-100"
          >
            Phân tích dữ liệu
          </Button>
        ) : (
          <Button appearance="secondary" onClick={handleCancel} className="w-100">
            <Spinner size="tiny" style={{ marginRight: "8px" }} />
            Đang phân tích... (Nhấn để hủy)
          </Button>
        )}

        <Text size={200} className="d-block mt-12" style={{ color: "#6b7280" }}>
          AI sẽ đọc dữ liệu trong Excel và đưa ra insights, trends, recommendations
        </Text>
      </Card>

      {/* Error */}
      {error && (
        <Card className="card alert alert--error">
          <Text style={{ color: "#991b1b" }}>{error}</Text>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <Card className="loading-card">
          <Spinner size="large" />
          <Text className="loading-card__text">AI đang phân tích dữ liệu của bạn...</Text>
        </Card>
      )}

      {/* Analysis Results */}
      {analysis && (
        <>
          {/* Summary */}
          <Card className="card card--primary">
            <Text
              weight="semibold"
              size={400}
              className="d-block mb-8"
              style={{ color: "#047857" }}
            >
              Tóm tắt
            </Text>
            <Text size={300} style={{ color: "#065f46", lineHeight: "1.6" }}>
              {analysis.summary}
            </Text>
          </Card>

          {/* Key Metrics */}
          {analysis.keyMetrics && analysis.keyMetrics.length > 0 && (
            <Card className="card">
              <Text weight="semibold" size={400} className="d-block mb-12">
                Chỉ số quan trọng
              </Text>
              <div className="metrics-grid">
                {analysis.keyMetrics.map((metric, idx) => (
                  <div key={idx} className="metric-card">
                    <Text size={200} style={{ color: "#6b7280", marginBottom: "4px" }}>
                      {metric.label}
                    </Text>
                    <Text size={400} weight="semibold" style={{ color: "#111827" }}>
                      {metric.value}
                    </Text>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Trends */}
          {analysis.trends && analysis.trends.length > 0 && (
            <Card className="card">
              <Text weight="semibold" size={400} className="d-block mb-12">
                Xu hướng
              </Text>
              {analysis.trends.map((trend, idx) => (
                <div key={idx} className={getTrendClass(trend.type)}>
                  {getTrendIcon(trend.type)}
                  <Text size={300} className="trend-content">
                    {trend.description}
                  </Text>
                </div>
              ))}
            </Card>
          )}

          {/* Insights */}
          {analysis.insights && analysis.insights.length > 0 && (
            <Card className="card">
              <Text weight="semibold" size={400} className="d-block mb-12">
                Phát hiện thú vị
              </Text>
              <ul className="insights-list">
                {analysis.insights.map((insight, idx) => (
                  <li key={idx} className="insight-item">
                    <Lightbulb24Regular style={{ color: "#10b981" }} className="flex-shrink-0" />
                    <Text size={300} className="flex-1 line-height-16">
                      {insight}
                    </Text>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <Card className="card">
              <Text weight="semibold" size={400} className="d-block mb-12">
                Đề xuất hành động
              </Text>
              <ul className="recommendations-list">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="recommendation-item">
                    <Text
                      size={300}
                      weight="semibold"
                      style={{ color: "#047857" }}
                      className="flex-shrink-0"
                    >
                      {idx + 1}.
                    </Text>
                    <Text size={300} className="flex-1 line-height-16">
                      {rec}
                    </Text>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Warnings */}
          {analysis.warnings && analysis.warnings.length > 0 && (
            <Card className="card">
              <Text weight="semibold" size={400} className="d-block mb-12">
                Cảnh báo
              </Text>
              <ul className="warnings-list">
                {analysis.warnings.map((warning, idx) => (
                  <li key={idx} className="warning-item">
                    <Warning24Regular style={{ color: "#f59e0b" }} className="flex-shrink-0" />
                    <Text size={300} className="flex-1 line-height-16">
                      {warning}
                    </Text>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Chart Suggestion */}
          {analysis.chartSuggestion && (
            <Card className="card card--primary">
              <Text
                weight="semibold"
                size={400}
                className="d-block mb-8"
                style={{ color: "#047857" }}
              >
                Gợi ý biểu đồ
              </Text>
              <div className="chart-suggestion-box mb-8">
                <ChartMultiple24Regular style={{ color: "#10b981" }} />
                <Text weight="semibold" size={300}>
                  {analysis.chartSuggestion.title}
                </Text>
              </div>
              <Text size={300} style={{ color: "#065f46", lineHeight: "1.6" }}>
                {analysis.chartSuggestion.description}
              </Text>
            </Card>
          )}
        </>
      )}

      {/* Empty State */}
      {!analysis && !isLoading && !error && (
        <div className="empty-state">
          <DataUsage24Regular className="empty-state__icon" />
          <Text>Kết quả phân tích sẽ xuất hiện ở đây</Text>
        </div>
      )}
    </div>
  );
};

export default DataAnalyzer;
