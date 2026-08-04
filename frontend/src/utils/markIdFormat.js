/** Strip optional ":Owner Name" suffix from stored shipping_mark values. */
export function shippingMarkToMarkId(shippingMark) {
  const raw = String(shippingMark || "").trim();
  if (!raw) return "";
  const idx = raw.indexOf(":");
  return (idx === -1 ? raw : raw.slice(0, idx)).trim();
}

/**
 * Warehouse catch-all mark(s) for unlabeled / unknown packages.
 * Shown to users as "Unknown" instead of the raw code.
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

/** True when this mark is the unknown-package placeholder (e.g. FIM752 / FIM-752). */
export function isUnknownPackageMark(markOrShippingMark) {
  const bare = shippingMarkToMarkId(markOrShippingMark);
  if (!bare) return false;
  return UNKNOWN_PACKAGE_MARK_IDS.has(normalizeMarkIdInput(bare));
}

/** Mark id only for tables/lists — unknown placeholder → "Unknown"; else no hyphen (FIM1330). */
export function formatShippingMarkForDisplay(shippingMark) {
  const id = shippingMarkToMarkId(shippingMark);
  if (!id) return "";
  if (isUnknownPackageMark(id)) return "Unknown";
  return id;
}

export function formatMarkIdForDisplay(markId) {
  const raw = String(markId || "").trim();
  if (!raw) return "";
  if (isUnknownPackageMark(raw)) return "Unknown";
  if (raw.includes("-")) return raw;
  const m = raw.match(/^([A-Za-z]+)(\d+)$/);
  if (!m) return raw;
  return `${m[1]}-${m[2]}`;
}

/** Replace any inline mark ids like FIM000 → FIM-000 (and FIM752 → Unknown) inside free-form text. */
export function formatMarkIdInText(text) {
  const raw = String(text ?? "");
  if (!raw) return "";
  return raw.replace(/\b([A-Za-z]+)-?(\d{1,})\b/g, (full, pfx, digits) => {
    const candidate = `${pfx}${digits}`;
    if (isUnknownPackageMark(candidate) || isUnknownPackageMark(full)) {
      return "Unknown";
    }
    if (full.includes("-")) return full;
    // only format known prefix styles (avoid changing random words+numbers)
    if (!/^[A-Za-z]{2,6}$/.test(pfx)) return full;
    return `${pfx}-${digits}`;
  });
}
