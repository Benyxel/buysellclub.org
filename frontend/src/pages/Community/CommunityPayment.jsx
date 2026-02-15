import React, { useEffect, useState } from "react";
import { FaInfoCircle, FaMoneyBillWave, FaAlipay, FaUpload } from "react-icons/fa";
import { toast } from "../../utils/toast";
import { Link } from "react-router-dom";
import { Api } from "../../api";

const CommunityPayment = () => {
  const [membershipAmount, setMembershipAmount] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [proofOfPayment, setProofOfPayment] = useState(null);
  const [proofOfPaymentPreview, setProofOfPaymentPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null);

  const fetchSettingsAndStatus = async () => {
    try {
      const [settingsResp, requestResp] = await Promise.all([
        Api.community.settings.get({ noCache: true }),
        Api.community.myRequest({ noCache: true }),
      ]);
      setMembershipAmount(Number(settingsResp.data?.membership_amount || 0));
      setSalePrice(Number(settingsResp.data?.sale_price || 0));
      setRequestStatus(requestResp.data?.request?.status || null);
    } catch (error) {
      console.error("Failed to load community payment info:", error);
      toast.error("Failed to load payment information");
    }
  };

  const amountToPay =
    salePrice > 0 && salePrice < membershipAmount ? salePrice : membershipAmount;

  useEffect(() => {
    fetchSettingsAndStatus();

    const refresh = () => fetchSettingsAndStatus();
    const handleFocus = () => refresh();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    });

    const handleStorage = (e) => {
      if (e.key === "communitySettingsUpdatedAt") {
        refresh();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleProofOfPaymentChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Proof of payment image must be less than 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    setProofOfPayment(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofOfPaymentPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proofOfPaymentPreview) {
      toast.error("Please upload proof of payment");
      return;
    }
    try {
      setLoading(true);
      await Api.community.submitRequest({
        proof_of_payment: proofOfPaymentPreview,
      });
      toast.success("Community request submitted. Await admin approval.");
      setProofOfPayment(null);
      setProofOfPaymentPreview("");
      await fetchSettingsAndStatus();
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Failed to submit community request";
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
            You are not joining a noisy group chat. You’re joining a structured
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
              Community Payment
            </h1>
            <Link
              to="/Community"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Back to Join Community
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Complete payment using the details below and upload your proof.
          </p>
        </div>

        {requestStatus && requestStatus !== "rejected" && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-2xl p-5 text-sm text-yellow-900 dark:text-yellow-100">
            You already have a {requestStatus} request. Submit a new proof only if your
            previous request was rejected.
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-6 border border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-xl">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <FaInfoCircle className="w-6 h-6" />
              Payment Instructions
            </h3>
            <p className="text-sm text-white/90">
              Please complete payment using one of the options below before uploading proof.
            </p>
          </div>

          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FaMoneyBillWave className="w-5 h-5 text-green-600" />
              Bank Transfer Details
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Account Name:
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  BUY SELL CLUB LTD
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Bank:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ECOBANK(ACHIMOTA)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Account Number:
                </span>
                <span className="font-mono font-bold text-lg text-blue-600 dark:text-blue-400">
                  1441004957068
                </span>
              </div>
            </div>
          </div>

          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FaAlipay className="w-5 h-5 text-purple-600" />
              Mobile Money (MoMo) Details
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  Buy Sell Club
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Number:
                </span>
                <span className="font-mono font-bold text-lg text-blue-600 dark:text-blue-400">
                  054 437 0928
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Merchant ID:
                </span>
                <span className="font-mono font-semibold text-gray-900 dark:text-white">
                  060140
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              Amount to Pay
            </h4>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Membership Fee:</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                ₵{amountToPay.toFixed(2)}
              </span>
            </div>
            {salePrice > 0 && salePrice < membershipAmount && (
              <div className="flex justify-between items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Regular Price:</span>
                <span className="line-through">₵{membershipAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center">
              <input
                type="file"
                id="proofUpload"
                className="hidden"
                accept="image/*"
                onChange={handleProofOfPaymentChange}
              />
              <label
                htmlFor="proofUpload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {proofOfPaymentPreview ? (
                  <img
                    src={proofOfPaymentPreview}
                    alt="Proof of Payment"
                    className="max-h-48 rounded-lg shadow-md"
                  />
                ) : (
                  <>
                    <FaUpload className="text-3xl text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Click to upload proof of payment
                    </span>
                  </>
                )}
              </label>
            </div>
            <button
              type="submit"
              disabled={loading || (requestStatus && requestStatus !== "rejected")}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Submit Proof"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CommunityPayment;


