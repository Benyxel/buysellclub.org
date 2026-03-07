import React, { useEffect, useState } from "react";
import { FaInfoCircle } from "react-icons/fa";
import { toast } from "../../utils/toast";
import { Link, useSearchParams } from "react-router-dom";
import { Api } from "../../api";

const CommunityPayment = () => {
  const [searchParams] = useSearchParams();
  const isSheetOnly = searchParams.get("type") === "sheet_only";
  const [membershipAmount, setMembershipAmount] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [sheetOnlyPrice, setSheetOnlyPrice] = useState(0);
  const [sheetOnlyLabel, setSheetOnlyLabel] = useState("Suppliers only");
  const [loading, setLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null);
  const [requestType, setRequestType] = useState(null);

  const fetchSettingsAndStatus = async () => {
    try {
      const [settingsResp, requestResp] = await Promise.all([
        Api.community.settings.get({ noCache: true }),
        Api.community.myRequest({ noCache: true }),
      ]);
      setMembershipAmount(Number(settingsResp.data?.membership_amount || 0));
      setSalePrice(Number(settingsResp.data?.sale_price || 0));
      setSheetOnlyPrice(Number(settingsResp.data?.sheet_only_price || 0));
      setSheetOnlyLabel(settingsResp.data?.sheet_only_label || "Suppliers only");
      setRequestStatus(requestResp.data?.request?.status || null);
      setRequestType(requestResp.data?.request?.request_type || null);
    } catch (error) {
      console.error("Failed to load community payment info:", error);
      toast.error("Failed to load payment information");
    }
  };

  const amountToPay = isSheetOnly
    ? sheetOnlyPrice
    : (salePrice > 0 && salePrice < membershipAmount ? salePrice : membershipAmount);

  const isBlockedForThisFlow =
    requestStatus === "pending" ||
    (requestStatus === "approved" &&
      ((isSheetOnly && requestType === "sheet_only") || (!isSheetOnly && requestType === "membership")));

  useEffect(() => {
    fetchSettingsAndStatus();
    const refresh = () => fetchSettingsAndStatus();
    const handleFocus = () => refresh();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refresh();
    });
    const handleStorage = (e) => {
      if (e.key === "communitySettingsUpdatedAt") refresh();
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handlePayWithPaystack = async (e) => {
    e.preventDefault();
    if (isBlockedForThisFlow || (isSheetOnly && sheetOnlyPrice <= 0)) return;
    try {
      setLoading(true);
      const baseUrl = import.meta.env?.VITE_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
      const res = await Api.community.initiatePayment({
        request_type: isSheetOnly ? "sheet_only" : "membership",
        callback_url: baseUrl ? `${String(baseUrl).replace(/\/$/, "")}/payment/callback` : undefined,
      });
      if (res.data?.payment_url) {
        toast.success("Redirecting to payment...");
        window.location.href = res.data.payment_url;
      } else {
        toast.error(res.data?.error || "Payment could not be started.");
        setLoading(false);
      }
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Failed to start payment.";
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            What you get inside the community
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You are not joining a noisy group chat. You're joining a structured
            community with focused Topics:
          </p>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>✅ 🏆 Winning Products</li>
            <li>✅ 📚 Supplier Contacts</li>
            <li>✅ 🛒 Whole Sale Products</li>
            <li>✅ 🎬 Video Tutorials</li>
            <li>✅ ❓ Questions &amp; Answers</li>
            <li>✅ # Member Events</li>
            <li>✅ # General Discussion</li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isSheetOnly ? `Pay for ${sheetOnlyLabel} only` : "Community Payment"}
            </h1>
            <Link
              to={isSheetOnly ? "/Community" : "/Community"}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Back to Join Community
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {isSheetOnly
              ? `Pay the one-time fee to get access to the ${sheetOnlyLabel} sheet.`
              : "Complete payment securely with Paystack (cards, mobile money)."}
          </p>
        </div>

        {isBlockedForThisFlow && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-2xl p-5 text-sm text-yellow-900 dark:text-yellow-100">
            You already have a {requestStatus} {isSheetOnly ? `${sheetOnlyLabel} ` : "membership "}request.
            Submit a new payment only if your previous request was rejected.
          </div>
        )}
        {isSheetOnly && sheetOnlyPrice <= 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-2xl p-5 text-sm text-red-900 dark:text-red-100">
            {sheetOnlyLabel} purchase is not available at the moment. <Link to="/Community" className="underline">Back to Community</Link>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-6 border border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-xl">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <FaInfoCircle className="w-6 h-6" />
              Pay with Paystack
            </h3>
            <p className="text-sm text-white/90">
              You will be redirected to Paystack to pay securely (cards, mobile money). After payment, your request will be submitted for admin approval.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              Amount to Pay
            </h4>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">{isSheetOnly ? `${sheetOnlyLabel} (one-time):` : "Membership Fee:"}</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                ₵{amountToPay.toFixed(2)}
              </span>
            </div>
            {!isSheetOnly && salePrice > 0 && salePrice < membershipAmount && (
              <div className="flex justify-between items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Regular Price:</span>
                <span className="line-through">₵{membershipAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handlePayWithPaystack}
            disabled={loading || isBlockedForThisFlow || (isSheetOnly && sheetOnlyPrice <= 0)}
            className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Redirecting..." : "Pay with Paystack"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommunityPayment;
