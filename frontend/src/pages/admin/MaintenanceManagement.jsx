import React, { useState, useEffect } from "react";
import { FaTools, FaToggleOn, FaToggleOff, FaSave, FaSpinner } from "react-icons/fa";
import { toast } from "../../utils/toast";
import { getMaintenanceSettings, updateMaintenanceSettings } from "../../api";

const MaintenanceManagement = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    is_enabled: false,
    title: "We'll be back soon!",
    message: "We're currently performing some maintenance. We'll be back shortly. Thank you for your patience!",
    estimated_time: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await getMaintenanceSettings();
      setSettings(response.data);
    } catch (error) {
      console.error("Failed to fetch maintenance settings:", error);
      toast.error("Failed to load maintenance settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMaintenanceSettings(settings);
      toast.success(
        settings.is_enabled
          ? "Maintenance mode enabled. Public users will see the maintenance page."
          : "Maintenance mode disabled. Site is now accessible to all users."
      );
    } catch (error) {
      console.error("Failed to update maintenance settings:", error);
      toast.error("Failed to update maintenance settings");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = () => {
    setSettings((prev) => ({ ...prev, is_enabled: !prev.is_enabled }));
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
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Maintenance Mode
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Enable maintenance mode to show a maintenance page to public users while you make changes or fix issues.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        {/* Toggle Switch */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
              Maintenance Mode
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {settings.is_enabled
                ? "Currently enabled - Public users will see the maintenance page"
                : "Currently disabled - Site is accessible to all users"}
            </p>
          </div>
          <button
            onClick={handleToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              settings.is_enabled
                ? "bg-pink-600 hover:bg-pink-700 text-white"
                : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-white"
            }`}
          >
            {settings.is_enabled ? (
              <>
                <FaToggleOn className="text-2xl" />
                <span>Enabled</span>
              </>
            ) : (
              <>
                <FaToggleOff className="text-2xl" />
                <span>Disabled</span>
              </>
            )}
          </button>
        </div>

        {/* Settings Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={settings.title}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="We'll be back soon!"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message
            </label>
            <textarea
              value={settings.message}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, message: e.target.value }))
              }
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="We're currently performing some maintenance..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estimated Time (Optional)
            </label>
            <input
              type="text"
              value={settings.estimated_time}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  estimated_time: e.target.value,
                }))
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g., 2 hours, 30 minutes"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This will be displayed on the maintenance page
            </p>
          </div>
        </div>

        {/* Save Button */}
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

        {/* Preview */}
        {settings.is_enabled && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
              Preview (what public users will see):
            </p>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                {settings.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {settings.message}
              </p>
              {settings.estimated_time && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Estimated time: {settings.estimated_time}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceManagement;

