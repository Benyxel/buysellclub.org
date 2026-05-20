import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "../../utils/toast";
import API from "../../api";
import { FaEnvelope, FaPaperPlane, FaUsers, FaHistory, FaSpinner, FaChevronLeft, FaChevronRight, FaImage, FaRedo, FaTrash } from "react-icons/fa";
import ConfirmModal from "../../components/shared/ConfirmModal";

const HISTORY_PAGE_SIZE = 20;

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All users" },
  { value: "with_orders", label: "Users with orders" },
  { value: "recent_signups", label: "Recent signups" },
  { value: "container", label: "Users in container" },
];
const TYPE_OPTIONS = [
  { value: "bulk", label: "Bulk email" },
  { value: "promotion", label: "Promotion email" },
];

const isActiveBulkRow = (row) =>
  row.status === "pending" ||
  row.status === "sending" ||
  (row.status === "partial" &&
    (row.sent_count || 0) < (row.total_recipients || 0));

const getVisiblePages = (currentPage, totalPages) => {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const adjustedStart = Math.max(1, end - 4);
  const pages = [];
  for (let page = adjustedStart; page <= end; page += 1) {
    pages.push(page);
  }
  return pages;
};

export default function BulkEmailAdmin() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [flyerFiles, setFlyerFiles] = useState([]);
  const [audience, setAudience] = useState("all");
  const [audienceDays, setAudienceDays] = useState(30);
  const [containerId, setContainerId] = useState("");
  const [containers, setContainers] = useState([]);
  const [containersLoading, setContainersLoading] = useState(false);
  const [emailType, setEmailType] = useState("bulk");
  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [previewCount, setPreviewCount] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bulkToDelete, setBulkToDelete] = useState(null);
  const [processingPending, setProcessingPending] = useState(false);
  const [refreshingRowIds, setRefreshingRowIds] = useState([]);
  const historyRef = useRef([]);

  const loadContainers = () => {
    setContainersLoading(true);
    API.get("/api/admin/containers", { params: { page: 1, limit: 500 } })
      .then((res) => {
        const list = res.data?.data || [];
        const eligible = (Array.isArray(list) ? list : []).filter(
          (c) => c.status !== "completed"
        );
        setContainers(eligible);
        setContainerId((prev) =>
          prev && eligible.some((c) => String(c.id) === String(prev)) ? prev : ""
        );
      })
      .catch(() => setContainers([]))
      .finally(() => setContainersLoading(false));
  };

  useEffect(() => {
    loadContainers();
  }, []);

  const loadPreview = () => {
    if (audience === "container" && !containerId) {
      setPreviewCount(null);
      return;
    }
    const params = { audience };
    if (audience === "recent_signups") params.days = audienceDays;
    if (audience === "container") params.container_id = containerId;
    API.get("/buysellapi/admin/bulk-email/", { params })
      .then((res) => setPreviewCount(res.data?.preview_count ?? null))
      .catch(() => setPreviewCount(null));
  };

  useEffect(() => {
    if (audience) loadPreview();
  }, [audience, audienceDays, containerId]);

  const loadHistory = (page = 1, { silent = false } = {}) => {
    if (!silent) setHistoryLoading(true);
    return API.get("/buysellapi/admin/bulk-email/", {
      params: { page, page_size: HISTORY_PAGE_SIZE },
    })
      .then((res) => {
        const data = res.data;
        const results = Array.isArray(data?.results) ? data.results : [];
        const count = typeof data?.count === "number" ? data.count : 0;
        const lastPage = Math.max(1, Math.ceil(count / HISTORY_PAGE_SIZE));
        if (count > 0 && page > lastPage) {
          setHistoryPage(lastPage);
          return;
        }
        setHistory(results);
        setHistoryCount(count);
      })
      .catch(() => {
        if (!silent) {
          setHistory([]);
          setHistoryCount(0);
        }
      })
      .finally(() => {
        if (!silent) setHistoryLoading(false);
      });
  };

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    loadHistory(historyPage);
  }, [historyPage]);

  const hasActiveJobs = history.some(isActiveBulkRow);

  const pollActiveRows = useCallback(() => {
    const activeIds = historyRef.current.filter(isActiveBulkRow).map((row) => row.id);
    if (activeIds.length === 0) {
      setRefreshingRowIds([]);
      return Promise.resolve();
    }
    setRefreshingRowIds(activeIds);
    return API.get("/buysellapi/admin/bulk-email/", {
      params: { page: historyPage, page_size: HISTORY_PAGE_SIZE },
    })
      .then((res) => {
        const results = Array.isArray(res.data?.results) ? res.data.results : [];
        const count = typeof res.data?.count === "number" ? res.data.count : 0;
        setHistoryCount(count);
        const updates = new Map(results.map((row) => [row.id, row]));
        setHistory((prev) => prev.map((row) => updates.get(row.id) ?? row));
      })
      .catch(() => {})
      .finally(() => setRefreshingRowIds([]));
  }, [historyPage]);

  useEffect(() => {
    if (!hasActiveJobs) return undefined;
    const timer = setInterval(() => {
      pollActiveRows();
    }, 5000);
    return () => clearInterval(timer);
  }, [hasActiveJobs, pollActiveRows]);

  const isRowRefreshing = (rowId) => refreshingRowIds.includes(rowId);

  const handleProcessPending = () => {
    setProcessingPending(true);
    API.post("/buysellapi/admin/bulk-email/process-pending/")
      .then((res) => {
        toast.success(res.data?.message || "Processing started.");
        loadHistory(historyPage, { silent: true });
      })
      .catch((err) => {
        const msg = err.response?.data?.detail || "Could not start pending jobs.";
        toast.error(msg);
      })
      .finally(() => setProcessingPending(false));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required.");
      return;
    }
    if (audience === "container" && !containerId) {
      toast.error("Select a container for container audience.");
      return;
    }
    setSending(true);
    const formData = new FormData();
    formData.append("subject", subject.trim());
    formData.append("message", message.trim());
    formData.append("audience", audience);
    if (audience === "recent_signups") formData.append("audience_days", String(audienceDays));
    if (audience === "container") formData.append("container_id", containerId);
    formData.append("email_type", emailType);
    const testEmail = testRecipientEmail.trim();
    if (testEmail && testEmail.includes("@")) formData.append("test_recipient_email", testEmail);
    flyerFiles.forEach((file) => formData.append("flyers", file));
    API.post("/buysellapi/admin/bulk-email/", formData)
      .then((res) => {
        const fallback = testEmail
          ? `Sending to ${testEmail}.`
          : `Sending to ${res.data?.total_recipients || 0} user(s) in the background.`;
        toast.success(res.data?.message || fallback);
        setSubject("");
        setMessage("");
        setFlyerFiles([]);
        setHistoryPage(1);
        loadHistory(1);
      })
      .catch((err) => {
        const msg = err.response?.data?.detail || err.response?.data?.message || "Failed to send bulk email.";
        toast.error(msg);
      })
      .finally(() => setSending(false));
  };

  const handleResend = (row) => {
    const remaining = (row.total_recipients || 0) - (row.sent_count || 0);
    if (remaining <= 0) return;
    setResendingId(row.id);
    API.post(`/buysellapi/admin/bulk-email/${row.id}/resend/`)
      .then((res) => {
        toast.success(res.data?.message || `Resending to ${remaining} recipient(s).`);
        loadHistory(historyPage, { silent: true });
      })
      .catch((err) => {
        const msg = err.response?.data?.detail || "Failed to resend.";
        toast.error(msg);
      })
      .finally(() => setResendingId(null));
  };

  const handleDelete = (row) => {
    if (row.status === "sending") {
      toast.error("You cannot delete a bulk email while it is still sending.");
      return;
    }
    setBulkToDelete(row);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!bulkToDelete?.id) return;

    setDeletingId(bulkToDelete.id);
    try {
      const res = await API.delete(`/buysellapi/admin/bulk-email/${bulkToDelete.id}/`);
      toast.success(res.data?.message || "Bulk email deleted.");
      const nextCount = Math.max(0, historyCount - 1);
      const nextPage = Math.min(historyPage, Math.max(1, Math.ceil(nextCount / HISTORY_PAGE_SIZE)));
      if (nextPage !== historyPage) {
        setHistoryPage(nextPage);
      } else {
        loadHistory(nextPage);
      }
      setShowDeleteModal(false);
      setBulkToDelete(null);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to delete bulk email.";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const canResend = (row) => {
    const total = row.total_recipients || 0;
    const sent = row.sent_count || 0;
    if (sent >= total || total === 0) return false;
    return ["sent", "partial", "failed"].includes(row.status);
  };

  const remainingCount = (row) => Math.max(0, (row.total_recipients || 0) - (row.sent_count || 0));

  const totalPages = Math.max(1, Math.ceil(historyCount / HISTORY_PAGE_SIZE));
  const visiblePages = getVisiblePages(historyPage, totalPages);

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <FaPaperPlane className="text-blue-600" />
          Send bulk or promotion email
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Emails are sent with your logo by default. Add optional images or GIFs (e.g. promotional flyers) below.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select
              value={emailType}
              onChange={(e) => setEmailType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            >
              {AUDIENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {audience === "recent_signups" && (
              <div className="mt-2">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Last N days</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={audienceDays}
                  onChange={(e) => setAudienceDays(parseInt(e.target.value, 10) || 30)}
                  className="w-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                />
              </div>
            )}
            {audience === "container" && (
              <div className="mt-2">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Container *</label>
                <select
                  value={containerId}
                  onChange={(e) => setContainerId(e.target.value)}
                  disabled={containersLoading}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                >
                  <option value="">
                    {containersLoading ? "Loading containers…" : "Select a container"}
                  </option>
                  {containers.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.container_number}
                      {c.status ? ` (${String(c.status).replace(/_/g, " ")})` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Only registered users with trackings in this container. Completed containers are not listed.
                </p>
              </div>
            )}
            {previewCount !== null && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                <FaUsers className="inline mr-1" /> {previewCount} recipient{previewCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Send to a single user (optional)
            </label>
            <input
              type="email"
              value={testRecipientEmail}
              onChange={(e) => setTestRecipientEmail(e.target.value)}
              placeholder="e.g. someone@example.com — leave empty to send to the full audience above"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Use this to send the same email (with images) to one person — for individual promotions or for testing before sending to the full list.
            </p>
            {testRecipientEmail.trim() && (
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                Only <span className="font-semibold">{testRecipientEmail.trim()}</span> will receive this email — the audience above is ignored.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              maxLength={255}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Email body..."
              rows={6}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FaImage className="inline mr-1" /> Images / flyers (optional)
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Add promotional images or GIFs. They will appear in the email above the body. PNG, JPG, GIF, WebP.
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFlyerFiles(Array.from(e.target.files || []))}
              className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300"
            />
            {flyerFiles.length > 0 && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {flyerFiles.length} file{flyerFiles.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={
              sending ||
              !subject.trim() ||
              !message.trim() ||
              (audience === "container" && !containerId)
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <FaSpinner className="animate-spin" /> : <FaEnvelope />}
            {sending ? "Sending…" : "Send email"}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <FaHistory className="text-gray-600" />
            Recent bulk emails
          </h3>
          {hasActiveJobs && (
            <button
              type="button"
              onClick={handleProcessPending}
              disabled={processingPending}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200 disabled:opacity-50"
            >
              {processingPending ? <FaSpinner className="animate-spin" /> : <FaRedo />}
              Process stuck jobs
            </button>
          )}
        </div>
        {historyLoading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No bulk emails yet.</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Date</th>
                  <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Subject</th>
                  <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Type</th>
                  <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Audience</th>
                  <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Status</th>
                  <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">Sent</th>
                  <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {history.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      isRowRefreshing(row.id) || isActiveBulkRow(row)
                        ? "bg-blue-50/40 dark:bg-blue-900/10"
                        : undefined
                    }
                  >
                    <td className="px-4 py-2 text-gray-900 dark:text-white">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-900 dark:text-white max-w-xs truncate" title={row.subject}>
                      {row.subject}
                    </td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400 capitalize">{row.email_type}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                      {row.audience === "recent_signups" && row.audience_days
                        ? `Recent (${row.audience_days}d)`
                        : row.audience === "container" && row.container_number
                        ? `Container · ${row.container_number}`
                        : row.audience?.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-2">
                      {isRowRefreshing(row.id) ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
                          <FaSpinner className="animate-spin shrink-0" />
                          <span className="capitalize">
                            {row.status === "partial" ? "partial" : row.status}
                          </span>
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            row.status === "sent"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : row.status === "partial"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              : row.status === "sending"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : row.status === "failed"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                          title={row.error_message || undefined}
                        >
                          {row.status === "partial" ? "partial" : row.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                      {isRowRefreshing(row.id) ? (
                        <span className="inline-flex items-center justify-end gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <FaSpinner className="animate-spin shrink-0" />
                          {row.sent_count} / {row.total_recipients}
                        </span>
                      ) : (
                        <>
                          {row.sent_count} / {row.total_recipients}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        {canResend(row) && (
                          <button
                            type="button"
                            onClick={() => handleResend(row)}
                            disabled={resendingId === row.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={row.error_message || `Send to ${remainingCount(row)} remaining`}
                          >
                            {resendingId === row.id ? <FaSpinner className="animate-spin" /> : <FaRedo />}
                            Send remaining ({remainingCount(row)})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          disabled={deletingId === row.id || row.status === "sending"}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={row.status === "sending" ? "Cannot delete while sending" : "Delete this bulk email"}
                        >
                          {deletingId === row.id ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 dark:border-gray-700 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {historyCount === 0 ? 0 : (historyPage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(historyPage * HISTORY_PAGE_SIZE, historyCount)} of {historyCount}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                disabled={historyPage <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <FaChevronLeft /> Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {historyPage} of {totalPages}
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {visiblePages.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setHistoryPage(page)}
                    disabled={page === historyPage}
                    className={`px-2.5 py-1.5 rounded text-sm border ${
                      page === historyPage
                        ? "border-blue-600 bg-blue-600 text-white disabled:opacity-100"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                disabled={historyPage >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Next <FaChevronRight />
              </button>
            </div>
          </div>
          </>
        )}
      </div>
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          if (deletingId) return;
          setShowDeleteModal(false);
          setBulkToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Bulk Email"
        message={`Are you sure you want to delete "${bulkToDelete?.subject || "this bulk email"}" from recent bulk emails? This action cannot be undone.`}
        confirmText={deletingId ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        type="danger"
        disabled={Boolean(deletingId)}
      />
    </div>
  );
}
