import React, { useEffect, useMemo, useState, useRef } from "react";
import API, { Api } from "../../api";
import { toast } from "../../utils/toast";
import { FaTrash, FaTimes, FaExternalLinkAlt, FaPlus, FaEdit, FaSpinner, FaDownload } from "react-icons/fa";
import { InvoiceItemTrackingLabel, InvoiceItemCbm } from "../../components/InvoiceItemDisplay";
import { getInvoiceGhsBreakdown, getInvoiceTotalCbm } from "../../utils/invoiceGhsBreakdown";
import { formatCompactCount } from "../../utils/formatCompactCount";

const statusOptions = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partially Paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

const orderOptions = [
  { value: "-created_at", label: "Newest" },
  { value: "created_at", label: "Oldest" },
  { value: "-due_date", label: "Due date (desc)" },
  { value: "due_date", label: "Due date (asc)" },
  { value: "-total_amount", label: "Amount (desc)" },
  { value: "total_amount", label: "Amount (asc)" },
];

/** Default issue date = today; due date comes from container invoice due date (or N/A). */
function invoiceDefaultDates() {
  const issue = new Date();
  const fmt = (d) => d.toISOString().split("T")[0];
  return { issue_date: fmt(issue), due_date: "" };
}

const emptyCreateLineItem = () => ({
  _key: `${Date.now()}-${Math.random()}`,
  mode: "manual",
  tracking_id: "",
  description: "",
  tracking_number: "",
  cbm: "",
  rate_per_cbm: "",
  total_amount: "",
});

