import React from 'react';
import { FaTimes } from 'react-icons/fa';
import Invoice from './Invoice';

const InvoiceModal = ({ isOpen, onClose, invoice, request }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
      
      <div className="relative z-10 w-full max-w-4xl max-h-full overflow-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl transform transition-all">
        <div className="sticky top-0 z-20 flex justify-between items-center p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Invoice #{invoice.invoiceNumber}</h3>
          <button 
            onClick={onClose} 
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          <Invoice invoice={invoice} request={request} />
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal; 