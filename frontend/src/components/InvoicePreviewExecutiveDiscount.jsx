import React from "react";

/** Executive member shipping discount row for invoice preview tables. */
export function InvoicePreviewExecutiveDiscountRows({
  totals,
  colSpan = 3,
}) {
  const execDiscount = Number(totals?.executive_discount_usd || 0);
  const execPct = Number(totals?.executive_discount_percent || 0);

  if (execDiscount <= 0) {
    return null;
  }

  return (
    <tr className="font-semibold text-emerald-700 dark:text-emerald-400">
      <td
        className="px-3 py-2 text-right text-gray-900 dark:text-white"
        colSpan={colSpan}
      >
        Executive Member discount ({execPct}%)
      </td>
      <td className="px-3 py-2 text-right">
        -${execDiscount.toFixed(2)}
      </td>
    </tr>
  );
}
