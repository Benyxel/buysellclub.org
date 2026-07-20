/**
 * Customer payment reference for MoMo / bank transfers:
 * shipping mark ID + "-" + total package count.
 * Example: FIM000 with 12 packages → FIM000-12
 */

export function normalizeMarkId(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const idx = s.indexOf(":");
  return idx === -1 ? s : s.slice(0, idx).trim();
}

/** Count billable package lines (exclude STORAGE fee rows). */
export function invoicePackageCount(invoice) {
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const packages = items.filter((item) => {
    const tn = String(item?.tracking_number || "")
      .trim()
      .toUpperCase();
    const desc = String(item?.description || "")
      .trim()
      .toUpperCase();
    if (tn === "STORAGE" || desc.startsWith("STORAGE")) return false;
    return true;
  });
  if (packages.length > 0) return packages.length;
  const fromSummary = Number(invoice?.summary?.total_packages);
  if (Number.isFinite(fromSummary) && fromSummary > 0) return fromSummary;
  return items.length;
}

/**
 * @param {object} invoice
 * @param {string} [fallbackMarkId]
 * @returns {string}
 */
export function buildPaymentReference(invoice, fallbackMarkId = "") {
  const mark =
    normalizeMarkId(invoice?.shipping_mark) ||
    normalizeMarkId(fallbackMarkId) ||
    "MARK";
  const packages = invoicePackageCount(invoice);
  return `${mark}-${packages}`;
}
