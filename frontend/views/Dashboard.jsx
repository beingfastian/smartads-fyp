import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { BarChart3, Video, MessageSquare, Zap, Sparkles, Users, Layers, Image, Download, Maximize, X, Rocket } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import Navbar from "../components/common/Navbar";
import { API_BASE_URL } from "../utils/constants";
import { hasVulgarity } from "../utils/profanityFilter";

import Modal from "../components/Dashboard/Modal";
import UserManagementModal from "../components/Dashboard/UserManagementModal";
import AddEditUserModal from "../components/Dashboard/AddEditUserModal";
import ManageUsersPage from "../components/ManageUsers/ManageUsersPage";
import TemplateManager from "../components/TemplateManager/TemplateManager";
import VideoAdModule from "../components/Dashboard/VideoAdModule";

const Dashboard = ({ onLogout, onNavigate }) => {
    // Video Ad Module state
    const [showVideoAdModule, setShowVideoAdModule] = useState(false);
  const {
    user,
    logout,
    addSubUser,
    getSubUsers,
    updateSubUser,
    removeSubUser,
    hasFeatureAccess,
    ALL_FEATURES,
  } = useAuth();

  const { colors, mode } = useTheme();

  // Current view state for navigation between dashboard, manage users, and templates
  const [currentView, setCurrentView] = useState("dashboard");

  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUserData, setNewUserData] = useState({ name: "", email: "", password: "", allowedFeatures: [] });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [subUsers, setSubUsers] = useState([]);

  // ProductInputDetail States
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [showCaptionBox, setShowCaptionBox] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [adType, setAdType] = useState("logo");
  const [colors2, setColors2] = useState(["#0ea5e9", "#111827"]);
  const [style, setStyle] = useState("modern, minimal");
  const [size, setSize] = useState("1024x1024");
  const [generatedResult, setGeneratedResult] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [priceValue, setPriceValue] = useState("");
  const [captionType, setCaptionType] = useState("without_caption");

  // Load sub-users from backend
  useEffect(() => {
    const loadSubUsers = async () => {
      if (user?.isHeadUser && user?.id) {
        try {
          const subUsersList = await getSubUsers(user.id);
          setSubUsers(subUsersList || []);
        } catch (error) {
          console.error("Failed to load sub-users:", error);
          setSubUsers([]);
        }
      }
    };
    loadSubUsers();
  }, [user, showUserManagement]);

  const allTools = [
    { icon: Sparkles, name: "Logo & Poster Designer", color: "#00D9FF", description: "Create stunning logos and posters", featureId: "logo", action: () => setShowProductForm(true) },
    { icon: Video, name: "AI Video Maker", color: "#7C3AED", description: "Generate professional videos", featureId: "video", action: () => setShowVideoAdModule(true) },
    { icon: MessageSquare, name: "Caption Writer", color: "#F59E0B", description: "Write engaging captions", featureId: "caption" },
    { icon: Zap, name: "Voiceover Maker", color: "#10B981", description: "Create voice narrations", featureId: "voiceover" },
    { icon: BarChart3, name: "Analytics", color: "#EF4444", description: "Track your performance", featureId: "analytics" },
    { icon: Layers, name: "Template Manager", color: "#F472B6", description: "Organize and manage templates", featureId: "templates", action: () => setCurrentView("templates") },
    { icon: Users, name: "User Management", color: "#60A5FA", description: "Manage your team members", featureId: "users", action: () => setCurrentView("manage-users") },
  ];

  // ProductInputDetail Handlers
  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setAdType(value);
      if (value === "poster") {
        setShowCaptionBox(true);
      } else {
        setShowCaptionBox(false);
      }
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setSelectedImages((prev) => [...prev, ...files]);
  };

  const removeImage = (index) => {
    const updated = [...selectedImages];
    updated.splice(index, 1);
    setSelectedImages(updated);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();

    if (hasVulgarity(nameValue) || hasVulgarity(descriptionValue)) {
      alert("Inappropriate language detected. Please remove offensive or vulgar words before generating.");
      return;
    }

    setIsLoading(true);
    setGeneratedResult(null);

    try {
      let cloudinaryUrls = [];
      if (selectedImages.length > 0) {
        const formData = new FormData();
        selectedImages.forEach(file => {
          formData.append('images', file);
        });

        const uploadResponse = await fetch(`${API_BASE_URL}/api/upload-images`, {
          method: "POST",
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          cloudinaryUrls = uploadData.urls || [];
        }
      }

      const payload = {
        type: adType,
        brandName: nameValue,
        tagline: descriptionValue,
        colors: colors2,
        style: style,
        description: `Product: ${nameValue}. ${descriptionValue}`,
        size: size,
        price: priceValue,
        captionType: captionType,
        referenceImages: cloudinaryUrls
      };

      const response = await fetch(`${API_BASE_URL}/api/generate-design`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      const results = [];

      if (response.ok) {
        results.push({ type: adType, ...data });
      } else {
        alert(`Error generating ${adType}: ${data.error || data.details}`);
      }

      setGeneratedResult(results);
      // Auto-scroll to results so the user sees the output immediately without clicking OK
      setTimeout(() => {
        const el = document.getElementById("results-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      alert("Network error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameInput = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value)) {
      setNameValue(value);
    }
  };

  const handlePriceInput = (e) => {
    const value = e.target.value;
    e.target.value = value.replace(/[^0-9]/g, "");
  };

  const handlePriceKeyDown = (e) => {
    if (e.key === "-" || e.key === "+" || e.key === "e") {
      e.preventDefault();
    }
  };

  const isFormValid =
    nameValue.trim() !== "" &&
    descriptionValue.trim() !== "" &&
    adType !== "";

  const handleAddSubUser = async () => {
    const newErrors = {};
    if (!newUserData.name.trim()) newErrors.name = "Name required";
    if (!newUserData.email.trim()) newErrors.email = "Email required";
    if (!newUserData.password) newErrors.password = "Password required";
    if (newUserData.allowedFeatures.length === 0) newErrors.features = "Select at least one feature";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await addSubUser(user.id, newUserData);
      // Reload sub-users list
      const updatedSubUsers = await getSubUsers(user.id);
      setSubUsers(updatedSubUsers || []);
      setSuccessMessage("Team member added successfully!");
      setShowAddUser(false);
      setNewUserData({ name: "", email: "", password: "", allowedFeatures: [] });
      setErrors({});
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      setErrors({ submit: error.message });
    }
  };

  const handleUpdateSubUser = async () => {
    try {
      await updateSubUser(selectedUser.id, {
        name: selectedUser.name,
        email: selectedUser.email,
        password: selectedUser.password || undefined,
        allowedFeatures: selectedUser.allowedFeatures,
      });
      // Reload sub-users list
      const updatedSubUsers = await getSubUsers(user.id);
      setSubUsers(updatedSubUsers || []);
      setSuccessMessage("Team member updated successfully!");
      setShowEditUser(false);
      setSelectedUser(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      setErrors({ submit: error.message });
    }
  };

  const handleDeleteSubUser = async (subUserId) => {
    if (window.confirm("Delete this team member?")) {
      try {
        await removeSubUser(user.id, subUserId);
        // Reload sub-users list
        const updatedSubUsers = await getSubUsers(user.id);
        setSubUsers(updatedSubUsers || []);
        setSuccessMessage("Team member deleted successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const toggleFeature = (featureId, isEditing = false) => {
    if (isEditing && selectedUser) {
      const features = selectedUser.allowedFeatures.includes(featureId)
        ? selectedUser.allowedFeatures.filter(f => f !== featureId)
        : [...selectedUser.allowedFeatures, featureId];
      setSelectedUser({ ...selectedUser, allowedFeatures: features });
    } else {
      const features = newUserData.allowedFeatures.includes(featureId)
        ? newUserData.allowedFeatures.filter(f => f !== featureId)
        : [...newUserData.allowedFeatures, featureId];
      setNewUserData({ ...newUserData, allowedFeatures: features });
    }
  };

  const handleLogout = () => {
    logout();
    onLogout && onLogout();
  };

  const resetProductForm = () => {
    setShowProductForm(false);
    setSelectedImages([]);
    setShowCaptionBox(false);
    setNameValue("");
    setDescriptionValue("");
    setAdTypes([]);
    setColors2(["#0ea5e9", "#111827"]);
    setStyle("modern, minimal");
    setSize("1024x1024");
    setGeneratedResult(null);
    setPriceValue("");
    setCaptionType("without_caption");
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg1, fontFamily: "Arial", transition: "background 0.3s" }}>
      {/* Video Ad Module Modal/Page */}
      {showVideoAdModule && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.08)", zIndex: 1000, overflow: "auto" }}>
          <div style={{ width: "95%", maxWidth: 1200, margin: "60px auto", background: colors.cardBg, borderRadius: 20, boxShadow: "0 10px 40px rgba(0,0,0,0.12)", padding: 40, position: "relative" }}>
            <button style={{ float: "right", fontSize: 22, background: "none", border: "none", cursor: "pointer", color: colors.text2 }} onClick={() => setShowVideoAdModule(false)}>&times;</button>
            <VideoAdModule />
          </div>
        </div>
      )}
      <style>{`
        @keyframes spinFast {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(1440deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

      {/* Navbar */}
      <Navbar onNavigate={onNavigate} showAuthButtons={false} />

      {/* Render Template Manager View */}
      {currentView === "templates" && (
        <TemplateManager onBack={() => setCurrentView("dashboard")} />
      )}

      {/* Render User Management View */}
      {currentView === "manage-users" && (
        <ManageUsersPage onBack={() => setCurrentView("dashboard")} onNavigate={onNavigate} />
      )}

      {/* Main Dashboard Content */}
      {currentView === "dashboard" && (
      <div style={{ paddingTop: "100px" }}>
        {/* Header Section */}
        <div style={{ 
          maxWidth: 1400, 
          margin: "0 auto", 
          padding: "0 40px",
          marginBottom: 40
        }}>
          <div style={{
            background: colors.cardBg,
            backdropFilter: "blur(20px)",
            border: `1px solid ${colors.border}`,
            borderRadius: 20,
            padding: "40px",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)"
          }}>
            <h2 style={{ 
              color: colors.text1, 
              fontSize: "2.5rem", 
              marginBottom: 12, 
              fontWeight: "bold"
            }}>
              Welcome back, {user?.name}! 👋
            </h2>
            <p style={{ 
              color: colors.text2, 
              fontSize: "1.1rem",
              margin: 0
            }}>
              {user?.isHeadUser 
                ? `Managing ${user?.organizationName} • ${subUsers.length} team ${subUsers.length === 1 ? 'member' : 'members'}` 
                : `Access to ${allTools.filter(t => hasFeatureAccess(user?.id, t.featureId)).length} powerful features`
              }
            </p>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div style={{ 
            maxWidth: 1400, 
            margin: "0 auto 30px auto",
            padding: "0 40px"
          }}>
            <div style={{ 
              background: "rgba(16, 185, 129, 0.1)", 
              border: "1px solid #10B981", 
              color: "#10B981", 
              padding: "16px 20px", 
              borderRadius: 12, 
              textAlign: "center", 
              fontWeight: "600",
              animation: "fadeIn 0.4s ease-out, pulse 0.6s ease-in-out"
            }}>
              ✓ {successMessage}
            </div>
          </div>
        )}

        {/* Features Section */}
        <div style={{ 
          maxWidth: 1400, 
          margin: "0 auto 50px",
          padding: "0 40px"
        }}>
          <div style={{
            marginBottom: 30
          }}>
            <h3 style={{
              color: colors.text1,
              fontSize: "1.8rem",
              fontWeight: "bold",
              marginBottom: 8
            }}>
              Your Tools
            </h3>
            <p style={{
              color: colors.text2,
              fontSize: "1rem",
              margin: 0
            }}>
              Choose a tool to get started with your project
            </p>
          </div>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", 
            gap: 25
          }}>
            {allTools.map((tool, i) => {
              const allowed = hasFeatureAccess(user?.id, tool.featureId);
              return (
                <div
                  key={i}
                  onClick={allowed && tool.action ? tool.action : null}
                  style={{
                    padding: "30px 25px",
                    borderRadius: 18,
                    background: colors.cardBg,
                    backdropFilter: "blur(20px)",
                    border: `2px solid ${allowed ? colors.border : 'rgba(255, 0, 0, 0.2)'}`,
                    cursor: allowed && tool.action ? "pointer" : "not-allowed",
                    opacity: allowed ? 1 : 0.5,
                    transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    height: "260px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    position: "relative",
                    overflow: "hidden",
                    animation: `fadeIn 0.6s ease-out ${i * 0.1}s backwards`
                  }}
                  onMouseEnter={e => {
                    if (allowed && tool.action) {
                      e.currentTarget.style.transform = "translateY(-10px) scale(1.03)";
                      e.currentTarget.style.boxShadow = `0 25px 50px ${tool.color}40`;
                      e.currentTarget.style.borderColor = tool.color;
                    }
                  }}
                  onMouseLeave={e => {
                    if (allowed && tool.action) {
                      e.currentTarget.style.transform = "translateY(0) scale(1)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = colors.border;
                    }
                  }}
                >
                  {!allowed && (
                    <div style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      background: "rgba(239, 68, 68, 0.9)",
                      color: "white",
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: "0.75rem",
                      fontWeight: "600"
                    }}>
                      Locked
                    </div>
                  )}
                  <div
                    style={{
                      width: 70,
                      height: 70,
                      borderRadius: 16,
                      background: `linear-gradient(135deg, ${tool.color}, ${tool.color}cc)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 20,
                      boxShadow: `0 10px 30px ${tool.color}50`,
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={e => {
                      if (allowed) {
                        e.currentTarget.style.animation = "spinFast 1.2s linear infinite";
                        e.currentTarget.style.transform = "scale(1.1)";
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.animation = "none";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <tool.icon size={34} color="white" strokeWidth={2.5} />
                  </div>
                  <h3 style={{ 
                    color: colors.text1, 
                    fontSize: "1.15rem", 
                    marginBottom: 10, 
                    textAlign: "center", 
                    fontWeight: "700",
                    lineHeight: 1.3
                  }}>
                    {tool.name}
                  </h3>
                  <p style={{ 
                    color: colors.text2, 
                    fontSize: "0.9rem", 
                    textAlign: "center", 
                    lineHeight: 1.5,
                    margin: 0
                  }}>
                    {tool.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          maxWidth: 1400, 
          margin: "0 auto 60px",
          padding: "0 40px",
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          gap: 20, 
          flexWrap: "wrap" 
        }}>
          {user?.isHeadUser && (
            <button 
              onClick={() => setShowUserManagement(true)} 
              style={{ 
                padding: "14px 30px", 
                background: `linear-gradient(135deg, ${colors.secondary}, #9333EA)`, 
                border: "none", 
                color: "#fff", 
                borderRadius: 12, 
                cursor: "pointer", 
                fontWeight: "600", 
                fontSize: "1.05rem", 
                display: "flex", 
                alignItems: "center", 
                gap: 10,
                boxShadow: `0 8px 20px ${colors.secondary}40`,
                transition: "all 0.3s ease"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = `0 12px 30px ${colors.secondary}60`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = `0 8px 20px ${colors.secondary}40`;
              }}
            >
              <Users size={22} /> Manage Team ({subUsers.length})
            </button>
          )}
          <button 
            onClick={handleLogout} 
            style={{ 
              padding: "14px 32px", 
              background: "transparent", 
              border: `2px solid ${colors.primary}`, 
              color: colors.primary, 
              borderRadius: 12, 
              cursor: "pointer", 
              fontWeight: "600", 
              fontSize: "1.05rem",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = colors.primary;
              e.currentTarget.style.color = mode === "dark" ? "#000" : "#fff";
              e.currentTarget.style.transform = "translateY(-3px)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = colors.primary;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Logout
          </button>
        </div>
      </div>
      )}

      {/* Footer */}
      <footer
        style={{
          padding: "60px 40px 30px",
          borderTop: `1px solid ${colors.border}`,
          background: mode === "dark" ? "rgba(0, 0, 40, 0.95)" : "#F1F5F9",
          color: colors.text2,
          transition: "all 0.3s ease",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 40,
            marginBottom: 40,
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 15 }}>
              <div
                style={{
                  width: 35,
                  height: 35,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 4px 12px ${colors.primary}40`,
                }}
              >
                <Rocket size={18} color="white" />
              </div>
              <h3
                style={{
                  fontSize: "1.3rem",
                  fontWeight: "bold",
                  margin: 0,
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                SmartAds
              </h3>
            </div>
            <p style={{ fontSize: "0.95rem", lineHeight: 1.6, opacity: 0.8, color: colors.text2 }}>
              AI-Powered Marketing Platform helping businesses create professional content in minutes.
            </p>
          </div>

          <div style={{ textAlign: "left" }}>
            <h4 style={{ fontSize: "1.1rem", marginBottom: 15, fontWeight: "bold", color: colors.text1 }}>
              Contact Us
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 35,
                    height: 35,
                    borderRadius: 8,
                    background: `${colors.primary}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={colors.primary}
                    strokeWidth="2"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <span style={{ fontSize: "0.95rem", color: colors.text2 }}>03031233445</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 35,
                    height: 35,
                    borderRadius: 8,
                    background: `${colors.secondary}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={colors.secondary}
                    strokeWidth="2"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <span style={{ fontSize: "0.95rem", wordBreak: "break-all", color: colors.text2 }}>nakhalsheikh4@gmail.com</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 35,
                    height: 35,
                    borderRadius: 8,
                    background: `${colors.accent}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={colors.accent}
                    strokeWidth="2"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>  
                <span style={{ fontSize: "0.95rem", color: colors.text2 }}>NUCES Chiniot, Pakistan</span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            paddingTop: 30,
            borderTop: `1px solid ${colors.border}`,
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.7, color: colors.text2 }}>
            © 2025 SmartAds. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Product Form Modal */}
      {showProductForm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            width: "95%",
            maxWidth: "1200px",
            background: colors.cardBg,
            padding: "30px",
            borderRadius: "18px",
            boxShadow: "0 8px 25px rgba(0,0,0,0.12)",
            maxHeight: "90vh",
            overflow: "auto",
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ color: colors.text1, margin: 0, fontSize: "1.5rem", fontWeight: 600 }}>Product Input Detail</h2>
              <button onClick={() => { setShowProductForm(false); setGeneratedResult(null); }} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: colors.text2 }}>×</button>
            </div>

            <div style={{ display: "flex", gap: "30px", flexDirection: window.innerWidth < 768 ? "column" : "row" }}>
              
              {/* Left Panel: Inputs */}
              <div style={{ flex: 1 }}>
                <form id="product-form" onSubmit={handleProductSubmit}>
              {/* Product Name */}
              <label style={{ color: colors.text1, display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "15px" }}>
                <b>Product Name</b> <span style={{ color: "red", marginLeft: "4px" }}>*</span>
              </label>
              <input
                type="text"
                value={nameValue}
                onChange={handleNameInput}
                placeholder="Enter product name"
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "10px",
                  outline: "none",
                  marginBottom: "10px",
                  background: colors.bg2,
                  fontSize: "14px",
                  color: colors.text1,
                  boxSizing: "border-box"
                }}
              />

              {/* Description */}
              <label style={{ color: colors.text1, display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "15px" }}>
                <b>Description</b> <span style={{ color: "red", marginLeft: "4px" }}>*</span>
              </label>
              <textarea
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                placeholder="Enter product description"
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "10px",
                  outline: "none",
                  marginBottom: "10px",
                  background: colors.bg2,
                  fontSize: "14px",
                  color: colors.text1,
                  minHeight: "80px",
                  resize: "vertical",
                  boxSizing: "border-box"
                }}
              />

              {/* Price */}
              <label style={{ color: colors.text1, display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "15px" }}>
                <b>Price (Rs.)</b>
              </label>
              <input
                type="number"
                name="price"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                placeholder="Enter product price"
                min="0"
                onInput={handlePriceInput}
                onKeyDown={handlePriceKeyDown}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "10px",
                  outline: "none",
                  marginBottom: "10px",
                  background: colors.bg2,
                  fontSize: "14px",
                  color: colors.text1,
                  boxSizing: "border-box"
                }}
              />

              {/* Ad Type & Caption Row */}
              <div style={{ display: "flex", gap: "20px", marginBottom: "10px" }}>
                {/* Ad Type */}
                <div style={{ flex: 1, transition: "flex 0.3s ease" }}>
                  <label style={{ color: colors.text1, display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "15px" }}>
                    <b>Type:</b> <span style={{ color: "red", marginLeft: "4px" }}>*</span>
                  </label>
                  <div style={{
                    padding: "12px",
                    background: colors.bg2,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px"
                  }}>
                    <label style={{ color: colors.text1, display: "flex", alignItems: "center", cursor: "pointer", gap: "8px", margin: 0 }}>
                      <input
                        type="radio"
                        name="main_ad_type"
                        value="logo"
                        checked={adType === "logo"}
                        onChange={handleCheckboxChange}
                        style={{ cursor: "pointer" }}
                      />
                      Logo
                    </label>
                    <label style={{ color: colors.text1, display: "flex", alignItems: "center", cursor: "pointer", gap: "8px", margin: 0 }}>
                      <input
                        type="radio"
                        name="main_ad_type"
                        value="poster"
                        checked={adType === "poster"}
                        onChange={handleCheckboxChange}
                        style={{ cursor: "pointer" }}
                      />
                      Poster
                    </label>
                  </div>
                </div>

                {/* Caption Box */}
                {showCaptionBox && (
                  <div style={{ flex: 1, animation: "fadeIn 0.3s ease-in-out" }}>
                    <label style={{ color: colors.text1, display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "15px" }}>
                      <b>Add Caption?</b>
                    </label>
                    <div style={{
                      padding: "12px",
                      background: colors.bg2,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px"
                    }}>
                      <label style={{ color: colors.text1, display: "flex", alignItems: "center", cursor: "pointer", gap: "8px", margin: 0 }}>
                        <input
                          type="radio"
                          name="captionChoice"
                          value="with_caption"
                          checked={captionType === "with_caption"}
                          onChange={(e) => setCaptionType(e.target.value)}
                          style={{ cursor: "pointer" }}
                        />
                        Yes
                      </label>
                      <label style={{ color: colors.text1, display: "flex", alignItems: "center", cursor: "pointer", gap: "8px", margin: 0 }}>
                        <input
                          type="radio"
                          name="captionChoice"
                          value="without_caption"
                          checked={captionType === "without_caption"}
                          onChange={(e) => setCaptionType(e.target.value)}
                          style={{ cursor: "pointer" }}
                        />
                        No
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Reference Images */}
              <label style={{ color: colors.text1, display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "15px" }}>
                <b>Reference Images</b> (Optional)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "10px",
                  background: colors.bg2,
                  marginBottom: "10px",
                  fontSize: "14px",
                  color: colors.text1,
                  boxSizing: "border-box",
                  cursor: "pointer"
                }}
              />

              {/* Images Preview */}
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                marginBottom: "18px",
                gap: "8px"
              }}>
                {selectedImages.map((file, index) => (
                  <div key={index} style={{ position: "relative", display: "inline-block" }}>
                    <img src={URL.createObjectURL(file)} alt="preview" style={{
                      width: "75px",
                      height: "75px",
                      objectFit: "cover",
                      borderRadius: "12px",
                      border: `2px solid ${colors.border}`,
                      boxShadow: "0 3px 10px rgba(0,0,0,0.12)"
                    }} />
                    <div onClick={() => removeImage(index)} style={{
                      position: "absolute",
                      top: "2px",
                      right: "6px",
                      background: "rgba(0,0,0,0.75)",
                      color: "white",
                      width: "18px",
                      height: "18px",
                      fontSize: "12px",
                      borderRadius: "50%",
                      textAlign: "center",
                      lineHeight: "18px",
                      cursor: "pointer"
                    }}>×</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "20px", marginBottom: "10px" }}>
                {/* Brand Colors */}
                <div style={{ flex: 1 }}>
                  <label style={{ color: colors.text1, display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "15px" }}>
                    <b>Brand Colors</b>
                  </label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input
                      type="color"
                      value={colors2[0]}
                      onChange={(e) => setColors2([e.target.value, colors2[1]])}
                      style={{ width: "100%", height: "40px", border: "none", borderRadius: "8px", cursor: "pointer" }}
                    />
                    <input
                      type="color"
                      value={colors2[1]}
                      onChange={(e) => setColors2([colors2[0], e.target.value])}
                      style={{ width: "100%", height: "40px", border: "none", borderRadius: "8px", cursor: "pointer" }}
                    />
                  </div>
                </div>

                {/* Style */}
                <div style={{ flex: 1 }}>
                  <label style={{ color: colors.text1, display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "15px" }}>
                    <b>Design Style</b>
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: `1px solid ${colors.border}`,
                      borderRadius: "10px",
                      background: colors.bg2,
                      fontSize: "14px",
                      color: colors.text1,
                      boxSizing: "border-box"
                    }}
                  >
                    <option value="modern, minimal">Modern & Minimal</option>
                    <option value="bold, geometric">Bold & Geometric</option>
                    <option value="elegant, professional">Elegant & Professional</option>
                    <option value="playful, creative">Playful & Creative</option>
                    <option value="vintage, retro">Vintage & Retro</option>
                  </select>
                </div>
              </div>

              {/* Size */}
              <label style={{ color: colors.text1, display: "block", marginBottom: "6px", fontWeight: "500", fontSize: "15px" }}>
                <b>Output Size</b>
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "10px",
                  background: colors.bg2,
                  marginBottom: "10px",
                  fontSize: "14px",
                  color: colors.text1,
                  boxSizing: "border-box"
                }}
              >
                <option value="512x512">512x512 (Small)</option>
                <option value="1024x1024">1024x1024 (Medium)</option>
                <option value="2048x2048">2048x2048 (Large)</option>
              </select>

                </form>
              </div> {/* End Left Panel */}

              {/* Right Panel: Image Display & Actions */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
                
                {/* Image Placeholder or Result */}
                <div style={{ 
                  flex: 1, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  background: colors.bg2, 
                  borderRadius: "12px", 
                  border: `2px dashed ${colors.border}`, 
                  minHeight: "450px", 
                  position: "relative", 
                  overflow: "hidden" 
                }}>
                  {generatedResult && generatedResult.length > 0 ? (
                    <div 
                      style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}
                      onMouseEnter={(e) => { if(e.currentTarget.lastElementChild) e.currentTarget.lastElementChild.style.opacity = '1'; }}
                      onMouseLeave={(e) => { if(e.currentTarget.lastElementChild) e.currentTarget.lastElementChild.style.opacity = '0'; }}
                    >
                      <img src={generatedResult[0].url} alt="Generated Design" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                      
                      {/* Hover Overlay */}
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", opacity: 0, transition: "opacity 0.3s ease" }}>
                        <button 
                          onClick={() => window.open(generatedResult[0].url.replace('/upload/', '/upload/fl_attachment/'), "_blank")} 
                          style={{ background: "white", border: "none", borderRadius: "50%", padding: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#111827", transition: "transform 0.2s ease" }} 
                          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"} 
                          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} 
                          title="Download"
                        >
                          <Download size={24} />
                        </button>
                        <button 
                          onClick={() => setFullScreenImage(generatedResult[0].url)} 
                          style={{ background: "white", border: "none", borderRadius: "50%", padding: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#111827", transition: "transform 0.2s ease" }} 
                          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"} 
                          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} 
                          title="Full Screen"
                        >
                          <Maximize size={24} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: colors.text2, opacity: 0.6 }}>
                      <Image size={64} style={{ marginBottom: "15px" }} />
                      <p style={{ margin: 0, fontSize: "1.1rem" }}>Your generated design will appear here</p>
                    </div>
                  )}
                </div>

                {/* Generate Button on the Right */}
                <button 
                  type="submit" 
                  form="product-form"
                  disabled={!isFormValid || isLoading}
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: isFormValid && !isLoading ? colors.primary : "#a3a9d9",
                    border: "none",
                    color: "white",
                    fontSize: "1.1rem",
                    borderRadius: "12px",
                    cursor: isFormValid && !isLoading ? "pointer" : "not-allowed",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                    boxShadow: isFormValid && !isLoading ? `0 4px 15px ${colors.primary}40` : "none"
                  }}
                  onMouseEnter={e => {
                    if (isFormValid && !isLoading) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = `0 8px 25px ${colors.primary}60`;
                    }
                  }}
                  onMouseLeave={e => {
                    if (isFormValid && !isLoading) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = `0 4px 15px ${colors.primary}40`;
                    }
                  }}
                >
                  {isLoading ? "Generating..." : "Generate Image"}
                </button>
              </div> {/* End Right Panel */}
            </div> {/* End Inner Flex Row Container */}
          </div>
        </div>
      )}

      {/* Fullscreen Image Overlay */}
      {fullScreenImage && (
        <div style={{ 
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          background: "rgba(0,0,0,0.9)", zIndex: 2000, 
          display: "flex", alignItems: "center", justifyContent: "center" 
        }}>
          <button 
            onClick={() => setFullScreenImage(null)} 
            style={{ position: "absolute", top: "30px", right: "30px", background: "none", border: "none", color: "white", cursor: "pointer", padding: "10px" }}
          >
            <X size={36} />
          </button>
          <img src={fullScreenImage} alt="Fullscreen Display" style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: "8px" }} />
        </div>
      )}

      {/* User Management Modal */}
      <UserManagementModal
        show={showUserManagement}
        onClose={() => setShowUserManagement(false)}
        subUsers={subUsers}
        colors={colors}
        setShowAddUser={setShowAddUser}
        setShowEditUser={setShowEditUser}
        setSelectedUser={setSelectedUser}
        handleDeleteSubUser={handleDeleteSubUser}
        ALL_FEATURES={ALL_FEATURES}
      />

      {/* Add/Edit User Modal */}
      <AddEditUserModal
        show={showAddUser || showEditUser}
        onClose={() => { setShowAddUser(false); setShowEditUser(false); setSelectedUser(null); setNewUserData({ name: "", email: "", password: "", allowedFeatures: [] }); setErrors({}); }}
        showAddUser={showAddUser}
        showEditUser={showEditUser}
        colors={colors}
        errors={errors}
        newUserData={newUserData}
        setNewUserData={setNewUserData}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        ALL_FEATURES={ALL_FEATURES}
        handleAddSubUser={handleAddSubUser}
        handleUpdateSubUser={handleUpdateSubUser}
        toggleFeature={toggleFeature}
      />
    </div>
  );
};

export default Dashboard;