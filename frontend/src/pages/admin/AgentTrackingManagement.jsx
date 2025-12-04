import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaSortAmountDown,
  FaSortAmountUp,
  FaDownload,
  FaExternalLinkAlt,
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

const normalize = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[_\s]+/g, "")
    .replace(/[()]/g, "");

const labelToValue = (label) =>
  statusOptions.find((o) => normalize(o.label) === normalize(label))?.value ||
  "pending";

const AgentTrackingManagement = () => {
  const [trackings, setTrackings] = useState([]);
  const [filteredTrackings, setFilteredTrackings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("addedDate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterContainer, setFilterContainer] = useState("all");
  const [selectedTrackings, setSelectedTrackings] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editTracking, setEditTracking] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewTracking, setViewTracking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [containers, setContainers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeRates, setActiveRates] = useState(null);
  const [rateSelections, setRateSelections] = useState({});

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
    fetchActiveRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterTrackings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackings, searchTerm, filterStatus, filterContainer, sortField, sortDirection]);

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

  const fetchActiveRates = async (forceRefresh = false) => {
    // If rates are already loaded and not forcing refresh, return cached rates
    if (activeRates && !forceRefresh) return activeRates;
    try {
      // Use agent-specific shipping rates endpoint from Agent Shipping Rates Management
      const resp = await API.get("/buysellapi/agent/shipping-rates/");
      if (resp?.data) {
        // Ensure we have the rate structure expected
        const rates = {
          normal_goods_rate: resp.data.normal_goods_rate || 0,
          special_goods_rate: resp.data.special_goods_rate || 0,
          normal_goods_rate_lt1: resp.data.normal_goods_rate_lt1 || 0,
          special_goods_rate_lt1: resp.data.special_goods_rate_lt1 || 0,
        };
        setActiveRates(rates);
        return rates;
      }
    } catch (e) {
      if (e?.response?.status !== 404) {
        console.error("Error fetching agent shipping rates:", e);
      }
    }
    return null;
  };

  const fetchTrackings = async () => {
    setLoading(true);
    try {
      const response = await API.get("/buysellapi/trackings/");
      const allTrackings = Array.isArray(response.data) ? response.data : [];
      
      // Filter for agent-created trackings
      const agentTrackings = allTrackings.filter(t => {
        if (t.created_by_agent) {
          if (typeof t.created_by_agent === 'number') {
            return true;
          }
          if (typeof t.created_by_agent === 'object' && t.created_by_agent.id) {
            return true;
          }
        }
        return false;
      });
      
      setTrackings(agentTrackings);
      
      if (agentTrackings.length === 0) {
        toast.info("No agent trackings found. Trackings created by agents will appear here.");
      }
    } catch (error) {
      console.error("Error fetching agent trackings:", error);
      toast.error("Failed to fetch agent trackings. Please check the console for details.");
      setTrackings([]);
    } finally {
      setLoading(false);
    }
  };

  const formatStatusLabel = (statusValue) => {
    const option = statusOptions.find((o) => o.value === statusValue);
    return option ? option.label : "Pending";
  };

  const filterTrackings = () => {
    setCurrentPage(1);
    let result = [...trackings];
    
    if (filterStatus !== "all") {
      result = result.filter((t) => t.status === filterStatus);
    }
    
    if (filterContainer !== "all") {
      if (filterContainer === "none") {
        result = result.filter((t) => {
          const containerId = typeof t.container === 'object' ? t.container?.id : t.container;
          return !containerId;
        });
      } else {
        result = result.filter((t) => {
          const containerId = typeof t.container === 'object' ? t.container?.id : t.container;
          return containerId && containerId.toString() === filterContainer;
        });
      }
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((t) => {
        const containerNumber = typeof t.container === 'object' 
          ? t.container?.container_number 
          : containers.find(c => c.id === t.container)?.container_number || t.container_number;
        return (
          (t.tracking_number && t.tracking_number.toLowerCase().includes(term)) ||
          (t.shipping_mark && t.shipping_mark.toLowerCase().includes(term)) ||
          (containerNumber && containerNumber.toLowerCase().includes(term)) ||
          (t.eta && t.eta.toLowerCase().includes(term))
        );
      });
    }
    
    // Sort
    result.sort((a, b) => {
      let fieldA, fieldB;
      switch (sortField) {
        case "trackingNum":
          fieldA = a.tracking_number || "";
          fieldB = b.tracking_number || "";
          break;
        case "shippingMark":
          fieldA = a.shipping_mark || "";
          fieldB = b.shipping_mark || "";
          break;
        case "status":
          fieldA = a.status || "";
          fieldB = b.status || "";
          break;
        case "cbm":
          fieldA = parseFloat(a.cbm) || 0;
          fieldB = parseFloat(b.cbm) || 0;
          break;
        case "addedDate":
          fieldA = a.date_added ? new Date(a.date_added).getTime() : 0;
          fieldB = b.date_added ? new Date(b.date_added).getTime() : 0;
          break;
        default:
          fieldA = a.date_added ? new Date(a.date_added).getTime() : 0;
          fieldB = b.date_added ? new Date(b.date_added).getTime() : 0;
      }
      
      if (typeof fieldA === 'string') {
        return sortDirection === "asc"
          ? fieldA.localeCompare(fieldB)
          : fieldB.localeCompare(fieldA);
      }
      return sortDirection === "asc" ? fieldA - fieldB : fieldB - fieldA;
    });
    
    setFilteredTrackings(result);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTrackings([]);
    } else {
      setSelectedTrackings(pagedItems.map((item) => item.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectTracking = (trackingId) => {
    if (selectedTrackings.includes(trackingId)) {
      setSelectedTrackings(
        selectedTrackings.filter((item) => item !== trackingId)
      );
    } else {
      setSelectedTrackings([...selectedTrackings, trackingId]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedTrackings.length === 0) return;
    setDeleteTarget("selected");
    setShowDeleteModal(true);
  };

  const calculateFeeUsingRates = (cbmVal, goodsType, rates) => {
    const cbm = parseFloat(cbmVal ?? 0);
    if (!rates || !isFinite(cbm) || cbm <= 0) return null;

    // Determine if CBM is a whole number (e.g., 1, 2, 3) or has decimals (e.g., 1.5, 2.3)
    const isWholeNumber = Math.abs(cbm - Math.floor(cbm)) < 1e-6;

    // Get rates based on goods type - using agent rates
    const standardRate = parseFloat(
      goodsType === "special"
        ? rates.special_goods_rate
        : rates.normal_goods_rate
    );
    const lt1Rate = parseFloat(
      goodsType === "special"
        ? rates.special_goods_rate_lt1 ?? rates.special_goods_rate
        : rates.normal_goods_rate_lt1 ?? rates.normal_goods_rate
    );

    if (!isFinite(standardRate) || standardRate <= 0) return null;
    if (!isFinite(lt1Rate) || lt1Rate <= 0) return null;

    if (isWholeNumber) {
      // For whole numbers (1, 2, 3, etc.), use: whole number × standard rate
      return cbm * standardRate;
    } else {
      // For numbers with decimals (e.g., 1.5, 2.3):
      // Split into whole part and decimal part
      const wholePart = Math.floor(cbm);
      const decimalPart = cbm - wholePart;

      // Whole part uses standard rate, decimal part uses <1 CBM rate
      const wholeFee = wholePart * standardRate;
      const decimalFee = decimalPart * lt1Rate;

      return wholeFee + decimalFee;
    }
  };

  const handleApplyRate = async (row) => {
    const goodsType = rateSelections[row.id] || row.goods_type || "normal";
    // Always fetch fresh rates from Agent Shipping Rates Management
    const rates = await fetchActiveRates(true);
    if (!rates) {
      toast.error("No active agent shipping rates found. Please set rates in Agent Shipping Rates Management first.");
      return;
    }
    
    // Validate that the required rate exists
    const rateKey = goodsType === "special" ? "special_goods_rate" : "normal_goods_rate";
    if (!rates[rateKey] || parseFloat(rates[rateKey]) <= 0) {
      toast.error(`Agent ${goodsType === "special" ? "Special" : "Normal"} Rate is not set. Please configure it in Agent Shipping Rates Management.`);
      return;
    }
    
    if (!row.cbm || parseFloat(row.cbm) <= 0) {
      toast.error("CBM is required and must be greater than 0 to calculate.");
      return;
    }
    
    const fee = calculateFeeUsingRates(row.cbm, goodsType, rates);
    if (fee === null) {
      toast.error(
        "Unable to calculate fee with current agent rates. Please check Agent Shipping Rates Management settings."
      );
      return;
    }
    try {
      const payload = {
        shipping_fee: parseFloat(fee.toFixed(2)),
        goods_type: goodsType, // "normal" or "special" - both use agent rates from Agent Shipping Rates Management
      };
      await API.patch(`/buysellapi/trackings/${row.id}/`, payload);
      const rateTypeLabel = goodsType === "special" ? "Agent Special Rate" : "Agent Normal Rate";
      toast.success(`Shipping fee updated using ${rateTypeLabel} from Agent Shipping Rates Management`);
      await fetchTrackings();
    } catch (e) {
      console.error("apply rate error", e);
      toast.error(
        e?.response?.data?.message || "Failed to update shipping fee"
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const trackingData = {
        tracking_number: newTracking.tracking_number,
        status: newTracking.status,
        cbm: newTracking.cbm ? parseFloat(newTracking.cbm) : null,
        shipping_fee: newTracking.shipping_fee ? parseFloat(newTracking.shipping_fee) : null,
        eta: newTracking.eta || null,
        container: newTracking.container_id && newTracking.container_id.trim() !== "" 
          ? parseInt(newTracking.container_id) 
          : null,
        shipping_mark: newTracking.shipping_mark || "",
      };

      if (editTracking) {
        await API.patch(
          `/buysellapi/trackings/${editTracking.id}/`,
          trackingData
        );
        toast.success("Tracking updated successfully");
      } else {
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

  const confirmDeleteSelected = async () => {
    setLoading(true);
    try {
      const trackingsToDelete = trackings.filter((t) =>
        selectedTrackings.includes(t.id)
      );

      const deletePromises = trackingsToDelete.map((tracking) =>
        API.delete(`/buysellapi/trackings/${tracking.id}/`)
      );

      await Promise.all(deletePromises);

      toast.success(
        `Deleted ${selectedTrackings.length} tracking numbers successfully`
      );

      setTrackings((prevTrackings) => 
        prevTrackings.filter((t) => !selectedTrackings.includes(t.id))
      );
      
      await fetchTrackings();
      setSelectedTrackings([]);
      setSelectAll(false);
    } catch (error) {
      console.error("Error deleting trackings:", error);
      toast.error(
        error?.response?.data?.message || "Failed to delete tracking(s)"
      );
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const confirmDeleteSingle = async () => {
    setLoading(true);
    try {
      await API.delete(`/buysellapi/trackings/${deleteTarget}/`);
      toast.success("Tracking record deleted successfully");
      await fetchTrackings();
    } catch (error) {
      console.error("Error deleting tracking:", error);
      toast.error(
        error?.response?.data?.message || "Failed to delete tracking"
      );
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTarget === "selected") {
      confirmDeleteSelected();
    } else {
      confirmDeleteSingle();
    }
  };

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTrackings.length / pageSize)
  );
  const pagedItems = filteredTrackings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const goToPage = (p) => {
    const page = Math.min(Math.max(1, p), totalPages);
    setCurrentPage(page);
  };

  const exportToCSV = () => {
    if (filteredTrackings.length === 0) return;
    const headers = [
      "Tracking Number",
      "Shipping Mark",
      "Status",
      "CBM",
      "Shipping Fee",
      "Container",
      "Added Date",
      "ETA",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredTrackings.map((item) => {
        const containerNumber = typeof item.container === 'object' 
          ? item.container?.container_number 
          : containers.find(c => c.id === item.container)?.container_number || item.container_number || "";
        return [
          item.tracking_number || "",
          `"${(item.shipping_mark || "").replace(/"/g, '""')}"`,
          formatStatusLabel(item.status) || "",
          item.cbm || "",
          item.shipping_fee || "",
          containerNumber,
          item.date_added ? new Date(item.date_added).toLocaleDateString() : "",
          item.eta || "",
        ].join(",");
      }),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `agent_tracking_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (statusValue) => {
    const val = statusValue?.toLowerCase() || "";
    switch (val) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "in_transit":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "arrived":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "arrived_ghana":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
      case "cancelled":
        return "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "not_received":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "vessel":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      case "clearing":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "off_loading":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      case "pick_up":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
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
    
    let containerId = "";
    if (tracking.container) {
      if (typeof tracking.container === 'number') {
        containerId = tracking.container.toString();
      } else if (typeof tracking.container === 'object' && tracking.container.id) {
        containerId = tracking.container.id.toString();
      }
    }
    
    setNewTracking({
      tracking_number: tracking.tracking_number || "",
      status: tracking.status || "pending",
      cbm: tracking.cbm || "",
      shipping_fee: tracking.shipping_fee || "",
      eta: tracking.eta ? new Date(tracking.eta).toISOString().split('T')[0] : "",
      container_id: containerId,
      shipping_mark: tracking.shipping_mark || "",
    });
    setShowAddForm(true);
  };

  const handleView = (tracking) => {
    setViewTracking(tracking);
    setShowViewModal(true);
  };

  const handleShippingMarkClick = (mark) => {
    // Navigate to user search or open user management with this mark
    window.open(`/admin?section=users&search=${encodeURIComponent(mark)}`, '_blank');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Agent Tracking Numbers
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {loading
            ? "Loading..."
            : "Manage and monitor all tracking numbers created by agents"}
        </p>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
          {/* Search */}
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by tracking number, shipping mark, container, or ETA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter dropdown */}
          <div className="w-full md:w-56">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Container Filter dropdown */}
          <div className="w-full md:w-56">
            <select
              value={filterContainer}
              onChange={(e) => setFilterContainer(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Containers</option>
              <option value="none">No Container</option>
              {containers.map((container) => (
                <option key={container.id} value={container.id}>
                  {container.container_number}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              resetForm();
              setEditTracking(null);
              setShowAddForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FaPlus /> Add Tracking
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <FaDownload /> Export CSV
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedTrackings.length === 0}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              selectedTrackings.length > 0
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            } transition-colors`}
          >
            <FaTrash /> Delete Selected
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="py-3 px-4 text-left">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="mr-2 rounded"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Select All
                    </span>
                  </div>
                </th>
                <th className="py-3 px-4 text-left">
                  <button
                    onClick={() => handleSort("trackingNum")}
                    className="flex items-center text-gray-700 dark:text-gray-300 font-medium text-sm"
                  >
                    Tracking Number
                    {sortField === "trackingNum" &&
                      (sortDirection === "asc" ? (
                        <FaSortAmountUp className="ml-1" />
                      ) : (
                        <FaSortAmountDown className="ml-1" />
                      ))}
                  </button>
                </th>
                <th className="py-3 px-4 text-left">
                  <button
                    onClick={() => handleSort("shippingMark")}
                    className="flex items-center text-gray-700 dark:text-gray-300 font-medium text-sm"
                  >
                    Shipping Mark
                    {sortField === "shippingMark" &&
                      (sortDirection === "asc" ? (
                        <FaSortAmountUp className="ml-1" />
                      ) : (
                        <FaSortAmountDown className="ml-1" />
                      ))}
                  </button>
                </th>
                <th className="py-3 px-4 text-left">
                  <button
                    onClick={() => handleSort("status")}
                    className="flex items-center text-gray-700 dark:text-gray-300 font-medium text-sm"
                  >
                    Status
                    {sortField === "status" &&
                      (sortDirection === "asc" ? (
                        <FaSortAmountUp className="ml-1" />
                      ) : (
                        <FaSortAmountDown className="ml-1" />
                      ))}
                  </button>
                </th>
                <th className="py-3 px-4 text-left">
                  <button
                    onClick={() => handleSort("cbm")}
                    className="flex items-center text-gray-700 dark:text-gray-300 font-medium text-sm"
                  >
                    CBM
                    {sortField === "cbm" &&
                      (sortDirection === "asc" ? (
                        <FaSortAmountUp className="ml-1" />
                      ) : (
                        <FaSortAmountDown className="ml-1" />
                      ))}
                  </button>
                </th>
                <th className="py-3 px-4 text-left">Shipping Fee</th>
                <th className="py-3 px-4 text-left">
                  <span className="text-gray-700 dark:text-gray-300 font-medium text-sm">
                    Container
                  </span>
                </th>
                <th className="py-3 px-4 text-left">
                  <button
                    onClick={() => handleSort("addedDate")}
                    className="flex items-center text-gray-700 dark:text-gray-300 font-medium text-sm"
                  >
                    Added Date
                    {sortField === "addedDate" &&
                      (sortDirection === "asc" ? (
                        <FaSortAmountUp className="ml-1" />
                      ) : (
                        <FaSortAmountDown className="ml-1" />
                      ))}
                  </button>
                </th>
                <th className="py-3 px-4 text-left">ETA</th>
                <th className="py-3 px-4 text-left">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pagedItems.length > 0 ? (
                pagedItems.map((tracking) => {
                  const containerNumber = typeof tracking.container === 'object' 
                    ? tracking.container?.container_number 
                    : containers.find(c => c.id === tracking.container)?.container_number || tracking.container_number || "";
                  
                  return (
                    <tr
                      key={tracking.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedTrackings.includes(tracking.id)}
                          onChange={() => handleSelectTracking(tracking.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                        {tracking.tracking_number}
                      </td>
                      <td className="py-3 px-4">
                        {tracking.shipping_mark ? (
                          <button
                            onClick={() =>
                              handleShippingMarkClick(tracking.shipping_mark)
                            }
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline flex items-center gap-1"
                            title="Search user with this mark ID"
                          >
                            {tracking.shipping_mark}
                            <FaExternalLinkAlt className="text-xs" />
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {tracking.status && (
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              tracking.status
                            )}`}
                          >
                            {formatStatusLabel(tracking.status)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {tracking.cbm || "-"}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {tracking.shipping_fee
                          ? `$${parseFloat(tracking.shipping_fee).toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="py-3 px-4">
                        {containerNumber ? (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            {containerNumber}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {tracking.date_added
                          ? new Date(tracking.date_added).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {tracking.eta
                          ? new Date(tracking.eta).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <select
                            value={
                              rateSelections[tracking.id] ||
                              tracking.goods_type ||
                              ""
                            }
                            onChange={(e) =>
                              setRateSelections((s) => ({
                                ...s,
                                [tracking.id]: e.target.value,
                              }))
                            }
                            className="px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                          >
                            <option value="">Select Rate</option>
                            <option value="normal">Agent Normal Rate</option>
                            <option value="special">Agent Special Rate</option>
                          </select>
                          <button
                            onClick={() => handleApplyRate(tracking)}
                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm px-2 py-1 border border-indigo-300 rounded"
                            title="Calculate and apply shipping fee"
                          >
                            Apply Rate
                          </button>
                          <button
                            onClick={() => handleView(tracking)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            title="View details"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleEdit(tracking)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit tracking"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteTarget(tracking.id);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete tracking"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="10"
                    className="py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    No tracking records found.{" "}
                    {searchTerm && "Try a different search term or filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Page {currentPage} of {totalPages} • Showing {pagedItems.length} of{" "}
          {filteredTrackings.length}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className={`px-3 py-1 rounded border ${
              currentPage <= 1
                ? "text-gray-400 border-gray-300 cursor-not-allowed"
                : "text-gray-700 border-gray-400 hover:bg-gray-100"
            } dark:text-gray-200 dark:border-gray-600`}
          >
            Prev
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {currentPage}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={`px-3 py-1 rounded border ${
              currentPage >= totalPages
                ? "text-gray-400 border-gray-300 cursor-not-allowed"
                : "text-gray-700 border-gray-400 hover:bg-gray-100"
            } dark:text-gray-200 dark:border-gray-600`}
          >
            Next
          </button>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                      setNewTracking({ ...newTracking, tracking_number: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
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
              <p><strong>Status:</strong> {formatStatusLabel(viewTracking.status)}</p>
              <p><strong>CBM:</strong> {viewTracking.cbm || "-"}</p>
              <p><strong>Shipping Fee:</strong> {viewTracking.shipping_fee ? `$${viewTracking.shipping_fee}` : "-"}</p>
              <p><strong>Container:</strong> {(() => {
                if (viewTracking.container) {
                  if (typeof viewTracking.container === 'object') {
                    return viewTracking.container.container_number || "-";
                  }
                  const container = containers.find(c => c.id === viewTracking.container);
                  return container?.container_number || "-";
                }
                return viewTracking.container_number || "-";
              })()}</p>
              <p><strong>ETA:</strong> {viewTracking.eta ? new Date(viewTracking.eta).toLocaleDateString() : "-"}</p>
              <p><strong>Date Added:</strong> {viewTracking.date_added ? new Date(viewTracking.date_added).toLocaleDateString() : "-"}</p>
            </div>
            <button
              onClick={() => setShowViewModal(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
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
        onConfirm={handleConfirmDelete}
        title="Delete Tracking"
        message={
          deleteTarget === "selected"
            ? `Are you sure you want to delete ${selectedTrackings.length} selected tracking number(s)? This action cannot be undone.`
            : "Are you sure you want to delete this tracking number? This action cannot be undone."
        }
      />
    </div>
  );
};

export default AgentTrackingManagement;
