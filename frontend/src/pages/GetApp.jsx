import React from "react";
import { FaAndroid, FaApple, FaExternalLinkAlt, FaMobileAlt } from "react-icons/fa";
import {
  getAndroidInstallUrl,
  getIosInstallUrl,
  isAndroidUserAgent,
  isIosUserAgent,
  openAndroidInstall,
} from "../utils/appInstall";
import { recordStoreClick } from "../utils/recordAppInstall";

/**
 * Public page: get the app from Google Play (and App Store when available).
 */
const GetApp = () => {
  const iosUrl = getIosInstallUrl();
  const androidUrl = getAndroidInstallUrl();
  const onAndroid = typeof navigator !== "undefined" && isAndroidUserAgent();
  const onIos = typeof navigator !== "undefined" && isIosUserAgent();

  return (
    <div className="min-h-[70vh] bg-gray-50 dark:bg-gray-900 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-300">
            <FaMobileAlt className="text-xl" aria-hidden />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            Get the BuySellClub app
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Track packages and get alerts on your phone. Install from Google
            Play — free and kept up to date automatically.
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => {
                recordStoreClick("get_app");
                openAndroidInstall(androidUrl);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-500"
            >
              <FaAndroid aria-hidden />
              Get it on Google Play
              <FaExternalLinkAlt className="text-xs opacity-80" aria-hidden />
            </button>
            <a
              href={androidUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-teal-700 dark:text-teal-300 underline"
              onClick={() => recordStoreClick("get_app_direct")}
            >
              Open Play Store listing
            </a>

            {iosUrl ? (
              <a
                href={iosUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-semibold text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <FaApple aria-hidden />
                Download on the App Store
              </a>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {onIos
                  ? "iOS app is not available for download yet."
                  : "iPhone / iPad version coming later."}
              </p>
            )}
          </div>

          {onAndroid && (
            <p className="mt-6 text-xs text-teal-700 dark:text-teal-300">
              You are on Android — use Google Play above to install.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GetApp;
