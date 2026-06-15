import React from "react";
import { Link } from "react-router-dom";
import {
  FaCheck,
  FaClock,
  FaCrown,
  FaLock,
  FaUsers,
} from "react-icons/fa";
import { COMMUNITY_BENEFITS } from "../../constants/membershipPlans";
import { buildExecutiveOnlyBenefits } from "../../constants/executiveMembership";

function formatPrice(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `₵${n.toFixed(2)}`;
}

function PriceBlock({ amount, baseAmount, period = "year" }) {
  const display = formatPrice(amount);
  const base = formatPrice(baseAmount);
  const onSale =
    Number(baseAmount) > 0 &&
    Number(amount) > 0 &&
    Number(amount) < Number(baseAmount);

  if (!display) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Pricing not set — contact support
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          {display}
        </span>
        <span className="pb-1 text-sm text-gray-500 dark:text-gray-400">
          / {period}
        </span>
      </div>
      {onSale && base ? (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          <span className="line-through">{base}</span>
          <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">
            Limited offer
          </span>
        </p>
      ) : null}
    </div>
  );
}

function BenefitList({ items, iconClass = "text-emerald-500", className = "mt-6" }) {
  return (
    <ul className={`space-y-3 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
          <FaCheck className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function BenefitGroup({ title, items, iconClass, titleClass = "text-amber-800 dark:text-amber-300" }) {
  if (!items?.length) return null;
  return (
    <div className="mt-6">
      <p className={`text-xs font-semibold uppercase tracking-wide ${titleClass}`}>
        {title}
      </p>
      <BenefitList items={items} iconClass={iconClass} className="mt-3" />
    </div>
  );
}

function StatusBadge({ children, className }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}

export default function MembershipPricingSection({
  communityAmount = 0,
  communityBaseAmount = 0,
  executiveAmount = 0,
  executiveBaseAmount = 0,
  executiveSettings = {},
  isLoggedIn = false,
  isCommunityMember = false,
  isExecutiveMember = false,
  communityRequestStatus = null,
  loading = false,
  priceJumpCountdown = "",
}) {
  const executiveBenefits = buildExecutiveOnlyBenefits(executiveSettings);
  const communityReady = Number(communityAmount) > 0;
  const executiveReady = Number(executiveAmount) > 0;

  const communityStatusLabel =
    communityRequestStatus === "pending"
      ? "Pending approval"
      : communityRequestStatus === "rejected"
        ? "Not approved"
        : isCommunityMember
          ? "Active"
          : null;

  return (
    <section className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          Membership
        </p>
        <h2 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
          Choose your plan
        </h2>
        <p className="mt-3 text-gray-600 dark:text-gray-400">
          Community and Executive plans include full member access. Pay first—we&apos;ll
          email you a link to set your username and password after payment.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        {/* Community */}
        <article className="relative flex flex-col rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-lg dark:border-emerald-800/50 dark:from-emerald-950/25 dark:via-gray-900 dark:to-gray-900 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
                <FaUsers className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Community
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Full member hub &amp; Telegram access
                </p>
              </div>
            </div>
            {communityStatusLabel ? (
              <StatusBadge
                className={
                  isCommunityMember
                    ? "bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"
                    : communityRequestStatus === "pending"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                }
              >
                {communityStatusLabel}
              </StatusBadge>
            ) : null}
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Loading pricing…</p>
          ) : (
            <PriceBlock
              amount={communityAmount}
              baseAmount={communityBaseAmount}
            />
          )}

          <BenefitList items={COMMUNITY_BENEFITS} iconClass="text-emerald-500" />

          <div className="mt-auto pt-8">
            {isCommunityMember ? (
              <Link
                to="/Profile?tab=community"
                className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Open member hub
              </Link>
            ) : communityRequestStatus === "pending" ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
                Your payment is pending admin approval.
              </div>
            ) : (
              <Link
                to="/CommunityPayment"
                className={`flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white transition ${
                  communityReady
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "cursor-not-allowed bg-gray-400"
                }`}
                aria-disabled={!communityReady}
                onClick={(e) => {
                  if (!communityReady) e.preventDefault();
                }}
              >
                Get Access
              </Link>
            )}
          </div>
        </article>

        {/* Executive */}
        <article className="relative flex flex-col rounded-2xl border-2 border-amber-400/80 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-xl dark:border-amber-600/50 dark:from-amber-950/30 dark:via-gray-900 dark:to-gray-900 sm:p-8">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-4 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-md">
            Best value
          </span>

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                <FaCrown className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Executive Member
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Community perks + exclusive savings
                </p>
              </div>
            </div>
            {isExecutiveMember ? (
              <StatusBadge className="bg-amber-600/10 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
                Active
              </StatusBadge>
            ) : (
              <StatusBadge className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                Upgrade
              </StatusBadge>
            )}
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Loading pricing…</p>
          ) : (
            <PriceBlock
              amount={executiveAmount}
              baseAmount={executiveBaseAmount}
            />
          )}

          <BenefitGroup
            title="Community benefits included"
            items={COMMUNITY_BENEFITS}
            iconClass="text-amber-500"
            titleClass="text-emerald-800 dark:text-emerald-300"
          />
          <BenefitGroup
            title="Executive perks"
            items={executiveBenefits}
            iconClass="text-amber-500"
          />

          <div className="mt-auto pt-8">
            {isExecutiveMember ? (
              <Link
                to="/Profile?tab=membership"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
              >
                <FaCrown className="h-4 w-4" />
                View membership card
              </Link>
            ) : (
              <Link
                to="/ExecutivePayment"
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition ${
                  executiveReady
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "cursor-not-allowed bg-gray-400"
                }`}
                aria-disabled={!executiveReady}
                onClick={(e) => {
                  if (!executiveReady) e.preventDefault();
                }}
              >
                <FaCrown className="h-4 w-4" />
                Get Access
              </Link>
            )}
          </div>
        </article>
      </div>

      {!isCommunityMember && communityReady && priceJumpCountdown ? (
        <div className="mx-auto max-w-2xl rounded-xl border border-pink-200/80 bg-pink-100 px-4 py-3 shadow-sm dark:border-pink-500/30 dark:bg-pink-500/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-pink-950 dark:text-pink-100">
                Community price will jump to{" "}
                <span className="font-extrabold">GHS 1500</span> soon
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-pink-900/70 dark:text-pink-100/70">
                <FaLock className="text-pink-700 dark:text-pink-200" />
                Secure your spot before the price changes.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-pink-200 bg-white/85 px-3 py-1.5 shadow-sm dark:border-pink-500/30 dark:bg-pink-500/10">
              <FaClock className="text-pink-600 dark:text-pink-300" />
              <span className="font-mono text-sm font-bold text-pink-950 dark:text-pink-100">
                {priceJumpCountdown || "01:00:00"}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
