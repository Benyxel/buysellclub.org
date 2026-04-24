/**
 * Greater Accra delivery area (approximate rectangle in WGS84).
 * Tune south/north/west/east if you need a tighter or wider service zone.
 */
export const ACCRA_MAP_BOUNDS = {
  south: 5.42,
  north: 5.9,
  west: -0.48,
  east: 0.14,
};

/** Center of the box — default map view when user has no point yet */
export const ACCRA_MAP_CENTER = {
  lat: (ACCRA_MAP_BOUNDS.south + ACCRA_MAP_BOUNDS.north) / 2,
  lng: (ACCRA_MAP_BOUNDS.west + ACCRA_MAP_BOUNDS.east) / 2,
};

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {boolean}
 */
export function isLatLngInAccraBounds(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
  return (
    la >= ACCRA_MAP_BOUNDS.south &&
    la <= ACCRA_MAP_BOUNDS.north &&
    ln >= ACCRA_MAP_BOUNDS.west &&
    ln <= ACCRA_MAP_BOUNDS.east
  );
}

/** Nominatim `viewbox=min_lon,min_lat,max_lon,max_lat` */
export function nominatimAccraViewbox() {
  const { west, south, east, north } = ACCRA_MAP_BOUNDS;
  return `${west},${south},${east},${north}`;
}
