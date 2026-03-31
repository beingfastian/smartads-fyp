import React, { useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

import LandingPage from "./views/LandingPage";
import LoginPage from "./views/LoginPage";
import SignupPage from "./views/SignupPage";
import Dashboard from "./views/Dashboard";
import LogoDesigner from "./views/LogoDesigner"; 

const AppContent = () => {
  const [page, setPage] = useState("landing");
  const { user } = useAuth();

  const screens = {
    landing: <LandingPage onNavigate={setPage} />,
    login: <LoginPage onNavigate={setPage} />,
    signup: <SignupPage onNavigate={setPage} />,
    dashboard: <Dashboard onNavigate={setPage} />,
    "logo-designer": <LogoDesigner onNavigate={setPage} />,
  };

  // 1. If user is NOT logged in
  if (!user) {
    // Only allow access to public pages
    if (page === "landing" || page === "login" || page === "signup") {
      return screens[page];
    }
    // If they try to access dashboard/logo-designer while logged out, force Login
    return screens["login"];
  }

  // 2. If user IS logged in
  // Always show dashboard by default after login
  if (page === "landing" || page === "login" || page === "signup") {
    return screens["dashboard"];
  }
  return screens[page] || screens["dashboard"];
};

const App = () => {
  // Use Google Client ID from environment or use a placeholder
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";
  
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
};

export default App;