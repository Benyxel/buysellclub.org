import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

/** Only allow deep links back into BuySellClub mobile apps. */
function isAllowedReturnUri(uri) {
  if (!uri || typeof uri !== "string") return false;
  const value = uri.trim();
  return (
    value.startsWith("buysellclub://") ||
    value.startsWith("buysellclubadmin://") ||
    value.startsWith("org.buysellclub.app://") ||
    value.startsWith("org.buysellclub.app:/") ||
    value.startsWith("org.buysellclub.admin://") ||
    value.startsWith("org.buysellclub.admin:/")
  );
}

/**
 * Mobile Google sign-in bridge.
 * Opens in the app browser, uses the same Web OAuth client as the website
 * (no Android SHA-1), then redirects back to the app with an ID token.
 */
export default function AppGoogleAuth() {
  const [params] = useSearchParams();
  const returnUri = useMemo(
    () => (params.get("return_uri") || "buysellclub://oauthredirect").trim(),
    [params]
  );
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const finishWithCredential = useCallback(
    (credential) => {
      if (!isAllowedReturnUri(returnUri)) {
        setError("Invalid return link. Open this page from the BuySellClub app.");
        return;
      }
      if (!credential) {
        setError("Google did not return a credential. Please try again.");
        return;
      }
      const sep = returnUri.includes("?") ? "&" : "?";
      window.location.href = `${returnUri}${sep}id_token=${encodeURIComponent(
        credential
      )}`;
    },
    [returnUri]
  );

  useEffect(() => {
    if (!googleClientId) {
      setError("Google sign-in is not configured on this site.");
      return undefined;
    }
    if (!isAllowedReturnUri(returnUri)) {
      setError("Open Google sign-in from the BuySellClub app.");
      return undefined;
    }

    const scriptId = "google-oauth-script-app-bridge";
    const onLoad = () => {
      if (!window.google?.accounts?.id) {
        setError("Google Identity SDK failed to load. Refresh and try again.");
        return;
      }
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          finishWithCredential(response?.credential);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      const mount = document.getElementById("app-google-btn");
      if (mount) {
        mount.innerHTML = "";
        window.google.accounts.id.renderButton(mount, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: 320,
        });
      }
      setReady(true);
    };

    let script = document.getElementById(scriptId);
    if (script) {
      onLoad();
      return undefined;
    }
    script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = onLoad;
    script.onerror = () =>
      setError("Could not load Google sign-in. Check your connection.");
    document.body.appendChild(script);
    return undefined;
  }, [finishWithCredential, returnUri]);

  return (
    <div className="min-h-dvh bg-[#e8eef5] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 space-y-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          BuySellClub app
        </p>
        <h1 className="text-2xl font-extrabold text-gray-900">
          Continue with Google
        </h1>
        <p className="text-sm text-gray-600">
          Sign in with the same Google account you use on the website. You will
          return to the app automatically.
        </p>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-center py-2">
          <div id="app-google-btn" />
        </div>

        {!ready && !error ? (
          <p className="text-sm text-gray-500">Loading Google…</p>
        ) : null}
      </div>
    </div>
  );
}
