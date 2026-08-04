import React, { useState, useEffect, useCallback } from "react";
import { toast } from "../utils/toast";
import api from "../api";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaShip,
  FaEye,
  FaBoxes,
  FaPrint,
} from "react-icons/fa";
import ConfirmModal from "./shared/ConfirmModal";
import { formatCompactCount } from "../utils/formatCompactCount";
import { formatShippingMarkForDisplay, withFimPrefix } from "../utils/markIdFormat";
import { InvoiceItemTrackingLabel, InvoiceItemCbm } from "./InvoiceItemDisplay";
import { InvoicePreviewExecutiveDiscountRows } from "./InvoicePreviewExecutiveDiscount";

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
  const [invoiceGoodsType, setInvoiceGoodsType] = useState("normal");
  const [agentShippingRates, setAgentShippingRates] = useState(null);
  const [shippingRates, setShippingRates] = useState(null);
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
    bulk_delivery_outside_accra_date: "",
    bulk_delivery_outside_accra_completed: false,
    invoice_due_date: "",
    invoice_grace_days: "",
    display_cbm: "",
    notes: "",
  });

  const statusOptions = [
    { value: "preparing", label: "Preparing" },
    { value: "receiving_goods", label: "Receiving Goods" },
    { value: "loading", label: "Loading" },
    { value: "laden", label: "Laden" },
    { value: "in_transit", label: "In Transit" },
    { value: "clearing", label: "Clearing" },
    { value: "arrived_port", label: "Arrived at Port" },
    { value: "offloaded", label: "Offloaded" },
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
    fetchShippingRates();
    fetchAgentShippingRates();
  }, [fetchContainers]);

  const fetchShippingRates = async () => {
    try {
      const response = await api.get("/buysellapi/shipping-rates/");
      if (response?.data) {
        setShippingRates(response.data);
      }
    } catch (error) {
      console.error("Error fetching shipping rates:", error);
    }
  };

  const fetchAgentShippingRates = async () => {
    try {
      const response = await api.get("/buysellapi/agent/shipping-rates/");
      if (response?.data) {
        setAgentShippingRates(response.data);
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Error fetching agent shipping rates:", error);
      }
      setAgentShippingRates(null);
    }
  };

  // Calculate shipping fee based on total CBM using the same logic as shipping management
  // Split CBM into whole part and decimal part:
  // - Whole part uses standard rate
  // - Decimal part uses <1 CBM rate
  // Example: 1.9 CBM = (1 × standard_rate) + (0.9 × lt1_rate)
  const calculateShippingFee = (totalCbm, goodsType = "normal") => {
    // Determine which rates to use: agent rates or regular rates
    const isAgentRate = goodsType === "agent_normal" || goodsType === "agent_special";
    const rates = isAgentRate ? agentShippingRates : shippingRates;
    
    if (!rates || !totalCbm || totalCbm <= 0) return 0;
    
    const cbm = parseFloat(totalCbm);
    if (!isFinite(cbm) || cbm <= 0) return 0;

    // Get rates based on goods type
    // Options: "normal", "special", "agent_normal", "agent_special"
    const useSpecialRate = goodsType === "special" || goodsType === "agent_special";
    const standardRate = parseFloat(
      useSpecialRate
        ? rates.special_goods_rate
        : rates.normal_goods_rate
    );
    const lt1Rate = parseFloat(
      useSpecialRate
        ? rates.special_goods_rate_lt1 ?? rates.special_goods_rate
        : rates.normal_goods_rate_lt1 ?? rates.normal_goods_rate
    );

    if (!isFinite(standardRate) || standardRate <= 0) return 0;
    if (!isFinite(lt1Rate) || lt1Rate <= 0) return 0;

    // Determine if CBM is a whole number (e.g., 1, 2, 3) or has decimals (e.g., 1.5, 2.3)
    const isWholeNumber = Math.abs(cbm - Math.floor(cbm)) < 1e-6;

    if (isWholeNumber) {
      // For whole numbers (1, 2, 3, etc.), use: whole number × standard rate
      return cbm * standardRate;
    } else {
      // For numbers with decimals (e.g., 1.9, 2.3):
      // Split into whole part and decimal part
      const wholePart = Math.floor(cbm);
      const decimalPart = cbm - wholePart;

      // Whole part uses standard rate, decimal part uses <1 CBM rate
      const wholeFee = wholePart * standardRate;
      const decimalFee = decimalPart * lt1Rate;

      return wholeFee + decimalFee;
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const buildContainerPayload = () => ({
    ...formData,
    departure_date: formData.departure_date || null,
    arrival_date: formData.arrival_date || null,
    bulk_delivery_outside_accra_date:
      formData.bulk_delivery_outside_accra_date === "" ||
      formData.bulk_delivery_outside_accra_date == null
        ? null
        : formData.bulk_delivery_outside_accra_date,
    bulk_delivery_outside_accra_completed: Boolean(
      formData.bulk_delivery_outside_accra_completed
    ),
    invoice_due_date:
      formData.invoice_due_date === "" || formData.invoice_due_date == null
        ? null
        : formData.invoice_due_date,
    display_cbm:
      formData.display_cbm === "" || formData.display_cbm == null
        ? null
        : formData.display_cbm,
    invoice_grace_days:
      formData.invoice_grace_days === "" || formData.invoice_grace_days == null
        ? null
        : parseInt(formData.invoice_grace_days, 10),
  });

  const formatBackendError = (data) => {
    // Backend returns either a plain string under `error`, or a DRF
    // validation dict like { error: { status: ["\"laden\" is not a valid choice."] } }.
    // Flatten it to a readable single-line message so the toast is useful.
    if (!data) return null;
    const root = data.error ?? data.detail ?? data;
    if (typeof root === "string") return root;
    if (Array.isArray(root)) return root.join(" ");
    if (typeof root === "object") {
      const parts = [];
      for (const [field, val] of Object.entries(root)) {
        const text = Array.isArray(val) ? val.join(" ") : String(val);
        parts.push(`${field}: ${text}`);
      }
      return parts.join(" | ");
    }
    return String(root);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = buildContainerPayload();
      if (currentContainer) {
        // Update existing container
        await api.put(`/api/admin/containers/${currentContainer.id}`, payload);
        toast.success("Container updated successfully");
      } else {
        // Create new container
        await api.post("/api/admin/containers", payload);
        toast.success("Container created successfully");
      }

      setShowModal(false);
      resetForm();
      fetchContainers();
    } catch (error) {
      console.error("Error saving container:", error);
      const message =
        formatBackendError(error.response?.data) ||
        error.message ||
        "Failed to save container";
      toast.error(message);
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
      bulk_delivery_outside_accra_date:
        container.bulk_delivery_outside_accra_date || "",
      bulk_delivery_outside_accra_completed: Boolean(
        container.bulk_delivery_outside_accra_completed
      ),
      invoice_due_date: container.invoice_due_date || "",
      invoice_grace_days:
        container.invoice_grace_days != null && container.invoice_grace_days !== undefined
          ? String(container.invoice_grace_days)
          : "",
      display_cbm:
        container.display_cbm !== null && container.display_cbm !== undefined
          ? String(container.display_cbm)
          : "",
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
      bulk_delivery_outside_accra_date: "",
      bulk_delivery_outside_accra_completed: false,
      invoice_due_date: "",
      invoice_grace_days: "",
      display_cbm: "",
      notes: "",
    });
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      preparing:
        "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-sm",
      receiving_goods:
        "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm",
      loading:
        "bg-gradient-to-r from-blue-400 to-cyan-500 text-white shadow-sm",
      laden:
        "bg-gradient-to-r from-indigo-400 to-blue-500 text-white shadow-sm",
      in_transit:
        "bg-gradient-to-r from-purple-400 to-pink-500 text-white shadow-sm",
      clearing:
        "bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-sm",
      arrived_port:
        "bg-gradient-to-r from-cyan-400 to-teal-500 text-white shadow-sm",
      offloaded:
        "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-sm",
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
                          : "Dep: Not set"}
                      </div>
                      <div>
                        {container.arrival_date
                          ? `ETA: ${new Date(
                              container.arrival_date
                            ).toLocaleDateString()}`
                          : "ETA: Not set"}
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
            Page {currentPage} of{" "}
            <span title={String(totalPages)}>
              {formatCompactCount(totalPages)}
            </span>
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
                    Display CBM (next shipping)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    name="display_cbm"
                    value={formData.display_cbm}
                    onChange={handleInputChange}
                    placeholder="e.g., 12.500"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Auto-filled from China scanner received packages for this
                    container (same total as the warehouse Excel export). You can
                    still override it manually.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Departure date <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    name="departure_date"
                    value={formData.departure_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Leave blank to set later when you edit the container.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Arrival / ETA <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    name="arrival_date"
                    value={formData.arrival_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Leave blank if ETA is not known yet; users will see &quot;Not set&quot;.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bulk delivery (Outside Accra) date{" "}
                    <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    name="bulk_delivery_outside_accra_date"
                    value={formData.bulk_delivery_outside_accra_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Set the scheduled bulk delivery date for this container (outside Accra).
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    id="bulk_delivery_outside_accra_completed"
                    type="checkbox"
                    name="bulk_delivery_outside_accra_completed"
                    checked={!!formData.bulk_delivery_outside_accra_completed}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                  <label
                    htmlFor="bulk_delivery_outside_accra_completed"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Bulk delivery completed (hide announcement)
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-1">
                      Turn this on after bulk delivery is done for this container.
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Invoice due date <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    name="invoice_due_date"
                    value={formData.invoice_due_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Calendar date when shipping invoices for this container are due and when
                    daily storage fees start (day after this date). Required for storage
                    fees — leave blank if not set yet (invoice due date will be N/A).
                  </p>
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
                      setInvoiceMarkId(withFimPrefix(e.target.value))
                    }
                    onFocus={() => {
                      if (!invoiceMarkId) setInvoiceMarkId("FIM");
                    }}
                    placeholder="e.g., FIM123"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="min-w-[180px]">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Goods Type
                  </label>
                  <select
                    value={invoiceGoodsType}
                    onChange={(e) => setInvoiceGoodsType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="normal">Normal Goods</option>
                    <option value="special">Special Goods</option>
                    <option value="agent_normal">Agent Normal Rate</option>
                    <option value="agent_special">Agent Special Rate</option>
                  </select>
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
                            goods_type: invoiceGoodsType,
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
                      const res = await api.post("/buysellapi/invoices/", {
                        mark_id: invoiceMarkId,
                        container_id: containerDetails.id,
                        goods_type: invoiceGoodsType,
                      });
                      toast.success(
                        res.data?.invoice_number 
                          ? `Invoice ${res.data.invoice_number} created successfully`
                          : "Invoice created successfully"
                      );
                      // Clear preview after successful creation
                      setInvoicePreview(null);
                      setInvoiceMarkId("");
                    } catch (err) {
                      console.error("Invoice create error", err);
                      toast.error(
                        err.response?.data?.detail || 
                        err.response?.data?.error ||
                        "Failed to create invoice"
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
                  {invoiceSending ? "Creating..." : "Create Invoice"}
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
                            <th className="px-3 py-2 text-left text-gray-700 dark:text-white font-medium">Tracking #</th>
                            <th className="px-3 py-2 text-left text-gray-700 dark:text-white font-medium">Status</th>
                            <th className="px-3 py-2 text-right text-gray-700 dark:text-white font-medium">CBM</th>
                            <th className="px-3 py-2 text-right text-gray-700 dark:text-white font-medium">Fee ($)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {invoicePreview.items.map((it) => (
                            <tr key={it.id}>
                              <td className="px-3 py-2 text-gray-900 dark:text-white">
                                <InvoiceItemTrackingLabel item={it} compact />
                              </td>
                              <td className="px-3 py-2 text-gray-900 dark:text-white">{it.status}</td>
                              <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                                <InvoiceItemCbm item={it} className="block text-right" />
                              </td>
                              <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                                ${Math.ceil(Number(it.shipping_fee || 0))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-semibold">
                            <td className="px-3 py-2 text-right text-gray-900 dark:text-white" colSpan={2}>
                              Total CBM
                            </td>
                            <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                              {Number(
                                invoicePreview.totals?.total_cbm || 0
                              ).toFixed(3)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                              ${Math.ceil(Number(
                                invoicePreview.totals?.total_fee || 0
                              ))}
                            </td>
                          </tr>
                          <tr className="font-semibold bg-blue-50 dark:bg-blue-900/20">
                            <td className="px-3 py-2 text-right text-gray-900 dark:text-white" colSpan={2}>
                              Shipping Fee
                            </td>
                            <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                              {Number(
                                invoicePreview.totals?.total_cbm || 0
                              ).toFixed(3)} CBM
                            </td>
                            <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">
                              ${Math.ceil(Number(
                                invoicePreview.totals?.shipping_fee || 
                                calculateShippingFee(
                                  invoicePreview.totals?.total_cbm || 0,
                                  invoiceGoodsType
                                )
                              ))}
                            </td>
                          </tr>
                          {Number(
                            invoicePreview.totals?.storage_fee_ghs ||
                              invoicePreview.totals?.storage_fee ||
                              0
                          ) > 0 ? (
                            <tr className="font-semibold bg-amber-50 dark:bg-amber-900/20">
                              <td className="px-3 py-2 text-right text-gray-900 dark:text-white" colSpan={2}>
                                Storage (daily, GHS)
                                {invoicePreview.totals?.storage?.daily_rate_ghs != null ? (
                                  <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">
                                    GH₵{Number(invoicePreview.totals.storage.daily_rate_ghs).toFixed(2)}/day
                                    × {invoicePreview.totals.storage.days_charged || 1} day(s)
                                    {invoicePreview.totals.storage.tier_label
                                      ? ` · ${invoicePreview.totals.storage.tier_label}`
                                      : ""}
                                  </span>
                                ) : invoicePreview.totals?.storage?.tier_label ? (
                                  <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">
                                    {invoicePreview.totals.storage.tier_label}
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400 text-xs">
                                {invoicePreview.container?.arrival_date
                                  ? `Due ${invoicePreview.totals?.storage?.storage_due_date || ""}`
                                  : "Set arrival date"}
                              </td>
                              <td className="px-3 py-2 text-right text-amber-700 dark:text-amber-300">
                                GH₵
                                {Math.ceil(
                                  Number(
                                    invoicePreview.totals.storage_fee_ghs ||
                                      invoicePreview.totals.storage_fee
                                  )
                                )}
                              </td>
                            </tr>
                          ) : invoicePreview.totals?.storage?.reason === "not_yet_due" ? (
                            <tr className="text-sm text-gray-500 dark:text-gray-400">
                              <td colSpan={4} className="px-3 py-2">
                                No storage fee yet — due date{" "}
                                {invoicePreview.totals.storage.storage_due_date || "—"}
                              </td>
                            </tr>
                          ) : invoicePreview.totals?.storage?.reason === "no_due_reference" ? (
                            <tr className="text-sm text-amber-600 dark:text-amber-400">
                              <td colSpan={4} className="px-3 py-2">
                                Set container invoice due date to calculate storage fees
                              </td>
                            </tr>
                          ) : null}
                          <InvoicePreviewExecutiveDiscountRows
                            totals={invoicePreview.totals}
                          />
                          {(Number(invoicePreview.totals?.shipping_fee || 0) > 0 ||
                            Number(invoicePreview.totals?.total_amount_ghs || 0) > 0) && (
                            <>
                              <tr className="font-bold bg-gray-100 dark:bg-gray-700">
                                <td
                                  className="px-3 py-2 text-right text-gray-900 dark:text-white"
                                  colSpan={3}
                                >
                                  Freight total (USD)
                                </td>
                                <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                                  $
                                  {Number(
                                    invoicePreview.totals?.invoice_total_usd ||
                                      invoicePreview.totals?.invoice_total ||
                                      invoicePreview.totals?.shipping_fee ||
                                      0
                                  ).toFixed(2)}
                                </td>
                              </tr>
                              {Number(invoicePreview.totals?.total_amount_ghs || 0) > 0 && (
                                <tr className="font-bold bg-green-50 dark:bg-green-900/20">
                                  <td
                                    className="px-3 py-2 text-right text-gray-900 dark:text-white"
                                    colSpan={3}
                                  >
                                    Invoice total (GHS)
                                  </td>
                                  <td className="px-3 py-2 text-right text-green-700 dark:text-green-300">
                                    GH₵
                                    {Number(
                                      invoicePreview.totals.total_amount_ghs
                                    ).toFixed(2)}
                                  </td>
                                </tr>
                              )}
                            </>
                          )}
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
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Invoice due
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {containerDetails.invoice_due_date
                    ? new Date(containerDetails.invoice_due_date).toLocaleDateString()
                    : "N/A"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Bulk delivery (Outside Accra)
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {containerDetails.bulk_delivery_outside_accra_date
                    ? new Date(
                        containerDetails.bulk_delivery_outside_accra_date
                      ).toLocaleDateString()
                    : "Not set"}
                  {containerDetails.bulk_delivery_outside_accra_completed ? (
                    <span className="ml-2 text-xs font-semibold text-green-700 dark:text-green-300">
                      (completed)
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* CBM Summary Table */}
            {containerDetails.trackings && containerDetails.trackings.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <FaBoxes className="text-blue-600" />
                  Container CBM Summary
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <thead className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-700 dark:to-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold">
                          Total Packages
                        </th>
                        <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold">
                          Total CBM
                        </th>
                        <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold">
                          Total Shipping Fee
                        </th>
                        <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold">
                          Average CBM per Package
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-gray-200 dark:border-gray-700">
                        <td className="px-4 py-3 text-gray-900 dark:text-white font-bold text-lg">
                          {containerDetails.trackings.length}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white font-bold text-lg text-blue-600 dark:text-blue-400">
                          {containerDetails.trackings
                            .reduce((sum, t) => sum + (parseFloat(t.cbm) || 0), 0)
                            .toFixed(3)} m³
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white font-bold text-lg text-green-600 dark:text-green-400">
                          ${containerDetails.trackings
                            .reduce((sum, t) => sum + (parseFloat(t.shipping_fee) || 0), 0)
                            .toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {containerDetails.trackings.length > 0
                            ? (
                                containerDetails.trackings.reduce(
                                  (sum, t) => sum + (parseFloat(t.cbm) || 0),
                                  0
                                ) / containerDetails.trackings.length
                              ).toFixed(3)
                            : "0.000"}{" "}
                          m³
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mark ID Statistics */}
            {containerDetails.mark_id_stats &&
              containerDetails.mark_id_stats.length > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-gray-800 dark:text-white">
                      Statistics by Mark ID
                    </h4>
                    <button
                      onClick={() => {
                        const printWindow = window.open("", "_blank");
                        const totalPackages = containerDetails.mark_id_stats
                          .reduce((sum, stat) => sum + (stat.count || 0), 0);
                        const totalCbm = containerDetails.mark_id_stats
                          .reduce((sum, stat) => sum + (parseFloat(stat.total_cbm) || 0), 0)
                          .toFixed(3);
                        const totalFee = containerDetails.mark_id_stats
                          .reduce((sum, stat) => sum + (parseFloat(stat.total_fee) || 0), 0)
                          .toFixed(2);
                        
                        printWindow.document.write(`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <title>Container Statistics by Mark ID - ${containerDetails.container_number}</title>
                              <style>
                                body {
                                  font-family: Arial, sans-serif;
                                  padding: 20px;
                                  color: #333;
                                }
                                .header {
                                  text-align: center;
                                  margin-bottom: 30px;
                                  border-bottom: 2px solid #333;
                                  padding-bottom: 20px;
                                }
                                .header h1 {
                                  margin: 0;
                                  font-size: 24px;
                                  color: #1e40af;
                                }
                                .header p {
                                  margin: 5px 0;
                                  color: #666;
                                }
                                table {
                                  width: 100%;
                                  border-collapse: collapse;
                                  margin-top: 20px;
                                }
                                th {
                                  background-color: #f3f4f6;
                                  padding: 12px;
                                  text-align: left;
                                  border: 1px solid #ddd;
                                  font-weight: bold;
                                }
                                td {
                                  padding: 10px;
                                  border: 1px solid #ddd;
                                }
                                tr:nth-child(even) {
                                  background-color: #f9fafb;
                                }
                                .footer {
                                  margin-top: 20px;
                                  padding-top: 20px;
                                  border-top: 2px solid #333;
                                }
                                .footer-row {
                                  font-weight: bold;
                                  background-color: #e5e7eb;
                                }
                                @media print {
                                  body { margin: 0; padding: 15px; }
                                  .no-print { display: none; }
                                }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <h1>Container Statistics by Mark ID</h1>
                                <p><strong>Container Number:</strong> ${containerDetails.container_number}</p>
                                <p><strong>Status:</strong> ${
                                  statusOptions.find(
                                    (opt) => opt.value === containerDetails.status
                                  )?.label || containerDetails.status || "N/A"
                                }</p>
                                <p><strong>Date Printed:</strong> ${new Date().toLocaleString()}</p>
                              </div>
                              <table>
                                <thead>
                                  <tr>
                                    <th>Mark ID</th>
                                    <th>Full name</th>
                                    <th>Packages</th>
                                    <th>Total CBM</th>
                                    <th>Total Fee</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${containerDetails.mark_id_stats.map((stat) => `
                                    <tr>
                                      <td style="font-weight: bold;">${formatShippingMarkForDisplay(stat.shipping_mark) || "-"}</td>
                                      <td>${stat.full_name || stat.username || stat.client_username || "-"}</td>
                                      <td>${stat.count || 0}</td>
                                      <td>${parseFloat(stat.total_cbm || 0).toFixed(3)}</td>
                                      <td>$${parseFloat(stat.total_fee || 0).toFixed(2)}</td>
                                    </tr>
                                  `).join("")}
                                </tbody>
                                <tfoot>
                                  <tr class="footer-row">
                                    <td style="text-align: right; font-weight: bold;" colspan="2">Total:</td>
                                    <td style="font-weight: bold;">${totalPackages}</td>
                                    <td style="font-weight: bold;">${totalCbm} m³</td>
                                    <td style="font-weight: bold;">$${totalFee}</td>
                                  </tr>
                                </tfoot>
                              </table>
                              <div class="footer">
                                <p><strong>Total Mark IDs:</strong> ${containerDetails.mark_id_stats.length}</p>
                                <p><strong>Total Packages:</strong> ${totalPackages}</p>
                                <p><strong>Total CBM:</strong> ${totalCbm} m³</p>
                                <p><strong>Total Shipping Fee:</strong> $${totalFee}</p>
                              </div>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        setTimeout(() => {
                          printWindow.print();
                        }, 250);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      title="Print Statistics by Mark ID"
                    >
                      <FaPrint /> Print
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">
                            Mark ID
                          </th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">
                            Full name
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
                              {formatShippingMarkForDisplay(stat.shipping_mark) ||
                                "—"}
                            </td>
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                              {stat.full_name || stat.username || stat.client_username || "-"}
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
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-gray-800 dark:text-white">
                      All Tracking Numbers ({containerDetails.trackings.length})
                    </h4>
                    <button
                      onClick={() => {
                        const printWindow = window.open("", "_blank");
                        const totalCbm = containerDetails.trackings
                          .reduce((sum, t) => sum + (parseFloat(t.cbm) || 0), 0)
                          .toFixed(3);
                        const totalFee = containerDetails.trackings
                          .reduce((sum, t) => sum + (parseFloat(t.shipping_fee) || 0), 0)
                          .toFixed(2);
                        
                        printWindow.document.write(`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <title>Tracking Numbers - ${containerDetails.container_number}</title>
                              <style>
                                body {
                                  font-family: Arial, sans-serif;
                                  padding: 20px;
                                  color: #333;
                                }
                                .header {
                                  text-align: center;
                                  margin-bottom: 30px;
                                  border-bottom: 2px solid #333;
                                  padding-bottom: 20px;
                                }
                                .header h1 {
                                  margin: 0;
                                  font-size: 24px;
                                  color: #1e40af;
                                }
                                .header p {
                                  margin: 5px 0;
                                  color: #666;
                                }
                                table {
                                  width: 100%;
                                  border-collapse: collapse;
                                  margin-top: 20px;
                                }
                                th {
                                  background-color: #f3f4f6;
                                  padding: 12px;
                                  text-align: left;
                                  border: 1px solid #ddd;
                                  font-weight: bold;
                                }
                                td {
                                  padding: 10px;
                                  border: 1px solid #ddd;
                                }
                                tr:nth-child(even) {
                                  background-color: #f9fafb;
                                }
                                .footer {
                                  margin-top: 20px;
                                  padding-top: 20px;
                                  border-top: 2px solid #333;
                                }
                                .footer-row {
                                  font-weight: bold;
                                  background-color: #e5e7eb;
                                }
                                @media print {
                                  body { margin: 0; padding: 15px; }
                                  .no-print { display: none; }
                                }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <h1>Container Tracking Numbers</h1>
                                <p><strong>Container Number:</strong> ${containerDetails.container_number}</p>
                                <p><strong>Status:</strong> ${
                                  statusOptions.find(
                                    (opt) => opt.value === containerDetails.status
                                  )?.label || containerDetails.status
                                }</p>
                                <p><strong>Date Printed:</strong> ${new Date().toLocaleString()}</p>
                              </div>
                              <table>
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Tracking Number</th>
                                    <th>Mark ID</th>
                                    <th>Status</th>
                                    <th>CBM</th>
                                    <th>Shipping Fee</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${containerDetails.trackings.map((tracking, index) => `
                                    <tr>
                                      <td>${index + 1}</td>
                                      <td>${tracking.tracking_number}</td>
                                      <td>${formatShippingMarkForDisplay(tracking.shipping_mark) || "-"}</td>
                                      <td>${tracking.status}</td>
                                      <td>${tracking.cbm ? parseFloat(tracking.cbm).toFixed(3) : "-"}</td>
                                      <td>$${tracking.shipping_fee ? Math.ceil(parseFloat(tracking.shipping_fee)) : "0"}</td>
                                    </tr>
                                  `).join("")}
                                </tbody>
                                <tfoot>
                                  <tr class="footer-row">
                                    <td colspan="4" style="text-align: right; font-weight: bold;">Total:</td>
                                    <td style="font-weight: bold;">${totalCbm} m³</td>
                                    <td style="font-weight: bold;">$${totalFee}</td>
                                  </tr>
                                </tfoot>
                              </table>
                              <div class="footer">
                                <p><strong>Total Packages:</strong> ${containerDetails.trackings.length}</p>
                                <p><strong>Total CBM:</strong> ${totalCbm} m³</p>
                                <p><strong>Total Shipping Fee:</strong> $${totalFee}</p>
                              </div>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        setTimeout(() => {
                          printWindow.print();
                        }, 250);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      title="Print Tracking Numbers"
                    >
                      <FaPrint /> Print
                    </button>
                  </div>
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
                              {formatShippingMarkForDisplay(
                                tracking.shipping_mark
                              ) || "—"}
                            </td>
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                              {tracking.status}
                            </td>
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                              {tracking.cbm ? parseFloat(tracking.cbm).toFixed(3) : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-100 dark:bg-gray-700 font-semibold">
                        <tr>
                          <td className="px-4 py-3 text-gray-900 dark:text-white" colSpan="3">
                            <span className="text-gray-600 dark:text-gray-400">Total:</span>
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white text-blue-600 dark:text-blue-400">
                            {containerDetails.trackings
                              .reduce((sum, t) => sum + (parseFloat(t.cbm) || 0), 0)
                              .toFixed(3)} m³
                          </td>
                        </tr>
                      </tfoot>
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
