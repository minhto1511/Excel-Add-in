/**
 * AuthPage Component - Login, Register with OTP, Forgot Password
 *
 * Features:
 * - Realtime validation (email, password strength, confirm password)
 * - OTP verification modal
 * - Forgot password flow with OTP
 * - Cooldown timer for resend OTP
 */

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Card,
  Field,
  Input,
  Text,
  Spinner,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  ProgressBar,
} from "@fluentui/react-components";
import {
  Person24Regular,
  Key24Regular,
  Mail24Regular,
  Checkmark24Regular,
  ArrowLeft24Regular,
  LockClosed24Regular,
  Eye24Regular,
  EyeOff24Regular,
} from "@fluentui/react-icons";

import {
  login,
  register,
  verifyEmailOTP,
  resendOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} from "../../services/apiService";

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return { valid: false, message: "" };
  if (!regex.test(email)) return { valid: false, message: "Email không hợp lệ" };
  return { valid: true, message: "" };
};

const validatePassword = (password) => {
  if (!password) return { valid: false, message: "", strength: 0 };

  let strength = 0;
  const messages = [];

  if (password.length >= 8) strength += 25;
  else messages.push("Tối thiểu 8 ký tự");

  if (/[A-Z]/.test(password)) strength += 25;
  else messages.push("1 chữ hoa");

  if (/[0-9]/.test(password)) strength += 25;
  else messages.push("1 số");

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 25;

  return {
    valid: strength >= 75,
    message: messages.length > 0 ? `Cần: ${messages.join(", ")}` : "",
    strength,
  };
};

const validateOTP = (otp) => {
  if (!otp) return { valid: false, message: "" };
  if (!/^\d{6}$/.test(otp)) return { valid: false, message: "OTP phải gồm 6 chữ số" };
  return { valid: true, message: "" };
};

// ============================================================================
// OTP INPUT COMPONENT
// ============================================================================

const OTPInput = ({ value, onChange, disabled }) => {
  const inputRefs = React.useRef([]);

  const handleChange = (index, e) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;

    const newOTP = value.split("");
    newOTP[index] = val.slice(-1);
    const result = newOTP.join("");
    onChange(result);

    // Auto focus next input
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      onChange(pastedData.padEnd(6, ""));
    }
  };

  return (
    <div className="otp-input-container">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ""}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="otp-input"
          autoFocus={index === 0}
        />
      ))}
    </div>
  );
};

// ============================================================================
// COUNTDOWN TIMER HOOK
// ============================================================================

