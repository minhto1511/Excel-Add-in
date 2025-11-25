import * as React from "react";
import { useState } from "react";
import PropTypes from "prop-types";
import { makeStyles, tokens, Tab, TabList } from "@fluentui/react-components";
import { 
  Sparkle24Regular, 
  Lightbulb24Regular,
  Key24Regular,
  DataUsage24Regular
} from "@fluentui/react-icons";
import Logo from "./Logo";
import FormulaGenerator from "./FormulaGenerator";
import StepByStepGuide from "./StepByStepGuide";
import DataAnalyzer from "./DataAnalyzer";
import ApiKeySetup from "./ApiKeySetup";
import { hasApiKey } from "../../services/geminiService";

const useStyles = makeStyles({
  root: {
    minHeight: "100vh",
    background: "#f9fafb",
    padding: "0",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    background: `linear-gradient(135deg, #10b981 0%, #059669 100%)`,
    padding: "20px",
    color: "white",
    boxShadow: tokens.shadow8,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  headerTitle: {
    margin: "0",
    fontSize: "22px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    letterSpacing: "-0.3px",
  },
  headerSubtitle: {
    margin: "8px 0 0 0",
    fontSize: "13px",
    opacity: "0.9",
  },
  tabsContainer: {
    padding: "16px 20px 0 20px",
    backgroundColor: "white",
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  tabList: {
    // Custom tab list styles
  },
  content: {
    flex: 1,
    overflow: "auto",
  },
  apiKeyBanner: {
    backgroundColor: "#fef3c7",
    padding: "12px 20px",
    borderBottom: `1px solid #fde047`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  bannerText: {
    fontSize: "13px",
    color: "#92400e",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
});

const App = (props) => {
  const { title } = props;
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState("formula");
  const [showApiKeyBanner, setShowApiKeyBanner] = useState(!hasApiKey());

  const handleTabChange = (event, data) => {
    setSelectedTab(data.value);
  };

  const handleApiKeySet = () => {
    setShowApiKeyBanner(false);
    // Refresh to update hasApiKey status
    setTimeout(() => {
      setShowApiKeyBanner(!hasApiKey());
    }, 100);
  };

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <Logo size={28} color="white" textColor="white" />
        <p className={styles.headerSubtitle} style={{ marginTop: "8px" }}>
          AI-Powered Excel Assistant for Excel
        </p>
      </div>

      {/* API Key Banner */}
      {showApiKeyBanner && (
        <div className={styles.apiKeyBanner}>
          <div className={styles.bannerText}>
            <Key24Regular style={{ fontSize: "20px" }} />
            <span>⚠️ Cần cấu hình Gemini API Key để sử dụng tính năng AI</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <TabList selectedValue={selectedTab} onTabSelect={handleTabChange} size="medium">
          <Tab value="formula" icon={<Sparkle24Regular />}>
            Formula Generator
          </Tab>
          <Tab value="analyzer" icon={<DataUsage24Regular />}>
            Data Analyzer
          </Tab>
          <Tab value="stepbystep" icon={<Lightbulb24Regular />}>
            Step-by-Step
          </Tab>
          <Tab value="settings" icon={<Key24Regular />}>
            API Settings
          </Tab>
        </TabList>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {selectedTab === "formula" && <FormulaGenerator />}
        {selectedTab === "analyzer" && <DataAnalyzer />}
        {selectedTab === "stepbystep" && <StepByStepGuide />}
        {selectedTab === "settings" && <ApiKeySetup onKeySet={handleApiKeySet} />}
      </div>
    </div>
  );
};

App.propTypes = {
  title: PropTypes.string,
};

export default App;
