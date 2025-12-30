/**
 * App Component - Main Application Container
 *
 * REFACTORED:
 * - Loại bỏ makeStyles, chuyển sang CSS classes
 * - Loại bỏ inline styles
 * - Sử dụng API service thay vì gọi trực tiếp geminiService
 */

import * as React from "react";
import { useState } from "react";
import PropTypes from "prop-types";
import { Tab, TabList } from "@fluentui/react-components";
import {
  Sparkle24Regular,
  Lightbulb24Regular,
  Key24Regular,
  DataUsage24Regular,
} from "@fluentui/react-icons";

// Components
import Logo from "./Logo";
import FormulaGenerator from "./FormulaGenerator";
import StepByStepGuide from "./StepByStepGuide";
import DataAnalyzer from "./DataAnalyzer";
import ApiKeySetup from "./ApiKeySetup";

// API Service
import { hasApiKey } from "../../services/apiService";

const App = (props) => {
  const { title } = props;
  const [selectedTab, setSelectedTab] = useState("formula");
  const [showApiKeyBanner, setShowApiKeyBanner] = useState(!hasApiKey());

  const handleTabChange = (event, data) => {
    setSelectedTab(data.value);
  };

  const handleApiKeySet = () => {
    setShowApiKeyBanner(false);
    // Refresh để update hasApiKey status
    setTimeout(() => {
      setShowApiKeyBanner(!hasApiKey());
    }, 100);
  };

  return (
    <div className="app-root">
      {/* Header */}
      <div className="app-header">
        <Logo size={28} color="white" textColor="white" />
        <p className="app-header__subtitle">AI-Powered Excel Assistant for Excel</p>
      </div>

      {/* API Key Banner */}
      {showApiKeyBanner && (
        <div className="api-key-banner">
          <div className="api-key-banner__text">
            <Key24Regular />
            <span>⚠️ Cần cấu hình Gemini API Key để sử dụng tính năng AI</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
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
      <div className="content-container">
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
