import React, { useEffect, useState } from "react";
import { FaCheckCircle, FaCrown, FaInfoCircle } from "react-icons/fa";
import { Link } from "react-router-dom";
import { Api } from "../../api";
import { EXECUTIVE_BENEFITS, buildExecutiveBenefits } from "../../constants/executiveMembership";
import { COMMUNITY_BENEFITS } from "../../constants/membershipPlans";
import CountryPhoneInput from "../../components/shared/CountryPhoneInput";
import { registrationEmailError } from "../../utils/registrationEmail";
import { toast } from "../../utils/toast";

const PAYER_GHANA = "ghana";
const PAYER_ABROAD = "abroad";

export default function ExecutivePayment() {
  const [membershipAmount, setMembershipAmount] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState(null);
  const [requestProof, setRequestProof] = useState("");
  const [isExecutiveMember, setIsExecutiveMember] = useState(false);
  const [executiveBenefits, setExecutiveBenefits] = useState(EXECUTIVE_BENEFITS);
  const [payerLocation, setPayerLocation] = useState(PAYER_GHANA);
  const [abroadPaymentConfirmed, setAbroadPaymentConfirmed] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState({
    country: "GH",
    nationalNumber: "",
    e164: "",
    isValid: false,
  });

  const isLoggedIn = !!(
    typeof window !== "undefined" && localStorage.getItem("token")
  );

  const amountToPay =
    salePrice > 0 && salePrice < membershipAmount ? salePrice : membershipAmount;

  const isInternationalMoMoPending =
    requestStatus === "pending" &&
    typeof requestProof === "string" &&
    requestProof.includes("International MoMo");

  const fetchSettingsAndStatus = async () => {
    try {
      setPageLoading(true);
      const settingsResp = await Api.executive.settings.get();
      setMembershipAmount(Number(settingsResp.data?.membership_amount || 0));
      setSalePrice(Number(settingsResp.data?.sale_price || 0));
      setExecutiveBenefits(buildExecutiveBenefits(settingsResp.data || {}));

      if (isLoggedIn) {
        try {
          const requestResp = await Api.executive.myRequest();
          setIsExecutiveMember(Boolean(requestResp.data?.is_executive_member));
          setRequestStatus(requestResp.data?.request?.status || null);
          setRequestProof(requestResp.data?.request?.proof_of_payment || "");
        } catch {
          setIsExecutiveMember(false);
          setRequestStatus(null);
          setRequestProof("");
        }
      } else {
        setIsExecutiveMember(false);
        setRequestStatus(null);
        setRequestProof("");
      }
    } catch (error) {
      console.error("Failed to load executive payment info:", error);
      toast.error("Failed to load Executive subscription information");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndStatus();
  }, [isLoggedIn]);

  const buildPaymentPayload = () => {
    const baseUrl =
      import.meta.env?.VITE_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const payload = {
      callback_url: baseUrl
        ? `${String(baseUrl).replace(/\/$/, "")}/payment/callback`
        : undefined,
    };
    const emailVal = (guestEmail || "").trim().toLowerCase();
    if (emailVal) {
      const emailErr = registrationEmailError(emailVal);
      if (emailErr) {
        return { error: emailErr };
      }
      payload.email = emailVal;
      if ((guestPhone?.nationalNumber || "").trim()) {
        if (!guestPhone?.isValid || !guestPhone?.e164) {
          return { error: "Please enter a valid contact number for the selected country." };
        }
        payload.contact = guestPhone.e164;
      }
    }
    return { payload };
  };

  const handlePayWithPaystack = async () => {
    if (isExecutiveMember || amountToPay <= 0 || payerLocation !== PAYER_GHANA) return;
    if (!isLoggedIn) {
      const email = (guestEmail || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        toast.error("Please enter a valid email address.");
        return;
      }
    }
    const built = buildPaymentPayload();
    if (built.error) {
      toast.error(built.error);
      return;
    }
    try {
      setLoading(true);
      const res = await Api.executive.initiatePayment(built.payload);
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

  const handleInternationalSubmit = async () => {
    if (isExecutiveMember || amountToPay <= 0) return;
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
    const built = buildPaymentPayload();
    if (built.error) {
      toast.error(built.error);
      return;
    }
    try {
      setLoading(true);
      await Api.executive.submitInternationalMomo({
        ...built.payload,
        payment_confirmed: true,
      });
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

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-lg dark:border-amber-800/60 dark:from-amber-950/30 dark:to-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/25">
              <FaCrown className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Executive Member subscription
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Includes full Community membership, Executive savings, and your digital
                membership card for one year.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            What you get
          </h2>
          <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Community access included
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {COMMUNITY_BENEFITS.slice(0, 4).map((benefit) => (
              <li key={benefit}>• {benefit}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-medium text-amber-800 dark:text-amber-300">
            Plus Executive perks
          </p>
          <ul className="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-300">
            {executiveBenefits.slice(0, 4).map((benefit) => (
              <li key={benefit} className="flex gap-2">
                <FaCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        {isExecutiveMember && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-900 dark:border-green-700 dark:bg-green-900/20 dark:text-green-100">
            Your Executive membership is active.{" "}
            <Link to="/Profile?tab=membership" className="font-semibold underline">
              View your membership card
            </Link>
          </div>
        )}

        {requestStatus === "pending" && isInternationalMoMoPending && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100">
            We received your international MoMo notice. An admin will verify your payment
            and approve your Executive membership. You will get an email when that is done.
          </div>
        )}

        {requestStatus === "pending" && !isInternationalMoMoPending && !isExecutiveMember && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-100">
            Payment not completed yet. Choose Ghana and use Paystack below, or pay from abroad
            with MoMo.
          </div>
        )}

        {amountToPay <= 0 && !isExecutiveMember && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900 dark:border-red-700 dark:bg-red-900/20 dark:text-red-100">
            Executive subscription is not available at the moment. Please check back later or
            contact support.
          </div>
        )}

        {!isExecutiveMember && amountToPay > 0 && (
          <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Pay for Executive membership
              </h2>
              <Link to="/Community" className="text-sm text-amber-700 hover:underline dark:text-amber-300">
                Back to membership plans
              </Link>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pay first with Paystack or MoMo. After payment we email you a link to set your
              username and password so you can log in.
            </p>

            <div>
              <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                Where are you paying from?
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setPayerLocation(PAYER_GHANA);
                    setAbroadPaymentConfirmed(false);
                  }}
                  className={`rounded-xl border-2 p-4 text-left transition-colors ${
                    payerLocation === PAYER_GHANA
                      ? "border-amber-600 bg-amber-50 dark:bg-amber-900/20"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-600"
                  }`}
                >
                  <span className="font-semibold text-gray-900 dark:text-white">Ghana</span>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Pay with Paystack (card or Ghana mobile money).
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPayerLocation(PAYER_ABROAD)}
                  className={`rounded-xl border-2 p-4 text-left transition-colors ${
                    payerLocation === PAYER_ABROAD
                      ? "border-amber-600 bg-amber-50 dark:bg-amber-900/20"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-600"
                  }`}
                >
                  <span className="font-semibold text-gray-900 dark:text-white">Abroad</span>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Pay with Mobile Money (MoMo) and wait for admin verification.
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
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Your email{" "}
                    <span className="font-normal text-gray-500">
                      (Gmail, Yahoo, or Apple mail—we&apos;ll send login steps after payment)
                    </span>
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="you@gmail.com or you@icloud.com"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Contact (phone number)
                  </label>
                  <CountryPhoneInput
                    label={null}
                    value={guestPhone}
                    onChange={setGuestPhone}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {isLoggedIn && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contact (optional)
                </label>
                <CountryPhoneInput
                  label={null}
                  value={guestPhone}
                  onChange={setGuestPhone}
                  disabled={loading}
                />
              </div>
            )}

            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-900/20">
              <h4 className="mb-3 text-lg font-semibold text-amber-900 dark:text-amber-100">
                Amount to pay
              </h4>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Executive (incl. Community):</span>
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  ₵{amountToPay.toFixed(2)}
                </span>
              </div>
              {salePrice > 0 && salePrice < membershipAmount && (
                <div className="mt-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Regular price:</span>
                  <span className="line-through">₵{membershipAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {payerLocation === PAYER_GHANA && (
              <>
                <div className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white">
                  <h3 className="mb-2 flex items-center gap-2 text-xl font-bold">
                    <FaInfoCircle className="h-6 w-6" />
                    Pay with Paystack
                  </h3>
                  <p className="text-sm text-white/90">
                    You will be redirected to Paystack. Executive and Community access start
                    after payment is confirmed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePayWithPaystack}
                  disabled={loading || isInternationalMoMoPending}
                  className="w-full rounded-xl bg-amber-600 py-3 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Redirecting..." : "Pay with Paystack"}
                </button>
              </>
            )}

            {payerLocation === PAYER_ABROAD && (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
                  Send the amount below to our Mobile Money account, then confirm below so we can
                  verify and approve your Executive membership.
                </div>
                <div className="space-y-3 rounded-xl border-2 border-gray-200 p-5 dark:border-gray-700">
                  <div className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-900">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600 dark:text-gray-400">MoMo name</span>
                      <span className="font-semibold text-gray-900 dark:text-white">BuySellClub</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600 dark:text-gray-400">Registered name</span>
                      <span className="text-right font-semibold text-gray-900 dark:text-white">
                        DANIEL TWUMASI
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600 dark:text-gray-400">Number</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        054 437 0928
                      </span>
                    </div>
                  </div>
                </div>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-gray-300"
                    checked={abroadPaymentConfirmed}
                    onChange={(e) => setAbroadPaymentConfirmed(e.target.checked)}
                    disabled={isInternationalMoMoPending}
                  />
                  <span>
                    I have sent <strong>₵{amountToPay.toFixed(2)}</strong> to the MoMo number above.
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleInternationalSubmit}
                  disabled={loading || !abroadPaymentConfirmed || isInternationalMoMoPending}
                  className="w-full rounded-xl bg-amber-600 py-3 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit payment notice"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
