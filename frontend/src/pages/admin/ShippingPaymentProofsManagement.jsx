import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaCheck,
  FaExternalLinkAlt,
  FaFileInvoiceDollar,
  FaSpinner,
  FaTimes,
} from "react-icons/fa";
import { Api } from "../../api";
import { toast } from "../../utils/toast";
import { apiErrorMessage } from "../../utils/apiErrorMessage";
import { resolveMediaUrl } from "../../utils/resolveMediaUrl";

const STATUS_STYLES = {
  pending_review:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  approved:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

function formatMoney(amount, currency = "USD") {
  const n = parseFloat(amount);
  const val = Number.isFinite(n) ? n.toFixed(2) : "0.00";
  return currency === "GHS" ? `GH₵${val}` : `$${val}`;
}

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

function statusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "pending_review") return "Pending review";
  if (s === "approved") return "Approved";
  if (s === "rejected") return "Rejected";
  return s || "—";
}

export default function ShippingPaymentProofsManagement() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const [q, setQ] = useState("");
  const [actionId, setActionId] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Api.invoices.adminPaymentProofs({
        status: statusFilter || undefined,
        q: q.trim() || undefined,
      });
      setRows(res.data?.results || []);
      setPendingCount(res.data?.pending_count || 0);
    } catch (e) {
      toast.error(
        apiErrorMessage(e?.response?.data, "Failed to load payment proof requests")
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, q]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredHint = useMemo(() => {
    if (statusFilter === "pending_review") {
      return `${pendingCount} pending request${pendingCount === 1 ? "" : "s"}`;
    }
    return `${rows.length} result${rows.length === 1 ? "" : "s"}`;
  }, [statusFilter, pendingCount, rows.length]);

  const approve = async (row) => {
    if (
      !window.confirm(
        `Approve payment proof for ${row.invoice_number}?\n\nThis will mark the shipping invoice as PAID for both admin and the customer.`
      )
    ) {
      return;
    }
    setActionId(row.id);
    try {
      await Api.invoices.approvePaymentProof(row.id, {});
      toast.success(`Invoice ${row.invoice_number} marked as paid`);
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e?.response?.data, "Failed to approve proof"));
    } finally {
      setActionId(null);
    }
  };

  const reject = async (row) => {
    const note = window.prompt(
      `Reject payment proof for ${row.invoice_number}?\nOptional note for admin:`,
      ""
    );
    if (note === null) return;
    setActionId(row.id);
    try {
      await Api.invoices.rejectPaymentProof(row.id, { admin_notes: note || "" });
      toast.success("Payment proof rejected");
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e?.response?.data, "Failed to reject proof"));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FaFileInvoiceDollar />
            Shipping payment proofs
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Review customer payment proofs for shipping fee invoices. Approving
            marks the invoice paid on admin and customer sides.
          </p>
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mt-1">
            {filteredHint}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline self-start"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="pending_review">Pending review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
        <input
          type="search"
          placeholder="Search invoice, mark, name, reference…"
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-w-[220px] flex-1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") load();
          }}
        />
        <button
          type="button"
          onClick={load}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          Search
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-600 dark:text-gray-300">
            <FaSpinner className="animate-spin mr-2" />
            Loading requests…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-gray-500 dark:text-gray-400">
            No payment proof requests found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                  <th className="px-4 py-3 text-left font-semibold">Invoice</th>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-right font-semibold">Shipping fee</th>
                  <th className="px-4 py-3 text-left font-semibold">Payment</th>
                  <th className="px-4 py-3 text-left font-semibold">Proof</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((row) => {
                  const badge =
                    STATUS_STYLES[row.status] ||
                    "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
                  const busy = actionId === row.id;
                  return (
                    <tr key={row.id} className="text-gray-800 dark:text-gray-100">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono font-semibold">
                          {row.invoice_number}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {row.shipping_mark}
                          {row.container_number
                            ? ` · ${row.container_number}`
                            : ""}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Invoice: {row.invoice_status}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">
                          {row.customer_name || row.user_full_name || "—"}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          @{row.user_username || "—"}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {row.customer_email || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                          {formatMoney(row.amount_usd)}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {formatMoney(row.amount_ghs, "GHS")}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                          Due was {formatMoney(row.invoice_amount_due_usd)} /{" "}
                          {formatMoney(row.invoice_amount_due_ghs, "GHS")}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{row.payment_method || "—"}</div>
                        <div className="font-mono text-xs font-semibold">
                          {row.payment_reference || "—"}
                        </div>
                        {(row.sender_name || row.sender_number) && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {row.sender_name}
                            {row.sender_number ? ` · ${row.sender_number}` : ""}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.proof_url ? (
                          <button
                            type="button"
                            onClick={() => setPreview(row)}
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                          >
                            View
                            <FaExternalLinkAlt className="text-xs" />
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${badge}`}
                        >
                          {statusLabel(row.status)}
                        </span>
                        {row.admin_notes ? (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[180px]">
                            {row.admin_notes}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {row.status === "pending_review" ? (
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => approve(row)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
                            >
                              {busy ? (
                                <FaSpinner className="animate-spin" />
                              ) : (
                                <FaCheck />
                              )}
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => reject(row)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                            >
                              <FaTimes />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {row.reviewed_by_username
                              ? `by @${row.reviewed_by_username}`
                              : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Payment proof · {preview.invoice_number}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {formatMoney(preview.amount_usd)} /{" "}
                  {formatMoney(preview.amount_ghs, "GHS")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="text-gray-500 hover:text-gray-800 dark:hover:text-white"
              >
                <FaTimes />
              </button>
            </div>
            {String(resolveMediaUrl(preview.proof_url) || "").toLowerCase().includes(".pdf") ? (
              <iframe
                title="Payment proof PDF"
                src={resolveMediaUrl(preview.proof_url)}
                className="w-full h-[70vh] rounded-lg border border-gray-200 dark:border-gray-700"
              />
            ) : (
              <img
                src={resolveMediaUrl(preview.proof_url)}
                alt="Payment proof"
                className="w-full max-h-[70vh] object-contain rounded-lg bg-gray-50 dark:bg-gray-900"
              />
            )}
            <div className="mt-3 flex justify-end">
              <a
                href={resolveMediaUrl(preview.proof_url)}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                Open original
                <FaExternalLinkAlt className="text-xs" />
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
