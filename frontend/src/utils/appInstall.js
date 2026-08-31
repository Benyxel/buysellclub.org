/** Customer app package / deep link (Expo: org.buysellclub.app, scheme buysellclub). */
export const APP_PACKAGE = "org.buysellclub.app";
export const APP_DEEP_LINK = "buysellclub://";

/** Google Play listing (override with VITE_ANDROID_APP_URL if needed). */
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${APP_PACKAGE}`;

/** @deprecated Site-hosted APK removed — use getAndroidInstallUrl() / PLAY_STORE_URL. */
export const SITE_ANDROID_APK_PATH = PLAY_STORE_URL;

export function getAndroidInstallUrl() {
  const fromEnv = (import.meta.env.VITE_ANDROID_APP_URL || "").trim();
  if (fromEnv) return fromEnv;
  return PLAY_STORE_URL;
}

export function getIosInstallUrl() {
  const fromEnv = (import.meta.env.VITE_IOS_APP_URL || "").trim();
  return fromEnv || "";
}

export function isMobileUserAgent(
  ua = typeof navigator !== "undefined" ? navigator.userAgent : ""
) {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua || "");
}

export function isIosUserAgent(
  ua = typeof navigator !== "undefined" ? navigator.userAgent : ""
) {
  return /iPhone|iPad|iPod/i.test(ua || "");
}

export function isAndroidUserAgent(
  ua = typeof navigator !== "undefined" ? navigator.userAgent : ""
) {
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

/** Open the Play Store (or custom Android install URL) in a new tab / same window. */
export function openAndroidInstall(installUrl = getAndroidInstallUrl()) {
  if (typeof window === "undefined" || !installUrl) return;
  window.open(installUrl, "_blank", "noopener,noreferrer");
}

/**
 * Try to open the native app; after a short delay, fall back to store URL
 * if the page is still visible (app likely not installed).
 */
export function openOrInstallApp({
  installUrl,
  deepLink = APP_DEEP_LINK,
} = {}) {
  if (typeof window === "undefined") return;

  const start = Date.now();
  let leftPage = false;

  const onHide = () => {
    leftPage = true;
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);

  window.location.href = deepLink;

  if (!installUrl) return;

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onHide);
    if (leftPage) return;
    if (document.hidden) return;
    if (Date.now() - start < 2500) {
      window.location.href = installUrl;
    }
  }, 1500);
}
