import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaMapMarkerAlt } from "react-icons/fa";
import API from "../../api";
import DeliverySimpleLiveMap from "./DeliverySimpleLiveMap";
import { formatDeliveryRequestStatusLabel } from "../../utils/deliveryStatusLabel";

function hasValidLatLng(lat, lng) {
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  return Number.isFinite(la) && Number.isFinite(ln);
}

const POLL_MS = 5000;

const CustomerLiveTrackingModal = ({
  requestId,
  onClose,
  /** When true, always use full-viewport map + bottom sheet (widget / wide viewport). */
  preferBottomSheetLayout = false,
}) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!requestId) return undefined;
    let cancelled = false;

    const fetchLive = async () => {
      try {
        const resp = await API.get(
          `/buysellapi/users/me/delivery-requests/${requestId}/live-tracking/`,
          { noCache: true }
        );
        if (!cancelled) {
          setData(resp.data || null);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err.response?.data?.detail ||
            err.response?.data?.error ||
            "Could not load live tracking.";
          setError(typeof msg === "string" ? msg : "Could not load live tracking.");
          setData(null);
        }
      }
    };

    fetchLive();
    const t = setInterval(fetchLive, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [requestId]);

  const canShowMap = useMemo(() => {
    if (!data) return false;
    return hasValidLatLng(data.dropoff_latitude, data.dropoff_longitude);
  }, [data]);

  const overlay = (
    <div
      className={`fixed inset-0 z-[1210] bg-black/50 ${
        preferBottomSheetLayout ? "" : "md:flex md:items-center md:justify-center md:p-4"
      }`}
    >
      <div
        className={`bg-white dark:bg-gray-900 h-[100dvh] w-full flex flex-col overflow-hidden ${
          preferBottomSheetLayout
            ? "rounded-none border-0 shadow-none max-w-none"
            : "md:rounded-2xl md:shadow-xl md:max-w-3xl md:w-full md:max-h-[90vh] md:border md:border-gray-200 md:dark:border-gray-700 md:h-auto"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-track-title"
      >
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 relative z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur md:backdrop-blur-0">
          <h3
            id="live-track-title"
            className="text-base md:text-lg font-semibold text-gray-900 dark:text-white"
          >
            Live tracking #{requestId}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div
          className={`flex-1 min-h-0 relative ${
            preferBottomSheetLayout
              ? "overflow-hidden"
              : "md:overflow-y-auto md:px-6 md:py-5 md:space-y-3"
          }`}
        >
          {error ? (
            <p className="mx-4 mt-4 md:mx-0 text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/25 rounded-lg px-3 py-2">
              {error}
            </p>
          ) : null}

          {!data && !error ? (
            <p className="text-sm text-gray-500 py-8 text-center">Loading tracking…</p>
          ) : null}

          {data ? (
            <>
              {canShowMap ? (
                <>
                  {/* Desktop/tablet: stacked layout (hidden in widget / when preferBottomSheetLayout) */}
                  <div
                    className={`space-y-3 px-4 py-4 md:px-0 md:py-0 ${
                      preferBottomSheetLayout ? "hidden" : "hidden md:block"
                    }`}
                  >
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Status:{" "}
                      <strong className="text-gray-900 dark:text-white">
                        {formatDeliveryRequestStatusLabel(data.status)}
                      </strong>
                    </p>
                    {data.assigned_rider_full_name || data.assigned_rider_username ? (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Rider:{" "}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {data.assigned_rider_full_name || data.assigned_rider_username}
                        </span>
                      </p>
                    ) : null}
                    {data.dropoff_address ? (
                      <p className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                        <FaMapMarkerAlt className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                        <span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            Drop-off:
                          </span>{" "}
                          {data.dropoff_address}
                        </span>
                      </p>
                    ) : null}
                    {data.rider_last_location_at ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Last rider update:{" "}
                        {new Date(data.rider_last_location_at).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        Waiting for the rider to start sharing GPS.
                      </p>
                    )}

                    <DeliverySimpleLiveMap
                      pickupLatitude={data.pickup_latitude}
                      pickupLongitude={data.pickup_longitude}
                      dropoffLatitude={data.dropoff_latitude}
                      dropoffLongitude={data.dropoff_longitude}
                      riderLatitude={data.rider_last_latitude}
                      riderLongitude={data.rider_last_longitude}
                    />
                  </div>

                  {/* Full-viewport map + bottom sheet (mobile, or delivery widget on any viewport) */}
                  <div
                    className={`absolute inset-0 ${
                      preferBottomSheetLayout ? "" : "md:hidden"
                    }`}
                  >
                    <DeliverySimpleLiveMap
                      mode="mapOnly"
                      pickupLatitude={data.pickup_latitude}
                      pickupLongitude={data.pickup_longitude}
                      dropoffLatitude={data.dropoff_latitude}
                      dropoffLongitude={data.dropoff_longitude}
                      riderLatitude={data.rider_last_latitude}
                      riderLongitude={data.rider_last_longitude}
                      heightClassName="h-[100dvh]"
                      mapChromeClassName="border-0 rounded-none overflow-hidden"
                    />

                    <div
                      className={`absolute left-0 right-0 bottom-0 z-20 transition-transform duration-200 ease-out ${
                        sheetOpen ? "translate-y-0" : "translate-y-[calc(100%-72px)]"
                      }`}
                    >
                      <div className="mx-3 mb-3 rounded-2xl bg-white/95 dark:bg-gray-950/90 border border-gray-200 dark:border-gray-800 shadow-xl backdrop-blur">
                        <button
                          type="button"
                          onClick={() => setSheetOpen((v) => !v)}
                          className="w-full px-4 py-3 flex items-center justify-center"
                          aria-expanded={sheetOpen}
                          aria-label={sheetOpen ? "Collapse details" : "Expand details"}
                        >
                          <div className="h-1.5 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                        </button>
                        <div className="px-4 pb-4 max-h-[65dvh] overflow-y-auto space-y-2">
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Status:{" "}
                            <strong className="text-gray-900 dark:text-white">
                              {formatDeliveryRequestStatusLabel(data.status)}
                            </strong>
                          </p>
                          {data.assigned_rider_full_name || data.assigned_rider_username ? (
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              Rider:{" "}
                              <span className="font-medium text-gray-900 dark:text-white">
                                {data.assigned_rider_full_name || data.assigned_rider_username}
                              </span>
                            </p>
                          ) : null}
                          {data.dropoff_address ? (
                            <p className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-1">
                              <FaMapMarkerAlt className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                              <span>
                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                  Drop-off:
                                </span>{" "}
                                {data.dropoff_address}
                              </span>
                            </p>
                          ) : null}
                          {data.rider_last_location_at ? (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              Last rider update:{" "}
                              {new Date(data.rider_last_location_at).toLocaleString()}
                            </p>
                          ) : (
                            <p className="text-[11px] text-amber-800 dark:text-amber-200">
                              Waiting for the rider to start sharing GPS.
                            </p>
                          )}

                          <DeliverySimpleLiveMap
                            mode="detailsOnly"
                            pickupLatitude={data.pickup_latitude}
                            pickupLongitude={data.pickup_longitude}
                            dropoffLatitude={data.dropoff_latitude}
                            dropoffLongitude={data.dropoff_longitude}
                            riderLatitude={data.rider_last_latitude}
                            riderLongitude={data.rider_last_longitude}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
};

export default CustomerLiveTrackingModal;

