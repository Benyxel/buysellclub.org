/**
 * Normalize GET /buysellapi/trackings/ body (array or paginated wrapper).
 */
export function normalizeTrackingsList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

/**
 * Parse CBM from API / user input (comma or dot decimals, strings, numbers).
 */
export function parseCbmNumber(value) {
  if (value == null || value === "") return NaN;
  const s = String(value).trim().replace(/\s/g, "").replace(",", ".");
  if (s === "") return NaN;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

/** CBM in micro-units (6 decimal places) to avoid float edge cases at 0.1 */
export function cbmToMicros(value) {
  const n = parseCbmNumber(value);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 1_000_000);
}

export function microsToCbm(micros) {
  if (!Number.isFinite(micros)) return NaN;
  return micros / 1_000_000;
}

/**
 * True if 0 < CBM ≤ maxCbm (inclusive of max), using micro rounding so 0.1 and sums like 0.05+0.05 work.
 */
export function isCbmEligibleForDelivery(totalCbm, maxCbm = 0.1) {
  const total = cbmToMicros(totalCbm);
  const max = cbmToMicros(maxCbm);
  if (!Number.isFinite(total) || !Number.isFinite(max)) return false;
  return total > 0 && total <= max;
}

/** Short string for form fields (avoids IEEE noise when prefilling from totals). */
export function formatCbmForInput(value) {
  const n = parseCbmNumber(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  const micros = cbmToMicros(n);
  if (!Number.isFinite(micros)) return "";
  return (micros / 1_000_000).toFixed(6).replace(/\.?0+$/, "");
}

/**
 * Container FK from tracking (handles id, container_id, or nested { id }).
 */
export function getTrackingContainerId(t) {
  if (!t || typeof t !== "object") return null;
  const c = t.container;
  if (c != null && c !== "") {
    if (typeof c === "object" && c !== null && "id" in c) {
      const id = c.id;
      return id != null && id !== "" ? id : null;
    }
    return c;
  }
  const cid = t.container_id;
  if (cid != null && cid !== "") return cid;
  return null;
}

/**
 * Per container: total CBM for this user's trackings in that container.
 * Bulk groups: count each bulk_group_id's bulk_total_cbm once per container.
 * Non-bulk rows: sum row cbm (or cbm_display).
 */
export function summarizeCbmByContainer(trackings) {
  const list = Array.isArray(trackings) ? trackings : [];
  /** @type {Map<string, { containerId: any, containerNumber: string|null, bulkSeen: Set<string>, bulkSum: number, looseSum: number }>} */
  const buckets = new Map();

  for (const t of list) {
    const cid = getTrackingContainerId(t);
    if (cid == null || cid === "") continue;

    const key = String(cid);
    if (!buckets.has(key)) {
      buckets.set(key, {
        containerId: cid,
        containerNumber: t.container_number || null,
        bulkSeen: new Set(),
        bulkSum: 0,
        looseSum: 0,
      });
    }
    const b = buckets.get(key);
    if (t.container_number) b.containerNumber = t.container_number;

    const bgid = t.bulk_group_id;
    if (bgid != null && bgid !== "") {
      const gk = String(bgid);
      if (!b.bulkSeen.has(gk)) {
        b.bulkSeen.add(gk);
        let contrib = parseCbmNumber(t.bulk_total_cbm);
        if (!Number.isFinite(contrib)) {
          contrib = parseCbmNumber(t.cbm ?? t.cbm_display);
        }
        if (Number.isFinite(contrib)) b.bulkSum += contrib;
      }
    } else {
      const raw = t.cbm ?? t.cbm_display;
      const v = parseCbmNumber(raw);
      if (Number.isFinite(v)) b.looseSum += v;
    }
  }

  return [...buckets.values()].map((b) => {
    const totalRaw = b.bulkSum + b.looseSum;
    const totalMicros = cbmToMicros(totalRaw);
    const totalCbm = Number.isFinite(totalMicros)
      ? microsToCbm(totalMicros)
      : totalRaw;
    return {
      containerId: b.containerId,
      containerNumber: b.containerNumber,
      totalCbm,
    };
  });
}

/**
 * @param {ReturnType<summarizeCbmByContainer>} summaries
 * @param {number} maxCbm
 */
/**
 * Rider pickup only after container status Offloaded (Django value `offloaded`).
 * `arrived_port` is "Arrived at Port" only — not eligible. Keep in sync with buysellapi/views.py.
 */
export function isContainerOffloadedForDelivery(status) {
  if (status == null || status === "") return false;
  return String(status).trim() === "offloaded";
}

/** Effective "Request delivery" for a container row: CBM cap + offloaded status (ignores stale API flags). */
export function containerRowCanRequestDelivery(row, maxCbm) {
  if (!row || typeof row !== "object") return false;
  const st = row.containerStatus ?? row.container_status ?? null;
  return (
    isCbmEligibleForDelivery(row.totalCbm, maxCbm) &&
    isContainerOffloadedForDelivery(st)
  );
}

export function withDeliveryEligibility(summaries, maxCbm) {
  return summaries.map((s) => ({
    ...s,
    canRequestDelivery: isCbmEligibleForDelivery(s.totalCbm, maxCbm),
  }));
}

/**
 * Shipments with CBM but not assigned to a container yet (same bulk dedup rules).
 * Each entry is one requestable line: single tracking or one bulk group.
 */
export function summarizeCbmWithoutContainer(trackings) {
  const list = Array.isArray(trackings) ? trackings : [];
  const out = [];
  const bulkSeen = new Set();

  for (const t of list) {
    if (getTrackingContainerId(t) != null) continue;

    const bgid = t.bulk_group_id;
    if (bgid != null && bgid !== "") {
      const gk = String(bgid);
      if (bulkSeen.has(gk)) continue;
      bulkSeen.add(gk);
      let contrib = parseCbmNumber(t.bulk_total_cbm);
      if (!Number.isFinite(contrib)) {
        contrib = parseCbmNumber(t.cbm ?? t.cbm_display);
      }
      if (!Number.isFinite(contrib) || contrib <= 0) continue;
      const totalMicros = cbmToMicros(contrib);
      const totalCbm = Number.isFinite(totalMicros)
        ? microsToCbm(totalMicros)
        : contrib;
      const nums = Array.isArray(t.bulk_tracking_numbers)
        ? t.bulk_tracking_numbers
        : [];
      const detail =
        nums.length > 0
          ? nums.slice(0, 4).join(", ") + (nums.length > 4 ? " …" : "")
          : t.tracking_number || "";
      out.push({
        rowKey: `orphan-bulk-${gk}`,
        kind: "bulk_group",
        title: "Bulk shipment (no container yet)",
        detail,
        trackingNumber: t.tracking_number || "",
        trackingId: t.id,
        bulkGroupId: bgid,
        totalCbm,
      });
    } else {
      const contrib = parseCbmNumber(t.cbm ?? t.cbm_display);
      if (!Number.isFinite(contrib) || contrib <= 0) continue;
      const totalMicros = cbmToMicros(contrib);
      const totalCbm = Number.isFinite(totalMicros)
        ? microsToCbm(totalMicros)
        : contrib;
      out.push({
        rowKey: `orphan-t-${t.id}`,
        kind: "single",
        title: t.tracking_number || `Tracking #${t.id}`,
        detail: t.shipping_mark || "—",
        trackingNumber: t.tracking_number || "",
        trackingId: t.id,
        bulkGroupId: null,
        totalCbm,
      });
    }
  }
  return out;
}

export function withOrphanEligibility(rows, maxCbm) {
  return rows.map((r) => ({
    ...r,
    canRequestDelivery: isCbmEligibleForDelivery(r.totalCbm, maxCbm),
  }));
}
