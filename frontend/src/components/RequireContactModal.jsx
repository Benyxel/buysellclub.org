import React, { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import API from "../api";
import { normalizePhone } from "../utils/ghanaPhone";
import { contactNeedsUpdate } from "../utils/contactRequired";
import { toast } from "../utils/toast";

/** Routes where this prompt should not appear (auth/admin shells). */
function shouldSkipPath(pathname) {
  const path = String(pathname || "");
  return (
    path === "/Login" ||
    path === "/Signup" ||
    path === "/admin-login" ||
    path.startsWith("/admin-dashboard") ||
    path.startsWith("/admin-user") ||
    path.startsWith("/admin-orders") ||
    path.startsWith("/admin/") ||
    path.startsWith("/agent-dashboard") ||
    path.startsWith("/local-agent-dashboard")
  );
}

function hasAuthToken() {
  return Boolean(
    localStorage.getItem("token") || localStorage.getItem("adminToken")
  );
}

/**
 * Mandatory contact capture for logged-in users with missing or placeholder
 * phone (e.g. Google signup google-temp-*). Cannot be dismissed until saved.
 */
const RequireContactModal = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkProfile = useCallback(async () => {
    if (!hasAuthToken() || shouldSkipPath(location.pathname)) {
      setOpen(false);
      return;
    }

    setChecking(true);
    try {
      const resp = await API.get("/buysellapi/users/me/");
      const data = resp.data || {};
      const role = data.role || "user";
      // Admins/agents manage accounts elsewhere; only require for normal users.
      if (role === "admin" || role === "agent" || role === "local_agent") {
        setOpen(false);
        return;
      }

      const needsUpdate =
        data.needs_contact_update === true ||
        contactNeedsUpdate(data.contact);

      if (needsUpdate) {
        setUsername(data.username || data.full_name || "");
        setContact("");
        setError("");
        setOpen(true);
      } else {
        setOpen(false);
      }
    } catch {
      // Don't block the site if profile fetch fails (offline/expired token).
      setOpen(false);
    } finally {
      setChecking(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    checkProfile();
  }, [checkProfile]);

  useEffect(() => {
    const onAuth = () => checkProfile();
    window.addEventListener("authChange", onAuth);
    window.addEventListener("focus", onAuth);
    return () => {
      window.removeEventListener("authChange", onAuth);
      window.removeEventListener("focus", onAuth);
    };
  }, [checkProfile]);

  const handleSave = async () => {
    const trimmed = contact.trim();
    if (!trimmed) {
      setError("Contact number is required");
      return;
    }
    const normalized = normalizePhone(trimmed);
    if (!normalized.ok) {
      setError(normalized.error || "Please enter a valid contact number");
      return;
    }

    setError("");
    setSaving(true);
    try {
      await API.patch("/buysellapi/users/me/", {
        contact: normalized.normalized,
      });
      toast.success("Contact saved. Thank you!");
      setOpen(false);
      setContact("");
      window.dispatchEvent(new Event("authChange"));
    } catch (err) {
      const message =
        err.response?.data?.contact?.[0] ||
        err.response?.data?.contact ||
        err.response?.data?.detail ||
        "Failed to save contact. Please try again.";
      setError(typeof message === "string" ? message : "Failed to save contact.");
      toast.error(typeof message === "string" ? message : "Failed to save contact.");
    } finally {
      setSaving(false);
    }
  };

  if (!open || checking) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="require-contact-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h2
          id="require-contact-title"
          className="mb-2 text-xl font-bold text-gray-900 dark:text-white"
        >
          Add your contact number
        </h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          {username ? (
            <>
              Hi <strong>{username}</strong> — your phone number is missing or
              incomplete. Add it now to continue using BuySellClub. This is
              required for shipping updates and support.
            </>
          ) : (
            <>
              Your phone number is missing or incomplete. Add it now to continue
              using BuySellClub. This is required for shipping updates and
              support.
            </>
          )}
        </p>
        <div className="mb-4">
          <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
            Contact Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            autoFocus
            value={contact}
            onChange={(e) => {
              setContact(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
            className={`w-full rounded-lg border px-4 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-white focus:border-transparent focus:ring-2 focus:ring-primary ${
              error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
            }`}
            placeholder="e.g. 0551234567 or +233551234567"
          />
          {error ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Ghana numbers: 10 digits starting with 0, or +233…
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !contact.trim()}
          className={`w-full rounded-lg bg-primary py-2.5 text-white transition-colors hover:bg-primary/90 ${
            saving || !contact.trim() ? "cursor-not-allowed opacity-70" : ""
          }`}
        >
          {saving ? "Saving…" : "Save & Continue"}
        </button>
      </div>
    </div>
  );
};

export default RequireContactModal;
