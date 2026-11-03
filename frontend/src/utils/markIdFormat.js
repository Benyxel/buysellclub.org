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
export const MARK_PREFIXES = ["FIM", "BSC"];
export const DEFAULT_MARK_PREFIX = "FIM";
const CANONICAL_MARK_ID_RE = /^(FIM|BSC)\d+$/i;

/** Swap FIM ↔ BSC while keeping the typed digits. */
export function switchMarkPrefix(raw, nextPrefix) {
  const prefix = MARK_PREFIXES.includes(String(nextPrefix || "").toUpperCase())
    ? String(nextPrefix).toUpperCase()
    : DEFAULT_MARK_PREFIX;
  const digits = String(raw || "")
    .toUpperCase()
    .replace(/^(FIM|BSC)/, "")
    .replace(/\D/g, "");
  return withMarkPrefix(prefix + digits);
}

/**
 * Keep mark prefix in the field (FIM or BSC) and let the user type digits.
 * Digits alone default to FIM. Used on Mark ID inputs (invoice, scanner, etc.).
 */
export function withFimPrefix(raw) {
  return withMarkPrefix(raw);
}

/** Warehouse / scanner Mark ID field: FIM### or BSC###. Digits alone → FIM. */
export function withMarkPrefix(raw) {
  const firstLine = String(raw || "")
    .replace(/\u00a0/g, " ")
    .split(/[\r\n]+/)[0]
    .trim();
  const upper = firstLine.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!upper) return DEFAULT_MARK_PREFIX;
  const hyphenated = upper.match(/^(FIM|BSC)-(\d*)$/);
  if (hyphenated) return `${hyphenated[1]}${hyphenated[2]}`;
  const alnum = upper.replace(/[^A-Z0-9]/g, "");
  if (!alnum) return DEFAULT_MARK_PREFIX;

  for (const prefix of MARK_PREFIXES) {
    if (alnum.startsWith(prefix)) {
      return prefix + alnum.slice(prefix.length).replace(/\D/g, "");
    }
  }
  for (const prefix of MARK_PREFIXES) {
    const at = alnum.indexOf(prefix);
    if (at >= 0) {
      return prefix + alnum.slice(at + prefix.length).replace(/\D/g, "");
    }
  }
  return DEFAULT_MARK_PREFIX + alnum.replace(/\D/g, "");
}

/** True when mark is complete enough to look up / assign shipping. */
export function isUsableMarkId(mark) {
  return CANONICAL_MARK_ID_RE.test(normalizeMarkIdInput(mark));
}

export function markPrefixOf(mark) {
  const upper = String(mark || "").toUpperCase();
  for (const prefix of MARK_PREFIXES) {
    if (upper.startsWith(prefix)) return prefix;
  }
  return DEFAULT_MARK_PREFIX;
}

/**
 * For multi-purpose search bars (invoice # / mark / container):
 * digits-only or FIM…/BSC… → auto mark; leave other queries alone.
 */
export function withFimPrefixIfMarkLike(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  if (/#/i.test(trimmed) || /FIMC/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^\d+$/.test(trimmed)) return withMarkPrefix(trimmed);
  const alnum = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "");
  for (const prefix of MARK_PREFIXES) {
    if (alnum.startsWith(prefix)) return withMarkPrefix(trimmed);
  }
  return trimmed;
}

/** Accept both `FIM000`/`FIM-000` and `BSC000`/`BSC-000` for API calls / comparisons. */
export function normalizeMarkIdInput(markId) {
  const raw = String(markId || "")
    .trim()
    .toUpperCase()
    .split(":", 1)[0]
    .trim();
  if (!raw) return "";
  const m = raw.match(/^([A-Z]{2,6})-(\d+)$/);
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
  if (!target || !/^(FIM|BSC)\d{1,10}$/i.test(target)) return list;
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
    if (!/^(FIM|BSC)$/i.test(pfx)) return full;
    return `${pfx}-${digits}`;
  });
}
