import React from "react";

function formatGhs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(2);
}

/** Shows Buy4Me sourcing fee with optional Executive Member discount. */
export function Buy4meSourcingFeePricing({
  originalAmount = 0,
  amount,
  executiveDiscountGhs = 0,
  executiveDiscountPercent = 0,
  variant = "default",
  label = "Sourcing fee",
}) {
  const original = Number(originalAmount) || 0;
  const payAmount = Number(amount ?? originalAmount) || 0;
  const discount = Number(executiveDiscountGhs) || 0;
  const discountPct = Number(executiveDiscountPercent) || 0;
  const hasDiscount = discount > 0 && payAmount < original;

  if (variant === "inline") {
    if (!hasDiscount) {
      return (
        <span>
          {label}: GHS {formatGhs(original)}
        </span>
      );
    }
    return (
      <span>
        {label}:{" "}
        <span className="line-through text-gray-500 dark:text-gray-400">
          GHS {formatGhs(original)}
        </span>{" "}
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
          GHS {formatGhs(payAmount)}
        </span>
        {discountPct > 0 ? (
          <span className="text-emerald-600 dark:text-emerald-400">
            {" "}
            (Executive {discountPct}% off)
          </span>
        ) : null}
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <div className="space-y-0.5">
        {hasDiscount ? (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-through">
              {label}: GHS {formatGhs(original)}
            </p>
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Executive discount ({discountPct}%): -GHS {formatGhs(discount)}
            </p>
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
              You pay: GHS {formatGhs(payAmount)}
            </p>
          </>
        ) : (
          <p className="text-xs font-medium text-blue-900 dark:text-blue-200">
            {label}: GHS {formatGhs(original) || "—"}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {hasDiscount ? (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-through">
            {label}: GHS {formatGhs(original)}
          </p>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Executive Member discount ({discountPct}%): -GHS {formatGhs(discount)}
          </p>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            You pay: GHS {formatGhs(payAmount)}
          </p>
        </>
      ) : (
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          {label}: GHS {formatGhs(original) || "—"}
        </p>
      )}
    </div>
  );
}

export function getEffectiveSourcingFeeAmount(pricing, defaultAmount = 0) {
  const amount = Number(pricing?.amount ?? defaultAmount);
  return Number.isFinite(amount) ? amount : 0;
}
