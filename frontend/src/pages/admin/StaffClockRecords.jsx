import React, { useState, useEffect } from "react";
import { FaClock, FaSyncAlt, FaCalendarDay, FaQrcode, FaDownload, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { Api } from "../../api";
import { toast } from "../../utils/toast";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const StaffClockRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingQr, setSavingQr] = useState(false);
  const [dateFilter, setDateFilter] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const clockUrl =
    typeof window !== "undefined" ? `${window.location.origin}/clock` : "";
  const qrSrc = clockUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(clockUrl)}`
    : "";

  const handleSaveQr = async () => {
    if (!qrSrc) return;
    setSavingQr(true);
    try {
      const res = await fetch(qrSrc, { mode: "cors" });
      if (!res.ok) throw new Error("Failed to load QR image");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "staff-clock-qr.png";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("QR code saved as staff-clock-qr.png");
    } catch (err) {
      console.error(err);
      toast.error("Direct save failed. Opening QR in a new tab — save the image from there.");
      window.open(qrSrc, "_blank", "noopener,noreferrer");
    } finally {
      setSavingQr(false);
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await Api.staffClock.adminRecords({
        date: dateFilter,
        page,
        page_size: pageSize,
      });
      const data = res?.data || {};
      setRecords(data.results || []);
      setTotalCount(data.count ?? 0);
      setTotalPages(data.total_pages ?? 0);
    } catch (err) {
      console.error("Failed to load staff clock records:", err);
      toast.error("Failed to load records.");
      setRecords([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [dateFilter]);

  useEffect(() => {
    fetchRecords();
  }, [dateFilter, page, pageSize]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <FaClock className="text-primary" />
        Staff Time Clock Records
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Staff are admins. Day, date and timestamp for every clock-in and clock-out.
      </p>

      {/* QR code for staff to scan */}
      {qrSrc && (
        <div className="mb-8 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 inline-block">
          <div className="flex items-center gap-2 mb-3 text-gray-800 dark:text-white font-medium">
            <FaQrcode className="text-primary" />
            Scan to clock in / clock out
          </div>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <img
              src={qrSrc}
              alt="QR code for staff clock"
              className="w-[220px] h-[220px] rounded-lg border border-gray-200 dark:border-gray-600 bg-white"
            />
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Display or print this page so staff can scan the QR code with their phone to open the clock page.
              </p>
              <button
                type="button"
                onClick={handleSaveQr}
                disabled={savingQr}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 text-sm font-medium w-fit"
              >
                <FaDownload className="w-4 h-4" />
                {savingQr ? "Saving…" : "Save QR code"}
              </button>
              <a
                href={clockUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline break-all"
              >
                {clockUrl}
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <FaCalendarDay />
          Date
        </label>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
        />
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Per page
        </label>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={fetchRecords}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
        >
          <FaSyncAlt className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
        <a
          href="/clock"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
        >
          Open clock page (for QR link)
        </a>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          Loading records...
        </div>
      ) : records.length === 0 ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          No records for this date.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Staff Name
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Day
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Time
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {r.staff_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {r.day}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {r.date}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {r.time}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        r.action === "in"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                      }`}
                    >
                      {r.action === "in" ? "Clock In" : "Clock Out"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && records.length > 0 && totalPages > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              <FaChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Next
              <FaChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffClockRecords;
