import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
} from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../../api";
import ConfirmModal from "../../components/shared/ConfirmModal";

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "in_transit", label: "In Transit" },
  { value: "arrived", label: "Arrived(China)" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
  { value: "not_received", label: "Not Received" },
  { value: "vessel", label: "On The Vessel" },
  { value: "clearing", label: "Clearing" },
  { value: "arrived_ghana", label: "Arrived(Ghana)" },
  { value: "off_loading", label: "Of Loading" },
  { value: "pick_up", label: "Pick up" },
];

const AgentTrackingManagement = () => {
  const [trackings, setTrackings] = useState([]);
  const [filteredTrackings, setFilteredTrackings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editTracking, setEditTracking] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewTracking, setViewTracking] = useState(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterTrackings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Fetch all trackings - admins can see all
      const response = await API.get("/buysellapi/trackings/");
      const allTrackings = Array.isArray(response.data) ? response.data : [];
      // Filter for agent-created trackings
      const agentTrackings = allTrackings.filter(t => t.created_by_agent);
      setTrackings(agentTrackings);
    } catch (error) {
      console.error("Error fetching agent trackings:", error);
      toast.error("Failed to fetch agent trackings");
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
    setLoading(true);

    try {
      // For admin, we can create/update trackings via the regular endpoint
      // The backend should handle agent assignment if needed
      const trackingData = {
        tracking_number: newTracking.tracking_number,
        status: newTracking.status,
        cbm: newTracking.cbm || null,
        shipping_fee: newTracking.shipping_fee || null,
        eta: newTracking.eta || null,
        container_id: newTracking.container_id || null,
        shipping_mark: newTracking.shipping_mark || "",
      };

      if (editTracking) {
        await API.patch(
          `/buysellapi/trackings/${editTracking.id}/`,
          trackingData
        );
        toast.success("Tracking updated successfully");
      } else {
        // For new trackings, we'll use the regular endpoint
        // Note: Admin creating agent trackings might need backend support
        await API.post("/buysellapi/trackings/", trackingData);
        toast.success("Tracking added successfully");
      }
      setShowAddForm(false);
      setEditTracking(null);
      resetForm();
      fetchTrackings();
    } catch (error) {
      console.error("Error saving tracking:", error);
      toast.error(
        error.response?.data?.detail || "Failed to save tracking"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      if (deleteTarget === "selected") {
        // Handle bulk delete if needed
        toast.info("Bulk delete not implemented yet");
      } else {
        await API.delete(`/buysellapi/trackings/${deleteTarget}/`);
        toast.success("Tracking deleted successfully");
      }
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

  const resetForm = () => {
    setNewTracking({
      tracking_number: "",
      status: "pending",
      cbm: "",
      shipping_fee: "",
      eta: "",
      container_id: "",
      shipping_mark: "",
    });
  };

  const handleEdit = (tracking) => {
    setEditTracking(tracking);
    setNewTracking({
      tracking_number: tracking.tracking_number || "",
      status: tracking.status || "pending",
      cbm: tracking.cbm || "",
      shipping_fee: tracking.shipping_fee || "",
      eta: tracking.eta || "",
      container_id: tracking.container?.id || "",
      shipping_mark: tracking.shipping_mark || "",
    });
    setShowAddForm(true);
  };

  const handleView = (tracking) => {
    setViewTracking(tracking);
    setShowViewModal(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Agent Tracking Numbers
        </h3>
        <button
          onClick={() => {
            resetForm();
            setEditTracking(null);
            setShowAddForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <FaPlus /> Add Tracking
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by tracking number or shipping mark..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading && trackings.length === 0 ? (
        <div className="text-center py-8">Loading...</div>
      ) : filteredTrackings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No agent trackings found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tracking Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Shipping Mark
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  CBM
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Shipping Fee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Container
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTrackings.map((tracking) => (
                <tr key={tracking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {tracking.tracking_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {tracking.shipping_mark || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        tracking.status === "pick_up"
                          ? "bg-green-100 text-green-800"
                          : tracking.status === "cancelled" || tracking.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {statusOptions.find((s) => s.value === tracking.status)?.label ||
                        tracking.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {tracking.cbm || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {tracking.shipping_fee ? `$${tracking.shipping_fee}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {tracking.container?.container_number || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(tracking)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => handleEdit(tracking)}
                        className="text-green-600 hover:text-green-800"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteTarget(tracking.id);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
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

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              {editTracking ? "Edit Tracking" : "Add Tracking"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tracking Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTracking.tracking_number}
                    onChange={(e) =>
                      setNewTracking({ ...newTracking, tracking_number: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Shipping Mark
                  </label>
                  <input
                    type="text"
                    value={newTracking.shipping_mark}
                    onChange={(e) =>
                      setNewTracking({ ...newTracking, shipping_mark: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={newTracking.status}
                    onChange={(e) =>
                      setNewTracking({ ...newTracking, status: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      CBM
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newTracking.cbm}
                      onChange={(e) =>
                        setNewTracking({ ...newTracking, cbm: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      onChange={(e) =>
                        setNewTracking({ ...newTracking, shipping_fee: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Container
                  </label>
                  <select
                    value={newTracking.container_id}
                    onChange={(e) =>
                      setNewTracking({ ...newTracking, container_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No Container</option>
                    {containers.map((container) => (
                      <option key={container.id} value={container.id}>
                        {container.container_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ETA
                  </label>
                  <input
                    type="date"
                    value={newTracking.eta}
                    onChange={(e) =>
                      setNewTracking({ ...newTracking, eta: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : editTracking ? "Update" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditTracking(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewTracking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              Tracking Details
            </h3>
            <div className="space-y-2">
              <p><strong>Tracking Number:</strong> {viewTracking.tracking_number}</p>
              <p><strong>Shipping Mark:</strong> {viewTracking.shipping_mark || "-"}</p>
              <p><strong>Status:</strong> {statusOptions.find((s) => s.value === viewTracking.status)?.label || viewTracking.status}</p>
              <p><strong>CBM:</strong> {viewTracking.cbm || "-"}</p>
              <p><strong>Shipping Fee:</strong> {viewTracking.shipping_fee ? `$${viewTracking.shipping_fee}` : "-"}</p>
              <p><strong>Container:</strong> {viewTracking.container?.container_number || "-"}</p>
              <p><strong>ETA:</strong> {viewTracking.eta || "-"}</p>
              <p><strong>Date Added:</strong> {new Date(viewTracking.date_added).toLocaleDateString()}</p>
            </div>
            <button
              onClick={() => setShowViewModal(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        title="Delete Tracking"
        message="Are you sure you want to delete this tracking number? This action cannot be undone."
      />
    </div>
  );
};

export default AgentTrackingManagement;

