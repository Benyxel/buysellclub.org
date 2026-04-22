import React, { useEffect, useState } from "react";
import { FaInfoCircle } from "react-icons/fa";
import { toast } from "../../utils/toast";
import { Link, useSearchParams } from "react-router-dom";
import { Api } from "../../api";
import { normalizePhone } from "../../utils/ghanaPhone";

const PAYER_GHANA = "ghana";
const PAYER_ABROAD = "abroad";

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
  const [requestProof, setRequestProof] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestContact, setGuestContact] = useState("");
  const [payerLocation, setPayerLocation] = useState(PAYER_GHANA);
  const [abroadPaymentConfirmed, setAbroadPaymentConfirmed] = useState(false);
  const isLoggedIn = !!(
    typeof window !== "undefined" && localStorage.getItem("token")
  );

  const fetchSettingsAndStatus = async () => {
    try {
      const settingsResp = await Api.community.settings.get();
      setMembershipAmount(Number(settingsResp.data?.membership_amount || 0));
      setSalePrice(Number(settingsResp.data?.sale_price || 0));
      setSheetOnlyPrice(Number(settingsResp.data?.sheet_only_price || 0));
      setSheetOnlyLabel(settingsResp.data?.sheet_only_label || "Suppliers only");
      if (isLoggedIn) {
        try {
          const requestResp = await Api.community.myRequest();
          setRequestStatus(requestResp.data?.request?.status || null);
          setRequestType(requestResp.data?.request?.request_type || null);
          setRequestProof(requestResp.data?.request?.proof_of_payment || "");
        } catch (e) {
          setRequestStatus(null);
          setRequestType(null);
          setRequestProof("");
        }
      } else {
        setRequestStatus(null);
        setRequestType(null);
        setRequestProof("");
      }
    } catch (error) {
      console.error("Failed to load community payment info:", error);
      toast.error("Failed to load payment information");
    }
  };

  const amountToPay = isSheetOnly
    ? sheetOnlyPrice
    : salePrice > 0 && salePrice < membershipAmount
      ? salePrice
      : membershipAmount;

  const isInternationalMoMoPending =
    requestStatus === "pending" &&
    typeof requestProof === "string" &&
    requestProof.includes("International MoMo");

  const isAlreadyApprovedForThisFlow =
    requestStatus === "approved" &&
    ((isSheetOnly && requestType === "sheet_only") ||
      (!isSheetOnly && requestType === "membership"));

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

  const buildGuestPayloadBase = () => {
    const payload = {
      request_type: isSheetOnly ? "sheet_only" : "membership",
    };
    const emailVal = (guestEmail || "").trim().toLowerCase();
    if (emailVal) {
      payload.email = emailVal;
      if ((guestContact || "").trim()) {
        const normalized = normalizePhone(guestContact);
        if (!normalized.ok) {
          return { error: normalized.error || "Please enter a valid contact number." };
        }
        payload.contact = normalized.normalized;
      }
    }
    return { payload };
  };

  const handlePayWithPaystack = async (e) => {
    e.preventDefault();
    if (payerLocation !== PAYER_GHANA) return;
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
      const baseUrl =
        import.meta.env?.VITE_APP_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");
      const payload = {
        request_type: isSheetOnly ? "sheet_only" : "membership",
        callback_url: baseUrl
          ? `${String(baseUrl).replace(/\/$/, "")}/payment/callback`
          : undefined,
      };
      const emailVal = (guestEmail || "").trim().toLowerCase();
      if (emailVal) {
        payload.email = emailVal;
        if ((guestContact || "").trim()) {
          const normalized = normalizePhone(guestContact);
          if (!normalized.ok) {
            toast.error(normalized.error || "Please enter a valid contact number.");
            setLoading(false);
            return;
          }
          payload.contact = normalized.normalized;
        }
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

  const handleInternationalSubmit = async (e) => {
    e.preventDefault();
    if (isAlreadyApprovedForThisFlow || (isSheetOnly && sheetOnlyPrice <= 0)) return;
    if (!abroadPaymentConfirmed) {
      toast.error("Please confirm that you have completed the MoMo payment.");
      return;
    }
    if (!isLoggedIn) {
      const email = (guestEmail || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        toast.error("Please enter a valid email address.");
        return;
      }
    }
    try {
      setLoading(true);
      const payload = {
        request_type: isSheetOnly ? "sheet_only" : "membership",
        payment_confirmed: true,
      };
      if (!isLoggedIn) {
        const built = buildGuestPayloadBase();
        if (built.error) {
          toast.error(built.error);
          setLoading(false);
          return;
        }
        Object.assign(payload, built.payload);
      } else if ((guestContact || "").trim()) {
        const normalized = normalizePhone(guestContact);
        if (!normalized.ok) {
          toast.error(normalized.error || "Please enter a valid contact number.");
          setLoading(false);
          return;
        }
        payload.contact = normalized.normalized;
      }
      await Api.community.submitInternationalMomo(payload);
      toast.success("Request submitted. Our team will verify your payment.");
      setAbroadPaymentConfirmed(false);
      await fetchSettingsAndStatus();
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Could not submit your request.";
      toast.error(message);
    } finally {
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
            You are not joining a noisy group chat. You&apos;re joining a structured
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
              : "Pay in Ghana with Paystack, or from abroad with Mobile Money (MoMo)."}
          </p>
        </div>

        {requestStatus === "pending" && isInternationalMoMoPending && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-5 text-sm text-amber-950 dark:text-amber-100">
            We received your international MoMo notice and emailed our team. Your
            membership is <strong>not</strong> active yet — an admin will verify your
            payment and approve your request. You will get an email when that is done.
          </div>
        )}
        {requestStatus === "pending" && !isInternationalMoMoPending && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-5 text-sm text-blue-900 dark:text-blue-100">
            Payment not completed yet. Choose <strong>Ghana</strong> and use Paystack
            below to try again, or switch options if you are paying from abroad.
          </div>
        )}
        {isAlreadyApprovedForThisFlow && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl p-5 text-sm text-green-900 dark:text-green-100">
            You are already {isSheetOnly ? `approved for ${sheetOnlyLabel}` : "a community member"}.
          </div>
        )}
        {isSheetOnly && sheetOnlyPrice <= 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-2xl p-5 text-sm text-red-900 dark:text-red-100">
            {sheetOnlyLabel} purchase is not available at the moment.{" "}
            <Link to="/Community" className="underline">
              Back to Community
            </Link>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-6 border border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Where are you paying from?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setPayerLocation(PAYER_GHANA);
                  setAbroadPaymentConfirmed(false);
                }}
                disabled={isAlreadyApprovedForThisFlow || (isSheetOnly && sheetOnlyPrice <= 0)}
                className={`rounded-xl border-2 p-4 text-left transition-colors ${
                  payerLocation === PAYER_GHANA
                    ? "border-green-600 bg-green-50 dark:bg-green-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="font-semibold text-gray-900 dark:text-white">Ghana</span>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Pay with Paystack (card or Ghana mobile money).
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPayerLocation(PAYER_ABROAD)}
                disabled={isAlreadyApprovedForThisFlow || (isSheetOnly && sheetOnlyPrice <= 0)}
                className={`rounded-xl border-2 p-4 text-left transition-colors ${
                  payerLocation === PAYER_ABROAD
                    ? "border-amber-600 bg-amber-50 dark:bg-amber-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="font-semibold text-gray-900 dark:text-white">Abroad</span>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Paystack often declines foreign cards — use our MoMo details instead.
                </p>
              </button>
            </div>
          </div>

          {isLoggedIn ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You&apos;re logged in. {payerLocation === PAYER_GHANA
                ? "Use Paystack below; no need to enter email again."
                : "Submit the abroad MoMo form below when you have sent payment."}
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your email (we&apos;ll send updates and login steps after approval)
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
                  Contact (phone number)
                </label>
                <input
                  type="text"
                  value={guestContact}
                  onChange={(e) => setGuestContact(e.target.value)}
                  placeholder="e.g. 0244123456"
                  maxLength={20}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {isLoggedIn && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contact (optional — Ghana local or international, e.g. +44…)
              </label>
              <input
                type="text"
                value={guestContact}
                onChange={(e) => setGuestContact(e.target.value)}
                placeholder="e.g. 0244123456 or +441234567890"
                maxLength={20}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              Amount to Pay
            </h4>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">
                {isSheetOnly ? `${sheetOnlyLabel} (one-time):` : "Membership Fee:"}
              </span>
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

          {payerLocation === PAYER_GHANA && (
            <>
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-xl">
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <FaInfoCircle className="w-6 h-6" />
                  Pay with Paystack
                </h3>
                <p className="text-sm text-white/90">
                  You will be redirected to Paystack to pay securely (cards, Ghana mobile money).
                  {isLoggedIn
                    ? " You'll have access right after payment is confirmed."
                    : " After payment, we'll email you a link to create your username and password."}
                </p>
              </div>
              <button
                type="button"
                onClick={handlePayWithPaystack}
                disabled={
                  loading ||
                  isAlreadyApprovedForThisFlow ||
                  (isSheetOnly && sheetOnlyPrice <= 0) ||
                  isInternationalMoMoPending
                }
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Redirecting..." : "Pay with Paystack"}
              </button>
            </>
          )}

          {payerLocation === PAYER_ABROAD && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-950 dark:text-amber-100">
                <p className="font-semibold mb-2">Paying from outside Ghana</p>
                <p>
                  Our Paystack checkout is aimed at Ghana-issued cards and local mobile money.
                  Foreign cards are often declined. Please send the amount below to our{" "}
                  <strong>Mobile Money (MoMo)</strong> account, then confirm below so we can verify
                  and approve you manually.
                </p>
              </div>

              <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Mobile Money (MoMo)
                </h4>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600 dark:text-gray-400">MoMo name</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-right">
                      BuySellClub
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Registered name</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-right">
                      DANIEL TWUMASI
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Number</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      054 437 0928
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Merchant ID</span>
                    <span className="font-mono font-semibold text-gray-900 dark:text-white">
                      060140
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Use your MoMo reference or name so we can match your payment. Membership is only
                  active after an admin confirms receipt.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-gray-300"
                  checked={abroadPaymentConfirmed}
                  onChange={(e) => setAbroadPaymentConfirmed(e.target.checked)}
                  disabled={
                    isAlreadyApprovedForThisFlow ||
                    (isSheetOnly && sheetOnlyPrice <= 0) ||
                    isInternationalMoMoPending
                  }
                />
                <span>
                  I have sent <strong>₵{amountToPay.toFixed(2)}</strong> to the MoMo number above.
                </span>
              </label>

              <button
                type="button"
                onClick={handleInternationalSubmit}
                disabled={
                  loading ||
                  !abroadPaymentConfirmed ||
                  isAlreadyApprovedForThisFlow ||
                  (isSheetOnly && sheetOnlyPrice <= 0) ||
                  isInternationalMoMoPending
                }
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Submitting..." : "Submit payment notice"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityPayment;
