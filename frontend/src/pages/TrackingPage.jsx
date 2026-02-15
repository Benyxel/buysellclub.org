import React, { useState, useEffect } from "react";
import { FaTruck, FaPlus, FaExclamationCircle } from "react-icons/fa";
import ShippingTrackingNote from "../components/ShippingTrackingNote";
import TrackingSearch from "../components/TrackingSearch";
import { toast } from "../utils/toast";
import API from "../api";
import { trackingSystem } from "../utils/trackingSystem";

const TrackingPage = () => {
  const [showNote, setShowNote] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState("");
  const [newShipment, setNewShipment] = useState({
    trackingNumber: "",
    userTrackingNumber: "",
  });
  const [hasShippingMark, setHasShippingMark] = useState(false);

  const checkShippingMark = async () => {
    try {
      const token = localStorage.getItem("token");
      const isAdmin = !!localStorage.getItem("adminToken");
      if (isAdmin) {
        setHasShippingMark(true);
        return true;
      }
      if (token) {
        try {
          const resp = await API.get("/buysellapi/shipping-marks/me/");
          const d = resp?.data;
          if (d?.markId) {
            setHasShippingMark(true);
            return true;
          }
        } catch (_) {}
      }
      const saved = JSON.parse(localStorage.getItem("shippingMarks") || "[]");
      if (Array.isArray(saved) && saved.length > 0 && saved[0].id) {
        setHasShippingMark(true);
        return true;
      }
      const userMark = localStorage.getItem("userShippingMark");
      if (userMark) {
        try {
          const parsed = JSON.parse(userMark);
          if (parsed?.markId) {
            setHasShippingMark(true);
            return true;
          }
        } catch (_) {}
      }
      setHasShippingMark(false);
      return false;
    } catch (e) {
      setHasShippingMark(false);
      return false;
    }
  };

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
          }
        } catch (_) {}
      }
    } catch (e) {}
  };

  useEffect(() => {
    trackingSystem.loadFromLocalStorage();
    const list = trackingSystem.getUserShipments("default") || [];
    setShipments(list);
    setDefaultUserTrackingNumber();
    checkShippingMark();
    const hasPending = list.some(
      (s) => (s.Status || "").toLowerCase() === "pending"
    );
    const noteTsKey = "shippingTrackingNoteLastShownAt";
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    try {
      const lastShownAt = localStorage.getItem(noteTsKey);
      const now = Date.now();
      const shouldShow =
        !lastShownAt ||
        now - parseInt(lastShownAt, 10) >= twentyFourHoursMs;
      if (shouldShow) {
        setShowNote(true);
        localStorage.setItem(noteTsKey, String(now));
      }
    } catch (_) {
      setShowNote(true);
    }
  }, []);

  const handleAddShipment = async (e) => {
    e.preventDefault();
    const hasMark = await checkShippingMark();
    if (!hasMark) {
      setMessage(
        "Please generate a shipping mark first before adding shipments. Go to the Address Generator to create one."
      );
      toast.error(
        "You must generate a shipping mark before adding shipments. Please visit the Address Generator first."
      );
      return;
    }

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
      setShowNote(true);

      (async () => {
        try {
          const tn = newShipment.trackingNumber.trim();
          if (!tn) return;
          const isAdmin = !!localStorage.getItem("adminToken");
          if (isAdmin) return;

          let userMarkFormatted = "";
          try {
            const markResp = await API.get("/buysellapi/shipping-marks/me/");
            const markData = markResp?.data;
            if (markData?.markId && markData?.name) {
              userMarkFormatted = `${markData.markId}:${markData.name}`;
            }
          } catch {}

          try {
            const resp = await API.get(
              `/buysellapi/trackings/by-number/${encodeURIComponent(tn)}/`
            );
            const backendTracking = resp?.data;
            if (backendTracking) {
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
                try {
                  await API.patch(
                    `/buysellapi/trackings/${backendTracking.id}/`,
                    { shipping_mark: userMarkFormatted }
                  );
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
                  console.warn("Failed to update backend tracking:", updateErr);
                }
              }
            }
          } catch {}
        } catch {}
      })();
    }

    setShowAddForm(false);
    setNewShipment((prev) => ({ ...prev, trackingNumber: "" }));
  };

  return (
    <div className="container mx-auto py-12">
      <ShippingTrackingNote
        open={showNote}
        onClose={() => setShowNote(false)}
      />
      <div className="max-w-5xl mx-auto">
        <TrackingSearch />

        {/* Add and Track Shipment - moved from Shipping page */}
        <div className="mt-10 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-lg shadow-md p-4 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
            <div className="flex items-center gap-4">
              <FaTruck className="text-2xl sm:text-3xl text-primary animate-truck" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
                  Add and Track Shipment
                </h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Track shipments, manage addresses and deliveries
                </p>
                <button
                  type="button"
                  onClick={() => setShowNote(true)}
                  className="mt-1 inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium"
                >
                  <FaExclamationCircle className="w-4 h-4" />
                  Important note about package updates
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  const hasMark = await checkShippingMark();
                  if (!hasMark) {
                    toast.error(
                      "You must generate a shipping mark before adding shipments. Please visit the Address Generator first."
                    );
                    return;
                  }
                  setShowAddForm(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!hasShippingMark}
                title={!hasShippingMark ? "Generate a shipping mark first" : ""}
              >
                <FaPlus className="w-4 h-4" />
                Add New Shipment
              </button>
            </div>
          </div>
        </div>

        {/* Tracking Management - moved from Shipping page */}
        <div className="mb-8 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg shadow-md p-6">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Add shipments here, then view and track them from your Profile →
              Tracking tab or use the search above to look up tracking numbers.
            </p>
          </div>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              Real-Time Updates
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Get the most up-to-date information about your package's location
              and status.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              Delivery Timeline
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              View estimated delivery dates and complete shipment history.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              Detailed Information
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Access complete details about your package, sender, and shipping
              status.
            </p>
          </div>
        </div>

        <div className="mt-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            Need Help With Your Shipment?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Our customer support team is available to assist you with any
            questions or concerns.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center">
              <div className="mr-4 text-blue-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Email Us
                </p>
                <p className="font-medium text-gray-800 dark:text-white">
                  support@buysellclub.org
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center">
              <div className="mr-4 text-green-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Call Us
                </p>
                <p className="font-medium text-gray-800 dark:text-white">
                  233-540266839
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Shipment Form Modal - moved from Shipping page */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                  This is auto-filled from your shipping mark and cannot be edited.
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

      {/* Message Display - moved from Shipping page */}
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

export default TrackingPage;
