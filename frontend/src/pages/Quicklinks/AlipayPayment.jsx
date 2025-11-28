import React, { useState, useEffect } from "react";
import {
  FaExchangeAlt,
  FaUser,
  FaMoneyBillWave,
  FaAlipay,
  FaShieldAlt,
  FaCheckCircle,
  FaInfoCircle,
  FaLock,
  FaQrcode,
  FaUpload,
} from "react-icons/fa";
// import alipayImg from '../../assets/rmbi.png';
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import API from "../../api";

// Add platform logos import
import platform1688 from "../../assets/platforms/1688.png";
import pinduoduo from "../../assets/platforms/pinduoduo.png";
import alibaba from "../../assets/platforms/alibaba.png";
import idlefish from "../../assets/platforms/idlefish.png";

const PaymentStep = ({ number, title, description, isActive }) => (
  <div
    className={`flex items-start gap-4 ${
      isActive ? "opacity-100" : "opacity-50"
    }`}
  >
    <div
      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isActive
          ? "bg-blue-500 text-white"
          : "bg-gray-200 text-gray-500 dark:bg-gray-700"
      }`}
    >
      {number}
    </div>
    <div>
      <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  </div>
);

const SecurityBadge = ({ icon, title }) => (
  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
    {icon}
    <span className="text-sm">{title}</span>
  </div>
);

const PlatformLogo = ({ src, alt }) => (
  <div className="group relative">
    <div className="flex items-center justify-center p-4 bg-white dark:bg-gray-700 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <img
        src={src}
        alt={alt}
        className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-110"
      />
    </div>
    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
      {alt}
      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
    </div>
  </div>
);

const AlipayPayment = () => {
  const [accountType, setAccountType] = useState("");
  const [currency, setCurrency] = useState("CEDI");
  const [amount, setAmount] = useState("");
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [rate, setRate] = useState(0.44);
  const [currentStep, setCurrentStep] = useState(1);
  const [alipayAccount, setAlipayAccount] = useState("");
  const [realName, setRealName] = useState("");
  const [qrCode, setQrCode] = useState(null);
  const [qrCodePreview, setQrCodePreview] = useState("");
  const [proofOfPayment, setProofOfPayment] = useState(null);
  const [proofOfPaymentPreview, setProofOfPaymentPreview] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rateLastUpdated, setRateLastUpdated] = useState(new Date());
  const [platformSource, setPlatformSource] = useState("Other");
  const navigate = useNavigate();

  // Fetch current exchange rate from API
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const { data } = await API.get("/buysellapi/alipay-exchange-rate/");
        if (data && (data.ghs_to_cny || data.ghs_to_cny === 0)) {
          setRate(data.ghs_to_cny);
          setRateLastUpdated(
            new Date(data.updated_at || data.updatedAt || Date.now())
          );
        }
      } catch (error) {
        console.error("Error fetching exchange rate:", error);
      }
    };

    fetchExchangeRate();
  }, []);

  // Calculate converted amount when currency, amount or rate changes
  useEffect(() => {
    if (amount && !isNaN(amount)) {
      if (currency === "CEDI") {
        // Convert CEDI to CNY (label only; math stays the same)
        const cny = (parseFloat(amount) * rate).toFixed(2);
        setConvertedAmount(cny);
      } else {
        // Convert CNY to CEDI
        const cedi = (parseFloat(amount) / rate).toFixed(2);
        setConvertedAmount(cedi);
      }
    } else {
      setConvertedAmount(0);
    }
  }, [amount, rate, currency]);

  const handleQrCodeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error("QR code image must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      setQrCode(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrCodePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePlatformChange = (platform) => {
    setPlatformSource(platform);
  };

  const handleProofOfPaymentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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
    }
  };

  const proceedToPaymentInstructions = (e) => {
    e.preventDefault();

    if (!accountType) {
      toast.error("Please select an account type");
      return;
    }

    if (!amount || isNaN(amount)) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!alipayAccount.trim()) {
      toast.error("Please enter your Alipay account");
      return;
    }

    // Additional validation for personal accounts: phone format 233-XXXXXXXXX or 233-XXXXXXXXXX OR a valid email
    if (accountType === "personal") {
      const phoneRegex = /^233-\d{9,10}$/; // 9 or 10 digits after 233-
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isPhone = phoneRegex.test(alipayAccount.trim());
      const isEmail = emailRegex.test(alipayAccount.trim());
      if (!isPhone && !isEmail) {
        toast.error(
          "For personal accounts, enter phone as 233-XXXXXXXXX or 233-XXXXXXXXXX, or a valid email"
        );
        return;
      }
    }

    if (!realName.trim()) {
      toast.error("Please enter the real name on your Alipay account");
      return;
    }

    if (!qrCode) {
      toast.error("Please upload your Alipay QR code");
      return;
    }

    // Move to payment instructions step
    setCurrentStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!proofOfPayment) {
      toast.error("Please upload proof of payment");
      return;
    }

    const startTime = Date.now();
    const MIN_SUBMIT_DELAY = 2000; // 2 seconds minimum delay

    try {
      setIsLoading(true);

      // First, upload the QR code or convert to base64
      let qrCodeData = qrCodePreview; // Using the base64 data

      // Prepare payment data
      const paymentData = {
        accountType,
        alipayAccount,
        realName,
        qrCodeImage: qrCodeData,
        proofOfPayment: proofOfPaymentPreview,
        originalCurrency: currency,
        originalAmount: parseFloat(amount),
        convertedCurrency: currency === "CEDI" ? "CNY" : "CEDI",
        convertedAmount: parseFloat(convertedAmount),
        exchangeRate: rate,
        platformSource,
      };

      // Submit to API and ensure minimum 2-second delay
      const submitPromise = API.post("/api/alipay-payments", paymentData);
      const delayPromise = new Promise((resolve) => {
        const elapsed = Date.now() - startTime;
        const remainingDelay = Math.max(0, MIN_SUBMIT_DELAY - elapsed);
        setTimeout(resolve, remainingDelay);
      });

      // Wait for both API call and minimum delay
      await Promise.all([submitPromise, delayPromise]);

      // Add notification to updates
      const updates = JSON.parse(localStorage.getItem("updates") || "[]");
      updates.unshift({
        id: Date.now().toString(),
        type: "payment",
        title: "New Alipay Payment Submitted",
        message: `Your payment of ${
          currency === "CEDI" ? "₵" : "¥"
        } ${amount} has been submitted for processing.`,
        date: new Date().toISOString(),
        read: false,
      });
      localStorage.setItem("updates", JSON.stringify(updates));

      // Show success messages
      toast.success("Payment details submitted successfully!", {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      // Show additional success message
      toast.info(
        `Your payment request of ${
          currency === "CEDI" ? "₵" : "¥"
        } ${amount} is being processed. You will receive a confirmation email shortly.`,
        {
          position: "top-center",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );

      // Move to success step
      setCurrentStep(3);

      // Navigate to AlipayPayment page after 4 seconds to refresh
      setTimeout(() => {
        navigate("/AlipayPayment");
        window.location.reload();
      }, 4000);
    } catch (error) {
      console.error("Error submitting payment:", error);
      const msg =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        "An error occurred. Please try again.";
      toast.error(msg, {
        position: "top-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Render success message for step 3
  const renderSuccessMessage = () => (
    <div className="flex flex-col items-center justify-center text-center py-8">
      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4 animate-bounce">
        <FaCheckCircle className="w-12 h-12 text-green-500" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Payment Submitted Successfully! ✓
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4 text-lg">
        Your payment request has been received and is being processed.
      </p>
      <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4 mb-6 w-full max-w-md">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          <strong>Payment Details:</strong>
        </p>
        <p className="text-base font-semibold text-gray-900 dark:text-white">
          Amount: {currency === "CEDI" ? "₵" : "¥"} {amount}
        </p>
        {convertedAmount > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Converted: {currency === "CEDI" ? "¥" : "₵"} {convertedAmount}
          </p>
        )}
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-2">
        You will receive a confirmation email shortly.
      </p>
      <p className="text-gray-500 dark:text-gray-500 text-sm mb-6">
        You can track your payment status in your profile.
      </p>
      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 animate-pulse">
        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></div>
        <span>Redirecting to payment page...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {/* Payment Steps */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PaymentStep
                number="1"
                title="Enter Details"
                description="Fill in payment information"
                isActive={currentStep >= 1}
              />
              <PaymentStep
                number="2"
                title="Payment Instructions"
                description="Bank & MoMo details"
                isActive={currentStep >= 2}
              />
              <PaymentStep
                number="3"
                title="Upload Proof"
                description="Complete payment"
                isActive={currentStep >= 3}
              />
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-6">
            {currentStep === 3 ? (
              renderSuccessMessage()
            ) : currentStep === 2 ? (
              // Payment Instructions Step
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-xl">
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <FaInfoCircle className="w-6 h-6" />
                    Payment Instructions
                  </h3>
                  <p className="text-sm text-white/90">
                    Please complete payment using one of the options below
                    before uploading proof
                  </p>
                </div>

                {/* Bank Details */}
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
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Bank:
                      </span>
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

                {/* MoMo Details */}
                <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FaAlipay className="w-5 h-5 text-purple-600" />
                    Mobile Money (MoMo) Details
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Name:
                      </span>
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

                {/* Amount Summary */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-5">
                  <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                    Amount to Pay
                  </h4>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">
                      Original Amount:
                    </span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {currency === "CEDI" ? "₵" : "¥"} {amount}
                    </span>
                  </div>
                  {convertedAmount > 0 && (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Converted:
                      </span>
                      <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                        {currency === "CEDI" ? "¥" : "₵"} {convertedAmount}
                      </span>
                    </div>
                  )}
                </div>

                {/* Upload Proof Section */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FaUpload className="w-5 h-5 text-blue-600" />
                    Upload Proof of Payment{" "}
                    <span className="text-red-500">*</span>
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Please upload a screenshot or photo of your payment
                    receipt/confirmation
                  </p>

                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProofOfPaymentChange}
                      className="hidden"
                      id="proofUpload"
                    />
                    <label
                      htmlFor="proofUpload"
                      className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition"
                    >
                      {proofOfPaymentPreview ? (
                        <div className="space-y-3 w-full">
                          <img
                            src={proofOfPaymentPreview}
                            alt="Proof of Payment"
                            className="max-h-64 mx-auto rounded-lg"
                          />
                          <p className="text-center text-sm text-green-600 dark:text-green-400 font-medium">
                            ✓ Proof uploaded - Click to change
                          </p>
                        </div>
                      ) : (
                        <>
                          <FaQrcode className="w-12 h-12 text-gray-400 mb-3" />
                          <p className="text-gray-600 dark:text-gray-400">
                            Click to upload proof of payment
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            PNG, JPG up to 5MB
                          </p>
                        </>
                      )}
                    </label>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading || !proofOfPayment}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FaCheckCircle className="w-5 h-5" />
                        Submit Payment Request
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              // Step 1: Form Details
              <>
                {/* Platform Logos Section */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium text-gray-700 dark:text-gray-300">
                    Supported Platforms
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div
                      onClick={() => handlePlatformChange("1688.com")}
                      className={`cursor-pointer ${
                        platformSource === "1688.com"
                          ? "ring-2 ring-blue-500"
                          : ""
                      }`}
                    >
                      <PlatformLogo src={platform1688} alt="1688.com" />
                    </div>
                    <div
                      onClick={() => handlePlatformChange("Pinduoduo")}
                      className={`cursor-pointer ${
                        platformSource === "Pinduoduo"
                          ? "ring-2 ring-blue-500"
                          : ""
                      }`}
                    >
                      <PlatformLogo src={pinduoduo} alt="Pinduoduo" />
                    </div>
                    <div
                      onClick={() => handlePlatformChange("Alibaba")}
                      className={`cursor-pointer ${
                        platformSource === "Alibaba"
                          ? "ring-2 ring-blue-500"
                          : ""
                      }`}
                    >
                      <PlatformLogo src={alibaba} alt="Alibaba" />
                    </div>
                    <div
                      onClick={() => handlePlatformChange("Idlefish")}
                      className={`cursor-pointer ${
                        platformSource === "Idlefish"
                          ? "ring-2 ring-blue-500"
                          : ""
                      }`}
                    >
                      <PlatformLogo src={idlefish} alt="Idlefish" />
                    </div>
                  </div>
                </div>

                {/* Exchange Rate Card */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 transform translate-x-1/3 -translate-y-1/3">
                    <div className="absolute inset-0 bg-white opacity-10 transform rotate-45"></div>
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                          <FaExchangeAlt className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm text-white/80">
                            Current Exchange Rate
                          </p>
                          <p className="text-2xl font-bold">{rate}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white/80">Last Updated</p>
                        <p className="text-sm font-medium">
                          {rateLastUpdated.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <div className="flex items-center gap-2 text-sm text-white/80">
                        <FaInfoCircle className="w-4 h-4" />
                        <span>Rate updates every 30 minutes</span>
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Account Type Section */}
                  <div className="space-y-3">
                    <label className="block text-base font-medium text-gray-700 dark:text-gray-300">
                      Account Type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          accountType === "supplier"
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="accountType"
                          value="supplier"
                          checked={accountType === "supplier"}
                          onChange={(e) => setAccountType(e.target.value)}
                          className="form-radio h-4 w-4 text-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900 dark:text-white">
                              Supplier
                            </span>
                            <FaUser className="w-5 h-5 text-blue-500" />
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            For business accounts
                          </p>
                        </div>
                      </label>
                      <label
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          accountType === "personal"
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="accountType"
                          value="personal"
                          checked={accountType === "personal"}
                          onChange={(e) => setAccountType(e.target.value)}
                          className="form-radio h-4 w-4 text-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900 dark:text-white">
                              Personal
                            </span>
                            <FaUser className="w-5 h-5 text-blue-500" />
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            For individual use
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Alipay Account Details Section */}
                  <div className="space-y-4">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                      Alipay Account Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Alipay Account Input */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Alipay Account <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaAlipay className="w-5 h-5 text-blue-500" />
                          </div>
                          <input
                            type="text"
                            value={alipayAccount}
                            onChange={(e) => setAlipayAccount(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder={
                              accountType === "personal"
                                ? "233-000000000 or email@example.com"
                                : "Enter Alipay account (ID/email)"
                            }
                          />
                        </div>
                        {accountType === "personal" && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Format: 233-XXXXXXXXX or 233-XXXXXXXXXX, or a valid
                            email address.
                          </p>
                        )}
                      </div>

                      {/* Real Name Input */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Real Name on Account{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaUser className="w-5 h-5 text-blue-500" />
                          </div>
                          <input
                            type="text"
                            value={realName}
                            onChange={(e) => setRealName(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Enter real name"
                          />
                        </div>
                      </div>
                    </div>

                    {/* QR Code Upload */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Alipay QR Code <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-col items-center justify-center w-full">
                        <label
                          className={`w-full h-48 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all cursor-pointer
                          ${
                            qrCodePreview
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500"
                          }
                        `}
                        >
                          {qrCodePreview ? (
                            <div className="relative w-full h-full p-4">
                              <img
                                src={qrCodePreview}
                                alt="QR Code Preview"
                                className="w-full h-full object-contain rounded-lg"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                                <FaUpload className="w-8 h-8 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center p-4">
                              <FaQrcode className="w-12 h-12 text-gray-400 mb-4" />
                              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                                Click or drag and drop to upload your Alipay QR
                                code
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                PNG, JPG up to 5MB
                              </p>
                            </div>
                          )}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleQrCodeChange}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Currency Toggle Section */}
                  <div className="space-y-3">
                    <label className="block text-base font-medium text-gray-700 dark:text-gray-300">
                      Select Currency
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <div className="flex items-center justify-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={currency === "CNY"}
                            onChange={() =>
                              setCurrency(currency === "CEDI" ? "CNY" : "CEDI")
                            }
                          />
                          <div className="w-full h-14 flex items-center justify-between bg-white dark:bg-gray-600 rounded-lg p-2 shadow-sm">
                            <span
                              className={`px-6 py-2 rounded-md transition-all ${
                                currency === "CEDI"
                                  ? "bg-blue-500 text-white shadow-sm"
                                  : "text-gray-500"
                              }`}
                            >
                              ₵ CEDI
                            </span>
                            <span
                              className={`px-6 py-2 rounded-md transition-all ${
                                currency === "CNY"
                                  ? "bg-blue-500 text-white shadow-sm"
                                  : "text-gray-500"
                              }`}
                            >
                              ¥ CNY
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Amount Input Section */}
                  <div className="space-y-3">
                    <label className="block text-base font-medium text-gray-700 dark:text-gray-300">
                      {currency === "CEDI" ? "Cedi Amount" : "CNY Amount"}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="text-xl font-medium text-gray-500">
                          {currency === "CEDI" ? "₵" : "¥"}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-10 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-sm"
                        placeholder="Enter amount"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <FaLock className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Conversion Result Section */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-4 rounded-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Converted Amount
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {currency === "CEDI" ? "¥" : "₵"} {convertedAmount}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-500/10 rounded-full">
                        <FaExchangeAlt className="w-6 h-6 text-blue-500" />
                      </div>
                    </div>
                  </div>

                  {/* Security Badges */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <SecurityBadge icon={FaShieldAlt} title="Secure Payment" />
                    <SecurityBadge icon={FaLock} title="Encrypted" />
                    <SecurityBadge icon={FaCheckCircle} title="Verified" />
                    <SecurityBadge icon={FaAlipay} title="Alipay Protected" />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    onClick={proceedToPaymentInstructions}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl text-base font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <FaLock className="w-5 h-5" />
                        Continue to Payment
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlipayPayment;
