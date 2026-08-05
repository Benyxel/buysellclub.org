import React, { useState } from "react";
import { Link } from "react-router-dom";
import { normalizeQuickTrackingQuery } from "../../utils/quickTrackingNotes";
import {
  isUnknownPackageMark,
  normalizeMarkIdInput,
  shippingMarkToMarkId,
} from "../../utils/markIdFormat";
import { Api } from "../../api";

const STATUS_MESSAGE =
  "These Packages are currently in Possesion of FOFOOFO IMPORT";

const UNKNOWN_PACKAGE_MESSAGE =
  "This package was received at the China warehouse, but there was no shipping mark on the package. It is held as an Unknown package. It will not appear on your shipping bill until the container is offloaded.";

function bareMarkId(value) {
  return normalizeMarkIdInput(shippingMarkToMarkId(value));
}

function isFullMarkId(value) {
  return /^[A-Z]{2,6}\d{1,10}$/.test(bareMarkId(value));
}

function looksLikeTrackingNumber(value) {
  const q = String(value || "").trim().toUpperCase();
  if (!q) return false;
  if (/^FIM-?\d{1,6}$/.test(q)) return false;
  if (/\s/.test(q) && q.length < 20) return false;
  if (/^[A-Z0-9][A-Z0-9\-_]{7,}$/.test(q)) return true;
  return q.replace(/[^A-Z0-9]/g, "").length >= 10;
}

