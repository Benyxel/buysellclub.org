import React, { useState, useEffect } from "react";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { toast } from "../../utils/toast";
import API from "../../api";
import ConfirmModal from "../../components/shared/ConfirmModal";

const WarehouseAddressesManagement = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({
    code: "",
    display_name: "",
    baseAddress: "",
    phone: "",
    address_line: "",
    city: "",
    state: "",
    state_full: "",
    zipcode: "",
    country: "",
    is_active: true,
    order: 0,
  });

  const loadList = async () => {
    try {
      setLoading(true);
      const res = await API.get("/buysellapi/admin/warehouse-addresses/");
      setList(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Failed to load warehouse addresses");
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const resetForm = () => {
    setForm({
      code: "",
      display_name: "",
      baseAddress: "",
      phone: "",
      address_line: "",
      city: "",
      state: "",
      state_full: "",
      zipcode: "",
      country: "",
      is_active: true,
      order: 0,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item) => {
    setForm({
      code: item.code,
      display_name: item.display_name || "",
      baseAddress: item.baseAddress ?? item.base_address ?? "",
      phone: item.phone || "",
      address_line: item.address_line ?? "",
      city: item.city ?? "",
      state: item.state ?? "",
      state_full: item.state_full ?? "",
      zipcode: item.zipcode ?? "",
      country: item.country ?? "",
      is_active: item.is_active !== false,
      order: item.order ?? 0,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code?.trim()) {
      toast.error("Code is required");
      return;
    }
    if (!form.display_name?.trim()) {
      toast.error("Display name is required");
      return;
    }
    if (!form.baseAddress?.trim()) {
      toast.error("Base address is required");
      return;
    }
    const payload = {
      code: form.code.trim().toLowerCase().replace(/\s+/g, "-"),
      display_name: form.display_name.trim(),
      baseAddress: form.baseAddress.trim(),
      phone: form.phone.trim(),
      address_line: (form.address_line ?? "").trim(),
      city: (form.city ?? "").trim(),
      state: (form.state ?? "").trim(),
      state_full: (form.state_full ?? "").trim(),
      zipcode: (form.zipcode ?? "").trim(),
      country: (form.country ?? "").trim(),
      is_active: form.is_active,
      order: Number(form.order) || 0,
    };
    try {
      if (editingId) {
        await API.put(`/buysellapi/admin/warehouse-addresses/${editingId}/`, payload);
        toast.success("Warehouse address updated");
      } else {
        await API.post("/buysellapi/admin/warehouse-addresses/", payload);
        toast.success("Warehouse address created");
      }
      resetForm();
      loadList();
    } catch (e) {
      const msg = e?.response?.data?.code?.[0] || e?.response?.data?.baseAddress?.[0] || e?.response?.data?.error || e?.message || "Request failed";
      toast.error(msg);
    }
  };

  const openDeleteModal = (item) => {
    setDeleteTarget(item);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (!deleteLoading) {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await API.delete(`/buysellapi/admin/warehouse-addresses/${deleteTarget.id}/`);
      toast.success("Warehouse address deleted");
      loadList();
      if (editingId === deleteTarget.id) resetForm();
      closeDeleteModal();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Manage warehouse addresses for USA, Dubai, and other regions. Users see these on the Shipping page and can generate their address per region.
        </p>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          <FaPlus className="w-4 h-4" />
          Add warehouse address
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            {editingId ? "Edit warehouse address" : "New warehouse address"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code (e.g. usa, dubai)</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="usa"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={!!editingId}
                />
                {editingId && <p className="text-xs text-gray-500 mt-1">Code cannot be changed when editing.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display name</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  placeholder="USA"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base address (user's shipping mark will be appended; used when USA-style fields below are empty)</label>
              <textarea
                value={form.baseAddress}
                onChange={(e) => setForm((f) => ({ ...f, baseAddress: e.target.value }))}
                rows={4}
                placeholder="BUYSELLCLUB USA Warehouse, Phone: ..., Address: ... *"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">USA-style address (optional – when set, generated address uses labeled format)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address line</label>
                  <input
                    type="text"
                    value={form.address_line}
                    onChange={(e) => setForm((f) => ({ ...f, address_line: e.target.value }))}
                    placeholder="150 Park Ave"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="Hartford"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State (e.g. CT)</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    placeholder="CT"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State full (e.g. Connecticut)</label>
                  <input
                    type="text"
                    value={form.state_full}
                    onChange={(e) => setForm((f) => ({ ...f, state_full: e.target.value }))}
                    placeholder="Connecticut"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zipcode</label>
                  <input
                    type="text"
                    value={form.zipcode}
                    onChange={(e) => setForm((f) => ({ ...f, zipcode: e.target.value }))}
                    placeholder="06108"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                    placeholder="USA"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone (optional)</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order (lower = first on Shipping page)</label>
                <input
                  type="number"
                  min={0}
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Active (show on Shipping page)</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                {editingId ? "Update" : "Create"}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-8 text-center text-gray-600 dark:text-gray-400">
          No warehouse addresses yet. Add one to let users generate USA, Dubai, or other region addresses.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Display name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Base address</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Active</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {list.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{item.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.display_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate" title={item.baseAddress ?? item.base_address}>
                    {((item.baseAddress ?? item.base_address) || "").slice(0, 60)}…
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.order}</td>
                  <td className="px-4 py-3 text-sm">{item.is_active ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => handleEdit(item)} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 mr-2">
                      <FaEdit className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => openDeleteModal(item)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400" title="Delete">
                      <FaTrash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete warehouse address"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.display_name}" (${deleteTarget.code})? Users will no longer see this address on the Shipping page.`
            : "Delete this warehouse address?"
        }
        confirmText={deleteLoading ? "Deleting…" : "Delete"}
        cancelText="Cancel"
        type="danger"
        disabled={deleteLoading}
      />
    </div>
  );
};

export default WarehouseAddressesManagement;
