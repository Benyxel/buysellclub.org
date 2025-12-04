import React from "react";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger", // 'danger', 'warning', 'info'
  disabled = false, // Disable confirm button
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "danger":
        return {
          icon: "text-red-600",
          button: "bg-red-600 hover:bg-red-700",
          border: "border-red-200",
        };
      case "warning":
        return {
          icon: "text-yellow-600",
          button: "bg-yellow-600 hover:bg-yellow-700",
          border: "border-yellow-200",
        };
      case "info":
        return {
          icon: "text-blue-600",
          button: "bg-blue-600 hover:bg-blue-700",
          border: "border-blue-200",
        };
      default:
        return {
          icon: "text-red-600",
          button: "bg-red-600 hover:bg-red-700",
          border: "border-red-200",
        };
    }
  };

  const styles = getTypeStyles();

  const handleConfirm = async () => {
    if (onConfirm) {
      // Call onConfirm and wait if it's async
      const result = onConfirm();
      // If it returns a promise, wait for it
      if (result && typeof result.then === 'function') {
        try {
          await result;
        } catch (error) {
          // Error handling is done in the handler
          console.error("Error in confirm action:", error);
        }
      }
    }
    // Don't close automatically - let the handler manage it
    // The handler should call onClose() when done
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-full bg-opacity-10 ${styles.icon} ${
                type === "danger"
                  ? "bg-red-100 dark:bg-red-900"
                  : type === "warning"
                  ? "bg-yellow-100 dark:bg-yellow-900"
                  : "bg-blue-100 dark:bg-blue-900"
              }`}
            >
              <FaExclamationTriangle className={`text-2xl ${styles.icon}`} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={disabled}
            className={`px-5 py-2.5 text-white rounded-lg transition-colors font-medium ${styles.button} ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
