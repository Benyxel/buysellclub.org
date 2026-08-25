import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FaMobileAlt, FaTimes } from "react-icons/fa";
import {
  downloadAndroidApp,
  getAndroidInstallUrl,
  getIosInstallUrl,
  isIosUserAgent,
  isMobileUserAgent,
  isStandaloneDisplay,
  openOrInstallApp,
} from "../utils/appInstall";

const STORAGE_KEY = "bsc:appInstallBannerDismissedAt";
const DISMISS_DAYS = 14;

function isDismissed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Paths where an install nudge would get in the way. */
function shouldHideOnPath(pathname = "") {
  const p = (pathname || "").toLowerCase();
  return (
    p.startsWith("/admin") ||
    p.startsWith("/warehouse") ||
    p.startsWith("/app-google-auth") ||
    p.startsWith("/login") ||
    p.startsWith("/signup") ||
    p.startsWith("/register") ||
    p.startsWith("/clock") ||
    p.includes("payment") ||
    p.includes("checkout")
  );
}

/**
 * Soft mobile-web prompt: open the native app or send the user to install.
 * Desktop: hidden. Dismissible for 14 days.
 */
const MobileAppInstallBanner = () => {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isMobileUserAgent()) return;
    if (isStandaloneDisplay()) return;
    if (shouldHideOnPath(location.pathname)) {
      setVisible(false);
      return;
    }
    if (isDismissed()) {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [location.pathname]);

  if (!visible) return null;

  const ios = isIosUserAgent();
  const installUrl = ios ? getIosInstallUrl() : getAndroidInstallUrl();
  const hasInstall = Boolean(installUrl);

  const handleDismiss = () => {
    markDismissed();
    setVisible(false);
  };

  const handleOpen = () => {
    openOrInstallApp({ installUrl: hasInstall ? installUrl : undefined });
  };

  const handleGetApp = () => {
    if (!installUrl) return;
    if (ios && installUrl) {
      window.location.href = installUrl;
      return;
    }
    downloadAndroidApp(installUrl);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:p-4 md:hidden pointer-events-none"
      role="dialog"
      aria-label="Get the BuySellClub app"
    >
      <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-teal-700/30 bg-slate-900 text-white shadow-2xl shadow-black/40">
        <div className="flex items-start gap-3 p-3.5 sm:p-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
            <FaMobileAlt className="text-lg" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-white">
              Use the BuySellClub app
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-300">
              Faster tracking &amp; alerts — download free from this site.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {hasInstall && (
                <button
                  type="button"
                  onClick={handleGetApp}
                  className="rounded-lg bg-teal-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-400 active:scale-[0.98]"
                >
                  Download app
                </button>
              )}
              <button
                type="button"
                onClick={handleOpen}
                className="rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 active:scale-[0.98]"
              >
                Open app
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="ml-auto rounded-lg px-2 py-2 text-xs text-slate-400 hover:text-white"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Dismiss"
          >
            <FaTimes />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileAppInstallBanner;
