import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaMapMarkerAlt,
  FaIdBadge,
  FaUser,
  FaCube,
  FaSyncAlt,
  FaSpinner,
} from "react-icons/fa";
import API, { claimLocalAgentRewards } from "../api";
import { toast } from "../utils/toast";
import { formatMarkIdForDisplay } from "../utils/markIdFormat";

const LocalAgentDashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [splashKey, setSplashKey] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [congratsAmount, setCongratsAmount] = useState(0);

  const statusLabel = (status) => {
    const map = {
      preparing: "Preparing",
      loading: "Loading",
      in_transit: "In Transit",
      clearing: "Clearing",
      arrived_port: "Arrived at Port",
      offloaded: "Offloaded",
      completed: "Completed",
    };
    return map[status] || status || "Unknown";
  };

  const fetchDashboard = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const resp = await API.get("/buysellapi/local-agent/dashboard/", {
        noCache: true,
      });
      setDashboard(resp.data);
    } catch (error) {
      const status = error.response?.status;
      if (status === 403) {
        toast.error("Local agent access required.");
        navigate("/Profile", { replace: true });
        return;
      }
      if (status === 401) {
        navigate("/Login", { replace: true });
        return;
      }
      toast.error("Failed to load local agent dashboard.");
      console.error("Local agent dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard({ silent: true });
    setRefreshing(false);
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refresh = () => fetchDashboard({ silent: true });
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

  const profile = dashboard?.profile || {};
  const containers = dashboard?.containers || [];
  const rewards = dashboard?.rewards || {};
  const rewardContainers = rewards?.per_container || [];
  const claimReady = Boolean(rewards?.claim_ready);
  const latestApprovedClaim = rewards?.latest_approved_claim || null;
  const [claimSeconds, setClaimSeconds] = useState(
    rewards?.next_claim_seconds ?? null
  );

  useEffect(() => {
    setClaimSeconds(rewards?.next_claim_seconds ?? null);
  }, [rewards?.next_claim_seconds]);

  useEffect(() => {
    if (!latestApprovedClaim?.id) return;
    const key = "localAgentLastApprovedClaimId";
    const lastSeen = Number(localStorage.getItem(key) || 0);
    if (latestApprovedClaim.id > lastSeen) {
      setCongratsAmount(Number(latestApprovedClaim.reward_amount || 0));
      setShowCongrats(true);
      localStorage.setItem(key, String(latestApprovedClaim.id));
    }
  }, [latestApprovedClaim]);

  useEffect(() => {
    if (claimReady) {
      setClaimSeconds(0);
      return;
    }
    if (claimSeconds === null) return;
    if (claimSeconds <= 0) return;

    const timer = setInterval(() => {
      setClaimSeconds((prev) => (prev !== null ? Math.max(0, prev - 1) : prev));
    }, 1000);

    return () => clearInterval(timer);
  }, [claimReady, claimSeconds]);

  const claimCountdownText = useMemo(() => {
    const delayDays = rewards?.claim_delay_days ?? 14;
    const timerEnabled = rewards?.claim_timer_enabled ?? true;
    if (!timerEnabled) {
      return "Claim timer disabled. Claim anytime after completion.";
    }
    if (claimReady) {
      return "Reward is now claimable.";
    }
    if (claimSeconds === null) {
      return `Claim unlocks ${delayDays} days after a container is completed.`;
    }
    const total = Math.max(0, claimSeconds);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return `Claim available in ${days}d ${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [claimReady, claimSeconds, rewards?.claim_delay_days, rewards?.claim_timer_enabled]);

  const handleClaimReward = async () => {
    if (!claimReady || claiming) return;
    try {
      setClaiming(true);
      await claimLocalAgentRewards();
      toast.success("Reward claim submitted.", { autoClose: 3000 });
      await fetchDashboard({ silent: true });
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Failed to submit reward claim.";
      toast.error(message);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <FaSpinner className="animate-spin text-4xl text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <style>{`
        @keyframes splash3dCore {
          0% { transform: translate(-50%, -50%) scale(0.4) rotateX(35deg); opacity: 0.9; }
          60% { transform: translate(-50%, -50%) scale(1.1) rotateX(35deg); opacity: 0.5; }
          100% { transform: translate(-50%, -50%) scale(1.6) rotateX(35deg); opacity: 0; }
        }
        @keyframes splash3dRing {
          0% { transform: translate(-50%, -50%) scale(0.3) rotateX(35deg); opacity: 0.8; }
          70% { transform: translate(-50%, -50%) scale(1.4) rotateX(35deg); opacity: 0.4; }
          100% { transform: translate(-50%, -50%) scale(2) rotateX(35deg); opacity: 0; }
        }
        .splash3d {
          position: absolute;
          left: 50%;
          top: 50%;
          pointer-events: none;
          border-radius: 9999px;
          transform-style: preserve-3d;
          filter: blur(0.5px);
        }
        .splash3d-core {
          width: 140%;
          height: 140%;
          background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), rgba(255,255,255,0.2) 45%, rgba(255,255,255,0) 70%);
          animation: splash3dCore 650ms ease-out forwards;
          box-shadow: 0 6px 18px rgba(255, 255, 255, 0.35);
        }
        .splash3d-ring {
          width: 180%;
          height: 180%;
          border: 2px solid rgba(255, 255, 255, 0.7);
          box-shadow: 0 10px 30px rgba(255, 122, 200, 0.35);
          animation: splash3dRing 750ms ease-out forwards;
          transform: translate(-50%, -50%) rotateX(35deg);
        }
      `}</style>
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <FaMapMarkerAlt className="text-green-600" />
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
              Local Agent Dashboard
            </h1>
          </div>
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full sm:w-auto px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {refreshing ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <FaSyncAlt />
              )}
              Refresh
            </button>
            <button
              onClick={() => navigate("/Profile")}
              className="w-full sm:w-auto px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Profile
            </button>
          </div>
        </div>
      </header>

      <main className="p-3 sm:p-6">
        {showCongrats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md text-center border border-pink-200 dark:border-pink-700">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                Congratulations!
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Your reward of{" "}
                <span className="font-semibold text-pink-600">
                  {congratsAmount.toFixed(2)} GHS
                </span>{" "}
                has been approved.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We will pay you into your MoMo account. If you haven’t added your
                contact, go to your profile and set it up.
              </p>
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowCongrats(false)}
                  className="px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex items-center gap-3">
            <FaIdBadge className="text-green-600 text-xl" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">MARK ID</p>
              <p className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
                {profile.mark_id ? formatMarkIdForDisplay(profile.mark_id) : "Not assigned"}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex items-center gap-3">
            <FaUser className="text-blue-600 text-xl" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
              <p className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
                {profile.full_name || profile.username || "Agent"}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex items-center gap-3">
            <FaCube className="text-purple-600 text-xl" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Containers
              </p>
              <p className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
                {containers.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <FaCube className="text-green-600" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Containers & CBM
            </h2>
          </div>

          {containers.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              No containers available.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 rounded-lg overflow-hidden">
                <thead className="bg-gradient-to-r from-green-600 to-emerald-500">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[11px] sm:text-xs font-semibold text-white uppercase tracking-wide">
                      Container
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[11px] sm:text-xs font-semibold text-white uppercase tracking-wide">
                      Container Status
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[11px] sm:text-xs font-semibold text-white uppercase tracking-wide">
                      Container CBM
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[11px] sm:text-xs font-semibold text-white uppercase tracking-wide">
                      Your Total CBM
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {containers.map((container, index) => (
                    <tr
                      key={container.id}
                      className={`${
                        index % 2 === 0
                          ? "bg-white dark:bg-gray-800"
                          : "bg-green-50 dark:bg-gray-900"
                      } hover:bg-green-100 dark:hover:bg-gray-700 transition-colors`}
                    >
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-white">
                        {container.container_number}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                          {statusLabel(container.status)}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-right text-gray-900 dark:text-white font-semibold">
                        {Number(container.overall_cbm || 0).toFixed(3)}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-right text-gray-900 dark:text-white font-semibold">
                        {Number(container.total_cbm || 0).toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-2">
            <FaCube className="text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Claim Rewards
            </h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Rewards are calculated per whole-number CBM in each container.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <p className="text-xs text-purple-700 dark:text-purple-200 uppercase tracking-wide">
                Reward per CBM
              </p>
              <p className="text-lg sm:text-xl font-bold text-purple-900 dark:text-purple-100">
                {Number(rewards.rate_per_cbm || 0).toFixed(2)} GHS
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <p className="text-xs text-green-700 dark:text-green-200 uppercase tracking-wide">
                Your Rewards
              </p>
              <p className="text-lg sm:text-xl font-bold text-green-900 dark:text-green-100">
                {Number(rewards.total_reward || 0).toFixed(2)} GHS
              </p>
            </div>
          </div>

          {rewardContainers.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              No reward-eligible CBM yet. Reach a whole-number CBM to qualify.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Container
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Qualifying CBM
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Reward Amount (GHS)
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {rewardContainers.map((entry) => (
                    <tr key={entry.container_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-white">
                        {entry.container_number}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-right text-gray-900 dark:text-white">
                        {entry.qualifying_cbm}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-right text-gray-900 dark:text-white">
                        {Number(entry.reward_amount || 0).toFixed(2)} GHS
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                        {entry.claim_status === "claimed"
                          ? `Claimed ${Number(entry.claimed_amount || 0).toFixed(2)} GHS`
                          : entry.claim_status === "pending"
                          ? "Pending approval"
                          : entry.claim_status === "rejected"
                          ? `Rejected ${Number(entry.rejected_amount || 0).toFixed(2)} GHS`
                          : entry.claim_status === "available"
                          ? "Available"
                          : entry.claim_status === "pending_completion"
                          ? "Waiting completion"
                          : "Not eligible"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {claimCountdownText}
              </span>
              <button
                type="button"
                disabled={!claimReady || claiming}
                onClick={() => {
                  if (!claimReady || claiming) return;
                  setSplashKey((prev) => prev + 1);
                  handleClaimReward();
                }}
                className={`relative overflow-hidden w-full sm:w-auto px-5 py-2 rounded-lg font-semibold shadow-md transition-all ${
                  claimReady && !claiming
                    ? "bg-gradient-to-r from-fuchsia-500 via-pink-500 to-amber-400 hover:from-fuchsia-600 hover:via-pink-600 hover:to-amber-500 text-white animate-pulse ring-2 ring-pink-300/70 shadow-lg shadow-pink-400/60"
                    : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed"
                }`}
              >
                {claimReady && !claiming && (
                  <>
                    <span
                      key={`core-${splashKey}`}
                      className="splash3d splash3d-core"
                    />
                    <span
                      key={`ring-${splashKey}`}
                      className="splash3d splash3d-ring"
                    />
                  </>
                )}
                {claiming ? "Submitting..." : "Claim Reward"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LocalAgentDashboard;

