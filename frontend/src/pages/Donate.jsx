import React, { useState } from "react";
import {
  FaHeart,
  FaMoneyBillWave,
  FaAlipay,
  FaCopy,
  FaCheck,
  FaShieldAlt,
  FaInfoCircle,
  FaYoutube,
} from "react-icons/fa";
import { toast } from "../utils/toast";

// Same payment details as on AlipayPayment page
const BANK_DETAILS = {
  accountName: "BUY SELL CLUB LTD",
  bank: "ECOBANK(ACHIMOTA)",
  accountNumber: "1441004957068",
};

const MOMO_DETAILS = {
  name: "Buy Sell Club",
  number: "054 437 0928",
  merchantId: "060140",
};

const PRESET_AMOUNTS = [10, 25, 50, 100, 200, 500];

const Donate = () => {
  const [copiedField, setCopiedField] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const displayAmount = selectedAmount
    ? `₵${selectedAmount}`
    : customAmount
    ? `₵${customAmount}`
    : "any amount you wish";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-500 mb-4">
              <FaHeart className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Support Fofoofo TV
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
              Your donation helps us serve our community better. Thank you for
              giving {displayAmount}.
            </p>
            <a
              href="https://www.youtube.com/c/Fofoofotv?sub_confirmation=1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition"
            >
              <FaYoutube className="w-6 h-6" />
              Subscribe on YouTube
            </a>
          </div>

          {/* Amount selection (optional) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <FaMoneyBillWave className="w-5 h-5 text-green-600" />
              Suggested amount (GHS)
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Choose an amount or enter your own — then pay via Bank or MoMo
              below.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(amt);
                    setCustomAmount("");
                  }}
                  className={`px-4 py-2 rounded-xl font-medium transition ${
                    selectedAmount === amt
                      ? "bg-rose-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  ₵{amt}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400">Or:</span>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                className="flex-1 max-w-[140px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
              <span className="text-gray-500 dark:text-gray-400">GHS</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 flex gap-3">
            <FaInfoCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Use one of the payment options below to send your donation. You can
              use the same Bank and Mobile Money (MoMo) details we use for
              Alipay payments.
            </p>
          </div>

          {/* Bank details */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FaMoneyBillWave className="w-5 h-5 text-green-600" />
              Bank Transfer
            </h3>
            <div className="space-y-3">
              <DetailRow
                label="Account Name"
                value={BANK_DETAILS.accountName}
                onCopy={() => copyToClipboard(BANK_DETAILS.accountName, "bank-name")}
                copied={copiedField === "bank-name"}
              />
              <DetailRow
                label="Bank"
                value={BANK_DETAILS.bank}
                onCopy={() => copyToClipboard(BANK_DETAILS.bank, "bank-name-bank")}
                copied={copiedField === "bank-name-bank"}
              />
              <DetailRow
                label="Account Number"
                value={BANK_DETAILS.accountNumber}
                onCopy={() => copyToClipboard(BANK_DETAILS.accountNumber, "bank-account")}
                copied={copiedField === "bank-account"}
              />
            </div>
          </div>

          {/* MoMo details */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FaAlipay className="w-5 h-5 text-purple-600" />
              Mobile Money (MoMo)
            </h3>
            <div className="space-y-3">
              <DetailRow
                label="Name"
                value={MOMO_DETAILS.name}
                onCopy={() => copyToClipboard(MOMO_DETAILS.name, "momo-name")}
                copied={copiedField === "momo-name"}
              />
              <DetailRow
                label="Number"
                value={MOMO_DETAILS.number}
                onCopy={() => copyToClipboard(MOMO_DETAILS.number.replace(/\s/g, ""), "momo-number")}
                copied={copiedField === "momo-number"}
              />
              <DetailRow
                label="Merchant ID"
                value={MOMO_DETAILS.merchantId}
                onCopy={() => copyToClipboard(MOMO_DETAILS.merchantId, "momo-merchant")}
                copied={copiedField === "momo-merchant"}
              />
            </div>
          </div>

          {/* Trust note */}
          <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
            <FaShieldAlt className="w-4 h-4 text-green-500" />
            <span>Same secure details we use for Alipay payments</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function DetailRow({ label, value, onCopy, copied }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-900 dark:text-white font-mono">
          {value}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition"
          title="Copy"
        >
          {copied ? (
            <FaCheck className="w-4 h-4 text-green-500" />
          ) : (
            <FaCopy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

export default Donate;
