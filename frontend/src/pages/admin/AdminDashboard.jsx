import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../../api";

import {
  FaHome,
  FaUsers,
  FaShoppingCart,
  FaBox,
  FaCog,
  FaChartBar,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaBell,
  FaMoon,
  FaSun,
  FaUserCog,
  FaFileInvoice,
  FaComments,
  FaStore,
  FaShippingFast,
  FaMapMarkerAlt,
  FaTruck,
  FaTag,
  FaBookmark,
  FaHandHoldingUsd,
  FaClipboardList,
  FaAlipay,
  FaVideo,
  FaGraduationCap,
  FaExchangeAlt,
  FaYoutube,
  FaDollarSign,
  FaUserTag,
} from "react-icons/fa";

import UsersManagement from "./UsersManagement";
import AdminProducts from "./AdminProducts";
import TrackingManagement from "./TrackingManagement";
import ShippingMarksAdmin from "./ShippingMarksAdmin";
import ShippingAddressesAdmin from "./ShippingAddressesAdmin";
import ShippingRatesManagement from "./ShippingRatesManagement";
import ContainerManagement from "../../components/ContainerManagement";
import InvoicesManagement from "./InvoicesManagement";
import Buy4meAdmin from "./Buy4meAdmin";
import QuickOrderProducts from "./QuickOrderProducts";
import AlipayManagement from "./AlipayManagement";
import TrainingManagement from "./TrainingManagement";
import PaidCourseManagement from "./PaidCourseManagement";
import YouTubeManagement from "./YouTubeManagement";
import OrderManagement from "./OrderManagement";
import CategoriesTypesManagement from "./CategoriesTypesManagement";
import Analytics from "./Analytics";
import GalleryManagement from "./GalleryManagement";
import AgentManagement from "./AgentManagement";
import "react-toastify/dist/ReactToastify.css";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, _setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Initialize active section from URL or localStorage
  const getInitialSection = () => "dashboard";

  // Initialize shipping submenu from URL or localStorage
  const getInitialShippingSubMenu = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const subMenuFromUrl = urlParams.get("shippingSubMenu");
    if (subMenuFromUrl) return subMenuFromUrl;

    const savedSubMenu = localStorage.getItem("adminShippingSubMenu");
    return savedSubMenu || "tracking";
  };

  const [activeSection, setActiveSection] = useState(getInitialSection);
  // After the initial mount (which always starts on "dashboard" to trigger the first load),
  // respect any section provided via URL or localStorage.
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sectionFromUrl = urlParams.get("section");
    if (sectionFromUrl && sectionFromUrl !== "dashboard") {
      setActiveSection(sectionFromUrl);
      return;
    }

    const savedSection = localStorage.getItem("adminActiveSection");
    if (savedSection && savedSection !== "dashboard") {
      setActiveSection(savedSection);
    }
  }, []);
  const [darkMode, setDarkMode] = useState(false);
  const [shippingSubMenu, setShippingSubMenu] = useState(
    getInitialShippingSubMenu()
  );
  const [trainingSubMenu, setTrainingSubMenu] = useState("paidCourses");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [allowedTabs, setAllowedTabs] = useState(null); // null = not loaded, [] = loaded but none
  const [allowedTabsMeta, setAllowedTabsMeta] = useState({});
  
  // Refs to prevent duplicate toasts in StrictMode
  const welcomeToastShown = useRef(false);
  const sessionExpiredToastShown = useRef(false);

  const menuItems = useMemo(
    () => [
      { icon: <FaHome />, label: "Dashboard", section: "dashboard" },
      { icon: <FaUsers />, label: "Users", section: "users" },
      { icon: <FaShippingFast />, label: "Shipping", section: "shipping" },
      {
        icon: <FaAlipay />,
        label: "Alipay Payments",
        section: "alipay-payments",
      },
      { icon: <FaHandHoldingUsd />, label: "Buy4me", section: "buy4me" },
      { icon: <FaUserTag />, label: "Agents", section: "agents" },
      { icon: <FaShoppingCart />, label: "Orders", section: "orders" },
      { icon: <FaBox />, label: "Products", section: "products" },
      { icon: <FaStore />, label: "Categories", section: "categories" },
      { icon: <FaGraduationCap />, label: "Training", section: "training" },
      { icon: <FaYoutube />, label: "YouTube", section: "youtube" },
      { icon: <FaVideo />, label: "Gallery", section: "gallery" },
      {
        icon: <FaClipboardList />,
        label: "Quick Orders",
        section: "quick-orders",
      },
      { icon: <FaComments />, label: "Messages", section: "messages" },
      { icon: <FaChartBar />, label: "Analytics", section: "analytics" },
      { icon: <FaUserCog />, label: "Staff", section: "staff" },
      { icon: <FaCog />, label: "Settings", section: "settings" },
    ],
    []
  );

  // Fetch admin notifications from backend
  const fetchAdminNotifications = async () => {
    try {
      // Check if admin token exists before fetching
      const adminToken = localStorage.getItem("adminToken");
      if (!adminToken) {
        console.log("No admin token found, skipping notification fetch");
        return;
      }

      const response = await API.get(
        "/buysellapi/admin/notifications/me/?limit=20"
      );
      const data = response.data;

      // Transform backend notifications to display format
      const transformedNotifications = data.notifications.map((notif) => ({
        id: notif.id,
        message: notif.subject,
        time: new Date(notif.created_at).toLocaleString(),
        read: notif.status !== "sent", // Unread if status is 'sent'
        fullData: notif, // Store full data for details
      }));

      setNotifications(transformedNotifications);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      // Don't show error toast for notifications - fail silently
      // Only log if it's not a 401/403 auth error
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        console.error("Error fetching admin notifications:", error);
      }
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (id) => {
    try {
      await API.patch(`/buysellapi/notifications/${id}/mark-read/`);
      // Refresh notifications
      fetchAdminNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await API.post("/buysellapi/notifications/mark-all-read/");
      // Refresh notifications
      fetchAdminNotifications();
      toast.success("All notifications marked as read", {
        toastId: "mark-all-read-success"
      });
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark notifications as read", {
        toastId: "mark-all-read-error"
      });
    }
  };

  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      // Use a single lightweight admin endpoint that returns counts/aggregates
      // so the dashboard doesn't need to fetch large lists or multiple
      // resources sequentially.
      const resp = await API.get("/buysellapi/admin/dashboard-summary/");
      const data = resp?.data || {};

      setDashboardData({
        totalUsers: data.totalUsers || 0,
        totalOrders: data.totalOrders || 0,
        totalAlipayPayments: data.totalAlipayPayments || 0,
        totalBuy4meRequests: data.totalBuy4meRequests || 0,
        totalShippingMarks: data.totalShippingMarks || 0,
        totalProducts: data.totalProducts || 0,
        totalAgents: data.totalAgents || 0,
        exchangeRate:
          data.exchangeRate !== undefined && data.exchangeRate !== null
            ? data.exchangeRate
            : null,
      });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      if (err.response?.status === 401) {
        setDashboardError("Unauthorized. Please log in again.");
      } else {
        setDashboardError("Failed to load dashboard data.");
      }
    } finally {
      setDashboardLoading(false);
    }
  };

  // Persist activeSection to localStorage and URL
  useEffect(() => {
    localStorage.setItem("adminActiveSection", activeSection);

    const url = new URL(window.location);
    url.searchParams.set("section", activeSection);

    // Also persist shipping submenu if we're in shipping section
    if (activeSection === "shipping") {
      url.searchParams.set("shippingSubMenu", shippingSubMenu);
    } else {
      url.searchParams.delete("shippingSubMenu");
    }

    window.history.replaceState({}, "", url);
  }, [activeSection, shippingSubMenu]);

  // Persist shippingSubMenu to localStorage
  useEffect(() => {
    localStorage.setItem("adminShippingSubMenu", shippingSubMenu);
  }, [shippingSubMenu]);

  useEffect(() => {
    // Only fetch dashboard data the first time we visit the dashboard
    // (or when dashboardData is explicitly cleared). This prevents
    // repeated network requests every time the user clicks the
    // Dashboard tab.
    if (activeSection === "dashboard" && dashboardData == null) {
      fetchDashboardData();
    }
  }, [activeSection]);

  // Fetch admin notifications on mount and every 30 seconds
  useEffect(() => {
    fetchAdminNotifications();

    const interval = setInterval(() => {
      fetchAdminNotifications();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch current admin profile (name/email/role)
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const resp = await API.get("/buysellapi/users/me/");
        setCurrentUser(resp.data);

        // Welcome toast once per session after successful login
        const welcomed = sessionStorage.getItem("adminWelcomeShown");
        if (!welcomed && resp?.data?.username && !welcomeToastShown.current) {
          const roleLabel = resp?.data?.role === "admin" ? "Admin" : "";
          welcomeToastShown.current = true;
          toast.success(
            `Welcome ${roleLabel ? roleLabel + " " : ""}${resp.data.username}!`,
            { toastId: "welcome-toast" }
          );
          sessionStorage.setItem("adminWelcomeShown", "1");
        }
      } catch (err) {
        if (err.response?.status === 401 && !sessionExpiredToastShown.current) {
          sessionExpiredToastShown.current = true;
          toast.error("Session expired. Please log in again.", {
            toastId: "session-expired-toast"
          });
          navigate("/admin-login");
        } else {
          console.error("Failed to load current user:", err);
        }
      }
    };

    fetchMe();
  }, [navigate]);

  // Fetch allowed dashboard tabs for this admin user once we have currentUser
  useEffect(() => {
    const fetchTabs = async () => {
      try {
        const resp = await API.get("/buysellapi/dashboard-tabs/");
        const tabs = Array.isArray(resp.data) ? resp.data : [];
        // Use tabs returned by the backend to determine which sections
        // the current admin is allowed to see.
        const slugs = tabs.map((t) => t.slug);
        const meta = {};
        tabs.forEach((t) => {
          meta[t.slug] = {
            assigned: Boolean(t.assigned),
            assignedToAll: Boolean(t.assigned_to_all_admins),
          };
        });
        // Superadmin: ensure all frontend menu items remain accessible even if DB lacks some entries
        if (currentUser && currentUser.is_superuser) {
          const allSlugs = Array.from(
            new Set([...slugs, ...menuItems.map((m) => m.section)])
          );
          setAllowedTabs(
            allSlugs.length > 0 ? allSlugs : menuItems.map((m) => m.section)
          );
        } else {
          // Admins and regular users: ONLY show tabs that are explicitly assigned to them
          // No fallback - if no tabs are assigned, they see nothing
          setAllowedTabs(slugs);
        }
        setAllowedTabsMeta(meta);
      } catch (err) {
        // On error, only superadmins get all tabs as fallback
        // Admins and regular users get nothing if there's an error
        console.error("Failed to fetch dashboard tabs:", err?.response || err);
        if (currentUser && currentUser.is_superuser) {
          setAllowedTabs(menuItems.map((m) => m.section));
        } else {
          setAllowedTabs([]);
        }
        setAllowedTabsMeta({});
      }
    };

    if (currentUser) fetchTabs();
  }, [currentUser, menuItems]);

  // Allow superadmin to sync the default frontend menu into DashboardTab records
  const syncDefaultTabs = async () => {
    if (!currentUser || !currentUser.is_superuser) return;
    try {
      // When syncing defaults, create DashboardTab entries for each menu item.
      const tabs = menuItems.map((m, idx) => ({
        name: m.label,
        slug: m.section,
        description: m.label,
        order: idx,
      }));
      await API.post("/buysellapi/dashboard-tabs/sync-defaults/", { tabs });
      toast.success("Dashboard tabs synced from frontend menu");
      // Refresh allowed tabs
      const resp = await API.get("/buysellapi/dashboard-tabs/");
      const tabsResp = Array.isArray(resp.data) ? resp.data : [];
      setAllowedTabs(tabsResp.map((t) => t.slug));
      const meta = {};
      tabsResp.forEach((t) => {
        meta[t.slug] = {
          assigned: Boolean(t.assigned),
          assignedToAll: Boolean(t.assigned_to_all_admins),
        };
      });
      setAllowedTabsMeta(meta);
    } catch (err) {
      console.error("Failed to sync tabs:", err);
      toast.error("Failed to sync dashboard tabs");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    toast.success("Logged out successfully");
    navigate("/admin-login");
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  // const markNotificationAsRead = (id) => {
  //   setNotifications(
  //     notifications.map((notification) =>
  //       notification.id === id ? { ...notification, read: true } : notification
  //     )
  //   );
  // };

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              Dashboard Overview
            </h2>
            {dashboardLoading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : dashboardError ? (
              <div className="text-red-500">{dashboardError}</div>
            ) : (
              dashboardData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                        <FaUsers className="text-2xl text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Total Users
                        </h3>
                        <p className="text-3xl font-bold text-blue-600">
                          {dashboardData.totalUsers}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                        <FaShoppingCart className="text-2xl text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Total Orders
                        </h3>
                        <p className="text-3xl font-bold text-green-600">
                          {dashboardData.totalOrders}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                        <FaAlipay className="text-2xl text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Total Alipay Payments
                        </h3>
                        <p className="text-3xl font-bold text-purple-600">
                          {dashboardData.totalAlipayPayments}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                        <FaHandHoldingUsd className="text-2xl text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Total Buy4me Requests
                        </h3>
                        <p className="text-3xl font-bold text-yellow-600">
                          {dashboardData.totalBuy4meRequests}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-pink-100 dark:bg-pink-900 rounded-full">
                        <FaTag className="text-2xl text-pink-600 dark:text-pink-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Total Shipping Marks
                        </h3>
                        <p className="text-3xl font-bold text-pink-600">
                          {dashboardData.totalShippingMarks}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                        <FaBox className="text-2xl text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Total Products
                        </h3>
                        <p className="text-3xl font-bold text-orange-600">
                          {dashboardData.totalProducts}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-teal-100 dark:bg-teal-900 rounded-full">
                        <FaUserTag className="text-2xl text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Total Agents
                        </h3>
                        <p className="text-3xl font-bold text-teal-600">
                          {dashboardData.totalAgents}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-full">
                        <FaExchangeAlt className="text-2xl text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Alipay Rate (GHS→CNY)
                        </h3>
                        <p className="text-3xl font-bold text-indigo-600">
                          {dashboardData.exchangeRate ?? "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        );
      case "users":
        return <UsersManagement />;
      case "training":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              Training Management
            </h2>
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <div className="flex flex-wrap">
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    trainingSubMenu === "paidCourses"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setTrainingSubMenu("paidCourses")}
                >
                  <div className="flex items-center gap-2">
                    <FaGraduationCap className="w-4 h-4" />
                    <span>Paid Courses</span>
                  </div>
                </button>

                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    trainingSubMenu === "bookings"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setTrainingSubMenu("bookings")}
                >
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="w-4 h-4" />
                    <span>Training Bookings</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-12">
              {trainingSubMenu === "paidCourses" ? (
                <section>
                  <PaidCourseManagement />
                </section>
              ) : (
                <section>
                  <TrainingManagement showCoursesTab={false} />
                </section>
              )}
            </div>
          </div>
        );
      case "youtube":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              YouTube Management
            </h2>
            <YouTubeManagement />
          </div>
        );
      case "shipping":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Shipping Management
            </h2>

            {/* Shipping Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <div className="flex flex-wrap">
                {/* 1. Trackingnumber */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shippingSubMenu === "tracking"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShippingSubMenu("tracking")}
                >
                  <div className="flex items-center gap-2">
                    <FaTruck className="w-4 h-4" />
                    <span>Tracking Numbers</span>
                  </div>
                </button>

                {/* 2. Container */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shippingSubMenu === "containers"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShippingSubMenu("containers")}
                >
                  <div className="flex items-center gap-2">
                    <FaBox className="w-4 h-4" />
                    <span>Containers</span>
                  </div>
                </button>

                {/* 3. Invoices */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shippingSubMenu === "invoices"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShippingSubMenu("invoices")}
                >
                  <div className="flex items-center gap-2">
                    <FaFileInvoice className="w-4 h-4" />
                    <span>Invoices</span>
                  </div>
                </button>

                {/* 4. Shipping Rates */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shippingSubMenu === "rates"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShippingSubMenu("rates")}
                >
                  <div className="flex items-center gap-2">
                    <FaDollarSign className="w-4 h-4" />
                    <span>Shipping Rates</span>
                  </div>
                </button>

                {/* 5. Address Management */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shippingSubMenu === "addresses"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShippingSubMenu("addresses")}
                >
                  <div className="flex items-center gap-2">
                    <FaMapMarkerAlt className="w-4 h-4" />
                    <span>Address Management</span>
                  </div>
                </button>

                {/* Keep Shipping Marks Viewer at the end */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shippingSubMenu === "shipping-marks"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShippingSubMenu("shipping-marks")}
                >
                  <div className="flex items-center gap-2">
                    <FaTag className="w-4 h-4" />
                    <span>Shipping Marks Viewer</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Shipping Content */}
            {shippingSubMenu === "tracking" ? (
              <TrackingManagement />
            ) : shippingSubMenu === "containers" ? (
              <ContainerManagement />
            ) : shippingSubMenu === "invoices" ? (
              <InvoicesManagement />
            ) : shippingSubMenu === "rates" ? (
              <ShippingRatesManagement />
            ) : shippingSubMenu === "addresses" ? (
              <ShippingAddressesAdmin />
            ) : (
              <ShippingMarksAdmin />
            )}
          </div>
        );
      case "buy4me":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Buy4me Management
            </h2>
            <Buy4meAdmin />
          </div>
        );
      case "quick-orders":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Quick Order Products
            </h2>
            <QuickOrderProducts />
          </div>
        );
      case "alipay-payments":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Alipay Payments
            </h2>
            <AlipayManagement />
          </div>
        );
      case "orders":
        return <OrderManagement />;
      case "products":
        return <AdminProducts />;
      case "categories":
        return <CategoriesTypesManagement />;
      case "analytics":
        return <Analytics />;
      case "gallery":
        return <GalleryManagement />;
      case "agents":
        return <AgentManagement />;
      default:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
            </h2>
            <p>This section is under development.</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${darkMode ? "dark" : ""}`}>
      {/* Sidebar */}
      <div
        className={`bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-20"
        } fixed h-full flex flex-col`}
      >
        {/* Header - Fixed */}
        <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
          {isSidebarOpen && (
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
              Admin Panel
            </h1>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
          >
            {isSidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
          {/* Loading indicator for allowedTabs */}
          {allowedTabs === null && (
            <div className="ml-2">
              <div
                className="w-4 h-4 border-2 border-t-2 border-gray-300 rounded-full animate-spin"
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {/* Menu Items - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="space-y-2">
              {(() => {
                // Decide which menu items to show based on allowedTabs.
                // Dashboard is always visible. If allowedTabs === null (not loaded), show the default menu.
                const itemsToRender =
                  allowedTabs === null
                    ? menuItems
                    : menuItems.filter((item) =>
                        item.section === "dashboard"
                          ? true
                          : allowedTabs.includes(item.section)
                      );

                return itemsToRender.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveSection(item.section)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                      activeSection === item.section
                        ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    {isSidebarOpen && (
                      <span className="flex items-center space-x-2">
                        <span>{item.label}</span>
                        {allowedTabsMeta[item.section]?.assignedToAll && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                            All
                          </span>
                        )}
                        {allowedTabsMeta[item.section]?.assigned &&
                          !allowedTabsMeta[item.section]?.assignedToAll && (
                            <span className="ml-2 w-2 h-2 rounded-full bg-green-500 inline-block" />
                          )}
                      </span>
                    )}
                  </button>
                ));
              })()}
            </div>

            {/* Show a small hint when tabs loaded but none assigned (for admins and regular users) */}
            {allowedTabs !== null &&
              Array.isArray(allowedTabs) &&
              allowedTabs.length === 0 &&
              currentUser &&
              !currentUser.is_superuser && (
                <div className="mt-4 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-amber-800 dark:text-amber-200">
                  No dashboard tabs have been assigned to your account by the
                  superadmin. Please contact the superadmin to get access.
                </div>
              )}
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="p-4 border-t dark:border-gray-700">
          <div className="space-y-2">
            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center space-x-3 p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {darkMode ? (
                <FaSun className="text-xl" />
              ) : (
                <FaMoon className="text-xl" />
              )}
              {isSidebarOpen && (
                <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 p-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <FaSignOutAlt className="text-xl" />
              {isSidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? "ml-64" : "ml-20"
        }`}
      >
        {/* Top Bar */}
        <div className="bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-between items-center">
          <div></div>

          <div className="flex items-center space-x-4">
            {/* Admin identity */}
            {currentUser && (
              <div className="hidden sm:flex flex-col items-end mr-2 max-w-[220px]">
                <span className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                  {currentUser.username}
                  {currentUser.is_superuser
                    ? " (Superadmin)"
                    : currentUser.role === "admin"
                    ? " (Admin)"
                    : ""}
                </span>
                {currentUser.email ? (
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {currentUser.email}
                  </span>
                ) : null}
              </div>
            )}
            {currentUser && currentUser.is_superuser && (
              <button
                onClick={syncDefaultTabs}
                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm"
                title="Create/update dashboard tabs from frontend menu"
              >
                Sync Tabs
              </button>
            )}

            <button
              onClick={toggleDarkMode}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
            >
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white relative"
              >
                <FaBell className="text-xl" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                  {/* Header */}
                  <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-sm text-primary hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <FaBell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No notifications</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markNotificationAsRead(notif.id)}
                          className={`p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                            !notif.read ? "bg-blue-50 dark:bg-blue-900/20" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800 dark:text-white">
                                {notif.message}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {notif.time}
                              </p>
                            </div>
                            {!notif.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="p-3 border-t dark:border-gray-700 text-center">
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-sm text-primary hover:underline"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              <FaSignOutAlt />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;
