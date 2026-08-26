import React from "react";
import { Link } from "react-router-dom";
import { FaAndroid, FaApple, FaDownload, FaMobileAlt } from "react-icons/fa";
import {
  downloadAndroidApp,
  getAndroidInstallUrl,
  getIosInstallUrl,
  isAndroidUserAgent,
  isAppPublicDownloadEnabled,
  isIosUserAgent,
  SITE_ANDROID_APK_PATH,
} from "../utils/appInstall";
import { recordApkDownload } from "../utils/recordAppInstall";

/**
 * Public page: download the Android APK from this site + short install tips.
 * Hidden behind isAppPublicDownloadEnabled until the app is ready to ship.
 */
const GetApp = () => {
  const enabled = isAppPublicDownloadEnabled();
  const iosUrl = getIosInstallUrl();
  const androidUrl = getAndroidInstallUrl();
  const onAndroid = typeof navigator !== "undefined" && isAndroidUserAgent();
  const onIos = typeof navigator !== "undefined" && isIosUserAgent();

  if (!enabled) {
    return (
      <div className="min-h-[70vh] bg-gray-50 dark:bg-gray-900 px-4 py-10">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-300">
              <FaMobileAlt className="text-xl" aria-hidden />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
              App coming soon
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              The BuySellClub mobile app is not available for download yet.
              Check back soon.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-500"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            Track packages and get alerts faster on your phone. Download the
            Android app from this website (not on Play Store yet).
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => {
                recordApkDownload("get_app");
                downloadAndroidApp(androidUrl);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-500"
            >
              <FaAndroid aria-hidden />
              <FaDownload aria-hidden />
              Download Android app (APK)
            </button>
            <a
              href={SITE_ANDROID_APK_PATH}
              className="block text-center text-xs text-teal-700 dark:text-teal-300 underline"
              download="BuySellClub.apk"
              onClick={() => recordApkDownload("get_app_direct")}
            >
              Direct link if the button does not start
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

          <div className="mt-8 rounded-xl bg-slate-50 dark:bg-gray-900/60 p-4 text-sm text-gray-700 dark:text-gray-300">
            <p className="font-semibold text-gray-900 dark:text-white">
              After download (Android)
            </p>
            <ol className="mt-2 list-decimal pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>Open the downloaded <strong>BuySellClub.apk</strong> file.</li>
              <li>
                If asked, allow <strong>Install unknown apps</strong> for your
                browser / Files app.
              </li>
              <li>Tap <strong>Install</strong>, then open BuySellClub.</li>
            </ol>
            {onAndroid && (
              <p className="mt-3 text-xs text-teal-700 dark:text-teal-300">
                You are on Android — use the download button above.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetApp;
