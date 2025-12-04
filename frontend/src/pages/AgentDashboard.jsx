import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../api";
import {
  FaHome,
  FaUsers,
  FaTruck,
  FaMapMarkerAlt,
  FaFileInvoice,
  FaBell,
  FaDollarSign,
  FaVideo,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaUserTag,
  FaBuilding,
  FaHandshake,
  FaSpinner,
} from "react-icons/fa";

// Import agent-specific components
import AgentUserManagement from "./agent/AgentUserManagement";
import AgentShippingTracking from "./agent/AgentShippingTracking";
import AgentShippingMarks from "./agent/AgentShippingMarks";
import AgentInvoices from "./agent/AgentInvoices";
import AgentPackageUpdates from "./agent/AgentPackageUpdates";
import AgentShippingRates from "./agent/AgentShippingRates";
import AgentVideoContent from "./agent/AgentVideoContent";

const AgentDashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");

  useEffect(() => {
    checkAgentAccess();
  }, []);

  const checkAgentAccess = async () => {
    try {
      setLoading(true);
      const response = await API.get("/buysellapi/users/me/");
      const user = response.data;

      if (!user.is_agent) {
        toast.error("Access denied. Agent access required.");
        navigate("/Profile");
        return;
      }

      setCurrentUser(user);
      
      // Initialize active section from URL or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const sectionFromUrl = urlParams.get("section");
      if (sectionFromUrl) {
        setActiveSection(sectionFromUrl);
      } else {
        const savedSection = localStorage.getItem("agentDashboardSection");
        if (savedSection) {
          setActiveSection(savedSection);
        }
      }
    } catch (error) {
      console.error("Error checking agent access:", error);
      toast.error("Failed to verify agent access");
      navigate("/Profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    localStorage.setItem("agentDashboardSection", section);
    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set("section", section);
    window.history.pushState({}, "", url);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminToken");
    toast.success("Logged out successfully");
    navigate("/Login");
  };

  const getAgentTypeIcon = () => {
    if (!currentUser?.agent_type) return <FaUserTag />;
    switch (currentUser.agent_type) {
      case "corporate":
        return <FaBuilding className="text-blue-600" />;
      case "local":
        return <FaMapMarkerAlt className="text-green-600" />;
      case "affiliate":
        return <FaHandshake className="text-purple-600" />;
      default:
        return <FaUserTag />;
    }
  };

  const getAgentTypeLabel = () => {
    if (!currentUser?.agent_type) return "Agent";
    switch (currentUser.agent_type) {
      case "corporate":
        return "Corporate Agent";
      case "local":
        return "Local Agent";
      case "affiliate":
        return "Affiliate Agent";
      default:
        return "Agent";
    }
  };

  const menuItems = [
    { icon: <FaHome />, label: "Dashboard", section: "dashboard" },
    { icon: <FaUsers />, label: "My Users", section: "users" },
    { icon: <FaTruck />, label: "Shipping Tracking", section: "tracking" },
    { icon: <FaMapMarkerAlt />, label: "Shipping Marks", section: "shipping-marks" },
    { icon: <FaFileInvoice />, label: "Invoices", section: "invoices" },
    { icon: <FaBell />, label: "Package Updates", section: "updates" },
    { icon: <FaDollarSign />, label: "Shipping Rates", section: "rates" },
    { icon: <FaVideo />, label: "Video Tutorials", section: "videos" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <FaSpinner className="animate-spin text-4xl text-blue-600" />
      </div>
    );
  }

  if (!currentUser?.is_agent) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {isSidebarOpen ? <FaTimes /> : <FaBars />}
            </button>
            <div className="flex items-center gap-2">
              {getAgentTypeIcon()}
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                {getAgentTypeLabel()} Dashboard
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {currentUser?.full_name || currentUser?.username}
            </span>
            <button
              onClick={() => navigate("/Profile")}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2"
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            isSidebarOpen ? "w-64" : "w-0"
          } bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 overflow-hidden`}
        >
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.section}
                onClick={() => handleSectionChange(item.section)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeSection === item.section
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6">
          {activeSection === "dashboard" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                Welcome, {currentUser?.full_name || currentUser?.username}!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You are logged in as a {getAgentTypeLabel().toLowerCase()}.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FaUsers className="text-blue-600" />
                    <h3 className="font-semibold text-gray-800 dark:text-white">My Users</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage your users and their information
                  </p>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FaTruck className="text-green-600" />
                    <h3 className="font-semibold text-gray-800 dark:text-white">Shipping</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Track and manage your shipments
                  </p>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FaFileInvoice className="text-purple-600" />
                    <h3 className="font-semibold text-gray-800 dark:text-white">Invoices</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Create and manage invoices
                  </p>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FaBell className="text-yellow-600" />
                    <h3 className="font-semibold text-gray-800 dark:text-white">Updates</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Stay updated on your packages
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "users" && <AgentUserManagement />}
          {activeSection === "tracking" && <AgentShippingTracking />}
          {activeSection === "shipping-marks" && <AgentShippingMarks />}
          {activeSection === "invoices" && <AgentInvoices />}
          {activeSection === "updates" && <AgentPackageUpdates />}
          {activeSection === "rates" && <AgentShippingRates />}
          {activeSection === "videos" && <AgentVideoContent />}
        </main>
      </div>
    </div>
  );
};

export default AgentDashboard;

