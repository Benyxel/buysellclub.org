import React, { useEffect, useState } from "react";
import { FaCheckCircle, FaSpinner, FaTimesCircle } from "react-icons/fa";
import { toast } from "../../utils/toast";
import {
  approveLocalAgentRewardClaim,
  getLocalAgentRewardClaims,
  rejectLocalAgentRewardClaim,
} from "../../api";

const LocalAgentRewardClaims = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchClaims = async (status = statusFilter) => {
    setLoading(true);
    try {
      const resp = await getLocalAgentRewardClaims(
        { status },
        { noCache: true }
      );
      setClaims(Array.isArray(resp.data) ? resp.data : []);
    } catch (error) {
      console.error("Failed to load reward claims:", error);
      toast.error("Failed to load reward claims");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    const refresh = () => fetchClaims();
    const interval = setInterval(refresh, 10000);
    const handleFocus = () => refresh();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    });
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (claimId) => {
    if (!claimId) return;
    setApprovingId(claimId);
    try {
      await approveLocalAgentRewardClaim(claimId);
      toast.success("Reward claim approved");
      fetchClaims();
    } catch (error) {
      console.error("Failed to approve reward claim:", error);
      toast.error("Failed to approve reward claim");
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (claimId) => {
    if (!claimId) return;
    setRejectingId(claimId);
    try {
      await rejectLocalAgentRewardClaim(claimId);
      toast.success("Reward claim rejected");
      fetchClaims();
    } catch (error) {
      console.error("Failed to reject reward claim:", error);
      toast.error("Failed to reject reward claim");
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
            Local Agent Reward Claims
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Review and approve reward claims submitted by local agents.
          </p>
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="">All</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <FaSpinner className="animate-spin text-3xl text-primary" />
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            No reward claims found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Local Agent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Mark ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Container
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Claimed CBM
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Reward (GHS)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {claim.full_name || claim.username}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {claim.mark_id || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {claim.container_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                      {claim.claimed_cbm}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                      {Number(claim.reward_amount || 0).toFixed(2)} GHS
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {claim.status}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {claim.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleApprove(claim.id)}
                            disabled={approvingId === claim.id || rejectingId === claim.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-60"
                          >
                            <FaCheckCircle />
                            {approvingId === claim.id ? "Approving..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleReject(claim.id)}
                            disabled={rejectingId === claim.id || approvingId === claim.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
                          >
                            <FaTimesCircle />
                            {rejectingId === claim.id ? "Rejecting..." : "Reject"}
                          </button>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalAgentRewardClaims;

