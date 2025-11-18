import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaSortAmountDown,
  FaSortAmountUp,
  FaTrash,
  FaDownload,
  FaPlus,
  FaEdit,
  FaCheckCircle,
  FaTimesCircle,
  FaSave,
} from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../../api";
import ConfirmModal from "../../components/shared/ConfirmModal";

const ShippingAddressesAdmin = () => {
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
  const [deleteTarget, setDeleteTarget] = useState(null); // 'selected' or specific address id

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Default base address management
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

  // Memoize loaders to satisfy exhaustive-deps and avoid recreations
  const loadAddresses = React.useCallback(async () => {
    try {
      setIsLoading(true);

      // First try the paginated endpoint
      try {
        console.log("Fetching shipping addresses with params:", {
          page: currentPage,
          limit: itemsPerPage,
          sortField,
          sortDirection,
          search: searchTerm,
        });

        const response = await API.get("/api/admin/shipping-marks", {
          params: {
            page: currentPage,
            limit: itemsPerPage,
            sortField: sortField,
            sortDirection: sortDirection,
            search: searchTerm,
          },
        });

        console.log("API Response:", response.data);

        if (response.data && response.data.data) {
          // New API format with pagination
          console.log(
            "Using paginated format, loaded",
            response.data.data.length,
            "addresses"
          );
          setAddresses(response.data.data);
          setTotalItems(response.data.total);
          setTotalPages(response.data.totalPages);
        } else if (Array.isArray(response.data)) {
          // Old API format without pagination
          console.log(
            "Using array format, loaded",
            response.data.length,
            "addresses"
          );
          setAddresses(response.data);
          setTotalItems(response.data.length);
          setTotalPages(Math.ceil(response.data.length / itemsPerPage));
        } else {
          console.error("Unexpected API response format:", response.data);
          setAddresses([]);
          setTotalItems(0);
          setTotalPages(1);
        }
      } catch (error) {
        console.error(
          "Error with paginated endpoint:",
          error.response?.status,
          error.response?.data,
          error.message
        );

        // Fallback to non-paginated endpoint
        const fallbackResponse = await API.get("/api/admin/shipping-marks");

        if (Array.isArray(fallbackResponse.data)) {
          // Handle data manually for pagination
          const allData = fallbackResponse.data;
          setTotalItems(allData.length);
          setTotalPages(Math.ceil(allData.length / itemsPerPage));

          // Client-side pagination as fallback
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;

          // Client-side sorting
          const sortedData = [...allData].sort((a, b) => {
            const aValue = a[sortField] || "";
            const bValue = b[sortField] || "";

            if (sortField === "createdAt") {
              const dateA = new Date(aValue).getTime() || 0;
              const dateB = new Date(bValue).getTime() || 0;
              return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
            }

            if (typeof aValue === "string" && typeof bValue === "string") {
              return sortDirection === "asc"
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
            }

            return sortDirection === "asc"
              ? aValue > bValue
                ? 1
                : -1
              : aValue < bValue
              ? 1
              : -1;
          });

          // Client-side filtering
          let filteredData = sortedData;
          if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredData = sortedData.filter(
              (item) =>
                (item.markId && item.markId.toLowerCase().includes(term)) ||
                (item.name && item.name.toLowerCase().includes(term)) ||
                (item.fullAddress &&
                  item.fullAddress.toLowerCase().includes(term))
            );
          }

          // Apply pagination
          setAddresses(filteredData.slice(startIndex, endIndex));
        } else {
          setAddresses([]);
          setTotalItems(0);
          setTotalPages(1);
        }
      }
    } catch (error) {
      console.error("Error loading shipping addresses:", error);
      toast.error(
        `Failed to load shipping addresses: ${
          error.response?.status || error.message
        }`
      );
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, sortField, sortDirection, searchTerm]);

  const loadDefaultBaseAddress = React.useCallback(async () => {
    try {
      // Load the default base address from the API
      const response = await API.get("/api/admin/default-base-address");

      if (response.data && response.data.baseAddress) {
        setDefaultBaseAddress(response.data.baseAddress);
        setTempDefaultAddress(response.data.baseAddress);
      } else {
        // If no default address is set, use a placeholder
        const placeholder = " ";
        setDefaultBaseAddress(placeholder);
        setTempDefaultAddress(placeholder);
      }
    } catch (error) {
      console.error("Error loading default base address:", error);
      // Print more detailed error info
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }

      // Fallback to a default value if the API call fails
      const placeholder =
        " FOFOOFOIMPORT  Phone number :18084390850 Address:广东省深圳市宝安区石岩街道金台路7号伟建产业园B栋106户*fofoofo 加纳";
      setDefaultBaseAddress(placeholder);
      setTempDefaultAddress(placeholder);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
    loadDefaultBaseAddress();
  }, [loadAddresses, loadDefaultBaseAddress]);

  // Check tracking number and auto-fill shipping mark
  const handleTrackingNumberChange = async (trackingNum) => {
    setNewAddress({ ...newAddress, trackingNumber: trackingNum });

    if (!trackingNum || trackingNum.trim() === "") {
      return;
    }

    try {
      // Check if tracking exists in backend
      const response = await API.get(
        `/buysellapi/trackings/by-number/${encodeURIComponent(
          trackingNum.trim()
        )}/`
      );

      if (response.data && response.data.shipping_mark) {
        // Auto-fill the markId (shipping mark) from the tracking
        setNewAddress((prev) => ({
          ...prev,
          markId: response.data.shipping_mark,
          trackingNumber: trackingNum,
        }));
        toast.success("Shipping mark auto-filled from tracking number");
      }
    } catch (error) {
      // Silently fail if tracking not found (404) or other errors
      if (error.response?.status !== 404) {
        console.warn("Error checking tracking number:", error);
      }
    }
  };

  const handleSaveDefaultAddress = async () => {
    try {
      setIsLoading(true);

      // Update the default base address via API
      await API.post("/api/admin/default-base-address", {
        baseAddress: tempDefaultAddress,
      });

      setDefaultBaseAddress(tempDefaultAddress);
      setIsEditingDefault(false);
      toast.success("Default base address updated successfully");
    } catch (error) {
      console.error("Error updating default base address:", error);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
        toast.error(
          `Failed to update default base address: ${error.response.status} - ${
            error.response.data.message || "Unknown error"
          }`
        );
      } else {
        toast.error(`Failed to update default base address: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortDirection("desc");
    }
    // Reset to first page when sorting changes
    setCurrentPage(1);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedAddresses([]);
    } else {
      setSelectedAddresses(addresses.map((item) => item._id));
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

      // Delete each selected address
      for (const id of selectedAddresses) {
        await API.delete(`/api/admin/shipping-marks/${id}`);
      }

      toast.success(
        `Deleted ${selectedAddresses.length} shipping addresses successfully`
      );
      loadAddresses();
      setSelectedAddresses([]);
      setSelectAll(false);
    } catch (error) {
      console.error("Error deleting shipping addresses:", error);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
        toast.error(
          `Failed to delete shipping addresses: ${error.response.status} - ${
            error.response.data.message || "Unknown error"
          }`
        );
      } else {
        toast.error(`Failed to delete shipping addresses: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteSingle = async () => {
    try {
      setIsLoading(true);

      await API.delete(`/api/admin/shipping-marks/${deleteTarget}`);

      toast.success("Shipping address deleted successfully");
      loadAddresses();
    } catch (error) {
      console.error("Error deleting shipping address:", error);
      if (error.response) {
        toast.error(
          `Failed to delete shipping address: ${error.response.status} - ${
            error.response.data.message || "Unknown error"
          }`
        );
      } else {
        toast.error(`Failed to delete shipping address: ${error.message}`);
      }
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
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();

    // Validation
    if (!newAddress.markId || !newAddress.name) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setIsLoading(true);

      // Generate full address and shipping mark
      const fullAddress = `${newAddress.markId} - ${newAddress.name}\n${defaultBaseAddress}`;
      const shippingMark = `${newAddress.markId}:${newAddress.name}`;

      // Check if editing or adding new
      if (editAddress) {
        // Update existing address
        await API.put(`/api/admin/shipping-marks/${editAddress._id}`, {
          markId: newAddress.markId,
          name: newAddress.name,
          fullAddress: fullAddress,
          shippingMark: shippingMark,
        });

        toast.success(
          `Shipping address ${newAddress.markId} updated successfully`
        );
      } else {
        // Add new address
        await API.post("/api/admin/shipping-marks", {
          markId: newAddress.markId,
          name: newAddress.name,
          fullAddress: fullAddress,
          shippingMark: shippingMark,
        });

        toast.success(
          `Shipping address ${newAddress.markId} added successfully`
        );
      }

      // Refresh addresses
      loadAddresses();

      // Reset form
      setNewAddress({
        markId: "",
        name: "",
        fullAddress: "",
        shippingMark: "",
        trackingNumber: "",
      });
      setEditAddress(null);
      setShowAddForm(false);
    } catch (error) {
      console.error("Error saving shipping address:", error);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
        toast.error(
          `Failed to save shipping address: ${error.response.status} - ${
            error.response.data.message || "Unknown error"
          }`
        );
      } else {
        toast.error(`Failed to save shipping address: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditAddress = (address) => {
    setEditAddress(address);
    setNewAddress({
      markId: address.markId,
      name: address.name,
      trackingNumber: "",
    });
    setShowAddForm(true);
  };

  const exportToCSV = () => {
    if (addresses.length === 0) return;

    const headers = [
      "Mark ID",
      "Name",
      "Full Address",
      "Shipping Mark",
      "Created At",
      "Updated At",
    ];

    const csvContent = [
      headers.join(","),
      ...addresses.map((item) =>
        [
          item.markId || "",
          `"${(item.name || "").replace(/"/g, '""')}"`,
          `"${(item.fullAddress || "")
            .replace(/"/g, '""')
            .replace(/\n/g, " ")}"`,
          `"${(item.shippingMark || "").replace(/"/g, '""')}"`,
          item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "",
          item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `shipping_addresses_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateNewMarkId = () => {
    // Generate next Mark ID based on existing addresses (fallback to random)
    try {
      const prefix = "M856-FIM";
      const numbers = addresses
        .map((a) => a.markId || "")
        .filter((id) => id.startsWith(prefix))
        .map((id) => parseInt(id.replace(prefix, ""), 10))
        .filter((n) => !Number.isNaN(n));
      const next = numbers.length ? Math.max(...numbers) + 1 : 1;
      const nextId = `${prefix}${String(next).padStart(3, "0")}`;
      setNewAddress((prev) => ({ ...prev, markId: nextId }));
    } catch {
      const fallbackId = `M856-FIM${Math.floor(Math.random() * 999)
        .toString()
        .padStart(3, "0")}`;
      setNewAddress((prev) => ({ ...prev, markId: fallbackId }));
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when search term changes
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Shipping Addresses Management
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Create and manage shipping addresses and configure the default base
          address used in the Fofoofo Address Generator
        </p>
      </div>

      {/* Default Base Address Management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
          Default Base Address
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          This is the default base address used when generating new shipping
          addresses in the Fofoofo Address Generator.
        </p>

        {isEditingDefault ? (
          <div className="mb-4">
            <textarea
              value={tempDefaultAddress}
              onChange={(e) => setTempDefaultAddress(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
              rows={4}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSaveDefaultAddress}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <FaSave /> Save Changes
              </button>
              <button
                onClick={() => {
                  setTempDefaultAddress(defaultBaseAddress);
                  setIsEditingDefault(false);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <FaTimesCircle /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg break-words whitespace-pre-wrap">
              {defaultBaseAddress}
            </div>
            <button
              onClick={() => setIsEditingDefault(true)}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 w-auto"
            >
              <FaEdit /> Edit Default Address
            </button>
          </div>
        )}
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
            onClick={() => {
              setEditAddress(null);
              setNewAddress({
                markId: "",
                name: "",
                fullAddress: "",
                shippingMark: "",
              });
              generateNewMarkId();
              setShowAddForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FaPlus /> Add Shipping Address
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <FaDownload /> Export CSV
          </button>
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
              {addresses.length > 0 ? (
                addresses.map((address) => (
                  <tr
                    key={address._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedAddresses.includes(address._id)}
                        onChange={() => handleSelectAddress(address._id)}
                        className="rounded"
                      />
                    </td>
                    <td className="py-3 px-4 font-medium">{address.markId}</td>
                    <td className="py-3 px-4">{address.name}</td>
                    <td className="py-3 px-4">
                      <div className="max-w-xs truncate">
                        {address.fullAddress}
                      </div>
                    </td>
                    <td className="py-3 px-4">{address.shippingMark}</td>
                    <td className="py-3 px-4">
                      {address.createdAt
                        ? new Date(address.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditAddress(address)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit address"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(address._id);
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
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    No shipping addresses found.{" "}
                    {searchTerm && "Try a different search term."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing{" "}
            {addresses.length ? (currentPage - 1) * itemsPerPage + 1 : 0}-
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
            items
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
                // Show current page, and 1 page before and after
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
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        {totalItems > 0
          ? `Showing ${Math.min(
              addresses.length,
              itemsPerPage
            )} of ${totalItems} shipping addresses`
          : "No shipping addresses found"}
        {selectedAddresses.length > 0 &&
          ` (${selectedAddresses.length} selected)`}
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editAddress
                  ? "Edit Shipping Address"
                  : "Add New Shipping Address"}
              </h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <FaTimesCircle />
              </button>
            </div>

            <form onSubmit={handleAddAddress}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="trackingNumber"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Tracking Number
                  </label>
                  <input
                    id="trackingNumber"
                    type="text"
                    value={newAddress.trackingNumber}
                    onChange={(e) => handleTrackingNumberChange(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter tracking number to auto-fill mark"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Optional: Enter tracking number to automatically pull the
                    shipping mark
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="markId"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Mark ID*
                  </label>
                  <input
                    id="markId"
                    type="text"
                    value={newAddress.markId}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, markId: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={editAddress !== null}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Unique identifier for this shipping address (e.g.,
                    M856-FIM001)
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Name*
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={newAddress.name}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, name: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Name of the recipient
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Preview
                  </label>
                  <div className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                    <p className="font-medium">Full Address:</p>
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {newAddress.markId && newAddress.name
                        ? `${newAddress.markId} - ${newAddress.name}\n${defaultBaseAddress}`
                        : "Fill in the form to see a preview"}
                    </p>
                    <p className="font-medium mt-2">Shipping Mark:</p>
                    <p className="text-sm">
                      {newAddress.markId && newAddress.name
                        ? `${newAddress.markId}:${newAddress.name}`
                        : "Fill in the form to see a preview"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <FaCheckCircle /> {editAddress ? "Update" : "Add"} Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Shipping Address"
        message={
          deleteTarget === "selected"
            ? `Are you sure you want to delete ${
                selectedAddresses.length
              } shipping address${
                selectedAddresses.length > 1 ? "es" : ""
              }? This action cannot be undone.`
            : "Are you sure you want to delete this shipping address? This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default ShippingAddressesAdmin;
