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
  const [guestEmail, setGuestEmail] = useState("");
  const [guestContact, setGuestContact] = useState("");
  const isLoggedIn = !!(
    typeof window !== "undefined" && localStorage.getItem("token")
  );

  const fetchSettingsAndStatus = async () => {
    try {
      const settingsResp = await Api.community.settings.get({ noCache: true });
      setMembershipAmount(Number(settingsResp.data?.membership_amount || 0));
      setSalePrice(Number(settingsResp.data?.sale_price || 0));
      setSheetOnlyPrice(Number(settingsResp.data?.sheet_only_price || 0));
      setSheetOnlyLabel(settingsResp.data?.sheet_only_label || "Suppliers only");
      if (isLoggedIn) {
        try {
          const requestResp = await Api.community.myRequest({ noCache: true });
          setRequestStatus(requestResp.data?.request?.status || null);
          setRequestType(requestResp.data?.request?.request_type || null);
        } catch (e) {
          setRequestStatus(null);
          setRequestType(null);
        }
      } else {
        setRequestStatus(null);
        setRequestType(null);
      }
    } catch (error) {
      console.error("Failed to load community payment info:", error);
      toast.error("Failed to load payment information");
    }
  };

  const amountToPay = isSheetOnly
    ? sheetOnlyPrice
    : (salePrice > 0 && salePrice < membershipAmount ? salePrice : membershipAmount);

  // Only block when already approved (payment succeeded). Pending = can retry until payment succeeds.
  const isAlreadyApprovedForThisFlow =
    requestStatus === "approved" &&
    ((isSheetOnly && requestType === "sheet_only") || (!isSheetOnly && requestType === "membership"));

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
  }, [isLoggedIn]);

  const handlePayWithPaystack = async (e) => {
    e.preventDefault();
    if (isAlreadyApprovedForThisFlow || (isSheetOnly && sheetOnlyPrice <= 0)) return;
    if (!isLoggedIn) {
      const email = (guestEmail || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        toast.error("Please enter a valid email address.");
        return;
      }
    }
    try {
      setLoading(true);
      const baseUrl = import.meta.env?.VITE_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
      const payload = {
        request_type: isSheetOnly ? "sheet_only" : "membership",
        callback_url: baseUrl ? `${String(baseUrl).replace(/\/$/, "")}/payment/callback` : undefined,
      };
      const emailVal = (guestEmail || "").trim().toLowerCase();
      if (emailVal) {
        payload.email = emailVal;
        if ((guestContact || "").trim()) payload.contact = (guestContact || "").trim().slice(0, 20);
      }
      const res = await Api.community.initiatePayment(payload);
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

        {requestStatus === "pending" && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-5 text-sm text-blue-900 dark:text-blue-100">
            Payment not completed yet. Click the button below to try again.
          </div>
        )}
        {isAlreadyApprovedForThisFlow && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl p-5 text-sm text-green-900 dark:text-green-100">
            You are already {isSheetOnly ? `approved for ${sheetOnlyLabel}` : "a community member"}.
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
              You will be redirected to Paystack to pay securely (cards, mobile money).
              {isLoggedIn
                ? " You're paying with your account — you'll have access right after payment."
                : " After payment, we’ll send you an email with a link to create your username and password so you can log in."}
            </p>
          </div>

          {isLoggedIn ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You're registered and logged in. Click the button below to pay; no need to enter email or contact again.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Your email (we’ll send you a link to create your login after payment)
              </label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
              />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contact (phone or contact number)
                </label>
                <input
                  type="text"
                  value={guestContact}
                  onChange={(e) => setGuestContact(e.target.value.slice(0, 20))}
                  placeholder="e.g. 0244123456"
                  maxLength={20}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

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
            disabled={
              loading ||
              isAlreadyApprovedForThisFlow ||
              (isSheetOnly && sheetOnlyPrice <= 0)
            }
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
