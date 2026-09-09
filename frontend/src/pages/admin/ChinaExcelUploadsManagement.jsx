import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaFileExcel,
  FaParking,
  FaSpinner,
  FaTrash,
  FaUpload,
} from "react-icons/fa";
import { Api } from "../../api";
import { toast } from "../../utils/toast";
import { apiErrorMessage } from "../../utils/apiErrorMessage";
import ConfirmModal from "../../components/shared/ConfirmModal";

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

function UploadsTable({
  rows,
  loading,
  emptyText,
  title,
  subtitle,
  openingId,
  deletingId,
  onOpen,
  onDelete,
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-white">
          {title} ({rows.length})
        </h3>
        {subtitle ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        ) : null}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-600 dark:text-gray-300">
          <FaSpinner className="animate-spin mr-2" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          {emptyText}
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
              {rows.map((u) => (
                <tr key={u.id} className="text-gray-800 dark:text-gray-100">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3 font-semibold">{u.container_number}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.original_filename || "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={openingId === u.id}
                        onClick={() => onOpen(u)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {openingId === u.id ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          <FaFileExcel />
                        )}
                        Open in Excel
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === u.id}
                        onClick={() => onDelete(u)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
                      >
                        {deletingId === u.id ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          <FaTrash />
                        )}
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ChinaExcelUploadsManagement() {
  const [tab, setTab] = useState("uploads"); // uploads | parking

  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState([]);
  const [containerFilter, setContainerFilter] = useState("");
  const [q, setQ] = useState("");
  const [openingId, setOpeningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [parkingLoading, setParkingLoading] = useState(true);
  const [parkingUploads, setParkingUploads] = useState([]);
  const [parkingContainerFilter, setParkingContainerFilter] = useState("");
  const [parkingQ, setParkingQ] = useState("");

  const [uploadContainers, setUploadContainers] = useState([]);
  const [uploadContainersLoading, setUploadContainersLoading] = useState(false);
  const [uploadContainer, setUploadContainer] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const loadUploads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Api.chinaExcel.adminUploads({
        source: "scanner",
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

  const loadParking = useCallback(async () => {
    setParkingLoading(true);
    try {
      const res = await Api.chinaExcel.adminUploads({
        source: "parking",
        container_number: parkingContainerFilter || undefined,
        q: parkingQ.trim() || undefined,
      });
      setParkingUploads(res.data?.results || []);
    } catch (e) {
      toast.error(
        apiErrorMessage(e?.response?.data, "Failed to load parking list files")
      );
      setParkingUploads([]);
    } finally {
      setParkingLoading(false);
    }
  }, [parkingContainerFilter, parkingQ]);

  const loadUploadContainers = useCallback(async (nextTab) => {
    setUploadContainersLoading(true);
    try {
      const list =
        nextTab === "parking"
          ? await Api.containers.parkingList()
          : await Api.containers.excelUploadList();
      setUploadContainers(Array.isArray(list) ? list : []);
    } catch {
      setUploadContainers([]);
    } finally {
      setUploadContainersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "uploads") loadUploads();
  }, [tab, loadUploads]);

  useEffect(() => {
    if (tab === "parking") loadParking();
  }, [tab, loadParking]);

  useEffect(() => {
    setUploadContainer("");
    setUploadFile(null);
    loadUploadContainers(tab);
  }, [tab, loadUploadContainers]);

  const containerOptions = useMemo(() => {
    const set = new Set();
    for (const u of uploads) {
      if (u.container_number) set.add(u.container_number);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [uploads]);

  const parkingContainerOptions = useMemo(() => {
    const set = new Set();
    for (const u of parkingUploads) {
      if (u.container_number) set.add(u.container_number);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [parkingUploads]);

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

  const confirmDelete = async () => {
    const upload = deleteTarget;
    if (!upload?.id) return;
    setDeletingId(upload.id);
    try {
      await Api.chinaExcel.adminDelete(upload.id);
      toast.success("Excel file deleted.");
      setDeleteTarget(null);
      if (tab === "parking") loadParking();
      else loadUploads();
    } catch (e) {
      toast.error(apiErrorMessage(e?.response?.data, "Could not delete file"));
    } finally {
      setDeletingId(null);
    }
  };

  const submitUpload = async () => {
    if (!uploadContainer) {
      toast.error("Select a container first.");
      return;
    }
    if (!uploadFile) {
      toast.error("Choose an Excel file (.xlsx).");
      return;
    }
    setUploading(true);
    try {
      await Api.chinaExcel.adminUpload({
        containerNumber: uploadContainer,
        file: uploadFile,
        source: tab === "parking" ? "parking" : "scanner",
      });
      toast.success("Excel uploaded.");
      setUploadFile(null);
      if (tab === "parking") loadParking();
      else loadUploads();
    } catch (e) {
      toast.error(apiErrorMessage(e?.response?.data, "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  const uploadPanel = (
    <div className="flex flex-wrap gap-2 items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <select
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-w-[180px]"
        value={uploadContainer}
        onChange={(e) => setUploadContainer(e.target.value)}
        disabled={uploadContainersLoading || uploading}
      >
        <option value="">
          {uploadContainersLoading ? "Loading containers…" : "Select container"}
        </option>
        {uploadContainers.map((c) => (
          <option
            key={c.id || c.container_number}
            value={c.container_number}
          >
            {c.container_number}
            {c.status ? ` (${String(c.status).replace(/_/g, " ")})` : ""}
          </option>
        ))}
      </select>
      <input
        type="file"
        accept=".xlsx,.xlsm,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="text-sm text-gray-700 dark:text-gray-200 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gray-200 dark:file:bg-gray-600 file:text-sm file:font-semibold"
        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
        disabled={uploading}
      />
      <button
        type="button"
        onClick={submitUpload}
        disabled={uploading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
      >
        {uploading ? <FaSpinner className="animate-spin" /> : <FaUpload />}
        {tab === "parking" ? "Upload parking list" : "Upload Excel"}
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FaFileExcel />
            China Excel
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Upload, open, or delete China Excel and Parking list files. Warehouse
            scanner uploads still appear here too.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (tab === "parking" ? loadParking() : loadUploads())}
          className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline self-start"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-0">
        <button
          type="button"
          onClick={() => setTab("uploads")}
          className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 -mb-px ${
            tab === "uploads"
              ? "border-blue-600 text-blue-700 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          Excel uploads
        </button>
        <button
          type="button"
          onClick={() => setTab("parking")}
          className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 -mb-px inline-flex items-center gap-2 ${
            tab === "parking"
              ? "border-blue-600 text-blue-700 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          <FaParking className="opacity-80" />
          Parking list
        </button>
      </div>

      {tab === "uploads" ? (
        <>
          {uploadPanel}
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

          <UploadsTable
            rows={uploads}
            loading={loading}
            emptyText="No Excel uploads yet."
            title="Uploads"
            openingId={openingId}
            deletingId={deletingId}
            onOpen={openInExcel}
            onDelete={setDeleteTarget}
          />
        </>
      ) : (
        <>
          {uploadPanel}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              value={parkingContainerFilter}
              onChange={(e) => setParkingContainerFilter(e.target.value)}
            >
              <option value="">All containers</option>
              {parkingContainerOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="search"
              placeholder="Search file or container…"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-w-[220px] flex-1"
              value={parkingQ}
              onChange={(e) => setParkingQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadParking();
              }}
            />
            <button
              type="button"
              onClick={loadParking}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              Search
            </button>
          </div>

          <UploadsTable
            rows={parkingUploads}
            loading={parkingLoading}
            emptyText="No parking list Excel files yet."
            title="Parking list files"
            subtitle="Upload here, or from scanner / warehouse Parking list (loading, laden, in transit, arrived at port)."
            openingId={openingId}
            deletingId={deletingId}
            onOpen={openInExcel}
            onDelete={setDeleteTarget}
          />
        </>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Excel file?"
        message={
          deleteTarget
            ? `Delete “${deleteTarget.original_filename || "this file"}” for ${
                deleteTarget.container_number || "this container"
              }? This cannot be undone.`
            : "Delete this file?"
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        disabled={Boolean(deletingId)}
      />
    </div>
  );
}
