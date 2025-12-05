import React, { useState, useEffect } from "react";
import { FaBell, FaTruck, FaCheckCircle, FaExclamationTriangle, FaSearch } from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../../api";

const AgentPackageUpdates = () => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchUpdates();
    // Set up polling for updates every 30 seconds
    const interval = setInterval(fetchUpdates, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      // Fetch agent trackings to get package updates
      const response = await API.get("/buysellapi/agent/trackings/");
      const trackings = Array.isArray(response.data) ? response.data : [];
      
      // Transform trackings into updates format
      const updatesList = trackings.map((tracking) => ({
        id: tracking.id,
        tracking_number: tracking.tracking_number,
        status: tracking.status,
        status_label: getStatusLabel(tracking.status),
        updated_at: tracking.updated_at || tracking.date_added,
        shipping_mark: tracking.shipping_mark,
        cbm: tracking.cbm,
        container: tracking.container,
      }));

      setUpdates(updatesList);
    } catch (error) {
      console.error("Error fetching package updates:", error);
      if (updates.length === 0) {
        toast.error("Failed to fetch package updates");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      pending: "Pending",
      in_transit: "In Transit",
      arrived: "Arrived (China)",
      vessel: "On The Vessel",
      clearing: "Clearing",
      arrived_ghana: "Arrived (Ghana)",
      off_loading: "Off Loading",
      pick_up: "Ready for Pickup",
    };
    return statusMap[status] || status;
  };

  const getStatusIcon = (status) => {
    if (status === "pick_up" || status === "arrived_ghana") {
      return <FaCheckCircle className="text-green-600" />;
    }
    if (status === "pending" || status === "clearing") {
      return <FaExclamationTriangle className="text-yellow-600" />;
    }
    return <FaTruck className="text-blue-600" />;
  };

  const getStatusColor = (status) => {
    if (status === "pick_up" || status === "arrived_ghana") {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    }
    if (status === "pending" || status === "clearing") {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  };

  const filteredUpdates = updates.filter((update) => {
    const matchesSearch =
      update.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      update.shipping_mark?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || update.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Sort by most recent first
  const sortedUpdates = [...filteredUpdates].sort((a, b) => {
    const dateA = new Date(a.updated_at || 0);
    const dateB = new Date(b.updated_at || 0);
    return dateB - dateA;
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <FaBell className="text-yellow-600" />
          Package Updates
        </h2>
        <button
          onClick={fetchUpdates}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tracking number or shipping mark..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_transit">In Transit</option>
          <option value="arrived">Arrived (China)</option>
          <option value="vessel">On The Vessel</option>
          <option value="clearing">Clearing</option>
          <option value="arrived_ghana">Arrived (Ghana)</option>
          <option value="off_loading">Off Loading</option>
          <option value="pick_up">Ready for Pickup</option>
        </select>
      </div>

      {/* Updates List */}
      {loading && updates.length === 0 ? (
        <div className="text-center py-8">Loading updates...</div>
      ) : sortedUpdates.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No package updates found
        </div>
      ) : (
        <div className="space-y-4">
          {sortedUpdates.map((update) => (
            <div
              key={update.id}
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-blue-600"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1">{getStatusIcon(update.status)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Tracking: {update.tracking_number}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          update.status
                        )}`}
                      >
                        {update.status_label}
                      </span>
                    </div>
                    {update.shipping_mark && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Shipping Mark: {update.shipping_mark}
                      </p>
                    )}
                    {update.cbm && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        CBM: {update.cbm}
                      </p>
                    )}
                    {update.container && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Container: {update.container.container_number || update.container}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Last updated:{" "}
                      {update.updated_at
                        ? new Date(update.updated_at).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentPackageUpdates;


