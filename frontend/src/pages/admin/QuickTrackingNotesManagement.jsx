import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { toast } from "../../utils/toast";
import API, { Api } from "../../api";
import { formatCompactCount } from "../../utils/formatCompactCount";

/** Quick Tracking description should show tracking numbers only (not CBM/KG/product). */
function trackingOnlyDescription(raw) {
  return String(raw || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/^(CBM|KG|WEIGHT|PRODUCT|DESCRIPTION|REASON)\s*:/i.test(line)
    )
    .join("\n");
}

function noteActionLabel(note) {
  const action = String(note?.scanner_action || "").trim().toLowerCase();
  if (action === "rejected") return "Rejected";
  if (action === "returned") return "Returned";
  if (action === "received") return "Received";
  const heading = String(note?.heading || "").toLowerCase();
  if (heading.startsWith("china rejected")) return "Rejected";
  if (heading.startsWith("china returned")) return "Returned";
  return "Note";
}

function noteActionBadgeClass(label) {
  if (label === "Rejected") {
    return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
  }
  if (label === "Returned") {
    return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100";
  }
  if (label === "Received") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  }
  return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
}

const ACTION_FILTERS = [
  { value: "all", label: "All" },
  { value: "reject_return", label: "Rejected / Returned" },
  { value: "rejected", label: "Rejected" },
  { value: "returned", label: "Returned" },
  { value: "received", label: "Received" },
  { value: "normal", label: "Manual notes" },
];

