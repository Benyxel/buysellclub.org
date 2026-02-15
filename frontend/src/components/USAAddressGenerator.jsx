import React, { useState, useEffect } from "react";
import {
  FaMapMarkerAlt,
  FaCopy,
  FaCheck,
  FaArrowLeft,
  FaTruck,
  FaInfoCircle,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { toast } from "../utils/toast";
import API from "../api";

// USA warehouse base address – update with actual details when available
const USA_BASE_ADDRESS =
  "BUYSELLCLUB USA Warehouse, Phone: TBD, Address: [USA warehouse address – to be updated] *";

const USAAddressGenerator = () => {
  const [fullName, setFullName] = useState("");
  const [copied, setCopied] = useState(false);
  const [hasAddress, setHasAddress] = useState(false);
  const [existingAddress, setExistingAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("adminToken");
    if (!token) {
      toast.info("Please log in to generate your shipping address.");
      setIsLoadingUser(false);
      return;
    }
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      setIsLoadingUser(true);
      const response = await API.get("/buysellapi/users/me/");
      if (response.data && (response.data.full_name || response.data.username)) {
        setFullName(response.data.full_name || response.data.username);
      } else {
        toast.error("Unable to load user information. Please try again.");
      }
    } catch (error) {
      console.error("Error loading current user:", error);
      toast.error("Unable to load user information. Please try again.");
    } finally {
      setIsLoadingUser(false);
      checkExistingUserAddress();
    }
  };

  const checkExistingUserAddress = async () => {
    try {
      const resp = await API.get("/buysellapi/shipping-marks/me/");
      const data = resp?.data;
      if (data && data.markId) {
        setExistingAddress(data);
        setHasAddress(true);
        localStorage.setItem("userShippingMark", JSON.stringify(data));
        return true;
      }
      setHasAddress(false);
      setExistingAddress(null);
      return false;
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        toast.error("Please log in to view your shipping address.");
        setHasAddress(false);
        setExistingAddress(null);
        return false;
      }
      if (err?.response?.status === 404) {
        setHasAddress(false);
        setExistingAddress(null);
        return false;
      }
      setHasAddress(false);
      setExistingAddress(null);
      return false;
    }
  };

  const generateAddress = async () => {
    if (!fullName.trim()) {
      toast.error("Username not found. Please log in again.");
      return;
    }
    const token =
      localStorage.getItem("token") || localStorage.getItem("adminToken");
    if (!token) {
      toast.error("Please log in to generate your shipping address.");
      setTimeout(() => { window.location.href = "/Login"; }, 300);
      return;
    }
    try {
      setIsLoading(true);
      const resp = await API.post("/buysellapi/shipping-marks/me/", {
        name: fullName.trim(),
      });
      const data = resp?.data;
      if (data && data.markId) {
        setExistingAddress(data);
        setHasAddress(true);
        localStorage.setItem("userShippingMark", JSON.stringify(data));
        toast.success("Shipping address generated successfully!");
      } else {
        toast.error("Unexpected response. Please try again or contact support.");
      }
    } catch (err) {
      if (err?.response?.status === 200 && err?.response?.data?.markId) {
        const data = err.response.data;
        setExistingAddress(data);
        setHasAddress(true);
        localStorage.setItem("userShippingMark", JSON.stringify(data));
        toast.info("You already have a shipping mark. Showing existing address.");
      } else if (err?.response?.status === 401 || err?.response?.status === 403) {
        toast.error("Your session has expired. Please log in again.");
        setTimeout(() => { window.location.href = "/Login"; }, 400);
      } else {
        const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to create shipping address.";
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy to clipboard. Please try manually.");
    }
  };

  const resolvedMarkName =
    (fullName && fullName.trim()) || existingAddress?.name || "";
  const displayShippingMark =
    existingAddress?.markId && resolvedMarkName
      ? `${existingAddress.markId}:${resolvedMarkName}`
      : existingAddress?.shippingMark;
  const fullAddressUSA =
    displayShippingMark
      ? `${USA_BASE_ADDRESS.replace(" *", "")}${displayShippingMark}`
      : "";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/Shipping"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 mb-6 group border border-gray-200 dark:border-gray-700"
        >
          <FaArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Shipping Addresses</span>
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="bg-primary/10 dark:bg-primary/20 p-8 text-center">
            <FaTruck className="text-5xl text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              USA Address Generator
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Generate your unique shipping address for our USA warehouse
            </p>
          </div>

          <div className="p-8 relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center z-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            )}

            {!hasAddress ? (
              <div className="mb-8">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Your Full Name
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {isLoadingUser ? "Loading name..." : fullName || "Name not found"}
                    </div>
                    <button
                      onClick={generateAddress}
                      disabled={isLoading || isLoadingUser || !fullName}
                      className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed font-medium"
                    >
                      {isLoading ? "Generating..." : "Generate Address"}
                    </button>
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mt-6">
                  <div className="flex items-start gap-2">
                    <FaInfoCircle className="text-blue-500 mt-1" />
                    <div>
                      <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">Important</p>
                      <p className="text-blue-800 dark:text-blue-200 text-sm">
                        Your shipping mark is shared across China, USA, and Dubai. If you already generated a China address, you can view your USA format here.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : existingAddress ? (
              <div className="mb-8">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <FaCheck className="text-green-500 mt-1" />
                    <div>
                      <p className="text-green-800 dark:text-green-200 font-medium">Address ready</p>
                      <p className="text-green-800 dark:text-green-200 text-sm">
                        Your USA warehouse address is below. Use this when shipping to our USA warehouse.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Shipping Mark</p>
                    <div className="relative p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-900 dark:text-white break-all pr-10">{displayShippingMark}</p>
                      <button
                        onClick={() => copyToClipboard(displayShippingMark)}
                        className="absolute top-3 right-3 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        {copied ? <FaCheck className="w-5 h-5 text-green-500" /> : <FaCopy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Full USA Address</p>
                    <div className="relative p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-900 dark:text-white break-all whitespace-pre-line pr-10">
                        {fullAddressUSA}
                      </p>
                      <button
                        onClick={() => copyToClipboard(fullAddressUSA)}
                        className="absolute top-3 right-3 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        {copied ? <FaCheck className="w-5 h-5 text-green-500" /> : <FaCopy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-8">
                <button
                  onClick={checkExistingUserAddress}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Check for existing address
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default USAAddressGenerator;
