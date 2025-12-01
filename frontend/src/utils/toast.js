import { toast as reactToast } from "react-toastify";

// Track active toast IDs to prevent duplicates
const activeToasts = new Set();

/**
 * Custom toast wrapper that prevents duplicate toasts
 * @param {string} message - The toast message
 * @param {object} options - Toast options (type, toastId, etc.)
 */
const createToast = (message, options = {}) => {
  // Generate a unique ID based on message and type if not provided
  const toastId = options.toastId || `${options.type || "default"}-${message}`;
  
  // Check if this toast is already active
  if (activeToasts.has(toastId)) {
    return; // Don't show duplicate
  }
  
  // Add to active set
  activeToasts.add(toastId);
  
  // Show the toast
  const toastOptions = {
    ...options,
    toastId,
    onClose: () => {
      // Remove from active set when closed
      activeToasts.delete(toastId);
      if (options.onClose) {
        options.onClose();
      }
    },
  };
  
  // Call the appropriate toast method
  switch (options.type) {
    case "success":
      reactToast.success(message, toastOptions);
      break;
    case "error":
      reactToast.error(message, toastOptions);
      break;
    case "warning":
      reactToast.warning(message, toastOptions);
      break;
    case "info":
      reactToast.info(message, toastOptions);
      break;
    default:
      reactToast(message, toastOptions);
  }
};

// Export toast methods
export const toast = {
  success: (message, options = {}) => createToast(message, { ...options, type: "success" }),
  error: (message, options = {}) => createToast(message, { ...options, type: "error" }),
  warning: (message, options = {}) => createToast(message, { ...options, type: "warning" }),
  info: (message, options = {}) => createToast(message, { ...options, type: "info" }),
  // For backward compatibility
  default: (message, options = {}) => createToast(message, options),
};

export default toast;

