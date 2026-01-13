/**
 * UpgradePro Component - Premium Payment Experience
 *
 * Features:
 * - Beautiful gradient cards for pricing
 * - VietQR payment with real-time polling
 * - Countdown timer with visual progress
 * - Smooth animations and transitions
 */

import * as React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Button,
  Card,
  Text,
  Spinner,
  Badge,
  Divider,
  CounterBadge,
  Tooltip,
} from "@fluentui/react-components";
import {
  Sparkle24Filled,
  CheckmarkCircle24Filled,
  Clock24Regular,
  QrCode24Regular,
  ArrowSync24Regular,
  Dismiss24Regular,
  Star24Filled,
  Rocket24Filled,
  Shield24Filled,
  HeartPulse24Filled,
  Copy24Regular,
  Checkmark24Regular,
  Warning24Filled,
} from "@fluentui/react-icons";

import { getPricing, createPaymentIntent, getPaymentIntentStatus } from "../../services/apiService";

// ============================================================================
// STYLES (Inline for better FluentUI integration)
// ============================================================================

const styles = {
  container: {
    padding: "0",
    background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
    minHeight: "100%",
  },
  header: {
    textAlign: "center",
    padding: "24px 20px 16px",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "white",
    borderRadius: "0 0 24px 24px",
  },
  headerIcon: {
    fontSize: "48px",
    marginBottom: "8px",
  },
  headerTitle: {
    fontSize: "24px",
    fontWeight: "700",
    margin: "0 0 4px 0",
  },
  headerSubtitle: {
    opacity: 0.9,
    fontSize: "14px",
  },
  content: {
    padding: "20px",
    marginTop: "-12px",
  },
  planCard: {
    padding: "16px",
    marginBottom: "12px",
    borderRadius: "16px",
    border: "2px solid transparent",
    cursor: "pointer",
    transition: "all 0.3s ease",
    position: "relative",
    overflow: "hidden",
  },
  planCardSelected: {
    borderColor: "#10b981",
    background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
    boxShadow: "0 8px 24px rgba(16, 185, 129, 0.2)",
  },
  planCardPopular: {
    background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
  },
  planHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  planName: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1f2937",
  },
  planPrice: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#059669",
    lineHeight: 1,
  },
  planPeriod: {
    fontSize: "13px",
    color: "#6b7280",
  },
  badge: {
    position: "absolute",
    top: "-2px",
    right: "-2px",
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "white",
    padding: "4px 12px",
    borderRadius: "0 14px 0 14px",
    fontSize: "11px",
    fontWeight: "600",
  },
  featureList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "16px",
    background: "white",
    borderRadius: "12px",
    marginBottom: "16px",
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
  },
  qrContainer: {
    textAlign: "center",
    padding: "20px",
  },
  qrWrapper: {
    display: "inline-block",
    padding: "16px",
    background: "white",
    borderRadius: "20px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
    marginBottom: "16px",
  },
  qrImage: {
    width: "180px",
    height: "180px",
    borderRadius: "12px",
  },
  paymentInfo: {
    background: "white",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "16px",
  },
  paymentRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  transferCode: {
    fontFamily: "monospace",
    fontSize: "18px",
    fontWeight: "700",
    color: "#059669",
    letterSpacing: "1px",
  },
  countdown: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 20px",
    background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
    borderRadius: "12px",
    marginBottom: "16px",
    fontWeight: "600",
    color: "#92400e",
  },
  countdownExpired: {
    background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
    color: "#991b1b",
  },
  statusPending: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 20px",
    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
    borderRadius: "12px",
    marginBottom: "16px",
    color: "#1e40af",
  },
  statusSuccess: {
    background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
    color: "#065f46",
    fontSize: "18px",
    fontWeight: "600",
  },
  actions: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    marginBottom: "16px",
  },
  instructions: {
    background: "white",
    borderRadius: "12px",
    padding: "16px",
  },
  instructionStep: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "8px 0",
  },
  stepNumber: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    background: "#10b981",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "600",
    flexShrink: 0,
  },
};

// ============================================================================
// COUNTDOWN HOOK
// ============================================================================

