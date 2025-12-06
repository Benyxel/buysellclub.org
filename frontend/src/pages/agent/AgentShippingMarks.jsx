import React, { useState, useEffect, useCallback } from "react";
import {
  FaMapMarkerAlt,
  FaPlus,
  FaEdit,
  FaCopy,
  FaCheck,
} from "react-icons/fa";
import { toast } from "../../utils/toast";
import API from "../../api";

const AgentShippingMarks = () => {
  const [addresses, setAddresses] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editAddress, setEditAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [displayAddress, setDisplayAddress] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userMarkId, setUserMarkId] = useState("");
  const [businessName, setBusinessName] = useState("");

  const [newAddress, setNewAddress] = useState({
    markId: "",
    name: "",
    fullAddress: "",
    shippingMark: "",
    trackingNumber: "",
  });

  const loadDisplayAddress = useCallback(async () => {
    try {
      const response = await API.get("/api/admin/agent/display-address");
      if (response.data) {
        setDisplayAddress(response.data);
      } else {
        setDisplayAddress(null);
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Error loading display address:", error);
      }
      setDisplayAddress(null);
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    try {
      const response = await API.get("/buysellapi/users/me/");
      setCurrentUser(response.data);

      // Load user's shipping mark to get mark ID
      try {
        const markResponse = await API.get("/buysellapi/shipping-marks/me/");
        const markData = markResponse.data;

        // Handle both camelCase and snake_case formats
        const detectedMarkId = markData?.markId || markData?.mark_id;

        if (detectedMarkId) {
          setUserMarkId(detectedMarkId);
          console.log("Mark ID detected:", detectedMarkId);
        } else {
          console.warn("Mark ID not found in response:", markData);
        }
      } catch (error) {
        // User might not have a shipping mark yet
        console.error("Error loading shipping mark:", error);
        console.log("User shipping mark not found or error occurred");
      }
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  }, []);

  const loadAddresses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await API.get("/api/admin/shipping-marks");
      let allAddresses = [];

      if (response.data && response.data.data) {
        allAddresses = response.data.data;
      } else if (Array.isArray(response.data)) {
        allAddresses = response.data;
      }

      // Filter to only show addresses created by the current agent
      // Addresses are identified by shipping mark starting with the user's mark_id
      const userMarkIdValue = userMarkId || "";

      console.log("Loading addresses - userMarkId:", userMarkIdValue);
      console.log("All addresses count:", allAddresses.length);

      const agentOwnAddresses = allAddresses.filter((addr) => {
        // Exclude base addresses (those with empty shipping mark - these are templates)
        const shippingMark = addr.shippingMark || addr.shipping_mark || "";
        if (!shippingMark.trim()) {
          console.log("Skipping address with empty shipping mark:", addr);
          return false;
        }

        // Only show addresses where shipping mark starts with the current user's mark_id
        // Shipping mark format is "markId:businessName"
        if (userMarkIdValue && shippingMark.startsWith(userMarkIdValue + ":")) {
          console.log("Found matching address:", addr);
          return true;
        }

        console.log("Address doesn't match user mark ID:", {
          shippingMark,
          userMarkId: userMarkIdValue,
          address: addr,
        });
        return false;
      });

      console.log("Filtered addresses count:", agentOwnAddresses.length);
      setAddresses(agentOwnAddresses);
    } catch (error) {
      console.error("Error loading agent addresses:", error);
      toast.error("Failed to load shipping addresses");
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, [userMarkId]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      // Only load display address for corporate agents to use as base template (not for display)
      // This is the base address set in Agent Address Management - used only as template
      if (currentUser.agent_type === "corporate") {
        loadDisplayAddress();
      }
    }
  }, [currentUser, loadDisplayAddress]);

  useEffect(() => {
    // Load addresses after userMarkId is available
    if (userMarkId || currentUser) {
      loadAddresses();
    }
  }, [userMarkId, currentUser, loadAddresses]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);

      // Check if this is a corporate agent generating an address
      const isCorporateAgent = currentUser?.agent_type === "corporate";

      let payload;
      if (isCorporateAgent && !editAddress && displayAddress) {
        // Generate agent address from base address
        if (!businessName.trim()) {
          toast.error("Business name is required");
          setIsLoading(false);
          return;
        }

        if (!userMarkId) {
          toast.error(
            "Shipping mark ID not found. Please ensure you have a shipping mark."
          );
          setIsLoading(false);
          return;
        }

        // Format address according to specification:
        // Name : [business name]
        // Phone number : [phone number]
        // Address: [base address]*[shipping mark] [country]
        const baseAddress =
          displayAddress.fullAddress || displayAddress.full_address || "";
        const phoneNumber = currentUser?.contact || currentUser?.phone || "";
        const country = "加纳"; // Default country (Ghana in Chinese)
        const shippingMark = `${userMarkId}:${businessName.trim()}`;

        // Format the full address
        const formattedAddress = `Name : ${businessName.trim()}\n\nPhone number :${phoneNumber}\n\nAddress:${baseAddress}*${shippingMark} ${country}`;

        payload = {
          markId: userMarkId,
          name: businessName.trim(),
          fullAddress: formattedAddress,
          shippingMark: shippingMark,
          trackingNumber: "",
        };
      } else if (editAddress) {
        // Editing existing address - only allow editing business name
        // Keep the original address structure, only update the name and regenerate shipping mark
        const originalShippingMark =
          editAddress.shipping_mark || editAddress.shippingMark || "";
        const markIdPart = originalShippingMark.split(":")[0] || userMarkId;
        const newBusinessName = newAddress.name.trim();
        const newShippingMark = `${markIdPart}:${newBusinessName}`;

        // Regenerate address with new business name
        const baseAddress =
          displayAddress?.fullAddress || displayAddress?.full_address || "";
        const phoneNumber = currentUser?.contact || currentUser?.phone || "";
        const country = "加纳";
        const formattedAddress = `Name : ${newBusinessName}\n\nPhone number :${phoneNumber}\n\nAddress:${baseAddress}*${newShippingMark} ${country}`;

        payload = {
          markId: markIdPart,
          name: newBusinessName,
          fullAddress: formattedAddress,
          shippingMark: newShippingMark,
          trackingNumber:
            editAddress.tracking_number || editAddress.trackingNumber || "",
        };
      } else {
        // Regular address save (for non-corporate agents)
        payload = {
          markId: newAddress.markId,
          name: newAddress.name,
          fullAddress: newAddress.fullAddress,
          shippingMark: newAddress.shippingMark || "",
          trackingNumber: newAddress.trackingNumber || "",
        };
      }

      if (editAddress) {
        await API.put(
          `/api/admin/shipping-marks/${editAddress.id || editAddress._id}`,
          payload
        );
        toast.success("Shipping address updated successfully");
      } else {
        await API.post("/api/admin/shipping-marks", payload);
        toast.success(
          isCorporateAgent
            ? "Agent address generated successfully!"
            : "Shipping address added successfully"
        );
      }

      setShowAddForm(false);
      setEditAddress(null);
      setBusinessName("");
      setNewAddress({
        markId: "",
        name: "",
        fullAddress: "",
        shippingMark: "",
        trackingNumber: "",
      });
      loadAddresses();
      // Reload display address only if corporate agent (needed for generating new addresses)
      if (currentUser?.agent_type === "corporate") {
        loadDisplayAddress();
      }
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          "Failed to save shipping address"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <FaMapMarkerAlt className="text-purple-600" />
          Shipping Marks & Addresses
        </h2>
        <button
          onClick={() => {
            if (currentUser?.agent_type === "corporate" && !displayAddress) {
              toast.error(
                "Base address not set. Please contact admin to set the base address first."
              );
              return;
            }
            setShowAddForm(true);
            setEditAddress(null);
            setBusinessName("");
            setNewAddress({
              markId: userMarkId || "",
              name: "",
              fullAddress: "",
              shippingMark: "",
              trackingNumber: "",
            });
          }}
          disabled={
            currentUser?.agent_type === "corporate" && addresses.length > 0
          }
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            currentUser?.agent_type === "corporate" && addresses.length > 0
              ? "bg-gray-400 text-gray-200 cursor-not-allowed"
              : "bg-purple-600 text-white hover:bg-purple-700"
          }`}
          title={
            currentUser?.agent_type === "corporate" && addresses.length > 0
              ? "You can only generate one address. Edit your existing address instead."
              : ""
          }
        >
          <FaPlus />{" "}
          {currentUser?.agent_type === "corporate"
            ? "Generate Agent Address"
            : "Add Address"}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            {editAddress
              ? "Edit Shipping Address"
              : currentUser?.agent_type === "corporate"
              ? "Generate Agent Address"
              : "Add New Shipping Address"}
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            {currentUser?.agent_type === "corporate" &&
            !editAddress &&
            displayAddress ? (
              // Corporate agent generating address from base address
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mark ID (Auto-detected)
                    {!userMarkId && (
                      <span className="ml-2 text-red-500 text-xs">
                        ⚠️ Not detected
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={
                      userMarkId ||
                      "Not found - Please ensure you have a shipping mark"
                    }
                    disabled
                    className={`w-full px-3 py-2 border rounded-lg cursor-not-allowed ${
                      userMarkId
                        ? "border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        : "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                    }`}
                  />
                  <p
                    className={`text-xs mt-1 ${
                      userMarkId
                        ? "text-gray-500 dark:text-gray-400"
                        : "text-red-500 dark:text-red-400"
                    }`}
                  >
                    {userMarkId
                      ? "Your shipping mark ID will be used for this address"
                      : "Please create a shipping mark in your profile first"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Enter your business name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This will be used as your shipping mark
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Generated Address (Preview)
                  </label>
                  <textarea
                    rows="8"
                    value={
                      displayAddress && userMarkId && businessName
                        ? (() => {
                            const baseAddress =
                              displayAddress.fullAddress ||
                              displayAddress.full_address ||
                              "";
                            const phoneNumber =
                              currentUser?.contact || currentUser?.phone || "";
                            const country = "加纳";
                            const shippingMark = `${userMarkId}:${businessName.trim()}`;
                            return `Name : ${businessName.trim()}\n\nPhone number :${phoneNumber}\n\nAddress:${baseAddress}*${shippingMark} ${country}`;
                          })()
                        : ""
                    }
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This address will be generated from the base address set by
                    admin
                  </p>
                </div>
              </>
            ) : editAddress && currentUser?.agent_type === "corporate" ? (
              // Edit form for corporate agents - only allow editing business name
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Enter your business name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Only the business name can be edited. The address will be
                    regenerated with the new name.
                  </p>
                </div>
                {displayAddress && userMarkId && businessName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Updated Address (Preview)
                    </label>
                    <textarea
                      rows="8"
                      value={(() => {
                        const baseAddress =
                          displayAddress.fullAddress ||
                          displayAddress.full_address ||
                          "";
                        const phoneNumber =
                          currentUser?.contact || currentUser?.phone || "";
                        const country = "加纳";
                        const shippingMark = `${userMarkId}:${businessName.trim()}`;
                        return `Name : ${businessName.trim()}\n\nPhone number :${phoneNumber}\n\nAddress:${baseAddress}*${shippingMark} ${country}`;
                      })()}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                    />
                  </div>
                )}
              </>
            ) : (
              // Regular form for non-corporate agents (not editing)
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mark ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={newAddress.markId}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, markId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newAddress.name}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Address *
                  </label>
                  <textarea
                    required
                    rows="3"
                    value={newAddress.fullAddress}
                    onChange={(e) =>
                      setNewAddress({
                        ...newAddress,
                        fullAddress: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Shipping Mark
                    </label>
                    <input
                      type="text"
                      value={newAddress.shippingMark}
                      onChange={(e) =>
                        setNewAddress({
                          ...newAddress,
                          shippingMark: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tracking Number
                    </label>
                    <input
                      type="text"
                      value={newAddress.trackingNumber}
                      onChange={(e) =>
                        setNewAddress({
                          ...newAddress,
                          trackingNumber: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {editAddress ? "Update" : "Add"} Address
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditAddress(null);
                  setBusinessName("");
                  setNewAddress({
                    markId: "",
                    name: "",
                    fullAddress: "",
                    shippingMark: "",
                    trackingNumber: "",
                  });
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Addresses Table */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Your Generated Addresses
        </h3>
        {isLoading && addresses.length === 0 ? (
          <div className="text-center py-8">Loading addresses...</div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {currentUser?.agent_type === "corporate"
              ? "No generated addresses yet. Click 'Generate Agent Address' to create your first address."
              : "No shipping addresses found"}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Mark ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Full Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {addresses.map((address) => {
                    const fullAddressText = `${address.mark_id}:${
                      address.name
                    }\n${address.full_address || address.fullAddress || ""}`;
                    const addressId = address.id || address._id;
                    return (
                      <tr
                        key={addressId}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {address.mark_id || address.markId}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {address.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-md">
                          <div
                            className="truncate"
                            title={address.full_address || address.fullAddress}
                          >
                            {address.full_address || address.fullAddress || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleCopy(fullAddressText, addressId)
                              }
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                              title="Copy address"
                            >
                              {copiedId === addressId ? (
                                <FaCheck />
                              ) : (
                                <FaCopy />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setEditAddress(address);
                                setBusinessName(address.name || "");
                                setNewAddress({
                                  markId:
                                    address.mark_id || address.markId || "",
                                  name: address.name || "",
                                  fullAddress:
                                    address.full_address ||
                                    address.fullAddress ||
                                    "",
                                  shippingMark:
                                    address.shipping_mark ||
                                    address.shippingMark ||
                                    "",
                                  trackingNumber:
                                    address.tracking_number ||
                                    address.trackingNumber ||
                                    "",
                                });
                                setShowAddForm(true);
                              }}
                              className="text-green-600 hover:text-green-800 dark:text-green-400"
                              title="Edit business name"
                            >
                              <FaEdit />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentShippingMarks;
