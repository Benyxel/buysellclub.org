import React, { useEffect, useMemo, useRef, useState } from "react";
import { Autocomplete, GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import {
  ACCRA_MAP_BOUNDS,
  ACCRA_MAP_CENTER,
} from "../../constants/accraDeliveryMapBounds";

function parseLL(lat, lng) {
  const la = typeof lat === "number" ? lat : parseFloat(lat);
  const ln = typeof lng === "number" ? lng : parseFloat(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return { lat: la, lng: ln };
}

const ACCRA_SW = { lat: ACCRA_MAP_BOUNDS.south, lng: ACCRA_MAP_BOUNDS.west };
const ACCRA_NE = { lat: ACCRA_MAP_BOUNDS.north, lng: ACCRA_MAP_BOUNDS.east };

function clampToAccra(p) {
  if (!p) return null;
  const lat = Math.max(ACCRA_SW.lat, Math.min(ACCRA_NE.lat, p.lat));
  const lng = Math.max(ACCRA_SW.lng, Math.min(ACCRA_NE.lng, p.lng));
  return { lat, lng };
}

function svgToDataUrl(svg) {
  const s = String(svg || "").trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(s)}`;
}

function getMotorSvg() {
  // Simple motorcycle icon (stroke) on white circle with orange ring.
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
    <defs>
      <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
    </defs>
    <circle cx="28" cy="28" r="24" fill="#ffffff" stroke="#ea580c" stroke-width="4" filter="url(#s)"/>
    <g transform="translate(12,14)" fill="none" stroke="#c2410c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="7" cy="26" r="5"/>
      <circle cx="29" cy="26" r="5"/>
      <path d="M24 4h4l5 10-5 8H16l-4-8H6"/>
      <path d="M12 18v8"/>
      <path d="M24 12l-4 14"/>
    </g>
  </svg>`;
}

function getUserAvatarSvg() {
  // White avatar on blue gradient circle.
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
    <defs>
      <linearGradient id="g" x1="10" y1="10" x2="46" y2="46" gradientUnits="userSpaceOnUse">
        <stop stop-color="#3b82f6"/>
        <stop offset="1" stop-color="#1d4ed8"/>
      </linearGradient>
      <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
    </defs>
    <circle cx="28" cy="28" r="24" fill="url(#g)" stroke="#ffffff" stroke-width="4" filter="url(#s)"/>
    <path fill="#ffffff" d="M28 28c4.1 0 7.4-3.3 7.4-7.4S32.1 13.2 28 13.2s-7.4 3.3-7.4 7.4S23.9 28 28 28zm0 3.4c-6.2 0-14.8 3.1-14.8 9.3v2.1h29.6v-2.1c0-6.2-8.6-9.3-14.8-9.3z"/>
  </svg>`;
}

/**
 * Read-only map: pickup, drop-off, optional rider position (updates when props change).
 * @param {{ lat: number|string, lng: number|string } | null} pickup
 * @param {{ lat: number|string, lng: number|string } | null} dropoff
 * @param {{ lat: number|string, lng: number|string } | null} rider
 */
const DeliveryLiveMap = ({ pickup, dropoff, rider, height = 280 }) => {
  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;
  const { isLoaded } = useJsApiLoader({
    id: "google-maps",
    googleMapsApiKey: apiKey || "",
    libraries: ["places", "geometry"],
  });

  const mapRef = useRef(null);
  const riderAnimRef = useRef({ raf: 0, from: null, to: null });
  const [riderDrawPos, setRiderDrawPos] = useState(null);
  const [routePath, setRoutePath] = useState(null);
  const lastGoodRouteRef = useRef(null);

  const routeKey = useMemo(() => {
    const origin = rider ? parseLL(rider.lat, rider.lng) : pickup ? parseLL(pickup.lat, pickup.lng) : null;
    const dest = dropoff ? parseLL(dropoff.lat, dropoff.lng) : null;
    if (!origin || !dest) return null;
    return `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}->${dest.lat.toFixed(
      6
    )},${dest.lng.toFixed(6)}`;
  }, [pickup, dropoff, rider]);

  useEffect(() => {
    return () => {
      if (riderAnimRef.current.raf) cancelAnimationFrame(riderAnimRef.current.raf);
      riderAnimRef.current.raf = 0;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!routeKey) {
      setRoutePath(null);
      lastGoodRouteRef.current = null;
      return;
    }
    const originRaw = rider ? parseLL(rider.lat, rider.lng) : pickup ? parseLL(pickup.lat, pickup.lng) : null;
    const origin = originRaw ? clampToAccra(originRaw) : null;
    const d = dropoff ? clampToAccra(parseLL(dropoff.lat, dropoff.lng)) : null;
    if (!origin || !d) {
      setRoutePath(null);
      lastGoodRouteRef.current = null;
      return;
    }

    // Try Google Directions (auto-reroutes as origin changes). If it fails,
    // keep the last good route instead of drawing a straight-line fallback.
    try {
      const svc = new google.maps.DirectionsService();
      svc.route(
        {
          origin,
          destination: d,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (res, status) => {
          if (status === "OK" && res?.routes?.[0]?.overview_path?.length) {
            const path = res.routes[0].overview_path.map((pt) => ({
              lat: pt.lat(),
              lng: pt.lng(),
            }));
            setRoutePath(path);
            lastGoodRouteRef.current = path;
          } else {
            if (lastGoodRouteRef.current) {
              setRoutePath(lastGoodRouteRef.current);
            }
          }
        }
      );
    } catch {
      if (lastGoodRouteRef.current) {
        setRoutePath(lastGoodRouteRef.current);
      } else {
        setRoutePath(null);
      }
    }
  }, [routeKey, pickup, dropoff, rider, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    const next = rider ? clampToAccra(parseLL(rider.lat, rider.lng)) : null;
    if (!next) {
      setRiderDrawPos(null);
      return;
    }
    if (!riderDrawPos) {
      setRiderDrawPos(next);
      return;
    }
    if (
      Math.abs(riderDrawPos.lat - next.lat) < 1e-9 &&
      Math.abs(riderDrawPos.lng - next.lng) < 1e-9
    ) {
      return;
    }
    if (riderAnimRef.current.raf) cancelAnimationFrame(riderAnimRef.current.raf);
    const from = riderDrawPos;
    const start = performance.now();
    const dur = 800;
    const step = (t) => {
      const k = Math.min(1, (t - start) / dur);
      const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const la = from.lat + (next.lat - from.lat) * ease;
      const ln = from.lng + (next.lng - from.lng) * ease;
      setRiderDrawPos({ lat: la, lng: ln });
      if (k < 1) {
        riderAnimRef.current.raf = requestAnimationFrame(step);
      } else {
        riderAnimRef.current.raf = 0;
      }
    };
    riderAnimRef.current.raf = requestAnimationFrame(step);
  }, [isLoaded, rider]); // eslint-disable-line react-hooks/exhaustive-deps

  const p = pickup ? clampToAccra(parseLL(pickup.lat, pickup.lng)) : null;
  const d = dropoff ? clampToAccra(parseLL(dropoff.lat, dropoff.lng)) : null;

  const bounds = useMemo(() => {
    const pts = [];
    if (p) pts.push(p);
    if (d) pts.push(d);
    if (riderDrawPos) pts.push(riderDrawPos);
    if (routePath && routePath.length) pts.push(...routePath);
    return pts;
  }, [p, d, riderDrawPos, routePath]);

  // Avoid "jittery" map re-fitting on every rider tick; only refit when the
  // route endpoints change (pickup/drop-off) or when the route itself changes.
  const lastFitKeyRef = useRef("");
  const fitKey = useMemo(() => {
    const pk = p ? `${p.lat.toFixed(6)},${p.lng.toFixed(6)}` : "none";
    const dk = d ? `${d.lat.toFixed(6)},${d.lng.toFixed(6)}` : "none";
    const rk = routeKey || "no-route";
    return `${pk}::${dk}::${rk}`;
  }, [p, d, routeKey]);

  // "Follow" behavior: keep rider in view, and zoom in gently as they approach drop-off.
  const lastFollowAtRef = useRef(0);
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !riderDrawPos) return;
    const map = mapRef.current;
    const now = Date.now();
    if (now - lastFollowAtRef.current < 1500) return;

    // If rider is close to drop-off, gently zoom in.
    if (d) {
      const dist = google.maps.geometry?.spherical?.computeDistanceBetween
        ? google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(riderDrawPos.lat, riderDrawPos.lng),
            new google.maps.LatLng(d.lat, d.lng)
          )
        : null;

      if (typeof dist === "number") {
        const targetZoom =
          dist < 250 ? 17 : dist < 600 ? 16 : dist < 1200 ? 15 : null;
        if (targetZoom != null && (map.getZoom() || 0) < targetZoom) {
          map.setZoom(targetZoom);
          map.panTo(riderDrawPos);
          lastFollowAtRef.current = now;
          return;
        }
      }
    }

    // Otherwise only pan when rider leaves the current viewport.
    const b = map.getBounds();
    if (b && !b.contains(riderDrawPos)) {
      map.panTo(riderDrawPos);
      lastFollowAtRef.current = now;
    }
  }, [isLoaded, riderDrawPos, d]);

  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    const map = mapRef.current;
    // Only refit when pickup/dropoff/route changes (not every rider update).
    if (fitKey && lastFitKeyRef.current === fitKey) return;
    lastFitKeyRef.current = fitKey || "";
    if (bounds.length >= 2) {
      const b = new google.maps.LatLngBounds();
      bounds.forEach((pt) => b.extend(pt));
      map.fitBounds(b, 36);
    } else if (bounds.length === 1) {
      map.setCenter(bounds[0]);
      map.setZoom(15);
    } else {
      map.setCenter({ lat: ACCRA_MAP_CENTER.lat, lng: ACCRA_MAP_CENTER.lng });
      map.setZoom(12);
    }
  }, [bounds, isLoaded, fitKey]);

  const riderMotorIcon = useMemo(() => {
    if (!isLoaded || typeof google === "undefined" || !google?.maps) return null;
    const url = svgToDataUrl(getMotorSvg());
    return {
      url,
      scaledSize: new google.maps.Size(44, 44),
      anchor: new google.maps.Point(22, 44),
    };
  }, [isLoaded]);

  const userAvatarIcon = useMemo(() => {
    if (!isLoaded || typeof google === "undefined" || !google?.maps) return null;
    const url = svgToDataUrl(getUserAvatarSvg());
    return {
      url,
      scaledSize: new google.maps.Size(40, 40),
      anchor: new google.maps.Point(20, 40),
    };
  }, [isLoaded]);

  const mapContainerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);

  const mapOptions = useMemo(
    () => ({
      restriction: {
        latLngBounds: {
          south: ACCRA_SW.lat,
          west: ACCRA_SW.lng,
          north: ACCRA_NE.lat,
          east: ACCRA_NE.lng,
        },
        strictBounds: false,
      },
      fullscreenControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      clickableIcons: false,
    }),
    []
  );

  if (!apiKey) {
    return (
      <div
        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400"
        style={{ height }}
      >
        Google Maps key missing (`VITE_GOOGLE_MAPS_API_KEY`).
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-sm text-gray-500"
        style={{ height }}
      >
        Loading map…
      </div>
    );
  }

  const routeMid =
    routePath && routePath.length
      ? routePath[Math.floor(routePath.length / 2)]
      : p && d
        ? { lat: (p.lat + d.lat) / 2, lng: (p.lng + d.lng) / 2 }
        : null;

  return (
    <div
      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-900"
      style={{ height }}
      aria-label="Delivery live map"
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={{ lat: ACCRA_MAP_CENTER.lat, lng: ACCRA_MAP_CENTER.lng }}
        zoom={12}
        onLoad={(m) => (mapRef.current = m)}
        onUnmount={() => {
          mapRef.current = null;
        }}
        options={mapOptions}
      >
        {routePath && routePath.length >= 2 && (
          <PolylineF
            path={routePath}
            options={{ strokeColor: "#ec4899", strokeOpacity: 0.9, strokeWeight: 5 }}
          />
        )}
        {routeMid && (
          <MarkerF
            position={routeMid}
            icon={{
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 4,
              strokeColor: "#ec4899",
              strokeWeight: 3,
            }}
            title="Route"
          />
        )}
        {p && <MarkerF position={p} title="Pickup" />}
        {d && (
          <MarkerF
            position={d}
            title="Drop-off (customer)"
            icon={userAvatarIcon || undefined}
          />
        )}
        {riderDrawPos && (
          <MarkerF
            position={riderDrawPos}
            title="Rider"
            icon={riderMotorIcon || undefined}
          />
        )}
      </GoogleMap>
    </div>
  );
};

export default DeliveryLiveMap;
