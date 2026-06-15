import React from "react";
import { Link } from "react-router-dom";
import {
  FaArrowRight,
  FaCrown,
  FaUsers,
} from "react-icons/fa";
import ProfileMembershipCard from "./ProfileMembershipCard";

export default function ProfileMembership({
  userId,
  memberFullName,
  isCommunityMember,
  isExecutiveMember = false,
  membershipJoinedAt = null,
  membershipExpiresAt = null,
  executiveJoinedAt = null,
  executiveExpiresAt = null,
  onOpenCommunityTab,
}) {
  return (
    <div className="space-y-8">
      <ProfileMembershipCard
        userId={userId}
        memberFullName={memberFullName}
        isCommunityMember={isCommunityMember}
        isExecutiveMember={isExecutiveMember}
        membershipJoinedAt={membershipJoinedAt}
        membershipExpiresAt={membershipExpiresAt}
        executiveJoinedAt={executiveJoinedAt}
        executiveExpiresAt={executiveExpiresAt}
      />

      <div>
        <h2 className="text-base font-semibold text-gray-800 dark:text-white sm:text-xl">
          Membership plans
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Community and Executive tiers — upgrade when you are ready.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div
          className={`rounded-2xl border p-5 sm:p-6 ${
            isCommunityMember
              ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-800/60 dark:from-emerald-950/30 dark:to-gray-900"
              : "border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                isCommunityMember
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              <FaUsers className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Community
                </h3>
                {isCommunityMember ? (
                  <span className="inline-flex rounded-full bg-emerald-600/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    Not joined
                  </span>
                )}
              </div>
              <div className="mt-5">
                {isCommunityMember ? (
                  <button
                    type="button"
                    onClick={onOpenCommunityTab}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Open community hub
                    <FaArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <Link
                    to="/Community"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
                  >
                    Join community
                    <FaArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-5 sm:p-6 ${
            isExecutiveMember
              ? "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:border-amber-700/60 dark:from-amber-950/30 dark:to-gray-900"
              : "border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                isExecutiveMember
                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/25"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              }`}
            >
              <FaCrown className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Executive Member
                </h3>
                {isExecutiveMember ? (
                  <span className="inline-flex rounded-full bg-amber-600/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                    Upgrade
                  </span>
                )}
              </div>
              <div className="mt-5">
                {isExecutiveMember ? (
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    Your Executive membership is active for one year from your upgrade date.
                  </p>
                ) : (
                  <Link
                    to="/ExecutivePayment"
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
                  >
                    Get Executive membership
                    <FaCrown className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
