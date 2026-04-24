import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaShippingFast, FaBox, FaPen, FaMapMarkerAlt } from "react-icons/fa";
import { toast } from "../../utils/toast";
import API, { invalidateCache } from "../../api";
import {
  parseCbmNumber,
  isCbmEligibleForDelivery,
  formatCbmForInput,
} from "../../utils/deliveryContainerCbm";
import DeliveryAddressMapField from "./DeliveryAddressMapField";
import DeliveryLiveMap from "./DeliveryLiveMap";
import { buysellclubPickupFormSlice } from "../../constants/buysellclubPickupLocation";

/** Fixed pickup shown in the modal (same values as `emptyForm` / submit). */
const CLUB_PICKUP_STATIC = buysellclubPickupFormSlice();

/** Maximum package CBM eligible for local rider delivery */
export const MAX_DELIVERY_CBM = 0.1;

const LIVE_TRACK_POLL_MS = 30000;

function hasValidLatLng(lat, lng) {
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  return Number.isFinite(la) && Number.isFinite(ln);
}

/** Blocks a new "Request delivery" until admin/customer flow cancels the open request */
const ACTIVE_DELIVERY_STATUSES = new Set(["pending", "assigned", "in_progress"]);

function pickNewerRequest(a, b) {
  if (!a) return b;
  if (!b) return a;
  const ta = new Date(a.created_at || 0).getTime();
  const tb = new Date(b.created_at || 0).getTime();
  return ta >= tb ? a : b;
}

/**
 * Latest delivery request per container / orphan bulk / orphan single (by created_at).
 */
function buildLatestDeliveryRequestMaps(requests) {
  const byContainer = new Map();
  const byBulkGroup = new Map();
  const byTracking = new Map();
  if (!Array.isArray(requests)) {
    return { byContainer, byBulkGroup, byTracking };
  }
  for (const r of requests) {
    const sk = r.source_kind;
    if (sk === "container" && r.container_id != null) {
      const cid = Number(r.container_id);
      if (!Number.isFinite(cid)) continue;
      byContainer.set(cid, pickNewerRequest(byContainer.get(cid), r));
    } else if (sk === "orphan_bulk" && r.bulk_group_id != null) {
      const gid = Number(r.bulk_group_id);
      if (!Number.isFinite(gid)) continue;
      byBulkGroup.set(gid, pickNewerRequest(byBulkGroup.get(gid), r));
    } else if (sk === "orphan_single" && r.tracking_id != null) {
      const tid = Number(r.tracking_id);
      if (!Number.isFinite(tid)) continue;
      byTracking.set(tid, pickNewerRequest(byTracking.get(tid), r));
    }
  }
  return { byContainer, byBulkGroup, byTracking };
}

