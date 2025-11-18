import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import api from "../api";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaShip,
  FaEye,
  FaBoxes,
} from "react-icons/fa";
import ConfirmModal from "./shared/ConfirmModal";

const ContainerManagement = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentContainer, setCurrentContainer] = useState(null);
  const [containerDetails, setContainerDetails] = useState(null);
  // Invoice preview/send state
  const [invoiceMarkId, setInvoiceMarkId] = useState("");
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceSending, setInvoiceSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("-created_at");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [containerToDelete, setContainerToDelete] = useState(null);

  const [formData, setFormData] = useState({
    container_number: "",
    port_of_loading: "China",
    port_of_discharge: "Ghana",
    status: "preparing",
    departure_date: "",
    arrival_date: "",
    notes: "",
  });

  const statusOptions = [
    { value: "preparing", label: "Preparing" },
    { value: "loading", label: "Loading" },
    { value: "in_transit", label: "In Transit" },
    { value: "arrived_port", label: "Arrived at Port" },
    { value: "clearing", label: "Clearing" },
    { value: "completed", label: "Completed" },
  ];

  const fetchContainers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/admin/containers", {
        params: {
          page: currentPage,
          limit: 10,
          search: searchTerm,
          sortBy: sortBy,
        },
      });

      setContainers(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching containers:", error);
      toast.error("Failed to fetch containers");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortBy]);

  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (currentContainer) {
        // Update existing container
        await api.put(`/api/admin/containers/${currentContainer.id}`, formData);
        toast.success("Container updated successfully");
      } else {
        // Create new container
        await api.post("/api/admin/containers", formData);
        toast.success("Container created successfully");
      }

      setShowModal(false);
      resetForm();
      fetchContainers();
    } catch (error) {
      console.error("Error saving container:", error);
      toast.error(error.response?.data?.error || "Failed to save container");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (container) => {
    setCurrentContainer(container);
    setFormData({
      container_number: container.container_number,
      port_of_loading: container.port_of_loading,
      port_of_discharge: container.port_of_discharge,
      status: container.status,
      departure_date: container.departure_date || "",
      arrival_date: container.arrival_date || "",
      notes: container.notes || "",
    });
    setShowModal(true);
  };

  const openDeleteModal = (container) => {
    setContainerToDelete(container);
    setShowDeleteModal(true);
  };

  const confirmDeleteContainer = async () => {
    if (!containerToDelete) return;
    setLoading(true);
    try {
      await api.delete(`/api/admin/containers/${containerToDelete.id}`);
      toast.success("Container deleted successfully");
      fetchContainers();
    } catch (error) {
      console.error("Error deleting container:", error);
      toast.error("Failed to delete container");
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setContainerToDelete(null);
    }
  };

  const handleViewDetails = async (containerId) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/admin/containers/${containerId}`);
      setContainerDetails(response.data);
      setShowDetailModal(true);
      // reset invoice state on open
      setInvoiceMarkId("");
      setInvoicePreview(null);
    } catch (error) {
      console.error("Error fetching container details:", error);
      toast.error("Failed to fetch container details");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentContainer(null);
    setFormData({
      container_number: "",
      port_of_loading: "China",
      port_of_discharge: "Ghana",
      status: "preparing",
      departure_date: "",
      arrival_date: "",
      notes: "",
    });
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      preparing:
        "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-sm",
      loading:
        "bg-gradient-to-r from-blue-400 to-cyan-500 text-white shadow-sm",
      in_transit:
        "bg-gradient-to-r from-purple-400 to-pink-500 text-white shadow-sm",
      arrived_port:
        "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-sm",
      clearing:
        "bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-sm",
      completed:
        "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-sm",
    };
    return colors[status] || colors.preparing;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FaShip className="text-blue-600" />
            Container Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage shipping containers and track packages
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <FaPlus /> Add Container
        </button>
      </div>

      {/* Search and Sort */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search containers..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="-created_at">Newest First</option>
          <option value="created_at">Oldest First</option>
          <option value="container_number">Container Number</option>
          <option value="-departure_date">Departure Date</option>
        </select>
      </div>

      {/* Containers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            Loading containers...
          </div>
        ) : containers.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            No containers found
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow-md">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-gray-700 dark:to-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
                    Container #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
                    Trackings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {containers.map((container) => (
                  <tr
                    key={container.id}
                    className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-200 border-l-4 border-transparent hover:border-teal-500"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FaBoxes className="text-teal-500 dark:text-teal-400" />
                        <span className="text-sm font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2 py-1 rounded">
                          {container.container_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wide ${getStatusBadgeColor(
                          container.status
                        )}`}
                      >
                        {
                          statusOptions.find(
                            (opt) => opt.value === container.status
                          )?.label
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {container.port_of_loading}
                      </span>
                      <span className="text-gray-400 mx-1">→</span>
                      <span className="text-purple-600 dark:text-purple-400 font-medium">
                        {container.port_of_discharge}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="text-teal-600 dark:text-teal-400 font-bold">
                          {container.tracking_count} packages
                        </div>
                        <div className="text-orange-600 dark:text-orange-400 text-xs font-medium">
                          {container.unique_mark_ids?.length || 0} unique marks
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        {container.departure_date
                          ? `Dep: ${new Date(
                              container.departure_date
                            ).toLocaleDateString()}`
                          : "No departure"}
                      </div>
                      <div>
                        {container.arrival_date
                          ? `Arr: ${new Date(
                              container.arrival_date
                            ).toLocaleDateString()}`
                          : "No arrival"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(container.id)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => handleEdit(container)}
                          className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => openDeleteModal(container)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400"
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              {currentContainer ? "Edit Container" : "Create New Container"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Container Number *
                  </label>
                  <input
                    type="text"
                    name="container_number"
                    value={formData.container_number}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., CONT-2025-001"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Port of Loading
                  </label>
                  <input
                    type="text"
                    name="port_of_loading"
                    value={formData.port_of_loading}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Port of Discharge
                  </label>
                  <input
                    type="text"
                    name="port_of_discharge"
                    value={formData.port_of_discharge}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status *
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Departure Date
                  </label>
                  <input
                    type="date"
                    name="departure_date"
                    value={formData.departure_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Arrival Date
                  </label>
                  <input
                    type="date"
                    name="arrival_date"
                    value={formData.arrival_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading
                    ? "Saving..."
                    : currentContainer
                    ? "Update"
                    : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailModal && containerDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Container Details: {containerDetails.container_number}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Invoice: Search by Mark ID */}
            <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-semibold text-gray-800 dark:text-white mb-3">
                Invoice by Mark ID
              </h4>
              <div className="flex gap-3 items-end flex-wrap">
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Shipping Mark ID
                  </label>
                  <input
                    type="text"
                    value={invoiceMarkId}
                    onChange={(e) =>
                      setInvoiceMarkId(e.target.value.toUpperCase())
                    }
                    placeholder="e.g., FIM123"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!invoiceMarkId) {
                      toast.error("Enter a Mark ID");
                      return;
                    }
                    setInvoiceLoading(true);
                    try {
                      const res = await api.get(
                        "/buysellapi/invoices/preview/",
                        {
                          params: {
                            mark_id: invoiceMarkId,
                            container_id: containerDetails.id,
                          },
                        }
                      );
                      setInvoicePreview(res.data);
                    } catch (err) {
                      console.error("Invoice preview error", err);
                      toast.error(
                        err.response?.data?.detail ||
                          "Failed to load invoice preview"
                      );
                      setInvoicePreview(null);
                    } finally {
                      setInvoiceLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={invoiceLoading}
                >
                  {invoiceLoading ? "Loading..." : "Preview"}
                </button>
                <button
                  onClick={async () => {
                    if (!invoicePreview || !invoiceMarkId) return;
                    setInvoiceSending(true);
                    try {
                      const res = await api.post("/buysellapi/invoices/send/", {
                        mark_id: invoiceMarkId,
                        container_id: containerDetails.id,
                      });
                      toast.success(
                        res.data?.sent ? "Invoice email sent" : "Invoice queued"
                      );
                    } catch (err) {
                      console.error("Invoice send error", err);
                      toast.error(
                        err.response?.data?.detail || "Failed to send invoice"
                      );
                    } finally {
                      setInvoiceSending(false);
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  disabled={
                    invoiceSending ||
                    !invoicePreview ||
                    (invoicePreview?.totals?.count || 0) === 0
                  }
                >
                  {invoiceSending ? "Sending..." : "Send Invoice"}
                </button>
              </div>

              {invoicePreview && (
                <div className="mt-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <span className="font-medium">Owner:</span>{" "}
                    {invoicePreview.owner?.full_name} (
                    {invoicePreview.owner?.email})
                  </div>
                  {invoicePreview.items?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-3 py-2 text-left">Tracking #</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-right">CBM</th>
                            <th className="px-3 py-2 text-right">Fee ($)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {invoicePreview.items.map((it) => (
                            <tr key={it.id}>
                              <td className="px-3 py-2">
                                {it.tracking_number}
                              </td>
                              <td className="px-3 py-2">{it.status}</td>
                              <td className="px-3 py-2 text-right">
                                {Number(it.cbm || 0).toFixed(3)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {Number(it.shipping_fee || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-semibold">
                            <td className="px-3 py-2 text-right" colSpan={2}>
                              Totals
                            </td>
                            <td className="px-3 py-2 text-right">
                              {Number(
                                invoicePreview.totals?.total_cbm || 0
                              ).toFixed(3)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {Number(
                                invoicePreview.totals?.total_fee || 0
                              ).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      No items found for this mark in this container.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Container Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Status
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {
                    statusOptions.find(
                      (opt) => opt.value === containerDetails.status
                    )?.label
                  }
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Packages
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {containerDetails.tracking_count}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Departure
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {containerDetails.departure_date
                    ? new Date(
                        containerDetails.departure_date
                      ).toLocaleDateString()
                    : "Not set"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Arrival
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {containerDetails.arrival_date
                    ? new Date(
                        containerDetails.arrival_date
                      ).toLocaleDateString()
                    : "Not set"}
                </div>
              </div>
            </div>

            {/* Mark ID Statistics */}
            {containerDetails.mark_id_stats &&
              containerDetails.mark_id_stats.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-3">
                    Statistics by Mark ID
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">
                            Mark ID
                          </th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">
                            Packages
                          </th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">
                            Total CBM
                          </th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">
                            Total Fee
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {containerDetails.mark_id_stats.map((stat, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-gray-900 dark:text-white font-medium">
                              {stat.shipping_mark}
                            </td>
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                              {stat.count}
                            </td>
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                              {stat.total_cbm.toFixed(3)}
                            </td>
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                              ${stat.total_fee.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Tracking List */}
            {containerDetails.trackings &&
              containerDetails.trackings.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-3">
                    All Tracking Numbers ({containerDetails.trackings.length})
                  </h4>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">
                            Tracking #
                          </th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">
                            Mark ID
                          </th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">
                            Status
                          </th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">
                            CBM
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {containerDetails.trackings.map((tracking) => (
                          <tr key={tracking.id}>
                            <td className="px-4 py-2 text-gray-900 dark:text-white">
                              {tracking.tracking_number}
                            </td>
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                              {tracking.shipping_mark || "-"}
                            </td>
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                              {tracking.status}
                            </td>
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                              {tracking.cbm || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setContainerToDelete(null);
        }}
        onConfirm={confirmDeleteContainer}
        title="Delete Container"
        message={`Are you sure you want to delete ${
          containerToDelete?.container_number
            ? `container ${containerToDelete.container_number}`
            : "this container"
        }? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default ContainerManagement;
