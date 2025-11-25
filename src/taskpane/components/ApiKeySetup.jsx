import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Button, 
  Field, 
  Input,
  Card,
  Text,
  tokens,
  makeStyles
} from "@fluentui/react-components";
import { 
  Key24Regular,
  CheckmarkCircle24Regular,
  Dismiss24Regular,
  Info24Regular
} from "@fluentui/react-icons";
import { saveApiKey, clearApiKey, hasApiKey, getApiKeyMasked } from "../../services/geminiService";

const useStyles = makeStyles({
  container: {
    padding: "20px",
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: "#f9fafb",
    minHeight: "100%",
  },
  card: {
    padding: "24px",
    marginBottom: "16px",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    backgroundColor: "white",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  },
  headerIcon: {
    fontSize: "32px",
    color: "#10b981",
  },
  title: {
    fontSize: "20px",
    fontWeight: tokens.fontWeightSemibold,
    margin: "0",
    color: "#111827",
  },
  field: {
    marginBottom: "16px",
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
    marginTop: "16px",
  },
  infoBox: {
    backgroundColor: "white",
    padding: "16px",
    borderRadius: "12px",
    marginTop: "16px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  infoTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
    fontWeight: tokens.fontWeightSemibold,
  },
  infoText: {
    fontSize: "13px",
    lineHeight: "1.6",
    marginBottom: "8px",
  },
  successBox: {
    backgroundColor: "#d1fae5",
    padding: "16px",
    borderRadius: tokens.borderRadiusMedium,
    border: "2px solid #10b981",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  link: {
    color: "#10b981",
    textDecoration: "none",
    fontWeight: 600,
    "&:hover": {
      textDecoration: "underline",
    },
  },
});

const ApiKeySetup = ({ onKeySet }) => {
  const styles = useStyles();
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = () => {
    const keyExists = hasApiKey();
    setHasKey(keyExists);
    if (keyExists) {
      setMaskedKey(getApiKeyMasked());
    }
  };

  const handleSaveKey = () => {
    try {
      saveApiKey(apiKey);
      setMessage("✅ API key đã được lưu!");
      setApiKey("");
      checkApiKey();
      
      // Notify parent component
      if (onKeySet) {
        onKeySet();
      }
      
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("❌ " + error.message);
    }
  };

  const handleClearKey = () => {
    clearApiKey();
    setHasKey(false);
    setMaskedKey("");
    setMessage("API key đã được xóa");
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <Key24Regular className={styles.headerIcon} />
          <h2 className={styles.title}>Gemini API Key Setup</h2>
        </div>

        {hasKey ? (
          <div className={styles.successBox}>
            <CheckmarkCircle24Regular style={{ fontSize: "24px", color: "#10b981" }} />
            <div style={{ flex: 1 }}>
              <Text weight="semibold" style={{ display: "block", marginBottom: "4px" }}>
                API Key đã được cấu hình
              </Text>
              <Text size={200} style={{ fontFamily: "monospace" }}>
                {maskedKey}
              </Text>
            </div>
            <Button
              appearance="subtle"
              icon={<Dismiss24Regular />}
              onClick={handleClearKey}
            >
              Xóa
            </Button>
          </div>
        ) : (
          <>
            <Field 
              label="Nhập Gemini API Key của bạn"
              className={styles.field}
              hint="Key sẽ được lưu an toàn trong trình duyệt"
            >
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                contentAfter={
                  apiKey && (
                    <Dismiss24Regular 
                      onClick={() => setApiKey("")}
                      style={{ cursor: "pointer" }}
                    />
                  )
                }
              />
            </Field>

            <div className={styles.buttonGroup}>
            <Button
              appearance="primary"
              icon={<CheckmarkCircle24Regular />}
              onClick={handleSaveKey}
              disabled={!apiKey.trim()}
              style={{ 
                backgroundColor: "#10b981",
                borderColor: "#10b981",
              }}
            >
              Lưu API Key
            </Button>
            </div>
          </>
        )}

        {message && (
          <div style={{ marginTop: "16px" }}>
            <Text>{message}</Text>
          </div>
        )}
      </Card>

      <div className={styles.infoBox}>
        <div className={styles.infoTitle}>
          <Info24Regular />
          <span>Làm sao để lấy API Key?</span>
        </div>
        <Text className={styles.infoText}>
          1. Truy cập{" "}
          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.link}
          >
            Google AI Studio
          </a>
        </Text>
        <Text className={styles.infoText}>
          2. Đăng nhập bằng tài khoản Google
        </Text>
        <Text className={styles.infoText}>
          3. Click "Create API Key" hoặc "Get API Key"
        </Text>
        <Text className={styles.infoText}>
          4. Copy key và paste vào ô bên trên
        </Text>
        <Text className={styles.infoText} style={{ marginTop: "12px", fontWeight: 600 }}>
          💡 API key miễn phí với 15 requests/phút
        </Text>
      </div>
    </div>
  );
};

export default ApiKeySetup;

