/** Customer app package / deep link (Expo: org.buysellclub.app, scheme buysellclub). */
export const APP_PACKAGE = "org.buysellclub.app";
export const APP_DEEP_LINK = "buysellclub://";

/** Direct APK on this website (public/downloads/BuySellClub.apk). */
export const SITE_ANDROID_APK_PATH = "/downloads/BuySellClub.apk";

/**
 * Public site download / “Get the app” surfaces.
 * Off by default until the app is ready. Enable with VITE_APP_DOWNLOADS_ENABLED=true
 * (or flip the hardcoded fallback below when you ship).
 */
export function isAppPublicDownloadEnabled() {
  const v = String(import.meta.env.VITE_APP_DOWNLOADS_ENABLED || "")
    .trim()
    .toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  return false;
}

export function getAndroidInstallUrl() {
  const fromEnv = (import.meta.env.VITE_ANDROID_APP_URL || "").trim();
  if (fromEnv) return fromEnv;
  // Default: download APK from the website (not Play Store yet)
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${SITE_ANDROID_APK_PATH}`;
  }
  return SITE_ANDROID_APK_PATH;
}

export function getIosInstallUrl() {
  const fromEnv = (import.meta.env.VITE_IOS_APP_URL || "").trim();
  return fromEnv || "";
}

export function isMobileUserAgent(ua = typeof navigator !== "undefined" ? navigator.userAgent : "") {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua || "");
}

export function isIosUserAgent(ua = typeof navigator !== "undefined" ? navigator.userAgent : "") {
  return /iPhone|iPad|iPod/i.test(ua || "");
}

export function isAndroidUserAgent(ua = typeof navigator !== "undefined" ? navigator.userAgent : "") {
  return /Android/i.test(ua || "");
}

/** Already running inside an installed PWA / home-screen web app. */
export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.navigator.standalone === true) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** Start APK download (or open store URL). */
export function downloadAndroidApp(installUrl = getAndroidInstallUrl()) {
  if (typeof window === "undefined" || !installUrl) return;
  // Force a download navigation; browsers handle .apk as installable file
  const a = document.createElement("a");
  a.href = installUrl;
  a.setAttribute("download", "BuySellClub.apk");
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Try to open the native app; after a short delay, fall back to install URL
 * if the page is still visible (app likely not installed).
 */
export function openOrInstallApp({ installUrl, deepLink = APP_DEEP_LINK } = {}) {
  if (typeof window === "undefined") return;

  const start = Date.now();
  let leftPage = false;

  const onHide = () => {
    leftPage = true;
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);

  // Deep link first — if the app is installed it should take over
  window.location.href = deepLink;

  if (!installUrl) return;

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onHide);
    if (leftPage) return;
    if (document.hidden) return;
    if (Date.now() - start < 2500) {
      if (/\.apk(\?|$)/i.test(installUrl) || installUrl.includes("/downloads/")) {
        downloadAndroidApp(installUrl);
      } else {
        window.location.href = installUrl;
      }
    }
  }, 1500);
}
