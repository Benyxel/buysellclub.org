import React, { useState, useEffect, useCallback } from "react";
import {
  FaPlus,
  FaUserTag,
  FaMapMarkerAlt,
  FaEdit,
  FaSearch,
  FaSortAmountDown,
  FaSortAmountUp,
  FaTrash,
  FaDownload,
} from "react-icons/fa";
import { toast } from "../../utils/toast";
import API from "../../api";
import ConfirmModal from "../../components/shared/ConfirmModal";

const AgentAddressManagement = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [displayAddress, setDisplayAddress] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Table state for agent-generated addresses
  const [agentAddresses, setAgentAddresses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [selectedAddresses, setSelectedAddresses] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);


  const [newAddress, setNewAddress] = useState({
    markId: "",
    name: "",
    fullAddress: "",
    shippingMark: "",
    trackingNumber: "",
  });

  const loadDisplayAddress = useCallback(async () => {
    try {
      const response = await API.get("/api/admin/agent/display-address");
      if (response.data) {
        setDisplayAddress(response.data);
        console.log("Display address loaded:", response.data);
      } else {
        setDisplayAddress(null);
        console.log("No display address found");
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Error loading display address:", error);
      }
      setDisplayAddress(null);
    }
  }, []);

  const loadAgentAddresses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await API.get("/api/admin/shipping-marks", {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          sortField: sortField,
          sortDirection: sortDirection,
          search: searchTerm,
        },
        timeout: 30000,
      });

      let allAddresses = [];
      if (response.data && response.data.data) {
        allAddresses = response.data.data;
        setTotalItems(response.data.total);
        setTotalPages(response.data.totalPages);
      } else if (Array.isArray(response.data)) {
        allAddresses = response.data;
        setTotalItems(response.data.length);
        setTotalPages(Math.ceil(response.data.length / itemsPerPage));
      }

      // Filter to only show agent-generated addresses (those with shipping marks)
      // Exclude the base display address (has empty shipping mark)
      const agentGenerated = allAddresses.filter(addr => {
        const shippingMark = addr.shippingMark || addr.shipping_mark || "";
        const hasShippingMark = shippingMark.trim() !== "";
        // Exclude the display address (base address for agents)
        const isDisplayAddr = addr.isDisplayAddress || addr.is_display_address;
        return hasShippingMark && !isDisplayAddr;
      });

      setAgentAddresses(agentGenerated);
    } catch (error) {
      console.error("Error loading agent addresses:", error);
      toast.error("Failed to load agent addresses");
      setAgentAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, sortField, sortDirection, searchTerm]);

  useEffect(() => {
    loadDisplayAddress();
    loadAgentAddresses();
  }, [loadDisplayAddress, loadAgentAddresses]);




  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isEditing && displayAddress) {
        // Editing existing display address
        const addressId = displayAddress._id || displayAddress.id;
        const payload = {
          fullAddress: newAddress.fullAddress,
          shippingMark: "", // Empty for agent base addresses
          isDisplayAddress: true, // Ensure it remains as display address
        };

        await API.put(`/api/admin/shipping-marks/${addressId}`, payload);
        toast.success("Agent base address updated successfully!");
        
        // Wait a moment then reload display address to ensure it's persisted
        setTimeout(async () => {
          await loadDisplayAddress();
        }, 500);
      } else {
        // Adding new address - but only one is allowed
        // If an address already exists, replace it instead of creating a new one
        if (displayAddress) {
          // Update existing address instead of creating new one
          const addressId = displayAddress._id || displayAddress.id;
          const markId = displayAddress.markId || displayAddress.mark_id || `AGENT-${Date.now()}`;
          const name = displayAddress.name || "Agent Address";
          
          const payload = {
            markId: markId,
            name: name,
            fullAddress: newAddress.fullAddress,
            shippingMark: "", // Empty for agent base addresses
            trackingNumber: newAddress.trackingNumber || "",
            isDisplayAddress: true,
          };

          await API.put(`/api/admin/shipping-marks/${addressId}`, payload);
          toast.success("Agent base address updated successfully! Only one address is allowed.");
        } else {
          // No existing address, create new one
          const markId = newAddress.markId || `AGENT-${Date.now()}`;
          const name = newAddress.name || "Agent Address";
          
          const payload = {
            markId: markId,
            name: name,
            fullAddress: newAddress.fullAddress,
            shippingMark: "", // Empty for agent base addresses
            trackingNumber: newAddress.trackingNumber || "",
            isDisplayAddress: true,
          };

          const response = await API.post("/api/admin/shipping-marks", payload);
          const addedAddressId = response.data?._id || response.data?.id;

          if (!addedAddressId) {
            throw new Error("Address was created but no ID was returned");
          }

          // Ensure it's set as display address
          try {
            await API.put(`/api/admin/shipping-marks/${addedAddressId}`, {
              isDisplayAddress: true,
            });
          } catch (error) {
            console.error("Error setting display address:", error);
          }

          toast.success("Agent base address saved successfully! It will be displayed to agents.");
        }
        
        // Reload display address
        await loadDisplayAddress();
      }

      setShowAddForm(false);
      setIsEditing(false);
      setNewAddress({
        markId: "",
        name: "",
        fullAddress: "",
        shippingMark: "",
        trackingNumber: "",
      });
      // Reload agent addresses table after adding/editing
      loadAgentAddresses();
    } catch (error) {
      console.error("Error saving agent address:", error);
      const errorData = error.response?.data;
      let errorMessage = "Failed to save agent address";
      
      if (errorData) {
        // Handle validation errors
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'object') {
          // Handle field-specific errors
          const fieldErrors = Object.entries(errorData)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ');
          if (fieldErrors) {
            errorMessage = fieldErrors;
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      console.error("Full error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Table handler functions
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
      setSelectedAddresses(agentAddresses.map((item) => item._id || item.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectAddress = (id) => {
    if (selectedAddresses.includes(id)) {
      setSelectedAddresses(selectedAddresses.filter((item) => item !== id));
    } else {
      setSelectedAddresses([...selectedAddresses, id]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedAddresses.length === 0) return;
    setDeleteTarget("selected");
    setShowDeleteModal(true);
  };

  const confirmDeleteSelected = async () => {
    try {
      setIsLoading(true);
      for (const id of selectedAddresses) {
        await API.delete(`/api/admin/shipping-marks/${id}`);
      }
      toast.success(`Deleted ${selectedAddresses.length} addresses successfully`);
      loadAgentAddresses();
      setSelectedAddresses([]);
      setSelectAll(false);
    } catch (error) {
      console.error("Error deleting addresses:", error);
      toast.error("Failed to delete addresses");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteSingle = async () => {
    try {
      setIsLoading(true);
      await API.delete(`/api/admin/shipping-marks/${deleteTarget}`);
      toast.success("Address deleted successfully");
      loadAgentAddresses();
    } catch (error) {
      console.error("Error deleting address:", error);
      toast.error("Failed to delete address");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTarget === "selected") {
      confirmDeleteSelected();
    } else {
      confirmDeleteSingle();
    }
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
          <FaUserTag className="text-blue-600" />
          Agent Address Management
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Set the base shipping address that will be displayed to agents on their Shipping Marks & Addresses page. 
          Only one address is allowed. You can edit or replace the existing address.
        </p>
      </div>

      {/* Display Address Section */}
      {displayAddress && !isEditing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FaMapMarkerAlt className="text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Current Display Address for Agents
              </h3>
            </div>
            <button
              onClick={() => {
                setIsEditing(true);
                setNewAddress({
                  markId: displayAddress.markId || displayAddress.mark_id || "",
                  name: displayAddress.name || "",
                  fullAddress: displayAddress.fullAddress || displayAddress.full_address || "",
                  shippingMark: "",
                  trackingNumber: displayAddress.trackingNumber || displayAddress.tracking_number || "",
                });
                setShowAddForm(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FaEdit /> Edit Address
            </button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {displayAddress.name || "Agent Base Address"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 break-words whitespace-pre-wrap">
              {displayAddress.fullAddress || displayAddress.full_address}
            </p>
          </div>
        </div>
      )}

      {/* Add Address Form */}
      {(!displayAddress || isEditing || showAddForm) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {isEditing ? "Edit Agent Address" : "Set Agent Address"}
            </h3>
            {showAddForm && (
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setIsEditing(false);
                  setNewAddress({
                    markId: "",
                    name: "",
                    fullAddress: "",
                    shippingMark: "",
                    trackingNumber: "",
                  });
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            )}
            {!showAddForm && !isEditing && !displayAddress && (
              <button
                onClick={() => {
                  setNewAddress({
                    markId: "",
                    name: "",
                    fullAddress: "",
                    shippingMark: "",
                    trackingNumber: "",
                  });
                  setShowAddForm(true);
                  setIsEditing(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <FaPlus /> Set Address
              </button>
            )}
          </div>

        {showAddForm && (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                rows="5"
                placeholder="Enter the complete shipping address"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update Address" : "Add Address")}
              </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setIsEditing(false);
                    setNewAddress({
                      markId: "",
                      name: "",
                      fullAddress: "",
                      shippingMark: "",
                      trackingNumber: "",
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
            </div>
          </form>
        )}
        </div>
      )}

      {/* Agent-Generated Addresses Table */}
      <div className="mt-8">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            Agent-Generated Addresses
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage addresses generated by agents
          </p>
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by mark ID, name, or address..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDeleteSelected}
              disabled={selectedAddresses.length === 0}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                selectedAddresses.length > 0
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              } transition-colors`}
            >
              <FaTrash /> Delete Selected
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="py-3 px-4 text-left">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="mr-2 rounded"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Select All
                      </span>
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left">
                    <button
                      onClick={() => handleSort("markId")}
                      className="flex items-center text-gray-700 dark:text-gray-300 font-medium text-sm"
                    >
                      Mark ID
                      {sortField === "markId" &&
                        (sortDirection === "asc" ? (
                          <FaSortAmountUp className="ml-1" />
                        ) : (
                          <FaSortAmountDown className="ml-1" />
                        ))}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left">
                    <button
                      onClick={() => handleSort("name")}
                      className="flex items-center text-gray-700 dark:text-gray-300 font-medium text-sm"
                    >
                      Name
                      {sortField === "name" &&
                        (sortDirection === "asc" ? (
                          <FaSortAmountUp className="ml-1" />
                        ) : (
                          <FaSortAmountDown className="ml-1" />
                        ))}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left">Address</th>
                  <th className="py-3 px-4 text-left">Shipping Mark</th>
                  <th className="py-3 px-4 text-left">
                    <button
                      onClick={() => handleSort("createdAt")}
                      className="flex items-center text-gray-700 dark:text-gray-300 font-medium text-sm"
                    >
                      Created At
                      {sortField === "createdAt" &&
                        (sortDirection === "asc" ? (
                          <FaSortAmountUp className="ml-1" />
                        ) : (
                          <FaSortAmountDown className="ml-1" />
                        ))}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {agentAddresses.length > 0 ? (
                  agentAddresses.map((address) => {
                    const addressId = address._id || address.id;
                    return (
                      <tr
                        key={addressId}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedAddresses.includes(addressId)}
                            onChange={() => handleSelectAddress(addressId)}
                            className="rounded"
                          />
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {address.markId || address.mark_id}
                        </td>
                        <td className="py-3 px-4">{address.name}</td>
                        <td className="py-3 px-4">
                          <div className="max-w-xs truncate">
                            {address.fullAddress || address.full_address}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {address.shippingMark || address.shipping_mark}
                        </td>
                        <td className="py-3 px-4">
                          {address.createdAt
                            ? new Date(address.createdAt).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setDeleteTarget(addressId);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete address"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      className="py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      No agent-generated addresses found.
                      {searchTerm && " Try a different search term."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing{" "}
                {agentAddresses.length
                  ? (currentPage - 1) * itemsPerPage + 1
                  : 0}
                -{Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                {totalItems} items
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === 1
                      ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  First
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === 1
                      ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  Previous
                </button>

                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {[...Array(totalPages).keys()].map((number) => {
                    if (
                      number + 1 === 1 ||
                      number + 1 === totalPages ||
                      (number + 1 >= currentPage - 1 &&
                        number + 1 <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={number}
                          onClick={() => handlePageChange(number + 1)}
                          className={`w-8 h-8 flex items-center justify-center rounded-md ${
                            currentPage === number + 1
                              ? "bg-blue-600 text-white"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          {number + 1}
                        </button>
                      );
                    } else if (
                      (number + 1 === currentPage - 2 && currentPage > 3) ||
                      (number + 1 === currentPage + 2 &&
                        currentPage < totalPages - 2)
                    ) {
                      return (
                        <span key={number} className="text-gray-500">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === totalPages
                      ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  Next
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === totalPages
                      ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Address"
        message={
          deleteTarget === "selected"
            ? `Are you sure you want to delete ${selectedAddresses.length} address${
                selectedAddresses.length > 1 ? "es" : ""
              }? This action cannot be undone.`
            : "Are you sure you want to delete this address? This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default AgentAddressManagement;
