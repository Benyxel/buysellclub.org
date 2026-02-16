import React, { useEffect, useState } from "react";
import { FaMoneyBillWave, FaCheck, FaTimes, FaHandHoldingUsd, FaSpinner, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { toast } from "../../utils/toast";
import { Api } from "../../api";

const PAGE_SIZE = 10;

const statusBadge = (status) => {
  const map = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
    paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
  };
  return map[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
};

export default function AdminVendorPayoutRequests() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState({ show: false, item: null, notes: "" });

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = { page, page_size: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      const res = await Api.adminVendorPayoutRequests.list(params, { noCache: true });
      const data = res.data;
      const list = data?.results ?? (Array.isArray(data) ? data : []);
      setRequests(list);
      setTotal(data?.count ?? list.length);
    } catch (err) {
      console.error("Failed to fetch payout requests:", err);
      toast.error("Failed to load payout requests");
      setRequests([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, page]);

  const handleApprove = async (item) => {
    try {
      setActionLoading(item.id);
      await Api.adminVendorPayoutRequests.approve(item.id);
      toast.success("Payout request approved.");
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.item) return;
    try {
      setActionLoading(rejectModal.item.id);
      await Api.adminVendorPayoutRequests.reject(rejectModal.item.id, {
        admin_notes: rejectModal.notes,
      });
      toast.success("Payout request rejected.");
      setRejectModal({ show: false, item: null, notes: "" });
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async (item) => {
    try {
      setActionLoading(item.id);
      await Api.adminVendorPayoutRequests.markPaid(item.id);
      toast.success("Marked as paid.");
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Vendor pay requests
        </h3>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <FaSpinner className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FaMoneyBillWave className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No vendor payout requests found.</p>
        </div>
        ) : (
        <>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Requested</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {r.vendor_full_name || r.vendor_username || `#${r.vendor}`}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    ₵{Number(r.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {r.payment_method === "momo" ? (
                      <span>Momo: {r.momo_number} ({r.momo_name})</span>
                    ) : (
                      <span>Bank: {r.bank_name} – {r.bank_account_number} ({r.bank_account_name})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadge(r.status)}`}>
                      {r.status}
                    </span>
                    {r.admin_notes && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs truncate" title={r.admin_notes}>
                        {r.admin_notes}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {r.requested_at ? new Date(r.requested_at).toLocaleString() : ""}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {r.status === "pending" && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleApprove(r)}
                          disabled={actionLoading === r.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-xs"
                        >
                          {actionLoading === r.id ? <FaSpinner className="animate-spin w-3 h-3" /> : <FaCheck />}
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectModal({ show: true, item: r, notes: "" })}
                          disabled={actionLoading === r.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-xs"
                        >
                          <FaTimes /> Reject
                        </button>
                      </div>
                    )}
                    {r.status === "approved" && (
                      <button
                        onClick={() => handleMarkPaid(r)}
                        disabled={actionLoading === r.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 text-xs"
                      >
                        {actionLoading === r.id ? <FaSpinner className="animate-spin w-3 h-3" /> : <FaHandHoldingUsd />}
                        Mark paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div className="flex items-center justify-between mt-3 text-sm text-gray-600 dark:text-gray-400">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FaChevronLeft /> Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * PAGE_SIZE >= total}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Next <FaChevronRight />
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {rejectModal.show && rejectModal.item && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Reject payout request</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Reject request from {rejectModal.item.vendor_full_name || rejectModal.item.vendor_username} for ₵{Number(rejectModal.item.amount).toFixed(2)}?
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note to vendor (optional)</label>
            <textarea
              value={rejectModal.notes}
              onChange={(e) => setRejectModal((m) => ({ ...m, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
              rows={3}
              placeholder="Reason for rejection..."
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectModal.item.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === rejectModal.item.id ? "Rejecting..." : "Reject"}
              </button>
              <button
                onClick={() => setRejectModal({ show: false, item: null, notes: "" })}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
