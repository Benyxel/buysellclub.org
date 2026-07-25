import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaFileExcel, FaSpinner } from "react-icons/fa";
import { Api } from "../../api";
import { toast } from "../../utils/toast";
import { apiErrorMessage } from "../../utils/apiErrorMessage";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function ChinaExcelUploadsManagement() {
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState([]);
  const [containerFilter, setContainerFilter] = useState("");
  const [q, setQ] = useState("");
  const [openingId, setOpeningId] = useState(null);

  const loadUploads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Api.chinaExcel.adminUploads({
        container_number: containerFilter || undefined,
        q: q.trim() || undefined,
      });
      setUploads(res.data?.results || []);
    } catch (e) {
      toast.error(apiErrorMessage(e?.response?.data, "Failed to load uploads"));
      setUploads([]);
    } finally {
      setLoading(false);
    }
  }, [containerFilter, q]);

  useEffect(() => {
    loadUploads();
  }, [loadUploads]);

  const containerOptions = useMemo(() => {
    const set = new Set();
    for (const u of uploads) {
      if (u.container_number) set.add(u.container_number);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [uploads]);

  const openInExcel = async (upload) => {
    const id = upload?.id;
    if (!id) return;
    setOpeningId(id);
    try {
      await Api.chinaExcel.openUpload(
        id,
        upload.original_filename || `container_${upload.container_number || id}.xlsx`
      );
      toast.success("Excel file downloaded — open it with Excel on your computer.");
    } catch (e) {
      toast.error(apiErrorMessage(e?.response?.data, "Could not open Excel file"));
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FaFileExcel />
            China Excel uploads
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Warehouse Excel files uploaded from the scanner, assigned to a
            container. Open a file to view it in Excel on your computer.
          </p>
        </div>
        <button
          type="button"
          onClick={loadUploads}
          className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline self-start"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          value={containerFilter}
          onChange={(e) => setContainerFilter(e.target.value)}
        >
          <option value="">All containers</option>
          {containerOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Search file or container…"
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-w-[220px] flex-1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") loadUploads();
          }}
        />
        <button
          type="button"
          onClick={loadUploads}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          Search
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-white">
            Uploads ({uploads.length})
          </h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-600 dark:text-gray-300">
            <FaSpinner className="animate-spin mr-2" />
            Loading uploads…
          </div>
        ) : uploads.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            No Excel uploads yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Uploaded</th>
                  <th className="px-4 py-3 text-left font-semibold">Container</th>
                  <th className="px-4 py-3 text-left font-semibold">File</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {uploads.map((u) => (
                  <tr key={u.id} className="text-gray-800 dark:text-gray-100">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3 font-semibold">{u.container_number}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.original_filename || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={openingId === u.id}
                        onClick={() => openInExcel(u)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {openingId === u.id ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          <FaFileExcel />
                        )}
                        Open in Excel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
