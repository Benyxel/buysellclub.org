/**
 * Google Analytics 4 (GA4) helpers.
 * Measurement ID: G-KF830M3JQR
 * Tracks: site visits (page views), Quick Links & Community pages, sign-ups.
 * Only sends data on production (buysellclub.org); disabled in dev/localhost.
 */

const GA_MEASUREMENT_ID = "G-KF830M3JQR";

const PRODUCTION_HOSTS = ["buysellclub.org", "www.buysellclub.org"];

function isGaEnabled() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname || "";
  return PRODUCTION_HOSTS.some((h) => host === h || host.endsWith("." + h));
}

function gtag() {
  if (!isGaEnabled() || typeof window.gtag !== "function") return;
  window.gtag.apply(window, arguments);
}

/**
 * Send a page_view to GA4. Call on every route change so you get:
 * - Number of people visiting the site (users/sessions)
 * - Pages under Quick Links and Community (by path)
 * No-op in dev (localhost / non-production).
 */
export function pageView(path, title) {
  if (!isGaEnabled()) return;
  const pagePath = path || (typeof window !== "undefined" ? window.location.pathname : "/");
  const pageTitle = title || "BuySellClub";
  gtag("event", "page_view", {
    page_path: pagePath,
    page_title: pageTitle,
    send_to: GA_MEASUREMENT_ID,
  });
}

/**
 * Send sign_up event when a user completes registration.
 * Use in GA4 to see "Number of users signing up daily" (Events → sign_up).
 * No-op in dev (localhost / non-production).
 */
export function trackSignUp(method = "email") {
  if (!isGaEnabled()) return;
  gtag("event", "sign_up", {
    method,
    send_to: GA_MEASUREMENT_ID,
  });
}

export { GA_MEASUREMENT_ID };
