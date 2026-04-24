import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { FaCrosshairs, FaSearch } from "react-icons/fa";
import { Autocomplete, GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { toast } from "../../utils/toast";
import {
  ACCRA_MAP_BOUNDS,
  ACCRA_MAP_CENTER,
  isLatLngInAccraBounds,
} from "../../constants/accraDeliveryMapBounds";

const DEFAULT_CENTER = { lat: ACCRA_MAP_CENTER.lat, lng: ACCRA_MAP_CENTER.lng };
const DEFAULT_ZOOM = 12;

const ACCRA_ONLY_TOAST =
  "Delivery map is limited to Greater Accra. Pick a point inside the green area.";

function fmtCoord7(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return v.toFixed(7);
}

const ACCRA_SW = { lat: ACCRA_MAP_BOUNDS.south, lng: ACCRA_MAP_BOUNDS.west };
const ACCRA_NE = { lat: ACCRA_MAP_BOUNDS.north, lng: ACCRA_MAP_BOUNDS.east };

/**
 * Address textarea + optional map: GPS, search, draggable pin (reverse geocode).
 * Stores human-readable address plus lat/lng strings for future rider / GPS APIs.
 */
const DeliveryAddressMapField = ({
  label,
  address,
  latitude,
  longitude,
  onAddressChange,
  onCoordsChange,
}) => {
  const mapRef = useRef(null);
  const markerPosRef = useRef(null);
  const onAddressChangeRef = useRef(onAddressChange);
  const onCoordsChangeRef = useRef(onCoordsChange);
  onAddressChangeRef.current = onAddressChange;
  onCoordsChangeRef.current = onCoordsChange;
  // Always show the map so users can pick any location (not only GPS).
  const [searchQ, setSearchQ] = useState("");
  const lastValidLatLngRef = useRef(null);
  const autoRef = useRef(null);
  const searchInputRef = useRef(null);

  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);
  const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);

  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;
  const { isLoaded } = useJsApiLoader({
    id: "google-maps",
    googleMapsApiKey: apiKey || "",
    libraries: ["places"],
  });

  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const geocoder = new google.maps.Geocoder();
      const res = await geocoder.geocode({ location: { lat, lng } });
      const best = res?.results?.[0]?.formatted_address;
      return best || "";
    } catch {
      return "";
    }
  }, []);

  const applyCoords = useCallback(async (lat, lng, opts = { reverse: true }) => {
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return;
    if (!isLatLngInAccraBounds(la, ln)) {
      toast.error(ACCRA_ONLY_TOAST, { toastId: "delivery-outside-accra" });
      return;
    }
    lastValidLatLngRef.current = { lat: la, lng: ln };
    // Backend expects DecimalField(decimal_places=7); Leaflet can emit > 7dp.
    onCoordsChangeRef.current(fmtCoord7(la), fmtCoord7(ln));
    if (opts.reverse) {
      const addr = await reverseGeocode(la, ln);
      if (addr) {
        onAddressChangeRef.current(addr);
      } else {
        toast.info(
          "Could not resolve address text for this point. You can edit the address manually.",
          { toastId: "gmaps-reverse-fail" }
        );
      }
    }
  }, [reverseGeocode]);

  const useGps = () => {
    if (!navigator.geolocation) {
      toast.error("This browser does not support location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!isLatLngInAccraBounds(latitude, longitude)) {
          toast.error(
            "Your GPS position is outside Greater Accra. Use the map or search within Accra.",
            { toastId: "delivery-gps-outside-accra" }
          );
          return;
        }
        await applyCoords(latitude, longitude, { reverse: true });
        markerPosRef.current = { lat: latitude, lng: longitude };
        if (mapRef.current) mapRef.current.panTo({ lat: latitude, lng: longitude });
        toast.success("Location captured from GPS.");
      },
      () => {
        toast.error("Could not read GPS. Allow location permission or pick on the map.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const runSearch = async () => {
    const q = (searchInputRef.current?.value || searchQ || "").trim();
    if (q.length < 3) {
      toast.error("Type at least 3 characters to search.");
      return;
    }
    if (!isLoaded || typeof google === "undefined" || !google?.maps?.places) {
      toast.error("Map search is not ready yet.");
      return;
    }

    try {
      const service = new google.maps.places.PlacesService(
        mapRef.current || document.createElement("div")
      );
      const bounds = new google.maps.LatLngBounds(ACCRA_SW, ACCRA_NE);

      const place = await new Promise((resolve, reject) => {
        service.findPlaceFromQuery(
          {
            query: q,
            fields: ["geometry", "formatted_address", "name"],
            locationBias: bounds,
          },
          (results, status) => {
            if (status === "OK" && results?.length) resolve(results[0]);
            else reject(new Error(String(status || "NO_RESULTS")));
          }
        );
      });

      const loc = place?.geometry?.location;
      const lat = loc?.lat?.();
      const lng = loc?.lng?.();
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("NO_GEOMETRY");
      if (!isLatLngInAccraBounds(lat, lng)) {
        toast.error(ACCRA_ONLY_TOAST, { toastId: "delivery-outside-accra" });
        return;
      }
      await applyCoords(lat, lng, { reverse: false });
      onAddressChangeRef.current(place?.formatted_address || place?.name || q);
      markerPosRef.current = { lat, lng };
      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(Math.max(mapRef.current.getZoom() || 0, 15));
      }
    } catch {
      toast.error("No places found. Try a different search in Accra.");
    }
  };

  const onPlaceChanged = async () => {
    try {
      const auto = autoRef.current;
      const place = auto?.getPlace?.();
      const loc = place?.geometry?.location;
      if (!loc) {
        toast.error("Select a place from the suggestions.");
        return;
      }
      const lat = loc.lat();
      const lng = loc.lng();
      if (!isLatLngInAccraBounds(lat, lng)) {
        toast.error(ACCRA_ONLY_TOAST, { toastId: "delivery-outside-accra" });
        return;
      }
      await applyCoords(lat, lng, { reverse: false });
      if (place?.formatted_address) onAddressChangeRef.current(place.formatted_address);
      markerPosRef.current = { lat, lng };
      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(Math.max(mapRef.current.getZoom() || 0, 15));
      }
      const nextLabel = place?.formatted_address || place?.name || "";
      if (nextLabel) setSearchQ(nextLabel);
      if (searchInputRef.current && nextLabel) searchInputRef.current.value = nextLabel;
    } catch {
      toast.error("Could not use that place. Try again.");
    }
  };

  const markerPos = useCallback(() => {
    if (hasCoords && isLatLngInAccraBounds(latNum, lngNum)) return { lat: latNum, lng: lngNum };
    return lastValidLatLngRef.current || DEFAULT_CENTER;
  }, [hasCoords, latNum, lngNum]);

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={useGps}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <FaCrosshairs className="w-3.5 h-3.5" />
            Use GPS
          </button>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900/40">
          <div className="flex flex-col sm:flex-row gap-2">
            {apiKey && isLoaded ? (
              <Autocomplete
                onLoad={(a) => (autoRef.current = a)}
                onPlaceChanged={onPlaceChanged}
                options={{
                  bounds: new google.maps.LatLngBounds(ACCRA_SW, ACCRA_NE),
                  strictBounds: true,
                  fields: ["geometry", "formatted_address", "name"],
                }}
              >
                <input
                  type="text"
                  ref={searchInputRef}
                  defaultValue={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      runSearch();
                    }
                  }}
                  placeholder="Search in Accra…"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </Autocomplete>
            ) : (
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runSearch();
                  }
                }}
                placeholder="Search in Accra…"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            )}
            <button
              type="button"
              onClick={runSearch}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:opacity-90 disabled:opacity-50"
            >
              <FaSearch className="w-3.5 h-3.5" />
              Search
            </button>
          </div>
          <div className="w-full h-[220px] rounded-md z-0 border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-900">
            {!apiKey ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                Google Maps key missing (`VITE_GOOGLE_MAPS_API_KEY`).
              </div>
            ) : !isLoaded ? (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                Loading map…
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={markerPos()}
                zoom={hasCoords ? 15 : DEFAULT_ZOOM}
                onLoad={(m) => (mapRef.current = m)}
                options={{
                  restriction: {
                    latLngBounds: { south: ACCRA_SW.lat, west: ACCRA_SW.lng, north: ACCRA_NE.lat, east: ACCRA_NE.lng },
                    strictBounds: false,
                  },
                  fullscreenControl: false,
                  mapTypeControl: false,
                  streetViewControl: false,
                  clickableIcons: false,
                }}
                onClick={async (e) => {
                  const lat = e?.latLng?.lat?.();
                  const lng = e?.latLng?.lng?.();
                  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                  if (!isLatLngInAccraBounds(lat, lng)) {
                    toast.error(ACCRA_ONLY_TOAST, { toastId: "delivery-outside-accra" });
                    return;
                  }
                  markerPosRef.current = { lat, lng };
                  await applyCoords(lat, lng, { reverse: true });
                }}
              >
                <MarkerF
                  position={markerPosRef.current || markerPos()}
                  draggable
                  onDragEnd={async (e) => {
                    const lat = e?.latLng?.lat?.();
                    const lng = e?.latLng?.lng?.();
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                    if (!isLatLngInAccraBounds(lat, lng)) {
                      toast.error(ACCRA_ONLY_TOAST, { toastId: "delivery-outside-accra" });
                      const prev = lastValidLatLngRef.current || DEFAULT_CENTER;
                      markerPosRef.current = prev;
                      if (mapRef.current) mapRef.current.panTo(prev);
                      return;
                    }
                    markerPosRef.current = { lat, lng };
                    await applyCoords(lat, lng, { reverse: true });
                  }}
                />
              </GoogleMap>
            )}
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            Map is limited to Greater Accra. Tap or drag the pin inside the area; address
            text updates when possible.
          </p>
      </div>

      <textarea
        value={address}
        onChange={(e) => onAddressChange(e.target.value)}
        rows={3}
        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
      />
      {hasCoords && (
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          GPS: {latNum.toFixed(6)}, {lngNum.toFixed(6)}
        </p>
      )}
    </div>
  );
};

export default DeliveryAddressMapField;
