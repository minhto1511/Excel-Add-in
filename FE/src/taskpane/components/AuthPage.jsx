/**
 * AuthPage Component - Login & Register
 *
 * Bắt buộc user phải đăng nhập để sử dụng AI features
 */

import * as React from "react";
import { useState } from "react";
import { Button, Card, Field, Input, Text, Spinner } from "@fluentui/react-components";
import {
  Person24Regular,
  Key24Regular,
  Mail24Regular,
  Checkmark24Regular,
} from "@fluentui/react-icons";

import { login, register } from "../../services/apiService";

const AuthPage = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login
        await login(email, password);
        setSuccess("Đăng nhập thành công!");
        setTimeout(() => {
          onLoginSuccess();
        }, 500);
      } else {
        // Register
        if (!name.trim()) {
          throw new Error("Vui lòng nhập tên");
        }
        await register(email, password, name);
        setSuccess("Đăng ký thành công! Đang đăng nhập...");

        // Auto login after register
        await login(email, password);
        setTimeout(() => {
          onLoginSuccess();
        }, 500);
      }
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setSuccess("");
  };

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <div className="auth-header">
          <Person24Regular className="auth-header__icon" />
          <h2 className="auth-header__title">{isLogin ? "Đăng Nhập" : "Đăng Ký"}</h2>
        </div>

        <Text className="auth-description">
          {isLogin ? "Đăng nhập để sử dụng AI Assistant" : "Tạo tài khoản mới - 10 lượt miễn phí"}
        </Text>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
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
          )}

          <Field label="Email" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              contentBefore={<Mail24Regular />}
              disabled={isLoading}
            />
          </Field>

          <Field label="Mật khẩu" required hint={!isLogin ? "Tối thiểu 8 ký tự, có chữ hoa" : ""}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              contentBefore={<Key24Regular />}
              disabled={isLoading}
            />
          </Field>

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

          <Button
            type="submit"
            appearance="primary"
            className="auth-submit-btn"
            disabled={isLoading || !email || !password}
            icon={isLoading ? <Spinner size="tiny" /> : null}
          >
            {isLoading ? "Đang xử lý..." : isLogin ? "Đăng Nhập" : "Đăng Ký"}
          </Button>
        </form>

        <div className="auth-toggle">
          <Text>{isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}</Text>
          <Button appearance="transparent" onClick={toggleMode} className="auth-toggle-btn">
            {isLogin ? "Đăng ký ngay" : "Đăng nhập"}
          </Button>
        </div>
      </Card>

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
    </div>
  );
};

export default AuthPage;
