import React, { useState, useEffect, useCallback } from "react";
import { FaMapMarkerAlt, FaPlus, FaEdit, FaTrash, FaSearch, FaCopy, FaCheck } from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../../api";
import ConfirmModal from "../../components/shared/ConfirmModal";

const AgentShippingMarks = () => {
  const [addresses, setAddresses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editAddress, setEditAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [defaultBaseAddress, setDefaultBaseAddress] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const [newAddress, setNewAddress] = useState({
    markId: "",
    name: "",
    fullAddress: "",
    shippingMark: "",
    trackingNumber: "",
  });

  useEffect(() => {
    loadAddresses();
    loadDefaultBaseAddress();
  }, []);

  const loadAddresses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await API.get("/api/admin/agent/shipping-marks");
      if (response.data && response.data.data) {
        setAddresses(response.data.data);
      } else if (Array.isArray(response.data)) {
        setAddresses(response.data);
      } else {
        setAddresses([]);
      }
    } catch (error) {
      console.error("Error loading agent addresses:", error);
      toast.error("Failed to load shipping addresses");
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDefaultBaseAddress = useCallback(async () => {
    try {
      const response = await API.get("/api/admin/agent/default-base-address");
      if (response.data && response.data.baseAddress) {
        setDefaultBaseAddress(response.data.baseAddress);
      } else {
        setDefaultBaseAddress(" ");
      }
    } catch (error) {
      console.error("Error loading default base address:", error);
      setDefaultBaseAddress(" ");
    }
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const payload = {
        mark_id: newAddress.markId,
        name: newAddress.name,
        full_address: newAddress.fullAddress,
        shipping_mark: newAddress.shippingMark,
        tracking_number: newAddress.trackingNumber,
        is_agent_address: true,
      };

      if (editAddress) {
        await API.put(
          `/api/admin/agent/shipping-marks/${editAddress.id || editAddress._id}`,
          payload
        );
        toast.success("Shipping address updated successfully");
      } else {
        await API.post("/api/admin/agent/shipping-marks", payload);
        toast.success("Shipping address added successfully");
      }

      setShowAddForm(false);
      setEditAddress(null);
      setNewAddress({
        markId: "",
        name: "",
        fullAddress: "",
        shippingMark: "",
        trackingNumber: "",
      });
      loadAddresses();
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          "Failed to save shipping address"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await API.delete(`/api/admin/agent/shipping-marks/${deleteTarget}`);
      toast.success("Shipping address deleted successfully");
      setShowDeleteModal(false);
      setDeleteTarget(null);
      loadAddresses();
    } catch (error) {
      console.error("Error deleting address:", error);
      toast.error("Failed to delete shipping address");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAddresses = addresses.filter(
    (addr) =>
      addr.mark_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      addr.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      addr.full_address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <FaMapMarkerAlt className="text-purple-600" />
          Shipping Marks & Addresses
        </h2>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditAddress(null);
            setNewAddress({
              markId: "",
              name: "",
              fullAddress: "",
              shippingMark: "",
              trackingNumber: "",
            });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <FaPlus /> Add Address
        </button>
      </div>

      {/* Default Base Address */}
      {defaultBaseAddress && defaultBaseAddress.trim() && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Default Base Address
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 break-words">
            {defaultBaseAddress}
          </p>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search shipping marks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            {editAddress ? "Edit Shipping Address" : "Add New Shipping Address"}
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mark ID *
                </label>
                <input
                  type="text"
                  required
                  value={newAddress.markId}
                  onChange={(e) => setNewAddress({ ...newAddress, markId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={newAddress.name}
                  onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Address *
              </label>
              <textarea
                required
                rows="3"
                value={newAddress.fullAddress}
                onChange={(e) => setNewAddress({ ...newAddress, fullAddress: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Shipping Mark
                </label>
                <input
                  type="text"
                  value={newAddress.shippingMark}
                  onChange={(e) => setNewAddress({ ...newAddress, shippingMark: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={newAddress.trackingNumber}
                  onChange={(e) => setNewAddress({ ...newAddress, trackingNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {editAddress ? "Update" : "Add"} Address
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditAddress(null);
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Addresses Table */}
      {isLoading && addresses.length === 0 ? (
        <div className="text-center py-8">Loading addresses...</div>
      ) : filteredAddresses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No shipping addresses found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Mark ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Full Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAddresses.map((address) => {
                const fullAddressText = `${address.mark_id}:${address.name}\n${address.full_address || address.fullAddress || ""}`;
                const addressId = address.id || address._id;
                return (
                  <tr key={addressId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {address.mark_id || address.markId}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {address.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-md">
                      <div className="truncate" title={address.full_address || address.fullAddress}>
                        {address.full_address || address.fullAddress || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopy(fullAddressText, addressId)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          title="Copy address"
                        >
                          {copiedId === addressId ? <FaCheck /> : <FaCopy />}
                        </button>
                        <button
                          onClick={() => {
                            setEditAddress(address);
                            setNewAddress({
                              markId: address.mark_id || address.markId || "",
                              name: address.name || "",
                              fullAddress: address.full_address || address.fullAddress || "",
                              shippingMark: address.shipping_mark || address.shippingMark || "",
                              trackingNumber: address.tracking_number || address.trackingNumber || "",
                            });
                            setShowAddForm(true);
                          }}
                          className="text-green-600 hover:text-green-800 dark:text-green-400"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(addressId);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-800 dark:text-red-400"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        title="Delete Shipping Address"
        message="Are you sure you want to delete this shipping address? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default AgentShippingMarks;

