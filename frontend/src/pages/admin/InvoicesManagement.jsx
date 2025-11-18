import React, { useEffect, useMemo, useState } from "react";
import API from "../../api";
import { toast } from "react-toastify";

const statusOptions = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

const orderOptions = [
  { value: "-created_at", label: "Newest" },
  { value: "created_at", label: "Oldest" },
  { value: "-due_date", label: "Due date (desc)" },
  { value: "due_date", label: "Due date (asc)" },
  { value: "-total_amount", label: "Amount (desc)" },
  { value: "total_amount", label: "Amount (asc)" },
];

export default function InvoicesManagement() {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [resending, setResending] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [currentRate, setCurrentRate] = useState(null);
  const [newRate, setNewRate] = useState("");
  const [rateNotes, setRateNotes] = useState("");
  const [updatingRate, setUpdatingRate] = useState(false);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const resp = await API.get("/buysellapi/invoices/", {
        params: {
          page,
          page_size: pageSize,
          search: search || undefined,
          status: status || undefined,
          ordering,
        },
      });
      const data = resp.data;
      const list = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : [];
      setInvoices(list);
      if (data?.count != null) setTotal(data.count);
      else setTotal(list.length);
    } catch (err) {
      console.error("Failed to load invoices", err);
      toast.error(err.response?.data?.detail || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, status, ordering]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  const handleViewDetails = async (invoiceId) => {
    try {
      const resp = await API.get(`/buysellapi/invoices/${invoiceId}/`);
      setInvoiceDetails(resp.data);
      setShowDetailsModal(true);
    } catch (err) {
      console.error("Failed to load invoice details", err);
      toast.error(
        err.response?.data?.detail || "Failed to load invoice details"
      );
    }
  };

  const handleResendInvoice = async () => {
    if (!invoiceDetails) return;
    setResending(true);
    try {
      await API.post("/buysellapi/invoices/send/", {
        mark_id: invoiceDetails.shipping_mark,
        container_id: invoiceDetails.container,
      });
      toast.success("Invoice email resent successfully");
    } catch (err) {
      console.error("Failed to resend invoice", err);
      toast.error(err.response?.data?.detail || "Failed to resend invoice");
    } finally {
      setResending(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!invoiceDetails) return;
    try {
      const resp = await API.patch(
        `/buysellapi/invoices/${invoiceDetails.id}/`,
        {
          status: newStatus,
        }
      );
      setInvoiceDetails(resp.data);
      toast.success("Invoice status updated");
      fetchInvoices(); // Refresh list
    } catch (err) {
      console.error("Failed to update status", err);
      toast.error(err.response?.data?.detail || "Failed to update status");
    }
  };

  const fetchCurrentRate = async () => {
    try {
      const response = await API.get("/buysellapi/currency-rate/");
      setCurrentRate(response.data);
    } catch (err) {
      console.error("Failed to fetch current rate", err);
    }
  };

  const handleUpdateRate = async () => {
    if (!newRate || parseFloat(newRate) <= 0) {
      toast.error("Please enter a valid exchange rate");
      return;
    }
    setUpdatingRate(true);
    try {
      const response = await API.post("/buysellapi/currency-rate/", {
        usd_to_ghs: parseFloat(newRate),
        notes: rateNotes,
      });
      setCurrentRate(response.data);
      toast.success("Exchange rate updated successfully");
      setShowRateModal(false);
      setNewRate("");
      setRateNotes("");
    } catch (err) {
      console.error("Failed to update rate", err);
      toast.error(
        err.response?.data?.detail || "Failed to update exchange rate"
      );
    } finally {
      setUpdatingRate(false);
    }
  };

  useEffect(() => {
    fetchCurrentRate();
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
          Invoices
        </h3>
        <div className="flex items-center gap-3">
          {currentRate && (
            <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-xs text-green-600 dark:text-green-400">
                Exchange Rate
              </div>
              <div className="text-sm font-bold text-green-700 dark:text-green-300">
                1 USD = {parseFloat(currentRate.usd_to_ghs).toFixed(4)} GHS
              </div>
            </div>
          )}
          <button
            onClick={() => setShowRateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Update Rate
          </button>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={onSearch} className="flex flex-wrap items-end gap-3 mb-4">
        <div className="min-w-[220px]">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Invoice #, Mark ID, Container #"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Order
          </label>
          <select
            value={ordering}
            onChange={(e) => {
              setOrdering(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {orderOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md">
        <table className="min-w-full">
          <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Invoice #
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Container
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Mark ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Subtotal
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Tax
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Discount
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Total (USD/GHS)
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Issue Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Updated
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  Loading...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No invoices found
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => handleViewDetails(inv.id)}
                  className="cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-200 border-l-4 border-transparent hover:border-indigo-500"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
                      {inv.invoice_number}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white font-medium">
                    {inv.container_number || inv.container}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      {inv.shipping_mark}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                        inv.status === "paid"
                          ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-sm"
                          : inv.status === "overdue"
                          ? "bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-sm"
                          : inv.status === "pending"
                          ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-sm"
                          : inv.status === "cancelled"
                          ? "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-sm"
                          : "bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-sm"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 dark:text-blue-400 font-medium">
                    ${Number(inv.subtotal || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600 dark:text-orange-400 font-medium">
                    ${Number(inv.tax_amount || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400 font-medium">
                    ${Number(inv.discount_amount || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <div className="font-bold text-indigo-700 dark:text-indigo-400">
                      ${Number(inv.total_amount || 0).toFixed(2)}
                    </div>
                    {inv.total_amount_ghs && (
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                        ₵{Number(inv.total_amount_ghs || 0).toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">
                    {inv.issue_date || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">
                    {inv.due_date || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">
                    {inv.updated_at
                      ? new Date(inv.updated_at).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
          >
            Prev
          </button>
          <button
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={loading || page >= totalPages}
          >
            Next
          </button>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="ml-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {[10, 20, 50].map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoice Details Modal */}
      {showDetailsModal && invoiceDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Invoice Details: {invoiceDetails.invoice_number}
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setInvoiceDetails(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Invoice Header Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Container
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {invoiceDetails.container_number}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Shipping Mark
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {invoiceDetails.shipping_mark}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Customer
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {invoiceDetails.customer_name || "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Customer Email
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {invoiceDetails.customer_email || "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Issue Date
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {invoiceDetails.issue_date || "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Due Date
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {invoiceDetails.due_date || "-"}
                </div>
              </div>
            </div>

            {/* Status Management */}
            <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-semibold text-gray-800 dark:text-white mb-3">
                Status Management
              </h4>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Current Status:
                </div>
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    invoiceDetails.status === "paid"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : invoiceDetails.status === "overdue"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      : invoiceDetails.status === "pending"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                      : invoiceDetails.status === "cancelled"
                      ? "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  }`}
                >
                  {invoiceDetails.status}
                </span>
                <div className="flex-1"></div>
                <select
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  value=""
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Change status...</option>
                  {statusOptions
                    .filter(
                      (opt) => opt.value && opt.value !== invoiceDetails.status
                    )
                    .map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleResendInvoice}
                  disabled={resending}
                  className="px-4 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Resend Invoice"}
                </button>
              </div>
            </div>

            {/* Invoice Items */}
            {invoiceDetails.items && invoiceDetails.items.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-3">
                  Invoice Items ({invoiceDetails.items.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left">Tracking #</th>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-right">CBM</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {invoiceDetails.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2">{item.tracking_number}</td>
                          <td className="px-3 py-2">{item.description}</td>
                          <td className="px-3 py-2 text-right">
                            {Number(item.cbm || 0).toFixed(3)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            ${Number(item.rate_per_cbm || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            ${Number(item.total_amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Subtotal:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${Number(invoiceDetails.subtotal || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${Number(invoiceDetails.tax_amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Discount:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    -${Number(invoiceDetails.discount_amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between">
                  <span className="font-semibold text-gray-800 dark:text-white">
                    Total (USD):
                  </span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">
                    ${Number(invoiceDetails.total_amount || 0).toFixed(2)}
                  </span>
                </div>
                {invoiceDetails.exchange_rate &&
                  invoiceDetails.total_amount_ghs && (
                    <>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                        <span>Exchange Rate:</span>
                        <span>
                          1 USD ={" "}
                          {Number(invoiceDetails.exchange_rate || 0).toFixed(4)}{" "}
                          GHS
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                        <span className="font-semibold text-green-700 dark:text-green-400">
                          Total (GHS):
                        </span>
                        <span className="font-bold text-lg text-green-700 dark:text-green-400">
                          ₵
                          {Number(invoiceDetails.total_amount_ghs || 0).toFixed(
                            2
                          )}
                        </span>
                      </div>
                    </>
                  )}
              </div>
            </div>

            {/* Notes */}
            {invoiceDetails.notes && (
              <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                  Notes
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {invoiceDetails.notes}
                </p>
              </div>
            )}

            {/* Payment Info */}
            {(invoiceDetails.payment_method ||
              invoiceDetails.payment_reference ||
              invoiceDetails.paid_date) && (
              <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-3">
                  Payment Information
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {invoiceDetails.payment_method && (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Payment Method
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {invoiceDetails.payment_method}
                      </div>
                    </div>
                  )}
                  {invoiceDetails.payment_reference && (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Reference
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {invoiceDetails.payment_reference}
                      </div>
                    </div>
                  )}
                  {invoiceDetails.paid_date && (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Paid Date
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {invoiceDetails.paid_date}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setInvoiceDetails(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exchange Rate Update Modal */}
      {showRateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                Update Exchange Rate
              </h3>

              {currentRate && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    Current Rate
                  </div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    1 USD = {parseFloat(currentRate.usd_to_ghs).toFixed(4)} GHS
                  </div>
                  {currentRate.updated_at && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Last updated:{" "}
                      {new Date(currentRate.updated_at).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Rate (1 USD = ? GHS)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    placeholder="Enter new rate (e.g., 12.5000)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={rateNotes}
                    onChange={(e) => setRateNotes(e.target.value)}
                    placeholder="Reason for update..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUpdateRate}
                  disabled={updatingRate || !newRate}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {updatingRate ? "Updating..." : "Update Rate"}
                </button>
                <button
                  onClick={() => {
                    setShowRateModal(false);
                    setNewRate("");
                    setRateNotes("");
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
