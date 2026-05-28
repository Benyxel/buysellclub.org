import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaClipboardList, FaSpinner, FaTruck } from "react-icons/fa";
import API from "../../../api";
import { toast } from "../../../utils/toast";

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

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(iso);
  }
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_transit", label: "In transit" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function BulkOutsideAccraRequestsPanel() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalReq, setModalReq] = useState(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const [editStatus, setEditStatus] = useState("pending");
  const [editVip, setEditVip] = useState(false);
  const [editCarNumber, setEditCarNumber] = useState("");
  const [editDriverContact, setEditDriverContact] = useState("");

  const loadRequests = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = { page: page, page_size: pageSize };
      if (statusFilter !== "all") params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      const resp = await API.get("/buysellapi/admin/bulk-delivery-outside-accra/", {
        params,
        cacheDuration: 30000,
      });
      const list = normalizeList(resp);
      setRows(list);
      setTotalCount(Number(resp?.data?.count || list.length || 0));
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Could not load bulk delivery requests.";
      toast.error(typeof msg === "string" ? msg : "Could not load bulk delivery requests.");
      setRows([]);
      setTotalCount(0);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter, page, pageSize, debouncedSearch]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(String(search || "").trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const openEdit = (r) => {
    setModalReq(r);
    setEditStatus(r.status || "pending");
    setEditVip(Boolean(r.is_vip_parcel));
    setEditCarNumber(r.car_number || "");
    setEditDriverContact(r.driver_contact || "");
  };

  const save = async () => {
    if (!modalReq) return;
    setSaving(true);
    try {
      await API.patch(`/buysellapi/admin/bulk-delivery-outside-accra/${modalReq.id}/`, {
        status: editStatus,
        is_vip_parcel: Boolean(editVip),
        car_number: editVip ? "" : String(editCarNumber || "").trim(),
        driver_contact: editVip ? "" : String(editDriverContact || "").trim(),
      });
      toast.success("Bulk delivery request updated.");
      setModalReq(null);
      await loadRequests({ silent: true });
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Could not update request.";
      toast.error(typeof msg === "string" ? msg : "Could not update request.");
    } finally {
      setSaving(false);
    }
  };

  const counts = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const k = String(r.status || "pending");
      map.set(k, (map.get(k) || 0) + 1);
    }
    return map;
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / (pageSize || 1)));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FaTruck className="text-blue-600" />
            Bulk Delivery (Outside Accra)
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Requests from customers who have already paid shipping for a container.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadRequests()}
          className="text-sm font-semibold text-primary hover:underline"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex-1 min-w-[220px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search: username, mark, container, phone, location…"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Status:
        </label>
        <select
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All ({totalCount})</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} ({counts.get(o.value) || 0})
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Per page:
          </label>
          <select
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <FaSpinner className="animate-spin" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-gray-600 dark:text-gray-300">
          No bulk delivery requests.
        </div>
      ) : (
        <>
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Mark ID</th>
                <th className="px-4 py-3 text-left font-semibold">Container</th>
                <th className="px-4 py-3 text-left font-semibold">Bulk date</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.map((r) => (
                <tr key={r.id} className="text-gray-800 dark:text-gray-100">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{r.customer_full_name || "—"}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {r.customer_username || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold">
                    {r.shipping_mark || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {r.container_number || `#${r.container}`}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(r.container_bulk_delivery_date)}
                  </td>
                  <td className="px-4 py-3">
                    {String(r.status || "").replace(/_/g, " ")}
                    {r.is_vip_parcel ? (
                      <span className="ml-2 text-xs font-bold text-purple-700 dark:text-purple-200 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-full">
                        VIP Parcel
                      </span>
                    ) : null}
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                      Submitted: {formatWhen(r.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                    >
                      <FaClipboardList />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="sm:hidden space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white truncate">
                    {r.customer_full_name || "—"}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
                    {r.customer_username || "—"}
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Mark ID
                  </div>
                  <div className="font-mono font-semibold text-gray-900 dark:text-white break-all">
                    {r.shipping_mark || "—"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                  <FaClipboardList />
                  Review
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Container</div>
                  <div className="font-mono font-semibold text-gray-900 dark:text-white">
                    {r.container_number || `#${r.container}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Bulk date</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {formatDate(r.container_bulk_delivery_date)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {String(r.status || "").replace(/_/g, " ")}
                    {r.is_vip_parcel ? (
                      <span className="ml-2 inline-flex text-xs font-bold text-purple-700 dark:text-purple-200 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-full">
                        VIP Parcel
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                    Submitted: {formatWhen(r.created_at)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 text-sm text-gray-700 dark:text-gray-200">
        <div>
          Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> (total{" "}
          <strong>{totalCount}</strong>)
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {modalReq ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl shadow-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
              <div className="font-bold text-gray-800 dark:text-white">
                Bulk delivery request #{modalReq.id}
              </div>
              <button
                type="button"
                onClick={() => setModalReq(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Customer</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {modalReq.customer_full_name || "—"} ({modalReq.customer_username || "—"})
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Mark ID</div>
                  <div className="font-mono font-semibold text-gray-900 dark:text-white">
                    {modalReq.shipping_mark || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Container</div>
                  <div className="font-mono font-semibold text-gray-900 dark:text-white">
                    {modalReq.container_number || `#${modalReq.container}`}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Bulk date</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {formatDate(modalReq.container_bulk_delivery_date)}
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">Location</div>
                <div className="text-sm text-gray-900 dark:text-white whitespace-pre-line">
                  {modalReq.location || "—"}
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Contact phone</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {modalReq.contact_phone || "—"}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="vipParcel"
                    type="checkbox"
                    checked={editVip}
                    onChange={(e) => setEditVip(e.target.checked)}
                  />
                  <label htmlFor="vipParcel" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    VIP Parcel
                  </label>
                </div>
              </div>

              {!editVip ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                      Car number
                    </label>
                    <input
                      type="text"
                      value={editCarNumber}
                      onChange={(e) => setEditCarNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                      Driver contact
                    </label>
                    <input
                      type="text"
                      value={editDriverContact}
                      onChange={(e) => setEditDriverContact(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  VIP Parcel selected — car number and driver contact are optional.
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                onClick={() => setModalReq(null)}
                disabled={saving}
              >
                Close
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

