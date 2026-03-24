import React, { useState, useEffect } from "react";
import { toast } from "../../utils/toast";
import API from "../../api";
import { FaEnvelope, FaPaperPlane, FaUsers, FaHistory, FaSpinner, FaChevronLeft, FaChevronRight, FaImage, FaRedo } from "react-icons/fa";

const HISTORY_PAGE_SIZE = 20;

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All users" },
  { value: "with_orders", label: "Users with orders" },
  { value: "recent_signups", label: "Recent signups" },
];
const TYPE_OPTIONS = [
  { value: "bulk", label: "Bulk email" },
  { value: "promotion", label: "Promotion email" },
];

export default function BulkEmailAdmin() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [flyerFiles, setFlyerFiles] = useState([]);
  const [audience, setAudience] = useState("all");
  const [audienceDays, setAudienceDays] = useState(30);
  const [emailType, setEmailType] = useState("bulk");
  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [previewCount, setPreviewCount] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [resendingId, setResendingId] = useState(null);

  const loadPreview = () => {
    const params = { audience };
    if (audience === "recent_signups") params.days = audienceDays;
    API.get("/buysellapi/admin/bulk-email/", { params })
      .then((res) => setPreviewCount(res.data?.preview_count ?? null))
      .catch(() => setPreviewCount(null));
  };

  useEffect(() => {
    if (audience) loadPreview();
  }, [audience, audienceDays]);

  const loadHistory = (page = 1) => {
    setHistoryLoading(true);
    API.get("/buysellapi/admin/bulk-email/", {
      params: { page, page_size: HISTORY_PAGE_SIZE },
    })
      .then((res) => {
        const data = res.data;
        setHistory(Array.isArray(data?.results) ? data.results : []);
        setHistoryCount(typeof data?.count === "number" ? data.count : 0);
      })
      .catch(() => {
        setHistory([]);
        setHistoryCount(0);
      })
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    loadHistory(historyPage);
  }, [historyPage]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required.");
      return;
    }
    setSending(true);
    const formData = new FormData();
    formData.append("subject", subject.trim());
    formData.append("message", message.trim());
    formData.append("audience", audience);
    if (audience === "recent_signups") formData.append("audience_days", String(audienceDays));
    formData.append("email_type", emailType);
    const testEmail = testRecipientEmail.trim();
    if (testEmail && testEmail.includes("@")) formData.append("test_recipient_email", testEmail);
    flyerFiles.forEach((file) => formData.append("flyers", file));
    API.post("/buysellapi/admin/bulk-email/", formData)
      .then((res) => {
        toast.success(res.data?.message || `Sending to ${res.data?.total_recipients || 0} user(s) in the background.`);
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
        loadHistory(historyPage);
      })
      .catch((err) => {
        const msg = err.response?.data?.detail || "Failed to resend.";
        toast.error(msg);
      })
      .finally(() => setResendingId(null));
  };

  const canResend = (row) => {
    const status = row.status;
    const total = row.total_recipients || 0;
    const sent = row.sent_count || 0;
    return (status === "sent" || status === "failed") && sent < total && total > 0;
  };

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
            {previewCount !== null && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                <FaUsers className="inline mr-1" /> {previewCount} recipient{previewCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Test mode: send only to one email (optional)
            </label>
            <input
              type="email"
              value={testRecipientEmail}
              onChange={(e) => setTestRecipientEmail(e.target.value)}
              placeholder="e.g. you@example.com — leave empty to send to full audience"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
            {testRecipientEmail.trim() && (
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                Only this address will receive the email (audience is ignored).
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
            disabled={sending || !subject.trim() || !message.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <FaSpinner className="animate-spin" /> : <FaEnvelope />}
            {sending ? "Sending…" : "Send email"}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <FaHistory className="text-gray-600" />
          Recent bulk emails
        </h3>
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
                  <tr key={row.id}>
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
                        : row.audience?.replace("_", " ")}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          row.status === "sent"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : row.status === "sending"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : row.status === "failed"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                      {row.sent_count} / {row.total_recipients}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {canResend(row) && (
                        <button
                          type="button"
                          onClick={() => handleResend(row)}
                          disabled={resendingId === row.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={`Resend to ${(row.total_recipients || 0) - (row.sent_count || 0)} undelivered`}
                        >
                          {resendingId === row.id ? <FaSpinner className="animate-spin" /> : <FaRedo />}
                          Resend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {historyCount > HISTORY_PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(historyPage * HISTORY_PAGE_SIZE, historyCount)} of {historyCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <FaChevronLeft /> Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {historyPage} of {Math.ceil(historyCount / HISTORY_PAGE_SIZE)}
                </span>
                <button
                  type="button"
                  onClick={() => setHistoryPage((p) => p + 1)}
                  disabled={historyPage >= Math.ceil(historyCount / HISTORY_PAGE_SIZE)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Next <FaChevronRight />
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
