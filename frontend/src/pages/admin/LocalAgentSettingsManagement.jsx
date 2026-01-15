import React, { useEffect, useState } from "react";
import { FaMapMarkerAlt, FaSave, FaSpinner } from "react-icons/fa";
import { toast } from "../../utils/toast";
import { getLocalAgentSettings, updateLocalAgentSettings } from "../../api";

const LocalAgentSettingsManagement = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rewardPerCbm, setRewardPerCbm] = useState(0);
  const [claimDelayDays, setClaimDelayDays] = useState(14);
  const [claimTimerEnabled, setClaimTimerEnabled] = useState(true);
  const [maxLocalAgents, setMaxLocalAgents] = useState(0);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await getLocalAgentSettings();
      setRewardPerCbm(Number(response.data?.reward_per_cbm || 0));
      setClaimDelayDays(Number(response.data?.claim_delay_days || 14));
      setClaimTimerEnabled(Boolean(response.data?.claim_timer_enabled ?? true));
      setMaxLocalAgents(Number(response.data?.max_local_agents || 0));
    } catch (error) {
      console.error("Failed to fetch local agent settings:", error);
      toast.error("Failed to load local agent settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLocalAgentSettings({
        reward_per_cbm: rewardPerCbm,
        claim_delay_days: claimDelayDays,
        claim_timer_enabled: claimTimerEnabled,
        max_local_agents: maxLocalAgents,
      });
      toast.success("Local agent reward settings updated.");
    } catch (error) {
      console.error("Failed to update local agent settings:", error);
      toast.error("Failed to update local agent settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="animate-spin text-4xl text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
          <FaMapMarkerAlt className="text-green-600" />
          Local Agent Settings
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Set the reward amount that local agents earn per whole CBM.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reward per Whole CBM
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={rewardPerCbm}
              onChange={(e) => setRewardPerCbm(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="0.00"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Agents earn rewards only for whole-number CBM (e.g., 2.7 CBM counts as 2).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Claim Countdown (Days)
            </label>
            <input
              type="number"
              min="0"
              value={claimDelayDays}
              onChange={(e) =>
                setClaimDelayDays(Math.max(0, parseInt(e.target.value, 10) || 0))
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="14"
              disabled={!claimTimerEnabled}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Turn the timer on/off and set how many days to wait after completion.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setClaimTimerEnabled((prev) => !prev)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                claimTimerEnabled
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              {claimTimerEnabled ? "Timer On" : "Timer Off"}
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {claimTimerEnabled
                ? "Claim countdown is enforced."
                : "Agents can claim anytime after completion."}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Local Agents (Approved)
            </label>
            <input
              type="number"
              min="0"
              value={maxLocalAgents}
              onChange={(e) =>
                setMaxLocalAgents(Math.max(0, parseInt(e.target.value, 10) || 0))
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="0"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Set to 0 for unlimited. Requests can still be submitted when full.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FaSave />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocalAgentSettingsManagement;

