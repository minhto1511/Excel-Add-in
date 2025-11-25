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
  makeStyles
} from "@fluentui/react-components";
import {
  Sparkle24Regular,
  Lightbulb24Regular,
  Warning24Regular,
  CheckmarkCircle24Regular,
  ChevronRight24Regular,
  ChevronLeft24Regular
} from "@fluentui/react-icons";
import { generateStepByStep, hasApiKey } from "../../services/geminiService";

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
  stepperCard: {
    padding: "20px",
    marginBottom: "16px",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    backgroundColor: "white",
  },
  stepHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    paddingBottom: "16px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  stepNumber: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#10b981",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: tokens.fontWeightSemibold,
    fontSize: "18px",
    flexShrink: 0,
  },
  stepTitle: {
    fontSize: "18px",
    fontWeight: tokens.fontWeightSemibold,
    margin: "0",
  },
  stepDescription: {
    color: tokens.colorNeutralForeground3,
    fontSize: "14px",
  },
  detailsList: {
    listStyle: "none",
    padding: "0",
    margin: "0 0 16px 0",
  },
  detailItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "12px",
    padding: "12px",
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
  },
  detailBullet: {
    color: "#10b981",
    fontWeight: tokens.fontWeightSemibold,
    flexShrink: 0,
  },
  tipsBox: {
    padding: "16px",
    backgroundColor: "#eff6ff",
    borderRadius: tokens.borderRadiusMedium,
    border: "1px solid #bfdbfe",
    marginBottom: "12px",
  },
  warningBox: {
    padding: "16px",
    backgroundColor: "#fef3c7",
    borderRadius: tokens.borderRadiusMedium,
    border: "1px solid #fde047",
    marginBottom: "12px",
  },
  navigation: {
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
    paddingTop: "16px",
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  progressBar: {
    height: "8px",
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: "4px",
    overflow: "hidden",
    marginBottom: "16px",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10b981",
    transition: "width 0.3s ease",
  },
  completionCard: {
    padding: "32px",
    textAlign: "center",
    backgroundColor: "#d1fae5",
    border: "2px solid #10b981",
    borderRadius: tokens.borderRadiusMedium,
  },
});

