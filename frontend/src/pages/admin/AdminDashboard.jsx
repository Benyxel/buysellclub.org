import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "../../utils/toast";
import API, { getLiveChatUnreadCount, markAllLiveChatRead, getCachedData, setCachedData, CACHE_DURATION, clearCache } from "../../api";
import { storageCache } from "../../utils/storageCache";

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
  FaBullhorn,
  FaDollarSign,
  FaUserTag,
  FaCalendarAlt,
  FaBuilding,
  FaHandshake,
  FaTicketAlt,
  FaGift,
  FaEnvelope,
  FaMotorcycle,
  FaFilePdf,
  FaChevronDown,
  FaThList,
  FaShoppingBag,
  FaCrown,
  FaIdCard,
  FaUserShield,
} from "react-icons/fa";

import UsersManagement from "./UsersManagement";
import AdminsManagement from "./AdminsManagement";
import AdminProducts from "./AdminProducts";
import AdminDigitalProducts from "./AdminDigitalProducts";
import TrackingManagement from "./TrackingManagement";
import QuickTrackingNotesManagement from "./QuickTrackingNotesManagement";
import ShippingMarksAdmin from "./ShippingMarksAdmin";
import ShippingAddressesAdmin from "./ShippingAddressesAdmin";
import WarehouseAddressesManagement from "./WarehouseAddressesManagement";
import ShippingRatesManagement from "./ShippingRatesManagement";
import AdShippingRatesManagement from "./AdShippingRatesManagement";
import AirAdShippingServicesManagement from "./AirAdShippingServicesManagement";
import ContainerManagement from "../../components/ContainerManagement";
import ContainerExpensesManagement from "./ContainerExpensesManagement";
import InvoicesManagement from "./InvoicesManagement";
import ShippingPaymentProofsManagement from "./ShippingPaymentProofsManagement";
import ChinaExcelUploadsManagement from "./ChinaExcelUploadsManagement";
import Buy4meAdmin from "./Buy4meAdmin";
import QuickOrderProducts from "./QuickOrderProducts";
import WholesaleRequestsAdmin from "./WholesaleRequestsAdmin";
import WholesaleVisitStatsCards from "./WholesaleVisitStatsCards";
import AlipayManagement from "./AlipayManagement";
import AlipayBuyingRateManagement from "./AlipayBuyingRateManagement";
import TrainingManagement from "./TrainingManagement";
import PaidCourseManagement from "./PaidCourseManagement";
import YouTubeManagement from "./YouTubeManagement";
import HomeAnnouncementManagement from "./HomeAnnouncementManagement";
import OrderManagement from "./OrderManagement";
import CategoriesTypesManagement from "./CategoriesTypesManagement";
import Analytics from "./Analytics";
import GalleryManagement from "./GalleryManagement";
import AgentTrackingManagement from "./AgentTrackingManagement";
import AgentContainerManagement from "./AgentContainerManagement";
import LiveChatAdminPanel from "./LiveChatAdminPanel";
import AdminAgentTickets from "./AdminAgentTickets";
import MaintenanceManagement from "./MaintenanceManagement";
const AgentShippingRatesManagement = React.lazy(() =>
  import("./AgentShippingRatesManagement.jsx")
);
import AgentAddressManagement from "./AgentAddressManagement";
import AgentShippingMarksManagement from "./AgentShippingMarksManagement";
import AgentRequestsManagement from "./AgentRequestsManagement";
import CorporateAgentManagement from "./CorporateAgentManagement";
import LocalAgentManagement from "./LocalAgentManagement";
import AffiliateAgentManagement from "./AffiliateAgentManagement";
import LocalAgentSettingsManagement from "./LocalAgentSettingsManagement";
import LocalAgentRewardClaims from "./LocalAgentRewardClaims";
import CommunityManagement from "./CommunityManagement";
import ExecutiveMembersManagement from "./ExecutiveMembersManagement";
import CardHoldersManagement from "./CardHoldersManagement";
import BulkEmailAdmin from "./BulkEmailAdmin";
import VendorManagement from "./VendorManagement";
import AdminVendorPayoutRequests from "./AdminVendorPayoutRequests";
import StaffClockRecords from "./StaffClockRecords";
import RiderManagementPanel from "./delivery/RiderManagementPanel";
import DeliveryRequestsPanel from "./delivery/DeliveryRequestsPanel";
import BulkOutsideAccraRequestsPanel from "./delivery/BulkOutsideAccraRequestsPanel";
import "react-toastify/dist/ReactToastify.css";

/** Sections grouped under sidebar "Quick Tabs" (Shipping through Agent Management). */
const QUICK_TABS_SECTIONS = [
  "shipping",
  "delivery",
  "alipay-payments",
  "alipay-buying-rate",
  "buy4me",
  "agents",
];
const quickTabsSectionSet = new Set(QUICK_TABS_SECTIONS);

/** Sections grouped under sidebar "E-commerce" (Shop, Wholesale Orders, Orders). */
const ECOMMERCE_SECTIONS = ["shop", "quick-orders", "orders"];
const ecommerceSectionSet = new Set(ECOMMERCE_SECTIONS);

