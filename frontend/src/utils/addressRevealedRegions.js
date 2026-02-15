/** Which address generator regions the user has chosen to "generate" / reveal. Persisted in localStorage. */
export const REVEALED_REGIONS_KEY = "addressRevealedRegions";

export const CHINA_REGION_CODE = "china";

export function getRevealedRegions() {
  try {
    const raw = localStorage.getItem(REVEALED_REGIONS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function setRegionRevealed(regionCode) {
  const codes = getRevealedRegions();
  const lower = (regionCode || "").toLowerCase();
  if (lower && !codes.includes(lower)) {
    localStorage.setItem(REVEALED_REGIONS_KEY, JSON.stringify([...codes, lower]));
  }
}

export function hasRevealedRegion(regionCode) {
  return getRevealedRegions().includes((regionCode || "").toLowerCase());
}
