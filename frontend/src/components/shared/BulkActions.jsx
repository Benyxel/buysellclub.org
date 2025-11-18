import React from "react";
import { FaTrash, FaCheck, FaTimes, FaDownload, FaEdit } from "react-icons/fa";

const BulkActions = ({
  selectedItems,
  onBulkDelete,
  onBulkUpdateStatus,
  onBulkExport,
  availableStatuses = [],
  showDelete = true,
  showStatusUpdate = false,
  showExport = false,
  className = "",
}) => {
  const selectedCount = selectedItems.length;

  if (selectedCount === 0) {
    return null;
  }

  const [showStatusMenu, setShowStatusMenu] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState("");

  const handleStatusUpdate = () => {
    if (selectedStatus && onBulkUpdateStatus) {
      onBulkUpdateStatus(selectedItems, selectedStatus);
      setShowStatusMenu(false);
      setSelectedStatus("");
    }
  };

  return (
    <div
      className={`bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 ${className}`}
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-blue-900 dark:text-blue-200">
            {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {showStatusUpdate && availableStatuses.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <FaEdit className="text-xs" />
                Update Status
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <div className="p-2">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm mb-2"
                    >
                      <option value="">Select status...</option>
                      {availableStatuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={handleStatusUpdate}
                        disabled={!selectedStatus}
                        className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => {
                          setShowStatusMenu(false);
                          setSelectedStatus("");
                        }}
                        className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {showExport && onBulkExport && (
            <button
              onClick={() => onBulkExport(selectedItems)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <FaDownload className="text-xs" />
              Export
            </button>
          )}

          {showDelete && onBulkDelete && (
            <button
              onClick={() => onBulkDelete(selectedItems)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              <FaTrash className="text-xs" />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkActions;

