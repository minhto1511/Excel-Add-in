/**
 * UpgradePro Component - Premium Payment Experience
 * Using FluentUI Dialog structure properly
 */

import * as React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Button,
  Text,
  Spinner,
  Tooltip,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  Radio,
  Label,
  Card,
} from "@fluentui/react-components";
import {
  Sparkle24Filled,
  CheckmarkCircle24Filled,
  Clock24Regular,
  QrCode24Regular,
  ArrowSync24Regular,
  Dismiss24Regular,
  Rocket24Regular,
  Shield24Regular,
  Copy24Regular,
  Checkmark24Regular,
  Warning24Filled,
  Star24Filled,
} from "@fluentui/react-icons";

import { getPricing, createPaymentIntent, getPaymentIntentStatus } from "../../services/apiService";

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
// MAIN COMPONENT
// ============================================================================

const UpgradePro = ({ onClose, currentPlan }) => {
  const [pricing, setPricing] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly"); // "monthly" | "yearly"
  const [selectedPlan, setSelectedPlan] = useState("pro_monthly");
  const [intent, setIntent] = useState(null);
  const [status, setStatus] = useState("idle"); // idle, loading, pending, paid, expired, error
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
      console.log("[Polling] Starting polling for intent:", intentId);

      // Clear any existing polling
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }

      let pollCount = 0;
      const maxPolls = 120; // 120 * 3s = 6 minutes max polling time
      let isStopped = false; // Flag to stop polling

      const pollOnce = async () => {
        if (isStopped) {
          console.log("[Polling] Stopped, not polling");
          return;
        }

        try {
          pollCount++;
          console.log(`[Polling ${pollCount}/${maxPolls}] Checking intent:`, intentId);

          const statusData = await getPaymentIntentStatus(intentId);
          console.log(`[Polling ${pollCount}] Status:`, statusData.status);

          if (statusData.status === "paid") {
            console.log("[Payment] ✅ Payment confirmed!");
            isStopped = true;
            pollingRef.current = null;

            // Show success UI
            setStatus("paid");

            // Write to localStorage - App will poll and detect this
            localStorage.setItem("payment_success", "true");
            localStorage.setItem("payment_timestamp", Date.now().toString());

            // Close dialog after 2 seconds
            setTimeout(() => {
              onClose?.();
            }, 2000);
            return; // Stop polling
          } else if (statusData.status === "expired") {
            console.log("[Polling] Payment expired");
            isStopped = true;
            pollingRef.current = null;
            setStatus("expired");
            return; // Stop polling
          }

          // Stop polling after max attempts
          if (pollCount >= maxPolls) {
            console.log("[Polling] Max attempts reached, stopping");
            isStopped = true;
            pollingRef.current = null;
            setError("Hết thời gian chờ. Nếu đã thanh toán, vui lòng refresh trang.");
            return;
          }

          // ✅ Schedule next poll using setTimeout (more reliable in Office WebView)
          if (!isStopped) {
            console.log("[Polling] Scheduling next poll in 3s...");
            pollingRef.current = setTimeout(pollOnce, 3000);
          }
        } catch (err) {
          console.error("[Polling] Error:", err);
          if (err.message?.includes("hết hạn") || err.message?.includes("401")) {
            isStopped = true;
            pollingRef.current = null;
            setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
            setStatus("error");
            return;
          }

          // On other errors, continue polling
          if (!isStopped) {
            console.log("[Polling] Error occurred, retrying in 3s...");
            pollingRef.current = setTimeout(pollOnce, 3000);
          }
        }
      };

      // ✅ START POLLING IMMEDIATELY
      console.log("[Polling] Starting first poll...");
      pollOnce();
    },
    [onClose]
  );

  const handleCopyCode = () => {
    navigator.clipboard.writeText(intent?.transferCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setIntent(null);
    setStatus("idle");
    setError("");
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN").format(price);
  };

  // ============== PLAN SELECTION VIEW ==============
  if (status === "idle" || status === "loading" || status === "error") {
    return (
      <>
        <DialogTitle>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Rocket24Regular style={{ color: "#10b981" }} />
            <span>Nâng cấp Pro</span>
          </div>
        </DialogTitle>

        <DialogContent>
          <Text style={{ marginBottom: "16px", display: "block" }}>
            Mở khóa sức mạnh AI không giới hạn
          </Text>

          {/* Billing Cycle Toggle */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "16px",
              background: "#f3f4f6",
              padding: "4px",
              borderRadius: "8px",
              width: "fit-content",
              margin: "0 auto 16px auto",
            }}
          >
            <button
              onClick={() => {
                setBillingCycle("monthly");
                setSelectedPlan("pro_monthly"); // Reset to pro monthly when switching
              }}
              style={{
                padding: "6px 16px",
                borderRadius: "6px",
                border: "none",
                background: billingCycle === "monthly" ? "white" : "transparent",
                boxShadow: billingCycle === "monthly" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                fontWeight: billingCycle === "monthly" ? "600" : "400",
                color: billingCycle === "monthly" ? "#111827" : "#6b7280",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Hàng tháng
            </button>
            <button
              onClick={() => {
                setBillingCycle("yearly");
                setSelectedPlan("pro_yearly"); // Reset to pro yearly when switching
              }}
              style={{
                padding: "6px 16px",
                borderRadius: "6px",
                border: "none",
                background: billingCycle === "yearly" ? "white" : "transparent",
                boxShadow: billingCycle === "yearly" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                fontWeight: billingCycle === "yearly" ? "600" : "400",
                color: billingCycle === "yearly" ? "#111827" : "#6b7280",
                cursor: "pointer",
                transition: "all 0.2s",
                position: "relative",
              }}
            >
              Hàng năm
              <span
                style={{
                  position: "absolute",
                  top: "-8px",
                  right: "-10px",
                  background: "#ef4444",
                  color: "white",
                  fontSize: "9px",
                  padding: "2px 4px",
                  borderRadius: "4px",
                  fontWeight: "bold",
                }}
              >
                -20%
              </span>
            </button>
          </div>

          <RadioGroup
            value={selectedPlan}
            onChange={(e, data) => setSelectedPlan(data.value)}
            style={{ marginBottom: "16px" }}
          >
            {/* Gói Pro */}
            <Card
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "8px",
                border:
                  selectedPlan === (billingCycle === "monthly" ? "pro_monthly" : "pro_yearly")
                    ? "2px solid #10b981"
                    : "1px solid #e5e7eb",
                background:
                  selectedPlan === (billingCycle === "monthly" ? "pro_monthly" : "pro_yearly")
                    ? "#ecfdf5"
                    : "transparent",
                cursor: "pointer",
              }}
              onClick={() =>
                setSelectedPlan(billingCycle === "monthly" ? "pro_monthly" : "pro_yearly")
              }
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Radio
                    value={billingCycle === "monthly" ? "pro_monthly" : "pro_yearly"}
                    checked={
                      selectedPlan === (billingCycle === "monthly" ? "pro_monthly" : "pro_yearly")
                    }
                  />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Text weight="semibold">
                        {billingCycle === "monthly" ? "Gói Pro (Tháng)" : "Gói Pro (Năm)"}
                      </Text>
                      <span
                        style={{
                          background: "#10b981",
                          color: "white",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: "600",
                        }}
                      >
                        PHỔ THÔNG
                      </span>
                    </div>
                    <Text size={200} style={{ color: "#6b7280" }}>
                      Thanh toán qua QR Banking
                    </Text>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Text
                    weight="bold"
                    style={{ color: "#059669", fontSize: "18px", display: "block" }}
                  >
                    {billingCycle === "monthly" ? "49.000 ₫" : "470.000 ₫"}
                  </Text>
                </div>
              </div>
            </Card>

            {/* Gói Sinh viên - Dẫn sang Fanpage */}
            <Card
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "8px",
                border: selectedPlan === "student" ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                background: selectedPlan === "student" ? "#eff6ff" : "transparent",
                cursor: "pointer",
              }}
              onClick={() => setSelectedPlan("student")}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Radio value="student" checked={selectedPlan === "student"} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Text weight="semibold">
                        {billingCycle === "monthly"
                          ? "Gói Sinh Viên (Tháng)"
                          : "Gói Sinh Viên (Năm)"}
                      </Text>
                      <span
                        style={{
                          background: "#3b82f6",
                          color: "white",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: "600",
                        }}
                      >
                        ƯU ĐÃI
                      </span>
                    </div>
                    <Text size={200} style={{ color: "#6b7280" }}>
                      Liên hệ Fanpage để mua
                    </Text>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Text
                    weight="bold"
                    style={{ color: "#3b82f6", fontSize: "18px", display: "block" }}
                  >
                    {billingCycle === "monthly" ? "39.000 ₫" : "468.000 ₫"}
                  </Text>
                </div>
              </div>
            </Card>
          </RadioGroup>

          {/* Features */}
          <div
            style={{
              background: "#f8fafc",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            <Text
              weight="semibold"
              size={200}
              style={{ display: "block", marginBottom: "8px", color: "#059669" }}
            >
              ✨ Quyền lợi Pro:
            </Text>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <Sparkle24Filled style={{ color: "#10b981", fontSize: "16px" }} />
              <Text size={200}>Không giới hạn AI prompts</Text>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <Shield24Regular style={{ color: "#10b981", fontSize: "16px" }} />
              <Text size={200}>Phân tích dữ liệu nâng cao</Text>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Star24Filled style={{ color: "#10b981", fontSize: "16px" }} />
              <Text size={200}>Hỗ trợ ưu tiên 24/7</Text>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "8px 12px",
                background: "#fee2e2",
                borderRadius: "6px",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#991b1b",
              }}
            >
              <Warning24Filled style={{ fontSize: "16px" }} />
              <Text size={200}>{error}</Text>
            </div>
          )}
        </DialogContent>

        <DialogActions>
          <Button appearance="secondary" onClick={onClose}>
            Để sau
          </Button>
          {selectedPlan === "student" ? (
            <Button
              appearance="primary"
              onClick={() => window.open("https://www.facebook.com/EOfficialTutorAI", "_blank")}
              icon={<Rocket24Regular />}
              style={{ background: "#3b82f6" }}
            >
              Liên hệ Fanpage
            </Button>
          ) : (
            <Button
              appearance="primary"
              onClick={handleCreateIntent}
              disabled={status === "loading"}
              icon={status === "loading" ? <Spinner size="tiny" /> : <QrCode24Regular />}
              style={{ background: "#10b981" }}
            >
              {status === "loading" ? "Đang tạo..." : "Thanh toán ngay"}
            </Button>
          )}
        </DialogActions>
      </>
    );
  }

  // ============== PAYMENT QR VIEW ==============
  return (
    <>
      <DialogTitle>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <QrCode24Regular style={{ color: "#10b981" }} />
          <span>Quét mã QR để thanh toán</span>
        </div>
      </DialogTitle>

      <DialogContent>
        {/* QR Code */}
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <div
            style={{
              display: "inline-block",
              padding: "12px",
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            {intent?.qrData?.qrCodeUrl ? (
              <img
                src={intent.qrData.qrCodeUrl}
                alt="QR Code"
                style={{ width: "180px", height: "180px", borderRadius: "8px" }}
              />
            ) : (
              <div
                style={{
                  width: "180px",
                  height: "180px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f3f4f6",
                  borderRadius: "8px",
                }}
              >
                <Spinner size="large" />
              </div>
            )}
          </div>
        </div>

        {/* Payment Info */}
        <div
          style={{
            background: "#f8fafc",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <Text size={200}>Số tiền:</Text>
            <Text weight="bold" style={{ color: "#059669" }}>
              {formatPrice(intent?.amount)} VND
            </Text>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Text size={200}>Nội dung CK:</Text>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Text weight="bold" style={{ fontFamily: "monospace", color: "#059669" }}>
                {intent?.transferCode}
              </Text>
              <Tooltip content={copied ? "Đã copy!" : "Copy"} relationship="label">
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

        {/* Countdown */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "8px",
            background: isExpired ? "#fee2e2" : "#fef3c7",
            borderRadius: "6px",
            marginBottom: "12px",
          }}
        >
          <Clock24Regular style={{ fontSize: "16px" }} />
          <Text size={200} weight="semibold" style={{ color: isExpired ? "#991b1b" : "#92400e" }}>
            {isExpired ? "Đã hết hạn" : `Hết hạn sau: ${countdownFormatted}`}
          </Text>
        </div>

        {/* Status Messages */}
        {status === "pending" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "8px",
              background: "#eff6ff",
              borderRadius: "6px",
              marginBottom: "12px",
            }}
          >
            <Spinner size="tiny" />
            <Text size={200} style={{ color: "#1e40af" }}>
              Đang chờ thanh toán...
            </Text>
          </div>
        )}

        {status === "paid" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "8px",
              background: "#d1fae5",
              borderRadius: "6px",
              marginBottom: "12px",
            }}
          >
            <CheckmarkCircle24Filled style={{ color: "#065f46" }} />
            <Text weight="semibold" style={{ color: "#065f46" }}>
              Thanh toán thành công!
            </Text>
          </div>
        )}

        {/* Instructions */}
        <div style={{ fontSize: "12px", color: "#6b7280" }}>
          <Text size={100} weight="semibold" style={{ display: "block", marginBottom: "4px" }}>
            Hướng dẫn:
          </Text>
          <div>1. Mở app ngân hàng, chọn Quét QR</div>
          <div>2. Kiểm tra số tiền và nội dung CK</div>
          <div>3. Xác nhận thanh toán</div>
        </div>
      </DialogContent>

      <DialogActions>
        {status === "pending" && (
          <>
            <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={handleRetry}>
              Hủy
            </Button>
            <Button
              appearance="primary"
              icon={<ArrowSync24Regular />}
              onClick={() => startPolling(intent.id)}
            >
              Tôi đã thanh toán
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
      </DialogActions>
    </>
  );
};

export default UpgradePro;
