import React, { useState, useEffect } from "react";
import { FaTruck, FaPlus, FaTrash, FaSearch, FaEye, FaBoxOpen, FaCalendarAlt, FaCube, FaDollarSign, FaShip } from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../../api";
import ConfirmModal from "../../components/shared/ConfirmModal";

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "in_transit", label: "In Transit" },
  { value: "arrived", label: "Arrived(China)" },
  { value: "vessel", label: "On The Vessel" },
  { value: "clearing", label: "Clearing" },
  { value: "arrived_ghana", label: "Arrived(Ghana)" },
  { value: "off_loading", label: "Off Loading" },
  { value: "pick_up", label: "Pick up" },
];

const AgentShippingTracking = () => {
  const [trackings, setTrackings] = useState([]);
  const [filteredTrackings, setFilteredTrackings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editTracking, setEditTracking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState("");

  useEffect(() => {
    fetchTrackings();
  }, []);

  useEffect(() => {
    filterTrackings();
  }, [trackings, searchTerm, filterStatus]);

  const fetchTrackings = async () => {
    setLoading(true);
    try {
      const response = await API.get("/buysellapi/agent/trackings/");
      setTrackings(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching trackings:", error);
      toast.error("Failed to fetch trackings");
      setTrackings([]);
    } finally {
      setLoading(false);
    }
  };

  const filterTrackings = () => {
    let filtered = [...trackings];

    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.shipping_mark?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }

    setFilteredTrackings(filtered);
  };

  const handleAddTracking = async (e) => {
    e.preventDefault();
    const tn = (trackingNumberInput || "").toUpperCase().trim();
    if (!tn) {
      toast.error("Please enter a tracking number.");
      return;
    }

    try {
      setLoading(true);
      
      // Check if tracking already exists
      try {
        await API.get(`/buysellapi/trackings/by-number/${encodeURIComponent(tn)}/`);
        toast.error(`Tracking number ${tn} already exists in the system.`);
        setTrackingNumberInput("");
        return;
      } catch (err) {
        if (err?.response?.status && err.response.status !== 404) {
          // Non-404 error (e.g., 401)
          if (err.response.status === 401) {
            toast.error("Please log in to add a new shipment.");
          } else {
            toast.error("Could not verify tracking status. Please try again.");
          }
          return;
        }
      }

      // Get agent's shipping mark (if available)
      let smark = "N/A";
      try {
        const smResp = await API.get("/buysellapi/shipping-marks/me/");
        const sm = smResp?.data;
        if (sm && (sm.shippingMark || (sm.markId && sm.name))) {
          smark = sm.shippingMark || `${sm.markId}:${sm.name}`;
        }
      } catch (e) {
        // If no shipping mark, use N/A
        console.log("No shipping mark found, using default");
      }

      // Create tracking with minimal data (like user form)
      const payload = {
        tracking_number: tn,
        shipping_mark: smark,
        status: "pending",
        cbm: 0,
      };

      await API.post("/buysellapi/agent/trackings/", payload);
      toast.success(`Tracking number ${tn} has been added successfully.`);
      setTrackingNumberInput("");
      setShowAddForm(false);
      fetchTrackings();
    } catch (error) {
      console.error("Error saving tracking:", error);
      
      let errorMessage = "Failed to save tracking";
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.tracking_number) {
          errorMessage = Array.isArray(errorData.tracking_number) 
            ? errorData.tracking_number[0] 
            : errorData.tracking_number;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async () => {
    try {
      setLoading(true);
      await API.delete(`/buysellapi/agent/trackings/${deleteTarget}/`);
      toast.success("Tracking deleted successfully");
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchTrackings();
    } catch (error) {
      console.error("Error deleting tracking:", error);
      toast.error("Failed to delete tracking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <FaTruck className="text-green-600" />
          Shipping Tracking
        </h2>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditTracking(null);
            setTrackingNumberInput("");
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <FaPlus /> Add Shipment
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
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Add Form - Simple tracking number only */}
      {showAddForm && !editTracking && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Add New Shipment
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Enter a tracking number to add a new shipment. The system will automatically set default values.
          </p>
          <form onSubmit={handleAddTracking} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tracking Number *
              </label>
              <input
                type="text"
                required
                value={trackingNumberInput}
                onChange={(e) => setTrackingNumberInput(e.target.value.toUpperCase())}
                placeholder="Enter tracking number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add Shipment"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setTrackingNumberInput("");
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View/Status Form - Display like user tracking view */}
      {showAddForm && editTracking && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Tracking Details
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Tracking Number: {editTracking.tracking_number}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-4 py-2 rounded-full border text-sm font-semibold ${
                editTracking.status === "pending" ? "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700" :
                editTracking.status === "in_transit" ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700" :
                editTracking.status === "arrived" || editTracking.status === "arrived_ghana" ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700" :
                editTracking.status === "vessel" ? "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900 dark:text-indigo-200 dark:border-indigo-700" :
                editTracking.status === "clearing" ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700" :
                "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              }`}>
                {statusOptions.find((opt) => opt.value === editTracking.status)?.label || editTracking.status}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditTracking(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Tracking Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Shipping Information */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full">
                <FaCalendarAlt className="text-green-500" />
              </div>
              <div>
                <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Shipping Information
                </h4>
                <p className="font-medium text-gray-800 dark:text-white">
                  {editTracking.shipping_mark || "N/A"}
                </p>
                <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">
                  {editTracking.date_added ? `Added: ${new Date(editTracking.date_added).toLocaleString()}` : "Date not available"}
                </p>
              </div>
            </div>

            {/* CBM */}
            {editTracking.cbm && (
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-full">
                  <FaCube className="text-purple-500" />
                </div>
                <div>
                  <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Volume (CBM)
                  </h4>
                  <p className="font-medium text-gray-800 dark:text-white">
                    {Number(editTracking.cbm).toFixed(2)} m³
                  </p>
                </div>
              </div>
            )}

            {/* Shipping Fee - Always display */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full">
                <FaDollarSign className="text-green-500" />
              </div>
              <div>
                <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Shipping Fee
                </h4>
                <p className="font-medium text-green-600 dark:text-green-400 text-lg">
                  {editTracking.shipping_fee 
                    ? `$${parseFloat(editTracking.shipping_fee).toFixed(2)}`
                    : "N/A"}
                </p>
              </div>
            </div>

            {/* ETA */}
            {editTracking.eta && (
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-full">
                  <FaCalendarAlt className="text-indigo-500" />
                </div>
                <div>
                  <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Estimated Arrival (ETA)
                  </h4>
                  <p className="font-medium text-gray-800 dark:text-white">
                    {new Date(editTracking.eta).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            {/* Container Number - Always display */}
            {(() => {
              let containerNumber = "N/A";
              let containerStatus = null;
              let containerObj = null;
              
              if (editTracking.container) {
                if (typeof editTracking.container === 'object') {
                  containerObj = editTracking.container;
                  containerNumber = containerObj.container_number || containerObj.containerNumber || "N/A";
                  containerStatus = containerObj.status || null;
                } else {
                  containerNumber = editTracking.container_number || "N/A";
                }
              } else if (editTracking.container_number) {
                containerNumber = editTracking.container_number;
              }

              return (
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                    <FaShip className="text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Container Number
                    </h4>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {containerNumber}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Container Status - Display if available */}
            {(() => {
              let containerStatus = null;
              let containerObj = null;
              
              if (editTracking.container && typeof editTracking.container === 'object') {
                containerObj = editTracking.container;
                containerStatus = containerObj.status || null;
              }

              if (containerStatus) {
                return (
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-full">
                      <FaBoxOpen className="text-teal-500" />
                    </div>
                    <div>
                      <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Container Status
                      </h4>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {containerStatus.charAt(0).toUpperCase() + containerStatus.slice(1).replace(/_/g, ' ')}
                      </p>
                      {containerObj?.port_of_loading && containerObj?.port_of_discharge && (
                        <p className="text-gray-700 dark:text-gray-300 text-xs mt-1">
                          {containerObj.port_of_loading} → {containerObj.port_of_discharge}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditTracking(null);
              }}
              className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setDeleteTarget(editTracking.id);
                setShowDeleteModal(true);
                setEditTracking(null);
              }}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Tracking
            </button>
          </div>
        </div>
      )}

      {/* Trackings Table */}
      {loading && trackings.length === 0 ? (
        <div className="text-center py-8">Loading trackings...</div>
      ) : filteredTrackings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No trackings found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Tracking Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Shipping Mark
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  CBM
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Container
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTrackings.map((tracking) => {
                // Get container number - handle both object and ID formats
                let containerNumber = "-";
                if (tracking.container) {
                  containerNumber = typeof tracking.container === 'object' 
                    ? tracking.container.container_number || tracking.container.containerNumber || "-"
                    : "-";
                } else if (tracking.container_number) {
                  containerNumber = tracking.container_number;
                }
                
                return (
                  <tr key={tracking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {tracking.tracking_number}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        {statusOptions.find((opt) => opt.value === tracking.status)?.label || tracking.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {tracking.shipping_mark || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {tracking.cbm !== null && tracking.cbm !== undefined ? Number(tracking.cbm).toFixed(2) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {containerNumber}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditTracking(tracking);
                          setShowAddForm(true);
                        }}
                        className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="View tracking details"
                      >
                        <FaEye />
                      </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(tracking.id);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Delete tracking"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        title="Delete Tracking"
        message="Are you sure you want to delete this tracking? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default AgentShippingTracking;

