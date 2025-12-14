import React, { useState, useEffect } from "react";
import { FaBell, FaTruck, FaCheckCircle, FaExclamationTriangle, FaSearch, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { toast } from "../../utils/toast";
import API from "../../api";

const AgentPackageUpdates = () => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("updated_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUpdates();
    // Set up polling for updates every 15 seconds
    const interval = setInterval(fetchUpdates, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      // Fetch agent trackings to get package updates
      const response = await API.get("/buysellapi/agent/trackings/");
      const trackings = Array.isArray(response.data) ? response.data : [];
      
      // Transform trackings into updates format
      const updatesList = trackings.map((tracking) => ({
        id: tracking.id,
        tracking_number: tracking.tracking_number,
        status: tracking.status,
        status_label: getStatusLabel(tracking.status),
        updated_at: tracking.updated_at || tracking.date_added,
        shipping_mark: tracking.shipping_mark,
        cbm: tracking.cbm,
        container: tracking.container,
      }));

      setUpdates(updatesList);
    } catch (error) {
      console.error("Error fetching package updates:", error);
      if (updates.length === 0) {
        toast.error("Failed to fetch package updates");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      pending: "Pending",
      in_transit: "In Transit",
      arrived: "Arrived (China)",
      vessel: "On The Vessel",
      clearing: "Clearing",
      arrived_ghana: "Arrived (Ghana)",
      off_loading: "Off Loading",
      pick_up: "Ready for Pickup",
    };
    return statusMap[status] || status;
  };

  const getStatusIcon = (status) => {
    if (status === "pick_up" || status === "arrived_ghana") {
      return <FaCheckCircle className="text-green-600" />;
    }
    if (status === "pending" || status === "clearing") {
      return <FaExclamationTriangle className="text-yellow-600" />;
    }
    return <FaTruck className="text-blue-600" />;
  };

  const getStatusColor = (status) => {
    if (status === "pick_up" || status === "arrived_ghana") {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    }
    if (status === "pending" || status === "clearing") {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  };

  const filteredUpdates = updates.filter((update) => {
    const matchesSearch =
      update.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      update.shipping_mark?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || update.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Sort updates
  const sortedUpdates = [...filteredUpdates].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortField) {
      case "tracking_number":
        aValue = a.tracking_number || "";
        bValue = b.tracking_number || "";
        break;
      case "status":
        aValue = a.status || "";
        bValue = b.status || "";
        break;
      case "shipping_mark":
        aValue = a.shipping_mark || "";
        bValue = b.shipping_mark || "";
        break;
      case "updated_at":
      default:
        aValue = new Date(a.updated_at || 0).getTime();
        bValue = new Date(b.updated_at || 0).getTime();
        break;
    }
    
    if (typeof aValue === "string") {
      return sortDirection === "asc" 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else {
      return sortDirection === "asc" 
        ? aValue - bValue
        : bValue - aValue;
    }
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedUpdates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUpdates = sortedUpdates.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <FaSort className="text-gray-400" />;
    }
    return sortDirection === "asc" 
      ? <FaSortUp className="text-pink-600" />
      : <FaSortDown className="text-pink-600" />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <FaBell className="text-pink-600" />
          Package Updates
        </h2>
        <button
          onClick={fetchUpdates}
          className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tracking number or shipping mark..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_transit">In Transit</option>
          <option value="arrived">Arrived (China)</option>
          <option value="vessel">On The Vessel</option>
          <option value="clearing">Clearing</option>
          <option value="arrived_ghana">Arrived (Ghana)</option>
          <option value="off_loading">Off Loading</option>
          <option value="pick_up">Ready for Pickup</option>
        </select>
      </div>

      {/* Updates List */}
      {loading && updates.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading updates...</p>
        </div>
      ) : sortedUpdates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FaTruck className="text-6xl text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium">No package updates found</p>
          <p className="text-sm mt-2">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <>
          {/* Results count */}
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {startIndex + 1}-{Math.min(endIndex, sortedUpdates.length)} of {sortedUpdates.length} packages
          </div>

          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort("tracking_number")}
                  >
                    <div className="flex items-center gap-2">
                      Tracking Number
                      {getSortIcon("tracking_number")}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {getSortIcon("status")}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort("shipping_mark")}
                  >
                    <div className="flex items-center gap-2">
                      Shipping Mark
                      {getSortIcon("shipping_mark")}
                    </div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    CBM
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Container
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort("updated_at")}
                  >
                    <div className="flex items-center gap-2">
                      Last Updated
                      {getSortIcon("updated_at")}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {currentUpdates.map((update) => (
                  <tr 
                    key={update.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(update.status)}
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {update.tracking_number || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          update.status
                        )}`}
                      >
                        {update.status_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {update.shipping_mark || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {update.cbm || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {update.container?.container_number || update.container || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {update.updated_at
                        ? new Date(update.updated_at).toLocaleString()
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
              >
                <span>←</span>
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg transition-colors duration-200 ${
                      currentPage === page
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
              >
                Next
                <span>→</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AgentPackageUpdates;



