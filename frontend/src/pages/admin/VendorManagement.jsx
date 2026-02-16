import React, { useEffect, useState } from "react";
import { FaStore, FaCheck, FaTimes, FaSpinner, FaSyncAlt, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { toast } from "../../utils/toast";
import { Api } from "../../api";

const PAGE_SIZE = 10;

const BUSINESS_TYPE_LABELS = {
  individual: "Individual / Sole Proprietor",
  retail: "Retail Store",
  wholesale: "Wholesale / Distributor",
  manufacturer: "Manufacturer",
  reseller: "Reseller",
  other: "Other",
};

const statusBadge = (status) => {
  const map = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
  };
  return map[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
};

const VendorManagement = () => {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = { page, page_size: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      const res = await Api.vendor.adminList(params, { noCache: true });
      const data = res.data;
      const list = data?.results ?? (Array.isArray(data) ? data : data?.data ?? []);
      setApplications(list);
      setTotal(data?.count ?? list.length);
    } catch (err) {
      console.error("Failed to fetch vendor applications:", err);
      toast.error("Failed to load vendor applications");
      setApplications([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter, page]);

  const handleApprove = async () => {
    if (!selectedApp) return;
    try {
      setActionLoading(selectedApp.id);
      await Api.vendor.adminApprove(selectedApp.id, { admin_notes: adminNotes });
      toast.success("Vendor application approved.");
      setApplications((prev) =>
        prev.map((a) =>
          a.id === selectedApp.id ? { ...a, status: "approved" } : a
        )
      );
      setShowApproveModal(false);
      setSelectedApp(null);
      setAdminNotes("");
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to approve";
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    try {
      setActionLoading(selectedApp.id);
      await Api.vendor.adminReject(selectedApp.id, { admin_notes: adminNotes });
      toast.success("Vendor application rejected.");
      setApplications((prev) =>
        prev.map((a) =>
          a.id === selectedApp.id ? { ...a, status: "rejected" } : a
        )
      );
      setShowRejectModal(false);
      setSelectedApp(null);
      setAdminNotes("");
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to reject";
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <FaStore className="text-2xl text-primary" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              Vendor Applications
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              type="button"
              onClick={() => fetchApplications()}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Refresh"
            >
              <FaSyncAlt className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="animate-spin text-4xl text-primary" />
          </div>
        ) : applications.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 py-8 text-center">
            No vendor applications found.
          </p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Full name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Business type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Business number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Qty available</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                      {app.created_at
                        ? new Date(app.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{app.user_username || app.user}</span>
                      {app.user_email && (
                        <span className="block text-xs text-gray-500 dark:text-gray-400">{app.user_email}</span>
                      )}
                      {app.user_contact && (
                        <span className="block text-xs text-gray-500 dark:text-gray-400">{app.user_contact}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{app.full_name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{app.location || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {BUSINESS_TYPE_LABELS[app.business_type] || app.business_type || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{app.business_number || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-[200px] truncate" title={app.product_name || ""}>{app.product_name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{app.quantity_available ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadge(app.status)}`}
                      >
                        {app.status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {app.status === "pending" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedApp(app);
                              setAdminNotes(app.admin_notes || "");
                              setShowApproveModal(true);
                            }}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {actionLoading === app.id ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedApp(app);
                              setAdminNotes(app.admin_notes || "");
                              setShowRejectModal(true);
                            }}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {actionLoading === app.id ? <FaSpinner className="animate-spin" /> : <FaTimes />}
                            Reject
                          </button>
                        </div>
                      )}
                      {app.status !== "pending" && app.approved_at && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(app.approved_at).toLocaleDateString()}
                          {app.approved_by_username && ` by ${app.approved_by_username}`}
                        </span>
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
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FaChevronLeft /> Prev
                </button>
                <button
                  type="button"
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
      </div>

      {/* Approve modal */}
      {showApproveModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Approve vendor application</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Approve application from <strong>{selectedApp.full_name}</strong> ({selectedApp.user_username})?
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin notes (optional)</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm mb-4"
              rows={2}
              placeholder="Optional notes"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowApproveModal(false); setSelectedApp(null); setAdminNotes(""); }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={actionLoading !== null}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading === selectedApp.id ? <FaSpinner className="animate-spin inline" /> : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Reject vendor application</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Reject application from <strong>{selectedApp.full_name}</strong> ({selectedApp.user_username})?
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin notes (optional)</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm mb-4"
              rows={2}
              placeholder="Optional notes (e.g. reason for rejection)"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowRejectModal(false); setSelectedApp(null); setAdminNotes(""); }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading !== null}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === selectedApp.id ? <FaSpinner className="animate-spin inline" /> : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorManagement;
