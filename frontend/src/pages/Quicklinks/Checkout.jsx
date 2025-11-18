import React, { useState } from 'react';
import { FaCreditCard, FaMobileAlt, FaWallet, FaInfoCircle, FaLock, FaTruck, FaShieldAlt } from 'react-icons/fa';

const Checkout = () => {
  const [selectedMethod, setSelectedMethod] = useState('mobile');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (selectedMethod === 'mobile' && !phoneNumber) {
      return;
    }
    setLoading(true);
    // Payment processing logic will be added later
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Order Summary</h2>
            
            {/* Product Details */}
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <img 
                    src="https://via.placeholder.com/80" 
                    alt="Product" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">Product Title</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Product description goes here...</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Quantity: 1</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">GHS 100.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-900 dark:text-white">GHS 100.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Sourcing Fee</span>
                  <span className="text-gray-900 dark:text-white">GHS 100.00</span>
                </div>
                <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-gray-900 dark:text-white">GHS 200.00</span>
                </div>
              </div>
            </div>

            {/* Security Badges */}
            <div className="mt-6 flex items-center justify-center gap-6 text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <FaLock className="w-4 h-4" />
                <span className="text-xs">Secure Payment</span>
              </div>
              <div className="flex items-center gap-2">
                <FaTruck className="w-4 h-4" />
                <span className="text-xs">Fast Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <FaShieldAlt className="w-4 h-4" />
                <span className="text-xs">Buyer Protection</span>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Payment Details</h2>
            
            {/* Payment Methods */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setSelectedMethod('mobile')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedMethod === 'mobile'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                  }`}
                >
                  <FaMobileAlt className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mobile Money</span>
                </button>
                <button
                  onClick={() => setSelectedMethod('card')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedMethod === 'card'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                  }`}
                >
                  <FaCreditCard className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Card</span>
                </button>
                <button
                  onClick={() => setSelectedMethod('cash')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedMethod === 'cash'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                  }`}
                >
                  <FaWallet className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cash</span>
                </button>
              </div>

              {/* Mobile Money Input */}
              {selectedMethod === 'mobile' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter your phone number"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              )}

              {/* Payment Info */}
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <FaInfoCircle className="w-5 h-5 text-blue-500 mt-1" />
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Your payment will be processed securely. For mobile money payments, you'll receive a prompt on your phone to confirm the transaction.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pay Button */}
              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {loading ? 'Processing Payment...' : 'Pay GHS 200.00'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout; 