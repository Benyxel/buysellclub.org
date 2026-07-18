import React, { useEffect, useState } from "react";
import {
  FaCheck,
  FaCrown,
  FaSave,
  FaSpinner,
  FaTimes,
  FaUserPlus,
} from "react-icons/fa";
import { Api, clearCache } from "../../api";
import ConfirmModal from "../../components/shared/ConfirmModal";
import { toast } from "../../utils/toast";
import { formatCompactCount } from "../../utils/formatCompactCount";

export default function ExecutiveMembersManagement() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [membershipAmount, setMembershipAmount] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [shippingDiscountPercent, setShippingDiscountPercent] = useState(5);
  const [buy4meDiscountPercent, setBuy4meDiscountPercent] = useState(50);
  const [requests, setRequests] = useState([]);
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("settings");
  const [assignEmail, setAssignEmail] = useState("");
  const [assignContact, setAssignContact] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  const requestsPageSize = 10;
  const [paymentSummary, setPaymentSummary] = useState({
    registered: 0,
    totalCash: 0,
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await Api.executive.settings.get({ noCache: true });
      setMembershipAmount(Number(response.data?.membership_amount || 0));
      setSalePrice(Number(response.data?.sale_price || 0));
      setShippingDiscountPercent(
        Number(response.data?.shipping_discount_percent ?? 5)
      );
      setBuy4meDiscountPercent(
        Number(response.data?.buy4me_sourcing_discount_percent ?? 50)
      );
    } catch (error) {
      console.error("Failed to fetch executive settings:", error);
      toast.error("Failed to load Executive settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async (page = 1) => {
    try {
      setRequestsLoading(true);
      const response = await Api.executive.adminRequests({
        noCache: true,
        params: { page, page_size: requestsPageSize },
      });
      const payload = response.data;
      if (Array.isArray(payload?.results)) {
        setRequests(payload.results);
        setRequestsTotal(payload.count ?? payload.results.length);
      } else if (Array.isArray(payload)) {
        setRequests(payload);
        setRequestsTotal(payload.length);
      } else {
        setRequests([]);
        setRequestsTotal(0);
      }
      setCurrentPage(page);
    } catch (error) {
      console.error("Failed to fetch executive requests:", error);
      toast.error("Failed to load Executive requests");
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchRequests(1);
  }, []);

  useEffect(() => {
    if (activeTab !== "requests") return;
    let cancelled = false;
    const loadPaymentSummary = async () => {
      try {
        const response = await Api.analytics.dashboardSummary();
        if (cancelled) return;
        setPaymentSummary({
          registered: Number(response.data?.executiveTotalRegistered || 0),
          totalCash: Number(response.data?.executiveTotalCash || 0),
        });
      } catch (error) {
        console.error("Failed to load executive payment summary:", error);
      }
    };
    loadPaymentSummary();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await Api.executive.settings.update({
        membership_amount: membershipAmount,
        sale_price: salePrice,
        shipping_discount_percent: shippingDiscountPercent,
        buy4me_sourcing_discount_percent: buy4meDiscountPercent,
      });
      localStorage.setItem("executiveSettingsUpdatedAt", String(Date.now()));
      toast.success("Executive settings updated.");
    } catch (error) {
      console.error("Failed to update executive settings:", error);
      toast.error("Failed to update Executive settings");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      const response = await Api.executive.adminApprove(requestId);
      clearCache("admin-unread-counts");
      toast.success("Request approved.");
      if (response?.data) {
        setRequests((prev) =>
          prev.map((req) => (req.id === requestId ? response.data : req))
        );
      } else {
        fetchRequests(currentPage);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to approve request");
    }
  };

  const handleReject = async (requestId) => {
    try {
      const response = await Api.executive.adminReject(requestId);
      clearCache("admin-unread-counts");
      toast.success("Request rejected.");
      if (response?.data) {
        setRequests((prev) =>
          prev.map((req) => (req.id === requestId ? response.data : req))
        );
      } else {
        fetchRequests(currentPage);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to reject request");
    }
  };

  const handleDelete = async (requestId) => {
    try {
      await Api.executive.adminDelete(requestId);
      clearCache("admin-unread-counts");
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      setRequestsTotal((prev) => Math.max(0, prev - 1));
      toast.success("Request deleted.");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete request");
    }
  };

  const confirmDelete = () => {
    if (!requestToDelete) return;
    handleDelete(requestToDelete);
    setShowDeleteModal(false);
    setRequestToDelete(null);
  };

  const handleAssignMember = async (e) => {
    e?.preventDefault();
    const email = (assignEmail || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }
    setAssignLoading(true);
    try {
      await Api.executive.adminAssignMember({
        email,
        contact: (assignContact || "").trim().slice(0, 20) || undefined,
      });
      toast.success("Executive Member assigned.");
      setAssignEmail("");
      setAssignContact("");
      fetchRequests(currentPage);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to assign member.");
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/25">
          <FaCrown className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Executive Members
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Set upgrade pricing, member discounts, and manage Executive subscription requests.
          </p>
        </div>
      </div>

      <div className="mb-1 flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-700">
        {[
          { id: "settings", label: "Pricing" },
          { id: "requests", label: "Requests" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            {tab.label}
            {tab.id === "requests" && requestsTotal > 0 ? (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-white/20 px-2 py-0.5 text-xs">
                <span title={String(requestsTotal)}>
                  {formatCompactCount(requestsTotal)}
                </span>
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === "settings" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white">
            Executive Settings
          </h3>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FaSpinner className="animate-spin" />
              Loading settings...
            </div>
          ) : (
            <div className="max-w-xl space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Membership Amount (GHS)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={membershipAmount}
                  onChange={(e) => setMembershipAmount(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sale Price (GHS)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={salePrice}
                  onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Shipping fee discount (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={shippingDiscountPercent}
                    onChange={(e) =>
                      setShippingDiscountPercent(parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Applied to shipping fee invoices for Executive Members.
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Buy4Me sourcing discount (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={buy4meDiscountPercent}
                    onChange={(e) =>
                      setBuy4meDiscountPercent(parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Applied when Executive Members pay the Buy4Me sourcing fee.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 font-semibold text-white shadow-md transition-all hover:from-green-600 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-50"
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
          )}
        </div>
      )}

      {activeTab === "requests" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-xs uppercase tracking-wide text-amber-800 dark:text-amber-200">
                Approved executive members
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {paymentSummary.registered}
              </p>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
              <p className="text-xs uppercase tracking-wide text-orange-800 dark:text-orange-200">
                Executive payments
              </p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                ₵{Number(paymentSummary.totalCash || 0).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Executive Upgrade Requests
            </h2>
            <form
              onSubmit={handleAssignMember}
              className="flex flex-wrap items-end gap-2"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Assign member (email)
                </label>
                <input
                  type="email"
                  value={assignEmail}
                  onChange={(e) => setAssignEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="min-w-[200px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Contact (optional)
                </label>
                <input
                  type="text"
                  value={assignContact}
                  onChange={(e) => setAssignContact(e.target.value)}
                  placeholder="Phone"
                  maxLength={20}
                  className="min-w-[120px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={assignLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {assignLoading ? <FaSpinner className="animate-spin" /> : <FaUserPlus />}
                Assign as Executive
              </button>
            </form>
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
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">
                    Amount (GHS)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">
                    Joined
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {requests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      No Executive upgrade requests yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
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
                        Executive
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        ₵{Number(req.membership_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize text-gray-700 dark:text-gray-300">
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
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
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
                              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                            >
                              <FaCheck /> Approve
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                            >
                              <FaTimes /> Reject
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
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

            {requestsTotal > requestsPageSize && (
              <div className="mt-4 flex items-center justify-between px-1 text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Page {currentPage} of{" "}
                  <span
                    title={String(
                      Math.ceil(requestsTotal / requestsPageSize) || 1
                    )}
                  >
                    {formatCompactCount(
                      Math.ceil(requestsTotal / requestsPageSize) || 1
                    )}
                  </span>
                  {requestsTotal > 0 && (
                    <span className="ml-2">
                      (
                      <span title={String(requestsTotal)}>
                        {formatCompactCount(requestsTotal)}
                      </span>{" "}
                      total)
                    </span>
                  )}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => fetchRequests(currentPage - 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={
                      currentPage >= Math.ceil(requestsTotal / requestsPageSize)
                    }
                    onClick={() => fetchRequests(currentPage + 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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
        title="Delete Executive Request"
        message="Are you sure you want to delete this Executive upgrade request? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
