import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaTruck, FaSpinner, FaExternalLinkAlt, FaCalendarAlt } from "react-icons/fa";
import { toast } from "../../utils/toast";
import { apiErrorMessage } from "../../utils/apiErrorMessage";
import api, { Api } from "../../api";

function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(dateString);
  }
}

function formatDayAndDate(dateString) {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(dateString);
  }
}

function normalizeMark(raw) {
  const s = String(raw || "");
  const idx = s.indexOf(":");
  return idx === -1 ? s : s.slice(0, idx).trim();
}

function isPaidInvoice(inv) {
  return String(inv?.status || "").toLowerCase() === "paid";
}

export default function ProfileBulkDeliveryOutsideAccra({ shippingMarkId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [requests, setRequests] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [form, setForm] = useState({
    container: "",
    location: "",
    contact_phone: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, reqRes] = await Promise.all([
        Api.invoices.meList(),
        api.get("/buysellapi/me/bulk-delivery-outside-accra/", {
          params: { page: page, page_size: pageSize },
          noCache: true,
          cacheDuration: 0,
        }),
      ]);
      setInvoices(invRes.data?.results || []);
      const list = reqRes.data?.results || reqRes.data || [];
      setRequests(list);
      setTotalCount(Number(reqRes.data?.count || list.length || 0));
    } catch (e) {
      console.error("Bulk delivery load failed", e);
      const status = e?.response?.status;
      const extra =
        status != null ? ` (HTTP ${status})` : "";
      toast.error(
        apiErrorMessage(
          e?.response?.data,
          `Failed to load bulk delivery info${extra}`
        )
      );
      setInvoices([]);
      setRequests([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Paid containers still open for a new bulk request.
   * Hide if admin marked bulk complete, or an active/delivered request exists.
   */
  const eligibleContainers = useMemo(() => {
    const activeRequestStatuses = new Set([
      "pending",
      "scheduled",
      "in_transit",
      "delivered",
    ]);
    const requestedIds = new Set();
    for (const r of requests || []) {
      const status = String(r?.status || "").toLowerCase();
      if (!activeRequestStatuses.has(status)) continue;
      const cid = r?.container?.id ?? r?.container;
      if (cid != null && cid !== "") requestedIds.add(String(cid));
    }

    const byId = new Map();
    for (const inv of invoices) {
      if (!isPaidInvoice(inv)) continue;
      const cid = inv?.container?.id ?? inv?.container;
      if (cid == null || cid === "") continue;
      const key = String(cid);
      if (inv.container_bulk_delivery_outside_accra_completed) continue;
      if (requestedIds.has(key)) continue;
      if (byId.has(key)) continue;
      byId.set(key, {
        id: cid,
        container_number:
          inv.container_number ||
          inv?.container?.container_number ||
          `Container #${cid}`,
      });
    }
    return Array.from(byId.values()).sort((a, b) =>
      String(a.container_number).localeCompare(String(b.container_number))
    );
  }, [invoices, requests]);

  const paidContainerCount = useMemo(() => {
    const ids = new Set();
    for (const inv of invoices) {
      if (!isPaidInvoice(inv)) continue;
      const cid = inv?.container?.id ?? inv?.container;
      if (cid != null && cid !== "") ids.add(String(cid));
    }
    return ids.size;
  }, [invoices]);

  const allInvoiceContainers = useMemo(() => {
    // Containers seen on invoices (any status). Used for announcements.
    const byId = new Map();
    for (const inv of invoices) {
      if (!inv?.container) continue;
      const key = String(inv.container);
      if (byId.has(key)) continue;
      byId.set(key, {
        id: inv.container,
        container_number: inv.container_number || `Container #${inv.container}`,
        status: String(inv.status || "").toLowerCase(),
      });
    }
    return Array.from(byId.values()).sort((a, b) =>
      String(a.container_number).localeCompare(String(b.container_number))
    );
  }, [invoices]);

  const paidInvoicesByContainer = useMemo(() => {
    const map = new Map();
    for (const inv of invoices) {
      if (!isPaidInvoice(inv)) continue;
      const cid = inv.container ? String(inv.container) : "";
      if (!cid) continue;
      if (!map.has(cid)) map.set(cid, inv);
    }
    return map;
  }, [invoices]);

  const containerScheduleDate = useMemo(() => {
    const completedIds = new Set();
    for (const inv of invoices || []) {
      if (!inv?.container_bulk_delivery_outside_accra_completed) continue;
      const cid = inv?.container?.id ?? inv?.container;
      if (cid != null && cid !== "") completedIds.add(String(cid));
    }

    // Prefer schedule date from the request payload if present.
    const map = new Map();
    for (const r of requests || []) {
      const cid = r?.container?.id ?? r?.container;
      if (cid == null || cid === "") continue;
      const key = String(cid);
      if (completedIds.has(key)) continue;
      map.set(key, r.container_bulk_delivery_date || null);
    }
    // Fallback: show announced container schedule date even if user has no request yet.
    for (const inv of invoices || []) {
      const cid = inv?.container?.id ?? inv?.container;
      if (cid == null || cid === "") continue;
      const key = String(cid);
      if (completedIds.has(key)) continue;
      if (map.has(key) && map.get(key)) continue;
      if (inv.container_bulk_delivery_outside_accra_date) {
        map.set(key, inv.container_bulk_delivery_outside_accra_date);
      }
    }
    return map;
  }, [requests, invoices]);

  const upcomingAnnouncements = useMemo(() => {
    const completedIds = new Set();
    for (const inv of invoices || []) {
      if (!inv?.container_bulk_delivery_outside_accra_completed) continue;
      const cid = inv?.container?.id ?? inv?.container;
      if (cid != null && cid !== "") completedIds.add(String(cid));
    }

    const out = [];
    for (const c of allInvoiceContainers) {
      const key = String(c.id);
      if (completedIds.has(key)) continue;
      const d = containerScheduleDate.get(key);
      if (!d) continue;
      out.push({ ...c, date: d });
    }
    // Most recent first
    return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [allInvoiceContainers, containerScheduleDate, invoices]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.container) {
      toast.error("Please select a container");
      return;
    }
    if (!String(form.location || "").trim()) {
      toast.error("Please enter delivery location");
      return;
    }
    if (!String(form.contact_phone || "").trim()) {
      toast.error("Please enter an active calling contact");
      return;
    }

    setSaving(true);
    try {
      await api.post("/buysellapi/me/bulk-delivery-outside-accra/", {
        container: Number(form.container),
        location: String(form.location || "").trim(),
        contact_phone: String(form.contact_phone || "").trim(),
      });
      toast.success("Bulk delivery request submitted.");
      setForm({ container: "", location: "", contact_phone: "" });
      setPage(1);
      await load();
    } catch (e2) {
      console.error("Bulk delivery submit failed", e2);
      const status = e2?.response?.status;
      const extra =
        status != null ? ` (HTTP ${status})` : "";
      toast.error(
        apiErrorMessage(
          e2?.response?.data,
          `Failed to submit request${extra}`
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const markForLink = (inv) => normalizeMark(inv?.shipping_mark || shippingMarkId || "");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <h2 className="text-base sm:text-xl font-semibold text-gray-800 dark:text-white">
            Bulk Delivery (Outside Accra)
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Request free bulk delivery after you’ve paid shipping for a container.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="text-sm font-semibold text-primary hover:underline"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <FaSpinner className="animate-spin" />
          Loading…
        </div>
      ) : (
        <>
          {upcomingAnnouncements.length > 0 ? (
            <div className="border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
              <div className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-2">
                Bulk delivery announcement
              </div>
              <div className="space-y-1 text-sm text-blue-900/90 dark:text-blue-100/90">
                {upcomingAnnouncements.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-3">
                    <div className="font-semibold">
                      {row.container_number}{" "}
                      {row.status && row.status !== "paid" ? (
                        <span className="ml-2 text-xs font-semibold text-blue-900/70 dark:text-blue-100/70">
                          ({row.status})
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <FaCalendarAlt className="text-blue-700 dark:text-blue-200" />
                      {formatDate(row.date)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-blue-900/70 dark:text-blue-100/70 mt-2">
                Bulk delivery will be done on:{" "}
                <strong>
                  {formatDayAndDate(upcomingAnnouncements[0]?.date)}
                </strong>
              </div>
            </div>
          ) : null}

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-gray-800 dark:text-white font-semibold mb-3">
              <FaTruck />
              Submit a request
            </div>

            {eligibleContainers.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {paidContainerCount > 0
                  ? "All paid containers already have a bulk delivery request or are marked completed."
                  : "No paid shipping invoices found yet. Once you pay your shipping for a container, you can request bulk delivery here."}
              </div>
            ) : (
              <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Container (paid)
                  </label>
                  <select
                    value={form.container}
                    onChange={(e) => setForm((p) => ({ ...p, container: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select container…</option>
                    {eligibleContainers.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.container_number}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {eligibleContainers.length} available
                    {paidContainerCount > eligibleContainers.length
                      ? ` · ${paidContainerCount - eligibleContainers.length} already requested/completed`
                      : ""}
                  </div>
                  {form.container && containerScheduleDate.get(String(form.container)) ? (
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-2">
                      <FaCalendarAlt className="text-gray-500" />
                      Bulk delivery date:{" "}
                      {formatDate(containerScheduleDate.get(String(form.container)))}
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Active calling contact
                  </label>
                  <input
                    type="text"
                    value={form.contact_phone}
                    onChange={(e) => setForm((p) => ({ ...p, contact_phone: e.target.value }))}
                    placeholder="e.g. +23354..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <textarea
                    rows={3}
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    placeholder="Town, landmark, address details…"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-white rounded-lg font-semibold disabled:opacity-50"
                  >
                    {saving ? "Submitting..." : "Submit request"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/40 text-gray-700 dark:text-gray-200 font-semibold">
              Your requests
            </div>
            {(!requests || requests.length === 0) ? (
              <div className="p-4 text-sm text-gray-600 dark:text-gray-300">
                No bulk delivery requests yet.
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Container</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Bulk date</th>
                      <th className="px-4 py-3 text-left font-semibold">Delivery info</th>
                      <th className="px-4 py-3 text-right font-semibold">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {requests.map((r) => {
                      const inv = paidInvoicesByContainer.get(String(r.container));
                      const vip = Boolean(r.is_vip_parcel);
                      return (
                        <tr key={r.id} className="text-gray-800 dark:text-gray-100">
                          <td className="px-4 py-3 font-mono font-semibold">
                            {r.container_number || `#${r.container}`}
                          </td>
                          <td className="px-4 py-3">
                            {String(r.status || "").replace(/_/g, " ") || "—"}
                            {vip ? (
                              <span className="ml-2 text-xs font-bold text-purple-700 dark:text-purple-200 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-full">
                                VIP Parcel
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {formatDate(r.container_bulk_delivery_date)}
                          </td>
                          <td className="px-4 py-3">
                            {vip ? (
                              <span className="text-gray-700 dark:text-gray-200">
                                VIP Parcel selected
                              </span>
                            ) : (
                              <div className="text-xs text-gray-700 dark:text-gray-200 space-y-0.5">
                                <div>Car: {r.car_number || "—"}</div>
                                <div>Driver: {r.driver_contact || "—"}</div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {inv?.invoice_number ? (
                              <Link
                                to={`/invoice?invoice_number=${encodeURIComponent(
                                  inv.invoice_number
                                )}&mark_id=${encodeURIComponent(markForLink(inv))}`}
                                className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                              >
                                View
                                <FaExternalLinkAlt className="text-xs" />
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden p-4 space-y-3">
                  {requests.map((r) => {
                    const inv = paidInvoicesByContainer.get(String(r.container));
                    const vip = Boolean(r.is_vip_parcel);
                    return (
                      <div
                        key={r.id}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Container
                            </div>
                            <div className="font-mono font-semibold text-gray-900 dark:text-white truncate">
                              {r.container_number || `#${r.container}`}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Status
                            </div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {String(r.status || "").replace(/_/g, " ") || "—"}
                            </div>
                            {vip ? (
                              <div className="mt-1 inline-flex text-xs font-bold text-purple-700 dark:text-purple-200 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-full">
                                VIP Parcel
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Bulk date
                            </div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {formatDate(r.container_bulk_delivery_date)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Delivery
                            </div>
                            <div className="text-gray-900 dark:text-white font-semibold">
                              {vip ? "VIP Parcel" : "Bulk"}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Delivery info
                            </div>
                            {vip ? (
                              <div className="text-gray-900 dark:text-white">
                                VIP Parcel selected
                              </div>
                            ) : (
                              <div className="text-gray-900 dark:text-white">
                                Car: {r.car_number || "—"} · Driver: {r.driver_contact || "—"}
                              </div>
                            )}
                          </div>
                          <div className="col-span-2 flex justify-end">
                            {inv?.invoice_number ? (
                              <Link
                                to={`/invoice?invoice_number=${encodeURIComponent(
                                  inv.invoice_number
                                )}&mark_id=${encodeURIComponent(markForLink(inv))}`}
                                className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                              >
                                View invoice
                                <FaExternalLinkAlt className="text-xs" />
                              </Link>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400 text-sm">
                                Invoice not available
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 text-sm text-gray-700 dark:text-gray-200">
            <div>
              Showing page <strong>{page}</strong> of{" "}
              <strong>{Math.max(1, Math.ceil((totalCount || 0) / (pageSize || 1)))}</strong>{" "}
              (total <strong>{totalCount}</strong>)
            </div>
            <div className="flex items-center gap-2">
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
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
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
                onClick={() =>
                  setPage((p) =>
                    Math.min(
                      Math.max(1, Math.ceil((totalCount || 0) / (pageSize || 1))),
                      p + 1
                    )
                  )
                }
                disabled={page >= Math.max(1, Math.ceil((totalCount || 0) / (pageSize || 1)))}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

