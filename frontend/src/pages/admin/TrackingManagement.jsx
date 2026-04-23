import React, { useState, useEffect, useRef } from "react";
import {
  FaSearch,
  FaSortAmountDown,
  FaSortAmountUp,
  FaTrash,
  FaDownload,
  FaPlus,
  FaEdit,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { toast } from "../../utils/toast";
import { apiErrorMessage } from "../../utils/apiErrorMessage";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import API from "../../api";
import ConfirmModal from "../../components/shared/ConfirmModal";
import { usePersistedPagination } from "../../hooks/usePersistedPagination";

// Status options aligned to backend Tracking model, UI stores labels in trackingSystem
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

const TrackingManagement = () => {
  const [trackings, setTrackings] = useState([]);
  const [filteredTrackings, setFilteredTrackings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("addedDate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterContainer, setFilterContainer] = useState("all");
  const [bulkStatus, setBulkStatus] = useState("pending");
  const [bulkEta, setBulkEta] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [selectedTrackings, setSelectedTrackings] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkAddForm, setShowBulkAddForm] = useState(false);
  const [bulkShippingMark, setBulkShippingMark] = useState("");
  const [bulkMarkSearchOptions, setBulkMarkSearchOptions] = useState([]);
  const [bulkMarkSearchLoading, setBulkMarkSearchLoading] = useState(false);
  const [bulkResolvedOwner, setBulkResolvedOwner] = useState(null);
  const [bulkNumbersText, setBulkNumbersText] = useState("");
  const [bulkCbmPerLineText, setBulkCbmPerLineText] = useState("");
  const [bulkTotalCbm, setBulkTotalCbm] = useState("");
  const [bulkContainerId, setBulkContainerId] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [editTracking, setEditTracking] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewTracking, setViewTracking] = useState(null);
  // Use persisted pagination to maintain page across refreshes
  const [currentPage, setCurrentPage] = usePersistedPagination('tracking-management-page', 1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      const saved = localStorage.getItem('tracking-management-page-size');
      return saved ? parseInt(saved, 10) : 10;
    } catch {
      return 10;
    }
  });
  const viewContentRef = useRef(null);

  const [newTracking, setNewTracking] = useState({
    trackingNumber: "",
    status: "pending",
    cbm: "",
    shippingFee: "",
    eta: "",
    container: "",
    shippingMark: "", // optional Mark ID selected by admin
  });

  // Mark ID search state
  const [markQuery, setMarkQuery] = useState("");
  const [markOptions, setMarkOptions] = useState([]);
  const [markLoading, setMarkLoading] = useState(false);
  const markDebounceRef = useRef(null);
  const bulkMarkDebounceRef = useRef(null);

  // Prefill mark when tracking exists (user added first)
  const [prefilledMark, setPrefilledMark] = useState("");
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeRates, setActiveRates] = useState(null);
  const [rateSelections, setRateSelections] = useState({}); // { [trackingId]: 'normal' | 'special' }

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // 'selected' or specific tracking id

  // Fetch trackings from backend on mount
  useEffect(() => {
    fetchTrackings();
    fetchContainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchContainers = async () => {
    try {
      const response = await API.get("/api/admin/containers", {
        params: { limit: 1000 }, // Get all containers
      });
      if (response.data && response.data.data) {
        setContainers(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching containers:", error);
      // Don't show error toast - containers are optional
    }
  };

  const fetchTrackings = async () => {
    // Always fetch fresh data from server
    try {
      setLoading(true);
      const response = await API.get("/buysellapi/trackings/", { 
        isAdmin: true
      });

      if (response.data && Array.isArray(response.data)) {
        // Filter out agent-created trackings except local agents (local should appear here)
        const nonAgentTrackings = response.data.filter(
          (t) => !t.created_by_agent || t.created_by_agent_type === "local"
        );
        
        // Transform backend data to frontend format
        const transformed = nonAgentTrackings.map((t) => ({
          id: t.id,
          TrackingNum: t.tracking_number,
          ShippingMark: t.shipping_mark || "",
          Status: formatStatusLabel(t.status),
          CBM:
            t.cbm_display != null && t.cbm_display !== ""
              ? String(t.cbm_display)
              : t.cbm != null && t.cbm !== ""
              ? String(t.cbm)
              : "",
          bulkGroupId: t.bulk_group_id || null,
          bulkTotalCbm: t.bulk_total_cbm,
          bulkTrackingNumbers: t.bulk_tracking_numbers || [],
          ShippingFee: t.shipping_fee || "",
          GoodsType: t.goods_type || "",
          ETA: t.eta || "",
          Container: t.container || "",
          container_id: t.container ?? null,
          ContainerNumber: t.container_number || "",
          AddedDate: t.date_added,
          LastUpdated: t.date_added,
        }));
        setTrackings(transformed);
      }
    } catch (error) {
      console.error("Error fetching trackings:", error);
      toast.error("Failed to load trackings from server");
      setTrackings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveRates = async (containerId) => {
    const cacheKey = containerId ?? "global";
    if (activeRates && !containerId) return activeRates;
    try {
      const params = containerId ? { container_id: containerId } : {};
      const resp = await API.get("/buysellapi/shipping-rates/", { params });
      if (resp?.data) {
        if (!containerId) setActiveRates(resp.data);
        return resp.data;
      }
    } catch (e) {
      if (e?.response?.status !== 404)
        console.error("fetchActiveRates error", e);
    }
    return null;
  };

  const calculateFeeUsingRates = (cbmVal, goodsType, rates) => {
    const cbm = parseFloat(cbmVal ?? 0);
    if (!rates || !isFinite(cbm) || cbm <= 0) return null;

    // Determine if CBM is a whole number (e.g., 1, 2, 3) or has decimals (e.g., 1.5, 2.3)
    const isWholeNumber = Math.abs(cbm - Math.floor(cbm)) < 1e-6;

    // Get rates based on goods type
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
    const goodsType = rateSelections[row.id] || row.GoodsType || "normal";
    // Use the tracking's container ID so we apply that container's rate (not global)
    const raw = row.container_id ?? row.container ?? row.Container;
    const containerId = raw != null && raw !== "" ? Number(raw) : null;
    const rates = await fetchActiveRates(containerId);
    if (!rates) {
      toast.error("No active shipping rates found. Set rates first.");
      return;
    }
    const cbmForRate =
      row.bulkGroupId != null && row.bulkTotalCbm != null
        ? parseFloat(row.bulkTotalCbm)
        : parseFloat(row.CBM);
    if (!cbmForRate || cbmForRate <= 0) {
      toast.error("CBM is required and must be greater than 0 to calculate.");
      return;
    }
    const fee = calculateFeeUsingRates(cbmForRate, goodsType, rates);
    if (fee === null) {
      toast.error(
        "Unable to calculate fee with current rates. Check settings."
      );
      return;
    }
    try {
      const payload = {
        shipping_fee: parseFloat(fee.toFixed(2)),
        goods_type: goodsType,
      };
      await API.patch(`/buysellapi/trackings/${row.id}/`, payload);
      toast.success("Shipping fee updated");
      // Update locally to avoid reloading the whole table
      setTrackings((prev) =>
        prev.map((t) =>
          t.id === row.id
            ? {
                ...t,
                ShippingFee: payload.shipping_fee,
                GoodsType: payload.goods_type,
              }
            : t
        )
      );
    } catch (e) {
      console.error("apply rate error", e);
      toast.error(
        e?.response?.data?.message || "Failed to update shipping fee"
      );
    }
  };

  // Helper to format status from backend value to display label
  const formatStatusLabel = (statusValue) => {
    const option = statusOptions.find((o) => o.value === statusValue);
    return option ? option.label : "Pending";
  };

  // Track previous filter values to detect actual changes
  const prevFiltersRef = useRef({ filterStatus, filterContainer, searchTerm });
  
  useEffect(() => {
    // Check if filters actually changed
    const filtersChanged = 
      prevFiltersRef.current.filterStatus !== filterStatus ||
      prevFiltersRef.current.filterContainer !== filterContainer ||
      prevFiltersRef.current.searchTerm !== searchTerm;
    
    // Only reset to page 1 if filters actually changed
    if (filtersChanged) {
      setCurrentPage(1);
      prevFiltersRef.current = { filterStatus, filterContainer, searchTerm };
    }
    
    let result = [...trackings];
    if (filterStatus !== "all") {
      result = result.filter(
        (item) => labelToValue(item.Status) === filterStatus
      );
    }
    if (filterContainer !== "all") {
      if (filterContainer === "none") {
        result = result.filter((item) => !item.Container);
      } else {
        result = result.filter(
          (item) =>
            item.Container && item.Container.toString() === filterContainer
        );
      }
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          (item.TrackingNum && item.TrackingNum.toLowerCase().includes(term)) ||
          (item.ShippingMark &&
            item.ShippingMark.toLowerCase().includes(term)) ||
          (item.ContainerNumber &&
            item.ContainerNumber.toLowerCase().includes(term)) ||
          (item.ETA && item.ETA.toLowerCase().includes(term))
      );
    }
    result.sort((a, b) => {
      let fieldA, fieldB;
      switch (sortField) {
        case "trackingNum":
          fieldA = a.TrackingNum || "";
          fieldB = b.TrackingNum || "";
          break;
        case "shippingMark":
          fieldA = a.ShippingMark || "";
          fieldB = b.ShippingMark || "";
          break;
        case "status":
          fieldA = a.Status || "";
          fieldB = b.Status || "";
          break;
        case "cbm":
          fieldA = parseFloat(a.CBM) || 0;
          fieldB = parseFloat(b.CBM) || 0;
          break;
        case "addedDate":
          fieldA = a.AddedDate ? new Date(a.AddedDate).getTime() : 0;
          fieldB = b.AddedDate ? new Date(b.AddedDate).getTime() : 0;
          break;
        default:
          fieldA = a.AddedDate ? new Date(a.AddedDate).getTime() : 0;
          fieldB = b.AddedDate ? new Date(b.AddedDate).getTime() : 0;
      }
      return sortDirection === "asc"
        ? fieldA > fieldB
          ? 1
          : -1
        : fieldA < fieldB
        ? 1
        : -1;
    });
    setFilteredTrackings(result);
  }, [
    trackings,
    searchTerm,
    sortField,
    sortDirection,
    filterStatus,
    filterContainer,
  ]);

  // Open User View page in new tab by shipping mark
  const handleShippingMarkClick = (shippingMark) => {
    if (!shippingMark) return;
    // Extract mark ID from "markId:name" format or use as-is
    const markId = shippingMark.split(":")[0];
    // Open in new tab
    window.open(`/admin/user/${markId}`, "_blank");
  };

  // No longer fetching from backend - trackings are stored locally

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
      setSelectedTrackings(filteredTrackings.map((item) => item.TrackingNum));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectTracking = (trackingNum) => {
    if (selectedTrackings.includes(trackingNum)) {
      setSelectedTrackings(
        selectedTrackings.filter((item) => item !== trackingNum)
      );
    } else {
      setSelectedTrackings([...selectedTrackings, trackingNum]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedTrackings.length === 0) return;
    setDeleteTarget("selected");
    setShowDeleteModal(true);
  };

  const handleBulkUpdateByContainer = async () => {
    if (!filterContainer || filterContainer === "all" || filterContainer === "none") {
      toast.error("Select a container to bulk update");
      return;
    }
    setBulkUpdating(true);
    try {
      const payload = { container_id: filterContainer };
      if (bulkStatus) payload.status = bulkStatus;
      if (bulkEta) payload.eta = bulkEta;

      const response = await API.post("/buysellapi/admin/trackings/bulk-update/", payload);
      const updatedCount = response?.data?.updated || 0;
      toast.success(`Updated ${updatedCount} tracking(s)`);
      await fetchTrackings();
    } catch (error) {
      console.error("Bulk update failed:", error);
      toast.error(
        apiErrorMessage(error?.response?.data, "Failed to bulk update tracking statuses")
      );
    } finally {
      setBulkUpdating(false);
    }
  };

  const runBulkMarkSearch = async (val) => {
    const q = (val || "").trim();
    if (!q) {
      setBulkMarkSearchOptions([]);
      return;
    }
    try {
      setBulkMarkSearchLoading(true);
      const resp = await API.get("/buysellapi/shipping-marks/", {
        params: { q, page_size: 10 },
      });
      const items = Array.isArray(resp.data?.results)
        ? resp.data.results
        : Array.isArray(resp.data)
        ? resp.data
        : [];
      setBulkMarkSearchOptions(items);
    } catch {
      setBulkMarkSearchOptions([]);
    } finally {
      setBulkMarkSearchLoading(false);
    }
  };

  const resolveBulkOwnerFromMark = async (markOrUsername) => {
    const q = (markOrUsername || "").trim();
    if (!q) {
      setBulkResolvedOwner(null);
      return null;
    }
    try {
      const resp = await API.get(
        `/buysellapi/users/by-mark/${encodeURIComponent(q)}/`
      );
      const ownerObj = {
        id: resp.data.id,
        username: resp.data.username,
        full_name: resp.data.full_name,
      };
      setBulkResolvedOwner(ownerObj);
      return ownerObj;
    } catch (e) {
      setBulkResolvedOwner(null);
      toast.error(
        e?.response?.data?.error ||
          e?.response?.data?.detail ||
          "Could not find user for that mark or username"
      );
      return null;
    }
  };

  const closeBulkAddModal = () => {
    if (bulkMarkDebounceRef.current) {
      clearTimeout(bulkMarkDebounceRef.current);
      bulkMarkDebounceRef.current = null;
    }
    setShowBulkAddForm(false);
  };

  const handleBulkCreateSubmit = async (e) => {
    e.preventDefault();
    let owner = bulkResolvedOwner;
    if (!owner?.id && bulkShippingMark.trim()) {
      owner = await resolveBulkOwnerFromMark(bulkShippingMark.trim());
      if (!owner?.id) return;
    }
    if (!owner?.id) {
      toast.error(
        "Search and select a Mark ID from the list (or enter mark / username and submit)"
      );
      return;
    }
    const numLines = bulkNumbersText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const cbmLines = bulkCbmPerLineText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const perLine = cbmLines.length > 0;
    if (perLine && cbmLines.length !== numLines.length) {
      toast.error(
        `CBM lines (${cbmLines.length}) must match tracking lines (${numLines.length}) one-to-one.`
      );
      return;
    }
    let tc = parseFloat(bulkTotalCbm);
    if (!perLine) {
      if (!bulkTotalCbm || !Number.isFinite(tc) || tc <= 0) {
        toast.error(
          "Enter a valid total CBM for the bulk, or fill per-line CBM below"
        );
        return;
      }
    } else if (bulkTotalCbm.trim()) {
      if (!Number.isFinite(tc) || tc <= 0) {
        toast.error("Optional total CBM must be valid if provided");
        return;
      }
    }
    if (!bulkNumbersText.trim()) {
      toast.error("Enter tracking numbers (one per line)");
      return;
    }
    setBulkSubmitting(true);
    try {
      const payload = {
        owner_id: owner.id,
        tracking_numbers_text: bulkNumbersText,
        container_id: bulkContainerId ? parseInt(bulkContainerId, 10) : null,
      };
      if (perLine) {
        payload.cbm_per_line_text = bulkCbmPerLineText;
        if (bulkTotalCbm.trim() && Number.isFinite(tc) && tc > 0) {
          payload.total_cbm = tc;
        }
      } else {
        payload.total_cbm = tc;
      }
      await API.post("/buysellapi/admin/trackings/bulk-create/", payload);
      toast.success("Bulk trackings created");
      closeBulkAddModal();
      await fetchTrackings();
    } catch (err) {
      const d = err?.response?.data;
      toast.error(apiErrorMessage(d, "Bulk create failed"));
    } finally {
      setBulkSubmitting(false);
    }
  };

  const confirmDeleteSelected = async () => {
    setLoading(true);

    try {
      // Find backend IDs for selected tracking numbers
      const trackingsToDelete = trackings.filter((t) =>
        selectedTrackings.includes(t.TrackingNum)
      );

      // Delete from backend
      const deletePromises = trackingsToDelete.map((tracking) =>
        API.delete(`/buysellapi/trackings/${tracking.id}/`)
      );

      await Promise.all(deletePromises);

      toast.success(
        `Deleted ${selectedTrackings.length} tracking numbers successfully`
      );

      // Update UI immediately without refresh
      const deletedTrackingNums = new Set(selectedTrackings);
      setTrackings((prevTrackings) => 
        prevTrackings.filter((t) => !deletedTrackingNums.has(t.TrackingNum))
      );
      setFilteredTrackings((prevFiltered) => 
        prevFiltered.filter((t) => !deletedTrackingNums.has(t.TrackingNum))
      );
      
      // Refresh data from server to ensure consistency
      await fetchTrackings();
      
      setSelectedTrackings([]);
    } catch (error) {
      console.error("Error deleting trackings:", error);
      toast.error(
        error?.response?.data?.message || "Failed to delete tracking(s)"
      );
    } finally {
      setLoading(false);
    }
    setSelectAll(false);
  };

  const confirmDeleteSingle = async () => {
    setLoading(true);

    try {
      await API.delete(`/buysellapi/trackings/${deleteTarget}/`);

      toast.success("Tracking record deleted successfully");

      // Update UI immediately without refresh
      setTrackings((prevTrackings) => 
        prevTrackings.filter((t) => t.id !== deleteTarget)
      );
      setFilteredTrackings((prevFiltered) => 
        prevFiltered.filter((t) => t.id !== deleteTarget)
      );
      
      // Refresh data from server to ensure consistency
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

  // Pagination helpers
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

  const handleAddTracking = async (e) => {
    e.preventDefault();
    if (!newTracking.trackingNumber || !newTracking.status) {
      toast.error("Please fill all required fields");
      return;
    }

    const trackingNum = (newTracking.trackingNumber || "").toUpperCase();

    setLoading(true);

    try {
      if (editTracking) {
        // Update existing tracking in backend
        const payload = {
          tracking_number: trackingNum,
          status: newTracking.status,
          cbm: newTracking.cbm ? parseFloat(newTracking.cbm) : null,
          shipping_fee: newTracking.shippingFee
            ? parseFloat(newTracking.shippingFee)
            : null,
          eta: newTracking.eta || null,
          shipping_mark: editTracking.ShippingMark || "",
          container: newTracking.container || null,
        };

        await API.put(`/buysellapi/trackings/${editTracking.id}/`, payload);

        toast.success(
          `Tracking number ${newTracking.trackingNumber} updated successfully`
        );

        // Refresh from backend
        await fetchTrackings();
      } else {
        // Check for duplicate tracking number in backend
        // Add or update (backend handles existing numbers as updates)
        const payload = {
          tracking_number: trackingNum,
          status: newTracking.status,
          cbm: newTracking.cbm ? parseFloat(newTracking.cbm) : null,
          shipping_fee: newTracking.shippingFee
            ? parseFloat(newTracking.shippingFee)
            : null,
          eta: newTracking.eta || null,
          shipping_mark: newTracking.shippingMark || "",
          container: newTracking.container || null,
        };

        await API.post("/buysellapi/trackings/", payload);

        toast.success(
          `Tracking number ${newTracking.trackingNumber} added successfully`
        );

        // Refresh from backend
        await fetchTrackings();
      }

      setNewTracking({
        trackingNumber: "",
        status: "pending",
        cbm: "",
        shippingFee: "",
        eta: "",
        container: "",
        shippingMark: "",
      });
      setPrefilledMark("");
      setMarkOptions([]);
      setEditTracking(null);
      setShowAddForm(false);
    } catch (error) {
      console.error("Error saving tracking:", error);
      toast.error(
        error?.response?.data?.message || "Failed to save tracking number"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditTracking = (tracking) => {
    setEditTracking(tracking);
    setNewTracking({
      trackingNumber: tracking.TrackingNum,
      status: labelToValue(tracking.Status),
      cbm: tracking.CBM || "",
      shippingFee: tracking.ShippingFee || "",
      eta: tracking.ETA || "",
      container: tracking.Container || "",
    });
    setShowAddForm(true);
  };

  const handleViewTracking = async (tracking) => {
    setViewTracking(tracking);
    setShowViewModal(true);
    // Fetch active rates to display in modal
    await fetchActiveRates();
  };

  // User info and status history are managed server-side; omitted here.

  const exportToCSV = () => {
    if (filteredTrackings.length === 0) return;
    const headers = [
      "Tracking Number",
      "Shipping Mark",
      "Status",
      "CBM",
      "Shipping Fee",
      "Added Date",
      "ETA",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredTrackings.map((item) =>
        [
          item.TrackingNum || "",
          `"${(item.ShippingMark || "").replace(/"/g, '""')}"`,
          item.Status || "",
          item.CBM || "",
          item.ShippingFee || "",
          item.AddedDate ? new Date(item.AddedDate).toLocaleDateString() : "",
          item.ETA || "",
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `tracking_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (statusLabel) => {
    const val = labelToValue(statusLabel);
    switch (val) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_transit":
        return "bg-blue-100 text-blue-800";
      case "arrived":
        return "bg-green-100 text-green-800";
      case "arrived_ghana":
        return "bg-teal-100 text-teal-800";
      case "cancelled":
        return "bg-gray-200 text-gray-700";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "not_received":
        return "bg-orange-100 text-orange-800";
      case "vessel":
        return "bg-indigo-100 text-indigo-800";
      case "clearing":
        return "bg-purple-100 text-purple-800";
      case "off_loading":
        return "bg-pink-100 text-pink-800";
      case "pick_up":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Tracking Management
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {loading
            ? "Loading..."
            : "Manage and monitor all tracking numbers in the system"}
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
              setEditTracking(null);
              setNewTracking({
                trackingNumber: "",
                status: "pending",
                cbm: "",
                shippingFee: "",
                eta: "",
              });
              setShowAddForm(true);
            }}
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors flex items-center gap-2"
          >
            <FaPlus /> Add Tracking
          </button>
          <button
            type="button"
            onClick={() => {
              if (bulkMarkDebounceRef.current) {
                clearTimeout(bulkMarkDebounceRef.current);
                bulkMarkDebounceRef.current = null;
              }
              setBulkShippingMark("");
              setBulkMarkSearchOptions([]);
              setBulkMarkSearchLoading(false);
              setBulkResolvedOwner(null);
              setBulkNumbersText("");
              setBulkCbmPerLineText("");
              setBulkTotalCbm("");
              setBulkContainerId("");
              setShowBulkAddForm(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <FaPlus /> Bulk tracking
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors flex items-center gap-2"
          >
            <FaDownload /> Export CSV
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedTrackings.length === 0}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              selectedTrackings.length > 0
                ? "bg-pink-600 text-white hover:bg-pink-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            } transition-colors`}
          >
            <FaTrash /> Delete Selected
          </button>
          <div className="flex items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={bulkEta}
              onChange={(e) => setBulkEta(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={handleBulkUpdateByContainer}
              disabled={bulkUpdating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {bulkUpdating ? "Updating..." : "Update Container Status/ETA"}
            </button>
          </div>
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
                    className="flex items-center text-gray-700 dark:text-white font-medium text-sm"
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
                    className="flex items-center text-gray-700 dark:text-white font-medium text-sm"
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
                    className="flex items-center text-gray-700 dark:text-white font-medium text-sm"
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
                    className="flex items-center text-gray-700 dark:text-white font-medium text-sm"
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
                <th className="py-3 px-4 text-left text-gray-700 dark:text-white font-medium">Shipping Fee</th>
                <th className="py-3 px-4 text-left">
                  <span className="text-gray-700 dark:text-white font-medium text-sm">
                    Container
                  </span>
                </th>
                <th className="py-3 px-4 text-left">
                  <button
                    onClick={() => handleSort("addedDate")}
                    className="flex items-center text-gray-700 dark:text-white font-medium text-sm"
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
                <th className="py-3 px-4 text-left text-gray-700 dark:text-white font-medium">ETA</th>
                <th className="py-3 px-4 text-left text-gray-700 dark:text-white font-medium">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pagedItems.length > 0 ? (
                pagedItems.map((tracking, index) => (
                  <tr
                    key={tracking.TrackingNum || index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedTrackings.includes(
                          tracking.TrackingNum
                        )}
                        onChange={() =>
                          handleSelectTracking(tracking.TrackingNum)
                        }
                        className="rounded"
                      />
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                      {tracking.TrackingNum}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {tracking.ShippingMark ? (
                        <button
                          onClick={() =>
                            handleShippingMarkClick(tracking.ShippingMark)
                          }
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline flex items-center gap-1"
                          title="Search user with this mark ID"
                        >
                          {tracking.ShippingMark}
                          <FaExternalLinkAlt className="text-xs" />
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {tracking.Status && (
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            tracking.Status
                          )}`}
                        >
                          {tracking.Status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">{tracking.CBM || "-"}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {tracking.ShippingFee
                        ? `$${parseFloat(tracking.ShippingFee).toFixed(2)}`
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {tracking.ContainerNumber ? (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                          {tracking.ContainerNumber}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {tracking.AddedDate
                        ? new Date(tracking.AddedDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {tracking.ETA
                        ? new Date(tracking.ETA).toLocaleDateString()
                        : "Not set"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <select
                          value={
                            rateSelections[tracking.id] ||
                            tracking.GoodsType ||
                            ""
                          }
                          onChange={(e) =>
                            setRateSelections((s) => ({
                              ...s,
                              [tracking.id]: e.target.value,
                            }))
                          }
                          className="px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="">Select Rate</option>
                          <option value="normal">Normal</option>
                          <option value="special">Special</option>
                        </select>
                        <button
                          onClick={() => handleApplyRate(tracking)}
                          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm px-2 py-1 border border-indigo-300 rounded"
                          title="Calculate and apply shipping fee"
                        >
                          Apply Rate
                        </button>
                        <button
                          onClick={() => handleViewTracking(tracking)}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                          title="View details"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => handleEditTracking(tracking)}
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
                ))
              ) : (
                <tr>
                  <td
                    colSpan="9"
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
          <select
            value={pageSize}
            onChange={(e) => {
              const newSize = parseInt(e.target.value, 10);
              setPageSize(newSize);
              // Save page size preference
              try {
                localStorage.setItem('tracking-management-page-size', newSize.toString());
              } catch (error) {
                console.error('Failed to save page size:', error);
              }
              // Reset to page 1 when page size changes
              setCurrentPage(1);
            }}
            className="ml-2 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {[10, 20, 50, 100].map((sz) => (
              <option key={sz} value={sz}>
                {sz}/page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredTrackings.length} of {trackings.length} tracking
        records
        {selectedTrackings.length > 0 &&
          ` (${selectedTrackings.length} selected)`}
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editTracking ? "Edit Tracking" : "Add New Tracking"}
              </h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <FaTimesCircle />
              </button>
            </div>

            <form onSubmit={handleAddTracking}>
              {/* Two-column grid layout for compact form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left column */}
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="trackingNumber"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Tracking Number*
                    </label>
                    <input
                      id="trackingNumber"
                      type="text"
                      value={newTracking.trackingNumber}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setNewTracking({
                          ...newTracking,
                          trackingNumber: val,
                        });
                        // Prefill shipping mark if tracking exists (user added first)
                        const tNum = (val || "").toUpperCase();
                        if (tNum.length >= 3) {
                          try {
                            const resp = await API.get(
                              `/buysellapi/trackings/by-number/${encodeURIComponent(
                                tNum
                              )}/`
                            );
                            const mark = resp.data?.shipping_mark || "";
                            if (mark) {
                              setNewTracking((prev) => ({
                                ...prev,
                                shippingMark: mark,
                              }));
                              setPrefilledMark(mark);
                            }
                          } catch {
                            setPrefilledMark("");
                          }
                        } else {
                          setPrefilledMark("");
                        }
                      }}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={editTracking !== null}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="status"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Status*
                    </label>
                    <select
                      id="status"
                      value={newTracking.status}
                      onChange={(e) =>
                        setNewTracking({
                          ...newTracking,
                          status: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="cbm"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      CBM (Cubic Meters)
                    </label>
                    <input
                      id="cbm"
                      type="number"
                      step="0.001"
                      min="0"
                      value={newTracking.cbm}
                      onChange={(e) =>
                        setNewTracking({
                          ...newTracking,
                          cbm: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="eta"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      ETA
                    </label>
                    <input
                      id="eta"
                      type="date"
                      value={newTracking.eta}
                      onChange={(e) =>
                        setNewTracking({
                          ...newTracking,
                          eta: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="shippingMark"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Mark ID{" "}
                      {prefilledMark && (
                        <span className="text-green-600">✓</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        id="shippingMark"
                        type="text"
                        placeholder="Search mark IDs..."
                        value={newTracking.shippingMark}
                        onChange={async (e) => {
                          const val = e.target.value.toUpperCase();
                          setNewTracking({
                            ...newTracking,
                            shippingMark: val,
                          });
                          try {
                            setMarkLoading(true);
                            const resp = await API.get(
                              "/buysellapi/shipping-marks/",
                              { params: { q: val, page_size: 10 } }
                            );
                            const items = Array.isArray(resp.data?.results)
                              ? resp.data.results
                              : Array.isArray(resp.data)
                              ? resp.data
                              : [];
                            setMarkOptions(items);
                          } catch {
                            setMarkOptions([]);
                          } finally {
                            setMarkLoading(false);
                          }
                        }}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {(markLoading ||
                        (markOptions && markOptions.length > 0)) && (
                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-auto">
                          {markLoading && (
                            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                              Searching...
                            </div>
                          )}
                          {!markLoading &&
                            markOptions.map((m) => (
                              <button
                                key={m._id || m.id || m.markId}
                                type="button"
                                onClick={() => {
                                  const markId = m.markId || m.mark_id || "";
                                  setNewTracking({
                                    ...newTracking,
                                    shippingMark: markId,
                                  });
                                  setMarkOptions([]);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                {(m.markId || m.mark_id) +
                                  (m.name ? `: ${m.name}` : "")}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    {prefilledMark && (
                      <p className="mt-1 text-xs text-green-600">
                        Auto-filled from user
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="shippingFee"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Shipping Fee
                    </label>
                    <input
                      id="shippingFee"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newTracking.shippingFee}
                      onChange={(e) =>
                        setNewTracking({
                          ...newTracking,
                          shippingFee: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="container"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Container
                    </label>
                    <select
                      id="container"
                      value={newTracking.container || ""}
                      onChange={(e) =>
                        setNewTracking({
                          ...newTracking,
                          container: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">None</option>
                      {containers.map((container) => (
                        <option key={container.id} value={container.id}>
                          {container.container_number}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors flex items-center gap-2"
                >
                  <FaCheckCircle /> {editTracking ? "Update" : "Add"} Tracking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Bulk tracking
              </h3>
              <button
                type="button"
                onClick={closeBulkAddModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <FaTimesCircle />
              </button>
            </div>
            <form onSubmit={handleBulkCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mark ID{" "}
                  {bulkResolvedOwner && (
                    <span className="text-green-600 dark:text-green-400">✓</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search mark IDs..."
                    value={bulkShippingMark}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setBulkShippingMark(val);
                      setBulkResolvedOwner(null);
                      if (bulkMarkDebounceRef.current) {
                        clearTimeout(bulkMarkDebounceRef.current);
                      }
                      bulkMarkDebounceRef.current = setTimeout(() => {
                        runBulkMarkSearch(val);
                      }, 300);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {(bulkMarkSearchLoading ||
                    (bulkMarkSearchOptions && bulkMarkSearchOptions.length > 0)) && (
                    <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-auto">
                      {bulkMarkSearchLoading && (
                        <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                          Searching...
                        </div>
                      )}
                      {!bulkMarkSearchLoading &&
                        bulkMarkSearchOptions.map((m) => (
                          <button
                            key={m._id || m.id || m.markId}
                            type="button"
                            onClick={async () => {
                              const markId = m.markId || m.mark_id || "";
                              setBulkShippingMark(markId);
                              setBulkMarkSearchOptions([]);
                              await resolveBulkOwnerFromMark(markId);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            {(m.markId || m.mark_id) +
                              (m.name ? `: ${m.name}` : "")}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                {bulkResolvedOwner && (
                  <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                    Owner: {bulkResolvedOwner.full_name} (@
                    {bulkResolvedOwner.username}) — id {bulkResolvedOwner.id}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tracking numbers (one per line)
                </label>
                <textarea
                  rows={6}
                  value={bulkNumbersText}
                  onChange={(e) => setBulkNumbersText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder={"TN001\nTN002\nTN003"}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CBM per line (optional)
                </label>
                <textarea
                  rows={6}
                  value={bulkCbmPerLineText}
                  onChange={(e) => setBulkCbmPerLineText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder={
                    "Same order as tracking numbers, one CBM per line.\nLeave empty to use a single total below."
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total CBM (whole bulk)
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Required if per-line CBM is empty. If per-line CBM is filled, leave
                  this blank (or enter the exact sum to double-check).
                </p>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={bulkTotalCbm}
                  onChange={(e) => setBulkTotalCbm(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Container (optional)
                </label>
                <select
                  value={bulkContainerId}
                  onChange={(e) => setBulkContainerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">None</option>
                  {containers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.container_number}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeBulkAddModal}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
                >
                  {bulkSubmitting ? "Creating…" : "Create bulk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && viewTracking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-full max-w-2xl my-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Tracking Details
              </h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewTracking(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <FaTimesCircle size={20} />
              </button>
            </div>

            <div className="space-y-4" ref={viewContentRef}>
              {/* Tracking Information Section */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                <h4 className="text-base font-semibold text-gray-800 dark:text-white mb-3">
                  Tracking Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Tracking Number
                    </label>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      {viewTracking.TrackingNum}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Shipping Mark
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {viewTracking.ShippingMark || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Status
                    </label>
                    <div className="mt-1">
                      <span
                        className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${getStatusColor(
                          viewTracking.Status
                        )}`}
                      >
                        {viewTracking.Status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      CBM (Cubic Meters)
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {viewTracking.CBM || "N/A"}
                      {viewTracking.bulkGroupId ? (
                        <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400">
                          (group shipment)
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {viewTracking.bulkGroupId &&
                    viewTracking.bulkTrackingNumbers?.length > 0 && (
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Bulk group — all tracking numbers
                        </label>
                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 break-all">
                          {viewTracking.bulkTrackingNumbers.join(", ")}
                        </p>
                      </div>
                    )}
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Shipping Fee
                    </label>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {viewTracking.ShippingFee
                        ? `$${parseFloat(viewTracking.ShippingFee).toFixed(2)}`
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Goods Type
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {viewTracking.GoodsType
                        ? viewTracking.GoodsType.charAt(0).toUpperCase() +
                          viewTracking.GoodsType.slice(1)
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      ETA (Estimated Arrival)
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {viewTracking.ETA
                        ? new Date(viewTracking.ETA).toLocaleDateString()
                        : "Not set"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Date Added
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {viewTracking.AddedDate
                        ? new Date(viewTracking.AddedDate).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Last Updated
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {viewTracking.LastUpdated
                        ? new Date(viewTracking.LastUpdated).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
                {viewTracking.Action && (
                  <div className="mt-3">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Action/Notes
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {viewTracking.Action}
                    </p>
                  </div>
                )}
              </div>

              {/* Shipping Rate Details Section */}
              {activeRates && (
                <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                  <h4 className="text-base font-semibold text-gray-800 dark:text-white mb-3">
                    Active Shipping Rates
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Normal Goods Rate
                      </p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        ${parseFloat(activeRates.normal_goods_rate).toFixed(2)}{" "}
                        <span className="text-sm font-normal">per CBM</span>
                      </p>
                      {activeRates.normal_goods_rate_lt1 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          CBM &lt; 1: $
                          {parseFloat(
                            activeRates.normal_goods_rate_lt1
                          ).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Special Goods Rate
                      </p>
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        ${parseFloat(activeRates.special_goods_rate).toFixed(2)}{" "}
                        <span className="text-sm font-normal">per CBM</span>
                      </p>
                      {activeRates.special_goods_rate_lt1 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          CBM &lt; 1: $
                          {parseFloat(
                            activeRates.special_goods_rate_lt1
                          ).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* User and status history details omitted; available via backend if needed */}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={async () => {
                  if (!viewContentRef.current) return;
                  try {
                    const canvas = await html2canvas(viewContentRef.current, {
                      backgroundColor: "#ffffff",
                      scale: 2,
                      useCORS: true,
                      logging: false,
                    });
                    const imgData = canvas.toDataURL("image/png");
                    const pdf = new jsPDF("p", "mm", "a4");
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    const imgWidth = pageWidth;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;

                    let heightLeft = imgHeight;
                    let position = 0;

                    pdf.addImage(
                      imgData,
                      "PNG",
                      0,
                      position,
                      imgWidth,
                      imgHeight
                    );
                    heightLeft -= pageHeight;

                    while (heightLeft > 0) {
                      position = heightLeft - imgHeight;
                      pdf.addPage();
                      pdf.addImage(
                        imgData,
                        "PNG",
                        0,
                        position,
                        imgWidth,
                        imgHeight
                      );
                      heightLeft -= pageHeight;
                    }

                    const fileName = `tracking_${
                      viewTracking?.TrackingNum || "details"
                    }.pdf`;
                    pdf.save(fileName);
                    toast.success("Exported PDF");
                  } catch (err) {
                    console.error("PDF export failed", err);
                    toast.error("Failed to export PDF");
                  }
                }}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm"
              >
                Export PDF
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewTracking(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm"
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
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Tracking Record"
        message={
          deleteTarget === "selected"
            ? `Are you sure you want to delete ${
                selectedTrackings.length
              } tracking record${
                selectedTrackings.length > 1 ? "s" : ""
              }? This action cannot be undone.`
            : "Are you sure you want to delete this tracking record? This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default TrackingManagement;
