import React from "react";

/**
 * Shows a tracking number with repack badges (public + admin).
 * Pass tracking_number or TrackingNum plus isRepack / repackParentNumber / repackMemberCount / repackMemberNumbers.
 */
export default function TrackingNumberLabel({ tracking, compact = false }) {
  const num = tracking?.TrackingNum || tracking?.tracking_number || "—";

  if (tracking?.isRepack) {
    const count = Number(tracking.repackMemberCount ?? tracking.repack_member_count) || 0;
    const members = tracking.repackMemberNumbers || tracking.repack_member_numbers || [];
    return (
      <div className={compact ? "" : "min-w-[120px]"}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-gray-900 dark:text-white font-mono text-sm">
            {num}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-violet-600 text-white shadow-sm">
            Repack
          </span>
        </div>
        <p className="mt-1 text-xs font-medium text-violet-700 dark:text-violet-300">
          {count} tracking number{count === 1 ? "" : "s"} in this repack
        </p>
        {!compact && members.length > 0 && members.length <= 6 && (
          <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 font-mono leading-snug">
            {members.join(", ")}
          </p>
        )}
        {!compact && members.length > 6 && (
          <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
            {members.slice(0, 5).join(", ")} +{members.length - 5} more
          </p>
        )}
      </div>
    );
  }

  if (tracking?.repackParentNumber || tracking?.repack_parent_number) {
    const parent = tracking.repackParentNumber || tracking.repack_parent_number;
    return (
      <div className={compact ? "" : "min-w-[120px]"}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-gray-900 dark:text-white font-mono text-sm">
            {num}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-900/35 dark:text-amber-200 dark:border-amber-800">
            In repack
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          Bundled under{" "}
          <span className="font-mono font-semibold text-amber-800 dark:text-amber-200">
            {parent}
          </span>
        </p>
      </div>
    );
  }

  return (
    <span className="font-medium text-gray-900 dark:text-white font-mono text-sm">
      {num}
    </span>
  );
}
