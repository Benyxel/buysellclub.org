/** Strip optional ":Owner Name" suffix from stored shipping_mark values. */
export function shippingMarkToMarkId(shippingMark) {
  const raw = String(shippingMark || "").trim();
  if (!raw) return "";
  const idx = raw.indexOf(":");
  return (idx === -1 ? raw : raw.slice(0, idx)).trim();
}

/**
 * Warehouse catch-all mark(s) for unlabeled / unknown packages.
 * Package badges still say "Unknown"; the Mark ID itself stays FIM-752.
 */
export const UNKNOWN_PACKAGE_MARK_IDS = new Set(["FIM752"]);

export const MARK_ID_PREFIX = "FIM";

/**
 * Keep `FIM` in the field and let the user type digits only.
 * Used on dedicated Mark ID inputs (container invoice, create invoice, scanner).
 */
export function withFimPrefix(raw) {
  const upper = String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!upper) return MARK_ID_PREFIX;
  if (upper.startsWith(MARK_ID_PREFIX)) {
    return (
      MARK_ID_PREFIX + upper.slice(MARK_ID_PREFIX.length).replace(/\D/g, "")
    );
  }
  const fimAt = upper.indexOf(MARK_ID_PREFIX);
  if (fimAt >= 0) {
    return (
      MARK_ID_PREFIX +
      upper.slice(fimAt + MARK_ID_PREFIX.length).replace(/\D/g, "")
    );
  }
  return MARK_ID_PREFIX + upper.replace(/\D/g, "");
}

/**
 * For multi-purpose search bars (invoice # / mark / container):
 * digits-only or FIM… → auto FIM mark; leave other queries alone.
 */
export function withFimPrefixIfMarkLike(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  if (/#/i.test(trimmed) || /FIMC/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^\d+$/.test(trimmed)) return withFimPrefix(trimmed);
  const alnum = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (alnum.startsWith(MARK_ID_PREFIX)) return withFimPrefix(trimmed);
  return trimmed;
}

/** Accept both `FIM000` and `FIM-000` forms for API calls / comparisons. */
export function normalizeMarkIdInput(markId) {
  const raw = String(markId || "").trim().toUpperCase();
  if (!raw) return "";
  const m = raw.match(/^([A-Z]+)-(\d+)$/);
  if (m) return `${m[1]}${m[2]}`;
  return raw;
}

/**
 * Drop "similar" suggestions when the query is a complete mark id:
 * searching FIM885 should not also list FIM8850 / FIM88512.
 */
export function preferExactMarkMatches(
  items,
  query,
  getMark = (item) => item?.mark_id ?? item?.markId
) {
  const list = Array.isArray(items) ? items : [];
  const target = normalizeMarkIdInput(shippingMarkToMarkId(query));
  if (!target || !/^[A-Z]{2,6}\d{1,10}$/.test(target)) return list;
  const exact = list.filter(
    (item) =>
      normalizeMarkIdInput(shippingMarkToMarkId(getMark(item))) === target
  );
  return exact.length ? exact : list;
}

/** True when this mark is the unknown-package placeholder (e.g. FIM752 / FIM-752). */
export function isUnknownPackageMark(markOrShippingMark) {
  const bare = shippingMarkToMarkId(markOrShippingMark);
  if (!bare) return false;
  return UNKNOWN_PACKAGE_MARK_IDS.has(normalizeMarkIdInput(bare));
}

/** Mark id for tables/lists. Catch-all unlabeled packages show as Unknown (FIM-752). */
export function formatShippingMarkForDisplay(shippingMark) {
  const id = shippingMarkToMarkId(shippingMark);
  if (!id) return "";
  if (isUnknownPackageMark(id)) {
    const bare = normalizeMarkIdInput(id);
    const m = bare.match(/^([A-Za-z]+)(\d+)$/);
    const pretty = m ? `${m[1]}-${m[2]}` : bare;
    return `Unknown (${pretty})`;
  }
  return id;
}

export function formatMarkIdForDisplay(markId) {
  const raw = String(markId || "").trim();
  if (!raw) return "";
  // Keep FIM-752 visible for the catch-all account / admin; package badge still says Unknown.
  if (raw.includes("-")) return raw;
  const m = raw.match(/^([A-Za-z]+)(\d+)$/);
  if (!m) return raw;
  return `${m[1]}-${m[2]}`;
}

/** Replace any inline mark ids like FIM000 → FIM-000 inside free-form text. */
export function formatMarkIdInText(text) {
  const raw = String(text ?? "");
  if (!raw) return "";
  return raw.replace(/\b([A-Za-z]+)-?(\d{1,})\b/g, (full, pfx, digits) => {
    if (full.includes("-")) return full;
    // only format known prefix styles (avoid changing random words+numbers)
    if (!/^[A-Za-z]{2,6}$/.test(pfx)) return full;
    return `${pfx}-${digits}`;
  });
}
