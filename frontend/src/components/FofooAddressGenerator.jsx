import React, { useState, useEffect } from "react";
import {
  FaMapMarkerAlt,
  FaCopy,
  FaCheck,
  FaArrowLeft,
  FaEdit,
  FaSave,
  FaTimes,
  FaTruck,
  FaInfoCircle,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import API from "../api";

const FofoofoAddressGenerator = () => {
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [hasAddress, setHasAddress] = useState(false);
  const [existingAddress, setExistingAddress] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const token =
      localStorage.getItem("token") || localStorage.getItem("adminToken");
    if (!token) {
      toast.info("Please log in to generate your shipping address.");
      return;
    }

    // Always check for existing address first before doing anything else
    checkExistingUserAddress();
  }, [navigate]);

  const checkExistingUserAddress = async () => {
    try {
      setIsLoading(true);
      const resp = await API.get("/buysellapi/shipping-marks/me/");
      const data = resp?.data;
      if (data && data.markId) {
        setExistingAddress(data);
        setHasAddress(true);
        // Cache for offline fallback
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
      console.error("Error checking existing address:", err);
      toast.error("Failed to check existing address");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const generateAddress = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    // Require authentication before attempting to create
    const token =
      localStorage.getItem("token") || localStorage.getItem("adminToken");
    if (!token) {
      toast.error("Please log in to generate your shipping address.");
      // Small delay so the toast is visible before navigation
      setTimeout(() => {
        window.location.href = "/Login";
      }, 300);
      return;
    }
    try {
      setIsLoading(true);
      const resp = await API.post("/buysellapi/shipping-marks/me/", {
        name: name.trim(),
      });
      const data = resp?.data;
      if (data && data.markId) {
        setExistingAddress(data);
        setHasAddress(true);
        // Cache for offline fallback
        localStorage.setItem("userShippingMark", JSON.stringify(data));
        toast.success("Shipping address generated successfully!");
      }
    } catch (err) {
      if (err?.response?.status === 200 && err?.response?.data?.markId) {
        // Backend returns 200 with existing mark if already created
        const data = err.response.data;
        setExistingAddress(data);
        setHasAddress(true);
        localStorage.setItem("userShippingMark", JSON.stringify(data));
        toast.info(
          "You already have a shipping mark. Showing existing address."
        );
      } else if (
        err?.response?.status === 401 ||
        err?.response?.status === 403
      ) {
        toast.error("Your session has expired. Please log in again.");
        setTimeout(() => {
          window.location.href = "/Login";
        }, 400);
      } else if (
        err?.response?.status === 404 &&
        (err?.response?.data?.message || "").toLowerCase().includes("profile")
      ) {
        // Auto-heal: ensure profile exists, then retry creation once
        try {
          await API.post("/buysellapi/users/ensure-profile/");
          const retry = await API.post("/buysellapi/shipping-marks/me/", {
            name: name.trim(),
          });
          const data2 = retry?.data;
          if (data2 && data2.markId) {
            setExistingAddress(data2);
            setHasAddress(true);
            localStorage.setItem("userShippingMark", JSON.stringify(data2));
            toast.success("Shipping address generated successfully!");
            return;
          }
        } catch (healErr) {
          console.error("Auto-create profile failed:", healErr);
          toast.error(
            "We couldn't create your profile automatically. Please contact support or try logging out and back in."
          );
        }
      } else {
        console.error("Error creating shipping address:", err);
        toast.error(
          err?.response?.data?.message || "Failed to create shipping address"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // No separate updateShippingTab needed; profile reads from backend

  const handleEditName = () => {
    if (!existingAddress) return;
    setTempName(existingAddress.name);
    setIsEditing(true);
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) {
      toast.error("Please enter a valid name");
      return;
    }
    const token =
      localStorage.getItem("token") || localStorage.getItem("adminToken");
    if (!token) {
      toast.error("Please log in to update your shipping mark.");
      setTimeout(() => {
        window.location.href = "/Login";
      }, 300);
      return;
    }
    try {
      setIsLoading(true);
      const resp = await API.put("/buysellapi/shipping-marks/me/", {
        name: tempName.trim(),
        updateUserProfile: false,
      });
      const data = resp?.data;
      if (data && data.markId) {
        setExistingAddress(data);
        setIsEditing(false);
        localStorage.setItem("userShippingMark", JSON.stringify(data));
        toast.success("Shipping mark name updated!");
      }
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        toast.error("Please log in to update your shipping mark.");
        setTimeout(() => {
          window.location.href = "/Login";
        }, 300);
      } else {
        console.error("Failed to update shipping mark name:", err);
        toast.error(
          err?.response?.data?.message || "Failed to update shipping mark"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setTempName("");
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
      toast.error("Failed to copy to clipboard. Please try manually.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        {/* Back Button */}
        <Link
          to="/Shipping"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 mb-6 group border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary"
        >
          <FaArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Shipping Dashboard</span>
        </Link>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {/* Card Header */}
          <div className="bg-primary/10 dark:bg-primary/20 p-8 lg:p-10 text-center">
            <div className="flex justify-center mb-4">
              <FaTruck className="text-5xl lg:text-6xl text-primary" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white mb-2">
              fofoofoimport Shipping Address Generator
            </h1>
            <p className="text-base lg:text-lg text-gray-600 dark:text-gray-400">
              Generate your unique shipping address for fofoofoimport warehouse
            </p>
          </div>

          {/* Card Body */}
          <div className="p-8 lg:p-10 relative">
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center z-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            )}

            {!hasAddress ? (
              <div className="mb-8">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Generate Shipping Address
                  </label>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter your name"
                      disabled={isLoading}
                    />
                    <button
                      onClick={generateAddress}
                      className={`px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap ${
                        isLoading ? "opacity-70 cursor-not-allowed" : ""
                      }`}
                      disabled={isLoading}
                    >
                      {isLoading ? "Generating..." : "Generate Address"}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mt-6">
                  <div className="flex items-start gap-2">
                    <FaInfoCircle className="text-blue-500 mt-1" />
                    <div>
                      <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">
                        Important Information
                      </p>
                      <p className="text-blue-800 dark:text-blue-200 text-sm">
                        You can only create one shipping mark per user. After
                        generating your address, you will only be able to edit
                        your name, not create additional shipping marks.
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
                      <p className="text-green-800 dark:text-green-200 font-medium mb-1">
                        Address Already Generated
                      </p>
                      <p className="text-green-800 dark:text-green-200 text-sm">
                        You have already generated your shipping address. You
                        can view and copy it below.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                    <FaMapMarkerAlt className="text-primary" />
                    Your Shipping Address
                  </h2>
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <button
                        onClick={handleEditName}
                        className="flex items-center gap-2 px-4 py-2 text-primary hover:text-primary/90 transition-colors"
                        disabled={isLoading}
                      >
                        <FaEdit className="w-4 h-4" />
                        Edit Name
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveName}
                          className={`flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors ${
                            isLoading ? "opacity-70 cursor-not-allowed" : ""
                          }`}
                          disabled={isLoading}
                        >
                          <FaSave className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                          disabled={isLoading}
                        >
                          <FaTimes className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Shipping Mark
                    </p>
                    <div className="relative">
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-900 dark:text-white break-all">
                          {existingAddress?.shippingMark}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(existingAddress?.shippingMark)
                        }
                        className="absolute top-3 right-3 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        disabled={isLoading}
                      >
                        {copied ? (
                          <FaCheck className="w-5 h-5 text-green-500" />
                        ) : (
                          <FaCopy className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Full Address
                    </p>
                    <div className="relative">
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-900 dark:text-white break-all whitespace-pre-line">
                          {existingAddress?.fullAddress}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(existingAddress?.fullAddress)
                        }
                        className="absolute top-3 right-3 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        disabled={isLoading}
                      >
                        {copied ? (
                          <FaCheck className="w-5 h-5 text-green-500" />
                        ) : (
                          <FaCopy className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {existingAddress?.markId && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Mark ID
                      </p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {existingAddress.markId}
                        </p>
                      </div>
                    </div>
                  )}

                  {existingAddress?.createdAt && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Created At
                      </p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {new Date(existingAddress.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-8">
                <button
                  onClick={checkExistingUserAddress}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
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

// Make sure the export is clear and explicit
export default FofoofoAddressGenerator;
