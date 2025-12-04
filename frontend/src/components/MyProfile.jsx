import React, { useState, useEffect } from "react";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaEdit,
  FaSave,
  FaTimes,
  FaBox,
  FaTruck,
  FaShoppingBag,
  FaShoppingCart,
  FaClipboard,
  FaTrash,
  FaCreditCard,
  FaBell,
  FaFileInvoiceDollar,
  FaHome,
  FaHistory,
  FaExclamationTriangle,
  FaCheckCircle,
  FaCog,
  FaUsers,
  FaRegCopy,
  FaRegClock,
  FaRegBell,
  FaSyncAlt,
  FaSignOutAlt,
  FaHeart,
  FaCopy,
  FaCheck,
  FaLink,
  FaImage,
  FaInfoCircle,
  FaPlus,
  FaEye,
  FaSearch,
  FaShip,
  FaBoxOpen,
  FaUserTag,
  FaBuilding,
  FaHandshake,
} from "react-icons/fa";
import { trackingSystem } from "./ShippingDashboard";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import API from "../api";
import Invoice from "./Invoice";
import InvoiceModal from "./InvoiceModal";
import { getPlaceholderImagePath } from "../utils/paths";
import ConfirmModal from "./shared/ConfirmModal";
import AvatarSelector, { AVATARS } from "./AvatarSelector";
import AvatarSVG from "./AvatarSVG";

