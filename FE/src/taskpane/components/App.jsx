/**
 * App Component - Main Application Container
 *
 * AUTH FLOW:
 * - Bắt buộc login để sử dụng AI features
 * - Free users: 10 lệnh miễn phí
 * - Hết credits = không sử dụng được
 */

import * as React from "react";
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Tab, TabList, Button, Text, Spinner } from "@fluentui/react-components";
import {
  Sparkle24Regular,
  Lightbulb24Regular,
  DataUsage24Regular,
  SignOut24Regular,
  Person24Regular,
} from "@fluentui/react-icons";

// Components
import Logo from "./Logo";
import FormulaGenerator from "./FormulaGenerator";
import StepByStepGuide from "./StepByStepGuide";
import DataAnalyzer from "./DataAnalyzer";
import AuthPage from "./AuthPage";

// API Service
import { isLoggedIn, getProfile, getCredits, logout } from "../../services/apiService";

const App = (props) => {
  const { title } = props;
  const [selectedTab, setSelectedTab] = useState("formula");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(null);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoading(true);
    if (isLoggedIn()) {
      try {
        const [profileData, creditsData] = await Promise.all([getProfile(), getCredits()]);
        setUser(profileData);
        setCredits(creditsData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  };

  const handleLoginSuccess = async () => {
    await checkAuth();
  };

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setUser(null);
    setCredits(null);
  };

  const handleTabChange = (event, data) => {
    setSelectedTab(data.value);
  };

  // Refresh credits after AI request
  const refreshCredits = async () => {
    try {
      const creditsData = await getCredits();
      setCredits(creditsData);
    } catch (error) {
      console.error("Failed to refresh credits:", error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="app-root">
        <div className="app-header">
          <Logo size={28} color="white" textColor="white" />
        </div>
        <div className="loading-container">
          <Spinner size="large" />
          <Text>Đang tải...</Text>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return (
      <div className="app-root">
        <div className="app-header">
          <Logo size={28} color="white" textColor="white" />
          <p className="app-header__subtitle">AI-Powered Excel Assistant</p>
        </div>
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Authenticated - show main app
  return (
    <div className="app-root">
      {/* Header */}
      <div className="app-header">
        <Logo size={28} color="white" textColor="white" />
        <p className="app-header__subtitle">AI-Powered Excel Assistant</p>
      </div>

      {/* User Info Bar */}
      <div className="user-info-bar">
        <div className="user-info">
          <Person24Regular />
          <Text weight="semibold">{user?.name || "User"}</Text>
        </div>
        <div className="credits-info">
          {credits?.plan === "pro" ? (
            <Text className="credits-badge credits-badge--pro">PRO ∞</Text>
          ) : (
            <Text className="credits-badge">{credits?.credits ?? 0} lượt còn lại</Text>
          )}
        </div>
        <Button appearance="subtle" icon={<SignOut24Regular />} onClick={handleLogout} size="small">
          Đăng xuất
        </Button>
      </div>

      {/* No Credits Warning */}
      {credits?.plan !== "pro" && credits?.credits <= 0 && (
        <div className="no-credits-banner">
          <Text weight="semibold">⚠️ Bạn đã hết lượt sử dụng miễn phí!</Text>
          <Text size={200}>Liên hệ admin để nâng cấp lên Pro và sử dụng không giới hạn.</Text>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <TabList selectedValue={selectedTab} onTabSelect={handleTabChange} size="medium">
          <Tab value="formula" icon={<Sparkle24Regular />}>
            Formula
          </Tab>
          <Tab value="analyzer" icon={<DataUsage24Regular />}>
            Analyzer
          </Tab>
          <Tab value="stepbystep" icon={<Lightbulb24Regular />}>
            Guide
          </Tab>
        </TabList>
      </div>

      {/* Content */}
      <div className="content-container">
        {selectedTab === "formula" && (
          <FormulaGenerator
            disabled={credits?.plan !== "pro" && credits?.credits <= 0}
            onRequestComplete={refreshCredits}
          />
        )}
        {selectedTab === "analyzer" && (
          <DataAnalyzer
            disabled={credits?.plan !== "pro" && credits?.credits <= 0}
            onRequestComplete={refreshCredits}
          />
        )}
        {selectedTab === "stepbystep" && (
          <StepByStepGuide
            disabled={credits?.plan !== "pro" && credits?.credits <= 0}
            onRequestComplete={refreshCredits}
          />
        )}
      </div>
    </div>
  );
};

App.propTypes = {
  title: PropTypes.string,
};

export default App;
