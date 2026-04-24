/**
 * OpenStreetMap Nominatim (https://nominatim.org) — respect usage policy: light use,
 * attribute OSM on UI. Browser cannot set User-Agent; we use Accept-Language only.
 */

const NOMINATIM = "https://nominatim.openstreetmap.org";

let lastCall = 0;
const MIN_INTERVAL_MS = 1100;

async function throttle() {
  const now = Date.now();
  const wait = lastCall + MIN_INTERVAL_MS - now;
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastCall = Date.now();
}

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ displayName: string, lat: number, lng: number } | null>}
 */
export async function nominatimReverse(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  await throttle();
  const url = new URL(`${NOMINATIM}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  const res = await fetch(url.toString(), {
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const name = data.display_name || data.name;
  if (!name) return null;
  const rLat = parseFloat(data.lat);
  const rLon = parseFloat(data.lon);
  return {
    displayName: name,
    lat: Number.isFinite(rLat) ? rLat : lat,
    lng: Number.isFinite(rLon) ? rLon : lng,
  };
}

/**
 * @param {string} query
 * @param {{ viewbox?: string, bounded?: 0 | 1 }} [options] — Nominatim viewbox is
 *   `min_lon,min_lat,max_lon,max_lat`. `bounded=1` restricts results to the viewbox.
 * @returns {Promise<Array<{ displayName: string, lat: number, lng: number }>>}
 */
export async function nominatimSearch(query, options = {}) {
  const q = (query || "").trim();
  if (q.length < 3) return [];
  await throttle();
  const url = new URL(`${NOMINATIM}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "6");
  if (options.viewbox) {
    url.searchParams.set("viewbox", options.viewbox);
    if (options.bounded === 0 || options.bounded === 1) {
      url.searchParams.set("bounded", String(options.bounded));
    }
  }
  const res = await fetch(url.toString(), {
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }))
    .filter((x) => x.displayName && Number.isFinite(x.lat) && Number.isFinite(x.lng));
}
