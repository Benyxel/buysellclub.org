import React, { useState, useEffect } from "react";
import {
  FaMapMarkerAlt,
  FaCopy,
  FaCheck,
  FaArrowLeft,
  FaTruck,
  FaInfoCircle,
  FaShip,
  FaPlane,
  FaWhatsapp,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { toast } from "../utils/toast";
import "react-toastify/dist/ReactToastify.css";
import API from "../api";
import { CHINA_REGION_CODE, getRevealedRegions, setRegionRevealed } from "../utils/addressRevealedRegions";
import { formatMarkIdForDisplay, formatMarkIdInText } from "../utils/markIdFormat";

/**
 * How-to videos (SEA / AIR): local files only — no URLs / embed links.
 * Put MP4 (or WebM) files in `frontend/public/videos/` and set the path below.
 * Served from site root, e.g. file at public/videos/sea-guide.mp4 → "/videos/sea-guide.mp4"
 */
const HOW_TO_VIDEO_SEA_FILE = "/videos/fofoofo-address-sea.mp4";
const HOW_TO_VIDEO_AIR_FILE = "/videos/fofoofo-address-air.mp4";

/** WhatsApp for air-shipping notice (same flow as home SupportWidget). */
const AIR_ADDRESS_WHATSAPP_PHONE = "+233540266839";

const FofooAddressGenerator = () => {
  const [fullName, setFullName] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [showAirCopyModal, setShowAirCopyModal] = useState(false);
  const [showSeaCopyModal, setShowSeaCopyModal] = useState(false);
  const [showRepackCopyModal, setShowRepackCopyModal] = useState(false);
  const [hasAddress, setHasAddress] = useState(false);
  const [existingAddress, setExistingAddress] = useState(null);
  const [hasRevealedThisRegion, setHasRevealedThisRegion] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [hasSyncedName, setHasSyncedName] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const token =
      localStorage.getItem("token") || localStorage.getItem("adminToken");
    if (!token) {
      toast.info("Please log in to generate your shipping address.");
      setIsLoadingUser(false);
      return;
    }

      // Load current user to get full name
    loadCurrentUser();
  }, [navigate]);

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
      // Check for existing address after loading user
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
    }
  };

  useEffect(() => {
    setHasRevealedThisRegion(getRevealedRegions().includes(CHINA_REGION_CODE));
  }, []);

  useEffect(() => {
    const syncName = async () => {
      if (!fullName || !existingAddress?.name || hasSyncedName) return;
      if (existingAddress.name === fullName) {
        setHasSyncedName(true);
        return;
      }
      try {
        const resp = await API.put("/buysellapi/shipping-marks/me/", {
          name: fullName.trim(),
          updateUserProfile: false,
        });
        if (resp?.data?.markId) {
          setExistingAddress(resp.data);
          localStorage.setItem("userShippingMark", JSON.stringify(resp.data));
          setHasSyncedName(true);
        }
      } catch (error) {
        console.error("Failed to sync shipping mark name:", error);
      }
    };

    syncName();
  }, [fullName, existingAddress, hasSyncedName]);

  useEffect(() => {
    if (!showAirCopyModal && !showSeaCopyModal && !showRepackCopyModal) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setShowAirCopyModal(false);
        setShowSeaCopyModal(false);
        setShowRepackCopyModal(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAirCopyModal, showSeaCopyModal, showRepackCopyModal]);

  const showAddressForThisRegion = () => {
    if (existingAddress) {
      setRegionRevealed(CHINA_REGION_CODE);
      setHasRevealedThisRegion(true);
      return;
    }
    generateAddress();
  };

  const generateAddress = async () => {
    if (!fullName.trim()) {
      toast.error("Username not found. Please log in again.");
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
        name: fullName.trim(),
      });
      const data = resp?.data;
      if (data && data.markId) {
        setExistingAddress(data);
        setHasAddress(true);
        setRegionRevealed(CHINA_REGION_CODE);
        setHasRevealedThisRegion(true);
        // Cache for offline fallback
        localStorage.setItem("userShippingMark", JSON.stringify(data));
        toast.success("Shipping address generated successfully!");
      } else {
        console.warn("Unexpected response format:", data);
        toast.error("Received unexpected response format. Please try again or contact support.");
      }
    } catch (err) {
      if (err?.response?.status === 200 && err?.response?.data?.markId) {
        // Backend returns 200 with existing mark if already created
        const data = err.response.data;
        setExistingAddress(data);
        setHasAddress(true);
        setRegionRevealed(CHINA_REGION_CODE);
        setHasRevealedThisRegion(true);
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
            name: fullName.trim(),
          });
          const data2 = retry?.data;
            if (data2 && data2.markId) {
            setExistingAddress(data2);
            setHasAddress(true);
            setRegionRevealed(CHINA_REGION_CODE);
            setHasRevealedThisRegion(true);
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
        const errorMessage = err?.response?.data?.message || 
                            err?.response?.data?.error ||
                            err?.message ||
                            "Failed to create shipping address. Please try again or contact support.";
        toast.error(errorMessage);
        
        // Log full error details for debugging
        if (err?.response) {
          console.error("Response status:", err.response.status);
          console.error("Response data:", err.response.data);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // No separate updateShippingTab needed; profile reads from backend

  const copyToClipboard = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      if (id === "air") {
        setShowAirCopyModal(true);
      } else if (id === "full") {
        setShowSeaCopyModal(true);
      } else if (id === "repack") {
        setShowRepackCopyModal(true);
      } else {
        toast.success("Copied to clipboard!", {
          toastId: `copied-${id}-${Date.now()}`,
        });
      }
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
      toast.error("Failed to copy to clipboard. Please try manually.");
    }
  };

  const resolvedMarkName =
    (fullName && fullName.trim()) || existingAddress?.name || "";
  const displayShippingMark =
    existingAddress?.markId && resolvedMarkName
      ? `${formatMarkIdForDisplay(existingAddress.markId)}:${resolvedMarkName}`
      : existingAddress?.shippingMark;
  const defaultFullAddress =
    existingAddress?.fullAddress ||
    existingAddress?.full_address ||
    existingAddress?.fullAddress ||
    "";
  const baseChinaAddress =
    "FOFOOFOIMPORT Phone number :18084390850 Address:广东省深圳市宝安区石岩街道金台路7号伟建产业园B栋106户*";
  const ghSuffix = " 加纳";
  const defaultAddressText =
    displayShippingMark
      ? `${baseChinaAddress}${displayShippingMark}${ghSuffix}`
      : defaultFullAddress;
  const defaultAddressTextDisplay = formatMarkIdInText(defaultAddressText || defaultFullAddress);
  // Air address: fixed format for 8302专线 (Guangzhou) — uses full name
  const airAddressName =
    (resolvedMarkName && resolvedMarkName.trim()) || existingAddress?.name || "";
  const airAddressText =
    existingAddress?.markId && airAddressName
      ? `FIM-${airAddressName} 18620999572\n广东省广州市越秀区广园西路101号通通商贸城AB110档8302专线\n入仓唛头贴外箱：\nFIM 8302-${airAddressName}`
      : "";
  const repackAddressText =
    displayShippingMark
      ? `${baseChinaAddress}${displayShippingMark}"REPACK"${ghSuffix}`
      : "";
  const repackAddressTextDisplay = formatMarkIdInText(repackAddressText);
  const repackAddressParts = displayShippingMark
    ? {
        prefix: `${baseChinaAddress}${displayShippingMark}"`,
        suffix: `"${ghSuffix}`,
      }
    : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        {/* Back Button */}
        <Link
          to="/Shipping"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 mb-6 group border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary"
        >
          <FaArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Shipping Addresses</span>
        </Link>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {/* Card Header */}
          <div className="bg-primary/10 dark:bg-primary/20 p-8 lg:p-10 text-center">
            <div className="flex justify-center mb-4">
              <FaTruck className="text-5xl lg:text-6xl text-primary" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white mb-2">
              China Address Generator
            </h1>
            <p className="text-base lg:text-lg text-gray-600 dark:text-gray-400">
              Fofoofoimport China warehouse – generate your unique shipping address for shipments from China
            </p>
          </div>

          {/* How to paste this address in shopping apps (SEA vs AIR) */}
          <div className="px-8 lg:px-10 pt-2 pb-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              How to use this address in your apps
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-3xl">
              Watch the short guides below: one for <strong className="text-gray-800 dark:text-gray-200">sea</strong>{" "}
              shipments and one for <strong className="text-gray-800 dark:text-gray-200">air</strong>. Paste the address
              from this page into Pinduoduo, 1688, or your supplier app the same way as shown.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 bg-blue-50/80 dark:bg-blue-900/20">
                  <FaShip className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Sea shipping</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Full / repack warehouse address</p>
                  </div>
                </div>
                <div className="relative w-full aspect-video bg-black dark:bg-black">
                  {HOW_TO_VIDEO_SEA_FILE?.trim() ? (
                    <video
                      className="absolute inset-0 w-full h-full object-contain"
                      controls
                      playsInline
                      preload="metadata"
                      src={HOW_TO_VIDEO_SEA_FILE.trim()}
                    >
                      Your browser does not support video playback.
                    </video>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-sm text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/5">
                      <span>Sea video: add your file under public/videos/ and set HOW_TO_VIDEO_SEA_FILE</span>
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-500 break-all">
                        e.g. /videos/fofoofo-address-sea.mp4
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 bg-sky-50/80 dark:bg-sky-900/20">
                  <FaPlane className="text-sky-600 dark:text-sky-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Air shipping</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Guangzhou air line (8302) address</p>
                  </div>
                </div>
                <div className="relative w-full aspect-video bg-black dark:bg-black">
                  {HOW_TO_VIDEO_AIR_FILE?.trim() ? (
                    <video
                      className="absolute inset-0 w-full h-full object-contain"
                      controls
                      playsInline
                      preload="metadata"
                      src={HOW_TO_VIDEO_AIR_FILE.trim()}
                    >
                      Your browser does not support video playback.
                    </video>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-sm text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/5">
                      <span>Air video: add your file under public/videos/ and set HOW_TO_VIDEO_AIR_FILE</span>
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-500 break-all">
                        e.g. /videos/fofoofo-address-air.mp4
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Your Full Name
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Your shipping mark will be generated in FIM000 format (e.g., FIM000, FIM001) using your full name
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {isLoadingUser ? (
                        <span className="text-gray-400">Loading name...</span>
                      ) : fullName ? (
                        <span className="font-medium">{fullName}</span>
                      ) : (
                        <span className="text-red-500">Name not found</span>
                      )}
                    </div>
                    <button
                      onClick={generateAddress}
                      className={`w-full sm:w-auto px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap font-medium ${
                        isLoading || isLoadingUser || !fullName ? "opacity-70 cursor-not-allowed" : ""
                      }`}
                      disabled={isLoading || isLoadingUser || !fullName}
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
                        You can only create one shipping mark per user. Your shipping mark will be generated in FIM000 format (e.g., FIM000, FIM001). Once generated, the shipping mark cannot be edited.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : !hasRevealedThisRegion && existingAddress ? (
              <div className="mb-8">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Your Full Name
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {fullName ? <span className="font-medium">{fullName}</span> : <span className="text-gray-400">—</span>}
                    </div>
                    <button
                      onClick={showAddressForThisRegion}
                      className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap font-medium"
                    >
                      Generate / Show address
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Click &quot;Generate / Show address&quot; to view your China warehouse address.
                </p>
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

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <div className="flex justify-between items-start mb-4 sm:mb-6 px-4 sm:px-6 pt-4 sm:pt-6">
                    <h2 className="text-base sm:text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                      <FaMapMarkerAlt className="text-primary" />
                      Your Shipping Address
                    </h2>
                    {existingAddress?.markId && (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Permanent
                      </span>
                    )}
                  </div>
                  <div className="p-4 sm:p-6 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Shipping mark (ID)
                      </p>
                      <div className="relative">
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-sm text-gray-900 dark:text-white break-all">
                            {formatMarkIdInText(displayShippingMark)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard("mark", formatMarkIdInText(displayShippingMark))}
                          className="absolute top-3 right-3 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          disabled={isLoading}
                        >
                          {copiedId === "mark" ? (
                            <FaCheck className="w-5 h-5 text-green-500" />
                          ) : (
                            <FaCopy className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Full shipping address (China)
                      </p>
                      <div className="relative">
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-sm text-gray-900 dark:text-white break-all whitespace-pre-line">
                            {defaultAddressTextDisplay || formatMarkIdInText(defaultFullAddress)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              "full",
                              defaultAddressTextDisplay || formatMarkIdInText(defaultFullAddress)
                            )
                          }
                          className="absolute top-3 right-3 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          disabled={isLoading}
                        >
                          {copiedId === "full" ? (
                            <FaCheck className="w-5 h-5 text-green-500" />
                          ) : (
                            <FaCopy className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {repackAddressText && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Repack address (China)
                        </p>
                        <div className="relative">
                          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-sm text-gray-900 dark:text-white break-all whitespace-pre-line">
                              {repackAddressParts ? (
                                <>
                                  {repackAddressParts.prefix}
                                  <span className="font-semibold">REPACK</span>
                                  {repackAddressParts.suffix}
                                </>
                              ) : (
                                repackAddressTextDisplay
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard("repack", repackAddressTextDisplay)}
                            className="absolute top-3 right-3 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            disabled={isLoading}
                          >
                            {copiedId === "repack" ? (
                              <FaCheck className="w-5 h-5 text-green-500" />
                            ) : (
                              <FaCopy className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {airAddressText && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Air shipping address (China)
                        </p>
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                          <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">
                            The air address is hidden. Request it on WhatsApp.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const clean = AIR_ADDRESS_WHATSAPP_PHONE.replace(/[^\d]/g, "");
                              const msg = encodeURIComponent(
                                `Hi, I want to request the Air shipping address.\\n\\nMy shipping mark: ${displayShippingMark || ""}`.trim()
                              );
                              window.open(
                                `https://wa.me/${clean}?text=${msg}`,
                                "_blank",
                                "noopener,noreferrer"
                              );
                            }}
                            className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 text-sm font-semibold transition-colors w-full sm:w-auto"
                          >
                            Request Air Address (WhatsApp)
                          </button>
                        </div>
                      </div>
                    )}

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

        {showAirCopyModal && (
          <div
            className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="air-address-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAirCopyModal(false);
            }}
          >
            <div
              className="relative w-full max-w-md rounded-2xl bg-red-50 dark:bg-red-950/50 shadow-2xl border-2 border-red-200 dark:border-red-800/80 p-6 sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="air-address-modal-title"
                className="text-lg font-semibold text-red-900 dark:text-red-100 text-center mb-3"
              >
                Air shipping address
              </h2>
              <p className="text-sm text-red-800/90 dark:text-red-200/90 text-center mb-3">
                Please tell us the product you are shipping via air before you use this address.
              </p>
              <p className="text-sm text-red-950 dark:text-red-50 text-left mb-4 rounded-lg bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-700/60 p-3 leading-relaxed">
                Please do not send any package to this address except{" "}
                <strong>laptops</strong>, <strong>phones</strong>,{" "}
                <strong>tablets</strong>, and <strong>drones</strong>. If a{" "}
                <strong>sea</strong> shipment is sent to the <strong>air</strong>{" "}
                address by mistake, a fee of <strong>370 RMB</strong> applies.
              </p>
              <p className="text-sm font-medium text-red-700 dark:text-red-300 text-center mb-6">
                Copied to clipboard.
              </p>
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const clean = AIR_ADDRESS_WHATSAPP_PHONE.replace(/[^\d]/g, "");
                    window.open(
                      `https://wa.me/${clean}`,
                      "_blank",
                      "noopener,noreferrer"
                    );
                  }}
                  className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 text-sm font-semibold transition-colors w-full max-w-xs"
                >
                  <FaWhatsapp className="text-base shrink-0" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAirCopyModal(false)}
                  className="text-sm font-medium text-red-800 dark:text-red-300 hover:text-red-950 dark:hover:text-red-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showSeaCopyModal && (
          <div
            className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sea-address-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowSeaCopyModal(false);
            }}
          >
            <div
              className="relative w-full max-w-md rounded-2xl bg-red-50 dark:bg-red-950/50 shadow-2xl border-2 border-red-200 dark:border-red-800/80 p-6 sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="sea-address-modal-title"
                className="text-lg font-semibold text-red-900 dark:text-red-100 text-center mb-3"
              >
                Sea shipping address
              </h2>
              <div className="text-sm text-red-950 dark:text-red-50 text-left mb-4 rounded-lg bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-700/60 p-3 leading-relaxed">
                <p className="font-semibold mb-2">Important notes</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>
                    Note: We don’t inspect personal goods for clients. Verify
                    your products from your suppliers.
                  </li>
                  <li>
                    Chassis numbers must be provided for motorbikes and tricycles
                    before we can ship.
                  </li>
                  <li>
                    You must inform us if your goods include tiles, liquids,
                    batteries, paints, fertilizer, or heavy-duty products.
                  </li>
                </ol>
              </div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300 text-center mb-6">
                Copied to clipboard.
              </p>
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const clean = AIR_ADDRESS_WHATSAPP_PHONE.replace(/[^\d]/g, "");
                    window.open(
                      `https://wa.me/${clean}`,
                      "_blank",
                      "noopener,noreferrer"
                    );
                  }}
                  className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 text-sm font-semibold transition-colors w-full max-w-xs"
                >
                  <FaWhatsapp className="text-base shrink-0" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSeaCopyModal(false)}
                  className="text-sm font-medium text-red-800 dark:text-red-300 hover:text-red-950 dark:hover:text-red-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showRepackCopyModal && (
          <div
            className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="repack-address-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowRepackCopyModal(false);
            }}
          >
            <div
              className="relative w-full max-w-md rounded-2xl bg-red-50 dark:bg-red-950/50 shadow-2xl border-2 border-red-200 dark:border-red-800/80 p-6 sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="repack-address-modal-title"
                className="text-lg font-semibold text-red-900 dark:text-red-100 text-center mb-3"
              >
                Repack address
              </h2>
              <div className="text-sm text-red-950 dark:text-red-50 text-left mb-4 rounded-lg bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-700/60 p-3 leading-relaxed">
                <p className="font-semibold mb-2">Important notes</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>
                    Note: We don’t inspect personal goods for clients. Verify
                    your products from your suppliers.
                  </li>
                  <li>
                    Chassis numbers must be provided for motorbikes and tricycles
                    before we can ship.
                  </li>
                </ol>
              </div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300 text-center mb-6">
                Copied to clipboard.
              </p>
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const clean = AIR_ADDRESS_WHATSAPP_PHONE.replace(/[^\d]/g, "");
                    window.open(
                      `https://wa.me/${clean}`,
                      "_blank",
                      "noopener,noreferrer"
                    );
                  }}
                  className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 text-sm font-semibold transition-colors w-full max-w-xs"
                >
                  <FaWhatsapp className="text-base shrink-0" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowRepackCopyModal(false)}
                  className="text-sm font-medium text-red-800 dark:text-red-300 hover:text-red-950 dark:hover:text-red-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FofooAddressGenerator;

