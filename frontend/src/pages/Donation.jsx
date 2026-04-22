import React from "react";
import { FaInfoCircle, FaMoneyBillWave, FaAlipay } from "react-icons/fa";

/**
 * Donation page – old UI: bank/MoMo details only (no Paystack).
 * Not linked in site navigation (hidden); accessible via direct URL /donation.
 */
const Donation = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Donate</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Support us with a one-time payment. Use the bank or mobile money details below.
          </p>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2 mb-2">
              <FaInfoCircle className="w-4 h-4" />
              Payment instructions
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Transfer any amount you wish to donate using one of the options below.
            </p>
          </div>

          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3 mb-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FaMoneyBillWave className="w-5 h-5 text-green-600" />
              Bank Transfer
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Account Name:</span>
                <span className="font-semibold text-gray-900 dark:text-white">BUY SELL CLUB LTD</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Bank:</span>
                <span className="font-semibold text-gray-900 dark:text-white">ECOBANK (ACHIMOTA)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Account Number:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">1441004957068</span>
              </div>
            </div>
          </div>

          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FaAlipay className="w-5 h-5 text-purple-600" />
              Mobile Money (MoMo)
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">MoMo name:</span>
                <span className="font-semibold text-gray-900 dark:text-white">BuySellClub</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Registered name:</span>
                <span className="font-semibold text-gray-900 dark:text-white">DANIEL TWUMASI</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Number:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">054 437 0928</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Merchant ID:</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-white">060140</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Donation;
