/**
 * History Component - AI History Viewer
 * Redesigned to match FormulaGenerator/DataAnalyzer UI patterns
 */

import * as React from "react";
import { useState, useEffect } from "react";
import { Button, Card, Text, Spinner } from "@fluentui/react-components";
import {
  History24Regular,
  Delete24Regular,
  Sparkle24Regular,
  DataUsage24Regular,
  Lightbulb24Regular,
} from "@fluentui/react-icons";

// API Service
import { getAIHistory, deleteAIHistory } from "../../services/apiService";

const History = () => {
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchHistory();
  }, [filter, page]);

  const fetchHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const typeFilter = filter !== "all" ? filter : null;
      const data = await getAIHistory(typeFilter, page, 10);
      setHistories(data.histories);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching history:", error);
      setError(error.message || "Không thể tải lịch sử");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAIHistory(id);
      fetchHistory(); // Refresh list
    } catch (error) {
      console.error("Error deleting history:", error);
      setError("Không thể xóa lịch sử");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "formula":
        return <Sparkle24Regular />;
      case "analysis":
        return <DataUsage24Regular />;
      case "guide":
        return <Lightbulb24Regular />;
      default:
        return <History24Regular />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "formula":
        return "Công thức";
      case "analysis":
        return "Phân tích";
      case "guide":
        return "Hướng dẫn";
      default:
        return type;
    }
  };

  const getResultPreview = (item) => {
    if (!item.output || !item.output.result) return "Không có kết quả";

    const result = item.output.result;

    if (item.type === "formula") {
      return result.formula || "Không có công thức";
    }

    if (item.type === "analysis") {
      return result.summary || "Không có tóm tắt";
    }

    if (item.type === "guide") {
      return result.taskName || "Không có tiêu đề";
    }

    return "Xem chi tiết";
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">
          <History24Regular /> Lịch sử AI
        </h2>
        <p className="page-subtitle">Xem lại các yêu cầu AI đã thực hiện</p>
      </div>

      {/* Filter Buttons */}
      <Card className="card">
        <Text weight="semibold" size={300} className="d-block mb-12">
          Lọc theo loại:
        </Text>
        <div className="button-group">
          <Button
            appearance={filter === "all" ? "primary" : "secondary"}
            onClick={() => setFilter("all")}
            size="small"
          >
            Tất cả
          </Button>
          <Button
            appearance={filter === "formula" ? "primary" : "secondary"}
            onClick={() => setFilter("formula")}
            icon={<Sparkle24Regular />}
            size="small"
          >
            Công thức
          </Button>
          <Button
            appearance={filter === "analysis" ? "primary" : "secondary"}
            onClick={() => setFilter("analysis")}
            icon={<DataUsage24Regular />}
            size="small"
          >
            Phân tích
          </Button>
          <Button
            appearance={filter === "guide" ? "primary" : "secondary"}
            onClick={() => setFilter("guide")}
            icon={<Lightbulb24Regular />}
            size="small"
          >
            Hướng dẫn
          </Button>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="alert alert--error">
          <Text>{error}</Text>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <Card className="loading-card">
          <Spinner size="large" />
          <Text className="loading-card__text">Đang tải lịch sử...</Text>
        </Card>
      )}

      {/* History List */}
      {!loading && histories.length === 0 && (
        <div className="empty-state">
          <History24Regular className="empty-state__icon" />
          <Text>Chưa có lịch sử {filter !== "all" ? getTypeLabel(filter).toLowerCase() : ""}</Text>
        </div>
      )}

      {!loading && histories.length > 0 && (
        <>
          {histories.map((item) => (
            <Card key={item._id} className="card">
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ color: "#0078d4", flexShrink: 0 }}>{getTypeIcon(item.type)}</div>
                <div style={{ flex: 1 }}>
                  {/* Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <div>
                      <Text weight="semibold" size={300} style={{ color: "#0078d4" }}>
                        {getTypeLabel(item.type)}
                      </Text>
                      <Text size={200} style={{ color: "#6b7280", marginLeft: "8px" }}>
                        {formatDate(item.createdAt)}
                      </Text>
                    </div>
                    <Button
                      appearance="subtle"
                      icon={<Delete24Regular />}
                      onClick={() => handleDelete(item._id)}
                      size="small"
                    />
                  </div>

                  {/* Prompt */}
                  <Text size={300} className="d-block mb-8" style={{ color: "#111827" }}>
                    <strong>Yêu cầu:</strong> {item.input.prompt}
                  </Text>

                  {/* Result Preview */}
                  <div
                    style={{
                      background: "#f3f4f6",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      borderLeft: "3px solid #0078d4",
                    }}
                  >
                    <Text size={200} style={{ color: "#374151" }}>
                      {getResultPreview(item)}
                    </Text>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <Card className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <Button
                  appearance="secondary"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  size="small"
                >
                  Trước
                </Button>
                <Text size={300}>
                  Trang {page} / {totalPages}
                </Text>
                <Button
                  appearance="secondary"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  size="small"
                >
                  Sau
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default History;
