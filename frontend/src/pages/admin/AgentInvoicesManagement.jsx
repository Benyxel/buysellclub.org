import React, { useEffect, useState } from "react";
import API from "../../api";
import { toast } from "../../utils/toast";
import {
  FaEye,
  FaSearch,
  FaFileInvoice,
  FaSpinner,
  FaShip,
  FaCheckCircle,
} from "react-icons/fa";
import { InvoiceItemTrackingLabel, InvoiceItemCbm } from "../../components/InvoiceItemDisplay";

const statusOptions = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

const AgentInvoicesManagement = () => {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState(null);

  // Invoice creation state
  const [containers, setContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [containerDetails, setContainerDetails] = useState(null);
  const [invoiceMarkId, setInvoiceMarkId] = useState("");
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceSending, setInvoiceSending] = useState(false);
  const [showInvoiceSection, setShowInvoiceSection] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // Fetch regular invoices (admin-created invoices for agent trackings)
      const resp = await API.get("/buysellapi/invoices/", {
        params: {
          page: 1,
          page_size: 1000,
        },
      });
      let list = Array.isArray(resp.data?.results)
        ? resp.data.results
        : Array.isArray(resp.data)
        ? resp.data
        : [];

      // Filter by search and status
      if (search) {
        list = list.filter(
          (inv) =>
            inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
            inv.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
            inv.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
            inv.shipping_mark?.toLowerCase().includes(search.toLowerCase())
        );
      }
      if (status) {
        list = list.filter((inv) => inv.status === status);
      }

      setInvoices(list);
    } catch (err) {
      console.error("Failed to load invoices", err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchContainers = async () => {
    try {
      const response = await API.get("/api/admin/containers", {
        params: { limit: 1000 },
      });
      if (response.data && response.data.data) {
        setContainers(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching containers:", error);
    }
  };

  const fetchContainerDetails = async (containerId) => {
    try {
      const response = await API.get(`/api/admin/containers/${containerId}`);
      if (response.data && response.data.data) {
        setContainerDetails(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching container details:", error);
      toast.error("Failed to load container details");
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchContainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleView = async (invoice) => {
    try {
      const resp = await API.get(`/buysellapi/invoices/${invoice.id}/`);
      setInvoiceDetails(resp.data);
      setShowDetailsModal(true);
    } catch (err) {
      toast.error("Failed to load invoice details");
    }
  };

  const handleContainerSelect = (containerId) => {
    const container = containers.find((c) => c.id === containerId);
    setSelectedContainer(container);
    if (containerId) {
      fetchContainerDetails(containerId);
      setShowInvoiceSection(true);
    } else {
      setContainerDetails(null);
      setShowInvoiceSection(false);
      setInvoicePreview(null);
      setInvoiceMarkId("");
    }
  };

  const handlePreviewInvoice = async () => {
    if (!invoiceMarkId) {
      toast.error("Enter a Mark ID");
      return;
    }
    if (!selectedContainer) {
      toast.error("Select a container");
      return;
    }
    setInvoiceLoading(true);
    try {
      const res = await API.get("/buysellapi/invoices/preview/", {
        params: {
          mark_id: invoiceMarkId,
          container_id: selectedContainer.id,
        },
      });
      setInvoicePreview(res.data);
    } catch (err) {
      console.error("Invoice preview error", err);
      toast.error(
        err.response?.data?.detail || "Failed to load invoice preview"
      );
      setInvoicePreview(null);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!invoicePreview || !invoiceMarkId || !selectedContainer) return;
    setInvoiceSending(true);
    try {
      const res = await API.post("/buysellapi/invoices/send/", {
        mark_id: invoiceMarkId,
        container_id: selectedContainer.id,
      });
      toast.success(
        res.data?.sent ? "Invoice email sent successfully" : "Invoice queued"
      );
      setInvoicePreview(null);
      setInvoiceMarkId("");
      fetchInvoices();
    } catch (err) {
      console.error("Invoice send error", err);
      toast.error(
        err.response?.data?.detail || "Failed to send invoice"
      );
    } finally {
      setInvoiceSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
          Agent Invoices
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Create and manage invoices for agent shipments. Works with both normal and agent mark IDs.
        </p>
      </div>

      {/* Invoice Creation Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FaFileInvoice className="text-pink-600" />
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
            Create Invoice
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Container
            </label>
            <select
              value={selectedContainer?.id || ""}
              onChange={(e) => handleContainerSelect(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select a container...</option>
              {containers.map((container) => (
                <option key={container.id} value={container.id}>
                  {container.container_number} ({container.status})
                </option>
              ))}
            </select>
          </div>

          {showInvoiceSection && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shipping Mark ID
              </label>
              <input
                type="text"
                value={invoiceMarkId}
                onChange={(e) =>
                  setInvoiceMarkId(e.target.value.toUpperCase())
                }
                placeholder="e.g., FIM123 or AGENT-MARK-001"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}
        </div>

        {showInvoiceSection && (
          <div className="flex gap-3 mb-4">
            <button
              onClick={handlePreviewInvoice}
              disabled={invoiceLoading || !invoiceMarkId}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {invoiceLoading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <FaEye />
                  Preview Invoice
                </>
              )}
            </button>
            {invoicePreview && (
              <button
                onClick={handleSendInvoice}
                disabled={
                  invoiceSending ||
                  !invoicePreview ||
                  (invoicePreview?.totals?.count || 0) === 0
                }
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {invoiceSending ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    Send Invoice
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {invoicePreview && (
          <div className="mt-4">
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              <span className="font-medium">Owner:</span>{" "}
              {invoicePreview.owner?.full_name} (
              {invoicePreview.owner?.email})
            </div>
            {invoicePreview.items?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Tracking #</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">CBM</th>
                      <th className="px-3 py-2 text-right">Fee ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {invoicePreview.items.map((it) => (
                      <tr key={it.id}>
                        <td className="px-3 py-2 text-gray-900 dark:text-white">
                          <InvoiceItemTrackingLabel item={it} compact />
                        </td>
                        <td className="px-3 py-2 text-gray-900 dark:text-white">{it.status}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                          <InvoiceItemCbm item={it} className="block text-right" />
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                          {Number(it.shipping_fee || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td className="px-3 py-2 text-right" colSpan={2}>
                        Totals
                      </td>
                      <td className="px-3 py-2 text-right">
                        {Number(
                          invoicePreview.totals?.total_cbm || 0
                        ).toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {Number(
                          invoicePreview.totals?.total_fee || 0
                        ).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No items found for this mark in this container.
              </div>
            )}
          </div>
        )}

        {containerDetails && containerDetails.mark_id_stats && (
          <div className="mt-4">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Available Mark IDs in this Container:
            </h5>
            <div className="flex flex-wrap gap-2">
              {containerDetails.mark_id_stats.map((stat, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInvoiceMarkId(stat.shipping_mark);
                    handlePreviewInvoice();
                  }}
                  className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50"
                >
                  {stat.shipping_mark} ({stat.count} items)
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Existing Invoices List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
            Existing Invoices
          </h4>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                fetchInvoices();
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8">
            <FaSpinner className="animate-spin text-4xl text-pink-600 mx-auto" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No invoices found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Invoice Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Mark ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Total Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {invoice.shipping_mark || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {invoice.customer_name || invoice.customer_email || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      ${invoice.total_amount || "0.00"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          invoice.status === "paid"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : invoice.status === "overdue"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                        }`}
                      >
                        {invoice.status || "draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleView(invoice)}
                        className="text-pink-600 hover:text-pink-800 dark:hover:text-pink-400"
                        title="View"
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && invoiceDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              Invoice Details
            </h3>
            <div className="space-y-2">
              <p>
                <strong>Invoice Number:</strong> {invoiceDetails.invoice_number}
              </p>
              <p>
                <strong>Shipping Mark:</strong> {invoiceDetails.shipping_mark || "-"}
              </p>
              <p>
                <strong>Customer Name:</strong>{" "}
                {invoiceDetails.customer_name || "-"}
              </p>
              <p>
                <strong>Customer Email:</strong>{" "}
                {invoiceDetails.customer_email || "-"}
              </p>
              <p>
                <strong>Subtotal:</strong> ${invoiceDetails.subtotal || "0.00"}
              </p>
              <p>
                <strong>Tax:</strong> ${invoiceDetails.tax_amount || "0.00"}
              </p>
              <p>
                <strong>Discount:</strong> $
                {invoiceDetails.discount_amount || "0.00"}
              </p>
              <p>
                <strong>Total:</strong> ${invoiceDetails.total_amount || "0.00"}
              </p>
              <p>
                <strong>Status:</strong> {invoiceDetails.status || "draft"}
              </p>
              <p>
                <strong>Created:</strong>{" "}
                {new Date(invoiceDetails.created_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => setShowDetailsModal(false)}
              className="mt-4 w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentInvoicesManagement;
