/**
 * StepByStepGuide Component - AI Step-by-Step Guide
 *
 * REFACTORED:
 * - Loại bỏ makeStyles, inline styles → CSS classes
 * - Sử dụng apiService
 * - Frontend CHỈ handle UI state + navigation
 */

import * as React from "react";
import { useState } from "react";
import { Button, Card, Field, Textarea, Spinner, Text } from "@fluentui/react-components";
import {
  Sparkle24Regular,
  Lightbulb24Regular,
  Warning24Regular,
  CheckmarkCircle24Regular,
  ChevronRight24Regular,
  ChevronLeft24Regular,
} from "@fluentui/react-icons";

// API Service
import { generateStepByStep, cancelAIRequest } from "../../services/apiService";

const StepByStepGuide = ({ disabled = false, onRequestComplete }) => {
  const [task, setTask] = useState("");
  const [taskName, setTaskName] = useState("");
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentAbortController, setCurrentAbortController] = useState(null);

  const exampleTasks = [
    "Tạo biểu đồ cột từ dữ liệu",
    "Sử dụng VLOOKUP",
    "Tạo Pivot Table",
    "Conditional Formatting",
  ];

  /**
   * Generate step-by-step guide - gọi Backend API
   * TODO BACKEND: POST /api/guide/generate
   */
  const handleGenerate = async () => {
    if (!task.trim()) return;

    if (disabled) {
      setError("Bạn đã hết lượt sử dụng!");
      return;
    }

    setIsLoading(true);
    setError("");
    setSteps([]);
    setCurrentStep(0);

    try {
      // Gọi API qua apiService (auto handles auth, base URL, etc.)
      const result = await generateStepByStep(task);
      setTaskName(result.taskName);
      setSteps(result.steps);

      // Notify parent to refresh credits
      if (onRequestComplete) {
        onRequestComplete();
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setError("Đã hủy hướng dẫn");
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
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">
          <Lightbulb24Regular /> Hướng Dẫn Step by Step
        </h2>
        <p className="page-subtitle">
          Mô tả task bạn muốn thực hiện, AI sẽ hướng dẫn từng bước chi tiết
        </p>
      </div>

      <Card className="card">
        <Field label="Mô tả task của bạn">
          <Textarea
            placeholder="VD: Tôi muốn tạo một biểu đồ cột để hiển thị doanh thu theo tháng..."
            rows={4}
            value={task}
            onChange={(e) => setTask(e.target.value)}
          />
        </Field>

        {!isLoading ? (
          <Button
            appearance="primary"
            icon={<Sparkle24Regular />}
            onClick={handleGenerate}
            disabled={!task.trim()}
            className="btn-primary w-100 mt-16"
          >
            Tạo hướng dẫn
          </Button>
        ) : (
          <Button appearance="secondary" onClick={handleCancel} className="w-100 mt-16">
            <Spinner size="tiny" style={{ marginRight: "8px" }} />
            Đang tạo hướng dẫn... (Nhấn để hủy)
          </Button>
        )}

        <div className="mt-16">
          <Text size={200} className="d-block mb-8">
            Ví dụ nhanh:
          </Text>
          <div className="example-chips">
            {exampleTasks.map((ex, idx) => (
              <div key={idx} className="chip" onClick={() => handleExampleClick(ex)}>
                {ex}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && <div className="alert alert--error">{error}</div>}

      {/* Steps Display */}
      {steps.length > 0 && currentStep < steps.length && (
        <>
          {/* Progress Bar */}
          <div className="progress-container mb-16">
            <div className="progress-header">
              <Text weight="semibold">
                Bước {currentStep + 1} / {steps.length}
              </Text>
              <Text>{Math.round(progress)}%</Text>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Current Step */}
          <Card className="stepper-card">
            <div className="step-header">
              <div className="step-number">{currentStep + 1}</div>
              <div className="step-header__content">
                <h3 className="step-title">{steps[currentStep].title}</h3>
                <p className="step-description">{steps[currentStep].description}</p>
              </div>
            </div>

            {/* Details */}
            <div className="mb-16">
              <Text weight="semibold" className="d-block mb-12">
                Chi tiết thực hiện:
              </Text>
              <ul className="details-list">
                {steps[currentStep].details.map((detail, idx) => (
                  <li key={idx} className="detail-item">
                    <span className="detail-bullet">▸</span>
                    <Text size={300}>{detail}</Text>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tips */}
            {steps[currentStep].tips && (
              <div className="tips-box">
                <div className="tips-box__header">
                  <Lightbulb24Regular style={{ color: "#3b82f6" }} className="flex-shrink-0" />
                  <div>
                    <span className="tips-box__title">💡 Mẹo hữu ích:</span>
                    <Text size={300} className="tips-box__content">
                      {steps[currentStep].tips}
                    </Text>
                  </div>
                </div>
              </div>
            )}

            {/* Warning */}
            {steps[currentStep].warning && (
              <div className="warning-box">
                <div className="warning-box__header">
                  <Warning24Regular style={{ color: "#d97706" }} className="flex-shrink-0" />
                  <div>
                    <span className="warning-box__title">⚠️ Lưu ý:</span>
                    <Text size={300} className="warning-box__content">
                      {steps[currentStep].warning}
                    </Text>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="step-navigation">
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
                className="btn-primary"
              >
                {currentStep === steps.length - 1 ? "Hoàn thành" : "Bước tiếp theo"}
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Completion */}
      {steps.length > 0 && currentStep === steps.length && (
        <div className="completion-card">
          <CheckmarkCircle24Regular className="completion-card__icon" />
          <Text size={500} weight="semibold" className="completion-card__title">
            Hoàn thành! 🎉
          </Text>
          <Text className="completion-card__text">
            Bạn đã hoàn thành tất cả {steps.length} bước. Hy vọng hướng dẫn này hữu ích!
          </Text>
          <Button appearance="primary" onClick={handleReset} className="btn-primary">
            Xem lại từ đầu
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!steps.length && !isLoading && !error && (
        <div className="empty-state">
          <Lightbulb24Regular className="empty-state__icon" />
          <Text size={400} className="d-block mb-8">
            Hướng dẫn chi tiết sẽ xuất hiện ở đây
          </Text>
        </div>
      )}
    </div>
  );
};

export default StepByStepGuide;
