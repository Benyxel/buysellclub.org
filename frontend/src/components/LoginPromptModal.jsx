import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Lightweight modal prompting user right after login
const LoginPromptModal = () => {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onAuthChange = () => {
      // Only show for non-admin areas
      if (location.pathname.startsWith("/admin")) return;

      const token = localStorage.getItem("token");
      const adminToken = localStorage.getItem("adminToken");
      // Skip admin-only logins
      if (!token || adminToken) return;

      // Priority 1: explicit prompt set during login flow
      const lp = localStorage.getItem("loginPrompt");
      if (lp) {
        try {
          const data = JSON.parse(lp);
          if (data?.username) setUsername(data.username);
        } catch {
          // ignore JSON parse errors
        }
        setOpen(true);
        // consume prompt so it shows once per login
        localStorage.removeItem("loginPrompt");
        // mark as shown for this browser session so we don't show on refresh
        try {
          sessionStorage.setItem("welcomeShown", "1");
        } catch {}
        return;
      }

      // Priority 2: no explicit prompt but user already has a token
      // Show a one-time welcome per session if not shown already.
      try {
        const shown = sessionStorage.getItem("welcomeShown");
        if (!shown) {
          // try to infer username from persisted userData
          const ud = localStorage.getItem("userData");
          if (ud) {
            try {
              const parsed = JSON.parse(ud);
              if (parsed?.username) setUsername(parsed.username);
            } catch {
              // ignore
            }
          }
          setOpen(true);
          sessionStorage.setItem("welcomeShown", "1");
        }
      } catch {
        // ignore storage errors
      }
    };

    // Initial check if flag already set (e.g., landed after redirect)
    onAuthChange();
    window.addEventListener("authChange", onAuthChange);
    return () => window.removeEventListener("authChange", onAuthChange);
  }, [location.pathname]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setOpen(false)}
      />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-[90%] max-w-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {username ? `Welcome, ${username}!` : "Welcome!"}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-5">
          You're now signed in. What would you like to do next?
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              setOpen(false);
              navigate("/Profile");
            }}
            className="flex-1 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90"
          >
            Go to Profile
          </button>
          <button
            onClick={() => {
              setOpen(false);
              navigate("/Shipping");
            }}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Shipping Dashboard
          </button>
          <button
            onClick={() => setOpen(false)}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Continue Browsing
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPromptModal;
