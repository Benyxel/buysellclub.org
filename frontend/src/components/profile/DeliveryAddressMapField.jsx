import React from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import DeliveryDropoffGoogleFields from "./DeliveryDropoffGoogleFields";
import DeliveryDropoffManualFields from "./DeliveryDropoffManualFields";

/**
 * Drop-off address + coordinates (from map, Places, or GPS — no separate lat/lng inputs).
 * With `VITE_GOOGLE_MAPS_API_KEY`: Google Places + map + GPS. Without it: address + GPS only.
 */
const DeliveryAddressMapField = ({
  label,
  address,
  latitude,
  longitude,
  pickupLatitude,
  pickupLongitude,
  onAddressChange,
  onCoordsChange,
}) => {
  const apiKey = (
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_GOOGLE_API_KEY ||
    ""
  ).trim();

  if (apiKey) {
    return (
      <APIProvider apiKey={apiKey} libraries={["places", "geocoding"]}>
        <DeliveryDropoffGoogleFields
          label={label}
          address={address}
          latitude={latitude}
          longitude={longitude}
          pickupLatitude={pickupLatitude}
          pickupLongitude={pickupLongitude}
          onAddressChange={onAddressChange}
          onCoordsChange={onCoordsChange}
        />
      </APIProvider>
    );
  }

  return (
    <DeliveryDropoffManualFields
      label={label}
      address={address}
      onAddressChange={onAddressChange}
      onCoordsChange={onCoordsChange}
    />
  );
};

export default DeliveryAddressMapField;