const useCountdown = (targetTime) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!targetTime) return;

    const calculateRemaining = () => {
      const diff = new Date(targetTime).getTime() - Date.now();
      return Math.max(0, Math.floor(diff / 1000));
    };

    setRemaining(calculateRemaining());

    const timer = setInterval(() => {
      const r = calculateRemaining();
      setRemaining(r);
      if (r <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return {
    remaining,
    formatted: `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
    isExpired: remaining <= 0,
  };
};

// ============================================================================
// PLAN CARD COMPONENT
// ============================================================================

const PlanCard = ({ plan, info, isSelected, isPopular, onClick }) => (
  <div
    style={{
      ...styles.planCard,
      ...(isSelected ? styles.planCardSelected : {}),
      ...(isPopular && !isSelected ? styles.planCardPopular : {}),
    }}
    onClick={onClick}
  >
    {isPopular && <div style={styles.badge}>⭐ PHỔ BIẾN</div>}
    <div style={styles.planHeader}>
      <div>
        <div style={styles.planName}>{info.name}</div>
        {info.period && <div style={styles.planPeriod}>{info.period}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {isSelected && <CheckmarkCircle24Filled style={{ color: "#10b981" }} />}
      </div>
    </div>
    <div style={styles.planPrice}>
      {new Intl.NumberFormat("vi-VN").format(info.price)}
      <span style={{ fontSize: "14px", fontWeight: "400", color: "#6b7280" }}> VND</span>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UpgradePro = ({ onClose, onUpgradeSuccess, currentPlan }) => {
  const [pricing, setPricing] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("pro_monthly");
  const [intent, setIntent] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const pollingRef = useRef(null);
  const { formatted: countdownFormatted, isExpired } = useCountdown(intent?.expiresAt);

  useEffect(() => {
    loadPricing();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    if (isExpired && status === "pending") {
      setStatus("expired");
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
  }, [isExpired, status]);

  const loadPricing = async () => {
    try {
      const data = await getPricing();
      setPricing(data.pricing);
    } catch (err) {
      setError("Không thể tải thông tin giá");
    }
  };

  const handleCreateIntent = async () => {
    setError("");
    setStatus("loading");

    try {
      const data = await createPaymentIntent(selectedPlan);
      setIntent(data.intent);
      setStatus("pending");
      startPolling(data.intent.id);
    } catch (err) {
      setError(err.message || "Không thể tạo yêu cầu thanh toán");
      setStatus("error");
    }
  };

  const startPolling = useCallback(
    (intentId) => {
      if (pollingRef.current) clearInterval(pollingRef.current);

      pollingRef.current = setInterval(async () => {
        try {
          const statusData = await getPaymentIntentStatus(intentId);
          if (statusData.status === "paid") {
            clearInterval(pollingRef.current);
            setStatus("paid");
            setTimeout(() => onUpgradeSuccess?.(), 2000);
          } else if (statusData.status === "expired") {
            clearInterval(pollingRef.current);
            setStatus("expired");
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 5000);
    },
    [onUpgradeSuccess]
  );

  const handleCopyCode = () => {
    navigator.clipboard.writeText(intent?.transferCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = () => {
    setIntent(null);
    setStatus("idle");
    setError("");
  };

  // ============== RENDER PLAN SELECTION ==============
  const renderPlanSelection = () => (
    <div style={styles.container}>
      <div style={styles.header}>
        <Rocket24Filled style={styles.headerIcon} />
        <h2 style={styles.headerTitle}>Nâng cấp Pro</h2>
        <p style={styles.headerSubtitle}>Mở khóa sức mạnh AI không giới hạn</p>
      </div>

      <div style={styles.content}>
        {pricing && (
          <>
            <PlanCard
              plan="pro_yearly"
              info={{ name: "Pro Năm", price: pricing.pro_yearly?.price, period: "Tiết kiệm 17%" }}
              isSelected={selectedPlan === "pro_yearly"}
              isPopular={true}
              onClick={() => setSelectedPlan("pro_yearly")}
            />
            <PlanCard
              plan="pro_monthly"
              info={{
                name: "Pro Tháng",
                price: pricing.pro_monthly?.price,
                period: "Thanh toán hàng tháng",
              }}
              isSelected={selectedPlan === "pro_monthly"}
              onClick={() => setSelectedPlan("pro_monthly")}
            />

            <Divider style={{ margin: "16px 0" }}>hoặc mua credits</Divider>

            <div style={{ display: "flex", gap: "12px" }}>
              <div
                style={{
                  ...styles.planCard,
                  flex: 1,
                  padding: "12px",
                  ...(selectedPlan === "credits_50" ? styles.planCardSelected : {}),
                }}
                onClick={() => setSelectedPlan("credits_50")}
              >
                <div style={{ fontWeight: "600", marginBottom: "4px" }}>50 Credits</div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#059669" }}>
                  {new Intl.NumberFormat("vi-VN").format(pricing.credits_50?.price)} đ
                </div>
              </div>
              <div
                style={{
                  ...styles.planCard,
                  flex: 1,
                  padding: "12px",
                  ...(selectedPlan === "credits_100" ? styles.planCardSelected : {}),
                }}
                onClick={() => setSelectedPlan("credits_100")}
              >
                <div style={{ fontWeight: "600", marginBottom: "4px" }}>100 Credits</div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#059669" }}>
                  {new Intl.NumberFormat("vi-VN").format(pricing.credits_100?.price)} đ
                </div>
              </div>
            </div>
          </>
        )}

        <div style={styles.featureList}>
          <Text weight="semibold" style={{ marginBottom: "8px", color: "#059669" }}>
            ✨ Quyền lợi Pro:
          </Text>
          <div style={styles.featureItem}>
            <Sparkle24Filled style={{ color: "#10b981" }} />
            <span>Không giới hạn AI prompts</span>
          </div>
          <div style={styles.featureItem}>
            <Shield24Filled style={{ color: "#10b981" }} />
            <span>Phân tích dữ liệu nâng cao</span>
          </div>
          <div style={styles.featureItem}>
            <HeartPulse24Filled style={{ color: "#10b981" }} />
            <span>Hỗ trợ ưu tiên 24/7</span>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "12px",
              background: "#fee2e2",
              borderRadius: "8px",
              marginBottom: "16px",
              color: "#991b1b",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Warning24Filled />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          <Button appearance="secondary" onClick={onClose} style={{ flex: 1 }}>
            Để sau
          </Button>
          <Button
            appearance="primary"
            onClick={handleCreateIntent}
            disabled={status === "loading"}
            icon={status === "loading" ? <Spinner size="tiny" /> : <QrCode24Regular />}
            style={{ flex: 2, background: "#10b981" }}
          >
            {status === "loading" ? "Đang tạo..." : "Thanh toán ngay"}
          </Button>
        </div>
      </div>
    </div>
  );

  // ============== RENDER QR PAYMENT ==============
  const renderPaymentQR = () => (
    <div style={styles.container}>
      <div style={{ ...styles.header, borderRadius: "0" }}>
        <QrCode24Regular style={{ fontSize: "40px" }} />
        <h2 style={styles.headerTitle}>Quét mã QR</h2>
        <p style={styles.headerSubtitle}>Mở app ngân hàng để thanh toán</p>
      </div>

      <div style={styles.qrContainer}>
        <div style={styles.qrWrapper}>
          {intent?.qrData?.qrCodeUrl ? (
            <img src={intent.qrData.qrCodeUrl} alt="QR Code" style={styles.qrImage} />
          ) : (
            <div
              style={{
                ...styles.qrImage,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f3f4f6",
              }}
            >
              <Spinner size="large" />
            </div>
          )}
        </div>

        <div style={styles.paymentInfo}>
          <div style={styles.paymentRow}>
            <Text>Số tiền:</Text>
            <Text weight="bold" style={{ fontSize: "18px", color: "#059669" }}>
              {new Intl.NumberFormat("vi-VN").format(intent?.amount)} VND
            </Text>
          </div>
          <div style={{ ...styles.paymentRow, borderBottom: "none" }}>
            <Text>Nội dung CK:</Text>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={styles.transferCode}>{intent?.transferCode}</span>
              <Tooltip content={copied ? "Đã copy!" : "Copy mã"} relationship="label">
                <Button
                  appearance="subtle"
                  size="small"
                  icon={copied ? <Checkmark24Regular /> : <Copy24Regular />}
                  onClick={handleCopyCode}
                />
              </Tooltip>
            </div>
          </div>
        </div>

        <div style={{ ...styles.countdown, ...(isExpired ? styles.countdownExpired : {}) }}>
          <Clock24Regular />
          <span>{isExpired ? "Đã hết hạn" : `Hết hạn sau: ${countdownFormatted}`}</span>
        </div>

        {status === "pending" && (
          <div style={styles.statusPending}>
            <Spinner size="small" />
            <span>Đang chờ thanh toán...</span>
          </div>
        )}

        {status === "paid" && (
          <div style={{ ...styles.statusPending, ...styles.statusSuccess }}>
            <CheckmarkCircle24Filled />
            <span>Thanh toán thành công!</span>
          </div>
        )}

        <div style={styles.actions}>
          {status === "pending" && (
            <>
              <Button
                appearance="primary"
                icon={<ArrowSync24Regular />}
                onClick={() => startPolling(intent.id)}
              >
                Tôi đã thanh toán
              </Button>
              <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={handleRetry}>
                Hủy
              </Button>
            </>
          )}
          {(status === "expired" || status === "error") && (
            <Button appearance="primary" onClick={handleRetry}>
              Thử lại
            </Button>
          )}
          {status === "paid" && (
            <Button appearance="primary" onClick={onClose}>
              Hoàn tất
            </Button>
          )}
        </div>

        <div style={styles.instructions}>
          <Text weight="semibold" style={{ marginBottom: "12px", display: "block" }}>
            Hướng dẫn:
          </Text>
          {[
            "Mở app ngân hàng, chọn Quét QR",
            "Kiểm tra số tiền và nội dung CK",
            "Xác nhận thanh toán",
            "Hệ thống tự động cập nhật sau 30s",
          ].map((step, idx) => (
            <div key={idx} style={styles.instructionStep}>
              <div style={styles.stepNumber}>{idx + 1}</div>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {(status === "idle" || status === "loading" || status === "error") && renderPlanSelection()}
      {(status === "pending" || status === "paid" || status === "expired") && renderPaymentQR()}
    </div>
  );
};

export default UpgradePro;
