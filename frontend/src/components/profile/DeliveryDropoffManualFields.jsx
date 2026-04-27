import React, { useCallback } from "react";
import { FaCrosshairs } from "react-icons/fa";
import { toast } from "../../utils/toast";
import { isLatLngInAccraBounds } from "../../constants/accraDeliveryMapBounds";

const ACCRA_ONLY_TOAST =
  "Delivery location is limited to Greater Accra. Enter coordinates inside the service area.";

function fmtCoord7(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return v.toFixed(7);
}

/**
 * Drop-off without Google Maps (no API key): address + device GPS for coordinates.
 */
const DeliveryDropoffManualFields = ({
  label,
  address,
  onAddressChange,
  onCoordsChange,
}) => {
  const applyCoords = useCallback(
    (lat, lng) => {
      const la = Number(lat);
      const ln = Number(lng);
      if (!Number.isFinite(la) || !Number.isFinite(ln)) return;
      if (!isLatLngInAccraBounds(la, ln)) {
        toast.error(ACCRA_ONLY_TOAST, { toastId: "delivery-outside-accra" });
        return;
      }
      onCoordsChange(fmtCoord7(la), fmtCoord7(ln));
    },
    [onCoordsChange]
  );

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
        applyCoords(la, ln);
        toast.success("GPS coordinates filled. Check the address text matches the drop-off.");
      },
      () => {
        toast.error("Could not read GPS. Allow location permission or add a Maps API key to pick on the map.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-2">
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
          Use GPS for coordinates
        </button>
      </div>

      <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
        Add <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> (or{" "}
        <code className="font-mono">VITE_GOOGLE_API_KEY</code>) to enable Google search and an
        interactive map for choosing the drop-off.
      </p>

      <textarea
        value={address}
        onChange={(e) => onAddressChange(e.target.value)}
        rows={3}
        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
        placeholder="Full street address (Greater Accra)"
      />

      <p className="text-[10px] text-gray-500 dark:text-gray-400">
        Use <strong>Use GPS for coordinates</strong> so the drop-off pin is saved. Coordinates must
        fall inside Greater Accra (same area as club pickup).
      </p>
    </div>
  );
};

export default DeliveryDropoffManualFields;
