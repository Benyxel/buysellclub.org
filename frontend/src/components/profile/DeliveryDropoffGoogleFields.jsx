import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaCrosshairs } from "react-icons/fa";
import {
  APILoadingStatus,
  Map,
  Marker,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { toast } from "../../utils/toast";
import {
  ACCRA_MAP_BOUNDS,
  ACCRA_MAP_CENTER,
  isLatLngInAccraBounds,
} from "../../constants/accraDeliveryMapBounds";

const ACCRA_ONLY_TOAST =
  "Delivery location is limited to Greater Accra. Pick a point inside the service area.";

function fmtCoord7(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return v.toFixed(7);
}

function parsePos(latStr, lngStr) {
  const la = parseFloat(String(latStr ?? ""));
  const ln = parseFloat(String(lngStr ?? ""));
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return { lat: la, lng: ln };
}

function accraLatLngBounds() {
  const g = window.google;
  if (!g?.maps) return null;
  return new g.maps.LatLngBounds(
    { lat: ACCRA_MAP_BOUNDS.south, lng: ACCRA_MAP_BOUNDS.west },
    { lat: ACCRA_MAP_BOUNDS.north, lng: ACCRA_MAP_BOUNDS.east }
  );
}

/**
 * Pans the map when the marker position changes (e.g. after Places search).
 */
function PanWhenMarkerMoves({ position }) {
  const map = useMap();
  const lastKey = useRef("");

  useEffect(() => {
    if (!map || !position || typeof position.lat !== "number") return;
    const key = `${position.lat.toFixed(6)},${position.lng.toFixed(6)}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    map.panTo(position);
    const z = map.getZoom();
    if (z != null && z < 14) map.setZoom(15);
  }, [map, position]);

  return null;
}

/**
 * Google Places Autocomplete on an input (legacy widget; bias to Greater Accra + Ghana).
 */
function PlacesSearchInput({ value, onChange, onSearch, onPlaceResolved }) {
  const inputRef = useRef(null);
  const onResolvedRef = useRef(onPlaceResolved);
  onResolvedRef.current = onPlaceResolved;
  const places = useMapsLibrary("places");

  useEffect(() => {
    if (!places || !inputRef.current) return undefined;

    const bounds = accraLatLngBounds();
    if (!bounds) return undefined;

    const ac = new places.Autocomplete(inputRef.current, {
      bounds,
      strictBounds: false,
      componentRestrictions: { country: "gh" },
      fields: ["geometry", "formatted_address", "name"],
    });

    const listener = ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const loc = place.geometry?.location;
      if (!loc) {
        toast.info("Choose a suggestion from the list so we can read the location.");
        return;
      }
      const la = loc.lat();
      const ln = loc.lng();
      const addr =
        place.formatted_address ||
        place.name ||
        (inputRef.current && inputRef.current.value) ||
        "";
      onResolvedRef.current(la, ln, addr);
    });

    return () => {
      listener.remove();
    };
  }, [places]);

  return (
    <div className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSearch();
          }
        }}
        placeholder="Search address or place (Google)…"
        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
      />
      <button
        type="button"
        onClick={() => {
          onSearch();
          inputRef.current?.focus();
        }}
        className="shrink-0 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90"
      >
        Search
      </button>
    </div>
  );
}

/**
 * Map + draggable marker; click map to set pin. Must be rendered inside APIProvider.
 */
function DropoffMapSection({ markerPosition, pickupPosition, onPickLatLngReverseGeocode }) {
  const map = useMap();
  const placesLib = useMapsLibrary("places");
  const placesSvc = useMemo(() => {
    if (!map || !placesLib) return null;
    try {
      return new placesLib.PlacesService(map);
    } catch {
      return null;
    }
  }, [map, placesLib]);

  const handleMapClick = useCallback(
    (ev) => {
      const ll = ev.detail?.latLng;
      const placeId = ev.detail?.placeId;

      // If user clicked a known POI, resolve it via Places for a better address.
      if (placeId && placesSvc) {
        placesSvc.getDetails(
          {
            placeId,
            fields: ["geometry", "formatted_address", "name"],
          },
          (place, status) => {
            const loc = place?.geometry?.location;
            if (status === "OK" && loc) {
              const la = loc.lat();
              const ln = loc.lng();
              if (!isLatLngInAccraBounds(la, ln)) {
                toast.error(ACCRA_ONLY_TOAST, { toastId: "delivery-place-outside-accra" });
                return;
              }
              onPickLatLngReverseGeocode(la, ln, {
                preferredAddress:
                  place.formatted_address || place.name || "Selected location",
              });
              return;
            }
            // If details fail, fall back to lat/lng.
            if (ll) {
              const { lat, lng } = ll;
              if (!isLatLngInAccraBounds(lat, lng)) {
                toast.error(ACCRA_ONLY_TOAST, { toastId: "delivery-map-outside-accra" });
                return;
              }
              onPickLatLngReverseGeocode(lat, lng);
            }
          }
        );
        return;
      }

      if (!ll) return;
      const { lat, lng } = ll;
      if (!isLatLngInAccraBounds(lat, lng)) {
        toast.error(ACCRA_ONLY_TOAST, { toastId: "delivery-map-outside-accra" });
        return;
      }
      onPickLatLngReverseGeocode(lat, lng);
    },
    [onPickLatLngReverseGeocode, placesSvc]
  );

  const handleMarkerDragEnd = useCallback(
    (ev) => {
      const latLng = ev.latLng;
      if (!latLng) return;
      const la = typeof latLng.lat === "function" ? latLng.lat() : latLng.lat;
      const ln = typeof latLng.lng === "function" ? latLng.lng() : latLng.lng;
      if (!isLatLngInAccraBounds(la, ln)) {
        toast.error(ACCRA_ONLY_TOAST, { toastId: "delivery-marker-outside-accra" });
        return;
      }
      onPickLatLngReverseGeocode(la, ln);
    },
    [onPickLatLngReverseGeocode]
  );

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-600 dark:text-gray-400">
        Tap the map or drag the pin to set the drop-off GPS. Results stay limited to Greater
        Accra.
      </p>
      <Map
        id="delivery-dropoff-map"
        defaultCenter={markerPosition || ACCRA_MAP_CENTER}
        defaultZoom={markerPosition ? 15 : 11}
        mapId={(import.meta.env.VITE_GOOGLE_MAP_ID || "").trim() || undefined}
        gestureHandling="greedy"
        className="w-full h-[min(42vh,280px)] min-h-[200px] rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden"
        onClick={handleMapClick}
      >
        {markerPosition ? <PanWhenMarkerMoves position={markerPosition} /> : null}
        {pickupPosition ? (
          <Marker position={pickupPosition} title="Pickup (Fofoofo Group Pty)" />
        ) : null}
        {markerPosition ? (
          <Marker
            position={markerPosition}
            draggable
            title="Drop-off"
            onDragEnd={handleMarkerDragEnd}
          />
        ) : null}
      </Map>
    </div>
  );
}

/**
 * Drop-off UI: Google Places search + interactive map + device GPS (coordinates from map/GPS only).
 * Parent must wrap this in {@link APIProvider} with libraries including {@code places} and {@code geocoding}.
 */
const DeliveryDropoffGoogleFields = ({
  label,
  address,
  latitude,
  longitude,
  pickupLatitude,
  pickupLongitude,
  onAddressChange,
  onCoordsChange,
}) => {
  const [searchText, setSearchText] = useState("");
  const apiStatus = useApiLoadingStatus();
  const placesLib = useMapsLibrary("places");
  const geocodingLib = useMapsLibrary("geocoding");
  const geocoder = useMemo(
    () => (geocodingLib ? new geocodingLib.Geocoder() : null),
    [geocodingLib]
  );
  const placesAutocomplete = useMemo(() => {
    if (!placesLib) return null;
    try {
      return new placesLib.AutocompleteService();
    } catch {
      return null;
    }
  }, [placesLib]);
  const placesDetails = useMemo(() => {
    if (!placesLib) return null;
    try {
      // PlacesService can be created with an element (no map required)
      return new placesLib.PlacesService(document.createElement("div"));
    } catch {
      return null;
    }
  }, [placesLib]);

  const latStr = latitude == null ? "" : String(latitude);
  const lngStr = longitude == null ? "" : String(longitude);
  const markerPosition = useMemo(() => parsePos(latStr, lngStr), [latStr, lngStr]);
  const pickupPosition = useMemo(
    () => parsePos(pickupLatitude, pickupLongitude),
    [pickupLatitude, pickupLongitude]
  );

  const reverseGeocodeThenApply = useCallback(
    (la, ln, { preferredAddress } = {}) => {
      if (!isLatLngInAccraBounds(la, ln)) {
        toast.error(ACCRA_ONLY_TOAST, { toastId: "delivery-outside-accra" });
        return;
      }
      onCoordsChange(fmtCoord7(la), fmtCoord7(ln));
      if (preferredAddress) {
        onAddressChange(preferredAddress);
      }
      if (!geocoder) return;
      geocoder.geocode({ location: { lat: la, lng: ln } }, (results, status) => {
        if (status === "OK" && results && results[0]?.formatted_address) {
          onAddressChange(results[0].formatted_address);
        }
      });
    },
    [geocoder, onAddressChange, onCoordsChange]
  );

  const onPlaceResolved = useCallback(
    (la, ln, addr) => {
      if (!isLatLngInAccraBounds(la, ln)) {
        toast.error(ACCRA_ONLY_TOAST, { toastId: "delivery-place-outside-accra" });
        return;
      }
      onCoordsChange(fmtCoord7(la), fmtCoord7(ln));
      if (addr) onAddressChange(addr);
      toast.success("Location set from Google Places.");
    },
    [onAddressChange, onCoordsChange]
  );

  const onSearch = useCallback(() => {
    const q = searchText.trim();
    if (!q) {
      toast.info("Type an address or place name first.");
      return;
    }
    const bounds = accraLatLngBounds();

    // Prefer Places prediction → details (finds businesses/places and addresses).
    if (placesAutocomplete && placesDetails) {
      placesAutocomplete.getPlacePredictions(
        {
          input: q,
          ...(bounds ? { bounds } : {}),
          componentRestrictions: { country: "gh" },
        },
        (preds, status) => {
          const p0 = preds && preds[0];
          if (status === "OK" && p0?.place_id) {
            placesDetails.getDetails(
              {
                placeId: p0.place_id,
                fields: ["geometry", "formatted_address", "name"],
              },
              (place, st) => {
                const loc = place?.geometry?.location;
                if (st !== "OK" || !loc) {
                  toast.info("No results. Try a more specific place name.");
                  return;
                }
                const la = loc.lat();
                const ln = loc.lng();
                if (!isLatLngInAccraBounds(la, ln)) {
                  toast.error(ACCRA_ONLY_TOAST, { toastId: "delivery-search-outside-accra" });
                  return;
                }
                reverseGeocodeThenApply(la, ln, {
                  preferredAddress:
                    place.formatted_address || place.name || p0.description || q,
                });
              }
            );
            return;
          }

          // If Places doesn't return anything, fall back to geocoding below.
          if (!geocoder) {
            toast.info("Google is still loading. Try again in a moment.");
            return;
          }
          geocoder.geocode(
            {
              address: q,
              ...(bounds ? { bounds } : {}),
              componentRestrictions: { country: "GH" },
            },
            (results, st2) => {
              const r0 = results && results[0];
              const loc = r0?.geometry?.location;
              if (st2 !== "OK" || !loc) {
                toast.info("No results. Try a more specific address.");
                return;
              }
              const la = loc.lat();
              const ln = loc.lng();
              if (!isLatLngInAccraBounds(la, ln)) {
                toast.error(ACCRA_ONLY_TOAST, { toastId: "delivery-search-outside-accra" });
                return;
              }
              reverseGeocodeThenApply(la, ln, { preferredAddress: r0.formatted_address || q });
            }
          );
        }
      );
      return;
    }

    // Fallback: plain geocode if Places services aren't ready.
    if (!geocoder) {
      toast.info("Google is still loading. Try again in a moment.");
      return;
    }
    geocoder.geocode(
      {
        address: q,
        ...(bounds ? { bounds } : {}),
        componentRestrictions: { country: "GH" },
      },
      (results, status) => {
        const r0 = results && results[0];
        const loc = r0?.geometry?.location;
        if (status !== "OK" || !loc) {
          toast.info("No results. Try a more specific address.");
          return;
        }
        const la = loc.lat();
        const ln = loc.lng();
        if (!isLatLngInAccraBounds(la, ln)) {
          toast.error(ACCRA_ONLY_TOAST, { toastId: "delivery-search-outside-accra" });
          return;
        }
        reverseGeocodeThenApply(la, ln, { preferredAddress: r0.formatted_address || q });
      }
    );
  }, [
    geocoder,
    placesAutocomplete,
    placesDetails,
    reverseGeocodeThenApply,
    searchText,
  ]);

  const useGps = () => {
    if (!navigator.geolocation) {
      toast.error("This browser does not support location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: la, longitude: ln } = pos.coords;
        if (!isLatLngInAccraBounds(la, ln)) {
          toast.error(ACCRA_ONLY_TOAST, { toastId: "delivery-gps-outside-accra" });
          return;
        }
        reverseGeocodeThenApply(la, ln);
        toast.success("GPS applied. Confirm the address text matches your drop-off.");
      },
      () => {
        toast.error("Could not read GPS. Allow location permission or pick a point on the map.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <button
          type="button"
          onClick={useGps}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 self-start sm:self-auto"
        >
          <FaCrosshairs className="w-3.5 h-3.5" />
          Use device GPS
        </button>
      </div>

      {apiStatus === APILoadingStatus.LOADING || apiStatus === APILoadingStatus.NOT_LOADED ? (
        <p className="text-sm text-gray-500 py-2">Loading Google Maps…</p>
      ) : null}
      {apiStatus === APILoadingStatus.FAILED || apiStatus === APILoadingStatus.AUTH_FAILURE ? (
        <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/25 rounded-lg px-3 py-2">
          Google Maps could not load. Check your API key and that Maps JavaScript API, Places,
          and Geocoding are enabled for this key.
        </p>
      ) : null}

      <PlacesSearchInput
        value={searchText}
        onChange={setSearchText}
        onSearch={onSearch}
        onPlaceResolved={onPlaceResolved}
      />

      <textarea
        value={address}
        onChange={(e) => onAddressChange(e.target.value)}
        rows={3}
        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
        placeholder="Full street address (you can edit after choosing on the map)"
      />

      <DropoffMapSection
        markerPosition={markerPosition}
        pickupPosition={pickupPosition}
        onPickLatLngReverseGeocode={reverseGeocodeThenApply}
      />

      <p className="text-[10px] text-gray-500 dark:text-gray-400">
        Location must fall inside Greater Accra. Use search, the map, or device GPS to set the pin.
      </p>
    </div>
  );
};

export default DeliveryDropoffGoogleFields;
