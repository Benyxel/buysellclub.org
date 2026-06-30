import React, { useEffect, useState } from "react";
import { FaSave, FaSpinner, FaCheck, FaTimes, FaUserPlus, FaEnvelope } from "react-icons/fa";
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
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [previewProof, setPreviewProof] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const requestsPageSize = 10;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState("settings"); // 'settings' | 'requests'
  const [winningItems, setWinningItems] = useState([]);
  const [winningLoading, setWinningLoading] = useState(false);
  const [tutorialItems, setTutorialItems] = useState([]);
  const [tutorialLoading, setTutorialLoading] = useState(false);
  const [resourceItems, setResourceItems] = useState([]);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [editingWinningId, setEditingWinningId] = useState(null);
  const [editingWinningItem, setEditingWinningItem] = useState(null);
  const [newWinning, setNewWinning] = useState({
    title: "",
    video_url: "",
    description: "",
    platform: "",
    moq: "",
    product_link: "",
  });
  const [editingTutorialId, setEditingTutorialId] = useState(null);
  const [editingTutorialItem, setEditingTutorialItem] = useState(null);
  const [newTutorial, setNewTutorial] = useState({
    title: "",
    video_url: "",
    description: "",
    level: "",
    duration: "",
    category: "",
  });
  const [newResource, setNewResource] = useState({
    title: "",
    url: "",
    description: "",
    file_type: "",
    category: "",
  });
  const [assignEmail, setAssignEmail] = useState("");
  const [assignContact, setAssignContact] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [resendLoadingId, setResendLoadingId] = useState(null);
  const [paymentSummary, setPaymentSummary] = useState({
    registered: 0,
    totalCash: 0,
  });

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

  const fetchRequests = async (page = 1) => {
    try {
      setRequestsLoading(true);
      const response = await Api.community.adminRequests({
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
      } else if (Array.isArray(payload?.data)) {
        setRequests(payload.data);
        setRequestsTotal(payload.data.length);
      } else {
        setRequests([]);
        setRequestsTotal(0);
      }
      setCurrentPage(page);
    } catch (error) {
      console.error("Failed to fetch community requests:", error);
      toast.error("Failed to load community requests");
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
          registered: Number(response.data?.communityTotalRegistered || 0),
          totalCash: Number(response.data?.communityTotalCash || 0),
        });
      } catch (error) {
        console.error("Failed to load community payment summary:", error);
      }
    };
    loadPaymentSummary();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const fetchWinning = async () => {
    try {
      setWinningLoading(true);
      const { data } = await Api.communityContent.winningProducts.adminList();
      setWinningItems(Array.isArray(data) ? data : data?.results || []);
    } catch (error) {
      console.error("Failed to fetch winning products:", error);
      if (error.response?.status === 404) {
        setWinningItems([]);
      } else {
        toast.error("Failed to load winning products");
      }
    } finally {
      setWinningLoading(false);
    }
  };

  const fetchTutorials = async () => {
    try {
      setTutorialLoading(true);
      const { data } = await Api.communityContent.tutorials.adminList();
      setTutorialItems(Array.isArray(data) ? data : data?.results || []);
    } catch (error) {
      console.error("Failed to fetch tutorials:", error);
      if (error.response?.status === 404) {
        setTutorialItems([]);
      } else {
        toast.error("Failed to load tutorials");
      }
    } finally {
      setTutorialLoading(false);
    }
  };

  const fetchResources = async () => {
    try {
      setResourceLoading(true);
      const { data } = await Api.communityContent.resources.adminList();
      setResourceItems(Array.isArray(data) ? data : data?.results || []);
    } catch (error) {
      console.error("Failed to fetch resources:", error);
      if (error.response?.status === 404) {
        setResourceItems([]);
      } else {
        toast.error("Failed to load tools & downloads");
      }
    } finally {
      setResourceLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "winning") {
      fetchWinning();
    } else if (activeTab === "tutorials") {
      fetchTutorials();
    } else if (activeTab === "tools") {
      fetchResources();
    }
  }, [activeTab]);

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
        fetchRequests(currentPage);
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
        fetchRequests(currentPage);
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
      setRequestsTotal((prev) => Math.max(0, prev - 1));
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

  const handleAssignMember = async (e) => {
    e?.preventDefault();
    const email = (assignEmail || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }
    setAssignLoading(true);
    try {
      await Api.community.adminAssignMember({
        email,
        contact: (assignContact || "").trim().slice(0, 20) || undefined,
      });
      toast.success("Member assigned. Set-password link sent to their email.");
      setAssignEmail("");
      setAssignContact("");
      fetchRequests(currentPage);
    } catch (error) {
      const message =
        error.response?.data?.error || "Failed to assign member.";
      toast.error(message);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleResendSetPasswordLink = async (requestId) => {
    setResendLoadingId(requestId);
    try {
      await Api.community.adminResendSetPasswordLink(requestId);
      toast.success("Set-password link sent to the user's email.");
    } catch (error) {
      const message =
        error.response?.data?.error || "Failed to send link.";
      toast.error(message);
    } finally {
      setResendLoadingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Submenu / tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-3 mb-1">
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === "settings"
              ? "bg-primary text-white shadow-sm"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === "requests"
              ? "bg-primary text-white shadow-sm"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Requests
          {requestsTotal > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full bg-white/20">
              {requestsTotal}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("winning")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === "winning"
              ? "bg-primary text-white shadow-sm"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Winning products
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tutorials")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === "tutorials"
              ? "bg-primary text-white shadow-sm"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Video tutorials
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tools")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === "tools"
              ? "bg-primary text-white shadow-sm"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Tools &amp; downloads
        </button>
        {loading && (
          <span className="ml-2 inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <FaSpinner className="animate-spin" />
            Loading settings...
          </span>
        )}
      </div>

      {activeTab === "settings" && (
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
      )}

      {activeTab === "requests" && (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/20 p-4">
            <p className="text-xs uppercase tracking-wide text-cyan-800 dark:text-cyan-200">
              Approved members
            </p>
            <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
              {paymentSummary.registered}
            </p>
          </div>
          <div className="rounded-xl border border-lime-200 dark:border-lime-800 bg-lime-50 dark:bg-lime-900/20 p-4">
            <p className="text-xs uppercase tracking-wide text-lime-800 dark:text-lime-200">
              Community payments (CommunityPayment)
            </p>
            <p className="text-2xl font-bold text-lime-700 dark:text-lime-300">
              ₵{Number(paymentSummary.totalCash || 0).toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Community Join Requests
          </h2>
          <form
            onSubmit={handleAssignMember}
            className="flex flex-wrap items-end gap-2"
          >
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Assign member (email)
              </label>
              <input
                type="email"
                value={assignEmail}
                onChange={(e) => setAssignEmail(e.target.value)}
                placeholder="user@example.com"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm min-w-[200px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Contact (optional)
              </label>
              <input
                type="text"
                value={assignContact}
                onChange={(e) => setAssignContact(e.target.value)}
                placeholder="Phone"
                maxLength={20}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm min-w-[120px]"
              />
            </div>
            <button
              type="submit"
              disabled={assignLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {assignLoading ? <FaSpinner className="animate-spin" /> : <FaUserPlus />}
              Assign as member
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
                      colSpan={7}
                      className="px-4 py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      No community requests yet.
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
                      {req.request_type === "sheet_only" ? "Sheet only" : "Membership"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      ₵{Number(req.membership_amount || 0).toFixed(2)}
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
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {req.status}
                          </span>
                          {req.status === "approved" && (
                            <button
                              type="button"
                              onClick={() => handleResendSetPasswordLink(req.id)}
                              disabled={resendLoadingId === req.id}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs disabled:opacity-50"
                              title="Resend set-password link to user's email"
                            >
                              {resendLoadingId === req.id ? (
                                <FaSpinner className="animate-spin" />
                              ) : (
                                <FaEnvelope />
                              )}
                              Resend link
                            </button>
                          )}
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
              <div className="flex items-center justify-between mt-4 px-1 text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Page {currentPage} of {Math.ceil(requestsTotal / requestsPageSize) || 1}
                  {requestsTotal > 0 && (
                    <span className="ml-2">
                      ({requestsTotal} total)
                    </span>
                  )}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => fetchRequests(currentPage - 1)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= Math.ceil(requestsTotal / requestsPageSize)}
                    onClick={() => fetchRequests(currentPage + 1)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
      </div>
      )}

      {activeTab === "winning" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Winning Products – videos
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={newWinning.title}
                onChange={(e) =>
                  setNewWinning((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm"
                placeholder="e.g. iPhone case winning product"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Video URL or embed URL
              </label>
              <input
                type="url"
                value={newWinning.video_url}
                onChange={(e) =>
                  setNewWinning((prev) => ({
                    ...prev,
                    video_url: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm"
                placeholder="https://www.youtube.com/..."
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              rows={3}
              value={newWinning.description}
              onChange={(e) =>
                setNewWinning((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Platform
              </label>
              <input
                type="text"
                value={newWinning.platform}
                onChange={(e) =>
                  setNewWinning((prev) => ({ ...prev, platform: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm"
                placeholder="e.g. 1688, AliExpress"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                MOQ
              </label>
              <input
                type="text"
                value={newWinning.moq}
                onChange={(e) =>
                  setNewWinning((prev) => ({ ...prev, moq: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm"
                placeholder="e.g. 10 pieces, 100 units"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product link
              </label>
              <input
                type="url"
                value={newWinning.product_link}
                onChange={(e) =>
                  setNewWinning((prev) => ({
                    ...prev,
                    product_link: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm"
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mb-6">
            {editingWinningId && (
              <button
                type="button"
                onClick={() => {
                  setEditingWinningId(null);
                  setEditingWinningItem(null);
                  setNewWinning({
                    title: "",
                    video_url: "",
                    description: "",
                    platform: "",
                    moq: "",
                    product_link: "",
                  });
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                if (!newWinning.video_url) {
                  toast.error("Video URL is required.");
                  return;
                }
                try {
                  setWinningLoading(true);
                  if (editingWinningId) {
                    const payload = editingWinningItem
                      ? { ...editingWinningItem, ...newWinning }
                      : newWinning;
                    await Api.communityContent.winningProducts.update(
                      editingWinningId,
                      payload
                    );
                    setEditingWinningId(null);
                    setEditingWinningItem(null);
                    toast.success("Winning product updated.");
                  } else {
                    const payload = {
                      title: newWinning.title || "",
                      description: newWinning.description || "",
                      platform: newWinning.platform || "",
                      moq: newWinning.moq || "",
                      video_url: newWinning.video_url?.trim() || null,
                      embed_url: newWinning.embed_url?.trim() || null,
                      product_link: newWinning.product_link?.trim() || null,
                    };
                    await Api.communityContent.winningProducts.create(payload);
                    setNewWinning({
                      title: "",
                      video_url: "",
                      description: "",
                      platform: "",
                      moq: "",
                      product_link: "",
                    });
                    toast.success("Winning product video added.");
                  }
                  await fetchWinning();
                } catch (error) {
                  console.error(
                    editingWinningId
                      ? "Failed to update winning product"
                      : "Failed to create winning product",
                    error
                  );
                  toast.error(
                    editingWinningId
                      ? "Failed to update winning product"
                      : "Failed to create winning product"
                  );
                } finally {
                  setWinningLoading(false);
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              disabled={winningLoading}
            >
              {winningLoading && (
                <FaSpinner className="animate-spin w-4 h-4" />
              )}
              <span>{editingWinningId ? "Update" : "Add video"}</span>
            </button>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            {winningLoading && winningItems.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <FaSpinner className="animate-spin text-2xl text-primary" />
              </div>
            ) : winningItems.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No winning product videos yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {winningItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-sm bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {item.title || "Untitled winning product"}
                      </p>
                      {item.video_url && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {item.video_url}
                        </p>
                      )}
                      {(item.platform || item.moq || item.product_link) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {[item.platform, item.moq].filter(Boolean).join(" · ")}
                          {item.product_link && " · Product link"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWinningId(item.id);
                          setEditingWinningItem(item);
                          setNewWinning({
                            title: item.title || "",
                            video_url: item.video_url || "",
                            description: item.description || "",
                            platform: item.platform || "",
                            moq: item.moq || "",
                            product_link: item.product_link || "",
                          });
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await Api.communityContent.winningProducts.remove(
                              item.id
                            );
                            if (editingWinningId === item.id) {
                              setEditingWinningId(null);
                              setEditingWinningItem(null);
                              setNewWinning({
                                title: "",
                                video_url: "",
                                description: "",
                                platform: "",
                                moq: "",
                                product_link: "",
                              });
                            }
                            setWinningItems((prev) =>
                              prev.filter((x) => x.id !== item.id)
                            );
                          } catch (error) {
                            console.error("Failed to delete item:", error);
                            toast.error("Failed to delete item");
                          }
                        }}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === "tutorials" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Video tutorials
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={newTutorial.title}
                onChange={(e) =>
                  setNewTutorial((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Video URL or embed URL
              </label>
              <input
                type="url"
                value={newTutorial.video_url}
                onChange={(e) =>
                  setNewTutorial((prev) => ({
                    ...prev,
                    video_url: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Level (e.g. Beginner)
              </label>
              <input
                type="text"
                value={newTutorial.level}
                onChange={(e) =>
                  setNewTutorial((prev) => ({ ...prev, level: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Duration (e.g. 10 min)
              </label>
              <input
                type="text"
                value={newTutorial.duration}
                onChange={(e) =>
                  setNewTutorial((prev) => ({
                    ...prev,
                    duration: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category (optional)
              </label>
              <input
                type="text"
                value={newTutorial.category}
                onChange={(e) =>
                  setNewTutorial((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={newTutorial.description}
              onChange={(e) =>
                setNewTutorial((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 mb-6">
            {editingTutorialId && (
              <button
                type="button"
                onClick={() => {
                  setEditingTutorialId(null);
                  setEditingTutorialItem(null);
                  setNewTutorial({
                    title: "",
                    video_url: "",
                    description: "",
                    level: "",
                    duration: "",
                    category: "",
                  });
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                if (!newTutorial.video_url) {
                  toast.error("Video URL is required.");
                  return;
                }
                try {
                  setTutorialLoading(true);
                  if (editingTutorialId) {
                    const payload = editingTutorialItem
                      ? { ...editingTutorialItem, ...newTutorial }
                      : newTutorial;
                    await Api.communityContent.tutorials.update(
                      editingTutorialId,
                      payload
                    );
                    setEditingTutorialId(null);
                    setEditingTutorialItem(null);
                    toast.success("Tutorial updated.");
                  } else {
                    await Api.communityContent.tutorials.create(newTutorial);
                    setNewTutorial({
                      title: "",
                      video_url: "",
                      description: "",
                      level: "",
                      duration: "",
                      category: "",
                    });
                    toast.success("Tutorial added.");
                  }
                  await fetchTutorials();
                } catch (error) {
                  console.error(
                    editingTutorialId
                      ? "Failed to update tutorial"
                      : "Failed to create tutorial",
                    error
                  );
                  toast.error(
                    editingTutorialId
                      ? "Failed to update tutorial"
                      : "Failed to create tutorial"
                  );
                } finally {
                  setTutorialLoading(false);
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              disabled={tutorialLoading}
            >
              {tutorialLoading && (
                <FaSpinner className="animate-spin w-4 h-4" />
              )}
              <span>{editingTutorialId ? "Update" : "Add tutorial"}</span>
            </button>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            {tutorialLoading && tutorialItems.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <FaSpinner className="animate-spin text-2xl text-primary" />
              </div>
            ) : tutorialItems.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No tutorials yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {tutorialItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-sm bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {item.title || "Untitled tutorial"}
                      </p>
                      {item.video_url && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {item.video_url}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTutorialId(item.id);
                          setEditingTutorialItem(item);
                          setNewTutorial({
                            title: item.title || "",
                            video_url: item.video_url || "",
                            description: item.description || "",
                            level: item.level || "",
                            duration: item.duration || "",
                            category: item.category || "",
                          });
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await Api.communityContent.tutorials.remove(
                              item.id
                            );
                            if (editingTutorialId === item.id) {
                              setEditingTutorialId(null);
                              setEditingTutorialItem(null);
                              setNewTutorial({
                                title: "",
                                video_url: "",
                                description: "",
                                level: "",
                                duration: "",
                                category: "",
                              });
                            }
                            setTutorialItems((prev) =>
                              prev.filter((x) => x.id !== item.id)
                            );
                          } catch (error) {
                            console.error("Failed to delete item:", error);
                            toast.error("Failed to delete item");
                          }
                        }}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === "tools" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Tools &amp; downloads
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={newResource.title}
                onChange={(e) =>
                  setNewResource((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                File URL (Google Drive or any direct link)
              </label>
              <input
                type="url"
                value={newResource.url}
                onChange={(e) =>
                  setNewResource((prev) => ({
                    ...prev,
                    url: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm"
                placeholder="https://drive.google.com/... or https://..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Paste a Google Drive share link (Anyone with the link). Files will be offered as direct download so users do not need to sign in.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                File type (e.g. PDF, XLSX)
              </label>
              <input
                type="text"
                value={newResource.file_type}
                onChange={(e) =>
                  setNewResource((prev) => ({
                    ...prev,
                    file_type: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category (optional)
              </label>
              <input
                type="text"
                value={newResource.category}
                onChange={(e) =>
                  setNewResource((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={newResource.description}
              onChange={(e) =>
                setNewResource((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white text-sm"
            />
          </div>
          <div className="flex justify-end mb-6">
            <button
              type="button"
              onClick={async () => {
                if (!newResource.url) {
                  toast.error("File URL is required.");
                  return;
                }
                try {
                  setResourceLoading(true);
                  await Api.communityContent.resources.create(newResource);
                  setNewResource({
                    title: "",
                    url: "",
                    description: "",
                    file_type: "",
                    category: "",
                  });
                  await fetchResources();
                  toast.success("Resource added.");
                } catch (error) {
                  console.error("Failed to create resource:", error);
                  toast.error("Failed to create resource");
                } finally {
                  setResourceLoading(false);
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              disabled={resourceLoading}
            >
              {resourceLoading && (
                <FaSpinner className="animate-spin w-4 h-4" />
              )}
              <span>Add resource</span>
            </button>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            {resourceLoading && resourceItems.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <FaSpinner className="animate-spin text-2xl text-primary" />
              </div>
            ) : resourceItems.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No tools or downloads yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {resourceItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-sm bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {item.title || item.filename || "Unnamed resource"}
                      </p>
                      {item.url && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {item.url}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await Api.communityContent.resources.remove(item.id);
                          setResourceItems((prev) =>
                            prev.filter((x) => x.id !== item.id)
                          );
                        } catch (error) {
                          console.error("Failed to delete item:", error);
                          toast.error("Failed to delete item");
                        }
                      }}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

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

