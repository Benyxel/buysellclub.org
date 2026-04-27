/**
 * Fixed pickup for rider delivery: packages are collected from BuySellClub premises.
 * Update here if the pickup point moves.
 */
export const BUYSELLCLUB_PICKUP_ADDRESS =
  "Fofoofo Group PTY Ltd, Accra, Ghana";

/**
 * Decimal degrees (from Google Maps place pin).
 */
export const BUYSELLCLUB_PICKUP_LAT = 5.6356932;
export const BUYSELLCLUB_PICKUP_LNG = -0.2656956;

export const buysellclubPickupFormSlice = () => ({
  pickupAddress: BUYSELLCLUB_PICKUP_ADDRESS,
  pickupLatitude: String(BUYSELLCLUB_PICKUP_LAT),
  pickupLongitude: String(BUYSELLCLUB_PICKUP_LNG),
});
