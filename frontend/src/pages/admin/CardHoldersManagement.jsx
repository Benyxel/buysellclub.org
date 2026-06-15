import React, { useCallback, useEffect, useState } from "react";
import { FaEye, FaIdCard, FaSearch, FaSpinner, FaTimes } from "react-icons/fa";
import { Api } from "../../api";
import { toast } from "../../utils/toast";
import MembershipCardVisual from "../../components/profile/MembershipCardVisual";
import { mapMembershipCardFromApi } from "../../utils/membershipCardStorage";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function tierLabel(tier) {
  if (tier === "executive") return "Executive";
  return "Community";
}

export default function CardHoldersManagement() {
  const [loading, setLoading] = useState(false);
  const [holders, setHolders] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [showCardModal, setShowCardModal] = useState(false);
  const [viewLoadingId, setViewLoadingId] = useState(null);
  const [viewCard, setViewCard] = useState(null);
  const [viewMeta, setViewMeta] = useState(null);
  const pageSize = 10;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchHolders = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const response = await Api.membershipCard.adminList({
          params: {
            page,
            page_size: pageSize,
            q: debouncedSearch || undefined,
            tier: tierFilter === "all" ? undefined : tierFilter,
          },
        });
        const data = response.data;
        if (data?.results) {
          setHolders(data.results);
          setTotal(data.count || 0);
        } else if (Array.isArray(data)) {
          setHolders(data);
          setTotal(data.length);
        } else {
          setHolders([]);
          setTotal(0);
        }
        setCurrentPage(page);
      } catch (error) {
        console.error("Failed to fetch card holders:", error);
        toast.error("Failed to load card holders");
        setHolders([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, tierFilter],
  );

  useEffect(() => {
    fetchHolders(1);
  }, [fetchHolders]);

  const closeCardModal = () => {
    setShowCardModal(false);
    setViewCard(null);
    setViewMeta(null);
    setViewLoadingId(null);
  };

  const handleViewCard = async (holder) => {
    if (!holder?.id) {
      toast.error("Could not open this card.");
      return;
    }

    setViewLoadingId(holder.id);
    try {
      const response = await Api.membershipCard.adminDetail(holder.id);
      const mapped = mapMembershipCardFromApi(response.data?.card);
      if (!mapped) {
        throw new Error("Invalid card data");
      }
      setViewCard(mapped);
      setViewMeta({
        username: response.data?.card?.username || holder.username,
        email: response.data?.card?.email || holder.email,
        cardId: mapped.cardId,
      });
      setShowCardModal(true);
    } catch (error) {
      console.error("Failed to load membership card:", error);
      toast.error("Could not load membership card.");
    } finally {
      setViewLoadingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FaIdCard className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Card Holders
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Members who created a digital membership card.
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {total} card{total === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search card ID, name, username, or email"
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All tiers</option>
          <option value="community">Community</option>
          <option value="executive">Executive</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Card ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Member
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Tier
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Joined
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Expires
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Photo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                    <FaSpinner className="mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              ) : holders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    No membership cards found.
                  </td>
                </tr>
              ) : (
                holders.map((holder) => (
                  <tr key={holder.id || holder.card_id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900 dark:text-white">
                      {holder.card_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {holder.full_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      <div>{holder.username || "—"}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {holder.email || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          holder.tier === "executive"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                        }`}
                      >
                        {tierLabel(holder.tier)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(holder.joined_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {holder.expires_at ? formatDate(holder.expires_at) : "No expiry"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {holder.has_photo ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        type="button"
                        onClick={() => handleViewCard(holder)}
                        disabled={viewLoadingId === holder.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
                      >
                        {viewLoadingId === holder.id ? (
                          <FaSpinner className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FaEye className="h-3.5 w-3.5" />
                        )}
                        View card
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fetchHolders(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => fetchHolders(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {showCardModal && viewCard ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="relative max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl dark:bg-gray-900 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="card-holder-modal-title"
          >
            <button
              type="button"
              onClick={closeCardModal}
              className="absolute right-3 top-3 rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="Close"
            >
              <FaTimes className="h-5 w-5" />
            </button>

            <div className="mb-4 pr-10">
              <h3
                id="card-holder-modal-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                Membership card
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {viewMeta?.cardId}
                {viewMeta?.username ? ` · ${viewMeta.username}` : ""}
                {viewMeta?.email ? ` · ${viewMeta.email}` : ""}
              </p>
            </div>

            <MembershipCardVisual card={viewCard} />
            <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
              Click card to flip front/back
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
