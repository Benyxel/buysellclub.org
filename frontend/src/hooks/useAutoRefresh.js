import { useEffect, useRef, useCallback } from "react";

/**
 * Custom hook for auto-refreshing data
 * 
 * @param {Function} fetchFunction - The function to call for refreshing data
 * @param {number} intervalMs - Refresh interval in milliseconds (default: 30000 = 30 seconds)
 * @param {boolean} enabled - Whether auto-refresh is enabled (default: true)
 * @param {Array} dependencies - Dependencies array for the fetch function (default: [])
 * @param {boolean} refreshOnVisible - Refresh when tab becomes visible (default: true)
 * @param {boolean} refreshOnFocus - Refresh when window regains focus (default: true)
 */
export const useAutoRefresh = (
  fetchFunction,
  {
    intervalMs = 30000,
    enabled = true,
    dependencies = [],
    refreshOnVisible = true,
    refreshOnFocus = true,
  } = {}
) => {
  const intervalRef = useRef(null);
  const fetchFunctionRef = useRef(fetchFunction);

  // Keep fetch function ref updated
  useEffect(() => {
    fetchFunctionRef.current = fetchFunction;
  }, [fetchFunction]);

  // Wrapper function that uses the ref
  const refresh = useCallback(() => {
    if (fetchFunctionRef.current) {
      fetchFunctionRef.current();
    }
  }, []);

  // Set up interval-based refresh
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Initial fetch
    refresh();

    // Set up interval
    intervalRef.current = setInterval(() => {
      // Only refresh if tab is visible
      if (document.visibilityState === "visible") {
        refresh();
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, intervalMs, refresh, ...dependencies]);

  // Refresh when tab becomes visible
  useEffect(() => {
    if (!enabled || !refreshOnVisible) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, refreshOnVisible, refresh]);

  // Refresh when window regains focus
  useEffect(() => {
    if (!enabled || !refreshOnFocus) {
      return;
    }

    const handleFocus = () => {
      refresh();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [enabled, refreshOnFocus, refresh]);

  return { refresh };
};

