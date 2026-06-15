const DEFAULT_SHIPPING_DISCOUNT = 5;
const DEFAULT_BUY4ME_DISCOUNT = 50;

export function buildExecutiveBenefits(settings = {}) {
  const shippingDiscount = Number(
    settings.shipping_discount_percent ?? DEFAULT_SHIPPING_DISCOUNT
  );
  const buy4meDiscount = Number(
    settings.buy4me_sourcing_discount_percent ?? DEFAULT_BUY4ME_DISCOUNT
  );

  return [
    `${shippingDiscount}% off shipping fees for the whole year`,
    `${buy4meDiscount}% off Buy For Me sourcing fees`,
    "Access to winning products",
    "Supplier contacts",
    "Wholesale product deals",
    "Video tutorials",
    "Questions & Answers support",
    "Member events and networking",
    "General discussion community",
    "Additional premium resources over time",
  ];
}

/** @deprecated Use buildExecutiveBenefits(settings) for admin-configured discounts. */
export const EXECUTIVE_BENEFITS = buildExecutiveBenefits();

export function executiveUpgradeSummary(settings = {}) {
  const shippingDiscount = Number(
    settings.shipping_discount_percent ?? DEFAULT_SHIPPING_DISCOUNT
  );
  const buy4meDiscount = Number(
    settings.buy4me_sourcing_discount_percent ?? DEFAULT_BUY4ME_DISCOUNT
  );
  return `${shippingDiscount}% off shipping, ${buy4meDiscount}% off Buy4Me fees`;
}

/** Benefits shown on Executive pricing (Community is included separately). */
export function buildExecutiveOnlyBenefits(settings = {}) {
  const shippingDiscount = Number(
    settings.shipping_discount_percent ?? DEFAULT_SHIPPING_DISCOUNT
  );
  const buy4meDiscount = Number(
    settings.buy4me_sourcing_discount_percent ?? DEFAULT_BUY4ME_DISCOUNT
  );

  return [
    `${shippingDiscount}% off shipping fees for the whole year`,
    `${buy4meDiscount}% off Buy For Me sourcing fees`,
    "Executive digital membership card (1 year)",
    "Additional premium resources over time",
  ];
}
