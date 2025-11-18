import React, { useState, useEffect, useCallback } from "react";
import {
  FaTruck,
  FaCopy,
  FaCheck,
  FaTimes,
  FaSortAmountDown,
  FaSortAmountUp,
  FaSearch,
  FaInfoCircle,
} from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../config/api";

const ShippingMarksDisplay = () => {
  const [shippingMarks, setShippingMarks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMark, setSelectedMark] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [copiedState, setCopiedState] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchShippingMarks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token =
        localStorage.getItem("adminToken") || localStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication token not found. Please log in.");
      }

      // Fetch shipping marks from API
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/shipping-marks-list`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          params: {
            page: currentPage,
            limit: itemsPerPage,
            search: searchTerm,
            sortField: sortConfig.key,
            sortDirection: sortConfig.direction,
          },
        }
      );

      console.log("API Response:", response.data);

      let marks = [];
      let total = 0;

      // Handle different response formats
      if (response.data.results && Array.isArray(response.data.results)) {
        // Paginated response
        marks = response.data.results;
        total = response.data.count || response.data.total || marks.length;
      } else if (Array.isArray(response.data)) {
        // Direct array response
        marks = response.data;
        total = marks.length;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        // Nested data response
        marks = response.data.data;
        total = response.data.total || marks.length;
      }

      console.log("Parsed marks:", marks);
      console.log("Total count:", total);

      // Map backend fields to frontend format
      const formattedMarks = marks.map((mark) => ({
        _id: mark.id || mark._id,
        markId: mark.mark_id || mark.markId,
        name: mark.name,
        fullAddress:
          mark.full_address ||
          mark.fullAddress ||
          `${mark.mark_id}:${mark.name}`,
        shippingMark:
          mark.shipping_mark ||
          mark.shippingMark ||
          `${mark.mark_id}:${mark.name}`,
        createdAt:
          mark.created_at || mark.createdAt || new Date().toISOString(),
        owner: mark.owner,
        ownerUsername: mark.owner?.username || "N/A",
        ownerFullName: mark.owner?.full_name || "N/A",
        ownerEmail: mark.owner?.email || "N/A",
      }));

      // Client-side filtering if search not handled by backend
      let filteredMarks = formattedMarks;
      if (searchTerm && !response.config.params?.search) {
        const term = searchTerm.toLowerCase();
        filteredMarks = formattedMarks.filter(
          (m) =>
            (m.markId && m.markId.toLowerCase().includes(term)) ||
            (m.name && m.name.toLowerCase().includes(term)) ||
            (m.fullAddress && m.fullAddress.toLowerCase().includes(term))
        );
      }

      // Client-side sorting if not handled by backend
      if (!response.config.params?.sortBy) {
        filteredMarks.sort((a, b) => {
          const aValue = a[sortConfig.key] || "";
          const bValue = b[sortConfig.key] || "";
          if (sortConfig.key === "createdAt") {
            return sortConfig.direction === "asc"
              ? new Date(aValue) - new Date(bValue)
              : new Date(bValue) - new Date(aValue);
          }
          if (typeof aValue === "string" && typeof bValue === "string") {
            return sortConfig.direction === "asc"
              ? aValue.localeCompare(bValue)
              : bValue.localeCompare(aValue);
          }
          return 0;
        });
      }

      // Client-side pagination if not handled by backend
      if (!response.config.params?.page) {
        setTotalItems(filteredMarks.length);
        setTotalPages(Math.ceil(filteredMarks.length / itemsPerPage));
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        setShippingMarks(filteredMarks.slice(startIndex, endIndex));
      } else {
        setTotalItems(total);
        setTotalPages(Math.ceil(total / itemsPerPage));
        setShippingMarks(filteredMarks);
      }
    } catch (error) {
      console.error("Error fetching shipping marks:", error);
      setError(error.message || "Failed to load your shipping marks");
      setShippingMarks([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, sortConfig, itemsPerPage]);

  useEffect(() => {
    fetchShippingMarks();
  }, [fetchShippingMarks]);

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);

      setCopiedState((prev) => ({
        ...prev,
        [field]: true,
      }));

      toast.success("Copied to clipboard!");

      // Reset copy state after 2 seconds
      setTimeout(() => {
        setCopiedState((prev) => ({
          ...prev,
          [field]: false,
        }));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard. Please try manually.");
    }
  };

  const viewMarkDetails = (mark) => {
    setSelectedMark(mark);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedMark(null);
  };

  const handleSort = (key) => {
    let direction = "asc";

    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when search term changes
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white flex items-center">
            <FaTruck className="text-primary mr-2" />
            Your Shipping Marks
          </h2>

          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search marks..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-red-800 dark:text-red-200">
            <p className="flex items-center">
              <FaInfoCircle className="mr-2" />
              {error}
            </p>
            <button
              onClick={fetchShippingMarks}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : shippingMarks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No shipping marks found. Create a new shipping mark using the
              Address Generator.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("markId")}
                  >
                    <div className="flex items-center">
                      Mark ID
                      {sortConfig.key === "markId" &&
                        (sortConfig.direction === "asc" ? (
                          <FaSortAmountUp className="ml-1" />
                        ) : (
                          <FaSortAmountDown className="ml-1" />
                        ))}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center">
                      Name
                      {sortConfig.key === "name" &&
                        (sortConfig.direction === "asc" ? (
                          <FaSortAmountUp className="ml-1" />
                        ) : (
                          <FaSortAmountDown className="ml-1" />
                        ))}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Owner
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center">
                      Created
                      {sortConfig.key === "createdAt" &&
                        (sortConfig.direction === "asc" ? (
                          <FaSortAmountUp className="ml-1" />
                        ) : (
                          <FaSortAmountDown className="ml-1" />
                        ))}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {shippingMarks.map((mark) => (
                  <tr
                    key={mark._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {mark.markId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {mark.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {mark.ownerFullName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {mark.ownerUsername}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {mark.createdAt
                        ? new Date(mark.createdAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => viewMarkDetails(mark)}
                        className="text-primary hover:text-primary-dark"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing{" "}
                  {shippingMarks.length
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
                                ? "bg-primary text-white"
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
        )}
      </div>

      {/* Detail Modal */}
      {showModal && selectedMark && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Shipping Mark Details
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Mark ID
                </p>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-gray-900 dark:text-white">
                    {selectedMark.markId}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Name
                </p>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-gray-900 dark:text-white">
                    {selectedMark.name}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Owner
                </p>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-gray-900 dark:text-white font-medium">
                    {selectedMark.ownerFullName}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Username: {selectedMark.ownerUsername}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Email: {selectedMark.ownerEmail}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Full Address
                </p>
                <div className="relative">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-gray-900 dark:text-white whitespace-pre-line break-words">
                      {selectedMark.fullAddress}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(selectedMark.fullAddress, "address")
                    }
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {copiedState.address ? (
                      <FaCheck className="w-5 h-5 text-green-500" />
                    ) : (
                      <FaCopy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Shipping Mark
                </p>
                <div className="relative">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-gray-900 dark:text-white break-words">
                      {selectedMark.shippingMark}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(selectedMark.shippingMark, "shippingMark")
                    }
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {copiedState.shippingMark ? (
                      <FaCheck className="w-5 h-5 text-green-500" />
                    ) : (
                      <FaCopy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {selectedMark.createdAt && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Created At
                  </p>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-gray-900 dark:text-white">
                      {new Date(selectedMark.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingMarksDisplay;
