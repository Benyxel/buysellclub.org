import React, { useState, useEffect } from "react";
import {
  FaMapMarkerAlt,
  FaCopy,
  FaCheck,
  FaArrowLeft,
  FaTruck,
  FaInfoCircle,
} from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import { toast } from "../utils/toast";
import API from "../api";
import { getRevealedRegions, setRegionRevealed } from "../utils/addressRevealedRegions";
import { formatMarkIdForDisplay, formatMarkIdInText } from "../utils/markIdFormat";

// Same key as China address / profile shipping mark tab – one mark for all regions
const USER_SHIPPING_MARK_KEY = "userShippingMark";

const getStoredShippingMark = () => {
  try {
    const raw = localStorage.getItem(USER_SHIPPING_MARK_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return data && data.markId ? data : null;
  } catch {
    return null;
  }
};

const RegionAddressGenerator = () => {
  const { code } = useParams();
  const [warehouse, setWarehouse] = useState(null);
  const [loadingWarehouse, setLoadingWarehouse] = useState(true);
  const [fullName, setFullName] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [hasAddress, setHasAddress] = useState(false);
  const [existingAddress, setExistingAddress] = useState(null);
  const [hasRevealedThisRegion, setHasRevealedThisRegion] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    if (!code) return;
    const fetchWarehouse = async () => {
      try {
        setLoadingWarehouse(true);
        const res = await API.get(`/buysellapi/warehouse-addresses/${encodeURIComponent(code)}/`);
        setWarehouse(res.data);
      } catch (e) {
        console.error(e);
        toast.error("Warehouse not found or inactive.");
        setWarehouse(null);
      } finally {
        setLoadingWarehouse(false);
      }
    };
    fetchWarehouse();
  }, [code]);

  // China-address logic: use stored address first; do not fetch from backend on every open
  useEffect(() => {
    if (!warehouse) return;
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    if (!token) {
      toast.info("Please log in to generate your shipping address.");
      setIsLoadingUser(false);
      return;
    }
    const revealed = getRevealedRegions().includes((code || "").toLowerCase());
    setHasRevealedThisRegion(revealed);
    const stored = getStoredShippingMark();
    if (stored) {
      setExistingAddress(stored);
      setHasAddress(true);
      setFullName(stored.name || stored.full_name || "");
      setIsLoadingUser(false);
      return;
    }
    loadCurrentUserForName();
  }, [warehouse, code]);

  const loadCurrentUserForName = async () => {
    try {
      setIsLoadingUser(true);
      const response = await API.get("/buysellapi/users/me/");
      if (response.data && (response.data.full_name || response.data.username)) {
        setFullName(response.data.full_name || response.data.username);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const revealThisRegion = () => {
    if (code) {
      setRegionRevealed(code);
      setHasRevealedThisRegion(true);
    }
  };

  const generateAddress = async () => {
    if (!fullName?.trim()) {
      toast.error("Username not found. Please log in again.");
      return;
    }
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    if (!token) {
      toast.error("Please log in to generate your shipping address.");
      setTimeout(() => { window.location.href = "/Login"; }, 300);
      return;
    }
    try {
      setIsLoading(true);
      const resp = await API.post("/buysellapi/shipping-marks/me/", { name: fullName.trim() });
      const data = resp?.data;
      if (data && data.markId) {
        setExistingAddress(data);
        setHasAddress(true);
        setFullName(data.name || data.full_name || fullName);
        localStorage.setItem(USER_SHIPPING_MARK_KEY, JSON.stringify(data));
        revealThisRegion();
        toast.success("Shipping address generated successfully!");
      } else {
        toast.error("Unexpected response. Please try again.");
      }
    } catch (err) {
      if (err?.response?.status === 200 && err?.response?.data?.markId) {
        const data = err.response.data;
        setExistingAddress(data);
        setHasAddress(true);
        setFullName(data.name || data.full_name || fullName);
        localStorage.setItem(USER_SHIPPING_MARK_KEY, JSON.stringify(data));
        revealThisRegion();
        toast.info("You already have a shipping mark. Showing existing address.");
      } else if (err?.response?.status === 401 || err?.response?.status === 403) {
        toast.error("Your session has expired. Please log in again.");
        setTimeout(() => { window.location.href = "/Login"; }, 400);
      } else {
        toast.error(err?.response?.data?.message || err?.message || "Failed to create shipping address.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const showAddressForThisRegion = () => {
    if (existingAddress) {
      revealThisRegion();
      return;
    }
    generateAddress();
  };

  const copyToClipboard = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("Failed to copy.");
    }
  };

  const baseAddress = warehouse?.baseAddress ?? warehouse?.base_address ?? "";
  const warehousePhone = (warehouse?.phone ?? "").trim();
  const addressLine = (warehouse?.address_line ?? "").trim();
  const city = (warehouse?.city ?? "").trim();
  const state = (warehouse?.state ?? "").trim();
  const stateFull = (warehouse?.state_full ?? "").trim();
  const zipcode = (warehouse?.zipcode ?? "").trim();
  const country = (warehouse?.country ?? "").trim();
  const useUsaFormat = Boolean(addressLine);

  const resolvedMarkName = (fullName && fullName.trim()) || existingAddress?.name || "";
  const displayShippingMark = existingAddress?.markId && resolvedMarkName
    ? `${formatMarkIdForDisplay(existingAddress.markId)}:${resolvedMarkName}`
    : existingAddress?.shippingMark;

  const usaAddressLines = (() => {
    if (!useUsaFormat || !displayShippingMark) return [];
    const recipient = `${formatMarkIdForDisplay(existingAddress?.markId ?? "")} ${resolvedMarkName}`.trim();
    return [
      { label: "Recipient / Name", value: `${recipient} (FOFOOFO)` },
      addressLine ? { label: "Address Line", value: addressLine } : null,
      city ? { label: "City", value: city } : null,
      state ? { label: "State / Province", value: stateFull ? `${state} (${stateFull})` : state } : null,
      zipcode ? { label: "Zipcode", value: zipcode } : null,
      country ? { label: "Country", value: country } : null,
      warehousePhone ? { label: "Phone", value: warehousePhone } : null,
    ].filter(Boolean);
  })();

  const fullAddressText = (() => {
    if (!displayShippingMark) return "";
    if (useUsaFormat && usaAddressLines.length > 0) {
      return usaAddressLines
        .map(({ label, value }) => `${label}: ${value}`)
        .join("\n");
    }
    const baseAddressTrimmed = baseAddress.replace(/\s*\*\s*$/, "").trim();
    const addressLines = [baseAddressTrimmed];
    if (warehousePhone) addressLines.push(`Phone: ${warehousePhone}`);
    const fullAddressBody = addressLines.filter(Boolean).join("\n");
    return formatMarkIdInText(`${displayShippingMark}\n${fullAddressBody}`);
  })();

  if (loadingWarehouse || !code) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Warehouse not found.</p>
          <Link to="/Shipping" className="text-primary hover:underline">Back to Shipping Addresses</Link>
        </div>
      </div>
    );
  }

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
              {warehouse.display_name} Address Generator
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Generate your unique shipping address for our {warehouse.display_name} warehouse
            </p>
          </div>

          <div className="p-8 relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center z-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
              </div>
            )}

            {!hasAddress ? (
              <div className="mb-8">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Full Name</label>
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
                        Your shipping mark is shared across all regions. Generate your address here to create or use your existing mark; your {warehouse.display_name} address will only be shown after you click Generate.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : !hasRevealedThisRegion ? (
              <div className="mb-8">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Full Name</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {isLoadingUser ? "Loading name..." : fullName || "Name not found"}
                    </div>
                    <button
                      onClick={showAddressForThisRegion}
                      disabled={isLoading || isLoadingUser || !fullName}
                      className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed font-medium"
                    >
                      {isLoading ? "Generating..." : "Generate / Show address"}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Click &quot;Generate / Show address&quot; to view your {warehouse.display_name} warehouse address.
                </p>
              </div>
            ) : existingAddress ? (
              <div className="mb-8">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <FaCheck className="text-green-500 mt-1" />
                    <div>
                      <p className="text-green-800 dark:text-green-200 font-medium">Address ready</p>
                      <p className="text-green-800 dark:text-green-200 text-sm">
                        Your {warehouse.display_name} warehouse address is below.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <div className="flex justify-between items-start mb-4 sm:mb-6 px-4 sm:px-6 pt-4 sm:pt-6">
                    <h2 className="text-base sm:text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                      <FaMapMarkerAlt className="text-primary" />
                      {warehouse.display_name} Address
                    </h2>
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Permanent</span>
                  </div>
                  <div className="p-4 sm:p-6 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Shipping mark (ID)</p>
                      <div className="relative">
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-sm text-gray-900 dark:text-white break-all">
                            {formatMarkIdInText(displayShippingMark)}
                          </p>
                        </div>
                        <button type="button" onClick={() => copyToClipboard("mark", formatMarkIdInText(displayShippingMark))} className="absolute top-3 right-3 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                          {copiedId === "mark" ? <FaCheck className="w-5 h-5 text-green-500" /> : <FaCopy className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Full {warehouse.display_name} address</p>
                      <div className="relative">
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          {useUsaFormat && usaAddressLines.length > 0 ? (
                            <dl className="space-y-2 text-sm">
                              {usaAddressLines.map(({ label, value }) => (
                                <div key={label} className="flex gap-3">
                                  <dt className="text-gray-500 dark:text-gray-400 font-medium shrink-0 w-[10.5rem]">{label}:</dt>
                                  <dd className="text-gray-900 dark:text-white break-words flex-1 min-w-0">{value}</dd>
                                </div>
                              ))}
                            </dl>
                          ) : (
                            <p className="text-sm text-gray-900 dark:text-white break-all whitespace-pre-line">{fullAddressText}</p>
                          )}
                        </div>
                        <button type="button" onClick={() => copyToClipboard("full", fullAddressText)} className="absolute top-3 right-3 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200" title="Copy full address">
                          {copiedId === "full" ? <FaCheck className="w-5 h-5 text-green-500" /> : <FaCopy className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-8">
                <button onClick={checkExistingUserAddress} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
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

export default RegionAddressGenerator;
