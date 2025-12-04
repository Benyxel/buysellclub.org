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
  FaUserTag,
} from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../../config/api";

const AgentShippingMarksManagement = () => {
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

      // Fetch agent shipping marks from agent-specific endpoint
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/agent/shipping-marks-list`,
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

      console.log("Agent Shipping Marks API Response:", response.data);

      let marks = [];
      let total = 0;

      // Handle different response formats
      if (response.data.results && Array.isArray(response.data.results)) {
        marks = response.data.results;
        total = response.data.count || response.data.total || marks.length;
      } else if (Array.isArray(response.data)) {
        marks = response.data;
        total = marks.length;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        marks = response.data.data;
        total = response.data.total || marks.length;
      }

      // Filter for agent marks if backend doesn't have separate endpoint
      // This is a fallback - ideally backend should have /api/admin/agent/shipping-marks-list
      marks = marks.filter(
        (mark) => mark.is_agent_mark || mark.created_by_agent || true
      );

      console.log("Parsed agent marks:", marks);
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
        createdAt: mark.created_at || mark.createdAt,
        updatedAt: mark.updated_at || mark.updatedAt,
      }));

      setShippingMarks(formattedMarks);
      setTotalItems(total);
      setTotalPages(Math.ceil(total / itemsPerPage));
    } catch (err) {
      console.error("Error fetching agent shipping marks:", err);
      setError(err.message || "Failed to load agent shipping marks");
      toast.error("Failed to load agent shipping marks");
      
      // Fallback: try to get from regular endpoint and filter
      try {
        const fallbackResponse = await axios.get(
          `${API_BASE_URL}/api/admin/shipping-marks-list`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("adminToken") || localStorage.getItem("token")}`,
            },
            params: {
              page: currentPage,
              limit: itemsPerPage,
              search: searchTerm,
            },
          }
        );
        let fallbackMarks = [];
        if (fallbackResponse.data.results) {
          fallbackMarks = fallbackResponse.data.results;
        } else if (Array.isArray(fallbackResponse.data)) {
          fallbackMarks = fallbackResponse.data;
        }
        // Filter for agent marks
        const agentMarks = fallbackMarks.filter(
          (mark) => mark.is_agent_mark || mark.created_by_agent
        );
        setShippingMarks(agentMarks);
        setTotalItems(agentMarks.length);
        setTotalPages(Math.ceil(agentMarks.length / itemsPerPage));
      } catch (fallbackErr) {
        console.error("Fallback fetch also failed:", fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, sortConfig]);

  useEffect(() => {
    fetchShippingMarks();
  }, [fetchShippingMarks]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleViewDetails = (mark) => {
    setSelectedMark(mark);
    setShowModal(true);
  };

  const copyToClipboard = async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState({ ...copiedState, [fieldName]: true });
      setTimeout(() => {
        setCopiedState({ ...copiedState, [fieldName]: false });
      }, 2000);
      toast.success(`${fieldName} copied to clipboard!`);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  };

  const filteredMarks = shippingMarks.filter((mark) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (mark.markId && mark.markId.toLowerCase().includes(term)) ||
      (mark.name && mark.name.toLowerCase().includes(term)) ||
      (mark.fullAddress && mark.fullAddress.toLowerCase().includes(term)) ||
      (mark.shippingMark && mark.shippingMark.toLowerCase().includes(term))
    );
  });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="py-6">
        <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FaUserTag className="text-blue-600" />
            Agent Shipping Marks Viewer
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View all shipping marks created specifically for agents. These marks are separate from regular client shipping marks.
          </p>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          {/* Search and Sort */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search agent shipping marks..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Loading agent shipping marks...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <FaInfoCircle className="text-red-600 dark:text-red-400" />
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Shipping Marks Table */}
          {!isLoading && !error && (
            <>
              {filteredMarks.length === 0 ? (
                <div className="text-center py-12">
                  <FaTruck className="mx-auto text-4xl text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No agent shipping marks found
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort("markId")}
                          >
                            <div className="flex items-center gap-2">
                              Mark ID
                              {sortConfig.key === "markId" &&
                                (sortConfig.direction === "asc" ? (
                                  <FaSortAmountUp />
                                ) : (
                                  <FaSortAmountDown />
                                ))}
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Full Address
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Shipping Mark
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort("createdAt")}
                          >
                            <div className="flex items-center gap-2">
                              Created At
                              {sortConfig.key === "createdAt" &&
                                (sortConfig.direction === "asc" ? (
                                  <FaSortAmountUp />
                                ) : (
                                  <FaSortAmountDown />
                                ))}
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredMarks.map((mark) => (
                          <tr
                            key={mark._id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {mark.markId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {mark.name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate">
                              {mark.fullAddress}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {mark.shippingMark}
                                </span>
                                <button
                                  onClick={() =>
                                    copyToClipboard(
                                      mark.shippingMark,
                                      "shippingMark"
                                    )
                                  }
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                  title="Copy shipping mark"
                                >
                                  {copiedState.shippingMark ? (
                                    <FaCheck className="text-green-600" />
                                  ) : (
                                    <FaCopy />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {mark.createdAt
                                ? new Date(mark.createdAt).toLocaleDateString()
                                : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleViewDetails(mark)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-600">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() =>
                            setCurrentPage(Math.max(1, currentPage - 1))
                          }
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            setCurrentPage(
                              Math.min(totalPages, currentPage + 1)
                            )
                          }
                          disabled={currentPage === totalPages}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            Showing{" "}
                            <span className="font-medium">
                              {(currentPage - 1) * itemsPerPage + 1}
                            </span>{" "}
                            to{" "}
                            <span className="font-medium">
                              {Math.min(
                                currentPage * itemsPerPage,
                                totalItems
                              )}
                            </span>{" "}
                            of <span className="font-medium">{totalItems}</span>{" "}
                            agent marks
                          </p>
                        </div>
                        <div>
                          <nav
                            className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                            aria-label="Pagination"
                          >
                            <button
                              onClick={() =>
                                setCurrentPage(Math.max(1, currentPage - 1))
                              }
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Previous
                            </button>
                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              Page {currentPage} of {totalPages}
                            </span>
                            <button
                              onClick={() =>
                                setCurrentPage(
                                  Math.min(totalPages, currentPage + 1)
                                )
                              }
                              disabled={currentPage === totalPages}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Next
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Details Modal */}
          {showModal && selectedMark && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div
                  className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                  onClick={() => setShowModal(false)}
                ></div>

                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                        Agent Shipping Mark Details
                      </h3>
                      <button
                        onClick={() => setShowModal(false)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <FaTimes />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Mark ID
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-sm text-gray-900 dark:text-white">
                            {selectedMark.markId}
                          </p>
                          <button
                            onClick={() =>
                              copyToClipboard(selectedMark.markId, "markId")
                            }
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {copiedState.markId ? (
                              <FaCheck className="text-green-600" />
                            ) : (
                              <FaCopy />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Name
                        </label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {selectedMark.name}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Full Address
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                            {selectedMark.fullAddress}
                          </p>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                selectedMark.fullAddress,
                                "fullAddress"
                              )
                            }
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {copiedState.fullAddress ? (
                              <FaCheck className="text-green-600" />
                            ) : (
                              <FaCopy />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Shipping Mark
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-sm text-gray-900 dark:text-white">
                            {selectedMark.shippingMark}
                          </p>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                selectedMark.shippingMark,
                                "shippingMark"
                              )
                            }
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {copiedState.shippingMark ? (
                              <FaCheck className="text-green-600" />
                            ) : (
                              <FaCopy />
                            )}
                          </button>
                        </div>
                      </div>
                      {selectedMark.createdAt && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Created At
                          </label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white">
                            {new Date(
                              selectedMark.createdAt
                            ).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AgentShippingMarksManagement;
