import React, { useState, useEffect, useCallback, Fragment } from "react";
import { FaMotorcycle, FaSpinner, FaMapMarkerAlt, FaBroadcastTower } from "react-icons/fa";
import { toast } from "../../utils/toast";
import API from "../../api";
import DeliveryLiveMap from "./DeliveryLiveMap";

function normalizeList(resp) {
  const d = resp?.data;
  if (d && typeof d === "object" && "results" in d) {
    return Array.isArray(d.results) ? d.results : [];
  }
  if (Array.isArray(d)) return d;
  return [];
}

const RIDER_STATUS_OPTIONS = [
  { value: "in_progress", label: "In progress" },
  { value: "arrived", label: "Arrived" },
  { value: "cancelled", label: "Cancelled" },
];

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function statusLabel(s) {
  return String(s || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Rider profile tab: jobs assigned by admin (`assigned_rider` = this user).
 */
const ProfileRiderWorkspace = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [draftStatus, setDraftStatus] = useState({});
  /** @type {number | null} */
  const [expandedJobId, setExpandedJobId] = useState(null);
  /** @type {{ lat: number, lng: number } | null} */
  const [liveGps, setLiveGps] = useState(null);
  const [otpDraft, setOtpDraft] = useState({});
  const [confirmingId, setConfirmingId] = useState(null);

  const shallowEqualJobs = (a, b) => {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const ja = a[i];
      const jb = b[i];
      if (!ja || !jb) return false;
      if (ja.id !== jb.id) return false;
      if ((ja.updated_at || "") !== (jb.updated_at || "")) return false;
      if ((ja.status || "") !== (jb.status || "")) return false;
    }
    return true;
  };

  const loadJobs = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (!silent) setLoadError(null);
    try {
      const resp = await API.get("/buysellapi/users/me/rider-delivery-requests/", {
        params: { page_size: 100 },
        cacheDuration: 30000,
      });
      const list = normalizeList(resp);
      setJobs((prev) => (shallowEqualJobs(prev, list) ? prev : list));
      // Don't clobber rider selections on every poll; only fill missing defaults.
      setDraftStatus((prev) => {
        const next = { ...prev };
        let changed = false;
        list.forEach((j) => {
          if (!(j.id in next)) {
            next[j.id] = j.status;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    } catch (err) {
      const status = err.response?.status;
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Could not load assigned deliveries.";
      if (status === 403) {
        setLoadError(
          typeof msg === "string"
            ? msg
            : "This tab is only for company riders. Ask an admin to enable rider on your account."
        );
      } else {
        setLoadError(typeof msg === "string" ? msg : "Could not load assigned deliveries.");
      }
      setJobs([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Auto refresh rider jobs (no manual refresh needed).
  useEffect(() => {
    const t = setInterval(() => {
      loadJobs({ silent: true });
    }, 30000);
    return () => clearInterval(t);
  }, [loadJobs]);

  useEffect(() => {
    if (!expandedJobId) {
      setLiveGps(null);
      return undefined;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("This browser does not support GPS location.");
      setExpandedJobId(null);
      return undefined;
    }
    let lastPostAt = 0;
    const postLocation = (la, ln) => {
      const now = Date.now();
      if (now - lastPostAt < 4500) return;
      lastPostAt = now;
      API.post(
        `/buysellapi/users/me/rider-delivery-requests/${expandedJobId}/location/`,
        { latitude: Number(la).toFixed(7), longitude: Number(ln).toFixed(7) },
        { noCache: true }
      ).catch((err) => {
        if (err.response?.status === 429) return;
        const data = err.response?.data;
        const msg =
          (Array.isArray(data?.non_field_errors) && data.non_field_errors[0]) ||
          data?.detail ||
          data?.latitude?.[0] ||
          data?.longitude?.[0];
        if (typeof msg === "string") {
          toast.error(msg);
        }
      });
    };
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLiveGps({ lat: latitude, lng: longitude });
        postLocation(latitude, longitude);
      },
      () => {
        toast.error(
          "Could not read GPS. Allow location access for this site and try again."
        );
      },
      { enableHighAccuracy: true, maximumAge: 8000 }
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
      setLiveGps(null);
    };
  }, [expandedJobId]);

  const saveStatus = async (jobId) => {
    const next = draftStatus[jobId];
    if (!next) {
      toast.error("Pick a status.");
      return;
    }
    const job = jobs.find((j) => j.id === jobId);
    if (job && job.status === next) {
      toast.info("No change to save.");
      return;
    }
    setSavingId(jobId);
    try {
      await API.patch(
        `/buysellapi/users/me/rider-delivery-requests/${jobId}/`,
        { status: next },
        { noCache: true }
      );
      toast.success("Status updated.");
      loadJobs();
    } catch (err) {
      const data = err.response?.data;
      const msg =
        data?.detail ||
        data?.error ||
        (typeof data?.status === "object" && data?.status?.[0]) ||
        "Could not update status.";
      toast.error(typeof msg === "string" ? msg : "Could not update status.");
    } finally {
      setSavingId(null);
    }
  };

  const confirmDeliveryOtp = async (jobId) => {
    const otp = String(otpDraft[jobId] || "").trim();
    if (!/^\d{4}$/.test(otp)) {
      toast.error("Enter the 4-digit OTP from the customer.");
      return;
    }
    setConfirmingId(jobId);
    try {
      await API.post(
        `/buysellapi/users/me/rider-delivery-requests/${jobId}/confirm-delivery/`,
        { otp },
        { noCache: true }
      );
      toast.success("Delivery confirmed.");
      setOtpDraft((d) => ({ ...d, [jobId]: "" }));
      loadJobs();
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.detail || data?.otp?.[0] || "Could not confirm delivery.";
      toast.error(typeof msg === "string" ? msg : "Could not confirm delivery.");
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
            <FaMotorcycle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-semibold text-gray-800 dark:text-white">
              Rider deliveries
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
              Requests appear here when an admin assigns you in{" "}
              <strong>Admin → Delivery → Requests</strong>. You can set status to{" "}
              <strong>In progress</strong>, <strong>Delivered</strong>, or{" "}
              <strong>Cancelled</strong>.
            </p>
          </div>
        </div>
        <span className="shrink-0" />
      </div>

      {loadError && (
        <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/25 rounded-lg px-3 py-2">
          {loadError}
        </p>
      )}

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Request
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Client
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                CBM
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Route
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Update
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  <FaSpinner className="w-6 h-6 animate-spin inline mr-2" />
                  Loading assignments…
                </td>
              </tr>
            ) : jobs.length === 0 && !loadError ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-14 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No assigned deliveries yet. When an admin assigns you to a request, it
                  will show here automatically.
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  No rows to show.
                </td>
              </tr>
            ) : (
              jobs.map((j) => (
                <Fragment key={j.id}>
                <tr className="align-top hover:bg-gray-50 dark:hover:bg-gray-900/30">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    <span className="font-mono font-semibold">#{j.id}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {formatWhen(j.created_at)}
                    </span>
                    <span className="sm:hidden block text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {j.customer_full_name || j.customer_username} ·{" "}
                      <span className="capitalize">{statusLabel(j.status)}</span>
                    </span>
                    <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Day-of phone: {j.contact_phone || "—"}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-medium">
                      {j.customer_full_name || j.customer_username}
                    </span>
                    <span className="block text-xs text-gray-500">@{j.customer_username}</span>
                    {j.customer_contact ? (
                      <span className="block text-xs mt-1">{j.customer_contact}</span>
                    ) : null}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-sm font-mono text-gray-800 dark:text-gray-200">
                    {j.cbm}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[220px]">
                    <span className="flex items-start gap-1 text-blue-900 dark:text-blue-300">
                      <FaMapMarkerAlt className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>Drop-off: {j.dropoff_address}</span>
                    </span>
                    {j.package_note ? (
                      <p className="mt-2 text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-2">
                        Note: {j.package_note}
                      </p>
                    ) : null}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-sm capitalize text-gray-800 dark:text-gray-200 whitespace-nowrap">
                    {statusLabel(j.status)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {j.status === "delivered" || j.status === "cancelled" ? (
                      <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                    ) : (
                      <div className="flex flex-col items-end gap-2 min-w-[140px]">
                        {(j.status === "assigned" ||
                          j.status === "in_progress" ||
                          j.status === "arrived") && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedJobId((id) => (id === j.id ? null : j.id))
                            }
                            className="w-full max-w-[180px] inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200 text-xs font-medium hover:bg-orange-50 dark:hover:bg-orange-950/40"
                          >
                            <FaBroadcastTower className="w-3 h-3" />
                            {expandedJobId === j.id ? "Close details" : "Live / OTP"}
                          </button>
                        )}
                        <select
                          value={draftStatus[j.id] ?? j.status}
                          onChange={(e) =>
                            setDraftStatus((d) => ({ ...d, [j.id]: e.target.value }))
                          }
                          className="w-full max-w-[180px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-900 dark:text-white"
                        >
                          <option value={j.status}>
                            {statusLabel(j.status)} (current)
                          </option>
                          {RIDER_STATUS_OPTIONS.filter((o) => o.value !== j.status).map(
                            (o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            )
                          )}
                        </select>
                        <button
                          type="button"
                          disabled={
                            savingId === j.id ||
                            (draftStatus[j.id] ?? j.status) === j.status ||
                            !["in_progress", "arrived", "cancelled"].includes(
                              draftStatus[j.id] ?? ""
                            )
                          }
                          onClick={() => saveStatus(j.id)}
                          className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-40"
                        >
                          {savingId === j.id ? "Saving…" : "Save status"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                {expandedJobId === j.id &&
                (j.status === "assigned" ||
                j.status === "in_progress" ||
                j.status === "arrived") ? (
                  <tr className="bg-gray-50 dark:bg-gray-900/40">
                    <td colSpan={6} className="px-4 py-4 space-y-3">
                      {j.status !== "arrived" ? (
                        <>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Your position is sent to the server every few seconds so the customer
                            can see you on the map. Keep this tab open while you are on the way.
                          </p>
                          {liveGps ? (
                            <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
                              GPS: {liveGps.lat.toFixed(5)}, {liveGps.lng.toFixed(5)}
                            </p>
                          ) : (
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              Acquiring GPS…
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="rounded-lg border border-pink-200 dark:border-pink-800 bg-pink-50/60 dark:bg-pink-950/20 px-3 py-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Confirm delivery with OTP
                          </p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                            Ask the customer for the <strong>4-digit code</strong> shown in their delivery screen,
                            then enter it below to mark this job as delivered.
                          </p>
                          <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-center">
                            <input
                              value={otpDraft[j.id] ?? ""}
                              onChange={(e) =>
                                setOtpDraft((d) => ({ ...d, [j.id]: e.target.value }))
                              }
                              inputMode="numeric"
                              maxLength={4}
                              placeholder="1234"
                              className="w-full sm:w-40 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-mono text-gray-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => confirmDeliveryOtp(j.id)}
                              disabled={confirmingId === j.id}
                              className="px-4 py-2 rounded-md bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 disabled:opacity-50"
                            >
                              {confirmingId === j.id ? "Confirming…" : "Confirm & deliver"}
                            </button>
                          </div>
                        </div>
                      )}
                      <DeliveryLiveMap
                        height={300}
                        pickup={{
                          lat: j.pickup_latitude,
                          lng: j.pickup_longitude,
                        }}
                        dropoff={{
                          lat: j.dropoff_latitude,
                          lng: j.dropoff_longitude,
                        }}
                        rider={liveGps}
                      />
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default ProfileRiderWorkspace;
