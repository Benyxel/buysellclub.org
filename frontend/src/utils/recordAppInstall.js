/**
 * Record store clicks (website) and first-open installs (app) on the backend.
 */

import API from "../api";

const SESSION_KEY = "bsc_visit_session_id";

function getOrCreateSessionId() {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      "s_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 12);
    try {
      window.localStorage.setItem(SESSION_KEY, id);
    } catch (_) {
      /* ignore */
    }
  }
  return id || "";
}

/**
 * @param {"download"|"install"} eventType
 * @param {{ source?: string, platform?: string, deviceId?: string }} [opts]
 */
export function recordAppInstallEvent(eventType, opts = {}) {
  const payload = {
    event_type: eventType,
    platform: opts.platform || "android",
    source: opts.source || "",
    device_id: opts.deviceId || "",
    session_id: opts.sessionId || getOrCreateSessionId(),
  };
  return API.post("/buysellapi/app-installs/record/", payload).catch(() => null);
}

/** Call when the user opens Google Play / App Store from the website. */
export function recordStoreClick(source = "other") {
  return recordAppInstallEvent("download", {
    source,
    platform: "android",
  });
}

/** @deprecated Use recordStoreClick */
export function recordApkDownload(source = "other") {
  return recordStoreClick(source);
}
