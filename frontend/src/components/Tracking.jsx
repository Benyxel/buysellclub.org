import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaSortAmountDown,
  FaSortAmountUp,
  FaFilter,
  FaDownload,
  FaTrash,
} from "react-icons/fa";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

const Tracking = () => {
  const [trackings, setTrackings] = useState([]);
  const [filteredTrackings, setFilteredTrackings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("addedDate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTrackings, setSelectedTrackings] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decodedToken = JSON.parse(atob(token.split(".")[1]));
        setUserId(decodedToken.userId);
        setIsAdmin(decodedToken.role === "admin");
      } catch (err) {
        console.error("Error decoding token:", err);
      }
    }
    loadTrackings();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [trackings, searchTerm, sortField, sortDirection, filterStatus]);

  const loadTrackings = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch real tracking data from backend
      const response = await axios.get(`${API_BASE_URL}/buysellapi/trackings/`);

      if (response.data && Array.isArray(response.data)) {
        // Transform backend data to frontend format
        const transformed = response.data.map((t) => ({
          TrackingNum: t.tracking_number,
          Sender: t.shipping_mark || "N/A",
          Status: t.status || "Pending",
          Product: "Package", // Backend doesn't have product field
          Quantity: 1,
          AddedDate: t.date_added,
          LastUpdated: t.date_added,
          StatusHistory: [
            {
              status: t.status || "Pending",
              date: t.date_added,
              details: t.action || "Tracking created",
            },
          ],
          _id: t.id,
        }));

        setTrackings(transformed);
        setFilteredTrackings(transformed);
      }
    } catch (err) {
      console.error("Error loading trackings:", err);
      setError("Failed to load tracking data. Please try again.");
      setTrackings([]);
      setFilteredTrackings([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let result = [...trackings];

    if (filterStatus !== "all") {
      result = result.filter(
        (item) =>
          item.Status &&
          item.Status.toLowerCase() === filterStatus.toLowerCase()
      );
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          (item.TrackingNum && item.TrackingNum.toLowerCase().includes(term)) ||
          (item.Sender && item.Sender.toLowerCase().includes(term)) ||
          (item.Product && item.Product.toLowerCase().includes(term))
      );
    }

    result.sort((a, b) => {
      let fieldA, fieldB;

      switch (sortField) {
        case "trackingNum":
          fieldA = a.TrackingNum || "";
          fieldB = b.TrackingNum || "";
          break;
        case "sender":
          fieldA = a.Sender || "";
          fieldB = b.Sender || "";
          break;
        case "status":
          fieldA = a.Status || "";
          fieldB = b.Status || "";
          break;
        case "addedDate":
          fieldA = a.AddedDate ? new Date(a.AddedDate).getTime() : 0;
          fieldB = b.AddedDate ? new Date(b.AddedDate).getTime() : 0;
          break;
        default:
          fieldA = a.AddedDate ? new Date(a.AddedDate).getTime() : 0;
          fieldB = b.AddedDate ? new Date(b.AddedDate).getTime() : 0;
      }

      if (sortDirection === "asc") {
        return fieldA > fieldB ? 1 : -1;
      } else {
        return fieldA < fieldB ? 1 : -1;
      }
    });

    setFilteredTrackings(result);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTrackings([]);
    } else {
      setSelectedTrackings(filteredTrackings.map((item) => item.TrackingNum));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectTracking = (trackingNum) => {
    if (selectedTrackings.includes(trackingNum)) {
      setSelectedTrackings(
        selectedTrackings.filter((item) => item !== trackingNum)
      );
    } else {
      setSelectedTrackings([...selectedTrackings, trackingNum]);
    }
  };

  // Patch the delete method to just simulate local-only delete
  const handleDeleteSelected = async () => {
    if (selectedTrackings.length === 0) return;
    setLoading(true);
    setError(null);
    // Just filter them out from local state
    const updated = trackings.filter(
      (item) => !selectedTrackings.includes(item.TrackingNum)
    );
    setTrackings(updated);
    setFilteredTrackings(updated);
    setSelectedTrackings([]);
    setSelectAll(false);
    setLoading(false);
  };

  const exportToCSV = () => {
    if (filteredTrackings.length === 0) return;

    const headers = [
      "Tracking Number",
      "Sender",
      "Status",
      "Product",
      "Quantity",
      "Added Date",
      "Last Updated",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredTrackings.map((item) =>
        [
          item.TrackingNum || "",
          `"${(item.Sender || "").replace(/"/g, '""')}"`,
          item.Status || "",
          `"${(item.Product || "").replace(/"/g, '""')}"`,
          item.Quantity || "",
          item.AddedDate ? new Date(item.AddedDate).toLocaleDateString() : "",
          item.LastUpdated
            ? new Date(item.LastUpdated).toLocaleDateString()
            : "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `tracking_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "in transit":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "on return":
        return "bg-red-100 text-red-800";
      case "in china warehouse":
        return "bg-purple-100 text-purple-800";
      case "on way to warehouse":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Tracking Management
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage and monitor all tracking numbers in the system
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
          <p>{error}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tracking number, sender, or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="w-full md:w-48">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in china warehouse">In China Warehouse</option>
            <option value="on way to warehouse">On Way to Warehouse</option>
            <option value="in transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="on return">On Return</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            title="Export to CSV"
          >
            <FaDownload /> Export
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedTrackings.length === 0 || loading}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              selectedTrackings.length > 0 && !loading
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            } transition-colors`}
            title="Delete selected tracking numbers"
          >
            <FaTrash /> Delete
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {!loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 dark:bg-gray-700">
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
                    onClick={() => handleSort("trackingNum")}
                    className="flex items-center text-gray-700 dark:text-gray-300 font-medium text-sm"
                  >
                    Tracking Number
                    {sortField === "trackingNum" &&
                      (sortDirection === "asc" ? (
                        <FaSortAmountUp className="ml-1" />
                      ) : (
                        <FaSortAmountDown className="ml-1" />
                      ))}
                  </button>
                </th>
                <th className="py-3 px-4 text-left">
                  <button
                    onClick={() => handleSort("sender")}
                    className="flex items-center text-gray-700 dark:text-gray-300 font-medium text-sm"
                  >
                    Sender
                    {sortField === "sender" &&
                      (sortDirection === "asc" ? (
                        <FaSortAmountUp className="ml-1" />
                      ) : (
                        <FaSortAmountDown className="ml-1" />
                      ))}
                  </button>
                </th>
                <th className="py-3 px-4 text-left">
                  <button
                    onClick={() => handleSort("status")}
                    className="flex items-center text-gray-700 dark:text-gray-300 font-medium text-sm"
                  >
                    Status
                    {sortField === "status" &&
                      (sortDirection === "asc" ? (
                        <FaSortAmountUp className="ml-1" />
                      ) : (
                        <FaSortAmountDown className="ml-1" />
                      ))}
                  </button>
                </th>
                <th className="py-3 px-4 text-left">Product</th>
                <th className="py-3 px-4 text-left">Quantity</th>
                <th className="py-3 px-4 text-left">
                  <button
                    onClick={() => handleSort("addedDate")}
                    className="flex items-center text-gray-700 dark:text-gray-300 font-medium text-sm"
                  >
                    Added Date
                    {sortField === "addedDate" &&
                      (sortDirection === "asc" ? (
                        <FaSortAmountUp className="ml-1" />
                      ) : (
                        <FaSortAmountDown className="ml-1" />
                      ))}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTrackings.length > 0 ? (
                filteredTrackings.map((tracking, index) => (
                  <tr
                    key={tracking.TrackingNum || index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedTrackings.includes(
                          tracking.TrackingNum
                        )}
                        onChange={() =>
                          handleSelectTracking(tracking.TrackingNum)
                        }
                        className="rounded"
                      />
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {tracking.TrackingNum}
                    </td>
                    <td className="py-3 px-4">{tracking.Sender}</td>
                    <td className="py-3 px-4">
                      {tracking.Status && (
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            tracking.Status
                          )}`}
                        >
                          {tracking.Status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{tracking.Product || "-"}</td>
                    <td className="py-3 px-4">{tracking.Quantity || "-"}</td>
                    <td className="py-3 px-4">
                      {tracking.AddedDate
                        ? new Date(tracking.AddedDate).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    {loading
                      ? "Loading tracking data..."
                      : "No tracking records found. " +
                        (searchTerm &&
                          "Try a different search term or filter.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredTrackings.length} of {trackings.length} tracking
        records
        {selectedTrackings.length > 0 &&
          ` (${selectedTrackings.length} selected)`}
      </div>
    </div>
  );
};

export default Tracking;
