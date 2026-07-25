import React, { useState } from "react";
import { Link } from "react-router-dom";
import { normalizeQuickTrackingQuery } from "../../utils/quickTrackingNotes";
import { Api } from "../../api";

const STATUS_MESSAGE =
  "These Packages are currently in Possesion of FOFOOFO IMPORT";

const QuickTracking = () => {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [availableContainers, setAvailableContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (event) => {
    event.preventDefault();
    const normalized = normalizeQuickTrackingQuery(query);
    if (!normalized) {
      setError("Please enter a Mark ID or full name.");
      setResults([]);
      setSearched(false);
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const response = await Api.quickTracking.search({ q: normalized });
      const matches = Array.isArray(response.data) ? response.data : [];
      const sorted = [...matches].sort(
        (a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
      );
      const containers = Array.from(
        new Set(
          matches
            .map((note) => (note.container_number || "").trim())
            .filter(Boolean)
        )
      );
      setResults(sorted);
      setAvailableContainers(containers);
      setSelectedContainer("");
      setSearched(true);
    } catch (fetchError) {
      console.error("Failed to search quick tracking notes:", fetchError);
      setError("Failed to load quick tracking results.");
      setResults([]);
      setAvailableContainers([]);
      setSelectedContainer("");
      setSearched(true);
    } finally {
      setIsLoading(false);
    }
  };

  const visibleResults = selectedContainer
    ? results.filter((note) => note.container_number === selectedContainer)
    : results;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Quick Tracking
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Enter your Mark ID or full name to view your bulk tracking note.
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
              Mark ID or Full Name
            </label>
            <input
              id="quick-tracking-query"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Enter Mark ID or Full Name"
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

        {!isLoading && searched && results.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
            Your package(s) are not added yet. Please check again in 3 days time.
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
          const trackingItems = (note.description || "")
            .split(/\r?\n|[,;]+/)
            .map((item) => item.trim())
            .filter(Boolean)
            .filter(
              (item) =>
                !/^(CBM|KG|WEIGHT|PRODUCT|DESCRIPTION|REASON)\s*:/i.test(item)
            );
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
        )})}
      </div>
    </div>
  );
};

export default QuickTracking;
