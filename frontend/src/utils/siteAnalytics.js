/**
 * Custom site analytics: record page views to backend for admin dashboard.
 * Used for: daily visitors, Quick Links & Community page views.
 */

import API from "../api";

const SESSION_KEY = "bsc_visit_session_id";

function getOrCreateSessionId() {
  if (typeof window === "undefined") return null;
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 12);
    try {
      window.localStorage.setItem(SESSION_KEY, id);
    } catch (_) {}
  }
  return id;
}

/**
 * Record a page view. Call on route change.
 * @param {string} path - Page path e.g. /Community, /Buy4me
 */
export function recordPageView(path) {
  if (!path || typeof path !== "string") return;
  const sessionId = getOrCreateSessionId();
  if (!sessionId) return;
  const pathTrimmed = path.slice(0, 512);
  API.post("/buysellapi/site-analytics/record-visit/", {
    path: pathTrimmed,
    session_id: sessionId,
  }).catch(() => {
    // Ignore errors (e.g. network, 401) so analytics never break the app
  });
}
