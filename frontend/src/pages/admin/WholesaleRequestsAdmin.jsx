import React, { useCallback, useEffect, useState } from "react";
import { toast } from "../../utils/toast";
import { FaChevronLeft, FaChevronRight, FaTrash, FaTimes } from "react-icons/fa";
import ConfirmModal from "../../components/shared/ConfirmModal";
import {
  getAdminWholesaleRequests,
  updateWholesaleRequestStatus,
  deleteWholesaleRequest,
  clearCache,
} from "../../api";

const STATUS_OPTIONS = [
  "pending",
  "approved",
  "processing",
  "completed",
  "cancelled",
  "rejected",
];

const TRACKING_OPTIONS = [
  { value: "", label: "—" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
];

const paymentBadgeClass = (status) => {
  if (status === "paid" || status === "confirmed") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  }
  if (status === "partial") {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
  }
  if (status === "rejected") {
    return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  }
  return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
};

const paymentLabel = (status) => {
  const s = (status || "pending_review").toLowerCase();
  if (s === "partial") return "Part paid";
  if (s === "paid" || s === "confirmed") return "Fully paid";
  if (s === "rejected") return "Rejected";
  return "Pending review";
};

const WholesaleRequestsAdmin = () => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [previewProof, setPreviewProof] = useState("");

  const totalPages = Math.ceil(total / pageSize) || 1;

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = { page: currentPage, page_size: pageSize };
      if (statusFilter) params.status = statusFilter;
      const response = await getAdminWholesaleRequests(params);
      let list = [];
      let count = 0;
      if (response.data?.results) {
        list = response.data.results;
        count = response.data.count || 0;
      } else if (Array.isArray(response.data)) {
        list = response.data;
        count = response.data.length;
      }
      setRequests(list);
      setTotal(count);
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          "Failed to load wholesale requests"
      );
      setRequests([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const deleteStockHint = (req) => {
    if (!req) return "";
    if (req.status === "pending" && !req.stock_restored) {
      return ` ${req.quantity} unit(s) will be returned to available stock.`;
    }
    if (
      req.status === "approved" ||
      req.status === "processing" ||
      req.status === "completed"
    ) {
      return " Stock will not be returned (already approved/sold).";
    }
    if (req.status === "rejected" || req.status === "cancelled") {
      return " Stock was already restored when rejected/cancelled.";
    }
    return "";
  };

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    try {
      const response = await updateWholesaleRequestStatus(id, { status });
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...response.data } : r))
      );
      clearCache("admin-unread-counts");
      toast.success(`Status updated to ${status}`);
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to update status"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleTrackingChange = async (id, tracking_status) => {
    setUpdatingId(id);
    try {
      const current = requests.find((r) => r.id === id);
      const response = await updateWholesaleRequestStatus(id, {
        status: current?.status || "pending",
        tracking_status: tracking_status || null,
      });
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...response.data } : r))
      );
      toast.success("Tracking updated");
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to update tracking"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePaymentStatus = async (req, payment_status) => {
    setUpdatingId(req.id);
    try {
      const response = await updateWholesaleRequestStatus(req.id, {
        status: req.status || "pending",
        payment_status,
      });
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, ...response.data } : r))
      );
      clearCache("admin-unread-counts");
      const messages = {
        partial: "Marked as part payment received",
        paid: "Marked as fully paid — order validated",
        rejected: "Payment rejected — order cancelled and stock restored",
      };
      toast.success(messages[payment_status] || "Payment status updated");
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to update payment status"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteRequest = (req) => {
    setDeleteTarget(req);
    setShowDeleteModal(true);
  };

  const confirmDeleteRequest = async () => {
    if (!deleteTarget) return;
    const deletedId = deleteTarget.id;

    try {
      const response = await deleteWholesaleRequest(deletedId);
      const msg =
        response?.data?.message || `Request #${deletedId} deleted`;

      setRequests((prev) => prev.filter((r) => r.id !== deletedId));
      setTotal((prevTotal) => {
        const nextTotal = Math.max(0, prevTotal - 1);
        if (currentPage > 1 && nextTotal <= (currentPage - 1) * pageSize) {
          setCurrentPage((p) => Math.max(1, p - 1));
        }
        return nextTotal;
      });

      clearCache("admin-unread-counts");
      clearCache("/buysellapi/admin/wholesale-requests/");
      toast.success(msg);
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          "Failed to delete request"
      );
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 border rounded-lg bg-white dark:bg-gray-700 text-sm"
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <span className="text-sm text-gray-500">{total} request(s)</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-8 text-center text-gray-500">
          No wholesale requests yet.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Qty</th>
                <th className="px-3 py-2 font-medium">Payment</th>
                <th className="px-3 py-2 font-medium">Proof</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Tracking</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr
                  key={req.id}
                  className="border-t border-gray-100 dark:border-gray-700 align-top"
                >
                  <td className="px-3 py-2 text-gray-500">{req.id}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900 dark:text-white line-clamp-1">
                      {req.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      Unit GHS {Number(req.unit_price || 0).toFixed(2)} · MOQ{" "}
                      {req.moq}
                      {req.availability_at_order === "arriving"
                        ? " · was arriving"
                        : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div>{req.user_name || "—"}</div>
                    <div className="text-xs text-gray-500">
                      {req.user_email}
                      {req.user_phone ? ` · ${req.user_phone}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2">{req.quantity}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="font-medium">
                      Due now: GHS {Number(req.amount_due || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {req.payment_percent || 100}% of GHS{" "}
                      {Number(req.line_total || 0).toFixed(2)}
                      {req.payment_method ? ` · ${req.payment_method}` : ""}
                    </div>
                    {(req.payment_status === "partial" ||
                      Number(req.payment_percent || 100) < 100) &&
                      req.payment_status !== "paid" &&
                      req.payment_status !== "confirmed" && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                          Remaining: GHS{" "}
                          {(
                            Number(req.line_total || 0) -
                            Number(req.amount_due || 0)
                          ).toFixed(2)}
                        </div>
                      )}
                    <span
                      className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${paymentBadgeClass(
                        req.payment_status
                      )}`}
                    >
                      {paymentLabel(req.payment_status)}
                    </span>
                    {req.payment_status !== "paid" &&
                      req.payment_status !== "confirmed" &&
                      req.payment_status !== "rejected" && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {req.payment_status !== "partial" && (
                            <button
                              type="button"
                              disabled={updatingId === req.id}
                              onClick={() =>
                                handlePaymentStatus(req, "partial")
                              }
                              className="px-1.5 py-0.5 text-[10px] rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              Part paid
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={updatingId === req.id}
                            onClick={() => handlePaymentStatus(req, "paid")}
                            className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Fully paid
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === req.id}
                            onClick={() =>
                              handlePaymentStatus(req, "rejected")
                            }
                            className="px-1.5 py-0.5 text-[10px] rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                  </td>
                  <td className="px-3 py-2">
                    {req.proof_of_payment ? (
                      <button
                        type="button"
                        onClick={() => setPreviewProof(req.proof_of_payment)}
                        className="block"
                        title="View proof"
                      >
                        <img
                          src={req.proof_of_payment}
                          alt="Payment proof"
                          className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-600"
                        />
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">No proof</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={req.status || "pending"}
                      disabled={updatingId === req.id}
                      onChange={(e) =>
                        handleStatusChange(req.id, e.target.value)
                      }
                      className="px-2 py-1 border rounded bg-white dark:bg-gray-700 text-xs capitalize"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {(req.status === "rejected" ||
                      req.status === "cancelled") &&
                      req.stock_restored && (
                        <p className="text-[10px] text-emerald-600 mt-0.5">
                          Stock restored
                        </p>
                      )}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={req.tracking_status || ""}
                      disabled={updatingId === req.id}
                      onChange={(e) =>
                        handleTrackingChange(req.id, e.target.value)
                      }
                      className="px-2 py-1 border rounded bg-white dark:bg-gray-700 text-xs"
                    >
                      {TRACKING_OPTIONS.map((opt) => (
                        <option key={opt.value || "none"} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                    {req.created_at
                      ? new Date(req.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteRequest(req)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete request"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-1 border rounded-lg text-sm bg-white dark:bg-gray-700"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 border rounded disabled:opacity-40"
            >
              <FaChevronLeft />
            </button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              className="px-2 py-1 border rounded disabled:opacity-40"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeleteTarget(null);
          }}
          onConfirm={confirmDeleteRequest}
          title="Delete Wholesale Request"
          message={`Are you sure you want to delete request #${deleteTarget.id} (${deleteTarget.title})? This action cannot be undone.${deleteStockHint(deleteTarget)}`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      )}

      {previewProof && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewProof("")}
        >
          <div
            className="relative max-w-3xl w-full bg-white dark:bg-gray-900 rounded-lg p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewProof("")}
              className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-800"
              aria-label="Close"
            >
              <FaTimes />
            </button>
            <img
              src={previewProof}
              alt="Payment proof"
              className="max-h-[80vh] w-auto mx-auto rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WholesaleRequestsAdmin;
