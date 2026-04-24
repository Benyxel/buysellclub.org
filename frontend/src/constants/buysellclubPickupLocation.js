/**
 * Fixed pickup for rider delivery: packages are collected from BuySellClub premises.
 * Align with Contact page (Pazzys Villa, Accra) — update here if the office moves.
 */
export const BUYSELLCLUB_PICKUP_ADDRESS =
  "Israel Palm-plaza, Okropom street, Pazzy's Villa, Accra, Ghana";

/** Decimal degrees — same marker as Contact / Google Maps embed */
export const BUYSELLCLUB_PICKUP_LAT = 5.6357079;
export const BUYSELLCLUB_PICKUP_LNG = -0.2653476;

export const buysellclubPickupFormSlice = () => ({
  pickupAddress: BUYSELLCLUB_PICKUP_ADDRESS,
  pickupLatitude: String(BUYSELLCLUB_PICKUP_LAT),
  pickupLongitude: String(BUYSELLCLUB_PICKUP_LNG),
});
