import React, { useState, useEffect } from "react";
import { FaFileInvoice, FaPlus, FaEye, FaSearch, FaSpinner } from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../../api";
import InvoiceModal from "../../components/InvoiceModal";

const AgentInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [agentUsers, setAgentUsers] = useState([]);

  const [newInvoice, setNewInvoice] = useState({
    customer_name: "",
    customer_email: "",
    items: [{ description: "", quantity: 1, unit_price: 0 }],
    status: "draft",
  });

  useEffect(() => {
    fetchInvoices();
    fetchAgentUsers();
  }, []);

  const fetchAgentUsers = async () => {
    try {
      const response = await API.get("/buysellapi/agent/users/");
      setAgentUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching agent users:", error);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await API.get("/buysellapi/agent/invoices/");
      setInvoices(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to fetch invoices");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const total = newInvoice.items.reduce(
        (sum, item) => sum + (item.quantity * item.unit_price),
        0
      );

      const invoiceData = {
        customer_name: newInvoice.customer_name,
        customer_email: newInvoice.customer_email,
        items: newInvoice.items,
        total_amount: total,
        status: newInvoice.status,
      };

      await API.post("/buysellapi/agent/invoices/", invoiceData);
      toast.success("Invoice created successfully");
      setShowCreateForm(false);
      setNewInvoice({
        customer_name: "",
        customer_email: "",
        items: [{ description: "", quantity: 1, unit_price: 0 }],
        status: "draft",
      });
      fetchInvoices();
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          "Failed to create invoice"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (invoice) => {
    try {
      const response = await API.get(`/buysellapi/agent/invoices/${invoice.id}/`);
      setSelectedInvoice(response.data);
      setShowInvoiceModal(true);
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      toast.error("Failed to load invoice details");
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <FaFileInvoice className="text-indigo-600" />
          Invoices
        </h2>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setNewInvoice({
              customer_name: "",
              customer_email: "",
              items: [{ description: "", quantity: 1, unit_price: 0 }],
              status: "draft",
            });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <FaPlus /> Create Invoice
        </button>
      </div>

      {/* Create Invoice Form */}
      {showCreateForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Create New Invoice
          </h3>
          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newInvoice.customer_name}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, customer_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Email *
                </label>
                <input
                  type="email"
                  required
                  value={newInvoice.customer_email}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, customer_email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Invoice Items *
              </label>
              {newInvoice.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Description"
                      required
                      value={item.description}
                      onChange={(e) => {
                        const items = [...newInvoice.items];
                        items[index].description = e.target.value;
                        setNewInvoice({ ...newInvoice, items });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="Quantity"
                      required
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const items = [...newInvoice.items];
                        items[index].quantity = parseFloat(e.target.value) || 0;
                        setNewInvoice({ ...newInvoice, items });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="Unit Price"
                      required
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => {
                        const items = [...newInvoice.items];
                        items[index].unit_price = parseFloat(e.target.value) || 0;
                        setNewInvoice({ ...newInvoice, items });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-1">
                    {newInvoice.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const items = newInvoice.items.filter((_, i) => i !== index);
                          setNewInvoice({ ...newInvoice, items });
                        }}
                        className="w-full px-2 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setNewInvoice({
                    ...newInvoice,
                    items: [...newInvoice.items, { description: "", quantity: 1, unit_price: 0 }],
                  });
                }}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                + Add Item
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Create Invoice
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Invoices Table */}
      {loading && invoices.length === 0 ? (
        <div className="text-center py-8">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No invoices found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Invoice Number
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
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    <div>
                      <div>{invoice.customer_name}</div>
                      <div className="text-xs text-gray-500">{invoice.customer_email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    ${invoice.total_amount?.toFixed(2) || "0.00"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        invoice.status === "paid"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : invoice.status === "pending"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : invoice.status === "overdue"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {invoice.status || "draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {invoice.created_at
                      ? new Date(invoice.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleViewInvoice(invoice)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
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

      {showInvoiceModal && selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}
    </div>
  );
};

export default AgentInvoices;