const useCountdown = (initialSeconds = 0) => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) return;

    const timer = setInterval(() => {
      setSeconds((s) => s - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds]);

  const start = useCallback((s) => setSeconds(s), []);
  const reset = useCallback(() => setSeconds(0), []);

  return { seconds, start, reset, isActive: seconds > 0 };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AuthPage = ({ onLoginSuccess }) => {
  // View state: "login" | "register" | "forgot" | "reset"
  const [view, setView] = useState("login");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP dialog
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpPurpose, setOtpPurpose] = useState("signup"); // "signup" | "reset"
  const [resetToken, setResetToken] = useState("");

  // New password (for reset)
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Validation states (realtime)
  const [emailValidation, setEmailValidation] = useState({ valid: true, message: "" });
  const [passwordValidation, setPasswordValidation] = useState({
    valid: true,
    message: "",
    strength: 0,
  });
  const [confirmPasswordMatch, setConfirmPasswordMatch] = useState(true);

  // Countdown for resend OTP
  const { seconds: cooldown, start: startCooldown, isActive: cooldownActive } = useCountdown();

  // Real-time validation effects
  useEffect(() => {
    if (email) setEmailValidation(validateEmail(email));
  }, [email]);

  useEffect(() => {
    if (password) setPasswordValidation(validatePassword(password));
  }, [password]);

  useEffect(() => {
    if (confirmPassword) setConfirmPasswordMatch(password === confirmPassword);
  }, [password, confirmPassword]);

  // Clear states when changing view
  useEffect(() => {
    setError("");
    setSuccess("");
    setOtp("");
  }, [view]);

  // ============== HANDLERS ==============

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await login(email, password);

      // Check if needs email verification
      if (result.needsVerification) {
        setOtpPurpose("signup");
        setShowOTPDialog(true);
        startCooldown(60);
        setIsLoading(false);
        return;
      }

      setSuccess("Đăng nhập thành công!");
      setTimeout(() => onLoginSuccess(), 500);
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!emailValidation.valid) {
      setError("Email không hợp lệ");
      return;
    }
    if (!passwordValidation.valid) {
      setError("Mật khẩu chưa đủ mạnh");
      return;
    }
    if (!confirmPasswordMatch) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, confirmPassword, name);
      setOtpPurpose("signup");
      setShowOTPDialog(true);
      startCooldown(60);
      setSuccess("Đã gửi mã OTP đến email của bạn!");
    } catch (err) {
      setError(err.message || "Đăng ký thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!emailValidation.valid) {
      setError("Email không hợp lệ");
      return;
    }

    setIsLoading(true);

    try {
      await forgotPassword(email);
      setOtpPurpose("reset");
      setShowOTPDialog(true);
      startCooldown(60);
      setSuccess("Đã gửi mã OTP đến email của bạn!");
    } catch (err) {
      setError(err.message || "Không thể gửi OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError("");

    const otpValidation = validateOTP(otp);
    if (!otpValidation.valid) {
      setError(otpValidation.message);
      return;
    }

    setIsLoading(true);

    try {
      if (otpPurpose === "signup") {
        await verifyEmailOTP(email, otp);
        setSuccess("Xác thực thành công!");
        setShowOTPDialog(false);
        setTimeout(() => onLoginSuccess(), 500);
      } else {
        // Reset password flow
        const result = await verifyResetOTP(email, otp);
        setResetToken(result.resetToken);
        setShowOTPDialog(false);
        setView("reset");
      }
    } catch (err) {
      setError(err.message || "OTP không hợp lệ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (cooldownActive) return;

    setError("");
    setIsLoading(true);

    try {
      const result = await resendOTP(email, otpPurpose === "signup" ? "signup" : "reset_password");
      startCooldown(result.cooldownRemaining || 60);
      setSuccess("Đã gửi lại mã OTP!");
    } catch (err) {
      setError(err.message || "Không thể gửi lại OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    const newPwdValidation = validatePassword(newPassword);
    if (!newPwdValidation.valid) {
      setError("Mật khẩu mới chưa đủ mạnh");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(resetToken, newPassword, confirmNewPassword);
      setSuccess("Đặt lại mật khẩu thành công!");
      setTimeout(() => setView("login"), 1500);
    } catch (err) {
      setError(err.message || "Không thể đặt lại mật khẩu");
    } finally {
      setIsLoading(false);
    }
  };

  // ============== RENDER ==============

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="auth-form">
      <Field
        label="Email"
        required
        validationState={email && !emailValidation.valid ? "error" : "none"}
        validationMessage={emailValidation.message}
      >
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          contentBefore={<Mail24Regular />}
          disabled={isLoading}
        />
      </Field>

      <Field label="Mật khẩu" required>
        <Input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          contentBefore={<Key24Regular />}
          contentAfter={
            <Button
              appearance="transparent"
              icon={showPassword ? <EyeOff24Regular /> : <Eye24Regular />}
              onClick={() => setShowPassword(!showPassword)}
              size="small"
            />
          }
          disabled={isLoading}
        />
      </Field>

      <Button
        type="submit"
        appearance="primary"
        className="auth-submit-btn"
        disabled={isLoading || !email || !password}
        icon={isLoading ? <Spinner size="tiny" /> : null}
      >
        {isLoading ? "Đang đăng nhập..." : "Đăng Nhập"}
      </Button>

      <Button
        appearance="transparent"
        onClick={() => setView("forgot")}
        className="auth-forgot-btn"
      >
        Quên mật khẩu?
      </Button>
    </form>
  );

  const renderRegisterForm = () => (
    <form onSubmit={handleRegister} className="auth-form">
      <Field label="Họ và Tên" required>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nguyễn Văn A"
          contentBefore={<Person24Regular />}
          disabled={isLoading}
        />
      </Field>

      <Field
        label="Email"
        required
        validationState={email && !emailValidation.valid ? "error" : "none"}
        validationMessage={emailValidation.message}
      >
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          contentBefore={<Mail24Regular />}
          disabled={isLoading}
        />
      </Field>

      <Field
        label="Mật khẩu"
        required
        validationState={password && !passwordValidation.valid ? "warning" : "none"}
        validationMessage={passwordValidation.message}
      >
        <Input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          contentBefore={<Key24Regular />}
          contentAfter={
            <Button
              appearance="transparent"
              icon={showPassword ? <EyeOff24Regular /> : <Eye24Regular />}
              onClick={() => setShowPassword(!showPassword)}
              size="small"
            />
          }
          disabled={isLoading}
        />
      </Field>

      {password && (
        <div className="password-strength">
          <ProgressBar
            value={passwordValidation.strength / 100}
            color={passwordValidation.strength >= 75 ? "success" : "warning"}
          />
          <Text size={100}>
            {passwordValidation.strength >= 75 ? "Mật khẩu mạnh" : "Mật khẩu yếu"}
          </Text>
        </div>
      )}

      <Field
        label="Xác nhận mật khẩu"
        required
        validationState={confirmPassword && !confirmPasswordMatch ? "error" : "none"}
        validationMessage={confirmPassword && !confirmPasswordMatch ? "Mật khẩu không khớp" : ""}
      >
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          contentBefore={<LockClosed24Regular />}
          disabled={isLoading}
        />
      </Field>

      <Button
        type="submit"
        appearance="primary"
        className="auth-submit-btn"
        disabled={isLoading || !email || !password || !confirmPassword || !name}
        icon={isLoading ? <Spinner size="tiny" /> : null}
      >
        {isLoading ? "Đang đăng ký..." : "Đăng Ký"}
      </Button>
    </form>
  );

  const renderForgotForm = () => (
    <form onSubmit={handleForgotPassword} className="auth-form">
      <Text className="auth-description">Nhập email để nhận mã OTP đặt lại mật khẩu</Text>

      <Field
        label="Email"
        required
        validationState={email && !emailValidation.valid ? "error" : "none"}
        validationMessage={emailValidation.message}
      >
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          contentBefore={<Mail24Regular />}
          disabled={isLoading}
        />
      </Field>

      <Button
        type="submit"
        appearance="primary"
        className="auth-submit-btn"
        disabled={isLoading || !email || !emailValidation.valid}
        icon={isLoading ? <Spinner size="tiny" /> : null}
      >
        {isLoading ? "Đang gửi..." : "Gửi mã OTP"}
      </Button>

      <Button
        appearance="transparent"
        icon={<ArrowLeft24Regular />}
        onClick={() => setView("login")}
        className="auth-back-btn"
      >
        Quay lại đăng nhập
      </Button>
    </form>
  );

  const renderResetForm = () => (
    <form onSubmit={handleResetPassword} className="auth-form">
      <Text className="auth-description">Đặt mật khẩu mới cho tài khoản của bạn</Text>

      <Field
        label="Mật khẩu mới"
        required
        validationState={newPassword && !validatePassword(newPassword).valid ? "warning" : "none"}
        validationMessage={validatePassword(newPassword).message}
      >
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="••••••••"
          contentBefore={<Key24Regular />}
          disabled={isLoading}
        />
      </Field>

      <Field
        label="Xác nhận mật khẩu mới"
        required
        validationState={
          confirmNewPassword && newPassword !== confirmNewPassword ? "error" : "none"
        }
        validationMessage={
          confirmNewPassword && newPassword !== confirmNewPassword ? "Mật khẩu không khớp" : ""
        }
      >
        <Input
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          placeholder="••••••••"
          contentBefore={<LockClosed24Regular />}
          disabled={isLoading}
        />
      </Field>

      <Button
        type="submit"
        appearance="primary"
        className="auth-submit-btn"
        disabled={isLoading || !newPassword || !confirmNewPassword}
        icon={isLoading ? <Spinner size="tiny" /> : null}
      >
        {isLoading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
      </Button>
    </form>
  );

  const getTitle = () => {
    switch (view) {
      case "register":
        return "Đăng Ký";
      case "forgot":
        return "Quên Mật Khẩu";
      case "reset":
        return "Đặt Lại Mật Khẩu";
      default:
        return "Đăng Nhập";
    }
  };

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <div className="auth-header">
          <Person24Regular className="auth-header__icon" />
          <h2 className="auth-header__title">{getTitle()}</h2>
        </div>

        {view === "login" && (
          <Text className="auth-description">Đăng nhập để sử dụng AI Assistant</Text>
        )}
        {view === "register" && (
          <Text className="auth-description">Tạo tài khoản mới - 10 lượt miễn phí</Text>
        )}

        {error && (
          <div className="auth-error">
            <Text>{error}</Text>
          </div>
        )}

        {success && (
          <div className="auth-success">
            <Checkmark24Regular />
            <Text>{success}</Text>
          </div>
        )}

        {view === "login" && renderLoginForm()}
        {view === "register" && renderRegisterForm()}
        {view === "forgot" && renderForgotForm()}
        {view === "reset" && renderResetForm()}

        {(view === "login" || view === "register") && (
          <div className="auth-toggle">
            <Text>{view === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}</Text>
            <Button
              appearance="transparent"
              onClick={() => setView(view === "login" ? "register" : "login")}
              className="auth-toggle-btn"
            >
              {view === "login" ? "Đăng ký ngay" : "Đăng nhập"}
            </Button>
          </div>
        )}
      </Card>

      {view === "login" && (
        <div className="auth-info">
          <Text weight="semibold" className="auth-info__title">
            🎁 Quyền lợi tài khoản miễn phí:
          </Text>
          <ul className="auth-info__list">
            <li>✓ 10 lượt sử dụng AI miễn phí</li>
            <li>✓ Tạo công thức Excel tự động</li>
            <li>✓ Phân tích dữ liệu thông minh</li>
            <li>✓ Hướng dẫn từng bước chi tiết</li>
          </ul>
        </div>
      )}

      {/* OTP Dialog */}
      <Dialog
        open={showOTPDialog}
        onOpenChange={(e, data) => !isLoading && setShowOTPDialog(data.open)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{otpPurpose === "signup" ? "Xác thực Email" : "Nhập mã OTP"}</DialogTitle>
            <DialogContent>
              <div className="otp-dialog-content">
                <Text>Mã OTP đã được gửi đến</Text>
                <Text weight="semibold">{email}</Text>

                <OTPInput value={otp} onChange={setOtp} disabled={isLoading} />

                {error && <Text className="otp-error">{error}</Text>}

                <div className="otp-resend">
                  {cooldownActive ? (
                    <Text size={200}>Gửi lại mã sau {cooldown}s</Text>
                  ) : (
                    <Button appearance="transparent" onClick={handleResendOTP} disabled={isLoading}>
                      Gửi lại mã OTP
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setShowOTPDialog(false)}
                disabled={isLoading}
              >
                Hủy
              </Button>
              <Button
                appearance="primary"
                onClick={handleVerifyOTP}
                disabled={isLoading || otp.length !== 6}
                icon={isLoading ? <Spinner size="tiny" /> : null}
              >
                {isLoading ? "Đang xác thực..." : "Xác nhận"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default AuthPage;
