import React, { useState, useEffect } from "react";
import {
  FaTruck,
  FaPlus,
  FaSearch,
  FaBox,
  FaMapMarkerAlt,
  FaCalculator,
  FaTimes,
  FaEdit,
  FaCheck,
  FaCopy,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import CBMCalculator from "./CBMCalculator";
import TrackingSearch from "./TrackingSearch";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import API from "../api";

// Admin class
class AdminUpdate {
  constructor() {
    this.adminTracking = []; // Admin's tracking numbers
  }

  adminCheck(trackNum) {
    // Convert to uppercase for case-insensitive comparison
    const normalizedTrackNum = trackNum.toUpperCase();
    return this.adminTracking.find(
      (i) => i.TrackingNum && i.TrackingNum.toUpperCase() === normalizedTrackNum
    );
  }

  adminAdd(trackNum, status) {
    this.adminTracking.push({
      TrackingNum: trackNum,
      Status: status,
      LastUpdated: new Date().toISOString(),
    });
    return `Tracking number ${trackNum} has been added successfully by admin`;
  }
}

// User class
class UserAdd extends AdminUpdate {
  constructor() {
    super();
    this.userTracking = new Map(); // Store shipments by user ID
    this.statusHistory = new Map(); // Store status history for each tracking number
  }

  // Merge tracking data from admin and user when user adds a tracking
  // Updated: name/quantity/product are optional; userTrackingNum can be provided
  userAdd(trackNum, name, quantity, product, userId, userTrackingNum = null) {
    // Normalize tracking number to uppercase
    const normalizedTrackNum = trackNum.toUpperCase();

    // Optional: Check if admin has added this tracking number (used only to seed initial status if present)
    const adminShipment = this.adminCheck(normalizedTrackNum);

    // Get user's shipments
    const userShipments = this.userTracking.get(userId) || [];

    // Check if user has already added this tracking number
    const existingUserShipment = userShipments.find(
      (i) => i.TrackingNum && i.TrackingNum.toUpperCase() === normalizedTrackNum
    );

    if (existingUserShipment) {
      return {
        success: false,
        message: "You have already added this tracking number.",
      };
    }

    // Resolve optional fields
    const sender = name || "";
    const qty =
      Number.isFinite(Number(quantity)) && Number(quantity) > 0
        ? Number(quantity)
        : 1;
    const prod = product || "Package";

    // Add the shipment with initial status (from admin if available, else Pending)
    userShipments.push({
      TrackingNum: normalizedTrackNum,
      Sender: sender,
      Quantity: qty,
      Product: prod,
      UserTrackingNum: userTrackingNum || null,
      Status: (adminShipment && adminShipment.Status) || "Pending",
      AddedDate: new Date().toISOString(),
      LastUpdated: new Date().toISOString(),
    });

    // Update user's shipments
    this.userTracking.set(userId, userShipments);

    // Initialize status history if it doesn't exist
    if (!this.statusHistory.has(normalizedTrackNum)) {
      this.statusHistory.set(normalizedTrackNum, [
        {
          status: (adminShipment && adminShipment.Status) || "Pending",
          date: new Date().toISOString(),
          details: adminShipment
            ? "Initial status from admin"
            : "User added; awaiting admin to register the tracking",
        },
      ]);
    }

    // Note: Do not remove from admin tracking; keep admin list intact

    // Save to localStorage
    this.saveToLocalStorage();

    return {
      success: true,
      message: `Tracking number ${normalizedTrackNum} has been added successfully with ${quantity} quantity for ${name}. ${
        adminShipment
          ? "Initial status seeded from admin."
          : "Waiting for admin to add it to the system."
      }`,
    };
  }

  // Get all shipments for a specific user
  getUserShipments(userId) {
    return this.userTracking.get(userId) || [];
  }

  // Get a specific shipment for a user
  getUserShipment(userId, trackNum) {
    const userShipments = this.userTracking.get(userId) || [];
    return userShipments.find((shipment) => shipment.TrackingNum === trackNum);
  }

  // Save data to localStorage
  saveToLocalStorage() {
    const data = {
      userTracking: Array.from(this.userTracking.entries()),
      statusHistory: Array.from(this.statusHistory.entries()),
      adminTracking: this.adminTracking,
    };
    localStorage.setItem("shippingData", JSON.stringify(data));
  }

  // Load data from localStorage
  loadFromLocalStorage() {
    const data = localStorage.getItem("shippingData");
    if (data) {
      try {
        const parsedData = JSON.parse(data);
        this.userTracking = new Map(parsedData.userTracking || []);
        this.statusHistory = new Map(parsedData.statusHistory || []);
        this.adminTracking = parsedData.adminTracking || [];
      } catch (error) {
        console.error("Error loading shipping data:", error);
        // Reset to default state if there's an error
        this.userTracking = new Map();
        this.statusHistory = new Map();
        this.adminTracking = [];
      }
    }
  }

  userCheck(trackNum, userId) {
    // First check if user has added this tracking number
    const userShipment = this.getUserShipment(userId, trackNum);

    if (!userShipment) {
      // If user hasn't added it, check if admin has
      const adminShipment = this.adminCheck(trackNum);

      if (adminShipment) {
        // Show more details about the admin-added tracking including current status
        return {
          found: false,
          message: `
            ✅ Tracking Number Found in System
            ===============================
            
            Good news! The tracking number ${trackNum} has been added by our admin team.
            
            Current Status: ${adminShipment.Status}
            Last Updated: ${
              adminShipment.LastUpdated
                ? new Date(adminShipment.LastUpdated).toLocaleDateString()
                : "Not available"
            }
            
            To add this to your account and track it:
            1. Click the "Add This Tracking Number" button below
            2. Enter your details (name, quantity, product)
            3. Submit the form
            
            After adding the shipment, you'll be able to get detailed tracking updates.
          `,
          needsUserAdd: true,
          adminData: adminShipment,
        };
      }

      return {
        found: false,
        message: `
          ❌ Tracking Number Not Found
          ===========================
          
          The tracking number ${trackNum} is not found in our system.
          
          Please follow these steps:
          1. Contact the admin to add this tracking number to the system
          2. Once added, you can add it to your account
          3. Then you can track it here
          
          Need help? Contact support at support@fofoofogroup.com
        `,
        needsUserAdd: false,
      };
    }

    // Get current date for estimated delivery
    const currentDate = new Date();
    const estimatedDelivery = new Date(currentDate);
    estimatedDelivery.setDate(currentDate.getDate() + 60); // Add 60 days for estimated delivery

    // Get status history
    const history = this.getStatusHistory(trackNum);
    const historySection =
      history.length > 1
        ? `
      📋 Status History:
      -----------------
      ${history
        .map(
          (entry) => `
        ${new Date(entry.date).toLocaleString()}: ${entry.status}
      `
        )
        .join("\n")}
    `
        : "";

    // Get status-specific message
    let statusMessage = "";
    switch (userShipment.Status) {
      case "Delivered":
        statusMessage =
          "✅ Delivery Status: Your package has been successfully delivered to your address!";
        break;
      case "In Transit":
        statusMessage =
          "🚚 Delivery Status: Your package is currently in transit and on its way to you.";
        break;
      case "Pending":
        statusMessage =
          "⏳ Delivery Status: Your package is pending processing at our facility.";
        break;
      case "On Return":
        statusMessage =
          "⚠️ Delivery Status: Your package is being returned to the sender. Please contact your seller for more information.";
        break;
      case "In China Warehouse":
        statusMessage =
          "🏭 Delivery Status: Your package is currently in our China warehouse awaiting shipping.";
        break;
      case "On Way to Warehouse":
        statusMessage =
          "🚛 Delivery Status: Your package is on its way to our warehouse for shipping.";
        break;
      default:
        statusMessage =
          "ℹ️ Delivery Status: Your package is being received by the warehouse.";
    }

    // Format the message with better structure and details
    const message = `
      📦 Shipment Tracking Information
      ==============================
      
      🔍 Tracking Details:
      -------------------
      Tracking Number: ${userShipment.TrackingNum}
      Customer Name: ${userShipment.Sender}
      Product: ${userShipment.Product}
      Quantity: ${userShipment.Quantity}
      Added to Profile: ${new Date(userShipment.AddedDate).toLocaleDateString()}
      
      📊 Status Information:
      ---------------------
      Current Status: ${userShipment.Status}
      Last Updated: ${new Date(userShipment.LastUpdated).toLocaleString()}
      ${
        userShipment.Status !== "On Return"
          ? `Estimated Delivery: ${estimatedDelivery.toLocaleDateString()}`
          : ""
      }
      
      ${statusMessage}
      
      ${historySection}
      
      📞 Need Help?
      -------------
      If you have any questions about your shipment, please contact our support team at:
      Email: support@fofoofogroup.com
      Phone: 233-540266839
      
      Thank you for choosing our shipping service!
    `;

    return {
      found: true,
      message: message,
      needsUserAdd: false,
    };
  }

  getAllShipments() {
    // Return all shipments for all users (for admin view)
    const allShipments = [];
    for (const [userId, userShipments] of this.userTracking) {
      allShipments.push(...userShipments);
    }
    return allShipments;
  }

  // Get status history for a tracking number
  getStatusHistory(trackNum) {
    return this.statusHistory.get(trackNum) || [];
  }

  // Update status history when admin changes status
  updateStatusHistory(trackNum, newStatus) {
    const history = this.statusHistory.get(trackNum) || [];
    history.push({
      status: newStatus,
      date: new Date().toISOString(),
      details: `Status updated to ${newStatus}`,
    });
    this.statusHistory.set(trackNum, history);
  }
}

// Create a single instance of the tracking system
const trackingSystem = new UserAdd();

// Load saved data when the component mounts
trackingSystem.loadFromLocalStorage();

// Export the tracking system instance
export { trackingSystem };

const ShippingDashboard = () => {
  const [shipments, setShipments] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("tracking"); // 'tracking' or 'addresses'
  const [shippingMarks, setShippingMarks] = useState([]);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [tempName, setTempName] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const [newShipment, setNewShipment] = useState({
    trackingNumber: "",
    userTrackingNumber: "",
  });

  // Load initial data
  useEffect(() => {
    setShipments(trackingSystem.getUserShipments("default") || []);
    loadShippingMarks();
    setDefaultUserTrackingNumber();
  }, []);

  // Determine and set the default user tracking number (from backend mark or local address)
  const setDefaultUserTrackingNumber = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const resp = await API.get("/buysellapi/shipping-marks/me/");
          const d = resp?.data;
          if (d?.markId) {
            setNewShipment((prev) => ({
              ...prev,
              userTrackingNumber: d.markId,
            }));
            return;
          }
        } catch (_) {}
      }
      // Fallback to local saved marks
      const saved = JSON.parse(localStorage.getItem("shippingMarks") || "[]");
      if (Array.isArray(saved) && saved.length > 0) {
        setNewShipment((prev) => ({
          ...prev,
          userTrackingNumber: saved[0].id || "",
        }));
      }
    } catch (e) {
      // ignore
    }
  };

  // Load shipping marks from localStorage
  const loadShippingMarks = () => {
    const savedMarks = JSON.parse(
      localStorage.getItem("shippingMarks") || "[]"
    );
    // Sort by most recent first
    savedMarks.sort((a, b) => new Date(b.date) - new Date(a.date));
    setShippingMarks(savedMarks);
  };

  const handleAddShipment = (e) => {
    e.preventDefault();

    const result = trackingSystem.userAdd(
      newShipment.trackingNumber.toUpperCase(),
      "",
      1,
      "Package",
      "default",
      newShipment.userTrackingNumber
    );

    setMessage(result.message);

    if (result.success) {
      setShipments(trackingSystem.getUserShipments("default"));

      // Best-effort: sync with backend tracking for regular users only
      (async () => {
        try {
          const tn = newShipment.trackingNumber.trim();
          if (!tn) return;

          // Check if user is admin - admins should not have shipping marks
          const isAdmin = !!localStorage.getItem("adminToken");
          if (isAdmin) return; // Skip shipping mark logic for admins

          // Get user's shipping mark from backend (regular users only)
          let userMarkFormatted = "";
          try {
            const markResp = await API.get("/buysellapi/shipping-marks/me/");
            const markData = markResp?.data;
            if (markData?.markId && markData?.name) {
              // Format as "markId:name" (e.g., "FIM123:John Doe")
              userMarkFormatted = `${markData.markId}:${markData.name}`;
            }
          } catch {
            // No mark yet
          }

          // Check if tracking exists in backend
          try {
            const resp = await axios.get(
              `${API_BASE_URL}/buysellapi/trackings/by-number/${encodeURIComponent(
                tn
              )}/`
            );

            const backendTracking = resp?.data;
            if (backendTracking) {
              // If backend has a shipping_mark, sync it to local storage
              const backendMark = backendTracking.shipping_mark;
              if (backendMark) {
                const tnUpper = tn.toUpperCase();
                const list = trackingSystem.getUserShipments("default") || [];
                const i = list.findIndex(
                  (s) => (s.TrackingNum || "").toUpperCase() === tnUpper
                );
                if (i !== -1) {
                  list[i].ShippingMark = backendMark;
                  trackingSystem.userTracking.set("default", list);
                  trackingSystem.saveToLocalStorage();
                }
              } else if (userMarkFormatted) {
                // Backend tracking exists but has no shipping mark
                // Update the backend tracking with user's formatted mark
                try {
                  await API.patch(
                    `/buysellapi/trackings/${backendTracking.id}/`,
                    {
                      shipping_mark: userMarkFormatted,
                    }
                  );

                  // Also update local storage
                  const tnUpper = tn.toUpperCase();
                  const list = trackingSystem.getUserShipments("default") || [];
                  const i = list.findIndex(
                    (s) => (s.TrackingNum || "").toUpperCase() === tnUpper
                  );
                  if (i !== -1) {
                    list[i].ShippingMark = userMarkFormatted;
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
            // Tracking not found in backend - that's OK, user is just adding locally
          }
        } catch {
          // Ignore network issues
        }
      })();
    }

    setShowAddForm(false);
    setNewShipment((prev) => ({ ...prev, trackingNumber: "" }));
  };

  const handleDeleteTracking = (trackNum) => {
    if (
      window.confirm(
        "Are you sure you want to delete this tracking data? This action cannot be undone."
      )
    ) {
      // Remove from user tracking
      const userShipments = trackingSystem.getUserShipments("default");
      const updatedShipments = userShipments.filter(
        (shipment) => shipment.TrackingNum !== trackNum
      );
      trackingSystem.userTracking.set("default", updatedShipments);

      // Save changes
      trackingSystem.saveToLocalStorage();

      // Update UI
      setShipments(trackingSystem.getUserShipments("default"));
      setMessage("Tracking data deleted successfully");
    }
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setMessage("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      setMessage("Failed to copy text. Please try again.");
    }
  };

  const handleEditAddress = (id) => {
    const address = shippingMarks.find((mark) => mark.id === id);
    if (address) {
      setTempName(address.name);
      setEditingAddressId(id);
    }
  };

  const handleSaveAddress = (id) => {
    if (!tempName.trim()) {
      setMessage("Please enter a valid name");
      return;
    }

    // Update the name in localStorage
    const savedMarks = JSON.parse(
      localStorage.getItem("shippingMarks") || "[]"
    );
    const updatedMarks = savedMarks.map((mark) => {
      if (mark.id === id) {
        const updatedAddress = `${mark.id} - ${tempName}\n${
          mark.address.split("\n")[1]
        }`;
        const updatedShippingMark = `${mark.id}:${tempName}`;
        return {
          ...mark,
          name: tempName,
          address: updatedAddress,
          shippingMark: updatedShippingMark,
        };
      }
      return mark;
    });

    localStorage.setItem("shippingMarks", JSON.stringify(updatedMarks));

    // Update state
    setShippingMarks(updatedMarks);
    setEditingAddressId(null);
    setTempName("");
    setMessage("Address updated successfully!");
  };

  const handleCancelEdit = () => {
    setEditingAddressId(null);
    setTempName("");
  };

  const handleDeleteAddress = (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this shipping address? This action cannot be undone."
      )
    ) {
      const savedMarks = JSON.parse(
        localStorage.getItem("shippingMarks") || "[]"
      );
      const updatedMarks = savedMarks.filter((mark) => mark.id !== id);
      localStorage.setItem("shippingMarks", JSON.stringify(updatedMarks));

      // Update state
      setShippingMarks(updatedMarks);
      setMessage("Shipping address deleted successfully");
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "in transit":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "on return":
        return "bg-red-100 text-red-800";
      case "in china warehouse":
        return "bg-purple-100 text-purple-800";
      case "on way to warehouse":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8 border-b-2 border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Generate Address
          </h1>
          <div className="flex gap-4 w-full sm:w-auto">
            <Link
              to="/Fofoofo-address-generator"
              className="group flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <div className="relative">
                <FaMapMarkerAlt className="w-5 h-5" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
              <span className="font-medium">FIMPORT Address Generator</span>
              <span className="text-sm opacity-75 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </Link>
          </div>
        </div>

        {/* Section 1: Dashboard Header */}
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-lg shadow-md p-4 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
            <div className="flex items-center gap-4">
              <FaTruck
                className={`text-2xl sm:text-3xl text-primary ${
                  activeTab === "tracking" ? "animate-truck" : ""
                }`}
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
                  Add and Track Shipment
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Track shipments, manage addresses and deliveries
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <FaPlus className="w-4 h-4" />
                Add New Shipment
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
            <li className="mr-2">
              <button
                onClick={() => setActiveTab("tracking")}
                className={`inline-flex items-center justify-center p-4 rounded-t-lg border-b-2 group ${
                  activeTab === "tracking"
                    ? "text-primary border-primary"
                    : "border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300"
                }`}
              >
                <FaTruck
                  className={`mr-2 w-5 h-5 ${
                    activeTab === "tracking"
                      ? "text-primary animate-truck"
                      : "text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300"
                  }`}
                />
                Tracking Management
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setActiveTab("addresses")}
                className={`inline-flex items-center justify-center p-4 rounded-t-lg border-b-2 group ${
                  activeTab === "addresses"
                    ? "text-primary border-primary"
                    : "border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300"
                }`}
              >
                <FaMapMarkerAlt
                  className={`mr-2 w-5 h-5 ${
                    activeTab === "addresses"
                      ? "text-primary"
                      : "text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300"
                  }`}
                />
                Address Management
              </button>
            </li>
          </ul>
        </div>

        {/* Tracking Management Tab */}
        {activeTab === "tracking" && (
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg shadow-md p-6 mb-8">
            {/* Tracking Search Component */}
            <div className="mb-8">
              <TrackingSearch />
            </div>
            {/* Info: User-facing shipments list is intentionally hidden here */}
            <div className="mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Add shipments here, then view and track them from your Profile →
                Tracking tab.
              </p>
            </div>
          </div>
        )}

        {/* Address Management Tab */}
        {activeTab === "addresses" && (
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg shadow-md p-6 mb-8">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  My Shipping Addresses
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your shipping addresses and shipping marks for packages
                and orders
              </p>
            </div>

            {shippingMarks.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
                <FaMapMarkerAlt className="mx-auto text-4xl text-gray-400 mb-4" />
                <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
                  No Shipping Addresses Yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  You haven't generated any shipping addresses yet. Generate one
                  to get started.
                </p>
                <Link
                  to="/Fofoofo-address-generator"
                  className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Generate Your First Address
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {shippingMarks.map((mark) => (
                  <div
                    key={mark.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <FaMapMarkerAlt className="text-primary" />
                            <h3 className="font-semibold text-gray-800 dark:text-white">
                              {editingAddressId === mark.id ? (
                                <input
                                  type="text"
                                  value={tempName}
                                  onChange={(e) => setTempName(e.target.value)}
                                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md"
                                  autoFocus
                                />
                              ) : (
                                mark.name
                              )}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {mark.id} • Created:{" "}
                            {new Date(mark.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {editingAddressId === mark.id ? (
                            <>
                              <button
                                onClick={() => handleSaveAddress(mark.id)}
                                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-1"
                              >
                                <FaCheck className="w-3 h-3" /> Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center gap-1"
                              >
                                <FaTimes className="w-3 h-3" /> Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditAddress(mark.id)}
                                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
                              >
                                <FaEdit className="w-3 h-3" /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteAddress(mark.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-1"
                              >
                                <FaTimes className="w-3 h-3" /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Shipping Mark
                          </p>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                mark.shippingMark,
                                `${mark.id}-mark`
                              )
                            }
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                          >
                            {copiedId === `${mark.id}-mark` ? (
                              <>
                                <FaCheck className="w-4 h-4" /> Copied
                              </>
                            ) : (
                              <>
                                <FaCopy className="w-4 h-4" /> Copy
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-sm text-gray-900 dark:text-white break-all">
                            {mark.shippingMark}
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Full Address
                          </p>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                mark.address,
                                `${mark.id}-address`
                              )
                            }
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                          >
                            {copiedId === `${mark.id}-address` ? (
                              <>
                                <FaCheck className="w-4 h-4" /> Copied
                              </>
                            ) : (
                              <>
                                <FaCopy className="w-4 h-4" /> Copy
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-sm text-gray-900 dark:text-white break-all whitespace-pre-line">
                            {mark.address}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section 3: CBM Calculator */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4 mb-8">
            <FaCalculator className="text-2xl sm:text-3xl text-primary" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
                CBM Calculator
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Calculate shipping costs based on package dimensions
              </p>
            </div>
          </div>
          <CBMCalculator />
        </div>
      </div>

      {/* Add New Shipment Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto chrome-border-animation">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
                Add New Shipment
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddShipment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={newShipment.trackingNumber}
                  onChange={(e) =>
                    setNewShipment({
                      ...newShipment,
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
                  value={newShipment.userTrackingNumber}
                  readOnly
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-0"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This is auto-filled from your shipping mark and cannot be
                  edited.
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
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50">
          <p
            className={`text-lg ${
              message.includes("successfully") || message.includes("Copied")
                ? "text-green-600"
                : "text-yellow-600"
            }`}
          >
            {message}
          </p>
        </div>
      )}
    </div>
  );
};

export default ShippingDashboard;
