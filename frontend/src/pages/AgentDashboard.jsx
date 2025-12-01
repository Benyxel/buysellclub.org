import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../api";
import {
  FaUsers,
  FaBox,
  FaFileInvoice,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaTimes,
  FaCheck,
  FaTruck,
  FaShip,
  FaEye,
} from "react-icons/fa";

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");
  const [loading, setLoading] = useState(false);

  // Users state
  const [users, setUsers] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: "", email: "" });

  // Tracking state
  const [trackings, setTrackings] = useState([]);
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [editingTracking, setEditingTracking] = useState(null);
  const [trackingForm, setTrackingForm] = useState({
    tracking_number: "",
    shipping_mark: "",
    status: "pending",
    cbm: "",
    shipping_fee: "",
    goods_type: "normal",
    eta: "",
  });
  const [containers, setContainers] = useState([]);
  const [selectedTracking, setSelectedTracking] = useState(null);
  const [showTrackingDetails, setShowTrackingDetails] = useState(false);

  // Invoice state
  const [invoices, setInvoices] = useState([]);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: "",
    shipping_mark: "",
    customer_name: "",
    customer_email: "",
    subtotal: "",
    tax_amount: "",
    discount_amount: "",
    total_amount: "",
    status: "draft",
  });

  useEffect(() => {
    checkAgentStatus();
  }, []);

  useEffect(() => {
    if (activeTab === "users") {
      loadUsers();
    } else if (activeTab === "trackings") {
      loadTrackings();
      loadContainers();
    } else if (activeTab === "invoices") {
      loadInvoices();
    }
  }, [activeTab]);

  const checkAgentStatus = async () => {
    try {
      const resp = await API.get("/buysellapi/users/me/");
      if (!resp.data.is_agent) {
        toast.error("You are not authorized to access the Agent Dashboard");
        navigate("/");
        return;
      }
    } catch (err) {
      console.error("Failed to check agent status", err);
      toast.error("Failed to verify agent status");
      navigate("/");
    }
  };

  // Users Management
  const loadUsers = async () => {
    try {
      setLoading(true);
      const resp = await API.get("/buysellapi/agent/users/");
      setUsers(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error("Failed to load users", err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email) {
      toast.error("Name and email are required");
      return;
    }

    try {
      if (editingUser) {
        await API.put(`/buysellapi/agent/users/${editingUser.id}/`, userForm);
        toast.success("User updated successfully!");
      } else {
        await API.post("/buysellapi/agent/users/", userForm);
        toast.success("User added successfully!");
      }
      resetUserForm();
      loadUsers();
    } catch (err) {
      console.error("Failed to save user", err);
      const errorMsg =
        err.response?.data?.detail || "Failed to save user";
      toast.error(errorMsg);
    }
  };

  const handleUserDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      await API.delete(`/buysellapi/agent/users/${userId}/`);
      toast.success("User deleted successfully!");
      loadUsers();
    } catch (err) {
      console.error("Failed to delete user", err);
      toast.error("Failed to delete user");
    }
  };

  const resetUserForm = () => {
    setUserForm({ name: "", email: "" });
    setEditingUser(null);
    setShowUserForm(false);
  };

  // Tracking Management
  const loadTrackings = async () => {
    try {
      setLoading(true);
      const resp = await API.get("/buysellapi/agent/trackings/");
      setTrackings(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error("Failed to load trackings", err);
      toast.error("Failed to load tracking numbers");
    } finally {
      setLoading(false);
    }
  };

  const loadContainers = async () => {
    try {
      const resp = await API.get("/buysellapi/containers/");
      setContainers(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error("Failed to load containers", err);
    }
  };

  const handleTrackingSubmit = async (e) => {
    e.preventDefault();
    if (!trackingForm.tracking_number) {
      toast.error("Tracking number is required");
      return;
    }

    try {
      const payload = {
        ...trackingForm,
        cbm: trackingForm.cbm ? parseFloat(trackingForm.cbm) : null,
        shipping_fee: trackingForm.shipping_fee
          ? parseFloat(trackingForm.shipping_fee)
          : null,
      };

      if (editingTracking) {
        await API.patch(
          `/buysellapi/agent/trackings/${editingTracking.id}/`,
          payload
        );
        toast.success("Tracking updated successfully!");
      } else {
        await API.post("/buysellapi/agent/trackings/", payload);
        toast.success("Tracking number added successfully!");
      }
      resetTrackingForm();
      loadTrackings();
    } catch (err) {
      console.error("Failed to save tracking", err);
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.tracking_number?.[0] ||
        "Failed to save tracking";
      toast.error(errorMsg);
    }
  };

  const handleAssignContainer = async (trackingId, containerId) => {
    try {
      await API.patch(`/buysellapi/agent/trackings/${trackingId}/`, {
        container_id: containerId,
      });
      toast.success("Container assigned successfully!");
      loadTrackings();
    } catch (err) {
      console.error("Failed to assign container", err);
      toast.error("Failed to assign container");
    }
  };

  const handleViewTrackingDetails = async (tracking) => {
    try {
      const resp = await API.get(
        `/buysellapi/agent/trackings/${tracking.id}/`
      );
      setSelectedTracking(resp.data);
      setShowTrackingDetails(true);
    } catch (err) {
      console.error("Failed to load tracking details", err);
      toast.error("Failed to load tracking details");
    }
  };

  const resetTrackingForm = () => {
    setTrackingForm({
      tracking_number: "",
      shipping_mark: "",
      status: "pending",
      cbm: "",
      shipping_fee: "",
      goods_type: "normal",
      eta: "",
    });
    setEditingTracking(null);
    setShowTrackingForm(false);
  };

  // Invoice Management
  const loadInvoices = async () => {
    try {
      setLoading(true);
      const resp = await API.get("/buysellapi/agent/invoices/");
      setInvoices(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error("Failed to load invoices", err);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!invoiceForm.invoice_number || !invoiceForm.shipping_mark) {
      toast.error("Invoice number and shipping mark are required");
      return;
    }

    try {
      const payload = {
        ...invoiceForm,
        subtotal: invoiceForm.subtotal ? parseFloat(invoiceForm.subtotal) : 0,
        tax_amount: invoiceForm.tax_amount
          ? parseFloat(invoiceForm.tax_amount)
          : 0,
        discount_amount: invoiceForm.discount_amount
          ? parseFloat(invoiceForm.discount_amount)
          : 0,
        total_amount: invoiceForm.total_amount
          ? parseFloat(invoiceForm.total_amount)
          : 0,
      };

      if (editingInvoice) {
        await API.patch(
          `/buysellapi/agent/invoices/${editingInvoice.id}/`,
          payload
        );
        toast.success("Invoice updated successfully!");
      } else {
        await API.post("/buysellapi/agent/invoices/", payload);
        toast.success("Invoice created successfully!");
      }
      resetInvoiceForm();
      loadInvoices();
    } catch (err) {
      console.error("Failed to save invoice", err);
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.invoice_number?.[0] ||
        "Failed to save invoice";
      toast.error(errorMsg);
    }
  };

  const resetInvoiceForm = () => {
    setInvoiceForm({
      invoice_number: "",
      shipping_mark: "",
      customer_name: "",
      customer_email: "",
      subtotal: "",
      tax_amount: "",
      discount_amount: "",
      total_amount: "",
      status: "draft",
    });
    setEditingInvoice(null);
    setShowInvoiceForm(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Agent Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your users, tracking numbers, and invoices
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 font-medium flex items-center gap-2 ${
              activeTab === "users"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <FaUsers /> Users
          </button>
          <button
            onClick={() => setActiveTab("trackings")}
            className={`px-4 py-2 font-medium flex items-center gap-2 ${
              activeTab === "trackings"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <FaBox /> Tracking Numbers
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-4 py-2 font-medium flex items-center gap-2 ${
              activeTab === "invoices"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <FaFileInvoice /> Invoices
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      ) : (
        <>
          {/* Users Tab */}
          {activeTab === "users" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  My Users ({users.length})
                </h2>
                <button
                  onClick={() => {
                    resetUserForm();
                    setShowUserForm(true);
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                >
                  <FaPlus /> Add User
                </button>
              </div>

              {/* User Form */}
              {showUserForm && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {editingUser ? "Edit User" : "Add New User"}
                    </h3>
                    <button
                      onClick={resetUserForm}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <FaTimes />
                    </button>
                  </div>
                  <form onSubmit={handleUserSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={userForm.name}
                        onChange={(e) =>
                          setUserForm({ ...userForm, name: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={userForm.email}
                        onChange={(e) =>
                          setUserForm({ ...userForm, email: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                      >
                        <FaCheck /> {editingUser ? "Update" : "Create"}
                      </button>
                      <button
                        type="button"
                        onClick={resetUserForm}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Users List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          No users found. Add your first user!
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {user.created_at
                              ? new Date(user.created_at).toLocaleDateString()
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setUserForm({ name: user.name, email: user.email });
                                setShowUserForm(true);
                              }}
                              className="text-primary hover:text-primary/80 mr-4"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleUserDelete(user.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Trackings Tab - This will be continued in the next part due to length */}
          {activeTab === "trackings" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Tracking Numbers ({trackings.length})
                </h2>
                <button
                  onClick={() => {
                    resetTrackingForm();
                    setShowTrackingForm(true);
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                >
                  <FaPlus /> Add Tracking Number
                </button>
              </div>

              {/* Tracking Form */}
              {showTrackingForm && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {editingTracking ? "Edit Tracking" : "Add New Tracking Number"}
                    </h3>
                    <button
                      onClick={resetTrackingForm}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <FaTimes />
                    </button>
                  </div>
                  <form onSubmit={handleTrackingSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Tracking Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={trackingForm.tracking_number}
                          onChange={(e) =>
                            setTrackingForm({
                              ...trackingForm,
                              tracking_number: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Shipping Mark
                        </label>
                        <input
                          type="text"
                          value={trackingForm.shipping_mark}
                          onChange={(e) =>
                            setTrackingForm({
                              ...trackingForm,
                              shipping_mark: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Status
                        </label>
                        <select
                          value={trackingForm.status}
                          onChange={(e) =>
                            setTrackingForm({
                              ...trackingForm,
                              status: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_transit">In Transit</option>
                          <option value="arrived">Arrived(China)</option>
                          <option value="vessel">On The Vessel</option>
                          <option value="clearing">Clearing</option>
                          <option value="arrived_ghana">Arrived(Ghana)</option>
                          <option value="off_loading">Off Loading</option>
                          <option value="pick_up">Pick up</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          CBM
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={trackingForm.cbm}
                          onChange={(e) =>
                            setTrackingForm({
                              ...trackingForm,
                              cbm: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Shipping Fee
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={trackingForm.shipping_fee}
                          onChange={(e) =>
                            setTrackingForm({
                              ...trackingForm,
                              shipping_fee: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                      >
                        <FaCheck /> {editingTracking ? "Update" : "Create"}
                      </button>
                      <button
                        type="button"
                        onClick={resetTrackingForm}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Trackings List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Tracking Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Container
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {trackings.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          No tracking numbers found. Add your first tracking number!
                        </td>
                      </tr>
                    ) : (
                      trackings.map((tracking) => (
                        <tr key={tracking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {tracking.tracking_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                tracking.status === "pick_up"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : tracking.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              }`}
                            >
                              {tracking.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {tracking.container_number ? (
                              <span className="flex items-center gap-1">
                                <FaShip /> {tracking.container_number}
                              </span>
                            ) : (
                              <select
                                onChange={(e) =>
                                  handleAssignContainer(tracking.id, e.target.value)
                                }
                                className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-white"
                                defaultValue=""
                              >
                                <option value="">Assign Container</option>
                                {containers.map((container) => (
                                  <option key={container.id} value={container.id}>
                                    {container.container_number}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleViewTrackingDetails(tracking)}
                              className="text-primary hover:text-primary/80 mr-4"
                            >
                              <FaEye />
                            </button>
                            <button
                              onClick={() => {
                                setEditingTracking(tracking);
                                setTrackingForm({
                                  tracking_number: tracking.tracking_number || "",
                                  shipping_mark: tracking.shipping_mark || "",
                                  status: tracking.status || "pending",
                                  cbm: tracking.cbm || "",
                                  shipping_fee: tracking.shipping_fee || "",
                                  goods_type: tracking.goods_type || "normal",
                                  eta: tracking.eta || "",
                                });
                                setShowTrackingForm(true);
                              }}
                              className="text-primary hover:text-primary/80 mr-4"
                            >
                              <FaEdit />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tracking Details Modal */}
              {showTrackingDetails && selectedTracking && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Tracking Details
                      </h3>
                      <button
                        onClick={() => {
                          setShowTrackingDetails(false);
                          setSelectedTracking(null);
                        }}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <FaTimes />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Tracking Number
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {selectedTracking.tracking_number}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Status
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {selectedTracking.status}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Container
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {selectedTracking.container_number || "Not assigned"}
                        </p>
                      </div>
                      {selectedTracking.shipping_mark && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Shipping Mark
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {selectedTracking.shipping_mark}
                          </p>
                        </div>
                      )}
                      {selectedTracking.cbm && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            CBM
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {selectedTracking.cbm}
                          </p>
                        </div>
                      )}
                      {selectedTracking.shipping_fee && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Shipping Fee
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            ${selectedTracking.shipping_fee}
                          </p>
                        </div>
                      )}
                      {selectedTracking.date_added && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Date Added
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {new Date(selectedTracking.date_added).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === "invoices" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Invoices ({invoices.length})
                </h2>
                <button
                  onClick={() => {
                    resetInvoiceForm();
                    setShowInvoiceForm(true);
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                >
                  <FaPlus /> Create Invoice
                </button>
              </div>

              {/* Invoice Form */}
              {showInvoiceForm && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {editingInvoice ? "Edit Invoice" : "Create New Invoice"}
                    </h3>
                    <button
                      onClick={resetInvoiceForm}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <FaTimes />
                    </button>
                  </div>
                  <form onSubmit={handleInvoiceSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Invoice Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={invoiceForm.invoice_number}
                          onChange={(e) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              invoice_number: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Shipping Mark <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={invoiceForm.shipping_mark}
                          onChange={(e) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              shipping_mark: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Customer Name
                        </label>
                        <input
                          type="text"
                          value={invoiceForm.customer_name}
                          onChange={(e) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              customer_name: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Customer Email
                        </label>
                        <input
                          type="email"
                          value={invoiceForm.customer_email}
                          onChange={(e) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              customer_email: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Subtotal
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={invoiceForm.subtotal}
                          onChange={(e) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              subtotal: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Tax Amount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={invoiceForm.tax_amount}
                          onChange={(e) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              tax_amount: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Discount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={invoiceForm.discount_amount}
                          onChange={(e) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              discount_amount: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Total Amount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={invoiceForm.total_amount}
                          onChange={(e) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              total_amount: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Status
                      </label>
                      <select
                        value={invoiceForm.status}
                        onChange={(e) =>
                          setInvoiceForm({
                            ...invoiceForm,
                            status: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        <option value="draft">Draft</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                      >
                        <FaCheck /> {editingInvoice ? "Update" : "Create"}
                      </button>
                      <button
                        type="button"
                        onClick={resetInvoiceForm}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Invoices List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Invoice Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Total Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          No invoices found. Create your first invoice!
                        </td>
                      </tr>
                    ) : (
                      invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {invoice.invoice_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {invoice.customer_name || invoice.customer_email || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            ${invoice.total_amount || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                invoice.status === "paid"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : invoice.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                  : invoice.status === "draft"
                                  ? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              }`}
                            >
                              {invoice.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => {
                                setEditingInvoice(invoice);
                                setInvoiceForm({
                                  invoice_number: invoice.invoice_number || "",
                                  shipping_mark: invoice.shipping_mark || "",
                                  customer_name: invoice.customer_name || "",
                                  customer_email: invoice.customer_email || "",
                                  subtotal: invoice.subtotal || "",
                                  tax_amount: invoice.tax_amount || "",
                                  discount_amount: invoice.discount_amount || "",
                                  total_amount: invoice.total_amount || "",
                                  status: invoice.status || "draft",
                                });
                                setShowInvoiceForm(true);
                              }}
                              className="text-primary hover:text-primary/80"
                            >
                              <FaEdit />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

