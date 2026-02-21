import React, { useEffect, useState } from "react";
import { FaSave, FaSpinner, FaCheck, FaTimes } from "react-icons/fa";
import { toast } from "../../utils/toast";
import { Api, clearCache } from "../../api";
import ConfirmModal from "../../components/shared/ConfirmModal";

const CommunityManagement = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [membershipAmount, setMembershipAmount] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [telegramLink, setTelegramLink] = useState("");
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [sheetOnlyPrice, setSheetOnlyPrice] = useState(0);
  const [sheetOnlyLabel, setSheetOnlyLabel] = useState("Suppliers only");
  const [requests, setRequests] = useState([]);
  const [previewProof, setPreviewProof] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await Api.community.settings.get();
      setMembershipAmount(Number(response.data?.membership_amount || 0));
      setSalePrice(Number(response.data?.sale_price || 0));
      setTelegramLink(response.data?.telegram_link || "");
      setGoogleSheetUrl(response.data?.google_sheet_url || "");
      setSheetOnlyPrice(Number(response.data?.sheet_only_price || 0));
      setSheetOnlyLabel(response.data?.sheet_only_label || "Suppliers only");
    } catch (error) {
      console.error("Failed to fetch community settings:", error);
      toast.error("Failed to load community settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setRequestsLoading(true);
      const response = await Api.community.adminRequests({ noCache: true });
      const payload = response.data;
      if (Array.isArray(payload)) {
        setRequests(payload);
      } else if (Array.isArray(payload?.results)) {
        setRequests(payload.results);
      } else if (Array.isArray(payload?.data)) {
        setRequests(payload.data);
      } else {
        setRequests([]);
      }
      setCurrentPage(1);
    } catch (error) {
      console.error("Failed to fetch community requests:", error);
      toast.error("Failed to load community requests");
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchRequests();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await Api.community.settings.update({
        membership_amount: membershipAmount,
        sale_price: salePrice,
        telegram_link: telegramLink,
        google_sheet_url: googleSheetUrl,
        sheet_only_price: sheetOnlyPrice,
        sheet_only_label: sheetOnlyLabel,
      });
      localStorage.setItem("communitySettingsUpdatedAt", String(Date.now()));
      toast.success("Community settings updated.");
    } catch (error) {
      console.error("Failed to update community settings:", error);
      toast.error("Failed to update community settings");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      const response = await Api.community.adminApprove(requestId);
      clearCache("admin-unread-counts");
      toast.success("Request approved.");
      if (response?.data) {
        setRequests((prev) =>
          prev.map((req) => (req.id === requestId ? response.data : req))
        );
      } else {
        fetchRequests();
      }
    } catch (error) {
      const message =
        error.response?.data?.error || "Failed to approve request";
      toast.error(message);
    }
  };

  const handleReject = async (requestId) => {
    try {
      const response = await Api.community.adminReject(requestId);
      clearCache("admin-unread-counts");
      toast.success("Request rejected.");
      if (response?.data) {
        setRequests((prev) =>
          prev.map((req) => (req.id === requestId ? response.data : req))
        );
      } else {
        fetchRequests();
      }
    } catch (error) {
      const message =
        error.response?.data?.error || "Failed to reject request";
      toast.error(message);
    }
  };

  const handleDelete = async (requestId) => {
    try {
      await Api.community.adminDelete(requestId);
      clearCache("admin-unread-counts");
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      toast.success("Request deleted.");
    } catch (error) {
      const message =
        error.response?.data?.error || "Failed to delete request";
      toast.error(message);
    }
  };

  const confirmDelete = () => {
    if (!requestToDelete) return;
    handleDelete(requestToDelete);
    setShowDeleteModal(false);
    setRequestToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="animate-spin text-4xl text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          Community Settings
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Membership Amount (GHS)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={membershipAmount}
              onChange={(e) => setMembershipAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sale Price (GHS)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Telegram Link
            </label>
            <input
              type="url"
              value={telegramLink}
              onChange={(e) => setTelegramLink(e.target.value)}
              placeholder="https://t.me/..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Google Sheet URL
            </label>
            <input
              type="url"
              value={googleSheetUrl}
              onChange={(e) => setGoogleSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sheet only price (GHS)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={sheetOnlyPrice}
              onChange={(e) => setSheetOnlyPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">For users who don&apos;t want to become members but want the sheet only.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sheet only label
            </label>
            <input
              type="text"
              value={sheetOnlyLabel}
              onChange={(e) => setSheetOnlyLabel(e.target.value)}
              placeholder="Suppliers only"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Display name shown to users (e.g. &quot;Suppliers only&quot;). Members get sheet access too.</p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FaSave />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Community Join Requests
          </h2>
        </div>
        {requestsLoading && (
          <div className="flex items-center justify-center py-4">
            <FaSpinner className="animate-spin text-3xl text-blue-600" />
          </div>
        )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Amount (GHS)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Proof
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Joined
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {requests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      No community requests yet.
                    </td>
                  </tr>
                ) : (
                  requests
                  .slice(
                    (currentPage - 1) * pageSize,
                    currentPage * pageSize
                  )
                  .map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {req.user_full_name || req.user_username || "User"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {req.user_email || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {req.request_type === "sheet_only" ? "Sheet only" : "Membership"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      ₵{Number(req.membership_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {req.proof_of_payment ? (
                        <button
                          type="button"
                          onClick={() => setPreviewProof(req.proof_of_payment)}
                          className="inline-flex items-center gap-2"
                        >
                          <img
                            src={req.proof_of_payment}
                            alt="Proof"
                            className="h-12 w-12 rounded object-cover border"
                          />
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            View
                          </span>
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">No proof</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      <select
                        value={req.status}
                        onChange={(e) => {
                          const nextStatus = e.target.value;
                          if (nextStatus === "approved") {
                            handleApprove(req.id);
                          } else if (nextStatus === "rejected") {
                            handleReject(req.id);
                          } else {
                            setRequests((prev) =>
                              prev.map((item) =>
                                item.id === req.id
                                  ? { ...item, status: nextStatus }
                                  : item
                              )
                            );
                          }
                        }}
                        className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs"
                      >
                        <option value="pending">pending</option>
                        <option value="approved">approved</option>
                        <option value="rejected">rejected</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {req.joined_at
                        ? new Date(req.joined_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {req.expires_at
                        ? new Date(req.expires_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {req.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(req.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 text-xs"
                          >
                            <FaCheck /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs"
                          >
                            <FaTimes /> Reject
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {req.status}
                          </span>
                          <button
                            onClick={() => {
                              setRequestToDelete(req.id);
                              setShowDeleteModal(true);
                            }}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
            {requests.length > pageSize && (
              <div className="flex items-center justify-between mt-4 text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Page {currentPage} of {Math.ceil(requests.length / pageSize)}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= Math.ceil(requests.length / pageSize)}
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(Math.ceil(requests.length / pageSize), prev + 1)
                      )
                    }
                    className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
      </div>

      {previewProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                Proof of Payment
              </h3>
              <button
                type="button"
                onClick={() => setPreviewProof("")}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300"
              >
                Close
              </button>
            </div>
            <div className="flex justify-center">
              <img
                src={previewProof}
                alt="Proof of Payment"
                className="max-h-[70vh] rounded-lg border"
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setRequestToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Community Request"
        message="Are you sure you want to delete this community request? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default CommunityManagement;

