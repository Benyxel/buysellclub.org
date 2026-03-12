import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FaSpinner, FaFilePdf, FaArrowLeft } from "react-icons/fa";
import API, { Api } from "../api";
import toast from "react-hot-toast";

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
                    {invoice.items.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 dark:text-white font-medium">
                          {item.tracking_number || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          {item.description || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                          {Number(item.cbm || 0).toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 flex justify-end">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Total CBM:{" "}
                  {Number(
                    invoice.items.reduce((s, i) => s + Number(i.cbm || 0), 0)
                  ).toFixed(3)}
                </span>
              </div>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No items found
            </p>
          )}
        </div>

        {/* Totals */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="max-w-md ml-auto">
            <div className="space-y-2">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal:</span>
                <span className="text-gray-900 dark:text-white">
                  {formatCurrency(invoice.subtotal)}
                </span>
              </div>
              {invoice.tax_amount &&
                parseFloat(invoice.tax_amount) > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Tax:</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatCurrency(invoice.tax_amount)}
                    </span>
                  </div>
                )}
              {invoice.discount_amount &&
                parseFloat(invoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Discount:</span>
                    <span className="text-gray-900 dark:text-white">
                      -{formatCurrency(invoice.discount_amount)}
                    </span>
                  </div>
                )}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                  <span>Total (USD):</span>
                  <span>{formatCurrency(invoice.total_amount)}</span>
                </div>
              </div>
              {invoice.exchange_rate && invoice.total_amount_ghs && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>Exchange Rate:</span>
                    <span>1 USD = {parseFloat(invoice.exchange_rate).toFixed(4)} GHS</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-green-600 dark:text-green-400">
                    <span>Total (GHS):</span>
                    <span>{formatCurrency(invoice.total_amount_ghs, "GHS")}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Information */}
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded">
            <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Payment Information
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Bank:</strong> Calbank
            </p>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Account:</strong> 1400006745425
            </p>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Name:</strong> FOFOOFO GROUP PTY LIMITED
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

