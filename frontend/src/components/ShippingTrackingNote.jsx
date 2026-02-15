import React from "react";
import { FaExclamationCircle, FaTimes } from "react-icons/fa";

const NOTE_MESSAGE =
  "Note: Package details (such as CBM and shipping fees) are updated 2 weeks to 3 weeks after the vessel sets off. This may be the reason why you might not have any information about your packages. Thank you.";

const ShippingTrackingNote = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      onClick={onClose}
      aria-modal="true"
      aria-labelledby="shipping-note-title"
    >
      <div
        className="relative bg-amber-50/80 dark:bg-amber-900/30 border-2 border-amber-400 dark:border-amber-600 rounded-2xl shadow-xl max-w-lg w-full p-6 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center">
            <FaExclamationCircle className="text-2xl text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="shipping-note-title"
              className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-2"
            >
              Attention
            </h2>
            <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
              {NOTE_MESSAGE}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full sm:w-auto px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors"
            >
              Got it
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShippingTrackingNote;
export { NOTE_MESSAGE };
