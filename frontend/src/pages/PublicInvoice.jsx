import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FaSpinner, FaFilePdf, FaArrowLeft } from "react-icons/fa";
import API, { Api } from "../api";
import toast from "react-hot-toast";
import { InvoiceItemTrackingLabel, InvoiceItemCbm } from "../components/InvoiceItemDisplay";
import { getInvoiceGhsBreakdown, getInvoiceTotalCbm } from "../utils/invoiceGhsBreakdown";
import { buildPaymentReference, invoicePackageCount } from "../utils/paymentReference";

const PublicInvoice = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const invoiceNumber = searchParams.get("invoice_number");
  const markId = searchParams.get("mark_id");

  useEffect(() => {
    if (!invoiceNumber || !markId) {
      setError("Invoice number and mark ID are required");
      setLoading(false);
      return;
    }

    fetchInvoice();
  }, [invoiceNumber, markId]);

  const fetchInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await Api.invoices.public({
        invoice_number: invoiceNumber,
        mark_id: markId,
      });
      setInvoice(response.data);
    } catch (err) {
      console.error("Error fetching invoice:", err);
      setError(
        err.response?.data?.detail ||
          "Failed to load invoice. Please check the link and try again."
      );
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = "USD") => {
    if (!amount) return currency === "GHS" ? "GH₵0.00" : "$0.00";
    const num = parseFloat(amount);
    const formatted = Number.isFinite(num) ? num.toFixed(2) : "0.00";
    if (currency === "GHS") {
      return `GH₵${formatted}`;
    }
    return `$${formatted}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Invoice Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const ghs = getInvoiceGhsBreakdown(invoice);
  const totalCbm = getInvoiceTotalCbm(invoice.items);
  const paymentReference = buildPaymentReference(invoice, markId);
  const packageCount = invoicePackageCount(invoice);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4"
          >
            <FaArrowLeft className="mr-2" />
            Back to Home
          </button>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Invoice
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Invoice #{invoice.invoice_number}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    invoice.status === "paid"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : invoice.status === "pending"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      : invoice.status === "overdue"
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                  }`}
                >
                  {invoice.status?.toUpperCase() || "DRAFT"}
                </span>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  Bill To
                </h3>
                <p className="text-gray-900 dark:text-white font-medium">
                  {invoice.customer_name || "N/A"}
                </p>
                {invoice.customer_email && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {invoice.customer_email}
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  Invoice Details
                </h3>
                <p className="text-gray-900 dark:text-white">
                  <span className="font-medium">Issue Date:</span>{" "}
                  {formatDate(invoice.issue_date)}
                </p>
                {invoice.due_date && (
                  <p className="text-gray-900 dark:text-white">
                    <span className="font-medium">Due Date:</span>{" "}
                    {formatDate(invoice.due_date)}
                  </p>
                )}
                {invoice.container_number && (
                  <p className="text-gray-900 dark:text-white">
                    <span className="font-medium">Container:</span>{" "}
                    {invoice.container_number}
                  </p>
                )}
                {invoice.shipping_mark && (
                  <div className="text-gray-900 dark:text-white">
                    <p>
                      <span className="font-medium">Shipping Mark:</span>{" "}
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        {invoice.shipping_mark}
                      </span>
                    </p>
                    {(invoice.client_full_name || invoice.client_username || invoice.username) && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        {invoice.client_full_name || invoice.client_username || invoice.username}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Invoice Items ({invoice.items?.length || 0})
          </h2>
          {invoice.items && invoice.items.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Tracking #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        CBM
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {invoice.items.map((item) => {
                      const isStorage =
                        String(item.tracking_number || "").toUpperCase() === "STORAGE";
                      return (
                      <tr
                        key={item.id}
                        className={
                          isStorage
                            ? "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700"
                        }
                      >
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          <InvoiceItemTrackingLabel item={item} />
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          {item.description || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                          <InvoiceItemCbm item={item} className="block text-right" />
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 flex justify-end">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Total CBM: {totalCbm.toFixed(3)}
                </span>
              </div>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No items found
            </p>
          )}
        </div>

        {/* Pay on time — before storage fees start */}
        {invoice.storage_payment_reminder &&
          invoice.status !== "paid" &&
          invoice.status !== "cancelled" && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Pay on time
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {invoice.storage_payment_reminder}
              </p>
            </div>
          )}

        {/* Totals */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="max-w-md ml-auto">
            <div className="space-y-2">
              {invoice.items?.length > 0 && (
                <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 pb-2 border-b border-gray-200 dark:border-gray-600">
                  <span>Total CBM:</span>
                  <span>{totalCbm.toFixed(3)}</span>
                </div>
              )}
              {ghs.discountUsd > 0 && ghs.subtotalUsd > 0 && (
                <>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Freight subtotal (USD):</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {formatCurrency(ghs.subtotalUsd)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                    <span>
                      Executive Member discount
                      {ghs.discountPercent > 0 ? ` (${ghs.discountPercent}%)` : ""}:
                    </span>
                    <span>-{formatCurrency(ghs.discountUsd)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Shipping fee (USD):</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatCurrency(ghs.freightUsd)}
                </span>
              </div>
              {ghs.rate > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  1 USD = {ghs.rate.toFixed(4)} GHS
                </p>
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-2 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Amount in Ghana cedis
                </p>
                <div className="flex justify-between text-gray-800 dark:text-gray-100">
                  <span>Shipping fee (GHS):</span>
                  <span className="font-semibold">
                    {formatCurrency(ghs.freightGhs, "GHS")}
                  </span>
                </div>
                {ghs.storageGhs > 0 ? (
                  <div className="flex justify-between text-amber-700 dark:text-amber-300">
                    <span className="pr-4">
                      Storage fee (GHS)
                      <span className="block text-xs font-normal text-amber-600/90 dark:text-amber-400/90 mt-0.5">
                        You are charged per day
                        {invoice.storage_fee_detail ? (
                          <span className="block mt-0.5">{invoice.storage_fee_detail}</span>
                        ) : null}
                      </span>
                    </span>
                    <span className="font-semibold text-right shrink-0">
                      {formatCurrency(ghs.storageGhs, "GHS")}
                    </span>
                  </div>
                ) : invoice.storage_not_yet_due ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    No storage fee yet — pay before the due date to avoid daily storage
                    charges.
                  </p>
                ) : null}
                {ghs.dutyGhs > 0 ? (
                  <div className="flex justify-between text-gray-800 dark:text-gray-100">
                    <span>Vehicle duties (GHS):</span>
                    <span className="font-semibold">
                      {formatCurrency(ghs.dutyGhs, "GHS")}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between text-lg font-bold text-green-600 dark:text-green-400 border-t border-gray-200 dark:border-gray-600 pt-2">
                  <span>Total (GHS):</span>
                  <span>{formatCurrency(ghs.totalGhs, "GHS")}</span>
                </div>
              </div>

              {invoice.amount_due_ghs != null &&
                parseFloat(invoice.amount_due_ghs) > 0 &&
                Math.abs(parseFloat(invoice.amount_due_ghs) - ghs.totalGhs) > 0.01 && (
                  <div className="flex justify-between text-sm font-semibold text-orange-600 dark:text-orange-400">
                    <span>Balance due (GHS):</span>
                    <span>{formatCurrency(invoice.amount_due_ghs, "GHS")}</span>
                  </div>
                )}
            </div>
          </div>

          {/* Payment Information */}
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded">
            <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Payment Information
            </h3>
            <div className="mb-3 rounded-lg bg-white/80 dark:bg-gray-900/40 border border-yellow-300/60 dark:border-yellow-700/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-300">
                Payment reference
              </p>
              <p className="mt-1 font-mono text-xl font-bold text-yellow-950 dark:text-yellow-50 break-all">
                {paymentReference}
              </p>
              <p className="mt-1 text-xs text-yellow-800 dark:text-yellow-200">
                Use this reference when you pay (mark ID + total packages
                {packageCount ? `: ${packageCount}` : ""}). Example format:{" "}
                <span className="font-mono font-semibold">MARK-12</span>
              </p>
            </div>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Bank:</strong> Calbank
            </p>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-bold">
              Account: 1400006745425
            </p>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Name:</strong> FOFOOFO GROUP PTY LIMITED
            </p>
            <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mt-3 mb-1">
              Mobile Money (MoMo)
            </p>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-bold">
              NAME: FOFOOFO GROUP PTY
            </p>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-bold">
              MOMO MERCHANT ID: 134785
            </p>
          </div>
        </div>

        {/* Footer Note */}
        {invoice.notes && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Notes
            </h3>
            <p className="text-gray-900 dark:text-white">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicInvoice;

