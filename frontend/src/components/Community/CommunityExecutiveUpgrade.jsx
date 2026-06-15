import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaCrown } from "react-icons/fa";
import { Api } from "../../api";
import { executiveUpgradeSummary } from "../../constants/executiveMembership";

export default function CommunityExecutiveUpgrade({
  isCommunityMember: isCommunityMemberProp,
  isExecutiveMember: isExecutiveMemberProp,
  compact = false,
}) {
  const [loading, setLoading] = useState(
    isCommunityMemberProp === undefined || isExecutiveMemberProp === undefined
  );
  const [isCommunityMember, setIsCommunityMember] = useState(
    Boolean(isCommunityMemberProp)
  );
  const [isExecutiveMember, setIsExecutiveMember] = useState(
    Boolean(isExecutiveMemberProp)
  );
  const [amountToPay, setAmountToPay] = useState(0);
  const [upgradeSummary, setUpgradeSummary] = useState(
    executiveUpgradeSummary()
  );

  useEffect(() => {
    if (
      isCommunityMemberProp !== undefined &&
      isExecutiveMemberProp !== undefined
    ) {
      setIsCommunityMember(Boolean(isCommunityMemberProp));
      setIsExecutiveMember(Boolean(isExecutiveMemberProp));
    }
  }, [isCommunityMemberProp, isExecutiveMemberProp]);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const requests = [Api.executive.settings.get().catch(() => ({ data: {} }))];

        if (
          isCommunityMemberProp === undefined ||
          isExecutiveMemberProp === undefined
        ) {
          requests.unshift(
            Api.community.myRequest().catch(() => ({ data: {} })),
            Api.executive.myRequest().catch(() => ({ data: {} }))
          );
        }

        const responses = await Promise.all(requests);

        let settingsResp;
        if (
          isCommunityMemberProp === undefined ||
          isExecutiveMemberProp === undefined
        ) {
          const [communityResp, executiveResp, settings] = responses;
          settingsResp = settings;
          const status = communityResp.data?.request?.status;
          const sheetType = communityResp.data?.sheet_access_type;
          const telegramLink = communityResp.data?.telegram_link || "";
          setIsCommunityMember(
            status === "approved" || (sheetType === "member" && !!telegramLink)
          );
          setIsExecutiveMember(Boolean(executiveResp.data?.is_executive_member));
        } else {
          settingsResp = responses[0];
        }

        const membershipAmount = Number(settingsResp.data?.membership_amount || 0);
        const salePrice = Number(settingsResp.data?.sale_price || 0);
        setAmountToPay(
          salePrice > 0 && salePrice < membershipAmount ? salePrice : membershipAmount
        );
        setUpgradeSummary(executiveUpgradeSummary(settingsResp.data || {}));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isCommunityMemberProp, isExecutiveMemberProp]);

  if (loading || !isCommunityMember) return null;

  if (isExecutiveMember) {
    return (
      <div
        className={`rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:border-amber-700/50 dark:from-amber-950/30 dark:to-gray-900 ${
          compact ? "p-4" : "p-5 sm:p-6"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
              <FaCrown className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                Executive Member
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Your Executive membership is active.
              </p>
            </div>
          </div>
          <Link
            to="/Profile?tab=membership"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            View membership card
            <FaArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:border-amber-700/50 dark:from-amber-950/30 dark:to-gray-900 ${
        compact ? "p-4" : "p-5 sm:p-6"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
            <FaCrown className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              Upgrade to Executive Member
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {compact
                ? `Unlock ${upgradeSummary}, and your Executive membership card.`
                : `You’re a Community member — upgrade for ${upgradeSummary}, and an Executive digital membership card for one year.`}
            </p>
            {amountToPay > 0 && (
              <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                From ₵{amountToPay.toFixed(2)} / year
              </p>
            )}
          </div>
        </div>
        <Link
          to="/ExecutivePayment"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          Upgrade to Executive
          <FaCrown className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
