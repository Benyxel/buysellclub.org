import React, { useEffect, useState } from "react";
import { FaPlus, FaSave, FaTrash, FaEdit } from "react-icons/fa";
import { toast } from "../../utils/toast";
import { Api } from "../../api";
import ConfirmModal from "../../components/shared/ConfirmModal";

const currencyOptions = ["GHS", "CNY", "USD"];

const AirAdShippingServicesManagement = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    name: "",
    days_text: "",
    price: "",
    currency: "GHS",
    is_active: true,
  });

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await Api.airAdServices.list();
      setServices(response?.data || []);
    } catch (error) {
      console.error("Error fetching air ad services:", error);
      toast.error("Failed to load air ad services");
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      days_text: "",
      price: "",
      currency: "GHS",
      is_active: true,
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.days_text.trim() || !form.price) {
      toast.error("Please fill in name, days, and price");
      return;
    }
    if (parseFloat(form.price) <= 0) {
      toast.error("Price must be greater than zero");
      return;
    }

    const payload = {
      name: form.name.trim(),
      days_text: form.days_text.trim(),
      price: parseFloat(form.price),
      currency: form.currency,
      is_active: form.is_active,
    };

    try {
      setLoading(true);
      if (editingId) {
        await Api.airAdServices.update(editingId, payload);
        toast.success("Service updated successfully");
      } else {
        await Api.airAdServices.create(payload);
        toast.success("Service created successfully");
      }
      await fetchServices();
      resetForm();
    } catch (error) {
      console.error("Error saving air ad service:", error);
      toast.error(
        error?.response?.data?.error || "Failed to save air ad service"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service) => {
    setEditingId(service.id);
    setForm({
      name: service.name || "",
      days_text: service.days_text || "",
      price: service.price?.toString() || "",
      currency: service.currency || "GHS",
      is_active: service.is_active ?? true,
    });
  };

  const handleDelete = (serviceId) => {
    setDeleteTarget(serviceId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setLoading(true);
      await Api.airAdServices.remove(deleteTarget);
      setServices((prev) => prev.filter((item) => item.id !== deleteTarget));
      toast.success("Service deleted successfully");
    } catch (error) {
      console.error("Error deleting air ad service:", error);
      toast.error("Failed to delete service");
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Air Ad Shipping Services
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage air ad shipping services and pricing.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-4 text-gray-800 dark:text-white">
          <FaPlus className="text-blue-500" />
          <h3 className="text-lg font-semibold">
            {editingId ? "Edit Service" : "Add Service"}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Service Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Normal Goods"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Days (text)
            </label>
            <input
              type="text"
              value={form.days_text}
              onChange={(e) => setForm({ ...form, days_text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., 7-10 business days"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Price
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Currency
            </label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {currencyOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Active
            </span>
          </div>
          <div className="flex items-center gap-2 justify-end">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <FaSave />
              {editingId ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Service
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Days
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {services.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  {loading ? "Loading services..." : "No services found"}
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id}>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                    {service.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {service.days_text}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {service.currency} {Number(service.price || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        service.is_active
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {service.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(service)}
                        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(service.id)}
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Air Ad Service"
        message="Are you sure you want to delete this service? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
};

export default AirAdShippingServicesManagement;
