import React, { useEffect, useState } from "react";
import API from "../../api";
import { toast } from "react-toastify";
import { FaEye, FaSearch } from "react-icons/fa";

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

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // Fetch all invoices - admins can see all
      const resp = await API.get("/buysellapi/invoices/", {
        params: {
          page: 1,
          page_size: 1000, // Get all for filtering
        },
      });
      let list = Array.isArray(resp.data?.results) 
        ? resp.data.results 
        : Array.isArray(resp.data) 
        ? resp.data 
        : [];
      
      // Filter for agent-created invoices
      list = list.filter(inv => inv.created_by_agent);
      
      // Filter by search and status
      if (search) {
        list = list.filter(
          (inv) =>
            inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
            inv.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
            inv.customer_email?.toLowerCase().includes(search.toLowerCase())
        );
      }
      if (status) {
        list = list.filter((inv) => inv.status === status);
      }
      
      setInvoices(list);
    } catch (err) {
      console.error("Failed to load agent invoices", err);
      toast.error("Failed to load agent invoices");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleView = async (invoice) => {
    try {
      const resp = await API.get(`/buysellapi/agent/invoices/${invoice.id}/`);
      setInvoiceDetails(resp.data);
      setShowDetailsModal(true);
    } catch (err) {
      toast.error("Failed to load invoice details");
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
          Agent Invoices
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage invoices created by agents
        </p>
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
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
        <div className="text-center py-8">Loading...</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No agent invoices found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Invoice Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {invoice.invoice_number}
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
                          ? "bg-green-100 text-green-800"
                          : invoice.status === "overdue"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
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
                      className="text-blue-600 hover:text-blue-800"
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

      {/* Details Modal */}
      {showDetailsModal && invoiceDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              Invoice Details
            </h3>
            <div className="space-y-2">
              <p><strong>Invoice Number:</strong> {invoiceDetails.invoice_number}</p>
              <p><strong>Customer Name:</strong> {invoiceDetails.customer_name || "-"}</p>
              <p><strong>Customer Email:</strong> {invoiceDetails.customer_email || "-"}</p>
              <p><strong>Subtotal:</strong> ${invoiceDetails.subtotal || "0.00"}</p>
              <p><strong>Tax:</strong> ${invoiceDetails.tax_amount || "0.00"}</p>
              <p><strong>Discount:</strong> ${invoiceDetails.discount_amount || "0.00"}</p>
              <p><strong>Total:</strong> ${invoiceDetails.total_amount || "0.00"}</p>
              <p><strong>Status:</strong> {invoiceDetails.status || "draft"}</p>
              <p><strong>Created:</strong> {new Date(invoiceDetails.created_at).toLocaleString()}</p>
            </div>
            <button
              onClick={() => setShowDetailsModal(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
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

