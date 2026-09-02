import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  isUnknownPackageMark,
  normalizeMarkIdInput,
  formatMarkIdForDisplay,
  shippingMarkToMarkId,
} from "../../utils/markIdFormat";
import API, { Api } from "../../api";
import benReceivingImg from "../../assets/ben-receiving.png";

const STATUS_MESSAGE =
  "These packages are currently in possession of FOFOOFO IMPORT";

function bareMarkId(value) {
  return normalizeMarkIdInput(shippingMarkToMarkId(value));
}

function asNoteList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function trackingLinesFromNote(note) {
  return String(note?.description || "")
    .split(/\r?\n|[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter(
      (item) =>
        !/^(CBM|KG|WEIGHT|SIZE|DIMS|DIMENSIONS?|PRODUCT|DESCRIPTION|REASON)\s*:/i.test(
          item
        )
    )
    .filter((item) => !/^\d+(\.\d+)?\s*[x×*]\s*\d+(\.\d+)?\s*[x×*]\s*\d+(\.\d+)?$/i.test(item));
}

function formatNoteCbm(note) {
  const raw = note?.package_cbm;
  if (raw != null && String(raw).trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n.toFixed(3);
    return String(raw).trim();
  }
  const match = String(note?.description || "").match(/^CBM:\s*(.+)$/im);
  return match ? String(match[1]).trim() : "";
}

function noteIsUnknownPackage(note) {
  if (note?.is_unknown_package) return true;
  return isUnknownPackageMark(note?.mark_id);
}

function noteAction(note) {
  const action = String(note?.scanner_action || "").toLowerCase();
  if (action === "rejected" || action === "returned" || action === "received") {
    return action;
  }
  const heading = String(note?.heading || "").toLowerCase();
  if (heading.includes("rejected")) return "rejected";
  if (heading.includes("returned")) return "returned";
  return "received";
}

function noteContainsTracking(note, trackingNumber) {
  const target = String(trackingNumber || "").trim().toUpperCase();
  if (!target) return false;
  const tokens = String(note?.description || "")
    .split(/[\s,;/\r\n]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  if (tokens.includes(target)) return true;
  return String(note?.heading || "").toUpperCase().includes(target);
}

function sortNotes(notes) {
  return [...notes].sort(
    (a, b) =>
      new Date(b.updated_at || b.created_at) -
      new Date(a.updated_at || a.created_at)
  );
}

/**
 * Flatten all notes into tracking rows so new updates append into one list.
 * Dedupes by tracking number (keeps the newest note's status).
 */
function flattenTrackingRows(notes, { onlyTracking = "" } = {}) {
  const target = String(onlyTracking || "").trim().toUpperCase();
  const byTracking = new Map();

  for (const note of notes) {
    let trackingItems = trackingLinesFromNote(note);
    if (target) {
      trackingItems = trackingItems.filter(
        (item) => item.toUpperCase() === target
      );
      if (!trackingItems.length && noteContainsTracking(note, target)) {
        trackingItems = [target];
      }
    }

    if (!trackingItems.length) {
      // Reject/return notes without a TN still need a row.
      const fallbackKey = `note-${note.id}`;
      if (!target) {
        byTracking.set(fallbackKey, {
          key: fallbackKey,
          trackingNumber: "",
          note,
          action: noteAction(note),
          unknown: noteIsUnknownPackage(note),
          containerNumber: (note.container_number || "").trim(),
          updatedAt: note.updated_at || note.created_at,
        });
      }
      continue;
    }

    for (const trackingNumber of trackingItems) {
      const key = trackingNumber.toUpperCase();
      const existing = byTracking.get(key);
      const updatedAt = note.updated_at || note.created_at;
      if (
        existing &&
        new Date(existing.updatedAt || 0) >= new Date(updatedAt || 0)
      ) {
        continue;
      }
      byTracking.set(key, {
        key,
        trackingNumber,
        note,
        action: noteAction(note),
        unknown: noteIsUnknownPackage(note),
        containerNumber: (note.container_number || "").trim(),
        updatedAt,
      });
    }
  }

  return Array.from(byTracking.values()).sort(
    (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  );
}

function actionBadge(action, unknown) {
  if (action === "rejected") {
    return { label: "Rejected", tone: "bg-red-500 text-white" };
  }
  if (action === "returned") {
    return { label: "Returned", tone: "bg-orange-500 text-white" };
  }
  if (unknown) {
    return { label: "Unknown", tone: "bg-amber-500 text-white" };
  }
  return { label: "Received", tone: "bg-emerald-500 text-white" };
}

const QuickTracking = () => {
  const [markId, setMarkId] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [myNotes, setMyNotes] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchedTracking, setSearchedTracking] = useState("");
  const [useTrackingPageHint, setUseTrackingPageHint] = useState(null);

  const [selectedContainer, setSelectedContainer] = useState("");

  const loadMyMark = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoggedIn(false);
      setMarkId("");
      setAuthChecked(true);
      return "";
    }
    setIsLoggedIn(true);
    try {
      const resp = await API.get("/buysellapi/shipping-marks/me/");
      const id = bareMarkId(resp?.data?.markId || resp?.data?.mark_id || "");
      setMarkId(id);
      setAuthChecked(true);
      return id;
    } catch (err) {
      if (err?.response?.status === 404) {
        try {
          const cached = localStorage.getItem("userShippingMark");
          if (cached) {
            const parsed = JSON.parse(cached);
            const id = bareMarkId(parsed?.markId || parsed?.mark_id || "");
            setMarkId(id);
            setAuthChecked(true);
            return id;
          }
        } catch {
          /* ignore cache parse errors */
        }
      }
      setMarkId("");
      setAuthChecked(true);
      return "";
    }
  }, []);

  const loadMyGoods = useCallback(async (userMark) => {
    if (!userMark) {
      setMyNotes([]);
      return;
    }
    setListLoading(true);
    setListError("");
    try {
      const response = await Api.quickTracking.search({ q: userMark });
      const raw = response.data;
      if (raw && !Array.isArray(raw) && raw.unknown_mark_directory) {
        setMyNotes([]);
        return;
      }
      const matches = asNoteList(raw)
        .filter((note) => bareMarkId(note?.mark_id) === bareMarkId(userMark))
        // Catch-all account (FIM752) owns unlabeled packages — keep them visible.
        .filter(
          (note) =>
            isUnknownPackageMark(userMark) || !noteIsUnknownPackage(note)
        );
      setMyNotes(sortNotes(matches));
      setSelectedContainer("");
    } catch (err) {
      console.error("Failed to load goods received:", err);
      setListError("Unable to load your received goods. Please try again.");
      setMyNotes([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const id = await loadMyMark();
      if (!active) return;
      if (id) await loadMyGoods(id);
    })();
    return () => {
      active = false;
    };
  }, [loadMyMark, loadMyGoods]);

  const availableContainers = useMemo(() => {
    return Array.from(
      new Set(
        myNotes
          .map((note) => (note.container_number || "").trim())
          .filter(Boolean)
      )
    );
  }, [myNotes]);

  const visibleMyNotes = selectedContainer
    ? myNotes.filter((note) => note.container_number === selectedContainer)
    : myNotes;

  const myTrackingRows = useMemo(
    () => flattenTrackingRows(visibleMyNotes),
    [visibleMyNotes]
  );

  const searchTrackingRows = useMemo(
    () =>
      searchResults == null
        ? []
        : flattenTrackingRows(searchResults, {
            onlyTracking: searchedTracking,
          }),
    [searchResults, searchedTracking]
  );

  const handleSearch = async (event) => {
    event.preventDefault();
    const tracking = String(query || "").trim().toUpperCase();
    if (!tracking) {
      setSearchError("Enter a tracking number to check if it was received.");
      setSearchResults(null);
      setSearchedTracking("");
      setUseTrackingPageHint(null);
      return;
    }

    const shippedStatuses = new Set([
      "laden",
      "in_transit",
      "clearing",
      "arrived_port",
      "offloaded",
      "completed",
    ]);

    const applyTrackingPageHint = (payload = {}) => {
      setSearchResults([]);
      setUseTrackingPageHint({
        message:
          payload.message ||
          "This package is already on a laden/shipped container. Please use the Tracking page for shipment details.",
        trackingNumber: payload.trackingNumber || tracking,
        containerNumber: payload.containerNumber || "",
        containerStatus: payload.containerStatus || "",
      });
    };

    const checkTrackingPageFallback = async () => {
      try {
        const res = await API.get(
          `/buysellapi/trackings/by-number/${encodeURIComponent(tracking)}/`
        );
        const data = res?.data;
        const statusCode = String(data?.container_status || "")
          .trim()
          .toLowerCase();
        if (statusCode && shippedStatuses.has(statusCode)) {
          const statusLabel =
            data?.container_status_display ||
            statusCode.replace(/_/g, " ");
          const containerNumber = data?.container_number || "";
          applyTrackingPageHint({
            trackingNumber: data?.tracking_number || tracking,
            containerNumber,
            containerStatus: statusLabel,
            message: containerNumber
              ? `Tracking ${tracking} is on container ${containerNumber} (${statusLabel}). Please use the Tracking page for shipment details.`
              : `This package is on a ${statusLabel} container. Please use the Tracking page for shipment details.`,
          });
          return true;
        }
      } catch {
        // 404 / errors: not a formal tracking yet.
      }
      return false;
    };

    setSearchError("");
    setUseTrackingPageHint(null);
    setSearchLoading(true);
    setSearchedTracking(tracking);
    try {
      const response = await Api.quickTracking.search({
        q: tracking,
        mode: "tracking",
      });
      const raw = response.data;
      if (raw && !Array.isArray(raw) && raw.unknown_mark_directory) {
        setSearchResults([]);
        setSearchError(
          raw.message ||
            "Search by your tracking number to check if your package was received."
        );
        return;
      }
      if (raw && !Array.isArray(raw) && raw.use_tracking_page) {
        applyTrackingPageHint({
          message: raw.message,
          trackingNumber: raw.tracking_number || tracking,
          containerNumber: raw.container_number || "",
          containerStatus:
            raw.container_status_display || raw.container_status || "",
        });
        return;
      }
      const notes = asNoteList(raw).filter((note) =>
        noteContainsTracking(note, tracking)
      );
      if (!notes.length) {
        const redirected = await checkTrackingPageFallback();
        if (redirected) return;
      }
      setSearchResults(sortNotes(notes));
    } catch (err) {
      console.error("Tracking search failed:", err);
      const redirected = await checkTrackingPageFallback();
      if (redirected) return;
      setSearchError("Failed to search this tracking number.");
      setSearchResults([]);
      setUseTrackingPageHint(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setSearchError("");
    setSearchResults(null);
    setSearchedTracking("");
    setUseTrackingPageHint(null);
  };

  const renderGoodsCard = ({
    title,
    subtitle,
    rows,
    emptyMessage,
    showMark = true,
  }) => {
    if (!rows.length) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700 text-center space-y-2">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-emerald-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[min(70vh,36rem)]">
        <div className="shrink-0 p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-500 text-white">
              Received
            </span>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>
          {subtitle ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
          ) : null}
          {showMark && markId ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Mark ID:</span>{" "}
              {formatMarkIdForDisplay(markId)}
            </p>
          ) : null}
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            {STATUS_MESSAGE}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {rows.length} tracking number{rows.length === 1 ? "" : "s"} · new
            updates are added to this list
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((row) => {
            const badge = actionBadge(row.action, row.unknown);
            const cbmLabel = formatNoteCbm(row.note);
            return (
              <div
                key={row.key}
                className="px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-mono text-sm sm:text-base font-semibold text-gray-900 dark:text-white break-all">
                    {row.trackingNumber ||
                      row.note?.heading ||
                      "Package update"}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {row.containerNumber
                      ? `Container: ${row.containerNumber}`
                      : row.action === "rejected" || row.action === "returned"
                        ? badge.label
                        : "Container not assigned yet"}
                    {cbmLabel ? ` · ${cbmLabel} CBM` : ""}
                    {row.unknown ? " · No shipping mark" : ""}
                    {row.note?.reason ? ` · ${row.note.reason}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 self-start sm:self-center inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${badge.tone}`}
                >
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="shrink-0 p-4 bg-emerald-50/70 dark:bg-emerald-900/20 border-t border-emerald-100 dark:border-emerald-900 text-sm text-emerald-950 dark:text-emerald-100">
          For more shipment details after loaded, visit the{" "}
          <Link to="/tracking" className="underline font-semibold">
            tracking page
          </Link>
          .
        </div>
      </div>
    );
  };

  const showingSearch = searchResults !== null || useTrackingPageHint !== null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-gray-50 to-emerald-50/40 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
      {/* Full-bleed hero — image clipped by the section itself */}
      <section className="relative w-full overflow-hidden hero-bg-color h-[320px] sm:h-[380px] md:h-[420px]">
        {/* Oversized image: hero overflow clips top/bottom/sides */}
        <img
          src={benReceivingImg}
          alt="BuySellClub warehouse receiving goods"
          className="pointer-events-none select-none absolute z-[1] top-[20px] left-[52%] sm:left-[55%] md:left-[58%] h-[120%] sm:h-[125%] md:h-[130%] w-auto max-w-none object-contain drop-shadow-[-8px_4px_6px_rgba(0,0,0,.35)]"
        />

        <div className="relative z-[2] mx-auto max-w-6xl h-full px-4 sm:px-6 flex items-center">
          <div className="max-w-[48%] sm:max-w-xl space-y-3 py-6 sm:py-8">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Quick tracking
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
              Goods Received
            </h1>
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 max-w-[11.5rem] sm:max-w-md">
              Packages currently with Fofoofo Import — check what has arrived
              under your Mark ID.
            </p>
            {markId ? (
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-emerald-100 bg-white/70 dark:bg-emerald-500/20 border border-gray-200 dark:border-emerald-400/30 px-3 py-1.5 rounded-full">
                Your Mark ID: {formatMarkIdForDisplay(markId)}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto space-y-6 px-4 py-8 sm:py-10">
        <form
          onSubmit={handleSearch}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 space-y-4"
        >
          <div>
            <label
              htmlFor="goods-received-tracking"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Search tracking number
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="goods-received-tracking"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. JT5511… / SF1234…"
                className="flex-1 w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={searchLoading}
                className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors disabled:opacity-60"
              >
                {searchLoading ? "Searching…" : "Check received"}
              </button>
            </div>
          </div>
          {searchError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800 text-sm">
              {searchError}
            </div>
          )}
          {showingSearch && (
            <button
              type="button"
              onClick={clearSearch}
              className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
            >
              Clear search and show my goods
            </button>
          )}
        </form>

        {showingSearch ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Search result for{" "}
              <span className="font-mono">{searchedTracking}</span>
            </h2>
            {searchLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                Checking if this tracking was received…
              </div>
            ) : useTrackingPageHint ? (
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl shadow-lg p-6 border border-blue-200 dark:border-blue-800 space-y-4">
                <div className="space-y-2">
                  <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-blue-600 text-white">
                    Use Tracking page
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    This package has already been shipped
                  </h3>
                  <p className="text-sm text-blue-950 dark:text-blue-100">
                    {useTrackingPageHint.message}
                  </p>
                  {(useTrackingPageHint.containerNumber ||
                    useTrackingPageHint.containerStatus) && (
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {useTrackingPageHint.containerNumber
                        ? `Container: ${useTrackingPageHint.containerNumber}`
                        : ""}
                      {useTrackingPageHint.containerNumber &&
                      useTrackingPageHint.containerStatus
                        ? " · "
                        : ""}
                      {useTrackingPageHint.containerStatus
                        ? `Status: ${useTrackingPageHint.containerStatus}`
                        : ""}
                    </p>
                  )}
                </div>
                <Link
                  to="/tracking"
                  className="inline-flex px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Open Tracking page
                </Link>
              </div>
            ) : (
              renderGoodsCard({
                title: "Search result",
                subtitle: `Tracking ${searchedTracking}`,
                rows: searchTrackingRows,
                emptyMessage:
                  "No received package found for this tracking number yet. Please check again in a few days.",
                showMark: false,
              })
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Your goods received
              </h2>
              {markId ? (
                <button
                  type="button"
                  onClick={() => loadMyGoods(markId)}
                  className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:underline self-start"
                >
                  Refresh
                </button>
              ) : null}
            </div>

            {!authChecked || listLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                Loading your received goods…
              </div>
            ) : !isLoggedIn ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Sign in to see your goods
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Log in with your account so we can load packages received
                  under your Mark ID. You can still search any tracking number
                  above without signing in.
                </p>
                <Link
                  to="/Login"
                  className="inline-flex px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Log in
                </Link>
              </div>
            ) : !markId ? (
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl shadow-lg p-6 border border-amber-200 dark:border-amber-800 space-y-3 text-amber-950 dark:text-amber-100">
                <h3 className="text-lg font-semibold">Mark ID not assigned</h3>
                <p className="text-sm">
                  Your account does not have a Mark ID yet. Once your Mark ID is
                  assigned, your received goods will appear here automatically.
                </p>
                <Link
                  to="/Profile"
                  className="inline-flex text-sm font-semibold underline"
                >
                  Open profile
                </Link>
              </div>
            ) : listError ? (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl shadow-lg p-6 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                {listError}
              </div>
            ) : (
              <>
                {availableContainers.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
                    <label
                      htmlFor="goods-received-container"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Filter by container
                    </label>
                    <select
                      id="goods-received-container"
                      value={selectedContainer}
                      onChange={(event) =>
                        setSelectedContainer(event.target.value)
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">All containers</option>
                      {availableContainers.map((container) => (
                        <option key={container} value={container}>
                          {container}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {renderGoodsCard({
                  title: "Goods Received",
                  subtitle: selectedContainer
                    ? `Container ${selectedContainer}`
                    : "All your packages currently with Fofoofo Import",
                  rows: myTrackingRows,
                  emptyMessage:
                    "No goods received yet. Please check again after your packages reach our China warehouse. You can also search a tracking number above.",
                  showMark: true,
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickTracking;