function trackingLinesFromNote(note) {
  return String(note?.description || "")
    .split(/\r?\n|[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter(
      (item) =>
        !/^(CBM|KG|WEIGHT|PRODUCT|DESCRIPTION|REASON)\s*:/i.test(item)
    );
}

function noteIsUnknownPackage(note) {
  if (note?.is_unknown_package) return true;
  return isUnknownPackageMark(note?.mark_id);
}

const QuickTracking = () => {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [availableContainers, setAvailableContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [unknownMarkHint, setUnknownMarkHint] = useState("");
  const [searchedTracking, setSearchedTracking] = useState("");

  const handleSearch = async (event) => {
    event.preventDefault();
    const normalized = normalizeQuickTrackingQuery(query);
    if (!normalized) {
      setError("Please enter a Mark ID, full name, or tracking number.");
      setResults([]);
      setSearched(false);
      setUnknownMarkHint("");
      setSearchedTracking("");
      return;
    }

    const trackingMode = looksLikeTrackingNumber(normalized);
    const markQuery = normalizeMarkIdInput(normalized);

    // Don't list every unlabeled package when someone searches FIM752.
    if (!trackingMode && isUnknownPackageMark(markQuery)) {
      setError("");
      setResults([]);
      setAvailableContainers([]);
      setSelectedContainer("");
      setSearchedTracking("");
      setUnknownMarkHint(
        "Packages with no shipping mark are stored as Unknown (FIM752). Search by your tracking number to check if your package was received."
      );
      setSearched(true);
      return;
    }

    setError("");
    setUnknownMarkHint("");
    setIsLoading(true);
    try {
      const response = await Api.quickTracking.search({ q: normalized });
      const raw = response.data;
      if (raw && !Array.isArray(raw) && raw.unknown_mark_directory) {
        setResults([]);
        setAvailableContainers([]);
        setSelectedContainer("");
        setSearchedTracking("");
        setUnknownMarkHint(
          raw.message ||
            "Packages with no shipping mark are stored as Unknown. Search by tracking number."
        );
        setSearched(true);
        return;
      }

      const allMatches = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.results)
          ? raw.results
          : [];
      // A searched mark shows only that mark — never lookalikes like FIM8850.
      const matches =
        !trackingMode && isFullMarkId(markQuery)
          ? allMatches.filter((note) => bareMarkId(note?.mark_id) === markQuery)
          : allMatches;
      const sorted = [...matches].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at) -
          new Date(a.updated_at || a.created_at)
      );
      const containers = Array.from(
        new Set(
          sorted
            .filter((note) => !noteIsUnknownPackage(note))
            .map((note) => (note.container_number || "").trim())
            .filter(Boolean)
        )
      );
      setResults(sorted);
      setAvailableContainers(containers);
      setSelectedContainer("");
      setSearchedTracking(trackingMode ? normalized.toUpperCase() : "");
      setSearched(true);
    } catch (fetchError) {
      console.error("Failed to search quick tracking notes:", fetchError);
      setError("Failed to load quick tracking results.");
      setResults([]);
      setAvailableContainers([]);
      setSelectedContainer("");
      setSearchedTracking("");
      setSearched(true);
    } finally {
      setIsLoading(false);
    }
  };

  const visibleResults = selectedContainer
    ? results.filter(
        (note) =>
          noteIsUnknownPackage(note) ||
          note.container_number === selectedContainer
      )
    : results;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Quick Tracking
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Search by Mark ID, full name, or tracking number. Packages with no
            shipping mark are held as Unknown — search the tracking number to
            check them.
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 space-y-4"
        >
          <div>
            <label
              htmlFor="quick-tracking-query"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Mark ID, Full Name, or Tracking Number
            </label>
            <input
              id="quick-tracking-query"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. FIM###, your name, or JT5511…"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
          >
            Search Quick Tracking
          </button>
        </form>

        {isLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
            Loading quick tracking results...
          </div>
        )}

        {!isLoading && searched && unknownMarkHint && (
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl shadow-lg p-6 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100 space-y-2">
            <h2 className="text-lg font-semibold">Unknown packages (no mark)</h2>
            <p className="text-sm">{unknownMarkHint}</p>
          </div>
        )}

        {!isLoading &&
          searched &&
          !unknownMarkHint &&
          results.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
              {searchedTracking
                ? "No received package found for this tracking number yet. Please check again in a few days."
                : "Your package(s) are not added yet. Please check again in 3 days time."}
            </div>
          )}

        {searched && availableContainers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <label
              htmlFor="quick-tracking-container"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Select Container
            </label>
            <select
              id="quick-tracking-container"
              value={selectedContainer}
              onChange={(event) => setSelectedContainer(event.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Containers</option>
              {availableContainers.map((container) => (
                <option key={container} value={container}>
                  {container}
                </option>
              ))}
            </select>
          </div>
        )}

        {visibleResults.map((note) => {
          const unknown = noteIsUnknownPackage(note);
          let trackingItems = trackingLinesFromNote(note);
          if (searchedTracking) {
            const match = trackingItems.filter(
              (item) => item.toUpperCase() === searchedTracking
            );
            if (match.length) trackingItems = match;
          }

          if (unknown) {
            return (
              <div
                key={note.id}
                className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl shadow-lg p-6 border border-amber-200 dark:border-amber-800 space-y-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-amber-500 text-white">
                    Unknown package
                  </span>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Received · no shipping mark
                  </h2>
                </div>

                {searchedTracking ? (
                  <div className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-semibold">Tracking number:</span>{" "}
                    <span className="font-mono">{searchedTracking}</span>
                  </div>
                ) : null}

                {note.container_number && (
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Container Number:</span>{" "}
                    {note.container_number}
                  </div>
                )}

                {trackingItems.length > 0 && (
                  <div className="bg-white/70 dark:bg-gray-900/40 rounded-lg p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-5 xl:grid-cols-10 gap-2">
                      {trackingItems.map((item, idx) => (
                        <div
                          key={`${note.id}-${idx}`}
                          className="bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded text-xs font-mono text-gray-700 dark:text-gray-200 px-2 py-1 text-center"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white/80 dark:bg-gray-900/50 border border-amber-200 dark:border-amber-700 rounded-lg p-4 text-sm text-amber-950 dark:text-amber-100 space-y-2">
                  <p>{UNKNOWN_PACKAGE_MESSAGE}</p>
                  <p>
                    For more details after offload, visit the{" "}
                    <Link to="/tracking" className="underline font-semibold">
                      shipping page
                    </Link>
                    .
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div
              key={note.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 space-y-4"
            >
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {note.heading || "Quick Tracking Note"}
                </h2>
                {(note.mark_id || note.full_name) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {note.mark_id ? `Mark ID: ${note.mark_id}` : ""}
                    {note.mark_id && note.full_name ? " • " : ""}
                    {note.full_name ? `Name: ${note.full_name}` : ""}
                  </p>
                )}
              </div>

              {note.container_number && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Container Number:</span>{" "}
                  {note.container_number}
                </div>
              )}

              {trackingItems.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/60 rounded-lg p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-5 xl:grid-cols-10 gap-2">
                    {trackingItems.map((item, idx) => (
                      <div
                        key={`${note.id}-${idx}`}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-200 px-2 py-1 text-center"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-900 dark:text-blue-200 space-y-1">
                <p>{STATUS_MESSAGE}</p>
                <p>
                  To get more details visit the{" "}
                  <Link to="/tracking" className="underline font-semibold">
                    shipping page
                  </Link>{" "}
                  and track.
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickTracking;