function formatDeliveryStatusLabel(status) {
  return String(status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Request history UI removed on purpose (keep request creation + container eligibility only).

const emptyForm = () => ({
  ...buysellclubPickupFormSlice(),
  cbm: "",
  dropoffAddress: "",
  dropoffLatitude: "",
  dropoffLongitude: "",
  packageNote: "",
  contactPhone: "",
  containerId: "",
  containerNumber: "",
  sourceKind: "manual",
  bulkGroupId: "",
  trackingId: "",
});

/**
 * Customer profile: delivery requests from container totals (≤ MAX_DELIVERY_CBM) or manual entry.
 */
const ProfileCustomerDelivery = () => {
  /** @type {null | { trackingCount: number, containers: any[], withoutContainer: any[], message?: string }} */
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [cbmLocked, setCbmLocked] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  /** @type {number | null} */
  const [liveTrackRequestId, setLiveTrackRequestId] = useState(null);
  /** @type {Record<string, unknown> | null} */
  const [liveTrackData, setLiveTrackData] = useState(null);
  const [liveTrackError, setLiveTrackError] = useState(null);

  const shallowEqualSummary = (a, b) => {
    if (a === b) return true;
    if (!a || !b) return false;
    const sig = (s) => {
      const containersSig = Array.isArray(s.containers)
        ? s.containers
            .map(
              (c) =>
                `${c?.containerId ?? ""}:${c?.containerNumber ?? ""}:${c?.totalCbm ?? ""}:${
                  c?.canRequestDelivery ? 1 : 0
                }`
            )
            .join("|")
        : "";
      const orphansSig = Array.isArray(s.withoutContainer)
        ? s.withoutContainer
            .map((r) => `${r?.rowKey ?? ""}:${r?.totalCbm ?? ""}:${r?.canRequestDelivery ? 1 : 0}`)
            .join("|")
        : "";
      return `${Number(s.trackingCount || 0)}::${String(s.message || "")}::${containersSig}::${orphansSig}`;
    };
    return sig(a) === sig(b);
  };

  const shallowEqualRequests = (a, b) => {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const ra = a[i];
      const rb = b[i];
      if (!ra || !rb) return false;
      if (ra.id !== rb.id) return false;
      if ((ra.updated_at || "") !== (rb.updated_at || "")) return false;
      if ((ra.status || "") !== (rb.status || "")) return false;
    }
    return true;
  };

  const loadSummary = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (!silent) setFetchError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setSummary(null);
        setFetchError("Sign in to load your shipments.");
        return;
      }
      const response = await API.get("/buysellapi/users/me/delivery-shipments/", {
        cacheDuration: 30000,
      });
      const body = response?.data || {};
      const next = {
        trackingCount: Number(body.trackingCount) || 0,
        containers: Array.isArray(body.containers) ? body.containers : [],
        withoutContainer: Array.isArray(body.withoutContainer)
          ? body.withoutContainer
          : [],
        message: body.message,
      };
      setSummary((prev) => (shallowEqualSummary(prev, next) ? prev : next));
    } catch (err) {
      console.error("Delivery tab: delivery-shipments fetch failed", err);
      setFetchError("Could not load delivery data. Try again later.");
      setSummary(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const loadMyRequests = useCallback(async ({ silent = false } = {}) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMyRequests([]);
      return;
    }
    if (!silent) setLoadingRequests(true);
    try {
      const resp = await API.get("/buysellapi/users/me/delivery-requests/", {
        params: { page_size: 200 },
        cacheDuration: 30000,
      });
      const d = resp?.data;
      const list = Array.isArray(d) ? d : d?.results || [];
      setMyRequests((prev) => (shallowEqualRequests(prev, list) ? prev : list));
    } catch {
      setMyRequests([]);
    } finally {
      if (!silent) setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && summary) {
      loadMyRequests();
    }
  }, [loading, summary, loadMyRequests]);

  // Auto refresh summary + requests (no manual refresh needed).
  useEffect(() => {
    const t = setInterval(() => {
      loadSummary({ silent: true });
      loadMyRequests({ silent: true });
    }, 30000);
    return () => clearInterval(t);
  }, [loadSummary, loadMyRequests]);

  useEffect(() => {
    if (liveTrackRequestId == null) {
      setLiveTrackData(null);
      setLiveTrackError(null);
      return undefined;
    }
    let cancelled = false;
    const fetchLive = async () => {
      try {
        const resp = await API.get(
          `/buysellapi/users/me/delivery-requests/${liveTrackRequestId}/live-tracking/`,
          { noCache: true }
        );
        if (!cancelled) {
          setLiveTrackData(resp.data || null);
          setLiveTrackError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err.response?.data?.detail ||
            err.response?.data?.error ||
            "Could not load live tracking.";
          setLiveTrackError(typeof msg === "string" ? msg : "Could not load live tracking.");
          setLiveTrackData(null);
        }
      }
    };
    fetchLive();
    const timer = setInterval(fetchLive, LIVE_TRACK_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [liveTrackRequestId]);

  const containers = summary?.containers ?? [];
  const orphanSummaries = summary?.withoutContainer ?? [];
  const trackingCount = summary?.trackingCount ?? 0;

  const deliveryMaps = useMemo(
    () => buildLatestDeliveryRequestMaps(myRequests),
    [myRequests]
  );

  // Always show containers returned by the shipments summary.
  // Previous behavior hid containers when latest request was delivered, which confused users
  // who still wanted to see the container rows + request history.
  const visibleContainers = useMemo(() => containers, [containers]);

  const visibleOrphans = useMemo(() => orphanSummaries, [orphanSummaries]);

  const openContainerRequest = (row) => {
    setForm({
      ...emptyForm(),
      sourceKind: "container",
      cbm: formatCbmForInput(row.totalCbm),
      containerId: row.containerId != null ? String(row.containerId) : "",
      containerNumber: row.containerNumber || "",
      packageNote: "",
    });
    setCbmLocked(true);
    setShowRequestModal(true);
  };

  const openOrphanRequest = (row) => {
    const isBulk = row.kind === "bulk_group";
    setForm({
      ...emptyForm(),
      sourceKind: isBulk ? "orphan_bulk" : "orphan_single",
      cbm: formatCbmForInput(row.totalCbm),
      bulkGroupId: isBulk && row.bulkGroupId != null ? String(row.bulkGroupId) : "",
      trackingId: row.trackingId != null ? String(row.trackingId) : "",
      packageNote: isBulk
        ? `Bulk group — ${row.detail || row.trackingNumber || "no container"}`
        : `Tracking ${row.trackingNumber || row.trackingId} — no container yet`,
    });
    setCbmLocked(true);
    setShowRequestModal(true);
  };

  const openManualRequest = () => {
    setForm(emptyForm());
    setCbmLocked(false);
    setShowRequestModal(true);
  };

  const closeModal = () => {
    setShowRequestModal(false);
    setCbmLocked(false);
    setForm(emptyForm());
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    const cbm = parseCbmNumber(form.cbm);
    if (!Number.isFinite(cbm) || cbm <= 0) {
      toast.error("Enter a valid CBM greater than zero.");
      return;
    }
    if (!isCbmEligibleForDelivery(cbm, MAX_DELIVERY_CBM)) {
      toast.error(
        `Rider delivery is only for packages up to ${MAX_DELIVERY_CBM} CBM total (inclusive).`
      );
      return;
    }
    if (!form.dropoffAddress.trim()) {
      toast.error("Drop-off address is required.");
      return;
    }
    if (!hasValidLatLng(form.dropoffLatitude, form.dropoffLongitude)) {
      toast.error(
        "Set drop-off on the map or with Use GPS so coordinates are saved."
      );
      return;
    }
    if (!String(form.contactPhone || "").trim()) {
      toast.error("Day-of contact phone is required.");
      return;
    }
    const pickup = buysellclubPickupFormSlice();
    const toIntOrNull = (v) => {
      const n = parseInt(String(v).trim(), 10);
      return Number.isFinite(n) ? n : null;
    };
    const payload = {
      cbm: String(cbm),
      source_kind: form.sourceKind || "manual",
      container_id: form.containerId ? toIntOrNull(form.containerId) : null,
      container_number: (form.containerNumber || "").trim(),
      bulk_group_id: form.bulkGroupId ? toIntOrNull(form.bulkGroupId) : null,
      tracking_id: form.trackingId ? toIntOrNull(form.trackingId) : null,
      pickup_address: pickup.pickupAddress,
      pickup_latitude: pickup.pickupLatitude,
      pickup_longitude: pickup.pickupLongitude,
      dropoff_address: form.dropoffAddress.trim(),
      dropoff_latitude: String(form.dropoffLatitude),
      dropoff_longitude: String(form.dropoffLongitude),
      package_note:
        form.sourceKind === "container"
          ? ""
          : (form.packageNote || "").trim(),
      contact_phone: (form.contactPhone || "").trim(),
    };
    setSubmitting(true);
    try {
      await API.post("/buysellapi/users/me/delivery-requests/", payload, {
        noCache: true,
      });
      toast.success("Delivery request submitted. Our team will review and assign a rider.");
      closeModal();
      invalidateCache("/buysellapi/users/me/delivery-requests/");
      invalidateCache("/buysellapi/users/me/delivery-shipments/");
      loadMyRequests();
    } catch (err) {
      const data = err.response?.data;
      const msg =
        (typeof data === "string" && data) ||
        data?.detail ||
        data?.error ||
        (Array.isArray(data?.cbm) && data.cbm[0]) ||
        (typeof data?.cbm === "string" && data.cbm) ||
        err.message ||
        "Could not submit request.";
      toast.error(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
              <FaShippingFast className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-semibold text-gray-800 dark:text-white">
                Request rider delivery
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
                We use the <strong>total CBM</strong> per <strong>container</strong>, and
                also list shipments <strong>not on a container yet</strong> when CBM is
                known. If total is <strong>≤ {MAX_DELIVERY_CBM} CBM</strong>, use{" "}
                <strong>Request delivery</strong>. Use <strong>Manual request</strong> for
                a one-off entry (still capped at {MAX_DELIVERY_CBM} CBM).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 items-center">
            <button
              type="button"
              onClick={openManualRequest}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-sm font-medium hover:opacity-90"
            >
              <FaPen className="w-4 h-4" />
              Manual request
            </button>
          </div>
        </div>

        {/* Keep the delivery tab compact: internal scroll instead of growing page. */}
        <div className="max-h-[72vh] overflow-y-auto pr-1 space-y-4">
          {fetchError && (
            <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
              {fetchError}
            </p>
          )}

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-900/30">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                Your delivery requests
              </h3>
              <span />
            </div>
            {loadingRequests ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : myRequests.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No requests yet. Submit one using the buttons below.
              </p>
            ) : (
              <ul className="space-y-2 max-h-[160px] overflow-y-auto pr-1 text-sm">
                {myRequests.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">
                      #{r.id} · {r.cbm} CBM
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 capitalize">
                      {String(r.status || "").replace(/_/g, " ")}
                    </span>
                    {r.assigned_rider_username ? (
                      <span className="text-xs text-gray-500 w-full">
                        Rider: {r.assigned_rider_full_name || r.assigned_rider_username}
                      </span>
                    ) : null}
                    {r.status === "arrived" && r.delivery_otp_code ? (
                      <div className="w-full mt-1 rounded-lg border border-pink-200 dark:border-pink-800 bg-pink-50/60 dark:bg-pink-950/20 px-3 py-2">
                        <p className="text-xs text-gray-700 dark:text-gray-300">
                          Give this <strong>4-digit OTP</strong> to the rider to confirm
                          delivery:
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-mono text-lg tracking-widest text-pink-700 dark:text-pink-300">
                            {r.delivery_otp_code}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  String(r.delivery_otp_code)
                                );
                                toast.success("OTP copied.");
                              } catch {
                                toast.info("Copy not supported on this device.");
                              }
                            }}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {(r.status === "assigned" ||
                      r.status === "in_progress" ||
                      r.status === "arrived") &&
                    r.assigned_rider_username ? (
                      <div className="w-full">
                        <button
                          type="button"
                          onClick={() => setLiveTrackRequestId(r.id)}
                          className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <FaMapMarkerAlt className="w-3 h-3" />
                          Live map — see rider moving
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!loading &&
            summary &&
            trackingCount > 0 &&
            containers.length === 0 &&
            orphanSummaries.length === 0 && (
              <p className="text-sm text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 py-2 mb-3">
                You have <strong>{trackingCount}</strong> shipment
                {trackingCount === 1 ? "" : "s"} on your account, but none have CBM set
                yet (or CBM is zero). Once admin enters CBM, rows will appear here.
              </p>
            )}

        {!loading && summary && summary.message === "no_user_profile" && (
          <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 mb-3">
            Your login is not linked to a member profile. Contact support so your
            account can be linked to your shipments.
          </p>
        )}

          <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
            <FaBox className="w-4 h-4 text-primary" />
            Your containers &amp; CBM
          </h3>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
          ) : containers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-4">
              {trackingCount === 0
                ? "No shipments are assigned to you as owner yet. Add trackings under Profile → Tracking, or ask admin to assign your shipping mark."
                : "None of your shipments are on a container yet, or container rows have no CBM. See “Not on a container yet” below if CBM exists without a container."}
            </p>
          ) : visibleContainers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-4">
              No container rows to show yet.
            </p>
          ) : (
            <div className="max-h-[260px] sm:max-h-[320px] overflow-y-auto pr-1">
              <ul className="space-y-2">
                {visibleContainers.map((row) => {
                const cid = Number(row.containerId);
                const latest = deliveryMaps.byContainer.get(cid);
                const openRequest =
                  latest && ACTIVE_DELIVERY_STATUSES.has(latest.status) ? latest : null;
                const canSubmitRequest = row.canRequestDelivery && !openRequest;
                return (
                  <li
                    key={String(row.containerId)}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50/80 dark:bg-gray-900/40"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {row.containerNumber
                          ? `Container ${row.containerNumber}`
                          : `Container #${row.containerId}`}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Your total CBM in this container:{" "}
                        <span className="font-mono font-semibold text-gray-900 dark:text-white">
                          {Number((Number(row.totalCbm) || 0).toFixed(4))}
                        </span>{" "}
                        <span className="text-gray-500">
                          (max for rider delivery: {MAX_DELIVERY_CBM})
                        </span>
                      </p>
                      {Number(row.totalCbm) <= 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          No CBM recorded on your trackings in this container yet.
                        </p>
                      )}
                      {!row.canRequestDelivery && Number(row.totalCbm) > 0 && (
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          Total exceeds {MAX_DELIVERY_CBM} CBM — rider delivery is not
                          available for this container as a single request.
                        </p>
                      )}
                      {openRequest ? (
                        <p className="text-xs text-amber-800 dark:text-amber-200 mt-2">
                          A delivery request is already open (
                          <strong>{formatDeliveryStatusLabel(openRequest.status)}</strong>
                          ). <strong>Request delivery</strong> stays off until that request
                          is <strong>cancelled</strong>.
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-1">
                      {row.canRequestDelivery ? (
                        <button
                          type="button"
                          onClick={() => openContainerRequest(row)}
                          disabled={!canSubmitRequest}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaShippingFast className="w-4 h-4" />
                          Request delivery
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-500 text-sm font-medium cursor-not-allowed"
                        >
                          Request delivery
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
              </ul>
            </div>
          )}
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">
            Not on a container yet
          </h3>
          {loading ? null : orphanSummaries.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-3 px-1">
              No CBM found on shipments without a container. CBM may still be pending
              admin entry, or trackings only exist in your device list — add them under
              Profile → <strong>Tracking</strong> so they sync here.
            </p>
          ) : visibleOrphans.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-3 px-1">
              No rows to show here yet.
            </p>
          ) : (
            <div className="max-h-[220px] sm:max-h-[280px] overflow-y-auto pr-1">
              <ul className="space-y-2">
                {visibleOrphans.map((row) => {
                const latest =
                  row.kind === "bulk_group"
                    ? deliveryMaps.byBulkGroup.get(Number(row.bulkGroupId))
                    : deliveryMaps.byTracking.get(Number(row.trackingId));
                const openRequest =
                  latest && ACTIVE_DELIVERY_STATUSES.has(latest.status) ? latest : null;
                const canSubmitRequest = row.canRequestDelivery && !openRequest;
                return (
                  <li
                    key={row.rowKey}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 bg-amber-50/40 dark:bg-amber-950/20"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {row.title}
                      </p>
                      {row.detail ? (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 font-mono truncate max-w-xl">
                          {row.detail}
                        </p>
                      ) : null}
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        CBM:{" "}
                        <span className="font-mono font-semibold text-gray-900 dark:text-white">
                          {Number((Number(row.totalCbm) || 0).toFixed(4))}
                        </span>{" "}
                        <span className="text-gray-500">(max {MAX_DELIVERY_CBM})</span>
                      </p>
                      {!row.canRequestDelivery && row.totalCbm > 0 && (
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          Above {MAX_DELIVERY_CBM} CBM — split the shipment or use standard
                          shipping for larger volume.
                        </p>
                      )}
                      {openRequest ? (
                        <p className="text-xs text-amber-800 dark:text-amber-200 mt-2">
                          A delivery request is already open (
                          <strong>{formatDeliveryStatusLabel(openRequest.status)}</strong>
                          ). <strong>Request delivery</strong> stays off until that request
                          is <strong>cancelled</strong>.
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-1">
                      {row.canRequestDelivery ? (
                        <button
                          type="button"
                          onClick={() => openOrphanRequest(row)}
                          disabled={!canSubmitRequest}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaShippingFast className="w-4 h-4" />
                          Request delivery
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500 text-sm font-medium cursor-not-allowed"
                        >
                          Request delivery
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
              </ul>
            </div>
          )}
          </div>
        </div>
      </div>

      {liveTrackRequestId != null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-track-title"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3
                id="live-track-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                Live tracking #{liveTrackRequestId}
              </h3>
              <button
                type="button"
                onClick={() => setLiveTrackRequestId(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {liveTrackError ? (
                <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/25 rounded-lg px-3 py-2">
                  {liveTrackError}
                </p>
              ) : null}
              {liveTrackData && !liveTrackError ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Status:{" "}
                    <strong className="text-gray-900 dark:text-white capitalize">
                      {String(liveTrackData.status || "").replace(/_/g, " ")}
                    </strong>
                    {liveTrackData.assigned_rider_full_name ||
                    liveTrackData.assigned_rider_username ? (
                      <>
                        {" "}
                        · Rider{" "}
                        <strong className="text-gray-900 dark:text-white">
                          {liveTrackData.assigned_rider_full_name ||
                            liveTrackData.assigned_rider_username}
                        </strong>
                      </>
                    ) : null}
                  </p>
                  {liveTrackData.rider_last_location_at ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Last rider position update:{" "}
                      {new Date(liveTrackData.rider_last_location_at).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      Waiting for the rider to start sharing GPS from their rider tab.
                    </p>
                  )}
                  <DeliveryLiveMap
                    height={320}
                    pickup={{
                      lat: liveTrackData.pickup_latitude,
                      lng: liveTrackData.pickup_longitude,
                    }}
                    dropoff={{
                      lat: liveTrackData.dropoff_latitude,
                      lng: liveTrackData.dropoff_longitude,
                    }}
                    rider={
                      liveTrackData.rider_last_latitude != null &&
                      liveTrackData.rider_last_longitude != null
                        ? {
                            lat: liveTrackData.rider_last_latitude,
                            lng: liveTrackData.rider_last_longitude,
                          }
                        : null
                    }
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Map refreshes about every {LIVE_TRACK_POLL_MS / 1000} seconds while this
                    window is open.
                  </p>
                </>
              ) : !liveTrackError ? (
                <p className="text-sm text-gray-500 py-8 text-center">Loading map…</p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delivery-req-title"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3
                id="delivery-req-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {cbmLocked
                  ? form.sourceKind === "container"
                    ? "Delivery request (container)"
                    : "Delivery request (no container)"
                  : "Manual delivery request"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmitRequest} className="px-6 py-4 space-y-4">
              {form.containerId ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Container:{" "}
                  <strong>
                    {form.containerNumber || `#${form.containerId}`}
                  </strong>
                </p>
              ) : form.sourceKind === "orphan_bulk" || form.sourceKind === "orphan_single" ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {form.packageNote}
                </p>
              ) : null}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total CBM (max {MAX_DELIVERY_CBM})
                  {cbmLocked ? (
                    <span className="ml-1 text-xs font-normal text-gray-500">
                      (from your container total)
                    </span>
                  ) : null}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  readOnly={cbmLocked}
                  value={form.cbm}
                  onChange={(e) =>
                    !cbmLocked && setForm((f) => ({ ...f, cbm: e.target.value }))
                  }
                  placeholder="e.g. 0.08"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent read-only:bg-gray-100 dark:read-only:bg-gray-900 read-only:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pickup (BuySellClub)
                </label>
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 p-3 flex gap-3">
                  <FaMapMarkerAlt className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {CLUB_PICKUP_STATIC.pickupAddress}
                    </p>
                    <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                      GPS: {CLUB_PICKUP_STATIC.pickupLatitude},{" "}
                      {CLUB_PICKUP_STATIC.pickupLongitude}
                    </p>
                  </div>
                </div>
              </div>
              <DeliveryAddressMapField
                label="Drop-off address"
                address={form.dropoffAddress}
                latitude={form.dropoffLatitude}
                longitude={form.dropoffLongitude}
                onAddressChange={(v) =>
                  setForm((f) => ({ ...f, dropoffAddress: v }))
                }
                onCoordsChange={(lat, lng) =>
                  setForm((f) => ({
                    ...f,
                    dropoffLatitude: lat,
                    dropoffLongitude: lng,
                  }))
                }
              />
              {form.sourceKind !== "container" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={form.packageNote}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, packageNote: e.target.value }))
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              ) : null}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Day-of contact phone <span className="text-rose-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={form.contactPhone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactPhone: e.target.value }))
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
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
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileCustomerDelivery;
