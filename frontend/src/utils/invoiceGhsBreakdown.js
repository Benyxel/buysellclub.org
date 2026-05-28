/**
 * Effective total CBM for display (excludes double-counting STORAGE line vs freight lines).
 */
export function getInvoiceTotalCbm(items) {
  if (!items?.length) return 0;
  let storageCbm = 0;
  let freightCbm = 0;
  for (const i of items) {
    const tn = String(i.tracking_number || "").toUpperCase();
    const cbm = Number(i.cbm || 0);
    if (tn === "STORAGE") {
      if (cbm > 0) storageCbm = cbm;
    } else {
      freightCbm += cbm;
    }
  }
  const total = storageCbm > 0 ? storageCbm : freightCbm;
  return Math.round(total * 1000) / 1000;
}

/**
 * GHS breakdown for shipping invoices: freight (from USD×rate) + storage (cedis).
 */
export function getInvoiceGhsBreakdown(invoice) {
  if (!invoice) {
    return { freightUsd: 0, freightGhs: 0, storageGhs: 0, totalGhs: 0, rate: 0 };
  }

  const rate = parseFloat(invoice.exchange_rate || 0);
  const freightUsd = parseFloat(invoice.total_amount ?? invoice.subtotal ?? 0);
  const storageGhs = parseFloat(invoice.storage_fee_ghs || 0);
  const totalGhsStored = parseFloat(invoice.total_amount_ghs ?? 0);

  let freightGhs = 0;
  if (totalGhsStored > 0) {
    freightGhs = Math.max(0, Math.round((totalGhsStored - storageGhs) * 100) / 100);
  } else if (rate > 0 && Number.isFinite(freightUsd)) {
    freightGhs = Math.round(freightUsd * rate * 100) / 100;
  }

  const totalGhs =
    totalGhsStored > 0
      ? totalGhsStored
      : Math.round((freightGhs + storageGhs) * 100) / 100;

  return { freightUsd, freightGhs, storageGhs, totalGhs, rate };
}
