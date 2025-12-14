import React, { useState, useEffect } from "react";
import { FaFileInvoice, FaPlus, FaEye, FaSearch, FaSpinner, FaEdit, FaTrash, FaEnvelope } from "react-icons/fa";
import { toast } from "../../utils/toast";
import API from "../../api";
import InvoiceModal from "../../components/InvoiceModal";
import ConfirmModal from "../../components/shared/ConfirmModal";

const AgentInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [agentUsers, setAgentUsers] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInvoice, setDeleteInvoice] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState(null);

  const [newInvoice, setNewInvoice] = useState({
    customer_name: "",
    customer_email: "",
    items: [{ description: "", quantity: 1, unit_price: 0, cbm: 0, ctn: 0 }],
    status: "draft",
    exchange_rate: "",
  });

  useEffect(() => {
    fetchInvoices();
    fetchAgentUsers();
  }, []);

  // Calculate totals for create form
  const calculateTotals = () => {
    const totalUSD = newInvoice.items.reduce(
      (sum, item) => sum + (parseFloat(item.unit_price) || 0),
      0
    );
    const rate = parseFloat(newInvoice.exchange_rate) || 0;
    const totalGHS = rate ? totalUSD * rate : 0;
    return { totalUSD, totalGHS };
  };
  
  // Calculate totals for edit form
  const calculateEditTotals = () => {
    if (!editingInvoice) return { totalUSD: 0, totalGHS: 0 };
    const totalUSD = editingInvoice.items.reduce(
      (sum, item) => sum + (parseFloat(item.unit_price) || 0),
      0
    );
    const rate = parseFloat(editingInvoice.exchange_rate) || 0;
    const totalGHS = rate ? totalUSD * rate : 0;
    return { totalUSD, totalGHS };
  };
  
  const { totalUSD, totalGHS } = showEditForm ? calculateEditTotals() : calculateTotals();

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
      const total = totalUSD;
      const totalGHSValue = totalGHS;

      const invoiceData = {
        customer_name: newInvoice.customer_name,
        customer_email: newInvoice.customer_email,
        items: newInvoice.items.map(item => ({
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          cbm: item.cbm || 0,
          ctn: item.ctn || 0,
        })),
        total_amount: total,
        total_amount_ghs: totalGHSValue,
        exchange_rate: newInvoice.exchange_rate ? parseFloat(newInvoice.exchange_rate) : null,
        status: newInvoice.status,
      };

      await API.post("/buysellapi/agent/invoices/", invoiceData);
      toast.success("Invoice created successfully");
      setShowCreateForm(false);
      setNewInvoice({
        customer_name: "",
        customer_email: "",
        items: [{ description: "", quantity: 1, unit_price: 0, cbm: 0, ctn: 0 }],
        status: "draft",
        exchange_rate: "",
      });
      fetchInvoices();
    } catch (error) {
      console.error("Error creating invoice:", error);
      console.error("Error response:", error.response);
      console.error("Error data:", error.response?.data);
      
      // Show detailed error message
      let errorMessage = "Failed to create invoice";
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          // Handle validation errors
          const errors = Object.entries(error.response.data)
            .map(([key, value]) => {
              if (Array.isArray(value)) {
                return `${key}: ${value.join(', ')}`;
              }
              return `${key}: ${value}`;
            })
            .join('; ');
          errorMessage = errors || error.response.data.detail || error.response.data.error || errorMessage;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (invoice) => {
    try {
      const response = await API.get(`/buysellapi/agent/invoices/${invoice.id}/`);
      const invoiceData = response.data;
      
      // Transform snake_case to camelCase for Invoice component
      const transformedInvoice = {
        invoiceNumber: invoiceData.invoice_number,
        createdAt: invoiceData.created_at,
        dueDate: invoiceData.due_date || invoiceData.created_at,
        status: invoiceData.status,
        amount: parseFloat(invoiceData.total_amount) || 0,
        totalGhs: invoiceData.total_amount_ghs ? parseFloat(invoiceData.total_amount_ghs) : null,
        tax: parseFloat(invoiceData.tax_amount) || 0,
        shipping: 0,
        serviceFee: 0,
        customerName: invoiceData.customer_name,
        customerEmail: invoiceData.customer_email,
        exchangeRate: invoiceData.exchange_rate ? parseFloat(invoiceData.exchange_rate) : null,
        isAgentInvoice: true, // Flag to identify agent invoices
      };
      
      // Create request object for Invoice component
      const requestData = {
        userName: invoiceData.customer_name,
        userEmail: invoiceData.customer_email,
        title: `Invoice ${invoiceData.invoice_number}`,
        description: `Invoice for ${invoiceData.customer_name}`,
      };
      
      setSelectedInvoice({ 
        invoice: transformedInvoice, 
        request: requestData,
        invoiceId: invoiceData.id,
        customerEmail: invoiceData.customer_email,
      });
      setShowInvoiceModal(true);
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      toast.error("Failed to load invoice details");
    }
  };

  const handleEditInvoice = (invoice) => {
    // Load invoice details and populate edit form
    API.get(`/buysellapi/agent/invoices/${invoice.id}/`)
      .then(response => {
        const invoiceData = response.data;
        setEditingInvoice({
          id: invoiceData.id,
          customer_name: invoiceData.customer_name || "",
          customer_email: invoiceData.customer_email || "",
          items: invoiceData.items?.map(item => ({
            description: item.tracking_number || item.description || "",
            quantity: 1,
            unit_price: parseFloat(item.total_amount) || 0,
            cbm: parseFloat(item.cbm) || 0,
            ctn: 0,
          })) || [{ description: "", quantity: 1, unit_price: 0, cbm: 0, ctn: 0 }],
          status: invoiceData.status || "draft",
          exchange_rate: invoiceData.exchange_rate ? invoiceData.exchange_rate.toString() : "",
        });
        setShowEditForm(true);
        setShowCreateForm(false);
      })
      .catch(error => {
        console.error("Error fetching invoice for edit:", error);
        toast.error("Failed to load invoice for editing");
      });
  };

  const handleUpdateInvoice = async (e) => {
    e.preventDefault();
    if (!editingInvoice) return;

    try {
      setLoading(true);
      const total = totalUSD;
      const totalGHSValue = totalGHS;

      const invoiceData = {
        customer_name: editingInvoice.customer_name,
        customer_email: editingInvoice.customer_email,
        total_amount: total,
        total_amount_ghs: totalGHSValue,
        exchange_rate: editingInvoice.exchange_rate ? parseFloat(editingInvoice.exchange_rate) : null,
        status: editingInvoice.status,
      };

      await API.patch(`/buysellapi/agent/invoices/${editingInvoice.id}/`, invoiceData);
      toast.success("Invoice updated successfully");
      setShowEditForm(false);
      setEditingInvoice(null);
      fetchInvoices();
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          "Failed to update invoice"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = (invoice) => {
    setDeleteInvoice(invoice);
    setShowDeleteModal(true);
  };

  const confirmDeleteInvoice = async () => {
    if (!deleteInvoice) return;

    try {
      setLoading(true);
      await API.delete(`/buysellapi/agent/invoices/${deleteInvoice.id}/`);
      toast.success("Invoice deleted successfully");
      fetchInvoices();
      setShowDeleteModal(false);
      setDeleteInvoice(null);
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          "Failed to delete invoice"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = (invoice) => {
    if (!invoice.customer_email) {
      toast.error("Customer email is required to send invoice");
      return;
    }

    setEmailInvoice(invoice);
    setShowEmailModal(true);
  };

  const confirmSendEmail = async () => {
    if (!emailInvoice) return;

    try {
      setLoading(true);
      const response = await API.post(`/buysellapi/agent/invoices/${emailInvoice.id}/`, {});
      toast.success(`Invoice sent successfully to ${emailInvoice.customer_email}`);
      setShowEmailModal(false);
      setEmailInvoice(null);
    } catch (error) {
      console.error("Error sending invoice email:", error);
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          "Failed to send invoice email"
      );
    } finally {
      setLoading(false);
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
          <FaFileInvoice className="text-pink-600" />
          Invoices
        </h2>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setNewInvoice({
              customer_name: "",
              customer_email: "",
              items: [{ description: "", quantity: 1, unit_price: 0, cbm: 0, ctn: 0 }],
              status: "draft",
              exchange_rate: "",
            });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
        >
          <FaPlus /> Create Invoice
        </button>
      </div>

      {/* Edit Invoice Form */}
      {showEditForm && editingInvoice && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Edit Invoice
          </h3>
          <form onSubmit={handleUpdateInvoice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingInvoice.customer_name}
                  onChange={(e) =>
                    setEditingInvoice({ ...editingInvoice, customer_name: e.target.value })
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
                  value={editingInvoice.customer_email}
                  onChange={(e) =>
                    setEditingInvoice({ ...editingInvoice, customer_email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status *
              </label>
              <select
                required
                value={editingInvoice.status}
                onChange={(e) =>
                  setEditingInvoice({ ...editingInvoice, status: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Invoice Items *
              </label>
              {editingInvoice.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Tracking Number
                    </label>
                    <input
                      type="text"
                      placeholder="Tracking Number"
                      required
                      value={item.description}
                      onChange={(e) => {
                        const items = [...editingInvoice.items];
                        items[index].description = e.target.value;
                        setEditingInvoice({ ...editingInvoice, items });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      CTN
                    </label>
                    <input
                      type="number"
                      placeholder="CTN"
                      required
                      min="0"
                      step="1"
                      value={item.ctn || ""}
                      onChange={(e) => {
                        const items = [...editingInvoice.items];
                        items[index].ctn = parseFloat(e.target.value) || 0;
                        setEditingInvoice({ ...editingInvoice, items });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      CBM
                    </label>
                    <input
                      type="number"
                      placeholder="CBM"
                      required
                      min="0"
                      step="0.001"
                      value={item.cbm || ""}
                      onChange={(e) => {
                        const items = [...editingInvoice.items];
                        items[index].cbm = parseFloat(e.target.value) || 0;
                        setEditingInvoice({ ...editingInvoice, items });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Amount ($)
                    </label>
                    <input
                      type="number"
                      placeholder="Amount"
                      required
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => {
                        const items = [...editingInvoice.items];
                        items[index].unit_price = parseFloat(e.target.value) || 0;
                        setEditingInvoice({ ...editingInvoice, items });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-1">
                    {editingInvoice.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const items = editingInvoice.items.filter((_, i) => i !== index);
                          setEditingInvoice({ ...editingInvoice, items });
                        }}
                        className="w-full px-2 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 mt-6"
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
                  setEditingInvoice({
                    ...editingInvoice,
                    items: [...editingInvoice.items, { description: "", quantity: 1, unit_price: 0, cbm: 0, ctn: 0 }],
                  });
                }}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                + Add Item
              </button>
            </div>
            
            {/* Exchange Rate and Totals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dollar Rate (USD to GHS)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={editingInvoice.exchange_rate}
                  onChange={(e) => {
                    setEditingInvoice({
                      ...editingInvoice,
                      exchange_rate: e.target.value,
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0.0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cost in Dollars ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalUSD.toFixed(2)}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Auto-calculated from items
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cost in Cedis (₵)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalGHS.toFixed(2)}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Auto-calculated: USD × Rate
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
              >
                Update Invoice
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false);
                  setEditingInvoice(null);
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

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
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Tracking Number
                    </label>
                    <input
                      type="text"
                      placeholder="Tracking Number"
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
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      CTN
                    </label>
                    <input
                      type="number"
                      placeholder="CTN"
                      required
                      min="0"
                      step="1"
                      value={item.ctn || ""}
                      onChange={(e) => {
                        const items = [...newInvoice.items];
                        items[index].ctn = parseFloat(e.target.value) || 0;
                        setNewInvoice({ ...newInvoice, items });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      CBM
                    </label>
                    <input
                      type="number"
                      placeholder="CBM"
                      required
                      min="0"
                      step="0.001"
                      value={item.cbm || ""}
                      onChange={(e) => {
                        const items = [...newInvoice.items];
                        items[index].cbm = parseFloat(e.target.value) || 0;
                        setNewInvoice({ ...newInvoice, items });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Amount ($)
                    </label>
                    <input
                      type="number"
                      placeholder="Amount"
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
                        className="w-full px-2 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 mt-6"
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
                    items: [...newInvoice.items, { description: "", quantity: 1, unit_price: 0, cbm: 0, ctn: 0 }],
                  });
                }}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                + Add Item
              </button>
            </div>
            
            {/* Exchange Rate and Totals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dollar Rate (USD to GHS)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={newInvoice.exchange_rate}
                  onChange={(e) => {
                    setNewInvoice({
                      ...newInvoice,
                      exchange_rate: e.target.value,
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0.0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cost in Dollars ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalUSD.toFixed(2)}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Auto-calculated from items
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cost in Cedis (₵)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalGHS.toFixed(2)}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Auto-calculated: USD × Rate
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
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
          <FaSpinner className="animate-spin text-4xl text-pink-600 mx-auto" />
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
                    ${(parseFloat(invoice.total_amount) || 0).toFixed(2)}
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="text-pink-600 hover:text-pink-800 dark:text-pink-400"
                        title="View Invoice"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => handleEditInvoice(invoice)}
                        className="text-green-600 hover:text-green-800 dark:text-green-400"
                        title="Edit Invoice"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleSendEmail(invoice)}
                        className="text-purple-600 hover:text-purple-800 dark:text-purple-400"
                        title="Send Invoice via Email"
                        disabled={!invoice.customer_email}
                      >
                        <FaEnvelope />
                      </button>
                      <button
                        onClick={() => handleDeleteInvoice(invoice)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400"
                        title="Delete Invoice"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInvoiceModal && selectedInvoice && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          invoice={selectedInvoice?.invoice || selectedInvoice}
          request={selectedInvoice?.request || null}
          invoiceId={selectedInvoice?.invoiceId}
          customerEmail={selectedInvoice?.customerEmail}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteInvoice(null);
        }}
        onConfirm={confirmDeleteInvoice}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${deleteInvoice?.invoice_number}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        disabled={loading}
      />

      {/* Email Confirmation Modal */}
      <ConfirmModal
        isOpen={showEmailModal}
        onClose={() => {
          setShowEmailModal(false);
          setEmailInvoice(null);
        }}
        onConfirm={confirmSendEmail}
        title="Send Invoice via Email"
        message={`Send invoice ${emailInvoice?.invoice_number} to ${emailInvoice?.customer_email}?`}
        confirmText="Send"
        cancelText="Cancel"
        type="info"
        disabled={loading}
      />
    </div>
  );
};

export default AgentInvoices;