export default function InvoicesManagement() {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [resending, setResending] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [savingStorageWaived, setSavingStorageWaived] = useState(false);
  const [savingVehicleDuty, setSavingVehicleDuty] = useState(false);
  const [dutyInputGhs, setDutyInputGhs] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    amount_usd: "",
    payment_method: "",
    payment_reference: "",
    notes: "",
  });
  const [showRateModal, setShowRateModal] = useState(false);
  const [currentRate, setCurrentRate] = useState(null);
  const [newRate, setNewRate] = useState("");
  const [rateNotes, setRateNotes] = useState("");
  const [updatingRate, setUpdatingRate] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    shipping_mark: "",
    container_id: "",
    total_cbm: 0,
    customer_name: "",
    customer_email: "",
    total_amount: 0,
    status: "pending",
    issue_date: "",
    due_date: "",
    payment_method: "",
    payment_reference: "",
    notes: "",
  });
  const [creating, setCreating] = useState(false);
  const [createLineItems, setCreateLineItems] = useState([]);
  const [createAvailableTrackings, setCreateAvailableTrackings] = useState([]);
  const [loadingCreateTrackings, setLoadingCreateTrackings] = useState(false);
  const [containers, setContainers] = useState([]);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [loadingMarkInfo, setLoadingMarkInfo] = useState(false);
  const markInfoTimeoutRef = useRef(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [availableTrackings, setAvailableTrackings] = useState([]);
  const [loadingAvailableTrackings, setLoadingAvailableTrackings] = useState(false);
  const [addItemMode, setAddItemMode] = useState("tracking");
  const [addItemTrackingId, setAddItemTrackingId] = useState("");
  const [addItemManual, setAddItemManual] = useState({
    description: "",
    tracking_number: "",
    cbm: "",
    rate_per_cbm: "",
    total_amount: "",
  });
  const [addingItem, setAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemForm, setEditItemForm] = useState({ description: "", cbm: "", rate_per_cbm: "", total_amount: "" });
  const [savingItemId, setSavingItemId] = useState(null);
  const [removingItemId, setRemovingItemId] = useState(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const resp = await API.get("/buysellapi/invoices/", {
        params: {
          page,
          page_size: pageSize,
          search: debouncedSearch || undefined,
          status: status || undefined,
          ordering,
        },
      });
      const data = resp.data;
      const list = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : [];
      setInvoices(list);
      if (data?.count != null) setTotal(data.count);
      else setTotal(list.length);
    } catch (err) {
      console.error("Failed to load invoices", err);
      toast.error(err.response?.data?.detail || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, status, ordering, debouncedSearch]);

  // Auto-filter as user types (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setDebouncedSearch(search);
  };

  const handleViewDetails = async (invoiceId) => {
    try {
      const resp = await API.get(`/buysellapi/invoices/${invoiceId}/`);
      setInvoiceDetails(resp.data);
      setDutyInputGhs(
        resp.data?.is_vehicle && Number(resp.data?.duty_ghs || 0) > 0
          ? String(resp.data.duty_ghs)
          : resp.data?.is_vehicle
            ? String(resp.data?.duty_ghs ?? "")
            : ""
      );
      setShowDetailsModal(true);
    } catch (err) {
      console.error("Failed to load invoice details", err);
      toast.error(
        err.response?.data?.detail || "Failed to load invoice details"
      );
    }
  };

  const refetchInvoiceDetails = async () => {
    if (!invoiceDetails?.id) return;
    try {
      const resp = await API.get(`/buysellapi/invoices/${invoiceDetails.id}/`, {
        params: { _t: Date.now() },
      });
      setInvoiceDetails(resp.data);
      fetchInvoices();
    } catch (err) {
      console.error("Failed to refetch invoice details", err);
    }
  };

  const handleOpenAddItem = async () => {
    setShowAddItemModal(true);
    setAddItemMode("tracking");
    setAddItemTrackingId("");
    setAddItemManual({ description: "", tracking_number: "", cbm: "", rate_per_cbm: "", total_amount: "" });
    if (invoiceDetails?.container_id || invoiceDetails?.container) {
      setLoadingAvailableTrackings(true);
      try {
        const resp = await API.get(`/buysellapi/invoices/${invoiceDetails.id}/available-trackings/`);
        setAvailableTrackings(resp.data?.results || []);
      } catch (err) {
        toast.error(err.response?.data?.detail || "Failed to load trackings");
        setAvailableTrackings([]);
      } finally {
        setLoadingAvailableTrackings(false);
      }
    } else {
      setAvailableTrackings([]);
    }
  };

  const handleAddItem = async () => {
    if (!invoiceDetails?.id) return;
    setAddingItem(true);
    try {
      if (addItemMode === "tracking" && addItemTrackingId) {
        await API.post(`/buysellapi/invoices/${invoiceDetails.id}/items/`, { tracking_id: parseInt(addItemTrackingId, 10) });
        toast.success("Item added from tracking");
      } else if (addItemMode === "manual") {
        const desc = (addItemManual.description || "").trim();
        const amount = parseFloat(addItemManual.total_amount);
        if (!desc || isNaN(amount)) {
          toast.error("Description and total amount are required for manual items");
          return;
        }
        await API.post(`/buysellapi/invoices/${invoiceDetails.id}/items/`, {
          description: desc,
          tracking_number: (addItemManual.tracking_number || "").trim() || undefined,
          cbm: addItemManual.cbm ? parseFloat(addItemManual.cbm) : undefined,
          rate_per_cbm: addItemManual.rate_per_cbm ? parseFloat(addItemManual.rate_per_cbm) : undefined,
          total_amount: amount,
        });
        toast.success("Manual item added");
      } else {
        toast.error("Select a tracking or fill manual item details");
        return;
      }
      setShowAddItemModal(false);
      await refetchInvoiceDetails();
    } catch (err) {
      const msg = err.response?.data?.description || err.response?.data?.tracking_id || err.response?.data?.detail || "Failed to add item";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setAddingItem(false);
    }
  };

  const handleStartEditItem = (item) => {
    setEditingItemId(item.id);
    setEditItemForm({
      description: item.description || "",
      cbm: item.cbm != null ? String(item.cbm) : "",
      rate_per_cbm: item.rate_per_cbm != null ? String(item.rate_per_cbm) : "",
      total_amount: item.total_amount != null ? String(item.total_amount) : "",
    });
  };

  const handleSaveEditItem = async () => {
    if (!invoiceDetails?.id || !editingItemId) return;
    setSavingItemId(editingItemId);
    try {
      const payload = {
        description: editItemForm.description || "",
        cbm: editItemForm.cbm === "" ? 0 : parseFloat(editItemForm.cbm) || 0,
        rate_per_cbm: editItemForm.rate_per_cbm === "" ? 0 : parseFloat(editItemForm.rate_per_cbm) || 0,
        total_amount: editItemForm.total_amount === "" ? 0 : parseFloat(editItemForm.total_amount) || 0,
      };
      await API.patch(`/buysellapi/invoices/${invoiceDetails.id}/items/${editingItemId}/`, payload);
      toast.success("Item updated");
      setEditingItemId(null);
      await refetchInvoiceDetails();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update item");
    } finally {
      setSavingItemId(null);
    }
  };

  const handleRemoveItem = async (item) => {
    if (!invoiceDetails?.id || !window.confirm(`Remove item "${(item.description || item.tracking_number || "Item").substring(0, 40)}" from invoice?`)) return;
    setRemovingItemId(item.id);
    try {
      await API.delete(`/buysellapi/invoices/${invoiceDetails.id}/items/${item.id}/`);
      toast.success("Item removed");
      await refetchInvoiceDetails();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to remove item");
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleDownloadReceipt = async (invoiceId) => {
    setDownloadingReceiptId(invoiceId);
    try {
      await Api.invoices.downloadReceipt(invoiceId);
      toast.success("Invoice receipt downloaded");
    } catch (err) {
      let msg = "Failed to download invoice receipt";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          msg = parsed.error || parsed.detail || msg;
        } catch {
          /* use default */
        }
      } else {
        msg =
          err.response?.data?.error ||
          err.response?.data?.detail ||
          err.message ||
          msg;
      }
      toast.error(typeof msg === "string" ? msg : "Failed to download invoice receipt");
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const handleRecordPayment = async (e) => {
    e?.preventDefault();
    if (!invoiceDetails?.id) return;
    const amount = parseFloat(paymentForm.amount_usd);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid payment amount (USD)");
      return;
    }
    setRecordingPayment(true);
    try {
      const resp = await Api.invoices.recordPayment(invoiceDetails.id, {
        amount_usd: amount,
        payment_method: paymentForm.payment_method || undefined,
        payment_reference: paymentForm.payment_reference || undefined,
        notes: paymentForm.notes || undefined,
      });
      setInvoiceDetails(resp.data?.invoice || resp.data);
      setPaymentForm({
        amount_usd: "",
        payment_method: "",
        payment_reference: "",
        notes: "",
      });
      toast.success("Payment recorded");
      fetchInvoices();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Failed to record payment";
      toast.error(typeof msg === "string" ? msg : "Failed to record payment");
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleResendInvoice = async () => {
    if (!invoiceDetails) return;
    setResending(true);
    try {
      // Use invoice_id if available, otherwise use mark_id and container_id
      const payload = invoiceDetails.id
        ? { invoice_id: invoiceDetails.id }
        : {
            mark_id: invoiceDetails.shipping_mark,
            container_id: invoiceDetails.container,
          };
      await API.post("/buysellapi/invoices/send/", payload);
      toast.success("Invoice email resent successfully");
    } catch (err) {
      console.error("Failed to resend invoice", err);
      toast.error(err.response?.data?.detail || "Failed to resend invoice");
    } finally {
      setResending(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!invoiceDetails) return;
    try {
      const resp = await API.patch(
        `/buysellapi/invoices/${invoiceDetails.id}/`,
        {
          status: newStatus,
        }
      );
      setInvoiceDetails(resp.data);
      toast.success("Invoice status updated");
      fetchInvoices(); // Refresh list
    } catch (err) {
      console.error("Failed to update status", err);
      toast.error(err.response?.data?.detail || "Failed to update status");
    }
  };

  const handleToggleStorageWaived = async (waived) => {
    if (!invoiceDetails?.id) return;
    if (invoiceDetails.status === "paid" || invoiceDetails.status === "cancelled") {
      toast.error("Storage waiver cannot be changed on paid or cancelled invoices");
      return;
    }
    try {
      setSavingStorageWaived(true);
      const resp = await API.patch(`/buysellapi/invoices/${invoiceDetails.id}/`, {
        storage_fee_waived: waived,
      });
      setInvoiceDetails(resp.data);
      toast.success(
        waived
          ? "Storage fee waived — client will not be charged storage on this invoice"
          : "Storage fee waiver removed — storage will apply if past due"
      );
      fetchInvoices();
    } catch (err) {
      console.error("Failed to update storage waiver", err);
      toast.error(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          "Failed to update storage fee setting"
      );
    } finally {
      setSavingStorageWaived(false);
    }
  };

  const handleToggleVehicle = async (isVehicle) => {
    if (!invoiceDetails?.id) return;
    if (invoiceDetails.status === "paid" || invoiceDetails.status === "cancelled") {
      toast.error("Vehicle / duties cannot be changed on paid or cancelled invoices");
      return;
    }
    try {
      setSavingVehicleDuty(true);
      const payload = { is_vehicle: isVehicle };
      if (!isVehicle) {
        payload.duty_ghs = 0;
      }
      const resp = await API.patch(`/buysellapi/invoices/${invoiceDetails.id}/`, payload);
      setInvoiceDetails(resp.data);
      setDutyInputGhs(
        isVehicle && Number(resp.data.duty_ghs || 0) > 0
          ? String(resp.data.duty_ghs)
          : ""
      );
      toast.success(
        isVehicle
          ? "Invoice marked as vehicle — add duties in GHS below"
          : "Vehicle flag removed — duties cleared from this invoice"
      );
      fetchInvoices();
    } catch (err) {
      console.error("Failed to update vehicle flag", err);
      toast.error(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          "Failed to update vehicle setting"
      );
    } finally {
      setSavingVehicleDuty(false);
    }
  };

  const handleSaveDutyGhs = async () => {
    if (!invoiceDetails?.id) return;
    if (invoiceDetails.status === "paid" || invoiceDetails.status === "cancelled") {
      toast.error("Duties cannot be changed on paid or cancelled invoices");
      return;
    }
    if (!invoiceDetails.is_vehicle) {
      toast.error("Mark the invoice as vehicle before adding duties");
      return;
    }
    const amount = Number.parseFloat(dutyInputGhs);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Enter a valid duties amount in GHS (0 or greater)");
      return;
    }
    try {
      setSavingVehicleDuty(true);
      const resp = await API.patch(`/buysellapi/invoices/${invoiceDetails.id}/`, {
        is_vehicle: true,
        duty_ghs: Math.round(amount * 100) / 100,
      });
      setInvoiceDetails(resp.data);
      setDutyInputGhs(
        Number(resp.data.duty_ghs || 0) > 0 ? String(resp.data.duty_ghs) : ""
      );
      toast.success("Vehicle duties updated — amount added to GHS total");
      fetchInvoices();
    } catch (err) {
      console.error("Failed to update duties", err);
      toast.error(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          "Failed to update duties"
      );
    } finally {
      setSavingVehicleDuty(false);
    }
  };


  const handleDeleteClick = (invoice) => {
    setDeletingInvoice(invoice);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingInvoice) return;
    setDeleting(true);
    try {
      const response = await API.delete(`/buysellapi/invoices/${deletingInvoice.id}/`);
      console.log("Invoice delete response:", response);
      toast.success(`Invoice ${deletingInvoice.invoice_number} deleted successfully`);
      setShowDeleteModal(false);
      setDeletingInvoice(null);
      fetchInvoices();
    } catch (err) {
      console.error("Failed to delete invoice", err);
      console.error("Error details:", err.response?.data);
      toast.error(
        err.response?.data?.detail || 
        err.response?.data?.error || 
        err.message || 
        "Failed to delete invoice"
      );
    } finally {
      setDeleting(false);
    }
  };

  const resetCreateForm = () => {
    setCreateFormData({
      shipping_mark: "",
      container_id: "",
      total_cbm: 0,
      customer_name: "",
      customer_email: "",
      total_amount: 0,
      status: "pending",
      issue_date: "",
      due_date: "",
      payment_method: "",
      payment_reference: "",
      notes: "",
    });
    setCreateLineItems([]);
    setCreateAvailableTrackings([]);
  };

  const buildCreateItemsPayload = () => {
    const out = [];
    for (const row of createLineItems) {
      if (row.mode === "tracking" && row.tracking_id) {
        out.push({ tracking_id: parseInt(row.tracking_id, 10) });
        continue;
      }
      if (row.mode === "manual") {
        const desc = (row.description || "").trim();
        const amount = parseFloat(row.total_amount);
        if (!desc || Number.isNaN(amount)) continue;
        out.push({
          description: desc,
          tracking_number: (row.tracking_number || "").trim() || undefined,
          cbm: row.cbm ? parseFloat(row.cbm) : 0,
          rate_per_cbm: row.rate_per_cbm ? parseFloat(row.rate_per_cbm) : 0,
          total_amount: amount,
        });
      }
    }
    return out;
  };

  const createItemsPayload = useMemo(() => buildCreateItemsPayload(), [createLineItems]);

  const createItemsSubtotal = useMemo(() => {
    let sum = 0;
    for (const row of createLineItems) {
      if (row.mode === "tracking" && row.tracking_id) {
        const t = createAvailableTrackings.find(
          (tr) => String(tr.id) === String(row.tracking_id)
        );
        sum += Number(t?.shipping_fee || 0);
      } else if (row.mode === "manual") {
        const amount = parseFloat(row.total_amount);
        if (!Number.isNaN(amount)) sum += amount;
      }
    }
    return sum;
  }, [createLineItems, createAvailableTrackings]);

  const handleCreateInvoice = async () => {
    const itemsPayload = buildCreateItemsPayload();
    const hasLineItems = itemsPayload.length > 0;
    const totalAmount = hasLineItems
      ? createItemsSubtotal
      : parseFloat(createFormData.total_amount);

    if (!createFormData.shipping_mark) {
      toast.error("Shipping Mark is required");
      return;
    }
    const markId = createFormData.shipping_mark.trim();
    const useAutoGenerate =
      Boolean(createFormData.container_id) && Boolean(markId);
    if (
      !useAutoGenerate &&
      !hasLineItems &&
      (!totalAmount || totalAmount <= 0)
    ) {
      toast.error("Enter a total amount or add at least one line item");
      return;
    }

    setCreating(true);
    try {

      let payload;
      if (useAutoGenerate) {
        payload = {
          mark_id: markId,
          container_id: createFormData.container_id,
          customer_name: createFormData.customer_name || "",
          customer_email: createFormData.customer_email || "",
          status: createFormData.status || "pending",
          issue_date:
            createFormData.issue_date || invoiceDefaultDates().issue_date,
          ...(createFormData.due_date
            ? { due_date: createFormData.due_date }
            : {}),
          notes: createFormData.notes || "",
        };
      } else {
        const rateResp = await API.get("/buysellapi/currency-rate/");
        const exchangeRate = rateResp.data?.usd_to_ghs || 12.0;
        const totalAmountGhs = Math.ceil(totalAmount * parseFloat(exchangeRate));

        payload = {
          shipping_mark: markId,
          container_id: createFormData.container_id || null,
          total_cbm: parseFloat(createFormData.total_cbm) || 0,
          customer_name: createFormData.customer_name || "",
          customer_email: createFormData.customer_email || "",
          subtotal: totalAmount,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: totalAmount,
          exchange_rate: exchangeRate,
          total_amount_ghs: totalAmountGhs,
          status: createFormData.status || "pending",
          issue_date:
            createFormData.issue_date || invoiceDefaultDates().issue_date,
          ...(createFormData.due_date
            ? { due_date: createFormData.due_date }
            : {}),
          payment_method: createFormData.payment_method || "",
          payment_reference: createFormData.payment_reference || "",
          notes: createFormData.notes || "",
        };
        if (hasLineItems) {
          payload.items = itemsPayload;
        }
      }

      const response = await API.post("/buysellapi/invoices/", payload);
      toast.success(`Invoice ${response.data?.invoice_number || "created"} created successfully`);
      setShowCreateModal(false);
      resetCreateForm();
      fetchInvoices();
    } catch (err) {
      console.error("Failed to create invoice", err);
      toast.error(
        err.response?.data?.detail || 
        err.response?.data?.error || 
        err.message || 
        "Failed to create invoice"
      );
    } finally {
      setCreating(false);
    }
  };

  const fetchCurrentRate = async () => {
    try {
      const response = await API.get("/buysellapi/currency-rate/");
      setCurrentRate(response.data);
    } catch (err) {
      console.error("Failed to fetch current rate", err);
    }
  };

  const handleUpdateRate = async () => {
    if (!newRate || parseFloat(newRate) <= 0) {
      toast.error("Please enter a valid exchange rate");
      return;
    }
    setUpdatingRate(true);
    try {
      const response = await API.post("/buysellapi/currency-rate/", {
        usd_to_ghs: parseFloat(newRate),
        notes: rateNotes,
      });
      setCurrentRate(response.data);
      toast.success("Exchange rate updated successfully");
      setShowRateModal(false);
      setNewRate("");
      setRateNotes("");
    } catch (err) {
      console.error("Failed to update rate", err);
      toast.error(
        err.response?.data?.detail || "Failed to update exchange rate"
      );
    } finally {
      setUpdatingRate(false);
    }
  };

  const fetchMarkInfo = async (markId) => {
    if (!markId || markId.trim() === "") {
      // Clear customer info if mark is cleared
      setCreateFormData((prev) => ({
        ...prev,
        customer_name: "",
        customer_email: "",
      }));
      return;
    }

    setLoadingMarkInfo(true);
    try {
      const response = await API.get(`/buysellapi/users/by-mark/${markId.trim()}/`);
      if (response.data) {
        setCreateFormData((prev) => ({
          ...prev,
          customer_name: response.data.full_name || "",
          customer_email: response.data.email || "",
        }));
      }
    } catch (err) {
      console.error("Failed to fetch mark info", err);
      // Don't show error toast - just clear the fields if mark not found
      setCreateFormData((prev) => ({
        ...prev,
        customer_name: "",
        customer_email: "",
      }));
    } finally {
      setLoadingMarkInfo(false);
    }
  };

  const fetchContainers = async () => {
    setLoadingContainers(true);
    try {
      // Fetch ALL containers without any filtering (same as container page)
      const response = await API.get("/buysellapi/containers/public/", {
        params: { all: true }
      });
      const allContainers = response.data || [];
      setContainers(allContainers);
    } catch (err) {
      console.error("Failed to fetch containers", err);
      toast.error("Failed to load containers");
    } finally {
      setLoadingContainers(false);
    }
  };

  useEffect(() => {
    fetchCurrentRate();
    fetchContainers();
  }, []);

  useEffect(() => {
    if (!showCreateModal || !createFormData.shipping_mark?.trim() || !createFormData.container_id) {
      setCreateAvailableTrackings([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingCreateTrackings(true);
      try {
        const res = await API.get("/buysellapi/invoices/preview/", {
          params: {
            mark_id: createFormData.shipping_mark.trim(),
            container_id: createFormData.container_id,
          },
        });
        if (!cancelled) {
          setCreateAvailableTrackings(res.data?.items || []);
        }
      } catch {
        if (!cancelled) setCreateAvailableTrackings([]);
      } finally {
        if (!cancelled) setLoadingCreateTrackings(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showCreateModal, createFormData.shipping_mark, createFormData.container_id]);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
          Invoices
        </h3>
        <div className="flex items-center gap-3">
          {currentRate && (
            <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-xs text-green-600 dark:text-green-400">
                Exchange Rate
              </div>
              <div className="text-sm font-bold text-green-700 dark:text-green-300">
                1 USD = {parseFloat(currentRate.usd_to_ghs).toFixed(4)} GHS
              </div>
            </div>
          )}
          <button
            onClick={() => {
              const dates = invoiceDefaultDates();
              setCreateFormData((prev) => ({
                ...prev,
                issue_date: dates.issue_date,
                due_date: dates.due_date,
              }));
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Create Invoice
          </button>
          <button
            onClick={() => setShowRateModal(true)}
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm font-medium"
          >
            Update Rate
          </button>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={onSearch} className="flex flex-wrap items-end gap-3 mb-4">
        <div className="min-w-[220px]">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Invoice #, Mark ID, Container #"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
            Order
          </label>
          <select
            value={ordering}
            onChange={(e) => {
              setOrdering(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {orderOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md">
        <table className="min-w-full">
          <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Invoice #
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Container
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Mark ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Subtotal
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Total (USD/GHS)
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Issue Date
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  Loading...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No invoices found
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-200 border-l-4 border-transparent hover:border-indigo-500"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
                      {inv.invoice_number}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white font-medium">
                    {inv.container_number || inv.container?.container_number || inv.container || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        {inv.shipping_mark}
                      </span>
                      {(inv.client_full_name || inv.client_username || inv.username) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {inv.client_full_name || inv.client_username || inv.username}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                        inv.status === "paid"
                          ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-sm"
                          : inv.status === "partial"
                          ? "bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-sm"
                          : inv.status === "overdue"
                          ? "bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-sm"
                          : inv.status === "pending"
                          ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-sm"
                          : inv.status === "cancelled"
                          ? "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-sm"
                          : "bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-sm"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 dark:text-blue-400 font-medium">
                    ${Number(inv.subtotal || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <div className="font-bold text-indigo-700 dark:text-indigo-400">
                      ${Number(inv.total_amount || 0).toFixed(2)}
                    </div>
                    {inv.total_amount_ghs && (
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                        ₵{Number(inv.total_amount_ghs || 0).toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">
                    {inv.issue_date || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadReceipt(inv.id);
                        }}
                        disabled={downloadingReceiptId === inv.id}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded inline-flex items-center justify-center disabled:opacity-50"
                        title="Download invoice receipt (PDF)"
                      >
                        {downloadingReceiptId === inv.id ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          <FaDownload />
                        )}
                      </button>
                      <a
                        href={`/invoice?invoice_number=${encodeURIComponent(inv.invoice_number || "")}&mark_id=${encodeURIComponent(inv.shipping_mark || "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded inline-flex items-center justify-center"
                        title="View on site (as customer sees)"
                      >
                        <FaExternalLinkAlt />
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(inv);
                        }}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Delete Invoice"
                      >
                        <FaTrash />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(inv.id);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
                        title="View Details"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Page {page} of{" "}
          <span title={String(totalPages)}>
            {formatCompactCount(totalPages)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
          >
            Prev
          </button>
          <button
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={loading || page >= totalPages}
          >
            Next
          </button>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="ml-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {[10, 20, 50].map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoice Details Modal */}
      {showDetailsModal && invoiceDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Invoice Details: {invoiceDetails.invoice_number}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={`/invoice?invoice_number=${encodeURIComponent(invoiceDetails.invoice_number || "")}&mark_id=${encodeURIComponent(invoiceDetails.shipping_mark || "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                  title="View on site (as customer sees)"
                >
                  <FaExternalLinkAlt className="text-xs" />
                  View on site
                </a>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setInvoiceDetails(null);
                    setDutyInputGhs("");
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Invoice Header Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Container
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {invoiceDetails.container_number}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Shipping Mark
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {invoiceDetails.shipping_mark}
                </div>
                {(invoiceDetails.client_full_name || invoiceDetails.client_username || invoiceDetails.username) && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {invoiceDetails.client_full_name || invoiceDetails.client_username || invoiceDetails.username}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Customer
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {invoiceDetails.customer_name || "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Customer Email
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {invoiceDetails.customer_email || "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Issue Date
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {invoiceDetails.issue_date || "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Due Date
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {invoiceDetails.due_date || "N/A"}
                </div>
              </div>
            </div>

            {/* Status Management */}
            <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-semibold text-gray-800 dark:text-white mb-3">
                Status Management
              </h4>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Current Status:
                </div>
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    invoiceDetails.status === "paid"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : invoiceDetails.status === "partial"
                      ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                      : invoiceDetails.status === "overdue"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      : invoiceDetails.status === "pending"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                      : invoiceDetails.status === "cancelled"
                      ? "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  }`}
                >
                  {invoiceDetails.status}
                </span>
                <div className="flex-1"></div>
                <select
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  value=""
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Change status...</option>
                  {statusOptions
                    .filter(
                      (opt) => opt.value && opt.value !== invoiceDetails.status
                    )
                    .map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleResendInvoice}
                  disabled={resending}
                  className="px-4 py-1 text-sm bg-pink-600 text-white rounded hover:bg-pink-700 disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Resend Invoice"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadReceipt(invoiceDetails.id)}
                  disabled={downloadingReceiptId === invoiceDetails.id}
                  className="inline-flex items-center gap-1.5 px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  title="Download invoice receipt (PDF) to share with client"
                >
                  {downloadingReceiptId === invoiceDetails.id ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaDownload />
                  )}
                  Download receipt
                </button>
              </div>
            </div>

            {/* Part payments */}
            {invoiceDetails.status !== "cancelled" && (
              <div className="mb-6 p-4 border border-indigo-200 dark:border-indigo-800 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-3">
                  Payments
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
                  <div className="p-3 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                    <div className="text-gray-500 dark:text-gray-400">Invoice total</div>
                    <div className="font-bold text-indigo-700 dark:text-indigo-300">
                      ${Number(invoiceDetails.total_amount || 0).toFixed(2)} USD
                      {invoiceDetails.exchange_rate && (() => {
                        const g = getInvoiceGhsBreakdown(invoiceDetails);
                        return (
                          <>
                            <span className="block text-xs text-gray-600 dark:text-gray-300 font-medium">
                              ₵{g.freightGhs.toFixed(2)} shipping + ₵{g.storageGhs.toFixed(2)} storage
                            </span>
                            <span className="block text-xs text-green-600 dark:text-green-400 font-medium">
                              ₵{g.totalGhs.toFixed(2)} total GHS
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="p-3 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                    <div className="text-gray-500 dark:text-gray-400">Paid so far</div>
                    <div className="font-bold text-green-700 dark:text-green-300">
                      ${Number(invoiceDetails.amount_paid_usd || 0).toFixed(2)}
                      {(invoiceDetails.amount_paid_ghs > 0 || invoiceDetails.total_amount_ghs) && (
                        <span className="block text-xs font-medium">
                          ₵{Number(invoiceDetails.amount_paid_ghs || 0).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 rounded bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-700 col-span-2 sm:col-span-2">
                    <div className="text-gray-500 dark:text-gray-400">Remaining balance</div>
                    <div className="font-bold text-orange-700 dark:text-orange-300">
                      ${Number(invoiceDetails.amount_due_usd ?? Math.max(0, Number(invoiceDetails.total_amount || 0) - Number(invoiceDetails.amount_paid_usd || 0))).toFixed(2)}
                      <span className="block text-xs font-medium">
                        ₵{Number(invoiceDetails.amount_due_ghs ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {Number(invoiceDetails.amount_due_usd ?? 1) > 0.01 && invoiceDetails.status !== "paid" && (
                  <form onSubmit={handleRecordPayment} className="flex flex-wrap items-end gap-3 mb-4">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Payment amount (USD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={Number(invoiceDetails.amount_due_usd || invoiceDetails.total_amount || 0)}
                        value={paymentForm.amount_usd}
                        onChange={(e) =>
                          setPaymentForm((f) => ({ ...f, amount_usd: e.target.value }))
                        }
                        className="w-36 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Method
                      </label>
                      <input
                        type="text"
                        value={paymentForm.payment_method}
                        onChange={(e) =>
                          setPaymentForm((f) => ({ ...f, payment_method: e.target.value }))
                        }
                        className="w-32 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="MoMo, Bank..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Reference
                      </label>
                      <input
                        type="text"
                        value={paymentForm.payment_reference}
                        onChange={(e) =>
                          setPaymentForm((f) => ({ ...f, payment_reference: e.target.value }))
                        }
                        className="w-36 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={recordingPayment}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50"
                    >
                      {recordingPayment ? "Saving..." : "Record payment"}
                    </button>
                  </form>
                )}

                {invoiceDetails.payments?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                          <th className="py-2 pr-2">Date</th>
                          <th className="py-2 pr-2">USD</th>
                          <th className="py-2 pr-2">GHS</th>
                          <th className="py-2 pr-2">Method</th>
                          <th className="py-2">Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceDetails.payments.map((p) => (
                          <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-2 pr-2">
                              {p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}
                            </td>
                            <td className="py-2 pr-2">${Number(p.amount_usd || 0).toFixed(2)}</td>
                            <td className="py-2 pr-2">₵{Number(p.amount_ghs || 0).toFixed(2)}</td>
                            <td className="py-2 pr-2">{p.payment_method || "—"}</td>
                            <td className="py-2">{p.payment_reference || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">No payments recorded yet.</p>
                )}
              </div>
            )}

            {/* Invoice Items */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800 dark:text-white">
                  Invoice Items ({invoiceDetails.items?.length ?? 0})
                </h4>
                {(invoiceDetails.container_id || invoiceDetails.container) && (
                  <button
                    type="button"
                    onClick={handleOpenAddItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded"
                  >
                    <FaPlus className="text-xs" /> Add item
                  </button>
                )}
              </div>
              {invoiceDetails.items && invoiceDetails.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left">Tracking #</th>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-right">CBM</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {invoiceDetails.items.map((item) => (
                        <React.Fragment key={item.id}>
                          {editingItemId === item.id ? (
                            <tr className="bg-indigo-50 dark:bg-indigo-900/20">
                              <td className="px-3 py-2 text-gray-900 dark:text-white">{item.tracking_number || "—"}</td>
                              <td className="px-3 py-2">
                                <input
                                  value={editItemForm.description}
                                  onChange={(e) => setEditItemForm((f) => ({ ...f, description: e.target.value }))}
                                  className="w-full max-w-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                  placeholder="Description"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="0.001"
                                  value={editItemForm.cbm}
                                  onChange={(e) => setEditItemForm((f) => ({ ...f, cbm: e.target.value }))}
                                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-right"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={handleSaveEditItem}
                                  disabled={savingItemId === item.id}
                                  className="text-green-600 dark:text-green-400 hover:underline mr-2"
                                >
                                  {savingItemId === item.id ? <FaSpinner className="animate-spin inline" /> : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingItemId(null)}
                                  className="text-gray-600 dark:text-gray-400 hover:underline"
                                >
                                  Cancel
                                </button>
                              </td>
                            </tr>
                          ) : (
                            <tr>
                              <td className="px-3 py-2 text-gray-900 dark:text-white">
                                <InvoiceItemTrackingLabel item={item} compact />
                              </td>
                              <td className="px-3 py-2 text-gray-900 dark:text-white">{item.description}</td>
                              <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                                <InvoiceItemCbm item={item} className="block text-right" />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditItem(item)}
                                  className="text-indigo-600 dark:text-indigo-400 hover:underline mr-2"
                                  title="Edit item"
                                >
                                  <FaEdit className="inline" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item)}
                                  disabled={removingItemId === item.id}
                                  className="text-red-600 dark:text-red-400 hover:underline"
                                  title="Remove item"
                                >
                                  {removingItemId === item.id ? <FaSpinner className="animate-spin inline" /> : <FaTrash className="inline" />}
                                </button>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                  No items yet.{(invoiceDetails.container_id || invoiceDetails.container) ? " Click “Add item” to add from trackings or add a manual line." : ""}
                </p>
              )}
            </div>

            {/* Add Item Modal */}
            {showAddItemModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-4">Add invoice item</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                      <select
                        value={addItemMode}
                        onChange={(e) => setAddItemMode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="tracking">From tracking</option>
                        <option value="manual">Manual line</option>
                      </select>
                    </div>
                    {addItemMode === "tracking" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tracking</label>
                        <select
                          value={addItemTrackingId}
                          onChange={(e) => setAddItemTrackingId(e.target.value)}
                          disabled={loadingAvailableTrackings}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Select a tracking</option>
                          {availableTrackings.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.tracking_number} (CBM: {Number(t.cbm || 0).toFixed(3)}, ${Number(t.shipping_fee || 0).toFixed(2)})
                            </option>
                          ))}
                        </select>
                        {loadingAvailableTrackings && <p className="text-xs text-gray-500 mt-1">Loading trackings...</p>}
                        {!loadingAvailableTrackings && availableTrackings.length === 0 && (invoiceDetails?.container_id || invoiceDetails?.container) && (
                          <p className="text-xs text-gray-500 mt-1">No more trackings available for this container.</p>
                        )}
                      </div>
                    )}
                    {addItemMode === "manual" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                          <input
                            value={addItemManual.description}
                            onChange={(e) => setAddItemManual((f) => ({ ...f, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="e.g. Freight fee"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total amount (USD) *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={addItemManual.total_amount}
                            onChange={(e) => setAddItemManual((f) => ({ ...f, total_amount: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CBM</label>
                            <input
                              type="number"
                              step="0.001"
                              value={addItemManual.cbm}
                              onChange={(e) => setAddItemManual((f) => ({ ...f, cbm: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rate per CBM</label>
                            <input
                              type="number"
                              step="0.01"
                              value={addItemManual.rate_per_cbm}
                              onChange={(e) => setAddItemManual((f) => ({ ...f, rate_per_cbm: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tracking # (optional)</label>
                          <input
                            value={addItemManual.tracking_number}
                            onChange={(e) => setAddItemManual((f) => ({ ...f, tracking_number: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Manual"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddItemModal(false)}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={addingItem}
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {addingItem ? <FaSpinner className="animate-spin inline mr-1" /> : null} Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {invoiceDetails.storage_payment_reminder &&
              invoiceDetails.status !== "paid" &&
              invoiceDetails.status !== "cancelled" &&
              !invoiceDetails.storage_fee_waived && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Pay on time
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {invoiceDetails.storage_payment_reminder}
                  </p>
                </div>
              )}

            {invoiceDetails.status !== "paid" &&
              invoiceDetails.status !== "cancelled" && (
                <div className="mb-6 p-4 border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-900/10 rounded-lg">
                  <div className="flex items-start gap-3">
                    <input
                      id="storage-fee-waived"
                      type="checkbox"
                      checked={Boolean(invoiceDetails.storage_fee_waived)}
                      disabled={savingStorageWaived}
                      onChange={(e) => handleToggleStorageWaived(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    <label htmlFor="storage-fee-waived" className="min-w-0 flex-1 cursor-pointer">
                      <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                        Waive storage fee for this invoice
                      </span>
                      <span className="block text-xs text-gray-600 dark:text-gray-300 mt-1">
                        When checked, the client is not charged storage even if the system
                        calculates a daily storage amount. Freight (USD) is unchanged.
                      </span>
                      {invoiceDetails.storage_fee_waived &&
                      Number(invoiceDetails.storage_fee_calculated_ghs || 0) > 0 ? (
                        <span className="block text-xs text-amber-800 dark:text-amber-200 mt-2 font-medium">
                          Calculated storage (waived): ₵
                          {Number(invoiceDetails.storage_fee_calculated_ghs).toFixed(2)}
                          {invoiceDetails.storage_fee_calculated_detail ? (
                            <span className="block font-normal mt-0.5">
                              {invoiceDetails.storage_fee_calculated_detail}
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                      {savingStorageWaived ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 mt-2">
                          <FaSpinner className="animate-spin" /> Updating…
                        </span>
                      ) : null}
                    </label>
                  </div>
                </div>
              )}

            {invoiceDetails.status !== "paid" &&
              invoiceDetails.status !== "cancelled" && (
                <div className="mb-6 p-4 border border-sky-200 dark:border-sky-800/50 bg-sky-50/60 dark:bg-sky-900/10 rounded-lg">
                  <div className="flex items-start gap-3">
                    <input
                      id="invoice-is-vehicle"
                      type="checkbox"
                      checked={Boolean(invoiceDetails.is_vehicle)}
                      disabled={savingVehicleDuty}
                      onChange={(e) => handleToggleVehicle(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    <div className="min-w-0 flex-1">
                      <label htmlFor="invoice-is-vehicle" className="cursor-pointer">
                        <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                          Vehicle package (duties apply)
                        </span>
                        <span className="block text-xs text-gray-600 dark:text-gray-300 mt-1">
                          Mark this invoice as vehicle cargo, then enter customs duties in
                          Ghana cedis. Duties are added to the GHS total only (USD freight
                          is unchanged).
                        </span>
                      </label>
                      {invoiceDetails.is_vehicle ? (
                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <div>
                            <label
                              htmlFor="duty-ghs-input"
                              className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                            >
                              Duties (GHS)
                            </label>
                            <input
                              id="duty-ghs-input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={dutyInputGhs}
                              disabled={savingVehicleDuty}
                              onChange={(e) => setDutyInputGhs(e.target.value)}
                              placeholder="0.00"
                              className="w-40 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={savingVehicleDuty}
                            onClick={handleSaveDutyGhs}
                            className="px-3 py-1.5 text-sm bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50"
                          >
                            {savingVehicleDuty ? (
                              <FaSpinner className="animate-spin inline" />
                            ) : (
                              "Save duties"
                            )}
                          </button>
                        </div>
                      ) : null}
                      {savingVehicleDuty && !invoiceDetails.is_vehicle ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 mt-2">
                          <FaSpinner className="animate-spin" /> Updating…
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

            {/* Totals */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="space-y-2">
                {invoiceDetails.items && invoiceDetails.items.length > 0 && (
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-gray-600 dark:text-gray-400">
                      Total CBM:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {getInvoiceTotalCbm(invoiceDetails.items).toFixed(3)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Subtotal:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${Number(invoiceDetails.subtotal || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${Number(invoiceDetails.tax_amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Discount:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    -${Number(invoiceDetails.discount_amount || 0).toFixed(2)}
                  </span>
                </div>
                {Number(invoiceDetails.discount_amount || 0) <= 0 &&
                  invoiceDetails.executive_member === false && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Customer is not an active Executive member — no shipping
                      discount applied.
                    </p>
                  )}
                {invoiceDetails.executive_member === true &&
                  Number(invoiceDetails.executive_discount_percent || 0) > 0 &&
                  Number(invoiceDetails.discount_amount || 0) > 0 && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Executive member shipping discount (
                      {invoiceDetails.executive_discount_percent}%).
                    </p>
                  )}
                <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between">
                  <span className="font-semibold text-gray-800 dark:text-white">
                    Total (USD):
                  </span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">
                    ${Number(invoiceDetails.total_amount || 0).toFixed(2)}
                  </span>
                </div>
                {invoiceDetails.exchange_rate && (() => {
                  const ghs = getInvoiceGhsBreakdown(invoiceDetails);
                  return (
                    <>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                        <span>Exchange Rate:</span>
                        <span>1 USD = {ghs.rate.toFixed(4)} GHS</span>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2 space-y-1.5">
                        <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                          Ghana cedis (GH₵)
                        </p>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            Shipping fee (GHS):
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ₵{ghs.freightGhs.toFixed(2)}
                          </span>
                        </div>
                        {ghs.storageGhs > 0 ? (
                          <div className="flex justify-between text-sm gap-3">
                            <span className="text-amber-700 dark:text-amber-300">
                              Storage fee (GHS)
                              <span className="block text-xs font-normal mt-0.5">
                                You are charged per day
                                {invoiceDetails.storage_fee_detail ? (
                                  <span className="block mt-0.5">
                                    {invoiceDetails.storage_fee_detail}
                                  </span>
                                ) : null}
                              </span>
                            </span>
                            <span className="font-medium text-amber-700 dark:text-amber-300 shrink-0">
                              ₵{ghs.storageGhs.toFixed(2)}
                            </span>
                          </div>
                        ) : invoiceDetails.storage_fee_waived &&
                          Number(invoiceDetails.storage_fee_calculated_ghs || 0) > 0 ? (
                          <p className="text-xs text-emerald-700 dark:text-emerald-300 italic">
                            Storage fee waived for this invoice (calculated ₵
                            {Number(invoiceDetails.storage_fee_calculated_ghs).toFixed(2)} not
                            charged).
                          </p>
                        ) : invoiceDetails.storage_not_yet_due ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                            No storage fee yet — customer should pay before the due date.
                          </p>
                        ) : null}
                        {ghs.dutyGhs > 0 ? (
                          <div className="flex justify-between text-sm">
                            <span className="text-sky-700 dark:text-sky-300">
                              Vehicle duties (GHS):
                            </span>
                            <span className="font-medium text-sky-700 dark:text-sky-300">
                              ₵{ghs.dutyGhs.toFixed(2)}
                            </span>
                          </div>
                        ) : invoiceDetails.is_vehicle ? (
                          <p className="text-xs text-sky-700 dark:text-sky-300 italic">
                            Vehicle invoice — no duties entered yet.
                          </p>
                        ) : null}
                        <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                          <span className="font-semibold text-green-700 dark:text-green-400">
                            Total (GHS):
                          </span>
                          <span className="font-bold text-lg text-green-700 dark:text-green-400">
                            ₵{ghs.totalGhs.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Notes */}
            {invoiceDetails.notes && (
              <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                  Notes
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {invoiceDetails.notes}
                </p>
              </div>
            )}

            {/* Payment Info */}
            {(invoiceDetails.payment_method ||
              invoiceDetails.payment_reference ||
              invoiceDetails.paid_date) && (
              <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-3">
                  Payment Information
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {invoiceDetails.payment_method && (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Payment Method
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {invoiceDetails.payment_method}
                      </div>
                    </div>
                  )}
                  {invoiceDetails.payment_reference && (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Reference
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {invoiceDetails.payment_reference}
                      </div>
                    </div>
                  )}
                  {invoiceDetails.paid_date && (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Paid Date
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {invoiceDetails.paid_date}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setInvoiceDetails(null);
                  setDutyInputGhs("");
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exchange Rate Update Modal */}
      {showRateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                Update Exchange Rate
              </h3>

              {currentRate && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    Current Rate
                  </div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    1 USD = {parseFloat(currentRate.usd_to_ghs).toFixed(4)} GHS
                  </div>
                  {currentRate.updated_at && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Last updated:{" "}
                      {new Date(currentRate.updated_at).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Rate (1 USD = ? GHS)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    placeholder="Enter new rate (e.g., 12.5000)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={rateNotes}
                    onChange={(e) => setRateNotes(e.target.value)}
                    placeholder="Reason for update..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUpdateRate}
                  disabled={updatingRate || !newRate}
                  className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {updatingRate ? "Updating..." : "Update Rate"}
                </button>
                <button
                  onClick={() => {
                    setShowRateModal(false);
                    setNewRate("");
                    setRateNotes("");
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Delete Invoice
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Are you sure you want to delete invoice{" "}
                <span className="font-semibold">{deletingInvoice.invoice_number}</span>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingInvoice(null);
                  }}
                  disabled={deleting}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Create New Invoice
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FaTimes size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Shipping Mark <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createFormData.shipping_mark}
                    onChange={(e) => {
                      const markId = e.target.value;
                      setCreateFormData({ ...createFormData, shipping_mark: markId });
                      
                      // Clear previous timeout
                      if (markInfoTimeoutRef.current) {
                        clearTimeout(markInfoTimeoutRef.current);
                      }
                      
                      // Auto-populate customer info when mark ID changes (debounced)
                      if (markId.trim()) {
                        markInfoTimeoutRef.current = setTimeout(() => {
                          fetchMarkInfo(markId);
                        }, 500);
                      } else {
                        setCreateFormData((prev) => ({
                          ...prev,
                          customer_name: "",
                          customer_email: "",
                        }));
                      }
                    }}
                    onBlur={(e) => {
                      // Also fetch on blur if not already loading
                      if (e.target.value.trim() && !loadingMarkInfo) {
                        fetchMarkInfo(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter shipping mark ID"
                    required
                  />
                  {loadingMarkInfo && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Loading customer info...
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Container
                  </label>
                  <select
                    value={createFormData.container_id}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, container_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={loadingContainers}
                  >
                    <option value="">Select Container (Optional)</option>
                    {containers.map((container) => (
                      <option key={container.id} value={container.id}>
                        {container.container_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Total CBM
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={createFormData.total_cbm}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, total_cbm: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={createFormData.status}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {statusOptions
                    .filter((opt) => opt.value !== "")
                    .map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={createFormData.customer_name}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, customer_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    value={createFormData.customer_email}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, customer_email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-semibold text-gray-800 dark:text-white">
                    Invoice line items
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCreateLineItems((rows) => [...rows, emptyCreateLineItem()])
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    <FaPlus className="text-xs" /> Add line
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Optional. Add manual lines or pick trackings when a container is selected.
                  Totals update from line items when at least one line is added.
                </p>
                {createLineItems.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No line items — enter total amount below instead.
                  </p>
                ) : (
                  <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                    {createLineItems.map((row, idx) => (
                      <div
                        key={row._key}
                        className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Line {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCreateLineItems((rows) =>
                                rows.filter((r) => r._key !== row._key)
                              )
                            }
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        <select
                          value={row.mode}
                          onChange={(e) =>
                            setCreateLineItems((rows) =>
                              rows.map((r) =>
                                r._key === row._key
                                  ? { ...r, mode: e.target.value, tracking_id: "" }
                                  : r
                              )
                            )
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="manual">Manual line</option>
                          <option
                            value="tracking"
                            disabled={!createFormData.container_id}
                          >
                            From tracking
                            {!createFormData.container_id ? " (select container)" : ""}
                          </option>
                        </select>
                        {row.mode === "tracking" ? (
                          <select
                            value={row.tracking_id}
                            onChange={(e) =>
                              setCreateLineItems((rows) =>
                                rows.map((r) =>
                                  r._key === row._key
                                    ? { ...r, tracking_id: e.target.value }
                                    : r
                                )
                              )
                            }
                            disabled={loadingCreateTrackings}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Select tracking</option>
                            {createAvailableTrackings.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.tracking_number} (CBM: {Number(t.cbm || 0).toFixed(3)}, $
                                {Number(t.shipping_fee || 0).toFixed(2)})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <>
                            <input
                              placeholder="Description *"
                              value={row.description}
                              onChange={(e) =>
                                setCreateLineItems((rows) =>
                                  rows.map((r) =>
                                    r._key === row._key
                                      ? { ...r, description: e.target.value }
                                      : r
                                  )
                                )
                              }
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Amount USD *"
                                value={row.total_amount}
                                onChange={(e) =>
                                  setCreateLineItems((rows) =>
                                    rows.map((r) =>
                                      r._key === row._key
                                        ? { ...r, total_amount: e.target.value }
                                        : r
                                    )
                                  )
                                }
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                              <input
                                type="number"
                                step="0.001"
                                placeholder="CBM"
                                value={row.cbm}
                                onChange={(e) =>
                                  setCreateLineItems((rows) =>
                                    rows.map((r) =>
                                      r._key === row._key
                                        ? { ...r, cbm: e.target.value }
                                        : r
                                    )
                                  )
                                }
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            <input
                              placeholder="Tracking # (optional)"
                              value={row.tracking_number}
                              onChange={(e) =>
                                setCreateLineItems((rows) =>
                                  rows.map((r) =>
                                    r._key === row._key
                                      ? { ...r, tracking_number: e.target.value }
                                      : r
                                  )
                                )
                              }
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {createItemsPayload.length > 0 && (
                  <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                    Lines subtotal: ${createItemsSubtotal.toFixed(2)} (invoice total will use line
                    items)
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Total Amount (USD){" "}
                    {createItemsPayload.length > 0 ? (
                      <span className="text-gray-400 font-normal">(from lines)</span>
                    ) : (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={
                      createItemsPayload.length > 0
                        ? createItemsSubtotal
                        : createFormData.total_amount
                    }
                    onChange={(e) => {
                      if (createItemsPayload.length > 0) return;
                      const totalAmount = parseFloat(e.target.value) || 0;
                      setCreateFormData({ ...createFormData, total_amount: totalAmount });
                    }}
                    readOnly={createItemsPayload.length > 0}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      createItemsPayload.length > 0 ? "opacity-75 cursor-not-allowed" : ""
                    }`}
                    required={createItemsPayload.length === 0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Exchange Rate (1 USD = ? GHS)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={currentRate?.usd_to_ghs || ""}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {(createItemsPayload.length > 0 ? createItemsSubtotal : createFormData.total_amount) >
                0 &&
                currentRate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Total Amount (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={Math.ceil(
                      (createItemsPayload.length > 0
                        ? createItemsSubtotal
                        : createFormData.total_amount) * parseFloat(currentRate.usd_to_ghs)
                    )}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Automatically calculated using current exchange rate
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={createFormData.issue_date}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, issue_date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Due Date <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={createFormData.due_date}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, due_date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Leave blank to use the container invoice due date, or N/A if the container
                    has none set.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Method
                  </label>
                  <input
                    type="text"
                    value={createFormData.payment_method}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, payment_method: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Reference
                  </label>
                  <input
                    type="text"
                    value={createFormData.payment_reference}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, payment_reference: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={createFormData.notes}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateInvoice}
                  disabled={
                    creating ||
                    !createFormData.shipping_mark ||
                    (createItemsPayload.length === 0 && !createFormData.total_amount)
                  }
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {creating ? "Creating..." : "Create Invoice"}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
