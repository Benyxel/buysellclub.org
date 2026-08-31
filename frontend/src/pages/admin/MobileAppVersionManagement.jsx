import React, { useEffect, useState } from "react";
import { FaMobileAlt, FaSave, FaSpinner } from "react-icons/fa";
import { toast } from "../../utils/toast";
import API from "../../api";

const DEFAULTS = {
  is_enabled: true,
  latest_version: "1.0.0",
  min_supported_version: "",
  force_update: false,
  android_apk_url:
    "https://play.google.com/store/apps/details?id=org.buysellclub.app",
  ios_store_url: "",
  message:
    "A new version of BuySellClub is available. Please update for the latest features and fixes.",
};

const MobileAppVersionManagement = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await API.get("/buysellapi/mobile-app-version/");
        setSettings({ ...DEFAULTS, ...(res.data || {}) });
      } catch (e) {
        console.error(e);
        toast.error("Failed to load app version settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    const version = (settings.latest_version || "").trim();
    if (!version) {
      toast.error("Latest version is required");
      return;
    }
    setSaving(true);
    try {
      const res = await API.post("/buysellapi/mobile-app-version/", {
        is_enabled: !!settings.is_enabled,
        latest_version: version,
        min_supported_version: (settings.min_supported_version || "").trim(),
        force_update: !!settings.force_update,
        android_apk_url: (settings.android_apk_url || "").trim(),
        ios_store_url: (settings.ios_store_url || "").trim(),
        message: settings.message || "",
      });
      setSettings({ ...DEFAULTS, ...(res.data || {}) });
      toast.success("App update settings saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="animate-spin text-4xl text-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
          <FaMobileAlt className="text-teal-600" />
          Mobile App Updates
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          When you publish a new build on Google Play, bump{" "}
          <strong>Latest version</strong> to match the app version in{" "}
          <code>app.config.js</code>. Users with older apps will see an update
          prompt that opens Play Store.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <label className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
          <div>
            <p className="font-semibold text-gray-800 dark:text-white">
              Enable update checks
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              App asks the server on launch whether a newer version exists
            </p>
          </div>
          <input
            type="checkbox"
            checked={!!settings.is_enabled}
            onChange={(e) =>
              setSettings((s) => ({ ...s, is_enabled: e.target.checked }))
            }
            className="h-5 w-5"
          />
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Latest version *
          </label>
          <input
            type="text"
            value={settings.latest_version || ""}
            onChange={(e) =>
              setSettings((s) => ({ ...s, latest_version: e.target.value }))
            }
            placeholder="1.0.1"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500">
            Must match the version baked into the new APK (e.g. 1.0.1)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Minimum supported version (optional)
          </label>
          <input
            type="text"
            value={settings.min_supported_version || ""}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                min_supported_version: e.target.value,
              }))
            }
            placeholder="1.0.0"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500">
            Apps below this version cannot dismiss the update
          </p>
        </div>

        <label className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
          <div>
            <p className="font-semibold text-gray-800 dark:text-white">
              Force update for all outdated apps
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Users must update; no “Later” button
            </p>
          </div>
          <input
            type="checkbox"
            checked={!!settings.force_update}
            onChange={(e) =>
              setSettings((s) => ({ ...s, force_update: e.target.checked }))
            }
            className="h-5 w-5"
          />
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Android install URL (Google Play)
          </label>
          <input
            type="url"
            value={settings.android_apk_url || ""}
            onChange={(e) =>
              setSettings((s) => ({ ...s, android_apk_url: e.target.value }))
            }
            placeholder="https://play.google.com/store/apps/details?id=org.buysellclub.app"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Used by the in-app update prompt. Prefer the Play Store listing — do
            not host an APK on the website.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            iOS App Store URL (optional)
          </label>
          <input
            type="url"
            value={settings.ios_store_url || ""}
            onChange={(e) =>
              setSettings((s) => ({ ...s, ios_store_url: e.target.value }))
            }
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Update message
          </label>
          <textarea
            rows={3}
            value={settings.message || ""}
            onChange={(e) =>
              setSettings((s) => ({ ...s, message: e.target.value }))
            }
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-500 disabled:opacity-50"
        >
          {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
          Save
        </button>
      </div>
    </div>
  );
};

export default MobileAppVersionManagement;
