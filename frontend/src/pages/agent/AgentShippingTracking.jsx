import React, { useState, useEffect } from "react";
import { FaTruck, FaPlus, FaEdit, FaTrash, FaSearch, FaEye } from "react-icons/fa";
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
  const [containers, setContainers] = useState([]);

  const [newTracking, setNewTracking] = useState({
    tracking_number: "",
    status: "pending",
    cbm: "",
    shipping_fee: "",
    eta: "",
    container_id: "",
    shipping_mark: "",
  });

  useEffect(() => {
    fetchTrackings();
    fetchContainers();
  }, []);

  useEffect(() => {
    filterTrackings();
  }, [trackings, searchTerm, filterStatus]);

  const fetchContainers = async () => {
    try {
      const response = await API.get("/api/admin/containers", {
        params: { limit: 1000 },
      });
      setContainers(response.data.data || []);
    } catch (error) {
      console.error("Error fetching containers:", error);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editTracking) {
        await API.put(`/buysellapi/agent/trackings/${editTracking.id}/`, newTracking);
        toast.success("Tracking updated successfully");
      } else {
        await API.post("/buysellapi/agent/trackings/", newTracking);
        toast.success("Tracking added successfully");
      }
      setShowAddForm(false);
      setEditTracking(null);
      setNewTracking({
        tracking_number: "",
        status: "pending",
        cbm: "",
        shipping_fee: "",
        eta: "",
        container_id: "",
        shipping_mark: "",
      });
      fetchTrackings();
    } catch (error) {
      console.error("Error saving tracking:", error);
      toast.error(
        error.response?.data?.detail || 
        error.response?.data?.error || 
        "Failed to save tracking"
      );
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
            setNewTracking({
              tracking_number: "",
              status: "pending",
              cbm: "",
              shipping_fee: "",
              eta: "",
              container_id: "",
              shipping_mark: "",
            });
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

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            {editTracking ? "Edit Tracking" : "Add New Shipment"}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tracking Number *
              </label>
              <input
                type="text"
                required
                value={newTracking.tracking_number}
                onChange={(e) => setNewTracking({ ...newTracking, tracking_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status *
              </label>
              <select
                required
                value={newTracking.status}
                onChange={(e) => setNewTracking({ ...newTracking, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CBM
              </label>
              <input
                type="number"
                step="0.01"
                value={newTracking.cbm}
                onChange={(e) => setNewTracking({ ...newTracking, cbm: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shipping Fee
              </label>
              <input
                type="number"
                step="0.01"
                value={newTracking.shipping_fee}
                onChange={(e) => setNewTracking({ ...newTracking, shipping_fee: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ETA
              </label>
              <input
                type="date"
                value={newTracking.eta}
                onChange={(e) => setNewTracking({ ...newTracking, eta: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Container
              </label>
              <select
                value={newTracking.container_id}
                onChange={(e) => setNewTracking({ ...newTracking, container_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select Container</option>
                {containers.map((container) => (
                  <option key={container.id} value={container.id}>
                    {container.container_number}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shipping Mark
              </label>
              <input
                type="text"
                value={newTracking.shipping_mark}
                onChange={(e) => setNewTracking({ ...newTracking, shipping_mark: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {editTracking ? "Update" : "Add"} Tracking
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditTracking(null);
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTrackings.map((tracking) => (
                <tr key={tracking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
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
                    {tracking.cbm || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditTracking(tracking);
                          setNewTracking({
                            tracking_number: tracking.tracking_number || "",
                            status: tracking.status || "pending",
                            cbm: tracking.cbm || "",
                            shipping_fee: tracking.shipping_fee || "",
                            eta: tracking.eta || "",
                            container_id: tracking.container_id || "",
                            shipping_mark: tracking.shipping_mark || "",
                          });
                          setShowAddForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteTarget(tracking.id);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-800 dark:text-red-400"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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

