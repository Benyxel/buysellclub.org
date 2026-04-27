import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { FaMotorcycle, FaStore, FaUserCircle } from "react-icons/fa";
import { ACCRA_MAP_CENTER, isLatLngInAccraBounds } from "../../constants/accraDeliveryMapBounds";

function parsePos(lat, lng) {
  const la = parseFloat(String(lat ?? ""));
  const ln = parseFloat(String(lng ?? ""));
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return { lat: la, lng: ln };
}

/** Great-circle distance in meters (for smooth progress without hammering Routes API). */
function haversineMeters(a, b) {
  if (!a || !b) return null;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δφ = toRad(b.lat - a.lat);
  const Δλ = toRad(b.lng - a.lng);
  const s =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

function formatDistanceMeters(m) {
  if (m == null || !Number.isFinite(m)) return null;
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function IconMarker({ position, title, className, children }) {
  if (!position) return null;
  return (
    <AdvancedMarker position={position} title={title}>
      <div
        className={`w-9 h-9 rounded-full border border-white shadow-md flex items-center justify-center ${className}`}
      >
        {children}
      </div>
    </AdvancedMarker>
  );
}

/**
 * Renders pickup→drop-off using Google's DirectionsRenderer (native route line on the map).
 * Custom markers stay on; default A/B markers are suppressed.
 */
function NativeDirectionsRouteLine({ pickupPos, dropoffPos }) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");

  useEffect(() => {
    if (!map || !routesLib || !pickupPos || !dropoffPos) return undefined;

    const DirectionsService = routesLib.DirectionsService;
    const DirectionsRenderer = routesLib.DirectionsRenderer;
    if (!DirectionsService || !DirectionsRenderer) return undefined;

    const service = new DirectionsService();
    const renderer = new DirectionsRenderer({
      map,
      suppressMarkers: true,
      preserveViewport: true,
    });

    let cancelled = false;

    service.route(
      {
        origin: pickupPos,
        destination: dropoffPos,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (cancelled) return;
        if (status === google.maps.DirectionsStatus.OK && result) {
          renderer.setDirections(result);
        } else {
          renderer.setMap(null);
        }
      }
    );

    return () => {
      cancelled = true;
      renderer.setMap(null);
    };
  }, [map, routesLib, pickupPos.lat, pickupPos.lng, dropoffPos.lat, dropoffPos.lng]);

  return null;
}

function useAnimatedLatLng(target, { durationMs = 900 } = {}) {
  const [animated, setAnimated] = useState(target);
  const fromRef = useRef(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!target) {
      setAnimated(null);
      fromRef.current = null;
      return;
    }

    const from = animated || target;
    fromRef.current = from;
    startRef.current = performance.now();
    cancelAnimationFrame(rafRef.current);

    const tick = (now) => {
      const t = Math.min(1, (now - startRef.current) / durationMs);
      const lat = from.lat + (target.lat - from.lat) * t;
      const lng = from.lng + (target.lng - from.lng) * t;
      setAnimated({ lat, lng });
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.lat, target?.lng]);

  return animated;
}