const StepByStepGuide = () => {
  const styles = useStyles();
  const [task, setTask] = useState("");
  const [taskName, setTaskName] = useState("");
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const exampleTasks = [
    "Tạo biểu đồ cột từ dữ liệu",
    "Sử dụng VLOOKUP",
    "Tạo Pivot Table",
    "Conditional Formatting",
  ];

  const handleGenerate = async () => {
    if (!task.trim()) return;

    if (!hasApiKey()) {
      setError("Vui lòng cấu hình API Key trước!");
      return;
    }

    setIsLoading(true);
    setError("");
    setSteps([]);
    setCurrentStep(0);

    try {
      const result = await generateStepByStep(task);
      setTaskName(result.taskName);
      setSteps(result.steps);
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (exampleText) => {
    setTask(exampleText);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCurrentStep(steps.length); // Completion state
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
  };

  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Lightbulb24Regular /> Hướng Dẫn Step by Step
        </h2>
        <p className={styles.subtitle}>
          Mô tả task bạn muốn thực hiện, AI sẽ hướng dẫn từng bước chi tiết
        </p>
      </div>

      <Card className={styles.card}>
        <Field label="Mô tả task của bạn">
          <Textarea
            placeholder="VD: Tôi muốn tạo một biểu đồ cột để hiển thị doanh thu theo tháng..."
            rows={4}
            value={task}
            onChange={(e) => setTask(e.target.value)}
          />
        </Field>

        <Button
          appearance="primary"
          icon={isLoading ? <Spinner size="tiny" /> : <Sparkle24Regular />}
          onClick={handleGenerate}
          disabled={isLoading || !task.trim()}
          style={{ 
            width: "100%", 
            marginTop: "16px",
            backgroundColor: "#10b981",
            borderColor: "#10b981",
          }}
        >
          {isLoading ? "Đang tạo hướng dẫn..." : "Tạo hướng dẫn"}
        </Button>

        <div style={{ marginTop: "16px" }}>
          <Text size={200} style={{ display: "block", marginBottom: "8px" }}>
            Ví dụ nhanh:
          </Text>
          <div className={styles.exampleChips}>
            {exampleTasks.map((ex, idx) => (
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

      {error && (
        <div style={{
          padding: "16px",
          backgroundColor: "#fee2e2",
          borderRadius: tokens.borderRadiusMedium,
          marginBottom: "16px",
          color: "#991b1b"
        }}>
          {error}
        </div>
      )}

      {steps.length > 0 && currentStep < steps.length && (
        <>
          {/* Progress Bar */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <Text weight="semibold">
                Bước {currentStep + 1} / {steps.length}
              </Text>
              <Text>{Math.round(progress)}%</Text>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Current Step */}
          <Card className={styles.stepperCard}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>{currentStep + 1}</div>
              <div style={{ flex: 1 }}>
                <h3 className={styles.stepTitle}>{steps[currentStep].title}</h3>
                <p className={styles.stepDescription}>{steps[currentStep].description}</p>
              </div>
            </div>

            {/* Details */}
            <div style={{ marginBottom: "16px" }}>
              <Text weight="semibold" style={{ display: "block", marginBottom: "12px" }}>
                Chi tiết thực hiện:
              </Text>
              <ul className={styles.detailsList}>
                {steps[currentStep].details.map((detail, idx) => (
                  <li key={idx} className={styles.detailItem}>
                    <span className={styles.detailBullet}>▸</span>
                    <Text size={300}>{detail}</Text>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tips */}
            {steps[currentStep].tips && (
              <div className={styles.tipsBox}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <Lightbulb24Regular style={{ color: "#3b82f6", flexShrink: 0 }} />
                  <div>
                    <Text weight="semibold" style={{ display: "block", color: "#1e40af", marginBottom: "4px" }}>
                      💡 Mẹo hữu ích:
                    </Text>
                    <Text size={300} style={{ color: "#1e40af" }}>
                      {steps[currentStep].tips}
                    </Text>
                  </div>
                </div>
              </div>
            )}

            {/* Warning */}
            {steps[currentStep].warning && (
              <div className={styles.warningBox}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <Warning24Regular style={{ color: "#d97706", flexShrink: 0 }} />
                  <div>
                    <Text weight="semibold" style={{ display: "block", color: "#92400e", marginBottom: "4px" }}>
                      ⚠️ Lưu ý:
                    </Text>
                    <Text size={300} style={{ color: "#92400e" }}>
                      {steps[currentStep].warning}
                    </Text>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className={styles.navigation}>
              <Button
                appearance="secondary"
                icon={<ChevronLeft24Regular />}
                onClick={handlePrev}
                disabled={currentStep === 0}
              >
                Quay lại
              </Button>
              <Button
                appearance="primary"
                icon={<ChevronRight24Regular />}
                iconPosition="after"
                onClick={handleNext}
                style={{ 
                  backgroundColor: "#10b981",
                  borderColor: "#10b981",
                }}
              >
                {currentStep === steps.length - 1 ? "Hoàn thành" : "Bước tiếp theo"}
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Completion */}
      {steps.length > 0 && currentStep === steps.length && (
        <div className={styles.completionCard}>
          <CheckmarkCircle24Regular style={{ fontSize: "64px", color: "#10b981", marginBottom: "16px" }} />
          <Text size={500} weight="semibold" style={{ display: "block", marginBottom: "8px", color: "#065f46" }}>
            Hoàn thành! 🎉
          </Text>
          <Text style={{ display: "block", marginBottom: "24px", color: "#065f46" }}>
            Bạn đã hoàn thành tất cả {steps.length} bước. Hy vọng hướng dẫn này hữu ích!
          </Text>
          <Button
            appearance="primary"
            onClick={handleReset}
            style={{ 
              backgroundColor: "#10b981",
              borderColor: "#10b981",
            }}
          >
            Xem lại từ đầu
          </Button>
        </div>
      )}

      {!steps.length && !isLoading && !error && (
        <div style={{
          textAlign: "center",
          padding: "48px 20px",
          backgroundColor: tokens.colorNeutralBackground3,
          borderRadius: tokens.borderRadiusMedium,
        }}>
          <Lightbulb24Regular style={{ fontSize: "64px", color: tokens.colorNeutralForeground3, marginBottom: "16px" }} />
          <Text size={400} style={{ display: "block", marginBottom: "8px" }}>
            Hướng dẫn chi tiết sẽ xuất hiện ở đây
          </Text>
          <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
            Mô tả task bạn muốn thực hiện và nhấn "Tạo hướng dẫn"
          </Text>
        </div>
      )}
    </div>
  );
};

export default StepByStepGuide;

