import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaTruck,
  FaBoxOpen,
  FaCalendarAlt,
  FaHistory,
  FaDollarSign,
  FaCube,
  FaCheckCircle,
  FaIdBadge,
  FaShip,
} from "react-icons/fa";
import API from "../api";

const TrackingSearch = () => {
  const [searchMode, setSearchMode] = useState("tracking"); // "tracking" or "mark-container"
  const [trackingNumber, setTrackingNumber] = useState("");
  const [markId, setMarkId] = useState("");
  const [selectedContainer, setSelectedContainer] = useState("");
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trackingResult, setTrackingResult] = useState(null);
  const [markContainerResult, setMarkContainerResult] = useState(null);
  const [activeRates, setActiveRates] = useState(null);

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

  const getContainerStatusLabel = (code) => {
    if (!code) return null;
    const map = {
      preparing: "Preparing",
      loading: "Loading",
      in_transit: "In Transit",
      clearing: "Clearing",
      arrived_port: "Offloaded",
      completed: "Completed",
    };
    return map[code] || code;
  };

  const fetchActiveRates = async () => {
    try {
      const resp = await API.get("/buysellapi/ad-shipping-rates/");
      if (resp?.data) {
        setActiveRates(resp.data);
        return resp.data;
      }
    } catch (e) {
      if (e?.response?.status !== 404)
        console.error("fetchActiveRates error", e);
    }
    return null;
  };

  const fetchContainers = async () => {
    try {
      // For Track Your Shipment, get all containers except completed
      const resp = await API.get("/buysellapi/containers/public/", {
        params: { for_tracking: true }
      });
      if (resp?.data && Array.isArray(resp.data)) {
        // Filter out completed containers (backend should already exclude, but double-check)
        const filteredContainers = resp.data.filter(
          container => container.status !== "completed"
        );
        setContainers(filteredContainers);
      }
    } catch (e) {
      console.error("Error fetching containers:", e);
    }
  };

  useEffect(() => {
    if (searchMode === "mark-container") {
      fetchContainers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchMode]);

  const handleSearchByMarkContainer = async (e) => {
    e.preventDefault();
    if (!markId.trim()) {
      setError("Please enter your Mark ID");
      return;
    }
    if (!selectedContainer) {
      setError("Please select a container");
      return;
    }
    setLoading(true);
    setError(null);
    setMarkContainerResult(null);
    setTrackingResult(null);
    
    try {
      const response = await API.get("/buysellapi/trackings/by-mark-container/", {
        params: {
          mark_id: markId.trim(),
          container_id: selectedContainer,
        },
      });
      
      if (response.data) {
        setMarkContainerResult(response.data);
      }
    } catch (error) {
      console.error("Error searching by mark ID and container:", error);
      if (error.response?.status === 404) {
        setError("No packages found for this Mark ID in the selected container.");
      } else if (error.response?.status === 400) {
        setError(error.response.data?.error || "Invalid input. Please check your Mark ID and container selection.");
      } else {
        setError("Failed to search. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      setError("Please enter a valid tracking number");
      return;
    }
    setLoading(true);
    setError(null);
    setTrackingResult(null);
    setMarkContainerResult(null);
    try {
      const response = await API.get(
        `/buysellapi/trackings/by-number/${encodeURIComponent(
          trackingNumber.trim()
        )}/`
      );
      if (response.data) {
        const backendData = response.data;
        const statusLabel = getStatusLabel(backendData.status || "pending");
        
        setTrackingResult({
          trackingNumber: backendData.tracking_number,
          status: statusLabel,
          statusValue: backendData.status || "pending",
          sender: backendData.shipping_mark || "N/A",
          addedDate: backendData.date_added,
          product: "Package",
          quantity: 1,
          cbm: backendData.cbm || null,
          shippingFee: backendData.shipping_fee || null,
          goodsType: backendData.goods_type || null,
          eta: backendData.eta || null,
          action: backendData.action || null,
          containerNumber: backendData.container_number || null,
          containerStatus:
            backendData.container_status_display ||
            getContainerStatusLabel(backendData.container_status) ||
            null,
          containerEta: backendData.container_eta || null,
          statusHistory: [
            {
              status: statusLabel,
              statusValue: backendData.status || "pending",
              date: backendData.date_added,
              details: backendData.action || "Tracking created",
            },
          ],
        });
        await fetchActiveRates();
      }
    } catch (error) {
      console.error("Error searching for tracking:", error);
      if (error.response?.status === 404) {
        setError("Tracking not found. It maybe a repack, please track by MARK ID & CONTAINER");
      } else if (error.response?.status === 500) {
        setError("Server error. Please try again later.");
      } else {
        setError("Failed to search tracking number. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (statusValue) => {
    const normalized = statusValue
      ?.toLowerCase()
      .replace(/[()]/g, "")
      .replace(/\s+/g, "_");
    switch (normalized) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "in_transit":
      case "in transit":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "arrived":
      case "arrivedchina":
      case "arrived_china":
        return "bg-green-100 text-green-800 border-green-300";
      case "arrivedghana":
      case "arrived_ghana":
        return "bg-teal-100 text-teal-800 border-teal-300";
      case "cancelled":
        return "bg-gray-200 text-gray-700 border-gray-400";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-300";
      case "not_received":
      case "not received":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "vessel":
      case "on_the_vessel":
      case "on the vessel":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case "clearing":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "off_loading":
      case "of_loading":
      case "of loading":
        return "bg-pink-100 text-pink-800 border-pink-300";
      case "pick_up":
      case "pick up":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="tracking-search-container">
      <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes bounceIn {
            0% { opacity: 0; transform: scale(0.3); }
            50% { opacity: 1; transform: scale(1.05); }
            70% { transform: scale(0.9); }
            100% { transform: scale(1); }
          }
          .animate-slide-in-up { animation: slideInUp 0.5s ease-out; }
          .animate-fade-in { animation: fadeIn 0.6s ease-out; }
          .animate-bounce-in { animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
          .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
          .tracking-search-container .hover-lift { transition: all 0.3s ease; }
          .tracking-search-container .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        `}</style>
      <div className="mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2 text-gray-800 dark:text-white">
            Track Your Shipment
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {searchMode === "tracking"
              ? "Enter your tracking number to get real-time updates on your package's location and status."
              : "Enter your Mark ID and select a container to view all your packages, total CBM, and shipping fees."}
          </p>
        </div>

        {/* Search Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-1 shadow-md inline-flex">
            <button
              type="button"
              onClick={() => {
                setSearchMode("tracking");
                setError(null);
                setTrackingResult(null);
                setMarkContainerResult(null);
              }}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                searchMode === "tracking"
                  ? "bg-primary text-white shadow-md"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <FaTruck className="inline mr-2" />
              By Tracking Number
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchMode("mark-container");
                setError(null);
                setTrackingResult(null);
                setMarkContainerResult(null);
              }}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                searchMode === "mark-container"
                  ? "bg-primary text-white shadow-md"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <FaIdBadge className="inline mr-2" />
              By Mark ID & Container
            </button>
          </div>
        </div>

        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 mb-10 chrome-border-animation">
          {searchMode === "tracking" ? (
            <form
              onSubmit={handleSearch}
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className="relative flex-1">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter your tracking number..."
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent text-base"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/80 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <FaTruck className="text-lg animate-truck" />
                    <span>Track Package</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleSearchByMarkContainer}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <FaIdBadge className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter your Mark ID (e.g., FIM000)"
                    value={markId}
                    onChange={(e) => setMarkId(e.target.value.toUpperCase())}
                    className="w-full pl-12 pr-4 py-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent text-base"
                  />
                </div>
                <div className="relative">
                  <FaShip className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={selectedContainer}
                    onChange={(e) => setSelectedContainer(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent text-base appearance-none"
                    required
                  >
                    <option value="">Select Container *</option>
                    {containers.map((container) => (
                      <option key={container.id} value={container.id}>
                        {container.container_number} (
                        {container.status_display ||
                          getContainerStatusLabel(container.status)}
                        )
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/80 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <FaSearch className="text-lg" />
                    <span>Search Packages</span>
                  </>
                )}
              </button>
            </form>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800/30">
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Mark ID + Container Results */}
        {markContainerResult && (
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 animate-slide-in-up chrome-border-animation">
            <div className="flex items-center justify-between mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  Container Summary
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Mark ID: <span className="font-semibold">{markContainerResult.mark_id}</span> | Container: <span className="font-semibold">{markContainerResult.container.container_number}</span>
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Status:{" "}
                  <span className="font-semibold">
                    {markContainerResult.container.status_display ||
                      getContainerStatusLabel(
                        markContainerResult.container.status
                      ) ||
                      "N/A"}
                  </span>{" "}
                  | ETA:{" "}
                  <span className="font-semibold">
                    {markContainerResult.container.eta
                      ? new Date(
                          markContainerResult.container.eta
                        ).toLocaleDateString()
                      : "Not set"}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3 mb-2">
                  <FaBoxOpen className="text-blue-500 text-2xl" />
                  <h4 className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Packages</h4>
                </div>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {markContainerResult.summary.total_packages}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-3 mb-2">
                  <FaCube className="text-purple-500 text-2xl" />
                  <h4 className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total CBM</h4>
                </div>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {markContainerResult.summary.total_cbm}
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3 mb-2">
                  <FaDollarSign className="text-green-500 text-2xl" />
                  <h4 className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Shipping Fee</h4>
                </div>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  ${markContainerResult.summary.total_shipping_fee_usd}
                </p>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  Note: The shipping fee will increase if any package is flagged as special goods.
                </p>
              </div>
            </div>

            {markContainerResult.tracking_numbers && markContainerResult.tracking_numbers.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                  Tracking Numbers ({markContainerResult.tracking_numbers.length})
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {markContainerResult.tracking_numbers.map((tn, idx) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-gray-800 px-3 py-2 rounded text-sm font-mono text-gray-700 dark:text-gray-300"
                      >
                        {tn}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Single Tracking Result */}
        {trackingResult && (
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 animate-slide-in-up chrome-border-animation">
            <div className="flex items-center justify-between mb-6 border-b border-gray-200 dark:border-gray-700 pb-4 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  Tracking Details
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Tracking Number: {trackingResult.trackingNumber}
                </p>
              </div>
              <div
                className={`px-4 py-2 rounded-full border ${getStatusColor(
                  trackingResult.status
                )} animate-bounce-in`}
              >
                {trackingResult.status}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div
                className="flex items-start gap-4 hover-lift animate-fade-in"
                style={{
                  animationDelay: "0.1s",
                  opacity: 0,
                  animation: "fadeInUp 0.6s ease-out 0.1s forwards",
                }}
              >
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full transition-all duration-300 hover:scale-110 hover:rotate-6">
                  <FaBoxOpen className="text-blue-500" />
                </div>
                <div>
                  <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Package Details
                  </h4>
                  <p className="font-medium text-gray-800 dark:text-white">
                    {trackingResult.product || "No product information"}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    Quantity: {trackingResult.quantity || "1"}
                  </p>
                </div>
              </div>

              <div
                className="flex items-start gap-4 hover-lift animate-fade-in"
                style={{
                  animationDelay: "0.2s",
                  opacity: 0,
                  animation: "fadeInUp 0.6s ease-out 0.2s forwards",
                }}
              >
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full transition-all duration-300 hover:scale-110 hover:rotate-6">
                  <FaCalendarAlt className="text-green-500" />
                </div>
                <div>
                  <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Shipping Information
                  </h4>
                  <p className="font-medium text-gray-800 dark:text-white">
                    {trackingResult.sender || "No sender information"}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    Added: {formatDate(trackingResult.addedDate)}
                  </p>
                </div>
              </div>

              {trackingResult.cbm && (
                <div
                  className="flex items-start gap-4 hover-lift animate-fade-in"
                  style={{
                    animationDelay: "0.3s",
                    opacity: 0,
                    animation: "fadeInUp 0.6s ease-out 0.3s forwards",
                  }}
                >
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-full transition-all duration-300 hover:scale-110 hover:rotate-6">
                    <FaCube className="text-purple-500" />
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Volume (CBM)
                    </h4>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {trackingResult.cbm} m³
                    </p>
                  </div>
                </div>
              )}

              {trackingResult.shippingFee && (
                <div
                  className="flex items-start gap-4 hover-lift animate-fade-in"
                  style={{
                    animationDelay: "0.4s",
                    opacity: 0,
                    animation: "fadeInUp 0.6s ease-out 0.4s forwards",
                  }}
                >
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full transition-all duration-300 hover:scale-110 hover:rotate-6">
                    <FaDollarSign className="text-green-500 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Shipping Fee
                    </h4>
                    <p className="font-medium text-green-600 dark:text-green-400 text-lg">
                      ${parseFloat(trackingResult.shippingFee).toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      Note: The shipping fee will increase if any package is flagged as special goods.
                    </p>
                  </div>
                </div>
              )}

              {trackingResult.goodsType && (
                <div
                  className="flex items-start gap-4 hover-lift animate-fade-in"
                  style={{
                    animationDelay: "0.5s",
                    opacity: 0,
                    animation: "fadeInUp 0.6s ease-out 0.5s forwards",
                  }}
                >
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-full transition-all duration-300 hover:scale-110 hover:rotate-6">
                    <FaBoxOpen className="text-orange-500" />
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Goods Type
                    </h4>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {trackingResult.goodsType.charAt(0).toUpperCase() +
                        trackingResult.goodsType.slice(1)}{" "}
                      Goods
                    </p>
                  </div>
                </div>
              )}

              {trackingResult.eta && (
                <div
                  className="flex items-start gap-4 hover-lift animate-fade-in"
                  style={{
                    animationDelay: "0.6s",
                    opacity: 0,
                    animation: "fadeInUp 0.6s ease-out 0.6s forwards",
                  }}
                >
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-full transition-all duration-300 hover:scale-110 hover:rotate-6">
                    <FaCalendarAlt className="text-indigo-500" />
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Estimated Arrival (ETA)
                    </h4>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {new Date(trackingResult.eta).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {(trackingResult.containerNumber || trackingResult.containerNumber === 0) && (
                <div
                  className="flex items-start gap-4 hover-lift animate-fade-in"
                  style={{
                    animationDelay: "0.7s",
                    opacity: 0,
                    animation: "fadeInUp 0.6s ease-out 0.7s forwards",
                  }}
                >
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-full transition-all duration-300 hover:scale-110 hover:rotate-6">
                    <FaBoxOpen className="text-cyan-500" />
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Container Number
                    </h4>
                    <p className="font-medium text-cyan-600 dark:text-cyan-400">
                      {trackingResult.containerNumber}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      Status: {trackingResult.containerStatus || "N/A"}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      ETA: {trackingResult.containerEta ? new Date(trackingResult.containerEta).toLocaleDateString() : "Not set"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {activeRates && (
              <div
                className="mb-6 animate-fade-in"
                style={{
                  animationDelay: "0.7s",
                  opacity: 0,
                  animation: "fadeInUp 0.6s ease-out 0.7s forwards",
                }}
              >
                <h4 className="text-gray-800 dark:text-white font-medium mb-4 flex items-center gap-2">
                  <FaDollarSign className="text-green-500 animate-pulse" />
                  Active Shipping Rates
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800 hover-lift transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Normal Goods Rate
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${parseFloat(activeRates.normal_goods_rate).toFixed(2)}
                      <span className="text-sm font-normal ml-1">per CBM</span>
                    </p>
                    {activeRates.normal_goods_rate_lt1 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 animate-fade-in">
                        CBM &lt; 1: $
                        {parseFloat(activeRates.normal_goods_rate_lt1).toFixed(
                          2
                        )}
                      </p>
                    )}
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800 hover-lift transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      Special Goods Rate
                    </p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      ${parseFloat(activeRates.special_goods_rate).toFixed(2)}
                      <span className="text-sm font-normal ml-1">per CBM</span>
                    </p>
                    {activeRates.special_goods_rate_lt1 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 animate-fade-in">
                        CBM &lt; 1: $
                        {parseFloat(activeRates.special_goods_rate_lt1).toFixed(
                          2
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {(() => {
              const normalize = (s) =>
                (s || "")
                  .toLowerCase()
                  .replace(/[()]/g, "")
                  .replace(/\s+/g, "_");
              const steps = [
                { value: "arrived", label: "Arrived(China)", color: "green" },
                { value: "vessel", label: "On The Vessel", color: "indigo" },
                {
                  value: "arrived_ghana",
                  label: "Arrived(Ghana)",
                  color: "teal",
                },
                { value: "clearing", label: "Clearing", color: "purple" },
                { value: "off_loading", label: "Of Loading", color: "pink" },
                { value: "pick_up", label: "Pick up", color: "emerald" },
              ];
              const currentVal = normalize(
                trackingResult.statusValue || trackingResult.status
              );
              const allowed = new Set(steps.map((s) => s.value));
              if (!allowed.has(currentVal)) return null;
              const currentStep = steps.find((s) => s.value === currentVal);
              const colorClasses = (color) => {
                switch (color) {
                  case "green":
                    return {
                      bg: "bg-green-500",
                      ring: "ring-green-200 dark:ring-green-900",
                      text: "text-green-700 dark:text-green-300",
                      border: "border-green-200 dark:border-green-700",
                    };
                  case "teal":
                    return {
                      bg: "bg-teal-500",
                      ring: "ring-teal-200 dark:ring-teal-900",
                      text: "text-teal-700 dark:text-teal-300",
                      border: "border-teal-200 dark:border-teal-700",
                    };
                  case "indigo":
                    return {
                      bg: "bg-indigo-500",
                      ring: "ring-indigo-200 dark:ring-indigo-900",
                      text: "text-indigo-700 dark:text-indigo-300",
                      border: "border-indigo-200 dark:border-indigo-700",
                    };
                  case "purple":
                    return {
                      bg: "bg-purple-500",
                      ring: "ring-purple-200 dark:ring-purple-900",
                      text: "text-purple-700 dark:text-purple-300",
                      border: "border-purple-200 dark:border-purple-700",
                    };
                  case "pink":
                    return {
                      bg: "bg-pink-500",
                      ring: "ring-pink-200 dark:ring-pink-900",
                      text: "text-pink-700 dark:text-pink-300",
                      border: "border-pink-200 dark:border-pink-700",
                    };
                  case "emerald":
                    return {
                      bg: "bg-emerald-500",
                      ring: "ring-emerald-200 dark:ring-emerald-900",
                      text: "text-emerald-700 dark:text-emerald-300",
                      border: "border-emerald-200 dark:border-emerald-700",
                    };
                  default:
                    return {
                      bg: "bg-gray-400",
                      ring: "ring-gray-200 dark:ring-gray-800",
                      text: "text-gray-600 dark:text-gray-300",
                      border: "border-gray-200 dark:border-gray-700",
                    };
                }
              };
              const colors = colorClasses(currentStep.color);
              const isPickUp = currentStep.value === "pick_up";
              return (
                <div className="mb-6">
                  <h4 className="flex items-center gap-2 text-gray-800 dark:text-white font-medium mb-4">
                    <FaHistory className="animate-pulse" />
                    <span>Current Stage</span>
                  </h4>
                  <div
                    className="flex items-start gap-4 animate-fade-in-up opacity-0"
                    style={{ animation: "fadeInUp 0.6s ease-out 0s forwards" }}
                  >
                    {isPickUp ? (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ${colors.bg} ${colors.ring}`}
                        title={currentStep.label}
                      >
                        <FaCheckCircle className="text-white" />
                      </div>
                    ) : (
                      <div
                        className={`w-6 h-6 rounded-full ring-4 ${colors.bg} ${colors.ring}`}
                        title={currentStep.label}
                      />
                    )}
                    <div
                      className={`flex-1 rounded-lg p-4 border bg-white dark:bg-gray-800 ${colors.border} hover:shadow transition-all`}
                    >
                      <div className="flex items-center justify-between">
                        <p className={`font-semibold ${colors.text}`}>
                          {currentStep.label}
                        </p>
                        <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full animate-pulse">
                          Current
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        This is your current shipment stage.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                Need help with your shipment? Contact our support team at
                support@buysellclub.org or call 233-540266839.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackingSearch;