const QuickTrackingNotesManagement = () => {
  const [notes, setNotes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [containers, setContainers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const searchInputRef = useRef(null);
  const [form, setForm] = useState({
    heading: "",
    markId: "",
    fullName: "",
    description: "",
    containerNumber: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const fetchNotes = async (
    page = currentPage,
    size = pageSize,
    query = debouncedSearchTerm,
    action = actionFilter
  ) => {
    setIsLoading(true);
    try {
      const response = await Api.quickTracking.adminList({
        page,
        page_size: size,
        q: query?.trim() || undefined,
        scanner_action: action && action !== "all" ? action : undefined,
      });
      const data = response.data;
      const items = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : [];
      setNotes(items);
      setTotalCount(typeof data?.count === "number" ? data.count : items.length);
    } catch (error) {
      console.error("Failed to load quick tracking notes:", error);
      toast.error("Failed to load quick tracking notes.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContainers = async () => {
    try {
      // Quick Tracking may only attach notes to containers still accepting goods.
      const response = await Api.containers.list({ all: true });
      const data = response.data;
      const items = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : [];
      const allowed = new Set(["preparing", "receiving_goods", "loading"]);
      setContainers(
        items.filter((container) =>
          allowed.has(String(container?.status || "").trim().toLowerCase())
        )
      );
    } catch (error) {
      console.error("Failed to load containers:", error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (document.activeElement !== searchInputRef.current) {
      searchInputRef.current?.focus();
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchNotes(currentPage, pageSize, debouncedSearchTerm, actionFilter);
  }, [currentPage, pageSize, debouncedSearchTerm, actionFilter]);

  useEffect(() => {
    fetchContainers();
  }, []);

  // Fetch user by Mark ID and fill Full Name (called when user leaves Mark ID field)
  const fetchFullNameByMarkId = async (markIdValue) => {
    const raw = (markIdValue ?? form.markId ?? "").toString().trim();
    if (!raw) return;
    const markId = raw.split(":")[0].trim();
    if (!markId) return;
    try {
      const resp = await API.get(`/buysellapi/users/by-mark/${encodeURIComponent(markId)}/`);
      const data = resp?.data;
      const fullName = (data?.full_name || data?.username || "").toString().trim();
      if (fullName) {
        setForm((prev) => ({ ...prev, fullName: fullName.toUpperCase() }));
        toast.success("Full name filled from Mark ID.");
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.info("No user found for this Mark ID.");
      } else {
        console.warn("Fetch user by mark ID:", err?.response?.data || err.message);
        toast.error("Could not look up user for this Mark ID.");
      }
    }
  };

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      const aDate = a.updated_at || a.created_at;
      const bDate = b.updated_at || b.created_at;
      return new Date(bDate) - new Date(aDate);
    });
  }, [notes]);

  const filteredNotes = sortedNotes;

  const containerOptions = useMemo(() => {
    const numbers = containers
      .map((container) => container.container_number)
      .filter(Boolean);
    const current = form.containerNumber ? [form.containerNumber] : [];
    return Array.from(new Set([...numbers, ...current]));
  }, [containers, form.containerNumber]);

  const handleChange = (field) => (event) => {
    let value = event.target.value;
    if (field === "markId" || field === "fullName" || field === "heading") value = value.toUpperCase();
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.heading.trim()) {
      toast.error("Heading is required.");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description is required.");
      return;
    }

    const payload = {
      heading: form.heading.trim(),
      mark_id: form.markId.trim(),
      full_name: form.fullName.trim(),
      description: trackingOnlyDescription(form.description),
      container_number: form.containerNumber.trim(),
    };

    try {
      if (editingId) {
        await Api.quickTracking.update(editingId, payload);
        toast.success("Quick tracking note updated.");
        setEditingId(null);
      } else {
        await Api.quickTracking.create(payload);
        toast.success("Quick tracking note added.");
      }
      await fetchNotes(currentPage, pageSize, debouncedSearchTerm, actionFilter);
    } catch (error) {
      console.error("Failed to save quick tracking note:", error);
      const message =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        "Failed to save quick tracking note.";
      toast.error(message);
    }
    setForm({
      heading: "",
      markId: "",
      fullName: "",
      description: "",
      containerNumber: "",
    });
  };

  const handleEdit = (note) => {
    setEditingId(note.id);
    setForm({
      heading: note.heading || "",
      markId: note.mark_id || "",
      fullName: note.full_name || "",
      description: trackingOnlyDescription(note.description),
      containerNumber: note.container_number || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({
      heading: "",
      markId: "",
      fullName: "",
      description: "",
      containerNumber: "",
    });
  };

  const handleDelete = async (noteId) => {
    try {
      await Api.quickTracking.remove(noteId);
      toast.success("Quick tracking note deleted.");
      await fetchNotes(currentPage, pageSize, debouncedSearchTerm, actionFilter);
    } catch (error) {
      console.error("Failed to delete quick tracking note:", error);
      toast.error("Failed to delete quick tracking note.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handlePageChange = (page) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(nextPage);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {editingId ? "Edit Quick Tracking Note" : "Add Quick Tracking Note"}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Use the heading as the user Mark ID or full name, then add tracking
          numbers only in the description. Package CBM, weight, and product stay
          on Excel export.
        </p>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Heading (Mark ID or Full Name) *
            </label>
            <input
              type="text"
              value={form.heading}
              onChange={handleChange("heading")}
              style={{ textTransform: "uppercase" }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter Mark ID or Full Name"
              required
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Container Number (optional)
            </label>
            <select
              value={form.containerNumber}
              onChange={handleChange("containerNumber")}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No container</option>
              {containerOptions.map((containerNumber) => (
                <option key={containerNumber} value={containerNumber}>
                  {containerNumber}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mark ID (Search key)
            </label>
            <input
              type="text"
              value={form.markId}
              onChange={handleChange("markId")}
              onBlur={(e) => fetchFullNameByMarkId(e.target.value)}
              style={{ textTransform: "uppercase" }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="MARK ID"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name (Search key)
            </label>
            <input
              type="text"
              value={form.fullName}
              onChange={handleChange("fullName")}
              style={{ textTransform: "uppercase" }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Tracking numbers) *
            </label>
            <textarea
              value={form.description}
              onChange={handleChange("description")}
              className="w-full min-h-[140px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Paste multiple tracking numbers or notes here..."
              required
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingId ? "Update Note" : "Save Note"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Existing Quick Tracking Notes
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Scanner rejected and returned packages are kept here permanently.
            </p>
          </div>
          <input
            type="text"
            ref={searchInputRef}
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search mark, name, tracking, or reason"
            className="w-full sm:w-80 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {ACTION_FILTERS.map((filter) => {
            const active = actionFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setActionFilter(filter.value);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  active
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        {isLoading ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Loading quick tracking notes...
          </p>
        ) : filteredNotes.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {debouncedSearchTerm.trim() || actionFilter !== "all"
              ? "No quick tracking notes match your filters."
              : "No quick tracking notes yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Action
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Heading
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Mark ID
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Full Name
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Tracking
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Reason
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Container
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Last Updated
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Manage
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredNotes.map((note) => {
                  const actionLabel = noteActionLabel(note);
                  return (
                  <tr key={note.id} className="bg-white dark:bg-gray-800">
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${noteActionBadgeClass(
                          actionLabel
                        )}`}
                      >
                        {actionLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                      {note.heading || "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {note.mark_id || "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {note.full_name || "-"}
                    </td>
                    <td
                      className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[220px] truncate"
                      title={trackingOnlyDescription(note.description) || ""}
                    >
                      {trackingOnlyDescription(note.description) || "-"}
                    </td>
                    <td
                      className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[240px] truncate"
                      title={note.reason || ""}
                    >
                      {note.reason || "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {note.container_number || "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                      {new Date(note.updated_at || note.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleEdit(note)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                        >
                          <FaEdit />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(note.id)}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          <FaTrash />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-400">
              <div>
                Page {currentPage} of{" "}
                <span title={String(totalPages)}>
                  {formatCompactCount(totalPages)}
                </span>{" "}
                • Showing {filteredNotes.length} of{" "}
                <span title={String(totalCount)}>
                  {formatCompactCount(totalCount)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(parseInt(event.target.value, 10));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                >
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className={`px-3 py-1 rounded border ${
                    currentPage <= 1
                      ? "text-gray-400 border-gray-300 cursor-not-allowed"
                      : "text-gray-700 border-gray-400 hover:bg-gray-100"
                  } dark:text-gray-200 dark:border-gray-600`}
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className={`px-3 py-1 rounded border ${
                    currentPage >= totalPages
                      ? "text-gray-400 border-gray-300 cursor-not-allowed"
                      : "text-gray-700 border-gray-400 hover:bg-gray-100"
                  } dark:text-gray-200 dark:border-gray-600`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickTrackingNotesManagement;
