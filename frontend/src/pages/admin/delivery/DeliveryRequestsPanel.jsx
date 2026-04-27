import React, { useState, useEffect, useCallback } from "react";
import {
  FaClipboardList,
  FaSpinner,
  FaUserCog,
} from "react-icons/fa";
import { toast } from "../../../utils/toast";
import API from "../../../api";
import { formatDeliveryRequestStatusLabel } from "../../../utils/deliveryStatusLabel";

function normalizeList(resp) {
  const d = resp?.data;
  if (d && typeof d === "object" && "results" in d) {
    return Array.isArray(d.results) ? d.results : [];
  }
  if (Array.isArray(d)) return d;
  return [];
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function shortAddr(s, max = 48) {
  if (!s) return "—";
  const t = String(s).replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending assignment" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "On his way" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

/**
 * Admin: list customer delivery requests and assign riders / update status.
 */
const DeliveryRequestsPanel = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [riders, setRiders] = useState([]);
  const [modalReq, setModalReq] = useState(null);
  const [editRiderId, setEditRiderId] = useState("");
  const [editStatus, setEditStatus] = useState("pending");
  const [saving, setSaving] = useState(false);

  const loadRequests = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const resp = await API.get("/buysellapi/admin/delivery-requests/", {
        params,
        cacheDuration: 30000,
      });
      setRows(normalizeList(resp));
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Could not load delivery requests.";
      toast.error(typeof msg === "string" ? msg : "Could not load delivery requests.");
      setRows([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter]);

  const loadRiders = useCallback(async () => {
    try {
      const resp = await API.get("/buysellapi/users/", {
        params: { delivery_riders_only: 1, page_size: 500 },
        noCache: true,
      });
      setRiders(normalizeList(resp));
    } catch {
      setRiders([]);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Auto refresh requests (no manual refresh needed).
  useEffect(() => {
    const t = setInterval(() => {
      loadRequests({ silent: true });
    }, 30000);
    return () => clearInterval(t);
  }, [loadRequests]);

  useEffect(() => {
    loadRiders();
  }, [loadRiders]);

  const openModal = (req) => {
    setModalReq(req);
    setEditRiderId(req.assigned_rider != null ? String(req.assigned_rider) : "");
    setEditStatus(req.status || "pending");
  };

  const closeModal = () => {
    setModalReq(null);
    setEditRiderId("");
    setEditStatus("pending");
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!modalReq?.id) return;
    setSaving(true);
    try {
      const body = {
        status: editStatus,
        assigned_rider: editRiderId ? parseInt(editRiderId, 10) : null,
      };
      await API.patch(
        `/buysellapi/admin/delivery-requests/${modalReq.id}/`,
        body,
        { noCache: true }
      );
      toast.success("Delivery request updated.");
      closeModal();
      loadRequests();
    } catch (err) {
      const data = err.response?.data;
      const msg =
        data?.detail ||
        data?.error ||
        (typeof data?.assigned_rider === "object" && data?.assigned_rider?.[0]) ||
        (typeof data?.status === "object" && data?.status?.[0]) ||
        "Update failed.";
      toast.error(typeof msg === "string" ? msg : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
          Review delivery requests from clients. Assign a company rider and move the
          status as the job progresses.
        </p>
        <span className="shrink-0" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          Filter by status
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white max-w-xs"
        >
          <option value="all">All</option>
          <option value="pending">Pending assignment</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">On his way</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Request
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Day-of phone
                  </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  CBM
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rider
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Requested
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <FaSpinner className="w-6 h-6 animate-spin inline mr-2" />
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-16 text-center text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FaClipboardList className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        No delivery requests
                      </span>
                      <span className="text-sm max-w-md">
                        {statusFilter === "all"
                          ? "None submitted yet, or none match this view."
                          : "No requests match this filter."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                      #{r.id}
                      <span className="block text-xs text-gray-500 font-normal">
                        {r.source_kind || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      <span className="font-medium">
                        {r.customer_full_name || r.customer_username || `#${r.customer}`}
                      </span>
                      <span className="block text-xs text-gray-500">
                        @{r.customer_username}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-800 dark:text-gray-200">
                      {r.contact_phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-800 dark:text-gray-200">
                      {r.cbm}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[200px]">
                      <span className="block text-emerald-700 dark:text-emerald-400">
                        ↑ {shortAddr(r.pickup_address, 40)}
                      </span>
                      <span className="block text-blue-800 dark:text-blue-300 mt-0.5">
                        ↓ {shortAddr(r.dropoff_address, 40)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {formatDeliveryRequestStatusLabel(r.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {r.assigned_rider_username ? (
                        <>
                          {r.assigned_rider_full_name || r.assigned_rider_username}
                          <span className="block text-xs text-gray-500">
                            @{r.assigned_rider_username}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatWhen(r.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openModal(r)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <FaUserCog className="w-3.5 h-3.5" />
                        Assign / update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalReq && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-delivery-title"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3
                id="assign-delivery-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                Request #{modalReq.id}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 p-1"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveAssignment} className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Client:{" "}
                <strong>
                  {modalReq.customer_full_name || modalReq.customer_username}
                </strong>{" "}
                · CBM <span className="font-mono">{modalReq.cbm}</span>
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Day-of phone:{" "}
                <span className="font-mono">{modalReq.contact_phone || "—"}</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assign rider
                </label>
                <select
                  value={editRiderId}
                  onChange={(e) => setEditRiderId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">— None (unassign) —</option>
                  {riders.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.username} (@{u.username})
                    </option>
                  ))}
                </select>
                {riders.length === 0 ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    No riders in the system. Add riders under Delivery → Riders first.
                  </p>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryRequestsPanel;