const MyProfile = () => {
  // Status mapping from backend values to display labels
  const getStatusLabel = (statusValue) => {
    const statusMap = {
      pending: "Pending",
      in_transit: "In Transit",
      arrived: "Arrived(China)",
      cancelled: "Cancelled",
      rejected: "Rejected",
      not_received: "Not Received",
      vessel: "On The Vessel",
      clearing: "Clearing",
      arrived_ghana: "Arrived(Ghana)",
      off_loading: "Of Loading",
      pick_up: "Pick up",
    };
    return statusMap[statusValue] || statusValue;
  };

  // Function to check if avatar exists
  const hasAvatar = (avatarId) => {
    if (!avatarId) return false;
    for (const gender of ["male", "female"]) {
      const avatar = AVATARS[gender].find((a) => a.id === avatarId);
      if (avatar) return true;
    }
    return false;
  };

  // Function to handle avatar selection
  const handleAvatarSelect = async (avatarId) => {
    try {
      setSelectedAvatar(avatarId);

      // Update avatar on backend
      const token = localStorage.getItem("token");
      if (token) {
        await API.patch("/buysellapi/users/me/", { avatar: avatarId });
        toast.success("Avatar updated successfully!");

        // Refresh user profile
        await fetchUserProfile();
      }
    } catch (error) {
      console.error("Failed to update avatar:", error);
      toast.error("Failed to update avatar. Please try again.");
      // Revert on error
      setSelectedAvatar(currentUser?.avatar || "");
    }
  };

  // Function to handle agent request submission
  const handleSubmitAgentRequest = async () => {
    // Check if user already has a pending request
    if (agentRequestStatus === "pending") {
      toast.warning("You already have a pending agent request. Please wait for admin review.");
      return;
    }

    // Check if user is already an agent
    if (currentUser?.is_agent) {
      toast.warning("You are already an agent.");
      return;
    }

    if (!selectedAgentType) {
      toast.error("Please select an agent type");
      return;
    }

    // Validate corporate agent form
    if (selectedAgentType === "corporate") {
      if (!corporateFormData.businessName.trim()) {
        toast.error("Business Name is required");
        return;
      }
      if (!corporateFormData.location.trim()) {
        toast.error("Location is required");
        return;
      }
      if (!corporateFormData.phoneNumber.trim()) {
        toast.error("Phone Number is required");
        return;
      }
      if (!corporateFormData.businessCert) {
        toast.error("Business Certificate is required");
        return;
      }
      if (!corporateFormData.ghanaCard) {
        toast.error("Ghana Card is required");
        return;
      }
    }

    try {
      setSubmittingAgentRequest(true);
      
      // Prepare form data
      const formData = new FormData();
      formData.append("agent_type", selectedAgentType);
      if (agentRequestMessage) {
        formData.append("message", agentRequestMessage);
      }

      // Add corporate agent specific fields
      if (selectedAgentType === "corporate") {
        formData.append("business_name", corporateFormData.businessName);
        formData.append("location", corporateFormData.location);
        formData.append("phone_number", corporateFormData.phoneNumber);
        if (corporateFormData.businessCert) {
          formData.append("business_cert", corporateFormData.businessCert);
        }
        if (corporateFormData.ghanaCard) {
          formData.append("ghana_card", corporateFormData.ghanaCard);
        }
      }

      // Don't set Content-Type header - let axios handle it automatically for FormData
      // Try the endpoint - if it doesn't exist, we'll show a helpful error
      const response = await API.post("/buysellapi/agent-requests/", formData);

      toast.success("Agent request submitted successfully! We will review your request.");
      setShowBecomeAgentModal(false);
      setSelectedAgentType("");
      setAgentRequestMessage("");
      setCorporateFormData({
        businessName: "",
        businessCert: null,
        location: "",
        ghanaCard: null,
        phoneNumber: "",
      });
      setAgentRequestStatus("pending");
      
      // Refresh user profile to get updated status
      await fetchUserProfile();
    } catch (error) {
      console.error("Failed to submit agent request:", error);
      console.error("Error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      
      let errorMsg = "Failed to submit agent request. Please try again.";
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 404) {
          errorMsg = "Agent request endpoint not found. Please contact the administrator. The backend endpoint '/buysellapi/agent-requests/' needs to be implemented.";
        } else {
          errorMsg = 
            error.response.data?.detail || 
            error.response.data?.error ||
            error.response.data?.message ||
            `Server error: ${error.response.status}`;
        }
      } else if (error.request) {
        // Request made but no response
        errorMsg = "No response from server. Please check your connection.";
      } else {
        // Something else happened
        errorMsg = error.message || "An unexpected error occurred";
      }
      
      // Log full error details for debugging
      console.error("Full error object:", {
        message: error.message,
        response: error.response,
        request: error.request,
        config: error.config,
      });
      
      toast.error(errorMsg);
    } finally {
      setSubmittingAgentRequest(false);
    }
  };

  // Handle file input changes
  const handleFileChange = (field, file) => {
    setCorporateFormData((prev) => ({
      ...prev,
      [field]: file,
    }));
  };

  const [isEditing, setIsEditing] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [originalUserInfo, setOriginalUserInfo] = useState({});

  // Initialize active tab from localStorage or URL parameter or default to "profile"
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get("tab");
    if (tabFromUrl) return tabFromUrl;

    const savedTab = localStorage.getItem("myProfileActiveTab");
    return savedTab || "profile";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [activeSubTab, setActiveSubTab] = useState("orders");
  const [userShipments, setUserShipments] = useState([]);
  const [copied, setCopied] = useState(false);
  const [shippingMarks, setShippingMarks] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [showAllShipments, setShowAllShipments] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [buy4meOrders, setBuy4meOrders] = useState([]);
  const [showAllBuy4meOrders, setShowAllBuy4meOrders] = useState(false);
  const [showAllBuy4meTracking, setShowAllBuy4meTracking] = useState(false);
  const [showAllBuy4meInvoices, setShowAllBuy4meInvoices] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [tempOrder, setTempOrder] = useState(null);
  const navigate = useNavigate();
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedInvoiceRequest, setSelectedInvoiceRequest] = useState(null);
  const [userInvoices, setUserInvoices] = useState([]);
  const [selectedBuy4meTrackingOrder, setSelectedBuy4meTrackingOrder] =
    useState(null);
  const [showBuy4meTrackingModal, setShowBuy4meTrackingModal] = useState(false);
  const [showBecomeAgentModal, setShowBecomeAgentModal] = useState(false);
  const [selectedAgentType, setSelectedAgentType] = useState("");
  const [agentRequestMessage, setAgentRequestMessage] = useState("");
  const [submittingAgentRequest, setSubmittingAgentRequest] = useState(false);
  const [agentRequestStatus, setAgentRequestStatus] = useState(null); // 'pending', 'approved', 'rejected', null
  
  // Corporate Agent form fields
  const [corporateFormData, setCorporateFormData] = useState({
    businessName: "",
    businessCert: null,
    location: "",
    ghanaCard: null,
    phoneNumber: "",
  });
  const trackableBuy4meOrders = buy4meOrders.filter(
    (order) =>
      order.tracking_status ||
      order.status === "approved" ||
      order.status === "processing"
  );
  const sortedBuy4meInvoices = [...userInvoices].sort(
    (a, b) =>
      new Date(b?.invoice?.createdAt || b?.invoice?.created_at || 0) -
      new Date(a?.invoice?.createdAt || a?.invoice?.created_at || 0)
  );
  // Account settings state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyOrderUpdates, setNotifyOrderUpdates] = useState(true);
  const [notifyPromotions, setNotifyPromotions] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  // Avatar selector state
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("");
  // Tracking details modal state
  const [selectedTracking, setSelectedTracking] = useState(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [activeRates, setActiveRates] = useState(null);
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  // Clear all notifications confirmation modal state
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  // MyProfile: Add Shipment modal state
  const [mpShowAddForm, setMpShowAddForm] = useState(false);
  const [mpNewShipment, setMpNewShipment] = useState({
    trackingNumber: "",
    userTrackingNumber: "",
  });
  const [mpHasShippingMark, setMpHasShippingMark] = useState(false);

  // Save active tab to localStorage and update URL whenever it changes
  useEffect(() => {
    localStorage.setItem("myProfileActiveTab", activeTab);

    // Update URL without causing navigation
    const url = new URL(window.location);
    url.searchParams.set("tab", activeTab);
    window.history.replaceState({}, "", url);
  }, [activeTab]);

  // Ensure trackings are loaded whenever user opens the Tracking tab
  useEffect(() => {
    if (activeTab === "tracking") {
      fetchUserTrackings();
    }
  }, [activeTab]);

  // Add a manual refresh function that users can call
  const refreshUserData = async () => {
    try {
      toast.info("Refreshing profile data...");
      setIsLoading(true);

      // Clear any existing error states
      setError(null);

      // Fetch fresh data in parallel for faster loading
      await Promise.all([fetchUserProfile(), fetchUserShippingMarks()]);

      toast.success("Profile data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing user data:", error);
      toast.error("Failed to refresh profile data");
      setError("Failed to refresh profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Add state for loading and error indicators
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Simplified: Fetch user notifications from backend only
  const fetchUserNotifications = async () => {
    try {
      const response = await API.get("/buysellapi/notifications/me?limit=50");
      const data = response.data;

      // Simple transformation from backend format
      const notificationList = data.notifications.map((notif) => ({
        id: notif.id,
        title: notif.subject,
        message: notif.message,
        type: notif.notification_type,
        date: notif.sent_at,
        read: notif.status === "read",
        trackingNumber: notif.tracking_number,
      }));

      setNotifications(notificationList);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  // Add a specific useEffect for user data fetching
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check for token first
        const token = localStorage.getItem("token");
        if (!token) {
          return;
        }

        // Fetch profile and shipping mark data in parallel for faster loading
        await Promise.all([fetchUserProfile(), fetchUserShippingMarks()]);
      } catch (error) {
        console.error("Error in initial data fetch:", error);
        setError("Could not load profile data. Please try refreshing.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Check shipping mark on mount
  useEffect(() => {
    checkMpShippingMark();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set default user tracking number when component mounts or marks change
  useEffect(() => {
    if (mpShowAddForm) {
      setDefaultUserTrackingNumber();
      checkMpShippingMark();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mpShowAddForm]);

  // Keep the existing useEffect for other data
  useEffect(() => {
    // Load user shipments from backend only (clear any old state first)
    setUserShipments([]);
    fetchUserTrackings();

    // Load favorites
    const savedFavorites = JSON.parse(
      localStorage.getItem("favorites") || "[]"
    );
    setFavorites(savedFavorites);

    // Load orders from API
    const loadOrders = async () => {
      try {
        const response = await API.get("/buysellapi/orders/");
        const ordersData = Array.isArray(response.data)
          ? response.data
          : response.data.results || [];
        setOrders(ordersData);
      } catch (error) {
        console.error("Failed to load orders:", error);
        // Fallback to localStorage if API fails
        const savedOrders = JSON.parse(localStorage.getItem("orders") || "[]");
        setOrders(savedOrders);
      }
    };
    loadOrders();

    // Load notifications from backend
    fetchUserNotifications();

    // Load Buy4Me orders from API
    const loadBuy4meOrders = async () => {
      try {
        const response = await API.get("/buysellapi/buy4me-requests/");
        const ordersData = Array.isArray(response.data)
          ? response.data
          : response.data.results || [];
        setBuy4meOrders(ordersData);
      } catch (error) {
        console.error("Failed to load buy4me orders:", error);
        // Fallback to localStorage if API fails
        const orders = JSON.parse(localStorage.getItem("buy4meOrders") || "[]");
        setBuy4meOrders(orders);
      }
    };
    loadBuy4meOrders();

    // Add event listener for storage changes
    const handleStorageChange = (e) => {
      if (e.key === "favorites") {
        const updatedFavorites = JSON.parse(e.newValue || "[]");
        setFavorites(updatedFavorites);
      } else if (e.key === "orders") {
        const updatedOrders = JSON.parse(e.newValue || "[]");
        setOrders(updatedOrders);
      } else if (e.key === "shippingMarks") {
        const updatedMarks = JSON.parse(e.newValue || "[]");
        setShippingMarks(updatedMarks);
      } else if (e.key === "shippingData") {
        // Refresh tracking data when ShippingDashboard data changes
        fetchUserTrackings();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to check if the app is online
  const checkOnlineStatus = () => {
    return navigator.onLine;
  };

  // Function to fetch user profile from backend with retry logic
  const fetchUserProfile = async (retryCount = 0, maxRetries = 2) => {
    try {
      // Check if online first
      if (!checkOnlineStatus()) {
        // Try cached profile
        const cached = localStorage.getItem("currentUserProfile");
        if (cached) {
          const parsed = JSON.parse(cached);
          setUserInfo({
            name: parsed.full_name || parsed.username || "",
            email: parsed.email || "",
            phone: parsed.contact || "",
            address: parsed.location || "",
          });
          setOriginalUserInfo({
            name: parsed.full_name || parsed.username || "",
            email: parsed.email || "",
            phone: parsed.contact || "",
            address: parsed.location || "",
          });
        }
        setError("You are offline. Some data may not be up to date.");
        return;
      }

      const token = localStorage.getItem("token");
      if (
        !token ||
        typeof token !== "string" ||
        token.trim() === "" ||
        token === "undefined" ||
        token === "null"
      ) {
        // Not logged in
        return;
      }

      // Fetch current user profile from backend
      const resp = await API.get("/buysellapi/users/me/");
      const u = resp?.data || {};

      // Persist for offline/cache use
      localStorage.setItem("currentUserProfile", JSON.stringify(u));

      const normalized = {
        name: u.full_name || u.username || "",
        email: u.email || "",
        phone: u.contact || "",
        address: u.location || "",
      };
      setUserInfo(normalized);
      setOriginalUserInfo(normalized);
      setCurrentUser(u);
      // Set avatar from user data
      setSelectedAvatar(u.avatar || "");
      // Initialize notification preferences from backend (with fallbacks)
      setNotifyEmail(u.notify_email !== undefined ? !!u.notify_email : true);
      setNotifyOrderUpdates(
        u.notify_order_updates !== undefined ? !!u.notify_order_updates : true
      );
      setNotifyPromotions(
        u.notify_promotions !== undefined ? !!u.notify_promotions : false
      );
      // Check agent request status
      if (u.agent_request_status) {
        setAgentRequestStatus(u.agent_request_status);
      } else {
        setAgentRequestStatus(null);
      }
    } catch (error) {
      // Check if the error is due to being offline
      if (!checkOnlineStatus()) {
        setError("You are offline. Some data may not be up to date.");
        return;
      }

      // Try fallback: use username from localStorage and minimal info
      try {
        const ud = JSON.parse(localStorage.getItem("userData") || "{}");
        if (ud?.username) {
          const minimal = {
            name: ud.username,
            email: "",
            phone: "",
            address: "",
          };
          setUserInfo(minimal);
          setOriginalUserInfo(minimal);
        }
        // Try cached full profile for preferences/id
        try {
          const cached = JSON.parse(
            localStorage.getItem("currentUserProfile") || "{}"
          );
          if (cached && cached.id) {
            setCurrentUser(cached);
            setNotifyEmail(
              cached.notify_email !== undefined ? !!cached.notify_email : true
            );
            setNotifyOrderUpdates(
              cached.notify_order_updates !== undefined
                ? !!cached.notify_order_updates
                : true
            );
            setNotifyPromotions(
              cached.notify_promotions !== undefined
                ? !!cached.notify_promotions
                : false
            );
          }
        } catch {}
      } catch {
        // ignore
      }

      // Token-related errors
      if (error.response) {
        if (error.response.status === 401) {
          // Let interceptor handle refresh; if still failing, clear and stay on page
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          return;
        }
        setError(
          "Failed to load profile: " +
            (error.response.data?.message || "Server error")
        );
      } else if (error.request) {
        setError("Failed to connect to server. Please check your connection.");
      } else {
        setError("Failed to load profile: " + error.message);
      }

      // Retry a couple of times
      if (retryCount < maxRetries) {
        setTimeout(() => {
          fetchUserProfile(retryCount + 1, maxRetries);
        }, 1200);
        return;
      }

      toast.error("Could not load your profile. Please try again later.");
    }
  };

  // Update password handler
  const handleUpdatePassword = async () => {
    try {
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        toast.error("Please fill in all password fields");
        return;
      }
      if (newPassword.length < 6) {
        toast.error("New password must be at least 6 characters long");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        toast.error("New passwords do not match");
        return;
      }
      await API.post("/buysellapi/users/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmNewPassword,
      });
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.current_password ||
        err?.response?.data?.new_password ||
        err?.response?.data?.confirm_password ||
        err?.response?.data?.message ||
        "Failed to update password";
      toast.error(msg);
    }
  };

  // Preference toggle handler (save immediately)
  const savePreference = async (key, value) => {
    try {
      if (!currentUser?.id) return;
      const payload = { [key]: value };
      await API.patch(`/buysellapi/users/${currentUser.id}/update/`, payload);
      // Update cached profile copy
      const cached = JSON.parse(
        localStorage.getItem("currentUserProfile") || "{}"
      );
      const updated = { ...cached, ...payload };
      localStorage.setItem("currentUserProfile", JSON.stringify(updated));
      setCurrentUser(updated);
      toast.success("Preferences saved");
    } catch (err) {
      console.error("Error saving preference", err);
      toast.error("Failed to save preference");
    }
  };

  // Function to fetch user's (single) shipping mark from backend
  const fetchUserShippingMarks = async () => {
    try {
      // Offline fallback
      if (!checkOnlineStatus()) {
        const cached = localStorage.getItem("userShippingMark");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.markId) {
              setShippingMarks([{ ...parsed, fromLocalStorage: true }]);
              return true;
            }
          } catch {}
        }
        return false;
      }

      const token = localStorage.getItem("token");
      if (!token) return false;

      const resp = await API.get("/buysellapi/shipping-marks/me/");
      const data = resp?.data;
      if (data && data.markId) {
        setShippingMarks([data]);
        localStorage.setItem("userShippingMark", JSON.stringify(data));
        return true;
      }

      setShippingMarks([]);
      return false;
    } catch (error) {
      if (error?.response?.status === 404) {
        setShippingMarks([]);
        return false;
      }
      // Try cached on failure
      try {
        const cached = localStorage.getItem("userShippingMark");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.markId) {
            setShippingMarks([{ ...parsed, fromLocalStorage: true }]);
            return true;
          }
        }
      } catch {}
      console.error("Error fetching user shipping mark:", error);
      setShippingMarks([]);
      return false;
    }
  };

  // Function to create a new shipping mark (disabled from auto-run; keep for future manual flows)
  // const createShippingMark = async (name) => { /* intentionally disabled */ };

  // Function to update a shipping mark
  const updateShippingMark = async (id, name, updateUserProfile = false) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return false;

      const response = await API.put(`/buysellapi/shipping-marks/me/`, {
        name,
        updateUserProfile,
      });

      if (response.data) {
        // Replace current mark (only one)
        setShippingMarks([response.data]);

        // If updateUserProfile is true and the name changed, also update the user profile
        if (updateUserProfile) {
          try {
            // Fetch the latest user profile to ensure we have up-to-date data
            const profileResponse = await API.get(`/buysellapi/users/me/`);

            if (profileResponse.data) {
              setUserInfo(profileResponse.data);
              setOriginalUserInfo(profileResponse.data);
              toast.success(
                "Both shipping mark and profile name updated successfully"
              );
            }
          } catch (profileError) {
            console.error(
              "Error updating user profile after shipping mark update:",
              profileError
            );
            toast.warning(
              "Shipping mark updated but failed to refresh profile data"
            );
          }
        } else {
          toast.success("Shipping mark updated successfully");
        }

        // Save updated mark to localStorage as backup
        localStorage.setItem("userShippingMark", JSON.stringify(response.data));

        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating shipping mark:", error);
      toast.error(
        error.response?.data?.message || "Failed to update shipping mark"
      );
      return false;
    }
  };

  // Function to delete a shipping mark
  const deleteShippingMark = async () => {
    toast.info("Shipping mark is permanent and cannot be deleted.");
    return false;
  };

  const getStatusColor = (status) => {
    const normalized = status
      ?.toLowerCase()
      .replace(/[()]/g, "")
      .replace(/\s+/g, "_");

    switch (normalized) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_transit":
      case "in transit":
        return "bg-blue-100 text-blue-800";
      case "arrived":
      case "arrivedchina":
      case "arrived_china":
        return "bg-green-100 text-green-800";
      case "arrivedghana":
      case "arrived_ghana":
        return "bg-teal-100 text-teal-800";
      case "cancelled":
        return "bg-gray-200 text-gray-700";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "not_received":
      case "not received":
        return "bg-orange-100 text-orange-800";
      case "vessel":
      case "on_the_vessel":
      case "on the vessel":
        return "bg-indigo-100 text-indigo-800";
      case "clearing":
        return "bg-purple-100 text-purple-800";
      case "off_loading":
      case "of_loading":
      case "of loading":
        return "bg-pink-100 text-pink-800";
      case "pick_up":
      case "pick up":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return;
      }

      // Make API call to update profile (use PATCH — backend supports PATCH on users/me/)
      const response = await API.patch(`/buysellapi/users/me/`, {
        name: userInfo.name,
        email: userInfo.email,
        phone: userInfo.phone,
        address: userInfo.address,
      });

      if (response.data) {
        // Update local state with the data returned from server
        setUserInfo(response.data);
        setOriginalUserInfo(response.data);

        // If name was changed, update shipping marks to match
        if (
          userInfo.name !== originalUserInfo.name &&
          shippingMarks.length > 0
        ) {
          // Update the first shipping mark with the new name
          // Use updateUserProfile = false since we already updated the user profile above
          const firstMark = shippingMarks[0];
          if (firstMark && firstMark._id) {
            updateShippingMark(firstMark._id, userInfo.name, false).then(
              (success) => {
                if (success) {
                  // Update shipping marks is handled in the updateShippingMark function
                  console.log(
                    "Successfully updated shipping mark name to match user profile"
                  );
                }
              }
            );
          }
        }

        setIsEditing(false);
        toast.success("Profile updated successfully");

        // Backend will create notification automatically
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error.response?.status === 400 && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to update profile");
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to original values
    setUserInfo({ ...originalUserInfo });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearAddress = (markId) => {
    toast.info(
      <div>
        <p>Are you sure you want to clear this shipping address?</p>
        <p className="text-sm text-gray-500">This action cannot be undone.</p>
      </div>,
      {
        position: "top-center",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: true,
        buttons: [
          <button
            key="confirm"
            onClick={() => {
              // Delete the shipping mark using API
              deleteShippingMark(markId);
              toast.dismiss();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 mr-2"
          >
            Clear
          </button>,
          <button
            key="cancel"
            onClick={() => toast.dismiss()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>,
        ],
      }
    );
  };

  // Simplified: Mark notification as read via API
  const markAsRead = async (notificationId) => {
    try {
      await API.patch(`/buysellapi/notifications/${notificationId}/mark-read/`);

      // Update local state
      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Simplified: Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await API.post("/buysellapi/notifications/mark-all-read/");

      // Update local state
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  // Open notification in a modal to view full message
  const openNotification = (notification) => {
    setSelectedNotification(notification);
    setShowNotificationModal(true);
    if (notification && !notification.read) {
      // Mark as read when opened
      markAsRead(notification.id);
    }
  };

  // Build nicely formatted HTML for notification messages (handles plain text and HTML)
  const buildMessageHtml = (msg) => {
    if (!msg) return "";
    const looksLikeHtml = /<[^>]+>/.test(msg);
    if (looksLikeHtml) {
      return msg; // assume server-provided HTML already styled
    }

    // Helper to detect and convert URLs to clickable links
    const linkifyUrls = (text) => {
      const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
      return text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline; word-break: break-all;">${url}</a>`;
      });
    };

    // Convert plaintext into paragraphs and line breaks with auto-linked URLs
    const paragraphs = msg
      .trim()
      .split(/\n\n+/)
      .map(
        (block) =>
          `<p style="margin: 0 0 0.75rem 0;">${block
            .split(/\n/)
            .map((line) => {
              const escaped = line
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
              return linkifyUrls(escaped);
            })
            .join("<br/>")}</p>`
      )
      .join("");
    return paragraphs;
  };

  // Function to fetch user's tracking data from localStorage
  const fetchActiveRates = async () => {
    if (activeRates) return activeRates;
    try {
      const resp = await API.get("/buysellapi/shipping-rates/");
      if (resp?.data) {
        setActiveRates(resp.data);
        return resp.data;
      }
    } catch (e) {
      // ignore 404; otherwise log
      if (e?.response?.status !== 404)
        console.error("fetchActiveRates error", e);
    }
    return null;
  };

  const fetchUserTrackings = async () => {
    try {
      // Base list: only shipments the user added in Shipping Dashboard (local storage via trackingSystem)
      const userAdded = trackingSystem.getUserShipments("default") || [];

      if (!Array.isArray(userAdded) || userAdded.length === 0) {
        setUserShipments([]);
        return;
      }

      // For each user-added tracking, check backend by tracking number and enrich
      let candidateMarkName = null;
      const results = await Promise.all(
        userAdded.map(async (t, idx) => {
          const trackNum = (t.TrackingNum || t.trackingNumber || "").trim();
          const fallbackDate = t.AddedDate || new Date().toISOString();
          let enriched = {
            id: `${trackNum || "no-id"}-${fallbackDate}-${idx}`,
            tracking_number: trackNum,
            status: t.Status || "pending",
            shipping_mark: t.ShippingMark || "",
            cbm: "",
            date_added: fallbackDate,
            action: "",
          };

          if (!trackNum) return enriched;

          try {
            const resp = await API.get(
              `/buysellapi/trackings/by-number/${encodeURIComponent(trackNum)}/`
            );
            if (resp.data) {
              const d = resp.data;
              const statusLabel = getStatusLabel(d.status || "pending");
              enriched = {
                ...enriched,
                status: statusLabel,
                statusValue: d.status || "pending",
                shipping_mark: d.shipping_mark || enriched.shipping_mark || "",
                cbm: d.cbm ?? enriched.cbm ?? "",
                shipping_fee: d.shipping_fee ?? "",
                goods_type: d.goods_type ?? "",
                eta: d.eta ?? "",
                date_added: d.date_added || enriched.date_added,
                action: d.action || enriched.action,
              };

              // Capture a candidate shipping mark name from backend if present
              if (!candidateMarkName && d.shipping_mark) {
                candidateMarkName = d.shipping_mark;
              }

              // Also persist shipping mark into local user-added shipment for faster display next time
              try {
                if (d.shipping_mark) {
                  const tnUpper = (trackNum || "").toUpperCase();
                  const list = trackingSystem.getUserShipments("default") || [];
                  const i = list.findIndex(
                    (s) => (s.TrackingNum || "").toUpperCase() === tnUpper
                  );
                  if (i !== -1) {
                    list[i].ShippingMark = d.shipping_mark;
                    trackingSystem.userTracking.set("default", list);
                    trackingSystem.saveToLocalStorage();
                  }
                }
              } catch (persistErr) {
                // ignore local persist errors
              }
            }
          } catch (err) {
            // If not found in backend, keep user-added data and show helpful note
            if (err?.response?.status === 404) {
              enriched.action =
                enriched.action ||
                "Waiting for admin to add this tracking to the system.";
            } else {
              // Network or server error: keep user data, annotate subtly
              enriched.action =
                enriched.action ||
                "Unable to verify status right now. Showing your saved item.";
            }
          }

          return enriched;
        })
      );

      // Sort results so newest shipments appear first (by date_added descending)
      const sortedResults = results.sort((a, b) => {
        const dateA = new Date(a.date_added || 0);
        const dateB = new Date(b.date_added || 0);
        return dateB - dateA; // Newest first
      });

      setUserShipments(sortedResults);

      // Note: We no longer auto-create or auto-update the user's shipping mark based on
      // data discovered from shipments to avoid unexpected notifications on refresh or
      // when viewing updates. If needed, the user can update their shipping mark manually
      // from the profile section.
    } catch (e) {
      console.error("Failed to load user-added shipments:", e);
      setUserShipments([]);
    }
  };

  // Function to add a new tracking
  const handleAddTracking = async (trackingData) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return;
      }

      const response = await API.post(`/buysellapi/trackings/`, trackingData);

      if (response.data) {
        // Add the new tracking to the state at the TOP (beginning of array)
        setUserShipments((prevShipments) => [response.data, ...prevShipments]);
        toast.success("Tracking added successfully");

        // Optionally, still keep a backup in localStorage
        const userShipments = [
          ...trackingSystem.getUserShipments("default"),
          {
            TrackingNum: response.data.trackingNumber,
            Product: response.data.product || "",
            Quantity: response.data.quantity || "",
            Sender: response.data.sender || "",
            Status: response.data.status || "Pending",
            AddedDate: response.data.addedDate || new Date().toISOString(),
          },
        ];
        trackingSystem.userTracking.set("default", userShipments);
        trackingSystem.saveToLocalStorage();
      }
    } catch (error) {
      console.error("Error adding tracking:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to add tracking");
      }
    }
  };

  // Check if user has a shipping mark (MyProfile)
  const checkMpShippingMark = async () => {
    try {
      const token = localStorage.getItem("token");
      const isAdmin = !!localStorage.getItem("adminToken");

      // Admins don't need shipping marks
      if (isAdmin) {
        setMpHasShippingMark(true);
        return true;
      }

      if (token) {
        try {
          const resp = await API.get("/buysellapi/shipping-marks/me/");
          const d = resp?.data;
          if (d?.markId) {
            setMpHasShippingMark(true);
            return true;
          }
        } catch (_) {}
      }

      // Check localStorage for shipping marks
      const saved = JSON.parse(localStorage.getItem("shippingMarks") || "[]");
      if (Array.isArray(saved) && saved.length > 0 && saved[0].id) {
        setMpHasShippingMark(true);
        return true;
      }

      // Check localStorage for userShippingMark (from FofooAddressGenerator)
      const userMark = localStorage.getItem("userShippingMark");
      if (userMark) {
        try {
          const parsed = JSON.parse(userMark);
          if (parsed?.markId) {
            setMpHasShippingMark(true);
            return true;
          }
        } catch (_) {}
      }

      setMpHasShippingMark(false);
      return false;
    } catch (e) {
      setMpHasShippingMark(false);
      return false;
    }
  };

  // Set default user tracking number (from backend or local marks)
  const setDefaultUserTrackingNumber = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const resp = await API.get("/buysellapi/shipping-marks/me/");
          const d = resp?.data;
          if (d?.markId) {
            setMpNewShipment((prev) => ({
              ...prev,
              userTrackingNumber: d.markId,
            }));
            return;
          }
        } catch (_) {
          // Backend not available or no mark
        }
      }
      // Fallback to local saved marks
      const saved = JSON.parse(localStorage.getItem("shippingMarks") || "[]");
      if (Array.isArray(saved) && saved.length > 0) {
        setMpNewShipment((prev) => ({
          ...prev,
          userTrackingNumber: saved[0].id || "",
        }));
      }
    } catch (e) {
      // ignore
    }
  };

  // MyProfile: handle add shipment locally (same form as ShippingDashboard)
  const handleMpAddShipment = async (e) => {
    e.preventDefault();
    const tn = (mpNewShipment.trackingNumber || "").toUpperCase().trim();

    if (!tn) {
      toast.error("Please enter a tracking number");
      return;
    }

    // Check if user has shipping mark before allowing shipment addition
    const hasMark = await checkMpShippingMark();
    if (!hasMark) {
      toast.error(
        "You must generate a shipping mark before adding shipments. Please visit the Address Generator first."
      );
      return;
    }

    const result = trackingSystem.userAdd(
      tn,
      "",
      1,
      "Package",
      "default",
      mpNewShipment.userTrackingNumber
    );

    if (result.success) {
      toast.success("Shipment added successfully");
      setMpShowAddForm(false);
      setMpNewShipment((prev) => ({ ...prev, trackingNumber: "" }));

      // Best-effort backend sync
      (async () => {
        try {
          // Get user's shipping mark
          let userMarkId = mpNewShipment.userTrackingNumber;
          if (!userMarkId) {
            try {
              const markResp = await API.get("/buysellapi/shipping-marks/me/");
              userMarkId = markResp?.data?.markId || "";
            } catch {
              // No mark yet
            }
          }

          // Check if tracking exists in backend
          const resp = await API.get(
            `/buysellapi/trackings/by-number/${encodeURIComponent(tn)}/`
          );

          const backendTracking = resp?.data;
          if (backendTracking) {
            // If backend has a shipping_mark, sync it to user's mark
            const backendMark = backendTracking.shipping_mark;
            if (backendMark) {
              try {
                await API.put(`/buysellapi/shipping-marks/me/`, {
                  name: backendMark,
                  updateUserProfile: false,
                });
              } catch {
                try {
                  await API.post(`/buysellapi/shipping-marks/me/`, {
                    name: backendMark,
                  });
                } catch (crtErr) {
                  console.warn("Failed to auto-sync shipping mark:", crtErr);
                }
              }

              // Persist to local storage
              const list = trackingSystem.getUserShipments("default") || [];
              const i = list.findIndex(
                (s) => (s.TrackingNum || "").toUpperCase() === tn
              );
              if (i !== -1) {
                list[i].ShippingMark = backendMark;
                trackingSystem.userTracking.set("default", list);
                trackingSystem.saveToLocalStorage();
              }
            } else if (userMarkId) {
              // Backend tracking exists but has no shipping mark yet
              // Update the backend tracking with user's mark
              try {
                await API.put(`/buysellapi/trackings/${backendTracking.id}/`, {
                  ...backendTracking,
                  shipping_mark: userMarkId,
                });

                // Also update local storage
                const list = trackingSystem.getUserShipments("default") || [];
                const i = list.findIndex(
                  (s) => (s.TrackingNum || "").toUpperCase() === tn
                );
                if (i !== -1) {
                  list[i].ShippingMark = userMarkId;
                  trackingSystem.userTracking.set("default", list);
                  trackingSystem.saveToLocalStorage();
                }
              } catch (updateErr) {
                console.warn(
                  "Failed to update backend tracking with user mark:",
                  updateErr
                );
              }
            }
          }
        } catch {
          // Ignore if not found or network issues
        }
      })();

      // Refresh MyProfile list (triggers backend enrichment)
      fetchUserTrackings();
    } else {
      toast.warning(result.message || "Failed to add shipment");
    }
  };

  // Function to delete a tracking
  const handleDeleteTracking = async (trackNum) => {
    setDeleteTarget(trackNum);
    setShowDeleteModal(true);
  };

  const confirmDeleteTracking = async () => {
    const trackNum = deleteTarget;
    try {
      // Find the tracking from the shipments array
      const tracking = userShipments.find(
        (shipment) => shipment.tracking_number === trackNum
      );

      // Try to delete from backend if it exists there
      if (tracking && tracking.id) {
        try {
          await API.delete(`/buysellapi/trackings/${tracking.id}/`);
        } catch (backendErr) {
          // If backend delete fails (404 or other error), continue with local deletion
          console.warn(
            "Backend delete failed, continuing with local deletion:",
            backendErr
          );
        }
      }

      // Remove from localStorage
      const updatedShipments = trackingSystem
        .getUserShipments("default")
        .filter((shipment) => {
          const shipmentTrackNum = (
            shipment.TrackingNum ||
            shipment.tracking_number ||
            ""
          ).toUpperCase();
          return shipmentTrackNum !== trackNum.toUpperCase();
        });
      trackingSystem.userTracking.set("default", updatedShipments);
      trackingSystem.statusHistory.delete(trackNum);
      trackingSystem.saveToLocalStorage();

      // Update local state UI
      setUserShipments((prevShipments) =>
        prevShipments.filter(
          (shipment) => shipment.tracking_number !== trackNum
        )
      );

      toast.success("Tracking data deleted successfully");
    } catch (error) {
      console.error("Error deleting tracking:", error);
      toast.error("Failed to delete tracking. Please try again.");
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const handleEditOrder = (order) => {
    setTempOrder({ ...order });
    setEditingOrderId(order.id);
  };

  const handleSaveOrder = () => {
    if (!tempOrder.title.trim()) {
      toast.error("Please enter a product title");
      return;
    }
    if (!tempOrder.link.trim()) {
      toast.error("Please enter a product link");
      return;
    }
    if (tempOrder.quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    const updatedOrders = buy4meOrders.map((order) =>
      order.id === editingOrderId
        ? { ...tempOrder, lastUpdated: new Date().toISOString() }
        : order
    );

    localStorage.setItem("buy4meOrders", JSON.stringify(updatedOrders));
    setBuy4meOrders(updatedOrders);
    setEditingOrderId(null);
    setTempOrder(null);
    toast.success("Order updated successfully!");
  };

  const handleDeleteOrder = (orderId) => {
    const updatedOrders = buy4meOrders.filter((order) => order.id !== orderId);
    localStorage.setItem("buy4meOrders", JSON.stringify(updatedOrders));
    setBuy4meOrders(updatedOrders);
  };

  const handleCancelOrder = (orderId) => {
    const updatedOrders = buy4meOrders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            status: "Cancelled",
            lastUpdated: new Date().toISOString(),
          }
        : order
    );
    localStorage.setItem("buy4meOrders", JSON.stringify(updatedOrders));
    setBuy4meOrders(updatedOrders);
  };

  // Simplified: Delete notification via API
  const handleDeleteNotification = async (notificationId) => {
    try {
      await API.delete(`/buysellapi/notifications/${notificationId}/`);

      // Update local state
      const updatedNotifications = notifications.filter(
        (n) => n.id !== notificationId
      );
      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter((n) => !n.read).length);
      toast.success("Notification deleted");
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  // Clear all notifications - show confirmation modal
  const handleClearAllNotifications = () => {
    setShowClearAllModal(true);
  };

  // Confirm clearing all notifications
  const confirmClearAllNotifications = async () => {
    try {
      await API.delete("/buysellapi/notifications/clear-all/");

      // Clear local state
      setNotifications([]);
      setUnreadCount(0);
      setShowAllNotifications(false);
      setShowClearAllModal(false);
      toast.success("All notifications cleared");
    } catch (error) {
      console.error("Error clearing all notifications:", error);
      toast.error("Failed to clear all notifications");
    }
  };

  // Function to synchronize user data from different sources
  const synchronizeUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found, skipping data synchronization");
        return;
      }

      console.log("Starting user data synchronization");

      // Validate token format before making API calls
      try {
        const tokenParts = token.split(".");
        if (tokenParts.length !== 3) {
          console.error("Invalid token format, clearing token");
          localStorage.removeItem("token");
          return;
        }
      } catch (tokenError) {
        console.error("Error validating token:", tokenError);
        localStorage.removeItem("token");
        return;
      }

      // Fetch user profile and shipping marks in parallel for faster loading
      console.log("Fetching user data in parallel...");
      const [profileResponse, marksResponse] = await Promise.all([
        API.get(`/buysellapi/users/me/`),
        API.get(`/buysellapi/shipping-marks/`).catch((err) => {
          // Handle 404 gracefully - user might not have shipping marks yet
          if (err?.response?.status === 404) {
            return { data: [] };
          }
          throw err;
        }),
      ]);

      if (!profileResponse.data) {
        console.error("Empty profile data received");
        return;
      }

      console.log("Profile data received, updating state");
      // Update user info state
      const userData = profileResponse.data;
      setUserInfo(userData);
      setOriginalUserInfo(userData);

      let marks = [];
      if (marksResponse.data) {
        // Handle different response formats
        if (marksResponse.data.data && Array.isArray(marksResponse.data.data)) {
          marks = marksResponse.data.data;
          console.log(
            `Found ${marks.length} shipping marks (paginated format)`
          );
        } else if (Array.isArray(marksResponse.data)) {
          marks = marksResponse.data;
          console.log(`Found ${marks.length} shipping marks (array format)`);
        } else {
          console.log("No shipping marks found or unexpected data format");
        }
      }

      if (marks.length > 0) {
        setShippingMarks(marks);
        localStorage.setItem("userShippingMark", JSON.stringify(marks[0]));

        // Check if name is different and needs synchronization
        const firstMark = marks[0];
        if (firstMark.name !== userData.name) {
          console.log("Name mismatch detected, synchronizing names");
          // If names don't match, update the shipping mark to match the user profile
          await updateShippingMark(firstMark._id, userData.name, false);
          toast.info(
            "Your shipping mark name has been synchronized with your profile name"
          );
        } else {
          console.log("Names are in sync, no update needed");
        }
      } else {
        console.log("No shipping marks found, clearing local storage");
        localStorage.removeItem("userShippingMark");
      }

      console.log("Data synchronization completed successfully");
    } catch (error) {
      console.error("Error synchronizing user data:", error);

      if (error.response?.status === 401) {
        console.error("Authentication error during synchronization");
        // Don't show token expired error to user during background sync
        // Just log them out if needed
        localStorage.removeItem("token");
      } else if (error.response) {
        console.error(
          "Response error:",
          error.response.status,
          error.response.data
        );
      } else if (error.request) {
        console.error("No response received during synchronization");
      }

      // Silent failure - we don't want to show an error to the user for background sync
    }
  };

  // Call synchronization function when the component mounts
  useEffect(() => {
    try {
      synchronizeUserData();
    } catch (error) {
      console.error("Error in synchronizeUserData useEffect:", error);
      // Silent failure, don't show error to user for background sync
    }
  }, []);

  // Add event listeners for online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log("Device is back online, refreshing data...");
      setError(null);
      // Refresh data in parallel when coming back online
      Promise.all([fetchUserProfile(), fetchUserShippingMarks()]).catch(
        (err) => {
          console.error("Error refreshing data after coming online:", err);
        }
      );
      toast.success("You are back online! Data has been refreshed.");
    };

    const handleOffline = () => {
      console.log("Device went offline");
      setError("You are offline. Some data may not be up to date.");
      toast.warning("You are offline. Using cached data.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Function to handle user logout
  const handleLogout = () => {
    // Clear all user-related data from localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("userShippingMark");

    // Show success message
    toast.success("You have been logged out successfully");

    // Dispatch custom event to notify Navbar of logout
    window.dispatchEvent(new Event("authChange"));

    // Redirect to login page
    navigate("/login");
  };

  // Add component for adding new tracking
  const AddTrackingForm = () => {
    const [trackingData, setTrackingData] = useState({
      trackingNumber: "",
      sender: "",
      product: "",
      quantity: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setTrackingData((prev) => ({
        ...prev,
        [name]: value,
      }));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();

      if (!trackingData.trackingNumber) {
        toast.error("Tracking number is required");
        return;
      }

      setIsSubmitting(true);

      try {
        await handleAddTracking(trackingData);

        // Reset form after successful submission
        setTrackingData({
          trackingNumber: "",
          sender: "",
          product: "",
          quantity: "",
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4"
      >
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Add New Tracking
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              htmlFor="trackingNumber"
            >
              Tracking Number*
            </label>
            <input
              type="text"
              id="trackingNumber"
              name="trackingNumber"
              value={trackingData.trackingNumber}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              htmlFor="sender"
            >
              Sender
            </label>
            <input
              type="text"
              id="sender"
              name="sender"
              value={trackingData.sender}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              htmlFor="product"
            >
              Product
            </label>
            <input
              type="text"
              id="product"
              name="product"
              value={trackingData.product}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              htmlFor="quantity"
            >
              Quantity
            </label>
            <input
              type="text"
              id="quantity"
              name="quantity"
              value={trackingData.quantity}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !trackingData.trackingNumber}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Adding..." : "Add Tracking"}
          </button>
        </div>
      </form>
    );
  };

  // Component to display and manage tracking numbers
  const TrackingsList = ({ trackings, onView }) => {
    if (!trackings || trackings.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No tracking numbers found.
          </p>
        </div>
      );
    }

    const badgeClass = (status) => {
      const s = (status || "").toLowerCase();
      if (s.includes("delivered") || s === "pick_up")
        return "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100";
      if (s.includes("transit") || s.includes("vessel") || s.includes("way"))
        return "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100";
      if (s.includes("cancel") || s.includes("reject"))
        return "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100";
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100";
    };

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tracking Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Shipping Mark
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                CBM
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date Added
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                View
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
            {trackings.map((t) => (
              <tr
                key={t.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {t.tracking_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {t.shipping_mark || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClass(
                      t.status
                    )}`}
                  >
                    {t.status || "pending"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {t.cbm ?? "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {t.date_added ? new Date(t.date_added).toLocaleString() : "-"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate">
                  {t.action || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onView && onView(t)}
                    className="text-primary hover:text-primary/80"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // TrackingManager component to handle both adding and displaying tracking numbers
  const TrackingManager = () => {
    const [trackings, setTrackings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    // Remove Chakra UI toast
    // const { toast } = useToast();
    // use imported API_BASE_URL

    useEffect(() => {
      fetchTrackings();
    }, []);

    const fetchTrackings = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Authentication required");
        }

        const response = await API.get("/buysellapi/trackings/");

        setTrackings(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching trackings:", err);
        setError("Failed to load tracking numbers. Please try again later.");
        toast.error("Failed to load tracking numbers.");
      } finally {
        setLoading(false);
      }
    };

    const handleAddTracking = async (trackingData) => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Authentication required");
        }

        const response = await API.post("/buysellapi/trackings/", trackingData);

        setTrackings([...trackings, response.data]);
        setShowAddForm(false);
        toast.success("Tracking number added successfully.");
      } catch (err) {
        console.error("Error adding tracking:", err);
        toast.error(
          err.response?.data?.message || "Failed to add tracking number."
        );
      }
    };

    const handleDeleteTracking = async (trackingId) => {
      if (
        !window.confirm("Are you sure you want to delete this tracking number?")
      ) {
        return;
      }

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Authentication required");
        }

        await API.delete(`/buysellapi/trackings/${trackingId}/`);

        setTrackings(
          trackings.filter(
            (tracking) => (tracking._id || tracking.id) !== trackingId
          )
        );
        toast.success("Tracking number deleted successfully.");
      } catch (err) {
        console.error("Error deleting tracking:", err);
        toast.error("Failed to delete tracking number.");
      }
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            My Tracking Numbers
          </h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showAddForm ? (
              <>
                <span className="mr-2">Cancel</span>
                <FaTimes />
              </>
            ) : (
              <>
                <span className="mr-2">Add New</span>
                <FaPlus />
              </>
            )}
          </button>
        </div>

        {showAddForm && (
          <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <AddTrackingForm onSubmit={handleAddTracking} />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 dark:text-red-400">{error}</p>
            <button
              onClick={fetchTrackings}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          </div>
        ) : (
          <TrackingsList
            trackings={trackings}
            onDelete={handleDeleteTracking}
          />
        )}
      </div>
    );
  };

  // Add a function to fetch user invoices
  const fetchUserInvoices = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found for invoices fetch");
        return;
      }

      // Fetch buy4me requests with invoices
      const buy4meResponse = await API.get("/buysellapi/buy4me-requests/");
      const buy4meRequests = Array.isArray(buy4meResponse.data)
        ? buy4meResponse.data
        : buy4meResponse.data.results || [];

      // Filter requests that have invoices
      const invoicesWithRequests = buy4meRequests
        .filter((request) => request.invoice && request.invoice_created)
        .map((request) => ({
          request: request,
          invoice: request.invoice,
        }));

      setUserInvoices(invoicesWithRequests);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      // Only show error if we're online
      if (checkOnlineStatus()) {
        toast.error("Failed to load invoices. Please try again later.");
      }
    }
  };

  // Update useEffect to fetch invoices when needed
  useEffect(() => {
    if (activeTab === "buy4me" && activeSubTab === "invoices") {
      fetchUserInvoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeSubTab]);

  // Add a function to handle viewing an invoice
  const handleViewInvoice = (invoice, request) => {
    setSelectedInvoice(invoice);
    setSelectedInvoiceRequest(request);
    setShowInvoiceModal(true);
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                {selectedAvatar && hasAvatar(selectedAvatar) ? (
                  <AvatarSVG
                    avatarId={selectedAvatar}
                    size={96}
                    className="w-full h-full"
                  />
                ) : (
                  <FaUser className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => setShowAvatarSelector(true)}
                  className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full hover:bg-primary/90 transition-colors shadow-lg"
                >
                  <FaEdit className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                {isLoading
                  ? "Loading..."
                  : userInfo.name ||
                    currentUser?.full_name ||
                    currentUser?.username ||
                    "User"}
                {currentUser?.is_agent && (
                  <>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      currentUser?.agent_type === "corporate"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200"
                        : currentUser?.agent_type === "local"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200"
                        : currentUser?.agent_type === "affiliate"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200"
                        : "bg-primary/10 text-primary border-primary/20"
                    }`}>
                      {currentUser?.agent_type === "corporate" ? (
                        <FaBuilding className="mr-1" />
                      ) : currentUser?.agent_type === "local" ? (
                        <FaMapMarkerAlt className="mr-1" />
                      ) : currentUser?.agent_type === "affiliate" ? (
                        <FaHandshake className="mr-1" />
                      ) : (
                        <FaUserTag className="mr-1" />
                      )}
                      {currentUser?.agent_type === "corporate"
                        ? "Corporate Agent"
                        : currentUser?.agent_type === "local"
                        ? "Local Agent"
                        : currentUser?.agent_type === "affiliate"
                        ? "Affiliate Agent"
                        : "Agent"}
                    </span>
                    <Link
                      to="/agent-dashboard"
                      className="ml-3 inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg text-sm"
                    >
                      <FaUserTag className="mr-2" />
                      Agent Dashboard
                    </Link>
                  </>
                )}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {isLoading
                  ? "Please wait..."
                  : userInfo.email || currentUser?.email || "No email"}
              </p>

              {/* Become Agent Button - Only show if user is not already an agent and no pending request */}
              {!isLoading && !currentUser?.is_agent && agentRequestStatus !== "pending" && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowBecomeAgentModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                  >
                    <FaUserTag className="mr-2" />
                    Become Agent
                  </button>
                </div>
              )}

              {/* Agent Request Status */}
              {agentRequestStatus && !currentUser?.is_agent && (
                <div className="mt-3">
                  {agentRequestStatus === "pending" && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      <FaRegClock className="mr-1" />
                      Agent Request Pending
                    </span>
                  )}
                  {agentRequestStatus === "approved" && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <FaCheckCircle className="mr-1" />
                      Agent Request Approved
                      {currentUser?.agent_type && (
                        <span className="ml-2 font-semibold">
                          ({currentUser?.agent_type === "corporate"
                            ? "Corporate"
                            : currentUser?.agent_type === "local"
                            ? "Local"
                            : currentUser?.agent_type === "affiliate"
                            ? "Affiliate"
                            : ""} Agent)
                        </span>
                      )}
                    </span>
                  )}
                  {agentRequestStatus === "rejected" && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      <FaExclamationTriangle className="mr-1" />
                      Agent Request Rejected
                    </span>
                  )}
                </div>
              )}

              {/* Add refresh button and status indicators */}
              <div className="mt-2 min-h-[32px] flex items-center justify-center sm:justify-start gap-2">
                {isLoading && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 animate-fade-in">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-800 dark:text-blue-200"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Loading...
                  </span>
                )}

                {error && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 max-w-full animate-fade-in">
                    <svg
                      className="w-4 h-4 mr-1.5 flex-shrink-0"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="truncate">{error}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 sm:p-4">
              <nav className="space-y-1 sm:space-y-2">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                    activeTab === "profile"
                      ? "bg-primary text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <FaUser className="w-4 h-4 sm:w-5 sm:h-5" />
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab("tracking")}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                    activeTab === "tracking"
                      ? "bg-primary text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <FaTruck
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${
                      activeTab === "tracking" ? "animate-truck" : ""
                    }`}
                  />
                  Tracking
                </button>
                <button
                  onClick={() => setActiveTab("buy4me")}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                    activeTab === "buy4me"
                      ? "bg-primary text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <FaShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                  Buy4Me
                </button>
                <button
                  onClick={() => setActiveTab("orders")}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                    activeTab === "orders"
                      ? "bg-primary text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <FaShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                  Orders
                </button>
                <button
                  onClick={() => setActiveTab("updates")}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors text-sm sm:text-base relative ${
                    activeTab === "updates"
                      ? "bg-primary text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <FaBell className="w-4 h-4 sm:w-5 sm:h-5" />
                  Updates
                  {unreadCount > 0 && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full min-w-[20px] text-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                    activeTab === "settings"
                      ? "bg-primary text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <FaCog className="w-4 h-4 sm:w-5 sm:h-5" />
                  Settings
                </button>
                <button
                  onClick={() => setActiveTab("shippingmark")}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                    activeTab === "shippingmark"
                      ? "bg-primary text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <FaMapMarkerAlt className="w-4 h-4 sm:w-5 sm:h-5" />
                  Shipping Mark
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm sm:text-base"
                >
                  <FaSignOutAlt className="w-4 h-4 sm:w-5 sm:h-5" />
                  Logout
                </button>
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Profile Information
                  </h2>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <FaEdit className="w-4 h-4" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <FaSave className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        <FaTimes className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={userInfo.name}
                        onChange={(e) =>
                          setUserInfo({ ...userInfo, name: e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">
                        {userInfo.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={userInfo.email}
                        onChange={(e) =>
                          setUserInfo({ ...userInfo, email: e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">
                        {userInfo.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={userInfo.phone}
                        onChange={(e) =>
                          setUserInfo({ ...userInfo, phone: e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">
                        {userInfo.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Address
                    </label>
                    {isEditing ? (
                      <textarea
                        value={userInfo.address}
                        onChange={(e) =>
                          setUserInfo({ ...userInfo, address: e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        rows="3"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">
                        {userInfo.address}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MyProfile Add Shipment Modal */}
            {mpShowAddForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
                      Add New Shipment
                    </h2>
                    <button
                      onClick={() => setMpShowAddForm(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      aria-label="Close add shipment form"
                    >
                      <FaTimes />
                    </button>
                  </div>
                  <form onSubmit={handleMpAddShipment} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tracking Number
                      </label>
                      <input
                        type="text"
                        value={mpNewShipment.trackingNumber}
                        onChange={(e) =>
                          setMpNewShipment({
                            ...mpNewShipment,
                            trackingNumber: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        User Shipping Mark ID
                      </label>
                      <input
                        type="text"
                        value={mpNewShipment.userTrackingNumber}
                        readOnly
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-0"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        This is auto-filled from your shipping mark and cannot
                        be edited.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Add Shipment
                      </button>
                      <button
                        type="button"
                        onClick={() => setMpShowAddForm(false)}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Shipping Mark Tab */}
            {activeTab === "shippingmark" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Your Permanent Shipping Mark
                  </h2>
                </div>

                {shippingMarks.length === 0 ? (
                  <div className="text-center py-8">
                    <FaMapMarkerAlt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No shipping marks found
                    </p>
                    <Link
                      to="/Fofoofo-address-generator"
                      className="inline-block mt-4 text-primary hover:text-primary/90"
                    >
                      Generate your permanent shipping mark →
                    </Link>
                  </div>
                ) : (
                  <div>
                    {/* Information banner */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
                      <div className="flex items-start gap-2">
                        <FaInfoCircle className="text-blue-500 mt-1" />
                        <div>
                          <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">
                            Permanent Shipping Address
                          </p>
                          <p className="text-blue-800 dark:text-blue-200 text-sm">
                            This is your permanent shipping address for all your
                            shipments to the fofoofoimport warehouse. Each user
                            is assigned one shipping mark for easy
                            identification of your packages.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Display the shipping mark */}
                    {shippingMarks.map((mark) => (
                      <div
                        key={mark._id}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-primary"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <div className="flex items-center mb-2">
                              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                                {mark.name}
                              </h3>
                              <span className="ml-2 px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Permanent
                              </span>
                              {mark.fromLocalStorage && (
                                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                  Local Copy
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Mark ID: {mark.markId}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                              Shipping Mark
                            </p>
                            <div className="relative">
                              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className="text-sm text-gray-900 dark:text-white break-all">
                                  {mark.shippingMark}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  copyToClipboard(mark.shippingMark)
                                }
                                className="absolute top-3 right-3 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              >
                                {copied ? (
                                  <FaCheck className="w-5 h-5 text-green-500" />
                                ) : (
                                  <FaCopy className="w-5 h-5" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                              Full Address
                            </p>
                            <div className="relative">
                              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className="text-sm text-gray-900 dark:text-white break-all whitespace-pre-line">
                                  {mark.fullAddress || mark.address}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    mark.fullAddress || mark.address
                                  )
                                }
                                className="absolute top-3 right-3 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              >
                                {copied ? (
                                  <FaCheck className="w-5 h-5 text-green-500" />
                                ) : (
                                  <FaCopy className="w-5 h-5" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <div className="flex items-start gap-2">
                              <FaInfoCircle className="text-yellow-500 mt-1" />
                              <div>
                                <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                                  Important Note
                                </p>
                                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                                  This is your permanent shipping mark. Use it
                                  for all your packages to ensure they are
                                  correctly identified as yours.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tracking Tab */}
            {activeTab === "tracking" && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Shipment Tracking ({userShipments.length})
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        fetchUserTrackings();
                        toast.info("Refreshing tracking data...");
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <FaSyncAlt className="w-4 h-4" />
                      Refresh
                    </button>
                    <button
                      onClick={async () => {
                        const hasMark = await checkMpShippingMark();
                        if (!hasMark) {
                          toast.error(
                            "You must generate a shipping mark before adding shipments. Please visit the Address Generator first."
                          );
                          return;
                        }
                        setMpShowAddForm(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!mpHasShippingMark}
                      title={
                        !mpHasShippingMark
                          ? "Generate a shipping mark first"
                          : ""
                      }
                    >
                      <FaTruck className="w-4 h-4" />
                      Add Shipment
                    </button>
                  </div>
                </div>

                {/* Display summary of trackings */}
                {userShipments.length > 0 && (
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <FaInfoCircle className="text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                        Your Tracking Numbers
                      </h3>
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      You have {userShipments.length} shipment
                      {userShipments.length !== 1 ? "s" : ""} being tracked.
                      {userShipments.filter((s) =>
                        s.status?.toLowerCase().includes("transit")
                      ).length > 0 && (
                        <span className="ml-2 font-medium">
                          (
                          {
                            userShipments.filter((s) =>
                              s.status?.toLowerCase().includes("transit")
                            ).length
                          }{" "}
                          in transit)
                        </span>
                      )}
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {userShipments.length === 0 ? (
                    <div className="text-center py-8">
                      <FaTruck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No shipments to track
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Add your tracking numbers in the Shipping Dashboard to
                        track them here
                      </p>
                      <button
                        onClick={async () => {
                          const hasMark = await checkMpShippingMark();
                          if (!hasMark) {
                            toast.error(
                              "You must generate a shipping mark before adding shipments. Please visit the Address Generator first."
                            );
                            return;
                          }
                          setMpShowAddForm(true);
                        }}
                        className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!mpHasShippingMark}
                        title={
                          !mpHasShippingMark
                            ? "Generate a shipping mark first"
                            : ""
                        }
                      >
                        Add Shipment
                      </button>
                      <div className="mt-4 flex flex-col items-center gap-2 text-sm">
                        <button
                          onClick={fetchUserTrackings}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                          Load saved trackings
                        </button>
                        <p className="text-gray-500 dark:text-gray-400">
                          Saved in browser:{" "}
                          {(() => {
                            try {
                              // Count user-added shipments stored by ShippingDashboard
                              return (
                                (
                                  trackingSystem.getUserShipments("default") ||
                                  []
                                ).length || 0
                              );
                            } catch {
                              return 0;
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Scrollable shipment cards container */}
                      <div
                        className="max-h-[350px] overflow-y-auto pr-2 mb-6"
                        style={{
                          scrollbarWidth: "thin",
                          scrollbarColor: "#cbd5e0 transparent",
                        }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {(showAllShipments
                            ? userShipments
                            : userShipments.slice(0, 3)
                          ).map((shipment) => (
                            <div
                              key={shipment.id}
                              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <FaBox className="text-primary" />
                                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                    {shipment.tracking_number}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={async () => {
                                      setSelectedTracking(shipment);
                                      setShowTrackingModal(true);
                                      await fetchActiveRates();
                                    }}
                                    className="text-primary hover:text-primary/80 transition-colors"
                                    title="View Details"
                                  >
                                    <FaEye />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteTracking(
                                        shipment.tracking_number
                                      )
                                    }
                                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                    title="Delete Shipment"
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      shipment.status
                                        ?.toLowerCase()
                                        .includes("delivered") ||
                                      shipment.status?.toLowerCase() ===
                                        "pick_up"
                                        ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                                        : shipment.status
                                            ?.toLowerCase()
                                            .includes("transit")
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                                        : shipment.status
                                            ?.toLowerCase()
                                            .includes("cancel")
                                        ? "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
                                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                                    }`}
                                  >
                                    {shipment.status || "Pending"}
                                  </span>
                                </div>

                                {shipment.shipping_mark && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Mark:</span>{" "}
                                    {shipment.shipping_mark}
                                  </div>
                                )}

                                {shipment.cbm && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">CBM:</span>{" "}
                                    {shipment.cbm}
                                  </div>
                                )}

                                {shipment.action && (
                                  <div
                                    className="text-xs text-gray-600 dark:text-gray-400 truncate"
                                    title={shipment.action}
                                  >
                                    <span className="font-medium">Notes:</span>{" "}
                                    {shipment.action}
                                  </div>
                                )}

                                <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1 mt-2">
                                  <FaRegClock />
                                  {shipment.date_added
                                    ? new Date(
                                        shipment.date_added
                                      ).toLocaleDateString()
                                    : "N/A"}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Show More/Less Toggle Button */}
                      {userShipments.length > 3 && (
                        <div className="mt-6 text-center">
                          <button
                            onClick={() =>
                              setShowAllShipments(!showAllShipments)
                            }
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                          >
                            {showAllShipments ? (
                              <>
                                <FaEye className="w-4 h-4" />
                                Show Recent Only ({userShipments.length -
                                  3}{" "}
                                hidden)
                              </>
                            ) : (
                              <>
                                <FaHistory className="w-4 h-4" />
                                Show All {userShipments.length} Shipments
                              </>
                            )}
                          </button>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {showAllShipments
                              ? "Viewing all shipments"
                              : `Showing ${Math.min(
                                  3,
                                  userShipments.length
                                )} most recent`}
                          </p>
                        </div>
                      )}

                      {/* Cards-only view: table removed per request */}

                      {showTrackingModal && selectedTracking && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                              <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  Tracking Details
                                </h3>
                                <button
                                  onClick={() => setShowTrackingModal(false)}
                                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                  <FaTimes />
                                </button>
                              </div>
                            </div>

                            <div className="p-6 space-y-6">
                              {/* Tracking Information */}
                              <div>
                                <h4 className="text-base font-semibold text-gray-800 dark:text-white mb-3">
                                  Tracking Information
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Tracking Number:
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {selectedTracking.tracking_number}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Status:
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {selectedTracking.status}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Shipping Mark:
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white break-all">
                                      {selectedTracking.shipping_mark || "-"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      CBM:
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {selectedTracking.cbm ?? "-"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Shipping Fee:
                                    </span>
                                    <span className="font-semibold text-green-600 dark:text-green-400">
                                      {selectedTracking.shipping_fee
                                        ? `$${parseFloat(
                                            selectedTracking.shipping_fee
                                          ).toFixed(2)}`
                                        : "-"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Goods Type:
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {selectedTracking.goods_type
                                        ? selectedTracking.goods_type
                                            .charAt(0)
                                            .toUpperCase() +
                                          selectedTracking.goods_type.slice(1)
                                        : "-"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      ETA:
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {selectedTracking.eta
                                        ? new Date(
                                            selectedTracking.eta
                                          ).toLocaleDateString()
                                        : "-"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Date Added:
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {selectedTracking.date_added
                                        ? new Date(
                                            selectedTracking.date_added
                                          ).toLocaleString()
                                        : "-"}
                                    </span>
                                  </div>
                                </div>
                                {selectedTracking.action && (
                                  <div className="mt-3">
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                                      Notes:
                                    </span>
                                    <p className="font-medium text-gray-900 dark:text-white mt-1 text-sm whitespace-pre-wrap">
                                      {selectedTracking.action}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Active Shipping Rates */}
                              {activeRates && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                  <h4 className="text-base font-semibold text-gray-800 dark:text-white mb-3">
                                    Active Shipping Rates
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                        Normal Goods Rate
                                      </p>
                                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                        $
                                        {parseFloat(
                                          activeRates.normal_goods_rate
                                        ).toFixed(2)}{" "}
                                        <span className="text-sm font-normal">
                                          per CBM
                                        </span>
                                      </p>
                                      {activeRates.normal_goods_rate_lt1 && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                          CBM &lt; 1: $
                                          {parseFloat(
                                            activeRates.normal_goods_rate_lt1
                                          ).toFixed(2)}
                                        </p>
                                      )}
                                    </div>
                                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                        Special Goods Rate
                                      </p>
                                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                        $
                                        {parseFloat(
                                          activeRates.special_goods_rate
                                        ).toFixed(2)}{" "}
                                        <span className="text-sm font-normal">
                                          per CBM
                                        </span>
                                      </p>
                                      {activeRates.special_goods_rate_lt1 && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                          CBM &lt; 1: $
                                          {parseFloat(
                                            activeRates.special_goods_rate_lt1
                                          ).toFixed(2)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                              <div className="flex justify-end">
                                <button
                                  onClick={() => setShowTrackingModal(false)}
                                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                  Close
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Buy4Me Tab */}
            {activeTab === "buy4me" && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
                {/* Buy4Me Sub-tabs */}
                <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setActiveSubTab("orders")}
                    className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors ${
                      activeSubTab === "orders"
                        ? "text-primary border-b-2 border-primary"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    <FaShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 inline-block mr-1.5 sm:mr-2" />
                    Orders
                  </button>
                  <button
                    onClick={() => setActiveSubTab("tracking")}
                    className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors ${
                      activeSubTab === "tracking"
                        ? "text-primary border-b-2 border-primary"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    <FaTruck className="w-4 h-4 sm:w-5 sm:h-5 inline-block mr-1.5 sm:mr-2" />
                    Tracking
                  </button>
                  <button
                    onClick={() => setActiveSubTab("invoices")}
                    className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors ${
                      activeSubTab === "invoices"
                        ? "text-primary border-b-2 border-primary"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    <FaFileInvoiceDollar className="w-4 h-4 sm:w-5 sm:h-5 inline-block mr-1.5 sm:mr-2" />
                    Invoices
                  </button>
                </div>

                {/* Buy4Me Orders Sub-tab */}
                {activeSubTab === "orders" && (
                  <div className="space-y-4">
                    {buy4meOrders.length === 0 ? (
                      <div className="text-center py-8">
                        <FaShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">
                          No Buy4Me orders found
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                          Start shopping with our Buy4Me service
                        </p>
                        <Link
                          to="/Buy4me"
                          className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Go to Buy4Me
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                        {(showAllBuy4meOrders
                          ? buy4meOrders
                          : buy4meOrders.slice(0, 2)
                        ).map((order) => {
                          const getStatusColor = (status) => {
                            switch (status?.toLowerCase()) {
                              case "pending":
                                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
                              case "approved":
                                return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
                              case "processing":
                                return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
                              case "completed":
                                return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
                              case "cancelled":
                              case "rejected":
                                return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
                              default:
                                return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
                            }
                          };

                          return (
                            <div
                              key={order.id}
                              className="border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-white dark:bg-gray-800 hover:shadow-sm transition-shadow"
                            >
                              <div className="flex flex-col gap-1.5">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                                  {order.title}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                  {order.description || "No description"}
                                </p>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                  <span>
                                    {new Date(
                                      order.created_at ||
                                        order.createdAt ||
                                        order.date
                                    ).toLocaleDateString()}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                      order.status
                                    )}`}
                                  >
                                    {order.status
                                      ? order.status.charAt(0).toUpperCase() +
                                        order.status.slice(1)
                                      : "Pending"}
                                  </span>
                                  {order.invoice &&
                                    order.invoice.status === "pending" && (
                                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                        Invoice Pending
                                      </span>
                                    )}
                                  {order.invoice &&
                                    order.invoice.status === "paid" && (
                                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                        Invoice Paid
                                      </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {order.status === "pending" && (
                                    <button
                                      onClick={() =>
                                        navigate("/Buy4me", {
                                          state: { order },
                                        })
                                      }
                                      className="px-3 py-1 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {order.invoice &&
                                    order.invoice.status === "pending" && (
                                      <button
                                        onClick={() =>
                                          navigate("/Payment", {
                                            state: { order },
                                          })
                                        }
                                        className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                                      >
                                        Pay Invoice
                                      </button>
                                    )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {buy4meOrders.length > 2 && (
                          <div className="text-center pt-3 border-t border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() =>
                                setShowAllBuy4meOrders((prev) => !prev)
                              }
                              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors"
                            >
                              {showAllBuy4meOrders
                                ? "Show fewer orders"
                                : `View all ${buy4meOrders.length} orders`}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Buy4Me Tracking Sub-tab */}
                {activeSubTab === "tracking" && (
                  <div className="space-y-4">
                    {trackableBuy4meOrders.length === 0 ? (
                      <div className="text-center py-8">
                        <FaTruck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">
                          No Buy4Me shipments to track
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                          Your Buy4Me shipments will appear here once they are
                          approved
                        </p>
                        <Link
                          to="/Buy4me"
                          className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Go to Buy4Me
                        </Link>
                      </div>
                    ) : (
                      <div
                        className="space-y-3 max-h-[600px] overflow-y-auto pr-2"
                        style={{
                          scrollbarWidth: "thin",
                          scrollbarColor: "#cbd5e0 transparent",
                        }}
                      >
                        {(showAllBuy4meTracking
                          ? trackableBuy4meOrders
                          : trackableBuy4meOrders.slice(0, 2)
                        ).map((order) => {
                          const trackingSteps = [
                            {
                              key: "sourcing",
                              label: "Sourcing",
                              icon: FaSearch,
                            },
                            {
                              key: "buying",
                              label: "Buying",
                              icon: FaShoppingCart,
                            },
                            {
                              key: "sent_to_warehouse",
                              label: "Sent to Warehouse",
                              icon: FaBox,
                            },
                            { key: "shipped", label: "Shipped", icon: FaTruck },
                            {
                              key: "at_the_port",
                              label: "At the Port",
                              icon: FaShip,
                            },
                            {
                              key: "off_loading",
                              label: "Off Loading",
                              icon: FaBoxOpen,
                            },
                            {
                              key: "pickup",
                              label: "Pickup",
                              icon: FaCheckCircle,
                            },
                          ];

                          const currentStepIndex = order.tracking_status
                            ? trackingSteps.findIndex(
                                (step) => step.key === order.tracking_status
                              )
                            : -1;

                          return (
                            <div
                              key={order.id}
                              onClick={() => {
                                setSelectedBuy4meTrackingOrder(order);
                                setShowBuy4meTrackingModal(true);
                              }}
                              className="border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-white dark:bg-gray-800 cursor-pointer hover:border-primary hover:shadow-sm transition-all"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                                    {order.title}
                                  </h3>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Request #{order.id}
                                  </p>
                                  {currentStepIndex >= 0 && (
                                    <p className="text-xs text-primary mt-1 font-medium">
                                      Current:{" "}
                                      {trackingSteps[currentStepIndex].label}
                                    </p>
                                  )}
                                </div>
                                <FaEye className="text-gray-400 text-base flex-shrink-0" />
                              </div>
                            </div>
                          );
                        })}
                        {trackableBuy4meOrders.length > 2 && (
                          <div className="text-center pt-3 border-t border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() =>
                                setShowAllBuy4meTracking((prev) => !prev)
                              }
                              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors"
                            >
                              {showAllBuy4meTracking
                                ? "Show fewer shipments"
                                : `View all ${trackableBuy4meOrders.length} shipments`}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Buy4Me Invoices Sub-tab */}
                {activeSubTab === "invoices" && (
                  <div className="space-y-4">
                    {userInvoices.length === 0 ? (
                      <div className="text-center py-8">
                        <FaFileInvoiceDollar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">
                          No Buy4Me invoices found
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                          Your Buy4Me invoices will appear here
                        </p>
                        <Link
                          to="/Buy4Me"
                          className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Go to Buy4Me
                        </Link>
                      </div>
                    ) : (
                      <div
                        className="space-y-3 max-h-[600px] overflow-y-auto pr-2"
                        style={{
                          scrollbarWidth: "thin",
                          scrollbarColor: "#cbd5e0 transparent",
                        }}
                      >
                        {(showAllBuy4meInvoices
                          ? sortedBuy4meInvoices
                          : sortedBuy4meInvoices.slice(0, 2)
                        ).map((item) => (
                          <div
                            key={item.invoice.invoiceNumber}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                                  {item.request.title}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Invoice #{item.invoice.invoiceNumber}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                  item.invoice.status === "paid"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                    : item.invoice.status === "cancelled"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                }`}
                              >
                                {item.invoice.status.charAt(0).toUpperCase() +
                                  item.invoice.status.slice(1)}
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-xs">
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">
                                  Amount:
                                </p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  ${item.invoice.amount.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">
                                  Date:
                                </p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {new Date(
                                    item.invoice.createdAt ||
                                      item.invoice.created_at
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex justify-between items-center gap-2">
                                <button
                                  onClick={() =>
                                    handleViewInvoice(
                                      item.invoice,
                                      item.request
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors"
                                >
                                  <FaEye className="text-sm" />
                                  View Details
                                </button>

                                {item.invoice.status === "pending" && (
                                  <button
                                    onClick={() => {
                                      // Navigate to payment page for this invoice
                                      navigate("/Payment", {
                                        state: {
                                          invoiceId: item.invoice.invoiceNumber,
                                        },
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
                                  >
                                    <FaCreditCard className="text-sm" />
                                    Pay Now
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {sortedBuy4meInvoices.length > 2 && (
                          <div className="text-center pt-3 border-t border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() =>
                                setShowAllBuy4meInvoices((prev) => !prev)
                              }
                              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors"
                            >
                              {showAllBuy4meInvoices
                                ? "Show fewer invoices"
                                : `View all ${sortedBuy4meInvoices.length} invoices`}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === "orders" && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Order History
                  </h2>
                  {orders.length > 2 && (
                    <Link
                      to="/Orders"
                      className="text-sm text-primary hover:text-primary/90"
                    >
                      View All Orders
                    </Link>
                  )}
                </div>
                {orders.length === 0 ? (
                  <div className="text-center py-8">
                    <FaShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No orders found
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      Your order history will appear here
                    </p>
                    <Link
                      to="/Shop"
                      className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Go to Shop
                    </Link>
                  </div>
                ) : (
                  <div
                    className="space-y-3 max-h-[600px] overflow-y-auto pr-2"
                    style={{
                      scrollbarWidth: "thin",
                      scrollbarColor: "#cbd5e0 transparent",
                    }}
                  >
                    {orders.slice(0, 2).map((order) => {
                      // Handle different item formats
                      let items = [];
                      if (order.items) {
                        if (Array.isArray(order.items)) {
                          items = order.items;
                        } else if (typeof order.items === "string") {
                          try {
                            items = JSON.parse(order.items);
                          } catch (e) {
                            console.error("Failed to parse items JSON:", e);
                          }
                        } else if (typeof order.items === "object") {
                          items = Object.values(order.items);
                        }
                      }

                      const getStatusColor = (status) => {
                        switch (status?.toLowerCase()) {
                          case "delivered":
                            return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
                          case "processing":
                            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
                          case "shipped":
                            return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
                          case "cancelled":
                            return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
                          default:
                            return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
                        }
                      };

                      return (
                        <div
                          key={order.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                Order #{order.id}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Placed on{" "}
                                {new Date(
                                  order.created_at || order.date
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-sm ${getStatusColor(
                                order.status
                              )}`}
                            >
                              {order.status || "Pending"}
                            </span>
                          </div>

                          {items.length > 0 ? (
                            <div className="space-y-3 mb-4">
                              {items.map((item, index) => {
                                const itemName =
                                  item.name ||
                                  item.product_name ||
                                  "Unnamed Product";
                                const itemImage =
                                  item.image ||
                                  item.image_url ||
                                  getPlaceholderImagePath();
                                const itemQuantity = item.quantity || 0;
                                const itemPrice =
                                  typeof item.price === "number"
                                    ? item.price
                                    : parseFloat(item.price || 0);

                                return (
                                  <div
                                    key={index}
                                    className="flex items-center gap-4"
                                  >
                                    <img
                                      src={itemImage}
                                      alt={itemName}
                                      className="w-16 h-16 rounded-lg object-cover"
                                      onError={(e) => {
                                        e.target.src =
                                          getPlaceholderImagePath();
                                      }}
                                    />
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900 dark:text-white">
                                        {itemName}
                                      </p>
                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Quantity: {itemQuantity} × ₵
                                        {itemPrice.toFixed(2)}
                                        {item.size &&
                                          item.size !== "default" &&
                                          item.size !== "null" &&
                                          item.size !== null &&
                                          ` • Size: ${item.size}`}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="mb-4 text-center py-4 text-gray-500 dark:text-gray-400">
                              <p className="text-sm">
                                No items found in this order
                              </p>
                            </div>
                          )}

                          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                              <div className="flex flex-col gap-1">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Total Amount:{" "}
                                  <span className="font-semibold">
                                    ₵
                                    {typeof order.total === "number"
                                      ? order.total.toFixed(2)
                                      : parseFloat(order.total || 0).toFixed(2)}
                                  </span>
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Payment:{" "}
                                  <span
                                    className={`font-medium ${
                                      order.payment_status === "paid"
                                        ? "text-green-600"
                                        : order.payment_status === "failed"
                                        ? "text-red-600"
                                        : "text-yellow-600"
                                    }`}
                                  >
                                    {order.payment_status || "Pending"}
                                  </span>
                                </p>
                              </div>
                              <Link
                                to="/Orders"
                                className="text-sm text-primary hover:text-primary/90"
                              >
                                View Details
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Notifications Tab (formerly Favorites) */}
            {activeTab === "updates" && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Notifications
                    {notifications.length > 0 && (
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        ({notifications.length})
                      </span>
                    )}
                  </h2>
                  <div className="flex gap-3 items-center flex-wrap">
                    <button
                      onClick={fetchUserNotifications}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary flex items-center gap-1"
                      title="Refresh notifications"
                    >
                      <FaSyncAlt className="w-4 h-4" />
                      Refresh
                    </button>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-sm text-primary hover:text-primary/90"
                      >
                        Mark all as read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={handleClearAllNotifications}
                        className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
                        title="Clear all notifications"
                      >
                        <FaTrash className="w-4 h-4" />
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
                {notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <FaBell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No notifications
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      You'll see your notifications here
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Scrollable notification container */}
                    <div
                      className="notification-scroll max-h-[350px] overflow-y-auto space-y-2 pr-2"
                      style={{
                        scrollbarWidth: "thin",
                        scrollbarColor: "#cbd5e0 transparent",
                      }}
                    >
                      {(showAllNotifications
                        ? notifications
                        : notifications.slice(0, 2)
                      ).map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => openNotification(notification)}
                          role="button"
                          className={`border border-gray-200 dark:border-gray-700 rounded-md p-2.5 cursor-pointer transition-colors ${
                            !notification.read
                              ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100/70 dark:hover:bg-blue-900/30"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`p-1.5 rounded-full ${
                                notification.type === "tracking_update"
                                  ? "bg-blue-100 dark:bg-blue-800"
                                  : notification.type === "welcome"
                                  ? "bg-green-100 dark:bg-green-800"
                                  : notification.type === "shipping_mark"
                                  ? "bg-purple-100 dark:bg-purple-800"
                                  : notification.type === "announcement"
                                  ? "bg-yellow-100 dark:bg-yellow-800"
                                  : "bg-gray-100 dark:bg-gray-700"
                              }`}
                            >
                              {notification.type === "tracking_update" ? (
                                <FaTruck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              ) : notification.type === "welcome" ? (
                                <FaUser className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                              ) : notification.type === "shipping_mark" ? (
                                <FaBox className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              ) : notification.type === "announcement" ? (
                                <FaBell className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                              ) : (
                                <FaBell className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {notification.title}
                                  </h3>
                                  <div className="flex gap-2 items-center mt-0.5">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(
                                        notification.date
                                      ).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                    {notification.trackingNumber && (
                                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                                        {notification.trackingNumber}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {!notification.read && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notification.id);
                                      }}
                                      className="text-xs text-primary hover:text-primary/90 whitespace-nowrap"
                                    >
                                      Mark read
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNotification(notification.id);
                                    }}
                                    className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                    title="Delete notification"
                                  >
                                    <FaTimes className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <p
                                className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-2"
                                dangerouslySetInnerHTML={{
                                  __html: notification.message,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Show More/Less Toggle Button */}
                    {notifications.length > 2 && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={() =>
                            setShowAllNotifications(!showAllNotifications)
                          }
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                          {showAllNotifications ? (
                            <>
                              <FaEye className="w-4 h-4" />
                              Show Recent Only ({notifications.length - 2}{" "}
                              hidden)
                            </>
                          ) : (
                            <>
                              <FaHistory className="w-4 h-4" />
                              Show All {notifications.length} Notifications
                            </>
                          )}
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {showAllNotifications
                            ? "Viewing all notifications"
                            : `Showing ${Math.min(
                                2,
                                notifications.length
                              )} most recent`}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
                  Account Settings
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Change Password
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmNewPassword}
                          onChange={(e) =>
                            setConfirmNewPassword(e.target.value)
                          }
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <button
                        onClick={handleUpdatePassword}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Update Password
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Notification Settings
                    </h3>
                    <div className="space-y-4">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={notifyEmail}
                          onChange={(e) => {
                            const v = e.target.checked;
                            setNotifyEmail(v);
                            savePreference("notify_email", v);
                          }}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span className="text-gray-700 dark:text-gray-300">
                          Email notifications
                        </span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={notifyOrderUpdates}
                          onChange={(e) => {
                            const v = e.target.checked;
                            setNotifyOrderUpdates(v);
                            savePreference("notify_order_updates", v);
                          }}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span className="text-gray-700 dark:text-gray-300">
                          Order updates
                        </span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={notifyPromotions}
                          onChange={(e) => {
                            const v = e.target.checked;
                            setNotifyPromotions(v);
                            savePreference("notify_promotions", v);
                          }}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span className="text-gray-700 dark:text-gray-300">
                          Promotional emails
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Buy4Me Tracking Modal */}
      {showBuy4meTrackingModal && selectedBuy4meTrackingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tracking Details - {selectedBuy4meTrackingOrder.title}
              </h3>
              <button
                onClick={() => {
                  setShowBuy4meTrackingModal(false);
                  setSelectedBuy4meTrackingOrder(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Request #{selectedBuy4meTrackingOrder.id}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Created:{" "}
                  {new Date(
                    selectedBuy4meTrackingOrder.created_at ||
                      selectedBuy4meTrackingOrder.createdAt
                  ).toLocaleDateString()}
                </p>
              </div>

              <div className="relative">
                {(() => {
                  const trackingSteps = [
                    { key: "sourcing", label: "Sourcing", icon: FaSearch },
                    { key: "buying", label: "Buying", icon: FaShoppingCart },
                    {
                      key: "sent_to_warehouse",
                      label: "Sent to Warehouse",
                      icon: FaBox,
                    },
                    { key: "shipped", label: "Shipped", icon: FaTruck },
                    { key: "at_the_port", label: "At the Port", icon: FaShip },
                    {
                      key: "off_loading",
                      label: "Off Loading",
                      icon: FaBoxOpen,
                    },
                    { key: "pickup", label: "Pickup", icon: FaCheckCircle },
                  ];
                  const currentStepIndex =
                    selectedBuy4meTrackingOrder.tracking_status
                      ? trackingSteps.findIndex(
                          (step) =>
                            step.key ===
                            selectedBuy4meTrackingOrder.tracking_status
                        )
                      : -1;

                  return (
                    <>
                      {/* Progress Line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5">
                        <div
                          className={`h-full transition-all duration-300 ${
                            currentStepIndex >= 0
                              ? "bg-primary"
                              : "bg-gray-200 dark:bg-gray-700"
                          }`}
                          style={{
                            height:
                              currentStepIndex >= 0
                                ? `${
                                    ((currentStepIndex + 1) /
                                      trackingSteps.length) *
                                    100
                                  }%`
                                : "0%",
                          }}
                        ></div>
                        <div className="absolute top-0 left-0 w-full h-full bg-gray-200 dark:bg-gray-700 opacity-30"></div>
                      </div>

                      {trackingSteps.map((step, index) => {
                        const StepIcon = step.icon;
                        const isCompleted = currentStepIndex > index;
                        const isCurrent = currentStepIndex === index;

                        return (
                          <div
                            key={step.key}
                            className="relative flex items-start gap-4 pb-6 last:pb-0"
                          >
                            <div
                              className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                                isCompleted
                                  ? "bg-primary text-white"
                                  : isCurrent
                                  ? "bg-primary text-white border-2 border-primary shadow-lg"
                                  : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                              }`}
                            >
                              <StepIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 pt-1">
                              <p
                                className={`font-medium ${
                                  isCompleted || isCurrent
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-400 dark:text-gray-500"
                                }`}
                              >
                                {step.label}
                              </p>
                              {isCurrent && (
                                <p className="text-sm text-primary mt-1 font-semibold">
                                  Current Status
                                </p>
                              )}
                              {isCompleted && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Completed
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        invoice={selectedInvoice}
        request={selectedInvoiceRequest}
      />

      {/* Notification Detail Modal */}
      {showNotificationModal && selectedNotification && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowNotificationModal(false);
            setSelectedNotification(null);
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient header */}
            <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 px-4 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-8">
                  <h3 className="text-lg font-semibold text-white drop-shadow-sm">
                    {selectedNotification.title}
                  </h3>
                  {!selectedNotification.read && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                      New
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowNotificationModal(false);
                    setSelectedNotification(null);
                  }}
                  className="p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="px-4 py-4">
              <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {new Date(selectedNotification.date).toLocaleString()}
                </span>
                {selectedNotification.trackingNumber && (
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                    {selectedNotification.trackingNumber}
                  </span>
                )}
                {selectedNotification.type && (
                  <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                    {selectedNotification.type}
                  </span>
                )}
              </div>

              <div className="max-w-none text-[15px] leading-6 text-gray-800 dark:text-gray-100">
                <div
                  className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4 overflow-x-auto"
                  dangerouslySetInnerHTML={{
                    __html: buildMessageHtml(selectedNotification.message),
                  }}
                />
              </div>

              {!selectedNotification.read && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      markAsRead(selectedNotification.id);
                      setSelectedNotification({
                        ...selectedNotification,
                        read: true,
                      });
                    }}
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
                  >
                    Mark as read
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDeleteTracking}
        title="Delete Tracking"
        message="Are you sure you want to delete this tracking data? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Clear All Notifications Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearAllModal}
        onClose={() => setShowClearAllModal(false)}
        onConfirm={confirmClearAllNotifications}
        title="Clear All Notifications"
        message="Are you sure you want to clear all notifications? This action cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        type="danger"
      />

      {/* Avatar Selector Modal */}
      <AvatarSelector
        isOpen={showAvatarSelector}
        onClose={() => setShowAvatarSelector(false)}
        currentAvatar={selectedAvatar}
        onSelect={handleAvatarSelect}
      />

      {/* Become Agent Modal */}
      {showBecomeAgentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => {
                setShowBecomeAgentModal(false);
                setSelectedAgentType("");
                setAgentRequestMessage("");
                setCorporateFormData({
                  businessName: "",
                  businessCert: null,
                  location: "",
                  ghanaCard: null,
                  phoneNumber: "",
                });
              }}
            ></div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <FaUserTag className="text-blue-600" />
                    Become an Agent
                  </h3>
                  <button
                  onClick={() => {
                    setShowBecomeAgentModal(false);
                    setSelectedAgentType("");
                    setAgentRequestMessage("");
                    setCorporateFormData({
                      businessName: "",
                      businessCert: null,
                      location: "",
                      ghanaCard: null,
                      phoneNumber: "",
                    });
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FaTimes />
                </button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select the type of agent you want to become. Our team will review your request and get back to you.
                  </p>

                  {/* Agent Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Select Agent Type *
                    </label>
                    <div className="space-y-3">
                      {/* Corporate Agent */}
                      <button
                        type="button"
                        onClick={() => setSelectedAgentType("corporate")}
                        className={`w-full p-4 border-2 rounded-lg transition-all text-left ${
                          selectedAgentType === "corporate"
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            selectedAgentType === "corporate"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          }`}>
                            <FaBuilding className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              Corporate Agent
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              For businesses and corporations bringing goods
                            </p>
                          </div>
                          {selectedAgentType === "corporate" && (
                            <FaCheckCircle className="text-blue-600 w-5 h-5" />
                          )}
                        </div>
                      </button>

                      {/* Local Agent */}
                      <button
                        type="button"
                        onClick={() => setSelectedAgentType("local")}
                        className={`w-full p-4 border-2 rounded-lg transition-all text-left ${
                          selectedAgentType === "local"
                            ? "border-green-600 bg-green-50 dark:bg-green-900/20"
                            : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            selectedAgentType === "local"
                              ? "bg-green-600 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          }`}>
                            <FaMapMarkerAlt className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              Local Agent
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              For local agents bringing goods to the platform
                            </p>
                          </div>
                          {selectedAgentType === "local" && (
                            <FaCheckCircle className="text-green-600 w-5 h-5" />
                          )}
                        </div>
                      </button>

                      {/* Affiliate Agent */}
                      <button
                        type="button"
                        onClick={() => setSelectedAgentType("affiliate")}
                        className={`w-full p-4 border-2 rounded-lg transition-all text-left ${
                          selectedAgentType === "affiliate"
                            ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                            : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            selectedAgentType === "affiliate"
                              ? "bg-purple-600 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          }`}>
                            <FaHandshake className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              Affiliate Agent
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              For affiliate partners bringing goods
                            </p>
                          </div>
                          {selectedAgentType === "affiliate" && (
                            <FaCheckCircle className="text-purple-600 w-5 h-5" />
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Corporate Agent Form - Show only when Corporate is selected */}
                  {selectedAgentType === "corporate" && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                        Corporate Agent Information
                      </h4>
                      
                      {/* Business Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Business Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={corporateFormData.businessName}
                          onChange={(e) =>
                            setCorporateFormData({
                              ...corporateFormData,
                              businessName: e.target.value,
                            })
                          }
                          placeholder="Enter your business name"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Location *
                        </label>
                        <input
                          type="text"
                          required
                          value={corporateFormData.location}
                          onChange={(e) =>
                            setCorporateFormData({
                              ...corporateFormData,
                              location: e.target.value,
                            })
                          }
                          placeholder="Enter business location"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Phone Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={corporateFormData.phoneNumber}
                          onChange={(e) =>
                            setCorporateFormData({
                              ...corporateFormData,
                              phoneNumber: e.target.value,
                            })
                          }
                          placeholder="Enter phone number"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Business Certificate */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Business Certificate *
                        </label>
                        <div className="mt-1">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <FaImage className="w-8 h-8 mb-2 text-gray-400" />
                              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                PDF, PNG, JPG (MAX. 10MB)
                              </p>
                              {corporateFormData.businessCert && (
                                <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                                  {corporateFormData.businessCert.name}
                                </p>
                              )}
                            </div>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="hidden"
                              onChange={(e) =>
                                handleFileChange("businessCert", e.target.files[0])
                              }
                            />
                          </label>
                        </div>
                      </div>

                      {/* Ghana Card */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Ghana Card *
                        </label>
                        <div className="mt-1">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <FaImage className="w-8 h-8 mb-2 text-gray-400" />
                              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                PDF, PNG, JPG (MAX. 10MB)
                              </p>
                              {corporateFormData.ghanaCard && (
                                <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                                  {corporateFormData.ghanaCard.name}
                                </p>
                              )}
                            </div>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="hidden"
                              onChange={(e) =>
                                handleFileChange("ghanaCard", e.target.files[0])
                              }
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Optional Message - Show for non-corporate agents */}
                  {selectedAgentType && selectedAgentType !== "corporate" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Additional Message (Optional)
                      </label>
                      <textarea
                        value={agentRequestMessage}
                        onChange={(e) => setAgentRequestMessage(e.target.value)}
                        placeholder="Tell us why you want to become an agent..."
                        rows="4"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSubmitAgentRequest}
                  disabled={
                    !selectedAgentType ||
                    submittingAgentRequest ||
                    (selectedAgentType === "corporate" &&
                      (!corporateFormData.businessName ||
                        !corporateFormData.location ||
                        !corporateFormData.phoneNumber ||
                        !corporateFormData.businessCert ||
                        !corporateFormData.ghanaCard))
                  }
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingAgentRequest ? "Submitting..." : "Submit Request"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBecomeAgentModal(false);
                    setSelectedAgentType("");
                    setAgentRequestMessage("");
                    setCorporateFormData({
                      businessName: "",
                      businessCert: null,
                      location: "",
                      ghanaCard: null,
                      phoneNumber: "",
                    });
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
