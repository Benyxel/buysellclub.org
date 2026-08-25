/** Customer app package / deep link (Expo: org.buysellclub.app, scheme buysellclub). */
export const APP_PACKAGE = "org.buysellclub.app";
export const APP_DEEP_LINK = "buysellclub://";

export function getAndroidInstallUrl() {
  const fromEnv = (import.meta.env.VITE_ANDROID_APP_URL || "").trim();
  if (fromEnv) return fromEnv;
  // Fallback: Play Store listing (update VITE_ANDROID_APP_URL when you have APK/store link)
  return `https://play.google.com/store/apps/details?id=${APP_PACKAGE}`;
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

  // Prefer Android intent with browser fallback when we have an install URL
  if (isAndroidUserAgent() && installUrl) {
    const intent =
      `intent://open#Intent;scheme=buysellclub;package=${APP_PACKAGE};` +
      `S.browser_fallback_url=${encodeURIComponent(installUrl)};end`;
    window.location.href = intent;
    return;
  }

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
