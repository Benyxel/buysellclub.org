import React from "react";
import TrackingNumberLabel from "./TrackingNumberLabel";

/** Map API invoice line item to TrackingNumberLabel props. */
export function mapInvoiceItemToTracking(item) {
  if (!item) return {};
  return {
    tracking_number: item.tracking_number,
    isRepack: !!item.is_repack,
    repackParentNumber: item.repack_parent_number,
    repackMemberCount: item.repack_member_count ?? 0,
    repackMemberNumbers: item.repack_member_numbers || [],
  };
}

export function InvoiceItemTrackingLabel({ item, compact = false }) {
  return <TrackingNumberLabel tracking={mapInvoiceItemToTracking(item)} compact={compact} />;
}

/** CBM column: repack members have no line CBM (volume is on the repack row). */
export function InvoiceItemCbm({ item, className = "" }) {
  if (item?.repack_parent_number) {
    return (
      <div className={className}>
        <span className="text-gray-400 dark:text-gray-500">—</span>
        <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5 max-w-[140px] ml-auto text-right">
          CBM on repack{" "}
          <span className="font-mono font-semibold">{item.repack_parent_number}</span>
        </p>
      </div>
    );
  }
  return (
    <span className={className}>
      {Number(item?.cbm || 0).toFixed(3)}
      {item?.is_repack ? (
        <span className="block text-[10px] text-violet-600 dark:text-violet-300 font-normal mt-0.5">
          Repack total
        </span>
      ) : null}
    </span>
  );
}
