// Add to imports at top of file
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
  FaEnvelope, // ADD THIS
} from "react-icons/fa";

// Add state variable after realName
const [email, setEmail] = useState("");

// Add validation function after handlePlatformChange
const validatePhoneFormat = (phone) => {
  // Format: 233-000000000 (9 digits) or 233-0000000000 (10 digits)
  const phoneRegex = /^233-\d{9,10}$/;
  return phoneRegex.test(phone);
};

// Update proceedToPaymentInstructions - add after alipayAccount check
if (accountType === "personal") {
  if (!validatePhoneFormat(alipayAccount)) {
    toast.error(
      "Personal account must be in format: 233-000000000 or 233-0000000000"
    );
    return;
  }
  if (!email.trim()) {
    toast.error("Email is required for personal accounts");
    return;
  }
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    toast.error("Please enter a valid email address");
    return;
  }
}

// Add to paymentData in handleSubmit
const paymentData = {
  accountType,
  alipayAccount,
  realName,
  email: accountType === "personal" ? email : "", // ADD THIS
  qrCodeImage: qrCodeData,
  proofOfPayment: proofOfPaymentPreview,
  originalCurrency: currency,
  originalAmount: parseFloat(amount),
  convertedCurrency: currency === "CEDI" ? "CNY" : "CEDI",
  convertedAmount: parseFloat(convertedAmount),
  exchangeRate: rate,
  platformSource,
};
