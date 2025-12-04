import React, { useState, useEffect, useCallback } from "react";
import {
  FaSearch,
  FaSortAmountDown,
  FaSortAmountUp,
  FaTrash,
  FaPlus,
  FaEdit,
  FaSave,
  FaUserTag,
} from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../../api";
import ConfirmModal from "../../components/shared/ConfirmModal";

const AgentAddressManagement = () => {
  const [addresses, setAddresses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [selectedAddresses, setSelectedAddresses] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editAddress, setEditAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Default base address management for agents
  const [defaultBaseAddress, setDefaultBaseAddress] = useState("");
  const [isEditingDefault, setIsEditingDefault] = useState(false);
  const [tempDefaultAddress, setTempDefaultAddress] = useState("");

  const [newAddress, setNewAddress] = useState({
    markId: "",
    name: "",
    fullAddress: "",
    shippingMark: "",
    trackingNumber: "",
  });

  // Load agent addresses from agent-specific endpoint
  const loadAddresses = useCallback(async () => {
    try {
      setIsLoading(true);

      try {
        const response = await API.get("/api/admin/agent/shipping-marks", {
          params: {
            page: currentPage,
            limit: itemsPerPage,
            sortField: sortField,
            sortDirection: sortDirection,
            search: searchTerm,
          },
        });

        if (response.data && response.data.data) {
          setAddresses(response.data.data);
          setTotalItems(response.data.total);
          setTotalPages(response.data.totalPages);
        } else if (Array.isArray(response.data)) {
          setAddresses(response.data);
          setTotalItems(response.data.length);
          setTotalPages(Math.ceil(response.data.length / itemsPerPage));
        } else {
          setAddresses([]);
          setTotalItems(0);
          setTotalPages(1);
        }
      } catch (error) {
        console.error("Error with agent addresses endpoint:", error);
        // Fallback: filter regular addresses for agent-created ones
        const fallbackResponse = await API.get("/api/admin/shipping-marks");
        if (Array.isArray(fallbackResponse.data)) {
          // Filter for agent addresses (if backend supports this field)
          const agentAddresses = fallbackResponse.data.filter(
            (addr) => addr.is_agent_address || addr.created_by_agent
          );
          setTotalItems(agentAddresses.length);
          setTotalPages(Math.ceil(agentAddresses.length / itemsPerPage));
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          setAddresses(agentAddresses.slice(startIndex, endIndex));
        } else {
          setAddresses([]);
          setTotalItems(0);
          setTotalPages(1);
        }
      }
    } catch (error) {
      console.error("Error loading agent addresses:", error);
      toast.error("Failed to load agent addresses");
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, sortField, sortDirection, searchTerm]);

  const loadDefaultBaseAddress = useCallback(async () => {
    try {
      const response = await API.get("/api/admin/agent/default-base-address");
      if (response.data && response.data.baseAddress) {
        setDefaultBaseAddress(response.data.baseAddress);
        setTempDefaultAddress(response.data.baseAddress);
      } else {
        const placeholder = " ";
        setDefaultBaseAddress(placeholder);
        setTempDefaultAddress(placeholder);
      }
    } catch (error) {
      console.error("Error loading agent default base address:", error);
      const placeholder = " ";
      setDefaultBaseAddress(placeholder);
      setTempDefaultAddress(placeholder);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
    loadDefaultBaseAddress();
  }, [loadAddresses, loadDefaultBaseAddress]);

  const handleTrackingNumberChange = async (trackingNum) => {
    setNewAddress({ ...newAddress, trackingNumber: trackingNum });

    if (!trackingNum || trackingNum.trim() === "") {
      return;
    }

    try {
      // Check if tracking exists (agent trackings)
      const response = await API.get(
        `/buysellapi/trackings/by-number/${encodeURIComponent(
          trackingNum.trim()
        )}/`
      );

      if (response.data && response.data.shipping_mark) {
        setNewAddress((prev) => ({
          ...prev,
          markId: response.data.shipping_mark,
          trackingNumber: trackingNum,
        }));
        toast.success("Shipping mark auto-filled from tracking number");
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.warn("Error checking tracking number:", error);
      }
    }
  };

  const handleSaveDefaultAddress = async () => {
    try {
      setIsLoading(true);
      await API.post("/api/admin/agent/default-base-address", {
        baseAddress: tempDefaultAddress,
      });
      setDefaultBaseAddress(tempDefaultAddress);
      setIsEditingDefault(false);
      toast.success("Agent default base address updated successfully");
    } catch (error) {
      console.error("Error updating agent default base address:", error);
      toast.error("Failed to update agent default base address");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedAddresses([]);
    } else {
      setSelectedAddresses(addresses.map((addr) => addr.id || addr._id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectAddress = (addressId) => {
    if (selectedAddresses.includes(addressId)) {
      setSelectedAddresses(selectedAddresses.filter((id) => id !== addressId));
    } else {
      setSelectedAddresses([...selectedAddresses, addressId]);
    }
    setSelectAll(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        mark_id: newAddress.markId,
        name: newAddress.name,
        full_address: newAddress.fullAddress,
        shipping_mark: newAddress.shippingMark || newAddress.markId,
        tracking_number: newAddress.trackingNumber,
        is_agent_address: true, // Mark as agent address
      };

      if (editAddress) {
        await API.put(
          `/api/admin/agent/shipping-marks/${editAddress.id || editAddress._id}`,
          payload
        );
        toast.success("Agent address updated successfully");
      } else {
        await API.post("/api/admin/agent/shipping-marks", payload);
        toast.success("Agent address added successfully");
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
      console.error("Error saving agent address:", error);
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          "Failed to save agent address"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      if (deleteTarget === "selected") {
        // Bulk delete
        for (const id of selectedAddresses) {
          await API.delete(`/api/admin/agent/shipping-marks/${id}`);
        }
        toast.success(
          `${selectedAddresses.length} agent address(es) deleted successfully`
        );
        setSelectedAddresses([]);
        setSelectAll(false);
      } else {
        await API.delete(`/api/admin/agent/shipping-marks/${deleteTarget}`);
        toast.success("Agent address deleted successfully");
      }
      setShowDeleteModal(false);
      setDeleteTarget(null);
      loadAddresses();
    } catch (error) {
      console.error("Error deleting agent address:", error);
      toast.error("Failed to delete agent address");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (address) => {
    setEditAddress(address);
    setNewAddress({
      markId: address.markId || address.mark_id || "",
      name: address.name || "",
      fullAddress: address.fullAddress || address.full_address || "",
      shippingMark: address.shippingMark || address.shipping_mark || "",
      trackingNumber: address.trackingNumber || address.tracking_number || "",
    });
    setShowAddForm(true);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
          <FaUserTag className="text-blue-600" />
          Agent Address Management
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage shipping addresses specifically for agents. These addresses are separate from regular client addresses.
        </p>
      </div>

      {/* Default Base Address Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Agent Default Base Address
        </h3>
        {isEditingDefault ? (
          <div className="space-y-4">
            <textarea
              value={tempDefaultAddress}
              onChange={(e) => setTempDefaultAddress(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows="3"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveDefaultAddress}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <FaSave /> Save
              </button>
              <button
                onClick={() => {
                  setIsEditingDefault(false);
                  setTempDefaultAddress(defaultBaseAddress);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <p className="text-gray-700 dark:text-gray-300 flex-1">
              {defaultBaseAddress || "No default address set"}
            </p>
            <button
              onClick={() => setIsEditingDefault(true)}
              className="ml-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <FaEdit /> Edit
            </button>
          </div>
        )}
      </div>

      {/* Header with Actions */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search agent addresses..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-2">
          {selectedAddresses.length > 0 && (
            <button
              onClick={() => {
                setDeleteTarget("selected");
                setShowDeleteModal(true);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <FaTrash /> Delete Selected ({selectedAddresses.length})
            </button>
          )}
          <button
            onClick={() => {
              setEditAddress(null);
              setNewAddress({
                markId: "",
                name: "",
                fullAddress: "",
                shippingMark: "",
                trackingNumber: "",
              });
              setShowAddForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <FaPlus /> Add Agent Address
          </button>
        </div>
      </div>

      {/* Addresses Table */}
      {isLoading && addresses.length === 0 ? (
        <div className="text-center py-8">Loading agent addresses...</div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No agent addresses found
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                    onClick={() => handleSort("markId")}
                  >
                    <div className="flex items-center gap-2">
                      Mark ID
                      {sortField === "markId" &&
                        (sortDirection === "asc" ? (
                          <FaSortAmountUp />
                        ) : (
                          <FaSortAmountDown />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-2">
                      Name
                      {sortField === "name" &&
                        (sortDirection === "asc" ? (
                          <FaSortAmountUp />
                        ) : (
                          <FaSortAmountDown />
                        ))}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Full Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {addresses.map((address) => {
                  const addressId = address.id || address._id;
                  const isSelected = selectedAddresses.includes(addressId);
                  return (
                    <tr
                      key={addressId}
                      className={isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectAddress(addressId)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {address.markId || address.mark_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {address.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {address.fullAddress || address.full_address}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(address)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteTarget(addressId);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                {totalItems} agent addresses
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              {editAddress ? "Edit Agent Address" : "Add Agent Address"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mark ID *
                </label>
                <input
                  type="text"
                  required
                  value={newAddress.markId}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, markId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Address *
                </label>
                <textarea
                  required
                  value={newAddress.fullAddress}
                  onChange={(e) =>
                    setNewAddress({
                      ...newAddress,
                      fullAddress: e.target.value,
                    })
                  }
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={newAddress.trackingNumber}
                  onChange={(e) =>
                    handleTrackingNumberChange(e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Shipping Mark
                </label>
                <input
                  type="text"
                  value={newAddress.shippingMark}
                  onChange={(e) =>
                    setNewAddress({
                      ...newAddress,
                      shippingMark: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading
                    ? "Saving..."
                    : editAddress
                    ? "Update"
                    : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditAddress(null);
                    setNewAddress({
                      markId: "",
                      name: "",
                      fullAddress: "",
                      shippingMark: "",
                      trackingNumber: "",
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        title="Delete Agent Address"
        message={
          deleteTarget === "selected"
            ? `Are you sure you want to delete ${selectedAddresses.length} selected agent address(es)? This action cannot be undone.`
            : "Are you sure you want to delete this agent address? This action cannot be undone."
        }
      />
    </div>
  );
};

export default AgentAddressManagement;
