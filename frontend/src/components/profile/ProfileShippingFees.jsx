import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaFileInvoiceDollar, FaSpinner, FaExternalLinkAlt, FaBox } from "react-icons/fa";
import { Api } from "../../api";
import { toast } from "../../utils/toast";
import { apiErrorMessage } from "../../utils/apiErrorMessage";

const STATUS_STYLES = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  partial: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

function formatStatusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "partial") return "Partially paid";
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}

function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

function formatMoney(amount, currency = "USD") {
  const n = parseFloat(amount);
  const val = Number.isFinite(n) ? n.toFixed(2) : "0.00";
  return currency === "GHS" ? `GH₵${val}` : `$${val}`;
}

export default function ProfileShippingFees({ shippingMarkId }) {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Api.invoices.meList();
      setInvoices(res.data?.results || []);
    } catch (e) {
      toast.error(apiErrorMessage(e?.response?.data, "Failed to load shipping fee invoices"));
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groupedByContainer = useMemo(() => {
    const map = new Map();
    for (const inv of invoices) {
      const key =
        inv.container_number ||
        (inv.container ? `Container #${inv.container}` : "No container");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(inv);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [invoices]);

  const flatRows = useMemo(() => {
    const out = [];
    for (const [containerLabel, list] of groupedByContainer) {
      for (const inv of list) out.push({ containerLabel, inv });
    }
    return out;
  }, [groupedByContainer]);

  const totalPages = Math.max(1, Math.ceil((flatRows.length || 0) / (pageSize || 1)));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return flatRows.slice(start, start + pageSize);
  }, [flatRows, page, pageSize]);

  const markForLink = (inv) => {
    const raw = inv.shipping_mark || shippingMarkId || "";
    const idx = raw.indexOf(":");
    return idx === -1 ? raw : raw.slice(0, idx).trim();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-600 dark:text-gray-300">
        <FaSpinner className="animate-spin mr-2" />
        Loading shipping fee invoices…
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <FaFileInvoiceDollar className="mx-auto text-4xl text-gray-400 mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No shipping fee invoices yet
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          When admin creates a shipping fee invoice for your mark, it will appear here with
          container, status, and due date.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FaFileInvoiceDollar />
              Shipping fees
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Invoices for containers where your goods are shipped. Pay before the due date shown.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="text-sm font-semibold text-primary hover:underline self-start sm:self-auto"
          >
            Refresh
          </button>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Container</th>
                <th className="px-4 py-3 text-left font-semibold">Invoice</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Due date</th>
                <th className="px-4 py-3 text-right font-semibold">Amount (USD)</th>
                <th className="px-4 py-3 text-right font-semibold">Amount (GHS)</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {pagedRows.map(({ containerLabel, inv }) => {
                const statusKey = String(inv.status || "").toLowerCase();
                const badge =
                  STATUS_STYLES[statusKey] ||
                  "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
                const due = inv.due_date;
                const isOverdue =
                  due &&
                  statusKey !== "paid" &&
                  statusKey !== "cancelled" &&
                  new Date(due) < new Date(new Date().toDateString());

                return (
                  <tr key={inv.id} className="text-gray-800 dark:text-gray-100">
                    <td className="px-4 py-3 font-semibold flex items-center gap-2">
                      <FaBox className="text-gray-400" />
                      {containerLabel}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${badge}`}
                      >
                        {formatStatusLabel(inv.status)}
                      </span>
                      {isOverdue && statusKey !== "overdue" ? (
                        <span className="ml-1 text-xs text-red-600 dark:text-red-400">
                          (past due)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={
                          isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : ""
                        }
                      >
                        {formatDate(inv.due_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {formatMoney(inv.amount_due_usd ?? inv.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {formatMoney(inv.amount_due_ghs ?? inv.total_amount_ghs, "GHS")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/invoice?invoice_number=${encodeURIComponent(
                          inv.invoice_number || ""
                        )}&mark_id=${encodeURIComponent(markForLink(inv))}`}
                        className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                      >
                        View
                        <FaExternalLinkAlt className="text-xs" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden space-y-3">
          {pagedRows.map(({ containerLabel, inv }) => {
            const statusKey = String(inv.status || "").toLowerCase();
            const badge =
              STATUS_STYLES[statusKey] ||
              "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
            const due = inv.due_date;
            const isOverdue =
              due &&
              statusKey !== "paid" &&
              statusKey !== "cancelled" &&
              new Date(due) < new Date(new Date().toDateString());

            return (
              <div
                key={inv.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Container
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white truncate">
                      {containerLabel}
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Invoice
                    </div>
                    <div className="font-mono font-semibold text-gray-900 dark:text-white">
                      {inv.invoice_number}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${badge}`}
                    >
                      {formatStatusLabel(inv.status)}
                    </span>
                    {isOverdue && statusKey !== "overdue" ? (
                      <div className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1">
                        past due
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Due date
                    </div>
                    <div
                      className={
                        isOverdue
                          ? "text-red-600 dark:text-red-400 font-semibold"
                          : "text-gray-900 dark:text-white font-semibold"
                      }
                    >
                      {formatDate(inv.due_date)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Amount (USD)
                    </div>
                    <div className="text-gray-900 dark:text-white font-semibold">
                      {formatMoney(inv.amount_due_usd ?? inv.total_amount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Amount (GHS)
                    </div>
                    <div className="text-gray-900 dark:text-white font-semibold">
                      {formatMoney(inv.amount_due_ghs ?? inv.total_amount_ghs, "GHS")}
                    </div>
                  </div>
                  <div className="text-right">
                    <Link
                      to={`/invoice?invoice_number=${encodeURIComponent(
                        inv.invoice_number || ""
                      )}&mark_id=${encodeURIComponent(markForLink(inv))}`}
                      className="inline-flex items-center justify-center gap-1 text-primary font-semibold hover:underline"
                    >
                      View
                      <FaExternalLinkAlt className="text-xs" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 text-sm text-gray-700 dark:text-gray-200">
          <div>
            Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> (total{" "}
            <strong>{flatRows.length}</strong>)
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Per page:
            </label>
            <select
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