function useLegMetrics({ origin, destination, throttleMs = 1500 }) {
  const routesLib = useMapsLibrary("routes");
  const [durationText, setDurationText] = useState(null);
  const [durationSeconds, setDurationSeconds] = useState(null);
  const [distanceText, setDistanceText] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const lastReqRef = useRef(0);

  const oLat = origin?.lat;
  const oLng = origin?.lng;
  const dLat = destination?.lat;
  const dLng = destination?.lng;

  useEffect(() => {
    if (!routesLib || oLat == null || oLng == null || dLat == null || dLng == null) {
      setDurationText(null);
      setDurationSeconds(null);
      setDistanceText(null);
      setDistanceMeters(null);
      return undefined;
    }

    const originLL = { lat: oLat, lng: oLng };
    const destLL = { lat: dLat, lng: dLng };

    let cancelled = false;
    let timeoutId = 0;

    const execute = async () => {
      lastReqRef.current = Date.now();
      try {
        const { routes } = await routesLib.Route.computeRoutes({
          origin: originLL,
          destination: destLL,
          travelMode: google.maps.TravelMode.DRIVING,
          fields: ["distanceMeters", "durationMillis"],
        });
        if (cancelled) return;
        const r0 = routes?.[0];
        const dm = typeof r0?.distanceMeters === "number" ? r0.distanceMeters : null;
        const durMs = typeof r0?.durationMillis === "number" ? r0.durationMillis : null;

        setDistanceMeters(dm);
        setDurationSeconds(durMs != null ? Math.round(durMs / 1000) : null);

        if (dm != null) {
          setDistanceText(formatDistanceMeters(dm));
        } else {
          setDistanceText(null);
        }

        if (durMs != null) {
          const mins = Math.max(1, Math.round(durMs / 60000));
          setDurationText(mins >= 60 ? `${Math.floor(mins / 60)} hr ${mins % 60} min` : `${mins} min`);
        } else {
          setDurationText(null);
        }
      } catch {
        if (cancelled) return;
        setDurationText(null);
        setDurationSeconds(null);
        setDistanceText(null);
        setDistanceMeters(null);
      }
    };

    const schedule = () => {
      const elapsed = Date.now() - lastReqRef.current;
      const wait = Math.max(0, throttleMs - elapsed);
      if (wait === 0) {
        void execute();
      } else {
        timeoutId = window.setTimeout(() => {
          if (!cancelled) void execute();
        }, wait);
      }
    };

    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [dLat, dLng, oLat, oLng, routesLib, throttleMs]);

  return { durationText, durationSeconds, distanceText, distanceMeters };
}

/**
 * Minimal embedded Google map for delivery live tracking.
 * Shows pickup, drop-off, rider markers, and a route line (when available).
 */
function DeliverySimpleLiveMapInner({
  pickupPos,
  dropoffPos,
  riderPos,
  center,
  mapId,
  heightClassName,
  mapChromeClassName,
  showMap = true,
  showDetails = true,
}) {
  const geocodingLib = useMapsLibrary("geocoding");
  const geocoder = useMemo(
    () => (geocodingLib ? new geocodingLib.Geocoder() : null),
    [geocodingLib]
  );

  const animatedRiderPos = useAnimatedLatLng(riderPos);
  // Use raw GPS for Routes API — animated marker updates every frame and broke throttle + rarely refreshed ETA.
  const riderToDropoff = useLegMetrics({
    origin: riderPos,
    destination: dropoffPos,
    throttleMs: 900,
  });
  const pickupToDropoff = useLegMetrics({
    origin: pickupPos,
    destination: dropoffPos,
    throttleMs: 60000,
  });

  const straightPickToDrop = useMemo(
    () => (pickupPos && dropoffPos ? haversineMeters(pickupPos, dropoffPos) : null),
    [pickupPos, dropoffPos]
  );
  const straightRiderToDrop = useMemo(() => {
    const p = animatedRiderPos || riderPos;
    return p && dropoffPos ? haversineMeters(p, dropoffPos) : null;
  }, [animatedRiderPos, riderPos, dropoffPos]);
  /** Smooth progress 0–100 from straight-line geometry (motor moves with the marker). */
  const progressPct = useMemo(() => {
    if (!straightPickToDrop || straightPickToDrop <= 0) return null;
    if (straightRiderToDrop == null || !Number.isFinite(straightRiderToDrop)) return 0;
    return Math.max(0, Math.min(100, (1 - straightRiderToDrop / straightPickToDrop) * 100));
  }, [straightPickToDrop, straightRiderToDrop]);

  const displayRiderDistanceText =
    riderToDropoff.distanceText ||
    (riderPos && dropoffPos ? formatDistanceMeters(haversineMeters(riderPos, dropoffPos)) : null);

  const [pickupLabel, setPickupLabel] = useState("Pickup");
  useEffect(() => {
    if (!geocoder || !pickupPos) return undefined;
    let cancelled = false;
    geocoder.geocode({ location: pickupPos }, (results, status) => {
      if (cancelled) return;
      if (status === "OK" && results?.[0]?.formatted_address) {
        setPickupLabel(results[0].formatted_address);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [geocoder, pickupPos]);

  return (
    <div className={showMap && showDetails ? "space-y-2" : ""}>
      {showMap ? (
        <Map
          id="delivery-simple-live-map"
          defaultCenter={center}
          defaultZoom={14}
          mapId={mapId || undefined}
          gestureHandling="greedy"
          className={`w-full ${heightClassName} ${
            mapChromeClassName ||
            "rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden"
          }`}
        >
          {pickupPos && dropoffPos ? (
            <NativeDirectionsRouteLine pickupPos={pickupPos} dropoffPos={dropoffPos} />
          ) : null}

          <IconMarker position={pickupPos} title={pickupLabel} className="bg-amber-500 text-white">
            <FaStore className="w-4 h-4" />
          </IconMarker>

          <IconMarker position={dropoffPos} title="Drop-off" className="bg-emerald-600 text-white">
            <FaUserCircle className="w-5 h-5" />
          </IconMarker>

          {animatedRiderPos ? (
            <IconMarker
              position={animatedRiderPos}
              title="Rider (live)"
              className="bg-pink-600 text-white"
            >
              <FaMotorcycle className="w-4 h-4" />
            </IconMarker>
          ) : null}
        </Map>
      ) : null}

      {showDetails && dropoffPos ? (
        <div className="rounded-lg bg-white/95 dark:bg-gray-950/80 border border-gray-200 dark:border-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-100">
          <div className="font-medium">ETA to drop-off</div>
          <div className="mt-0.5 text-gray-600 dark:text-gray-300">
            {riderPos || animatedRiderPos ? (
              <>
                {riderToDropoff.durationText ? (
                  <span>{riderToDropoff.durationText}</span>
                ) : (
                  <span>Calculating…</span>
                )}
                {displayRiderDistanceText ? (
                  <span className="ml-2">({displayRiderDistanceText})</span>
                ) : null}
              </>
            ) : (
              <>
                {pickupToDropoff.durationText ? (
                  <span>{pickupToDropoff.durationText}</span>
                ) : (
                  <span>Calculating…</span>
                )}
                {pickupToDropoff.distanceText ? (
                  <span className="ml-2">({pickupToDropoff.distanceText})</span>
                ) : null}
              </>
            )}
          </div>

          {straightPickToDrop != null && straightPickToDrop > 0 ? (
            <div className="mt-2">
              <div className="relative h-2 overflow-visible">
                <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                  {(riderPos || animatedRiderPos) && progressPct != null ? (
                    <div
                      className="absolute left-0 top-0 h-2 bg-primary/80"
                      style={{ width: `${progressPct}%` }}
                    />
                  ) : (
                    <div className="absolute left-0 top-0 h-2 w-0 bg-primary/80" />
                  )}
                </div>

                {(riderPos || animatedRiderPos) && progressPct != null ? (
                  <div
                    className="absolute -top-3 w-7 h-7 rounded-full bg-pink-600 border-2 border-white shadow flex items-center justify-center"
                    style={{ left: `calc(${progressPct}% - 14px)` }}
                    title="Rider progress"
                  >
                    <FaMotorcycle className="w-4 h-4 text-white" />
                  </div>
                ) : null}
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <FaStore className="w-3 h-3 text-amber-500" />
                  Pickup
                </span>
                <span className="inline-flex items-center gap-1">
                  <FaUserCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Drop-off
                </span>
              </div>
              {!riderPos ? (
                <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">
                  Waiting for rider GPS…
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const DeliverySimpleLiveMap = ({
  pickupLatitude,
  pickupLongitude,
  dropoffLatitude,
  dropoffLongitude,
  riderLatitude,
  riderLongitude,
  mode = "map+details",
  // Taller on mobile so the map is actually usable.
  // Keep mobile map shorter so the tracking card stays visible.
  heightClassName = "h-[44vh] min-h-[220px] sm:h-[min(46vh,320px)] sm:min-h-[220px]",
  mapChromeClassName,
}) => {
  const apiKey = (
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_GOOGLE_API_KEY ||
    ""
  ).trim();
  const mapId = (import.meta.env.VITE_GOOGLE_MAP_ID || "").trim();

  const pickupPos = useMemo(
    () => parsePos(pickupLatitude, pickupLongitude),
    [pickupLatitude, pickupLongitude]
  );
  const dropoffPos = useMemo(
    () => parsePos(dropoffLatitude, dropoffLongitude),
    [dropoffLatitude, dropoffLongitude]
  );
  const riderPos = useMemo(
    () => parsePos(riderLatitude, riderLongitude),
    [riderLatitude, riderLongitude]
  );

  const center = useMemo(() => {
    if (riderPos && isLatLngInAccraBounds(riderPos.lat, riderPos.lng)) return riderPos;
    if (dropoffPos && isLatLngInAccraBounds(dropoffPos.lat, dropoffPos.lng)) return dropoffPos;
    if (pickupPos && isLatLngInAccraBounds(pickupPos.lat, pickupPos.lng)) return pickupPos;
    return ACCRA_MAP_CENTER;
  }, [dropoffPos, pickupPos, riderPos]);

  if (!apiKey) return null;

  return (
    <APIProvider apiKey={apiKey} libraries={["places", "geocoding", "routes", "marker"]}>
      <DeliverySimpleLiveMapInner
        pickupPos={pickupPos}
        dropoffPos={dropoffPos}
        riderPos={riderPos}
        center={center}
        mapId={mapId}
        heightClassName={heightClassName}
        mapChromeClassName={mapChromeClassName}
        showMap={mode !== "detailsOnly"}
        showDetails={mode !== "mapOnly"}
      />
    </APIProvider>
  );
};

export default DeliverySimpleLiveMap;