/** Sections grouped under sidebar "Membership" (Community, Executive Members). */
const MEMBERSHIP_SECTIONS = ["community", "executive-members", "card-holders"];
const membershipSectionSet = new Set(MEMBERSHIP_SECTIONS);

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

  // Initialize agent submenu from URL or localStorage
  const getInitialAgentSubMenu = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const subMenuFromUrl = urlParams.get("agentSubMenu");
    if (subMenuFromUrl) return subMenuFromUrl;

    const savedSubMenu = localStorage.getItem("adminAgentSubMenu");
    return savedSubMenu || "tracking";
  };

  // Initialize training submenu from URL or localStorage
  const getInitialTrainingSubMenu = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const subMenuFromUrl = urlParams.get("trainingSubMenu");
    if (subMenuFromUrl) return subMenuFromUrl;

    const savedSubMenu = localStorage.getItem("adminTrainingSubMenu");
    return savedSubMenu || "paidCourses";
  };

  const getInitialShopSubMenu = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const subMenuFromUrl = urlParams.get("shopSubMenu");
    if (subMenuFromUrl) return subMenuFromUrl;

    const savedSubMenu = localStorage.getItem("adminShopSubMenu");
    return savedSubMenu || "products";
  };

  const getInitialWholesaleSubMenu = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const subMenuFromUrl = urlParams.get("wholesaleSubMenu");
    if (subMenuFromUrl) return subMenuFromUrl;

    const savedSubMenu = localStorage.getItem("adminWholesaleSubMenu");
    return savedSubMenu || "products";
  };

  const getInitialDeliverySubMenu = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const subMenuFromUrl = urlParams.get("deliverySubMenu");
    if (subMenuFromUrl) return subMenuFromUrl;

    const savedSubMenu = localStorage.getItem("adminDeliverySubMenu");
    return savedSubMenu || "riders";
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
  
  // Initialize dark mode from localStorage or default to true (dark mode)
  const getInitialDarkMode = () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme === "dark";
    }
    // Default to dark mode
    return true;
  };
  
  const [darkMode, setDarkMode] = useState(getInitialDarkMode());
  
  // Apply dark mode class on mount
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);
  const [shippingSubMenu, setShippingSubMenu] = useState(
    getInitialShippingSubMenu()
  );
  const [agentSubMenu, setAgentSubMenu] = useState(getInitialAgentSubMenu());
  const [messageSubMenu, setMessageSubMenu] = useState("live-chat");
  const [trainingSubMenu, setTrainingSubMenu] = useState(
    getInitialTrainingSubMenu()
  );
  const [shopSubMenu, setShopSubMenu] = useState(getInitialShopSubMenu());
  const [wholesaleSubMenu, setWholesaleSubMenu] = useState(
    getInitialWholesaleSubMenu()
  );
  const [deliverySubMenu, setDeliverySubMenu] = useState(
    getInitialDeliverySubMenu()
  );
  const getInitialAnalyticsTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get("analyticsTab");
    if (tabFromUrl) return tabFromUrl;
    const savedTab = localStorage.getItem("adminAnalyticsTab");
    return savedTab || "overview";
  };
  const [analyticsTab, setAnalyticsTab] = useState(getInitialAnalyticsTab);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatRefreshSignal, setChatRefreshSignal] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({
    alipay: 0,
    buy4me: 0,
    wholesale: 0,
    orders: 0,
    digital_orders: 0,
    training: 0,
    community: 0,
    agentRequests: 0,
    localAgentRequests: 0,
    rewardClaims: 0,
    delivery: 0,
    vendorApplications: 0,
    vendorPayoutRequests: 0,
    shippingPaymentProofs: 0,
  });
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);
  const [flippedCards, setFlippedCards] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [allowedTabs, setAllowedTabs] = useState(null); // null = not loaded, [] = loaded but none
  const [allowedTabsMeta, setAllowedTabsMeta] = useState({});
  const [quickTabsOpen, setQuickTabsOpen] = useState(false);
  const quickTabsWrapRef = useRef(null);
  const quickTabsTriggerRef = useRef(null);
  const quickTabsFlyoutRef = useRef(null);
  const [quickFlyoutPos, setQuickFlyoutPos] = useState(null);
  const [ecommerceOpen, setEcommerceOpen] = useState(false);
  const ecommerceWrapRef = useRef(null);
  const ecommerceTriggerRef = useRef(null);
  const ecommerceFlyoutRef = useRef(null);
  const [ecommerceFlyoutPos, setEcommerceFlyoutPos] = useState(null);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const membershipWrapRef = useRef(null);
  const membershipTriggerRef = useRef(null);
  const membershipFlyoutRef = useRef(null);
  const [membershipFlyoutPos, setMembershipFlyoutPos] = useState(null);

  // Refs to prevent duplicate toasts in StrictMode
  const welcomeToastShown = useRef(false);
  const sessionExpiredToastShown = useRef(false);

  const menuItems = useMemo(
    () => [
      { icon: <FaHome />, label: "Dashboard", section: "dashboard" },
      { icon: <FaUsers />, label: "Users", section: "users" },
      { icon: <FaUserShield />, label: "Admins", section: "admins" },
      { icon: <FaShippingFast />, label: "Shipping", section: "shipping" },
      { icon: <FaMotorcycle />, label: "Delivery", section: "delivery" },
      {
        icon: <FaAlipay />,
        label: "Alipay Payments",
        section: "alipay-payments",
      },
      {
        icon: <FaExchangeAlt />,
        label: "Alipay Buying Rate",
        section: "alipay-buying-rate",
      },
      { icon: <FaHandHoldingUsd />, label: "Buy4me", section: "buy4me" },
      { icon: <FaUserTag />, label: "Agent Management", section: "agents" },
      { icon: <FaComments />, label: "Messages", section: "messages" },
      { icon: <FaEnvelope />, label: "Bulk Email", section: "bulk-email" },
      { icon: <FaUsers />, label: "Community", section: "community" },
      {
        icon: <FaCrown />,
        label: "Executive Members",
        section: "executive-members",
      },
      {
        icon: <FaIdCard />,
        label: "Card Holders",
        section: "card-holders",
      },
      { icon: <FaShoppingCart />, label: "Orders", section: "orders" },
      { icon: <FaGraduationCap />, label: "Training", section: "training" },
      { icon: <FaStore />, label: "Shop", section: "shop" },
      { icon: <FaYoutube />, label: "YouTube", section: "youtube" },
      {
        icon: <FaBullhorn />,
        label: "Home Announcements",
        section: "home-announcements",
      },
      { icon: <FaVideo />, label: "Gallery", section: "gallery" },
      {
        icon: <FaClipboardList />,
        label: "Wholesale Orders",
        section: "quick-orders",
      },
      { icon: <FaChartBar />, label: "Analytics", section: "analytics" },
      { icon: <FaUserCog />, label: "Staff", section: "staff" },
      { icon: <FaCog />, label: "Settings", section: "settings" },
    ],
    []
  );

  // Fetch admin notifications from backend - cache for 30 seconds
  const fetchAdminNotifications = async () => {
    const cacheKey = 'admin-notifications';
    
    // Check cache first
    const cached = getCachedData(cacheKey);
    if (cached) {
      setNotifications(cached.notifications || []);
      setUnreadCount(cached.unreadCount || 0);
      return;
    }
    
    try {
      // Check if admin token exists before fetching
      const adminToken = localStorage.getItem("adminToken");
      if (!adminToken) {
        console.log("No admin token found, skipping notification fetch");
        return;
      }

      const response = await API.get(
        "/buysellapi/admin/notifications/me/?limit=20",
        { cacheDuration: CACHE_DURATION.SHORT } // 30 seconds
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
      
      // Cache the result
      setCachedData(cacheKey, {
        notifications: transformedNotifications,
        unreadCount: data.unread_count || 0,
      }, CACHE_DURATION.SHORT);
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
      // Clear cache and refresh notifications
      clearCache('admin-notifications');
      fetchAdminNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await API.post("/buysellapi/notifications/mark-all-read/");
      // Clear cache and refresh notifications
      clearCache('admin-notifications');
      fetchAdminNotifications();
      toast.success("All notifications marked as read", {
        toastId: "mark-all-read-success",
      });
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark notifications as read", {
        toastId: "mark-all-read-error",
      });
    }
  };

  // Fetch unread counts for tabs - cache for 30 seconds
  const fetchUnreadCounts = async () => {
    const cacheKey = 'admin-unread-counts';
    
    // Check cache first
    const cached = getCachedData(cacheKey);
    if (cached) {
      setUnreadCounts(cached);
      return;
    }
    
    try {
      const response = await API.get("/buysellapi/admin/unread-counts/", {
        cacheDuration: CACHE_DURATION.SHORT, // 30 seconds
      });
      if (response?.data) {
        const counts = {
          alipay: response.data.alipay || 0,
          buy4me: response.data.buy4me || 0,
          wholesale: response.data.wholesale || 0,
          orders: response.data.orders || 0,
          digital_orders: response.data.digital_orders || 0,
          training: response.data.training || 0,
          community: response.data.community_pending || 0,
          agentRequests: response.data.agent_requests || 0,
          localAgentRequests: response.data.local_agent_requests || 0,
          rewardClaims: response.data.reward_claims || 0,
          delivery: response.data.delivery_requests || 0,
          vendorApplications: response.data.vendor_applications || 0,
          vendorPayoutRequests: response.data.vendor_payout_requests || 0,
          shippingPaymentProofs: response.data.shipping_payment_proofs || 0,
        };
        setUnreadCounts(counts);
        
        // Cache the result
        setCachedData(cacheKey, counts, CACHE_DURATION.SHORT);
      }
    } catch (error) {
      // Fail silently - don't show error for counts
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        console.error("Error fetching unread counts:", error);
      }
    }
  };

  const fetchLiveChatUnreadCount = async () => {
    const cacheKey = 'live-chat-unread-count';
    
    // Check cache first
    const cached = getCachedData(cacheKey);
    if (cached !== null && cached !== undefined) {
      setChatUnreadCount(cached);
      return;
    }
    
    try {
      const resp = await getLiveChatUnreadCount();
      const count = resp.data?.unread_count || 0;
      setChatUnreadCount(count);
      
      // Cache the result
      setCachedData(cacheKey, count, CACHE_DURATION.SHORT);
    } catch (error) {
      console.error("Failed to load chat unread count:", error);
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
        totalDigitalPurchases: data.totalDigitalPurchases || 0,
        totalDigitalSalesGHS: data.totalDigitalSalesGHS ?? 0,
        totalAlipayPaymentsGHS: data.totalAlipayPaymentsGHS ?? 0,
        totalAlipayPaymentsCNY: data.totalAlipayPaymentsCNY ?? 0,
        totalBuy4meRequests: data.totalBuy4meRequests || 0,
        totalShippingMarks: data.totalShippingMarks || 0,
        totalProducts: data.totalProducts || 0,
        totalAgents: data.totalAgents || 0,
        exchangeRate:
          data.exchangeRate !== undefined && data.exchangeRate !== null
            ? data.exchangeRate
            : null,
        totalTrainingBookings: data.totalTrainingBookings ?? 0,
        communityTotalRegistered: data.communityTotalRegistered ?? 0,
        communityTotalCash: data.communityTotalCash ?? 0,
        executiveTotalRegistered: data.executiveTotalRegistered ?? 0,
        executiveTotalCash: data.executiveTotalCash ?? 0,
        membershipTotalCash: data.membershipTotalCash ?? 0,
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

    // Also persist agent submenu if we're in agents section
    if (activeSection === "agents") {
      url.searchParams.set("agentSubMenu", agentSubMenu);
    } else {
      url.searchParams.delete("agentSubMenu");
    }

    // Also persist analytics tab if we're in analytics section
    if (activeSection === "analytics") {
      url.searchParams.set("analyticsTab", analyticsTab);
    } else {
      url.searchParams.delete("analyticsTab");
    }

    // Also persist training submenu if we're in training section
    if (activeSection === "training") {
      url.searchParams.set("trainingSubMenu", trainingSubMenu);
    } else {
      url.searchParams.delete("trainingSubMenu");
    }

    // Also persist shop submenu if we're in shop section
    if (activeSection === "shop") {
      url.searchParams.set("shopSubMenu", shopSubMenu);
    } else {
      url.searchParams.delete("shopSubMenu");
    }

    if (activeSection === "delivery") {
      url.searchParams.set("deliverySubMenu", deliverySubMenu);
    } else {
      url.searchParams.delete("deliverySubMenu");
    }

    window.history.replaceState({}, "", url);
  }, [
    activeSection,
    shippingSubMenu,
    agentSubMenu,
    analyticsTab,
    trainingSubMenu,
    shopSubMenu,
    deliverySubMenu,
  ]);

  // Persist shippingSubMenu to localStorage
  useEffect(() => {
    localStorage.setItem("adminShippingSubMenu", shippingSubMenu);
  }, [shippingSubMenu]);

  // Persist agentSubMenu to localStorage
  useEffect(() => {
    localStorage.setItem("adminAgentSubMenu", agentSubMenu);
  }, [agentSubMenu]);

  // Persist trainingSubMenu to localStorage
  useEffect(() => {
    localStorage.setItem("adminTrainingSubMenu", trainingSubMenu);
  }, [trainingSubMenu]);

  // Persist shopSubMenu to localStorage
  useEffect(() => {
    localStorage.setItem("adminShopSubMenu", shopSubMenu);
  }, [shopSubMenu]);

  useEffect(() => {
    localStorage.setItem("adminWholesaleSubMenu", wholesaleSubMenu);
  }, [wholesaleSubMenu]);

  // Persist deliverySubMenu to localStorage
  useEffect(() => {
    localStorage.setItem("adminDeliverySubMenu", deliverySubMenu);
  }, [deliverySubMenu]);

  // Persist analyticsTab to localStorage
  useEffect(() => {
    localStorage.setItem("adminAnalyticsTab", analyticsTab);
  }, [analyticsTab]);

  useEffect(() => {
    if (!quickTabsOpen) return;
    const onDocMouseDown = (e) => {
      const t = e.target;
      if (quickTabsWrapRef.current?.contains(t)) return;
      if (quickTabsFlyoutRef.current?.contains(t)) return;
      setQuickTabsOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [quickTabsOpen]);

  useLayoutEffect(() => {
    if (!quickTabsOpen || isSidebarOpen) {
      setQuickFlyoutPos(null);
      return;
    }
    const el = quickTabsTriggerRef.current;
    if (!el) {
      setQuickFlyoutPos(null);
      return;
    }
    const update = () => {
      const r = el.getBoundingClientRect();
      const gap = 10;
      const panelWidth = 268;
      let left = r.right + gap;
      if (left + panelWidth > window.innerWidth - 12) {
        left = Math.max(12, r.left - panelWidth - gap);
      }
      let top = r.top;
      const maxH = Math.max(160, window.innerHeight - top - 16);
      setQuickFlyoutPos({ top, left, maxHeight: maxH });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [quickTabsOpen, isSidebarOpen]);

  useEffect(() => {
    if (!ecommerceOpen) return;
    const onDocMouseDown = (e) => {
      const t = e.target;
      if (ecommerceWrapRef.current?.contains(t)) return;
      if (ecommerceFlyoutRef.current?.contains(t)) return;
      setEcommerceOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [ecommerceOpen]);

  useLayoutEffect(() => {
    if (!ecommerceOpen || isSidebarOpen) {
      setEcommerceFlyoutPos(null);
      return;
    }
    const el = ecommerceTriggerRef.current;
    if (!el) {
      setEcommerceFlyoutPos(null);
      return;
    }
    const update = () => {
      const r = el.getBoundingClientRect();
      const gap = 10;
      const panelWidth = 268;
      let left = r.right + gap;
      if (left + panelWidth > window.innerWidth - 12) {
        left = Math.max(12, r.left - panelWidth - gap);
      }
      let top = r.top;
      const maxH = Math.max(160, window.innerHeight - top - 16);
      setEcommerceFlyoutPos({ top, left, maxHeight: maxH });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [ecommerceOpen, isSidebarOpen]);

  useEffect(() => {
    if (!membershipOpen) return;
    const onDocMouseDown = (e) => {
      const t = e.target;
      if (membershipWrapRef.current?.contains(t)) return;
      if (membershipFlyoutRef.current?.contains(t)) return;
      setMembershipOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [membershipOpen]);

  useLayoutEffect(() => {
    if (!membershipOpen || isSidebarOpen) {
      setMembershipFlyoutPos(null);
      return;
    }
    const el = membershipTriggerRef.current;
    if (!el) {
      setMembershipFlyoutPos(null);
      return;
    }
    const update = () => {
      const r = el.getBoundingClientRect();
      const gap = 10;
      const panelWidth = 268;
      let left = r.right + gap;
      if (left + panelWidth > window.innerWidth - 12) {
        left = Math.max(12, r.left - panelWidth - gap);
      }
      let top = r.top;
      const maxH = Math.max(160, window.innerHeight - top - 16);
      setMembershipFlyoutPos({ top, left, maxHeight: maxH });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [membershipOpen, isSidebarOpen]);

  useEffect(() => {
    // Only fetch dashboard data the first time we visit the dashboard
    // (or when dashboardData is explicitly cleared). This prevents
    // repeated network requests every time the user clicks the
    // Dashboard tab.
    if (activeSection === "dashboard" && dashboardData == null) {
      fetchDashboardData();
    }
  }, [activeSection]);

  // Fetch admin notifications on mount and periodically (reduced frequency)
  useEffect(() => {
    fetchAdminNotifications();
    fetchLiveChatUnreadCount();
    fetchUnreadCounts();

    const interval = setInterval(() => {
      // Only fetch if cache is stale or missing
      const notificationsCache = getCachedData('admin-notifications');
      const unreadCache = getCachedData('admin-unread-counts');
      const chatCache = getCachedData('live-chat-unread-count');
      
      if (!notificationsCache) fetchAdminNotifications();
      if (!unreadCache) fetchUnreadCounts();
      if (!chatCache) fetchLiveChatUnreadCount();
    }, 60000); // Changed from 15 seconds to 60 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeSection !== "messages") return;
    const markAll = async () => {
      try {
        await markAllLiveChatRead();
        setChatRefreshSignal((prev) => prev + 1);
        fetchLiveChatUnreadCount();
      } catch (error) {
        console.error("Failed to mark chat messages read:", error);
      }
    };
    markAll();
  }, [activeSection]);

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
            toastId: "session-expired-toast",
          });
          navigate("/admin-login");
        } else {
          console.error("Failed to load current user:", err);
        }
      }
    };

    fetchMe();
  }, [navigate]);

  // Fetch allowed dashboard tabs for this admin user
  const fetchTabs = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      // Add cache-busting timestamp to ensure fresh data in production
      const resp = await API.get("/buysellapi/dashboard-tabs/", {
        params: { _t: Date.now() }
      });
      const tabs = Array.isArray(resp.data) ? resp.data : [];
      // Use tabs returned by the backend to determine which sections
      // the current admin is allowed to see.
      const slugs = tabs.map((t) => t.slug);
      const meta = {};
      tabs.forEach((t) => {
        meta[t.slug] = {
          assigned: Boolean(t.assigned),
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
  }, [currentUser, menuItems]);

  // Fetch tabs when currentUser changes or menuItems change
  useEffect(() => {
    if (currentUser) fetchTabs();
  }, [currentUser, menuItems, fetchTabs]);

  // Refetch tabs when window gains focus (user returns to tab/window)
  // This ensures tabs are refreshed if assigned while user is away
  useEffect(() => {
    const handleFocus = () => {
      if (currentUser && document.visibilityState === 'visible') {
        fetchTabs();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [currentUser, fetchTabs]);

  // Refetch tabs periodically to catch any changes (every 30 seconds)
  useEffect(() => {
    if (!currentUser) return;
    
    const interval = setInterval(() => {
      fetchTabs();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [currentUser, fetchTabs]);

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
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    }
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
      case "dashboard": {
        const communityRegistered = dashboardData?.communityTotalRegistered ?? 0;
        const communityTotalCash = dashboardData?.communityTotalCash ?? 0;
        const executiveRegistered = dashboardData?.executiveTotalRegistered ?? 0;
        const executiveTotalCash = dashboardData?.executiveTotalCash ?? 0;
        const membershipTotalCash = dashboardData?.membershipTotalCash ?? 0;
        const overviewCards =
          dashboardData
            ? [
                {
                  id: "users",
                  title: "Total Users",
                  icon: <FaUsers className="text-2xl text-blue-600 dark:text-blue-400" />,
                  value: (
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {dashboardData.totalUsers}
                    </p>
                  ),
                  accent: "bg-blue-100 dark:bg-blue-900",
                },
                {
                  id: "orders",
                  title: "Total Orders",
                  icon: (
                    <FaShoppingCart className="text-2xl text-green-600 dark:text-green-400" />
                  ),
                  value: (
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {dashboardData.totalOrders}
                    </p>
                  ),
                  accent: "bg-green-100 dark:bg-green-900",
                },
                {
                  id: "digital-store",
                  title: "Digital Store Sales",
                  icon: <FaFilePdf className="text-2xl text-emerald-600 dark:text-emerald-400" />,
                  value: (
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        ₵{Number(dashboardData.totalDigitalSalesGHS || 0).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Purchases: {dashboardData.totalDigitalPurchases || 0}
                      </p>
                    </div>
                  ),
                  accent: "bg-emerald-100 dark:bg-emerald-900",
                },
                {
                  id: "alipay",
                  title: "Total Alipay Payments",
                  icon: (
                    <FaAlipay className="text-2xl text-purple-600 dark:text-purple-400" />
                  ),
                  value: (
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        ₵{dashboardData.totalAlipayPaymentsGHS?.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) || "0.00"}
                      </p>
                      <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                        ¥{dashboardData.totalAlipayPaymentsCNY?.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) || "0.00"}
                      </p>
                    </div>
                  ),
                  accent: "bg-purple-100 dark:bg-purple-900",
                },
                {
                  id: "buy4me",
                  title: "Total Buy4me Requests",
                  icon: (
                    <FaHandHoldingUsd className="text-2xl text-yellow-600 dark:text-yellow-400" />
                  ),
                  value: (
                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      {dashboardData.totalBuy4meRequests}
                    </p>
                  ),
                  accent: "bg-yellow-100 dark:bg-yellow-900",
                },
                {
                  id: "marks",
                  title: "Total Shipping Marks",
                  icon: <FaTag className="text-2xl text-pink-600 dark:text-pink-400" />,
                  value: (
                    <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">
                      {dashboardData.totalShippingMarks}
                    </p>
                  ),
                  accent: "bg-pink-100 dark:bg-pink-900",
                },
                {
                  id: "products",
                  title: "Total Products",
                  icon: (
                    <FaBox className="text-2xl text-orange-600 dark:text-orange-400" />
                  ),
                  value: (
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {dashboardData.totalProducts}
                    </p>
                  ),
                  accent: "bg-orange-100 dark:bg-orange-900",
                },
                {
                  id: "agents",
                  title: "Total Agents",
                  icon: (
                    <FaUserTag className="text-2xl text-teal-600 dark:text-teal-400" />
                  ),
                  value: (
                    <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                      {dashboardData.totalAgents}
                    </p>
                  ),
                  accent: "bg-teal-100 dark:bg-teal-900",
                },
                {
                  id: "rate",
                  title: "Alipay Rate (GHS→CNY)",
                  icon: (
                    <FaExchangeAlt className="text-2xl text-indigo-600 dark:text-indigo-400" />
                  ),
                  value: (
                    <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                      {dashboardData.exchangeRate ?? "N/A"}
                    </p>
                  ),
                  accent: "bg-indigo-100 dark:bg-indigo-900",
                },
                {
                  id: "training",
                  title: "Total Training Bookings",
                  icon: (
                    <FaGraduationCap className="text-2xl text-emerald-600 dark:text-emerald-400" />
                  ),
                  value: (
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                      {dashboardData.totalTrainingBookings ?? 0}
                    </p>
                  ),
                  accent: "bg-emerald-100 dark:bg-emerald-900",
                },
                {
                  id: "communityRegistered",
                  title: "Community Registered",
                  icon: (
                    <FaBuilding className="text-2xl text-cyan-600 dark:text-cyan-400" />
                  ),
                  value: (
                    <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                      {communityRegistered}
                    </p>
                  ),
                  accent: "bg-cyan-100 dark:bg-cyan-900",
                },
                {
                  id: "communityCash",
                  title: "Community Payments",
                  icon: (
                    <FaDollarSign className="text-2xl text-lime-600 dark:text-lime-400" />
                  ),
                  value: (
                    <p className="text-3xl font-bold text-lime-600 dark:text-lime-400">
                      ₵{Number(communityTotalCash).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  ),
                  accent: "bg-lime-100 dark:bg-lime-900",
                },
                {
                  id: "executiveRegistered",
                  title: "Executive Members",
                  icon: <FaCrown className="text-2xl text-amber-600 dark:text-amber-400" />,
                  value: (
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                      {executiveRegistered}
                    </p>
                  ),
                  accent: "bg-amber-100 dark:bg-amber-900",
                },
                {
                  id: "executiveCash",
                  title: "Executive Payments",
                  icon: (
                    <FaDollarSign className="text-2xl text-orange-600 dark:text-orange-400" />
                  ),
                  value: (
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      ₵{Number(executiveTotalCash).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  ),
                  accent: "bg-orange-100 dark:bg-orange-900",
                },
                {
                  id: "membershipCash",
                  title: "Total Membership Payments",
                  icon: (
                    <FaDollarSign className="text-2xl text-emerald-600 dark:text-emerald-400" />
                  ),
                  value: (
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                      ₵{Number(membershipTotalCash).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  ),
                  accent: "bg-emerald-100 dark:bg-emerald-900",
                },
              ]
            : [];

        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              Dashboard Overview
            </h2>
            <style>{`
              .flip-card { perspective: 1000px; min-height: 170px; position: relative; }
              .flip-card-inner {
                position: relative;
                width: 100%;
                height: 100%;
                transform-style: preserve-3d;
                transition: transform 0.6s;
              }
              .flip-card.flipped .flip-card-inner {
                transform: rotateY(180deg);
              }
              .flip-card-face {
                position: absolute;
                inset: 0;
                backface-visibility: hidden;
              }
              .flip-card-back {
                transform: rotateY(180deg);
              }
            `}</style>
            {dashboardLoading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : dashboardError ? (
              <div className="text-red-500 dark:text-red-400">{dashboardError}</div>
            ) : (
              dashboardData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {overviewCards.map((card) => (
                    <div
                      key={card.id}
                      className={`flip-card ${flippedCards[card.id] ? "flipped" : ""}`}
                      onClick={() =>
                        setFlippedCards((prev) => ({
                          ...prev,
                          [card.id]: !prev[card.id],
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setFlippedCards((prev) => ({
                            ...prev,
                            [card.id]: !prev[card.id],
                          }));
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flip-card-inner">
                        <div className="flip-card-face">
                          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md min-h-[150px]">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-full ${card.accent}`}>
                                {card.icon}
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                                  {card.title}
                                </h3>
                                {card.value}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flip-card-face flip-card-back">
                          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md min-h-[150px] flex flex-col justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                {card.title}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                Click to flip back.
                              </p>
                            </div>
                            <div>{card.value}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        );
      }
      case "users":
        return <UsersManagement />;
      case "admins":
        return <AdminsManagement />;
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
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              YouTube Management
            </h2>
            <YouTubeManagement />
          </div>
        );
      case "home-announcements":
        return (
          <div className="p-6">
            <HomeAnnouncementManagement />
          </div>
        );
      case "delivery":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Delivery
            </h2>

            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <div className="flex flex-wrap">
                <button
                  type="button"
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    deliverySubMenu === "riders"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setDeliverySubMenu("riders")}
                >
                  <div className="flex items-center gap-2">
                    <FaUserTag className="w-4 h-4" />
                    <span>Rider management</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    deliverySubMenu === "requests"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setDeliverySubMenu("requests")}
                >
                  <div className="flex items-center gap-2">
                    <FaClipboardList className="w-4 h-4" />
                    <span>Delivery requests</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    deliverySubMenu === "bulk-outside-accra"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setDeliverySubMenu("bulk-outside-accra")}
                >
                  <div className="flex items-center gap-2">
                    <FaClipboardList className="w-4 h-4" />
                    <span>Bulk delivery (Outside Accra)</span>
                  </div>
                </button>
              </div>
            </div>

            {deliverySubMenu === "riders" ? (
              <RiderManagementPanel />
            ) : deliverySubMenu === "bulk-outside-accra" ? (
              <BulkOutsideAccraRequestsPanel />
            ) : (
              <DeliveryRequestsPanel />
            )}
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

                {/* 1b. Quick Tracking Notes */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shippingSubMenu === "quick-tracking-notes"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShippingSubMenu("quick-tracking-notes")}
                >
                  <div className="flex items-center gap-2">
                    <FaBookmark className="w-4 h-4" />
                    <span>Quick Tracking Notes</span>
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

                {/* 2b. Container Expenses */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shippingSubMenu === "container-expenses"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShippingSubMenu("container-expenses")}
                >
                  <div className="flex items-center gap-2">
                    <FaDollarSign className="w-4 h-4" />
                    <span>Container Expenses</span>
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

                {/* 3b. Shipping payment proofs */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shippingSubMenu === "payment-proofs"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShippingSubMenu("payment-proofs")}
                >
                  <div className="flex items-center gap-2">
                    <FaFileInvoice className="w-4 h-4" />
                    <span>Payment Proofs</span>
                    {unreadCounts.shippingPaymentProofs > 0 && (
                      <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                        {unreadCounts.shippingPaymentProofs > 99
                          ? "99+"
                          : unreadCounts.shippingPaymentProofs}
                      </span>
                    )}
                  </div>
                </button>

                {/* 3c. China Excel uploads */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shippingSubMenu === "china-excel"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShippingSubMenu("china-excel")}
                >
                  <div className="flex items-center gap-2">
                    <FaFileInvoice className="w-4 h-4" />
                    <span>China Excel</span>
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

                {/* 5. Ad Shipping Rates */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shippingSubMenu === "ad-rates"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShippingSubMenu("ad-rates")}
                >
                  <div className="flex items-center gap-2">
                    <FaDollarSign className="w-4 h-4" />
                    <span>Ad Shipping Rates</span>
                  </div>
                </button>

                {/* 6. Air Ad Services */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shippingSubMenu === "air-ad-services"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShippingSubMenu("air-ad-services")}
                >
                  <div className="flex items-center gap-2">
                    <FaShippingFast className="w-4 h-4" />
                    <span>Air Ad Services</span>
                  </div>
                </button>

                {/* 7. Local Agent */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shippingSubMenu === "local-agent"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShippingSubMenu("local-agent")}
                >
                  <div className="flex items-center gap-2">
                    <FaMapMarkerAlt className="w-4 h-4" />
                    <span>Local Agent</span>
                  </div>
                </button>

                {/* 8. Local Agent Settings */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shippingSubMenu === "local-agent-settings"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShippingSubMenu("local-agent-settings")}
                >
                  <div className="flex items-center gap-2">
                    <FaCog className="w-4 h-4" />
                    <span>Local Agent Settings</span>
                  </div>
                </button>

                {/* 8. Local Agent Requests */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shippingSubMenu === "local-agent-requests"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShippingSubMenu("local-agent-requests")}
                >
                  <div className="flex items-center gap-2">
                    <FaUserTag className="w-4 h-4" />
                    <span>Local Agent Requests</span>
                    {unreadCounts.localAgentRequests > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white">
                        {unreadCounts.localAgentRequests}
                      </span>
                    )}
                  </div>
                </button>

                {/* 9. Reward Claims */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shippingSubMenu === "local-agent-reward-claims"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShippingSubMenu("local-agent-reward-claims")}
                >
                  <div className="flex items-center gap-2">
                    <FaGift className="w-4 h-4" />
                    <span>Reward Claims</span>
                    {unreadCounts.rewardClaims > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white">
                        {unreadCounts.rewardClaims}
                      </span>
                    )}
                  </div>
                </button>

                {/* 10. China Address Management */}
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
                    <span>China Address Management</span>
                  </div>
                </button>

                {/* Address Generators (USA, Dubai, etc.) */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shippingSubMenu === "warehouse-addresses"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShippingSubMenu("warehouse-addresses")}
                >
                  <div className="flex items-center gap-2">
                    <FaMapMarkerAlt className="w-4 h-4" />
                    <span>Address Generators</span>
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
            ) : shippingSubMenu === "quick-tracking-notes" ? (
              <QuickTrackingNotesManagement />
            ) : shippingSubMenu === "containers" ? (
              <ContainerManagement />
            ) : shippingSubMenu === "container-expenses" ? (
              <ContainerExpensesManagement />
            ) : shippingSubMenu === "invoices" ? (
              <InvoicesManagement />
            ) : shippingSubMenu === "payment-proofs" ? (
              <ShippingPaymentProofsManagement
                onPendingChange={() => {
                  clearCache("admin-unread-counts");
                  fetchUnreadCounts();
                }}
              />
            ) : shippingSubMenu === "china-excel" ? (
              <ChinaExcelUploadsManagement />
            ) : shippingSubMenu === "rates" ? (
              <ShippingRatesManagement />
            ) : shippingSubMenu === "ad-rates" ? (
              <AdShippingRatesManagement />
            ) : shippingSubMenu === "air-ad-services" ? (
              <AirAdShippingServicesManagement />
            ) : shippingSubMenu === "local-agent" ? (
              <LocalAgentManagement />
            ) : shippingSubMenu === "local-agent-settings" ? (
              <LocalAgentSettingsManagement />
            ) : shippingSubMenu === "local-agent-requests" ? (
              <AgentRequestsManagement
                agentTypeFilter="local"
                title="Local Agent Requests"
                emptyLabel="No local agent requests found"
              />
            ) : shippingSubMenu === "local-agent-reward-claims" ? (
              <LocalAgentRewardClaims />
            ) : shippingSubMenu === "addresses" ? (
              <ShippingAddressesAdmin />
            ) : shippingSubMenu === "warehouse-addresses" ? (
              <WarehouseAddressesManagement />
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
      case "agents":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Agent Management
            </h2>

            {/* Agent Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <div className="flex flex-wrap">
                {/* 1. Tracking Numbers */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    agentSubMenu === "tracking"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setAgentSubMenu("tracking")}
                >
                  <div className="flex items-center gap-2">
                    <FaTruck className="w-4 h-4" />
                    <span>Agent Tracking Numbers</span>
                  </div>
                </button>

                {/* 2. Containers */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    agentSubMenu === "containers"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setAgentSubMenu("containers")}
                >
                  <div className="flex items-center gap-2">
                    <FaBox className="w-4 h-4" />
                    <span>Containers</span>
                  </div>
                </button>

                {/* 3. Shipping Rates */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    agentSubMenu === "rates"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setAgentSubMenu("rates")}
                >
                  <div className="flex items-center gap-2">
                    <FaDollarSign className="w-4 h-4" />
                    <span>Agent Shipping Rates</span>
                  </div>
                </button>

                {/* 5. Address Management */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    agentSubMenu === "addresses"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setAgentSubMenu("addresses")}
                >
                  <div className="flex items-center gap-2">
                    <FaMapMarkerAlt className="w-4 h-4" />
                    <span>Agent Address Management</span>
                  </div>
                </button>

                {/* 6. Shipping Marks Viewer */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    agentSubMenu === "shipping-marks"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setAgentSubMenu("shipping-marks")}
                >
                  <div className="flex items-center gap-2">
                    <FaTag className="w-4 h-4" />
                    <span>Agent Shipping Marks</span>
                  </div>
                </button>

                {/* 7. Agent Requests */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    agentSubMenu === "requests"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setAgentSubMenu("requests")}
                >
                  <div className="flex items-center gap-2">
                    <FaHandHoldingUsd className="w-4 h-4" />
                    <span>Agent Requests</span>
                    {unreadCounts.agentRequests > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white">
                        {unreadCounts.agentRequests}
                      </span>
                    )}
                  </div>
                </button>

                {/* 8. Corporate Agents */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    agentSubMenu === "corporate"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setAgentSubMenu("corporate")}
                >
                  <div className="flex items-center gap-2">
                    <FaBuilding className="w-4 h-4" />
                    <span>Corporate Agent</span>
                  </div>
                </button>

                {/* 9. Affiliate Agents */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    agentSubMenu === "affiliate"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setAgentSubMenu("affiliate")}
                >
                  <div className="flex items-center gap-2">
                    <FaHandshake className="w-4 h-4" />
                    <span>Affiliate Agent</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Agent Content */}
            {agentSubMenu === "tracking" ? (
              <AgentTrackingManagement />
            ) : agentSubMenu === "containers" ? (
              <AgentContainerManagement />
            ) : agentSubMenu === "rates" ? (
              <React.Suspense fallback={<div>Loading...</div>}>
                <AgentShippingRatesManagement />
              </React.Suspense>
            ) : agentSubMenu === "addresses" ? (
              <AgentAddressManagement />
            ) : agentSubMenu === "shipping-marks" ? (
              <AgentShippingMarksManagement />
            ) : agentSubMenu === "requests" ? (
              <AgentRequestsManagement
                agentTypeFilter="corporate"
                title="Corporate Agent Requests"
                emptyLabel="No corporate agent requests found"
              />
            ) : agentSubMenu === "corporate" ? (
              <CorporateAgentManagement />
            ) : agentSubMenu === "affiliate" ? (
              <AffiliateAgentManagement />
            ) : (
              <AgentTrackingManagement />
            )}
          </div>
        );
      case "quick-orders":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Wholesale Orders
            </h2>

            <WholesaleVisitStatsCards days={30} />

            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <div className="flex flex-wrap">
                <button
                  type="button"
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    wholesaleSubMenu === "products"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setWholesaleSubMenu("products")}
                >
                  Products
                </button>
                <button
                  type="button"
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    wholesaleSubMenu === "requests"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setWholesaleSubMenu("requests")}
                >
                  <span className="inline-flex items-center gap-2">
                    Requests
                    {unreadCounts.wholesale > 0 && (
                      <span className="text-xs font-semibold text-white bg-red-500 rounded-full px-2 py-0.5">
                        {unreadCounts.wholesale > 99
                          ? "99+"
                          : unreadCounts.wholesale}
                      </span>
                    )}
                  </span>
                </button>
              </div>
            </div>

            {wholesaleSubMenu === "requests" ? (
              <WholesaleRequestsAdmin />
            ) : (
              <QuickOrderProducts />
            )}
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
      case "alipay-buying-rate":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Alipay Buying Rate
            </h2>
            <AlipayBuyingRateManagement />
          </div>
        );
      case "orders":
        return (
          <OrderManagement
            onDigitalUnreadInvalidate={() => {
              clearCache('admin-unread-counts');
              fetchUnreadCounts();
            }}
          />
        );
      case "shop":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Shop Management
            </h2>

            {/* Shop Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <div className="flex flex-wrap">
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shopSubMenu === "products"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShopSubMenu("products")}
                >
                  <div className="flex items-center gap-2">
                    <FaBox className="w-4 h-4" />
                    <span>Products</span>
                  </div>
                </button>
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shopSubMenu === "digital-products"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShopSubMenu("digital-products")}
                >
                  <div className="flex items-center gap-2">
                    <FaFilePdf className="w-4 h-4" />
                    <span>Digital products</span>
                  </div>
                </button>
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shopSubMenu === "vendors"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShopSubMenu("vendors")}
                >
                  <div className="flex items-center gap-2">
                    <FaHandshake className="w-4 h-4" />
                    <span>Vendors</span>
                    {unreadCounts.vendorApplications > 0 && (
                      <span className="ml-1 text-xs font-semibold text-white bg-red-500 rounded-full px-2 py-0.5">
                        {unreadCounts.vendorApplications}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shopSubMenu === "categories"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShopSubMenu("categories")}
                >
                  <div className="flex items-center gap-2">
                    <FaTag className="w-4 h-4" />
                    <span>Categories</span>
                  </div>
                </button>
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    shopSubMenu === "vendor-payout-requests"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setShopSubMenu("vendor-payout-requests")}
                >
                  <div className="flex items-center gap-2">
                    <FaHandHoldingUsd className="w-4 h-4" />
                    <span>Vendor pay requests</span>
                    {unreadCounts.vendorPayoutRequests > 0 && (
                      <span className="ml-1 text-xs font-semibold text-white bg-red-500 rounded-full px-2 py-0.5">
                        {unreadCounts.vendorPayoutRequests}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Shop Content */}
            {shopSubMenu === "products" ? (
              <AdminProducts />
            ) : shopSubMenu === "digital-products" ? (
              <AdminDigitalProducts />
            ) : shopSubMenu === "vendors" ? (
              <VendorManagement />
            ) : shopSubMenu === "vendor-payout-requests" ? (
              <AdminVendorPayoutRequests />
            ) : (
              <CategoriesTypesManagement />
            )}
          </div>
        );
      case "analytics":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Analytics
            </h2>
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <div className="flex flex-wrap">
                {[
                  { key: "overview", label: "Overview" },
                  { key: "site", label: "Site" },
                  { key: "shipping", label: "Shipping" },
                  { key: "alipay", label: "Alipay" },
                  { key: "buy4me", label: "Buy4me" },
                  { key: "orders", label: "Orders" },
                  { key: "digital_store", label: "Digital store" },
                  { key: "training", label: "Training" },
                  { key: "community", label: "Community" },
                  { key: "executive", label: "Executive" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setAnalyticsTab(tab.key)}
                    className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                      analyticsTab === tab.key
                        ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{tab.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Analytics activeTab={analyticsTab} />
          </div>
        );
      case "community":
        return <CommunityManagement />;
      case "executive-members":
        return <ExecutiveMembersManagement />;
      case "card-holders":
        return <CardHoldersManagement />;
      case "bulk-email":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Bulk Email & Promotions
            </h2>
            <BulkEmailAdmin />
          </div>
        );
      case "staff":
        return <StaffClockRecords />;
      case "messages":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Messages
            </h2>

            {/* Message Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <div className="flex flex-wrap">
                {/* 1. Live Chat */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    messageSubMenu === "live-chat"
                      ? "bg-white dark:bg-gray-800 text-pink-600 dark:text-pink-400 border-b-2 border-pink-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setMessageSubMenu("live-chat")}
                >
                  <div className="flex items-center gap-2">
                    <FaComments className="w-4 h-4" />
                    <span>Live Chat</span>
                  </div>
                </button>

                {/* 2. Agent Tickets */}
                <button
                  className={`py-3 px-6 font-medium text-sm rounded-t-lg mr-2 ${
                    messageSubMenu === "agent-tickets"
                      ? "bg-white dark:bg-gray-800 text-pink-600 dark:text-pink-400 border-b-2 border-pink-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setMessageSubMenu("agent-tickets")}
                >
                  <div className="flex items-center gap-2">
                    <FaTicketAlt className="w-4 h-4" />
                    <span>Agent Tickets</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Message Content */}
            {messageSubMenu === "live-chat" ? (
              <LiveChatAdminPanel
                refreshSignal={chatRefreshSignal}
                onUnreadCountChange={setChatUnreadCount}
              />
            ) : messageSubMenu === "agent-tickets" ? (
              <AdminAgentTickets />
            ) : (
              <LiveChatAdminPanel
                refreshSignal={chatRefreshSignal}
                onUnreadCountChange={setChatUnreadCount}
              />
            )}
          </div>
        );
      case "gallery":
        return <GalleryManagement />;
      case "settings":
        return <MaintenanceManagement />;
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

  const tabUnreadCountForSection = (section) => {
    if (section === "alipay-payments") return unreadCounts.alipay;
    if (section === "buy4me") return unreadCounts.buy4me;
    if (section === "quick-orders") return unreadCounts.wholesale || 0;
    if (section === "orders") {
      return (unreadCounts.orders || 0) + (unreadCounts.digital_orders || 0);
    }
    if (section === "training") return unreadCounts.training;
    if (section === "community") return unreadCounts.community;
    if (section === "delivery") return unreadCounts.delivery;
    if (section === "shipping") {
      return unreadCounts.shippingPaymentProofs || 0;
    }
    if (section === "shop") {
      return (unreadCounts.vendorApplications || 0) + (unreadCounts.vendorPayoutRequests || 0);
    }
    if (section === "agents") {
      return (
        (unreadCounts.agentRequests || 0) +
        (unreadCounts.localAgentRequests || 0) +
        (unreadCounts.rewardClaims || 0)
      );
    }
    return 0;
  };

  const openSidebarSection = (item) => {
    const tabUnreadCount = tabUnreadCountForSection(item.section);
    setActiveSection(item.section);
    // Keep the parent dropdown open when navigating within that group
    if (!quickTabsSectionSet.has(item.section)) {
      setQuickTabsOpen(false);
    }
    if (!ecommerceSectionSet.has(item.section)) {
      setEcommerceOpen(false);
    }
    if (!membershipSectionSet.has(item.section)) {
      setMembershipOpen(false);
    }
    if (tabUnreadCount > 0) {
      if (item.section === "alipay-payments") {
        setUnreadCounts((prev) => ({ ...prev, alipay: 0 }));
      } else if (item.section === "buy4me") {
        setUnreadCounts((prev) => ({ ...prev, buy4me: 0 }));
      } else if (item.section === "orders") {
        setUnreadCounts((prev) => ({
          ...prev,
          orders: 0,
          digital_orders: 0,
        }));
      } else if (item.section === "training") {
        setUnreadCounts((prev) => ({ ...prev, training: 0 }));
      } else if (item.section === "community") {
        setUnreadCounts((prev) => ({ ...prev, community: 0 }));
      } else if (item.section === "agents") {
        setUnreadCounts((prev) => ({
          ...prev,
          agentRequests: 0,
          localAgentRequests: 0,
          rewardClaims: 0,
        }));
      } else if (item.section === "shop") {
        setUnreadCounts((prev) => ({
          ...prev,
          vendorApplications: 0,
          vendorPayoutRequests: 0,
        }));
      }
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
    <div className={`min-h-screen flex bg-gray-50 dark:bg-gray-900 ${darkMode ? "dark" : ""}`}>
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
            onClick={() => {
              setIsSidebarOpen(!isSidebarOpen);
              setQuickTabsOpen(false);
              setEcommerceOpen(false);
              setMembershipOpen(false);
            }}
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
                const itemsToRender =
                  allowedTabs === null
                    ? menuItems
                    : menuItems.filter((item) => {
                        if (item.section === "dashboard") return true;
                        if (item.section === "shop") {
                          return (
                            allowedTabs.includes("shop") ||
                            allowedTabs.includes("products") ||
                            allowedTabs.includes("vendors") ||
                            allowedTabs.includes("categories")
                          );
                        }
                        return allowedTabs.includes(item.section);
                      });

                const quickItemsOrdered = QUICK_TABS_SECTIONS.map((slug) =>
                  itemsToRender.find((i) => i.section === slug)
                ).filter(Boolean);

                const ecommerceItemsOrdered = ECOMMERCE_SECTIONS.map((slug) =>
                  itemsToRender.find((i) => i.section === slug)
                ).filter(Boolean);

                const membershipItemsOrdered = MEMBERSHIP_SECTIONS.map((slug) =>
                  itemsToRender.find((i) => i.section === slug)
                ).filter(Boolean);

                const mainItems = itemsToRender.filter(
                  (i) =>
                    !quickTabsSectionSet.has(i.section) &&
                    !ecommerceSectionSet.has(i.section) &&
                    !membershipSectionSet.has(i.section)
                );
                const headItems = mainItems.filter(
                  (i) =>
                    i.section === "dashboard" ||
                    i.section === "users" ||
                    i.section === "admins"
                );
                const tailItems = mainItems.filter(
                  (i) =>
                    i.section !== "dashboard" &&
                    i.section !== "users" &&
                    i.section !== "admins"
                );

                const quickGroupActive = quickItemsOrdered.some(
                  (i) => i.section === activeSection
                );
                const ecommerceGroupActive = ecommerceItemsOrdered.some(
                  (i) => i.section === activeSection
                );
                const membershipGroupActive = membershipItemsOrdered.some(
                  (i) => i.section === activeSection
                );
                const ecommerceBadgeTotal = ecommerceItemsOrdered.reduce(
                  (sum, it) => sum + tabUnreadCountForSection(it.section),
                  0
                );
                const quickTabsBadgeTotal = quickItemsOrdered.reduce(
                  (sum, it) => sum + tabUnreadCountForSection(it.section),
                  0
                );
                const membershipBadgeTotal = membershipItemsOrdered.reduce(
                  (sum, it) => sum + tabUnreadCountForSection(it.section),
                  0
                );

                const renderNavButton = (item, key) => {
                  const showChatBadge =
                    item.section === "messages" && chatUnreadCount > 0;
                  const tabUnreadCount = tabUnreadCountForSection(item.section);
                  const showTabBadge = tabUnreadCount > 0;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => openSidebarSection(item)}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                        activeSection === item.section
                          ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      <span className="text-xl shrink-0">{item.icon}</span>
                      {isSidebarOpen && (
                        <span className="flex items-center space-x-2 min-w-0">
                          <span className="truncate">{item.label}</span>
                          {showChatBadge && (
                            <span className="ml-2 text-xs font-semibold text-white bg-red-500 rounded-full px-2 py-0.5 shrink-0">
                              {chatUnreadCount}
                            </span>
                          )}
                          {showTabBadge && (
                            <span className="ml-2 text-xs font-semibold text-white bg-red-500 rounded-full px-2 py-0.5 shrink-0">
                              {tabUnreadCount > 99 ? "99+" : tabUnreadCount}
                            </span>
                          )}
                          {allowedTabsMeta[item.section]?.assigned && (
                            <span className="ml-2 w-2 h-2 rounded-full bg-green-500 inline-block shrink-0" />
                          )}
                        </span>
                      )}
                    </button>
                  );
                };

                return (
                  <>
                    {headItems.map((item) =>
                      renderNavButton(item, `nav-${item.section}`)
                    )}

                    {ecommerceItemsOrdered.length > 0 ? (
                      <div className="space-y-1" ref={ecommerceWrapRef}>
                        {isSidebarOpen ? (
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-3 pt-1">
                            E-commerce
                          </p>
                        ) : null}
                        <button
                          ref={ecommerceTriggerRef}
                          type="button"
                          title="E-commerce: Shop, Wholesale Orders, Orders"
                          onClick={() => {
                            setQuickTabsOpen(false);
                            setMembershipOpen(false);
                            setEcommerceOpen((o) => !o);
                          }}
                          className={`w-full flex items-center relative ${
                            isSidebarOpen ? "justify-between gap-2" : "justify-center"
                          } p-3 rounded-lg transition-colors ${
                            ecommerceGroupActive && !isSidebarOpen
                              ? "border-l-4 border-blue-500 bg-gray-900/30 dark:bg-gray-950 text-blue-600 dark:text-blue-400"
                              : ecommerceGroupActive && isSidebarOpen
                              ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200/80 dark:ring-blue-700"
                              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                          aria-expanded={ecommerceOpen}
                        >
                          <span
                            className={`flex items-center min-w-0 ${
                              isSidebarOpen ? "flex-1 gap-3" : ""
                            }`}
                          >
                            <span className="relative shrink-0 inline-flex">
                              <FaShoppingBag className="text-xl shrink-0" />
                              {!isSidebarOpen && ecommerceBadgeTotal > 0 ? (
                                <span className="absolute -right-1.5 -top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                                  {ecommerceBadgeTotal > 99
                                    ? "99+"
                                    : ecommerceBadgeTotal}
                                </span>
                              ) : null}
                            </span>
                            {isSidebarOpen ? (
                              <>
                                <span className="text-sm font-semibold truncate flex-1 min-w-0 text-left">
                                  E-commerce
                                </span>
                                {ecommerceBadgeTotal > 0 ? (
                                  <span className="shrink-0 text-xs font-semibold text-white bg-red-500 rounded-full px-2 py-0.5 min-w-[1.5rem] text-center">
                                    {ecommerceBadgeTotal > 99
                                      ? "99+"
                                      : ecommerceBadgeTotal}
                                  </span>
                                ) : null}
                              </>
                            ) : null}
                          </span>
                          {isSidebarOpen ? (
                            <FaChevronDown
                              className={`text-sm shrink-0 transition-transform ${
                                ecommerceOpen ? "rotate-180" : ""
                              }`}
                            />
                          ) : null}
                        </button>
                        {ecommerceOpen && isSidebarOpen ? (
                          <div className="ml-2 pl-2 border-l-2 border-blue-200 dark:border-blue-800 space-y-1 pb-1">
                            {ecommerceItemsOrdered.map((item) => {
                              const n = tabUnreadCountForSection(item.section);
                              const showB = n > 0;
                              return (
                                <button
                                  key={item.section}
                                  type="button"
                                  onClick={() => openSidebarSection(item)}
                                  className={`w-full flex items-center space-x-3 px-2 py-2 rounded-md text-sm transition-colors ${
                                    activeSection === item.section
                                      ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/80"
                                  }`}
                                >
                                  <span className="text-lg shrink-0">{item.icon}</span>
                                  <span className="flex flex-1 items-center justify-between gap-2 min-w-0">
                                    <span className="truncate text-left">{item.label}</span>
                                    <span className="flex items-center gap-1 shrink-0">
                                      {showB ? (
                                        <span className="text-xs font-semibold text-white bg-red-500 rounded-full px-2 py-0.5">
                                          {n > 99 ? "99+" : n}
                                        </span>
                                      ) : null}
                                      {allowedTabsMeta[item.section]?.assigned ? (
                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                      ) : null}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                        {ecommerceOpen &&
                        !isSidebarOpen &&
                        ecommerceFlyoutPos &&
                        typeof document !== "undefined"
                          ? createPortal(
                              <div
                                ref={ecommerceFlyoutRef}
                                className="w-[268px] rounded-xl border border-blue-500/60 bg-gray-900 text-gray-100 shadow-2xl overflow-hidden flex flex-col"
                                style={{
                                  position: "fixed",
                                  top: ecommerceFlyoutPos.top,
                                  left: ecommerceFlyoutPos.left,
                                  maxHeight: ecommerceFlyoutPos.maxHeight,
                                  zIndex: 10050,
                                }}
                                role="menu"
                              >
                                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-blue-500/35 bg-gray-950/80">
                                  <FaShoppingBag className="text-lg text-blue-400 shrink-0" />
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex-1 min-w-0">
                                    E-commerce
                                  </span>
                                  {ecommerceBadgeTotal > 0 ? (
                                    <span className="shrink-0 text-[10px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                                      {ecommerceBadgeTotal > 99
                                        ? "99+"
                                        : ecommerceBadgeTotal}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="overflow-y-auto py-1 flex-1 min-h-0">
                                  {ecommerceItemsOrdered.map((item) => {
                                    const n = tabUnreadCountForSection(item.section);
                                    const showB = n > 0;
                                    const active = activeSection === item.section;
                                    return (
                                      <button
                                        key={item.section}
                                        type="button"
                                        role="menuitem"
                                        onClick={() => openSidebarSection(item)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors rounded-md mx-1 ${
                                          active
                                            ? "bg-blue-600/25 text-white ring-1 ring-inset ring-blue-500/45"
                                            : "text-gray-200 hover:bg-gray-800"
                                        }`}
                                      >
                                        <span className="text-lg shrink-0 opacity-90">
                                          {item.icon}
                                        </span>
                                        <span className="flex flex-1 items-center justify-between gap-2 min-w-0">
                                          <span className="truncate font-medium">
                                            {item.label}
                                          </span>
                                          <span className="flex items-center gap-1 shrink-0">
                                            {showB ? (
                                              <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                                                {n > 99 ? "99+" : n}
                                              </span>
                                            ) : null}
                                            {allowedTabsMeta[item.section]?.assigned ? (
                                              <span className="w-2 h-2 rounded-full bg-green-500" />
                                            ) : null}
                                          </span>
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>,
                              document.body
                            )
                          : null}
                      </div>
                    ) : null}

                    {quickItemsOrdered.length > 0 ? (
                      <div className="space-y-1" ref={quickTabsWrapRef}>
                        {isSidebarOpen ? (
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-3 pt-1">
                            Quick Tabs
                          </p>
                        ) : null}
                        <button
                          ref={quickTabsTriggerRef}
                          type="button"
                          title="Quick Tabs: Shipping → Agent Management"
                          onClick={() => {
                            setEcommerceOpen(false);
                            setMembershipOpen(false);
                            setQuickTabsOpen((o) => !o);
                          }}
                          className={`w-full flex items-center relative ${
                            isSidebarOpen ? "justify-between gap-2" : "justify-center"
                          } p-3 rounded-lg transition-colors ${
                            quickGroupActive && !isSidebarOpen
                              ? "border-l-4 border-blue-500 bg-gray-900/30 dark:bg-gray-950 text-blue-600 dark:text-blue-400"
                              : quickGroupActive && isSidebarOpen
                              ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200/80 dark:ring-blue-700"
                              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                          aria-expanded={quickTabsOpen}
                        >
                          <span
                            className={`flex items-center min-w-0 ${
                              isSidebarOpen ? "flex-1 gap-3" : ""
                            }`}
                          >
                            <span className="relative shrink-0 inline-flex">
                              <FaThList className="text-xl shrink-0" />
                              {!isSidebarOpen && quickTabsBadgeTotal > 0 ? (
                                <span className="absolute -right-1.5 -top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                                  {quickTabsBadgeTotal > 99
                                    ? "99+"
                                    : quickTabsBadgeTotal}
                                </span>
                              ) : null}
                            </span>
                            {isSidebarOpen ? (
                              <>
                                <span className="text-sm font-semibold truncate flex-1 min-w-0 text-left">
                                  Quick Tabs
                                </span>
                                {quickTabsBadgeTotal > 0 ? (
                                  <span className="shrink-0 text-xs font-semibold text-white bg-red-500 rounded-full px-2 py-0.5 min-w-[1.5rem] text-center">
                                    {quickTabsBadgeTotal > 99
                                      ? "99+"
                                      : quickTabsBadgeTotal}
                                  </span>
                                ) : null}
                              </>
                            ) : null}
                          </span>
                          {isSidebarOpen ? (
                            <FaChevronDown
                              className={`text-sm shrink-0 transition-transform ${
                                quickTabsOpen ? "rotate-180" : ""
                              }`}
                            />
                          ) : null}
                        </button>
                        {quickTabsOpen && isSidebarOpen ? (
                          <div className="ml-2 pl-2 border-l-2 border-blue-200 dark:border-blue-800 space-y-1 pb-1">
                            {quickItemsOrdered.map((item) => {
                              const n = tabUnreadCountForSection(item.section);
                              const showB = n > 0;
                              return (
                                <button
                                  key={item.section}
                                  type="button"
                                  onClick={() => openSidebarSection(item)}
                                  className={`w-full flex items-center space-x-3 px-2 py-2 rounded-md text-sm transition-colors ${
                                    activeSection === item.section
                                      ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/80"
                                  }`}
                                >
                                  <span className="text-lg shrink-0">{item.icon}</span>
                                  <span className="flex flex-1 items-center justify-between gap-2 min-w-0">
                                    <span className="truncate text-left">{item.label}</span>
                                    <span className="flex items-center gap-1 shrink-0">
                                      {showB ? (
                                        <span className="text-xs font-semibold text-white bg-red-500 rounded-full px-2 py-0.5">
                                          {n > 99 ? "99+" : n}
                                        </span>
                                      ) : null}
                                      {allowedTabsMeta[item.section]?.assigned ? (
                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                      ) : null}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                        {quickTabsOpen &&
                        !isSidebarOpen &&
                        quickFlyoutPos &&
                        typeof document !== "undefined"
                          ? createPortal(
                              <div
                                ref={quickTabsFlyoutRef}
                                className="w-[268px] rounded-xl border border-blue-500/60 bg-gray-900 text-gray-100 shadow-2xl overflow-hidden flex flex-col"
                                style={{
                                  position: "fixed",
                                  top: quickFlyoutPos.top,
                                  left: quickFlyoutPos.left,
                                  maxHeight: quickFlyoutPos.maxHeight,
                                  zIndex: 10050,
                                }}
                                role="menu"
                              >
                                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-blue-500/35 bg-gray-950/80">
                                  <FaThList className="text-lg text-blue-400 shrink-0" />
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex-1 min-w-0">
                                    Quick Tabs
                                  </span>
                                  {quickTabsBadgeTotal > 0 ? (
                                    <span className="shrink-0 text-[10px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                                      {quickTabsBadgeTotal > 99
                                        ? "99+"
                                        : quickTabsBadgeTotal}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="overflow-y-auto py-1 flex-1 min-h-0">
                                  {quickItemsOrdered.map((item) => {
                                    const n = tabUnreadCountForSection(item.section);
                                    const showB = n > 0;
                                    const active = activeSection === item.section;
                                    return (
                                      <button
                                        key={item.section}
                                        type="button"
                                        role="menuitem"
                                        onClick={() => openSidebarSection(item)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors rounded-md mx-1 ${
                                          active
                                            ? "bg-blue-600/25 text-white ring-1 ring-inset ring-blue-500/45"
                                            : "text-gray-200 hover:bg-gray-800"
                                        }`}
                                      >
                                        <span className="text-lg shrink-0 opacity-90">
                                          {item.icon}
                                        </span>
                                        <span className="flex flex-1 items-center justify-between gap-2 min-w-0">
                                          <span className="truncate font-medium">
                                            {item.label}
                                          </span>
                                          <span className="flex items-center gap-1 shrink-0">
                                            {showB ? (
                                              <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                                                {n > 99 ? "99+" : n}
                                              </span>
                                            ) : null}
                                            {allowedTabsMeta[item.section]?.assigned ? (
                                              <span className="w-2 h-2 rounded-full bg-green-500" />
                                            ) : null}
                                          </span>
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>,
                              document.body
                            )
                          : null}
                      </div>
                    ) : null}

                    {membershipItemsOrdered.length > 0 ? (
                      <div className="space-y-1" ref={membershipWrapRef}>
                        {isSidebarOpen ? (
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-3 pt-1">
                            Membership
                          </p>
                        ) : null}
                        <button
                          ref={membershipTriggerRef}
                          type="button"
                          title="Membership: Community, Executive Members, Card Holders"
                          onClick={() => {
                            setQuickTabsOpen(false);
                            setEcommerceOpen(false);
                            setMembershipOpen((o) => !o);
                          }}
                          className={`w-full flex items-center relative ${
                            isSidebarOpen ? "justify-between gap-2" : "justify-center"
                          } p-3 rounded-lg transition-colors ${
                            membershipGroupActive && !isSidebarOpen
                              ? "border-l-4 border-blue-500 bg-gray-900/30 dark:bg-gray-950 text-blue-600 dark:text-blue-400"
                              : membershipGroupActive && isSidebarOpen
                              ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200/80 dark:ring-blue-700"
                              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                          aria-expanded={membershipOpen}
                        >
                          <span
                            className={`flex items-center min-w-0 ${
                              isSidebarOpen ? "flex-1 gap-3" : ""
                            }`}
                          >
                            <span className="relative shrink-0 inline-flex">
                              <FaCrown className="text-xl shrink-0" />
                              {!isSidebarOpen && membershipBadgeTotal > 0 ? (
                                <span className="absolute -right-1.5 -top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                                  {membershipBadgeTotal > 99
                                    ? "99+"
                                    : membershipBadgeTotal}
                                </span>
                              ) : null}
                            </span>
                            {isSidebarOpen ? (
                              <>
                                <span className="text-sm font-semibold truncate flex-1 min-w-0 text-left">
                                  Membership
                                </span>
                                {membershipBadgeTotal > 0 ? (
                                  <span className="shrink-0 text-xs font-semibold text-white bg-red-500 rounded-full px-2 py-0.5 min-w-[1.5rem] text-center">
                                    {membershipBadgeTotal > 99
                                      ? "99+"
                                      : membershipBadgeTotal}
                                  </span>
                                ) : null}
                              </>
                            ) : null}
                          </span>
                          {isSidebarOpen ? (
                            <FaChevronDown
                              className={`text-sm shrink-0 transition-transform ${
                                membershipOpen ? "rotate-180" : ""
                              }`}
                            />
                          ) : null}
                        </button>
                        {membershipOpen && isSidebarOpen ? (
                          <div className="ml-2 pl-2 border-l-2 border-blue-200 dark:border-blue-800 space-y-1 pb-1">
                            {membershipItemsOrdered.map((item) => {
                              const n = tabUnreadCountForSection(item.section);
                              const showB = n > 0;
                              return (
                                <button
                                  key={item.section}
                                  type="button"
                                  onClick={() => openSidebarSection(item)}
                                  className={`w-full flex items-center space-x-3 px-2 py-2 rounded-md text-sm transition-colors ${
                                    activeSection === item.section
                                      ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/80"
                                  }`}
                                >
                                  <span className="text-lg shrink-0">{item.icon}</span>
                                  <span className="flex flex-1 items-center justify-between gap-2 min-w-0">
                                    <span className="truncate text-left">{item.label}</span>
                                    <span className="flex items-center gap-1 shrink-0">
                                      {showB ? (
                                        <span className="text-xs font-semibold text-white bg-red-500 rounded-full px-2 py-0.5">
                                          {n > 99 ? "99+" : n}
                                        </span>
                                      ) : null}
                                      {allowedTabsMeta[item.section]?.assigned ? (
                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                      ) : null}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                        {membershipOpen &&
                        !isSidebarOpen &&
                        membershipFlyoutPos &&
                        typeof document !== "undefined"
                          ? createPortal(
                              <div
                                ref={membershipFlyoutRef}
                                className="w-[268px] rounded-xl border border-blue-500/60 bg-gray-900 text-gray-100 shadow-2xl overflow-hidden flex flex-col"
                                style={{
                                  position: "fixed",
                                  top: membershipFlyoutPos.top,
                                  left: membershipFlyoutPos.left,
                                  maxHeight: membershipFlyoutPos.maxHeight,
                                  zIndex: 10050,
                                }}
                                role="menu"
                              >
                                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-blue-500/35 bg-gray-950/80">
                                  <FaCrown className="text-lg text-amber-400 shrink-0" />
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex-1 min-w-0">
                                    Membership
                                  </span>
                                  {membershipBadgeTotal > 0 ? (
                                    <span className="shrink-0 text-[10px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                                      {membershipBadgeTotal > 99
                                        ? "99+"
                                        : membershipBadgeTotal}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="overflow-y-auto py-1 flex-1 min-h-0">
                                  {membershipItemsOrdered.map((item) => {
                                    const n = tabUnreadCountForSection(item.section);
                                    const showB = n > 0;
                                    const active = activeSection === item.section;
                                    return (
                                      <button
                                        key={item.section}
                                        type="button"
                                        role="menuitem"
                                        onClick={() => openSidebarSection(item)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors rounded-md mx-1 ${
                                          active
                                            ? "bg-blue-600/25 text-white ring-1 ring-inset ring-blue-500/45"
                                            : "text-gray-200 hover:bg-gray-800"
                                        }`}
                                      >
                                        <span className="text-lg shrink-0 opacity-90">
                                          {item.icon}
                                        </span>
                                        <span className="flex flex-1 items-center justify-between gap-2 min-w-0">
                                          <span className="truncate font-medium">
                                            {item.label}
                                          </span>
                                          <span className="flex items-center gap-1 shrink-0">
                                            {showB ? (
                                              <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                                                {n > 99 ? "99+" : n}
                                              </span>
                                            ) : null}
                                            {allowedTabsMeta[item.section]?.assigned ? (
                                              <span className="w-2 h-2 rounded-full bg-green-500" />
                                            ) : null}
                                          </span>
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>,
                              document.body
                            )
                          : null}
                      </div>
                    ) : null}

                    {tailItems.map((item) =>
                      renderNavButton(item, `nav-${item.section}`)
                    )}
                  </>
                );
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
        className={`flex-1 transition-all duration-300 bg-gray-50 dark:bg-gray-900 ${
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
