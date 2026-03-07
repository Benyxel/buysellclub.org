import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaSearch, FaSort, FaSortUp, FaSortDown, FaTimes, FaAddressBook, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { Api } from "../../api";
import { toast } from "../../utils/toast";

/** Column header substrings to hide from users (case-insensitive). Add keywords for any column you don't want displayed. */
const HIDDEN_COLUMN_HEADERS = [
  "business card",
  "business cards",
  "note",
  "notes",
  "location",
];

/** Group column headers under parent labels (order matters). Only first 5 columns shown. */
const COLUMN_GROUPS = [
  { group: "Supplier", keywords: ["factory", "name", "company", "business name"] },
  { group: "Category", keywords: ["category", "product type", "product type"] },
  { group: "Location", keywords: ["city", "country", "location"] },
  { group: "Contact", keywords: ["contact person", "wechat", "whatsapp", "phone", "email"] },
  { group: "Web", keywords: ["website", "web", "link"] },
  { group: "Business", keywords: ["moq", "minimum"] },
];

const CONTACT_COMBO_HEADERS = ["wechat", "whatsapp", "phone", "email"];
const CITY_COUNTRY_HEADERS = ["city", "country"];

/** Table column headings (one per visible column, in order). */
const TABLE_HEADINGS = [
  "Factory Name",
  "category",
  "Location (City, Country)",
  "Contact Person",
  "Wechat / WhatsApp",
  "Email/Website",
];

function isColumnHidden(header) {
  const lower = (header || "").toLowerCase();
  return HIDDEN_COLUMN_HEADERS.some((kw) => lower.includes(kw));
}

function isContactComboColumn(header) {
  const lower = (header || "").toLowerCase();
  return CONTACT_COMBO_HEADERS.some((kw) => lower.includes(kw));
}

function isCityOrCountryColumn(header) {
  const lower = (header || "").toLowerCase();
  return CITY_COUNTRY_HEADERS.some((kw) => lower.includes(kw));
}

const MAX_VISIBLE_COLUMNS = 6;

/** visibleCols: combined columns for Wechat/WhatsApp/Email and City+Country. Only first 5 columns shown; new sheet columns do not auto-appear. */
function getVisibleColumns(headers) {
  const contactIndices = headers
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => !isColumnHidden(h) && isContactComboColumn(h))
    .map(({ i }) => i)
    .sort((a, b) => a - b);

  const cityCountryIndices = headers
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => !isColumnHidden(h) && isCityOrCountryColumn(h))
    .map(({ i }) => i)
    .sort((a, b) => a - b);

  const result = [];
  let addedContact = false;
  let addedCityCountry = false;

  headers.forEach((header, dataIdx) => {
    if (result.length >= MAX_VISIBLE_COLUMNS) return;
    if (isColumnHidden(header)) return;
    const label = header || `Column ${dataIdx + 1}`;

    if (contactIndices.includes(dataIdx)) {
      if (!addedContact) {
        result.push({ header: "Wechat / WhatsApp / Email/Website", dataIndices: [...contactIndices], combined: true });
        addedContact = true;
      }
      return;
    }

    if (cityCountryIndices.includes(dataIdx)) {
      if (!addedCityCountry) {
        result.push({ header: "City / Country", dataIndices: [...cityCountryIndices], combined: true });
        addedCityCountry = true;
      }
      return;
    }

    result.push({ header: label, dataIdx });
  });

  return result.slice(0, MAX_VISIBLE_COLUMNS);
}

function buildHeaderGroups(visibleCols) {
  const assigned = new Set();
  const groups = [];
  const getDataIdx = (col) => col.dataIdx ?? col.dataIndices?.[0];

  for (const { group, keywords } of COLUMN_GROUPS) {
    const columns = [];
    visibleCols.forEach((col, displayIdx) => {
      if (assigned.has(displayIdx)) return;
      const header = col.header || "";
      const lower = header.toLowerCase();
      const match = keywords.some((kw) => lower.includes(kw));
      if (match) {
        assigned.add(displayIdx);
        columns.push({ displayIdx, dataIdx: getDataIdx(col), header });
      }
    });
    if (columns.length) groups.push({ group, columns });
  }
  const unassigned = visibleCols
    .map((_, displayIdx) => displayIdx)
    .filter((i) => !assigned.has(i));
  if (unassigned.length) {
    groups.push({
      group: "More",
      columns: unassigned.map((displayIdx) => ({
        displayIdx,
        dataIdx: getDataIdx(visibleCols[displayIdx]),
        header: visibleCols[displayIdx].header,
      })),
    });
  }
  return groups;
}

const CommunitySheet = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ headers: [], rows: [] });
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [expandedMobileIdx, setExpandedMobileIdx] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await Api.community.sheetData();
        if (cancelled) return;
        setData({
          headers: res.data?.headers ?? [],
          rows: res.data?.rows ?? [],
        });
      } catch (err) {
        if (cancelled) return;
        const msg =
          err.response?.data?.error ||
          (err.response?.status === 403
            ? "You do not have access to the suppliers sheet."
            : "Failed to load sheet data.");
        setError(msg);
        if (err.response?.status !== 403) {
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  const { headers, rows } = data;

  const visibleCols = useMemo(() => getVisibleColumns(headers), [headers]);
  const headerGroups = useMemo(() => buildHeaderGroups(visibleCols), [visibleCols]);

  const filteredAndSortedRows = useMemo(() => {
    let result = rows.map((row, idx) => ({ row, originalIndex: idx }));

    const q = (search || "").trim().toLowerCase();
    if (q) {
      result = result.filter(({ row }) =>
        row.some((cell) => (cell ?? "").toString().toLowerCase().includes(q))
      );
    }

    if (sortCol != null && sortCol >= 0 && sortCol < headers.length) {
      result = [...result].sort((a, b) => {
        const va = (a.row[sortCol] ?? "").toString().trim();
        const vb = (b.row[sortCol] ?? "").toString().trim();
        const cmp = va.localeCompare(vb, undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [rows, headers, search, sortCol, sortDir]);

  const hasActiveFilters = search.trim().length > 0;

  const clearFilters = () => {
    setSearch("");
    setSortCol(null);
    setSortDir("asc");
  };

  const handleSort = (colIdx) => {
    if (sortCol === colIdx) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortCol(null);
        setSortDir("asc");
      }
    } else {
      setSortCol(colIdx);
      setSortDir("asc");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        <p className="text-gray-500 dark:text-gray-400">Loading suppliers…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Suppliers Contacts
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Link
            to="/Community"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Community
          </Link>
        </div>
      </div>
    );
  }

  const totalCount = rows.length;
  const showingCount = filteredAndSortedRows.length;

  return (
    <div className="w-full max-w-7xl mx-auto min-h-0 px-4 sm:px-6 py-6 md:py-8 box-border">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
            <FaAddressBook className="text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Suppliers Contacts
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Search and filter community suppliers
            </p>
          </div>
        </div>
        <Link
          to="/Community"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 font-medium transition-colors"
        >
          ← Back to Community
        </Link>
      </div>

      {/* Disclaimer */}
      <div className="mb-6 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Disclaimer:</strong> The supplier contact information on this page is provided for community members as a convenience. BuySell Club does not endorse, verify, or guarantee any supplier listed here. You are responsible for your own due diligence and any transactions you enter into with these contacts. Use this information at your own discretion.
        </p>
      </div>

      {/* Toolbar: search + filters */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-xl border border-blue-200 dark:border-gray-600 p-4 mb-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search suppliers (name, category, country, contact…)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Clear search"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              )}
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <FaTimes className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-blue-800 dark:text-blue-200 mt-3">
          Showing <span className="font-semibold text-blue-900 dark:text-blue-100">{showingCount}</span>
          {showingCount !== totalCount && (
            <> of <span className="font-semibold text-gray-700 dark:text-gray-200">{totalCount}</span></>
          )} supplier{showingCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Mobile: compact list, tap to expand full details */}
      <div className="md:hidden space-y-2 max-h-[70vh] overflow-y-auto">
        {filteredAndSortedRows.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
            {totalCount === 0
              ? "No data in this sheet."
              : "No suppliers match your search. Try different keywords or clear filters."}
          </div>
        ) : (
          filteredAndSortedRows.map(({ row }, rowIdx) => {
            const isExpanded = expandedMobileIdx === rowIdx;
            const previewTitle = (() => {
              const col = visibleCols[0];
              if (!col) return "Supplier";
              if (col.combined) return (col.dataIndices || []).map((idx) => row[idx]).filter(Boolean).join(", ") || "—";
              return (row[col.dataIdx] ?? "").toString().trim() || "—";
            })();
            const previewSub = (() => {
              const col = visibleCols[1];
              if (!col) return "";
              if (col.combined) return (col.dataIndices || []).map((idx) => row[idx]).filter(Boolean).join(", ") || "";
              return (row[col.dataIdx] ?? "").toString().trim() || "";
            })();

            return (
              <div
                key={rowIdx}
                className={`rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden ${
                  rowIdx % 3 === 0
                    ? "border-l-4 border-l-blue-400 dark:border-l-blue-500"
                    : rowIdx % 3 === 1
                      ? "border-l-4 border-l-emerald-400 dark:border-l-emerald-500"
                      : "border-l-4 border-l-amber-400 dark:border-l-amber-500"
                } bg-white dark:bg-gray-800`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedMobileIdx(isExpanded ? null : rowIdx)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-blue-50/50 dark:hover:bg-gray-700/50 active:bg-blue-100 dark:active:bg-gray-700 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{previewTitle}</p>
                    {previewSub && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{previewSub}</p>}
                  </div>
                  <span className="shrink-0 text-blue-600 dark:text-blue-400">
                    {isExpanded ? <FaChevronUp className="w-4 h-4" /> : <FaChevronDown className="w-4 h-4" />}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30">
                    <div className="px-4 py-3 flex flex-col gap-3">
                      {visibleCols.map((col, displayIdx) => {
                        const headingLabel = TABLE_HEADINGS[displayIdx] ?? col.header;
                        if (col.combined) {
                          const parts = (col.dataIndices || [])
                            .map((idx) => row[idx] ?? "")
                            .filter((v) => (v || "").toString().trim());
                          if (parts.length === 0) return null;
                          return (
                            <div key={`contact-${displayIdx}`} className="flex flex-col gap-2 border-b border-gray-200 dark:border-gray-600 border-dashed last:border-b-0 pb-3 last:pb-0">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{headingLabel}</p>
                              {parts.map((cell, i) => {
                                const isLink = typeof cell === "string" && (cell.startsWith("http://") || cell.startsWith("https://"));
                                const isEmail = typeof cell === "string" && cell.includes("@") && cell.includes(".");
                                const isPhone = typeof cell === "string" && /[\d\s+()-]{8,}/.test(cell);
                                const linkClass = "text-base text-blue-600 dark:text-blue-400 hover:underline break-all py-1 min-h-[44px] flex items-center";
                                if (isLink) return <a key={i} href={cell} target="_blank" rel="noopener noreferrer" className={linkClass}>{cell}</a>;
                                if (isEmail) return <a key={i} href={`mailto:${cell}`} className={linkClass}>{cell}</a>;
                                if (isPhone) return <a key={i} href={`tel:${cell.replace(/\s/g, "")}`} className={linkClass}>{cell}</a>;
                                return <span key={i} className="text-base text-gray-900 dark:text-gray-100 break-words">{cell}</span>;
                              })}
                            </div>
                          );
                        }
                        const cell = row[col.dataIdx] ?? "";
                        if ((cell || "").toString().trim() === "") return null;
                        const isLink = typeof cell === "string" && (cell.startsWith("http://") || cell.startsWith("https://"));
                        const isEmail = typeof cell === "string" && cell.includes("@") && cell.includes(".");
                        const isPhone = typeof cell === "string" && /[\d\s+()-]{8,}/.test(cell);
                        const linkClass = "text-base text-blue-600 dark:text-blue-400 hover:underline break-all py-1 min-h-[44px] flex items-center";
                        const valueNode = isLink ? (
                          <a href={cell} target="_blank" rel="noopener noreferrer" className={linkClass}>{cell}</a>
                        ) : isEmail ? (
                          <a href={`mailto:${cell}`} className={linkClass}>{cell}</a>
                        ) : isPhone ? (
                          <a href={`tel:${cell.replace(/\s/g, "")}`} className={linkClass}>{cell}</a>
                        ) : (
                          <span className="text-base text-gray-900 dark:text-gray-100 break-words leading-relaxed">{cell}</span>
                        );
                        return (
                          <div key={col.dataIdx} className="border-b border-gray-200 dark:border-gray-600 border-dashed last:border-b-0 pb-3 last:pb-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{headingLabel}</p>
                            {valueNode}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop: table (md and up) */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-200 dark:border-blue-900/50 shadow-md overflow-hidden w-full max-w-full">
        <div className="overflow-auto max-h-[65vh] w-full max-w-full">
          <table className="w-full md:table-fixed divide-y divide-blue-100 dark:divide-gray-600 border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-800">
                {visibleCols.map((col, i) => (
                  <th
                    key={col.combined ? `h-${i}` : col.dataIdx}
                    className="px-2 py-1.5 text-left text-[11px] font-bold text-white uppercase tracking-tight border-r border-blue-500/50 last:border-r-0"
                  >
                    {TABLE_HEADINGS[i] ?? col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50 dark:divide-gray-600 bg-white dark:bg-gray-800">
              {filteredAndSortedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleCols.length || 1}
                    className="px-4 py-12 text-center text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-gray-800"
                  >
                    {totalCount === 0
                      ? "No data in this sheet."
                      : "No suppliers match your search. Try different keywords or clear filters."}
                  </td>
                </tr>
              ) : (
                filteredAndSortedRows.map(({ row }, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={`transition-colors ${
                      rowIdx % 2 === 0
                        ? "bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        : "bg-slate-50 dark:bg-gray-800/80 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    }`}
                  >
                    {visibleCols.map((col, displayIdx) => {
                      const key = col.combined ? `contact-${displayIdx}` : col.dataIdx;
                      if (col.combined) {
                        const parts = (col.dataIndices || [])
                          .map((idx) => row[idx] ?? "")
                          .filter((v) => (v || "").toString().trim());
                        return (
                          <td
                            key={key}
                            className="px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100 align-top min-w-0 break-words overflow-hidden leading-snug border-r border-blue-50 dark:border-gray-700 last:border-r-0"
                          >
                            <span className="flex flex-col gap-0.5">
                              {parts.map((cell, i) => {
                                const isLink = typeof cell === "string" && (cell.startsWith("http://") || cell.startsWith("https://"));
                                const isEmail = typeof cell === "string" && cell.includes("@") && cell.includes(".");
                                const isPhone = typeof cell === "string" && /[\d\s+()-]{8,}/.test(cell);
                                if (isLink) return <a key={i} href={cell} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all text-inherit">{cell}</a>;
                                if (isEmail) return <a key={i} href={`mailto:${cell}`} className="text-blue-600 dark:text-blue-400 hover:underline break-all text-inherit">{cell}</a>;
                                if (isPhone) return <a key={i} href={`tel:${cell.replace(/\s/g, "")}`} className="text-blue-600 dark:text-blue-400 hover:underline text-inherit">{cell}</a>;
                                return <span key={i} className="break-words">{cell}</span>;
                              })}
                            </span>
                          </td>
                        );
                      }
                      const cell = row[col.dataIdx] ?? "";
                      const isLink = typeof cell === "string" && (cell.startsWith("http://") || cell.startsWith("https://"));
                      const isEmail = typeof cell === "string" && cell.includes("@") && cell.includes(".");
                      const isPhone = typeof cell === "string" && /[\d\s+()-]{8,}/.test(cell);
                      return (
                        <td
                          key={key}
                          className="px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100 align-top min-w-0 break-words overflow-hidden leading-snug border-r border-blue-50 dark:border-gray-700 last:border-r-0"
                        >
                          {isLink ? (
                            <a href={cell} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all text-inherit">{cell}</a>
                          ) : isEmail ? (
                            <a href={`mailto:${cell}`} className="text-blue-600 dark:text-blue-400 hover:underline break-all text-inherit">{cell}</a>
                          ) : isPhone ? (
                            <a href={`tel:${cell.replace(/\s/g, "")}`} className="text-blue-600 dark:text-blue-400 hover:underline text-inherit">{cell}</a>
                          ) : (
                            <span className="break-words">{cell}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CommunitySheet;
