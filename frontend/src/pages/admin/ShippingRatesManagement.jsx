import React, { useState, useEffect } from "react";
import { FaSave, FaHistory, FaDollarSign } from "react-icons/fa";
import { toast } from "../../utils/toast";
import API from "../../api";

const ShippingRatesManagement = () => {
  const [rates, setRates] = useState({
    normal_goods_rate: "",
    special_goods_rate: "",
    normal_goods_rate_lt1: "",
    special_goods_rate_lt1: "",
  });
  const [loading, setLoading] = useState(false);
  const [rateHistory, setRateHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [containers, setContainers] = useState([]);
  const [containerRates, setContainerRates] = useState([]);
  const [showContainerModal, setShowContainerModal] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [containerRateForm, setContainerRateForm] = useState({
    normal_goods_rate: "",
    special_goods_rate: "",
    normal_goods_rate_lt1: "",
    special_goods_rate_lt1: "",
  });
  const [savingContainerRate, setSavingContainerRate] = useState(false);
  const [storageFees, setStorageFees] = useState({
    fee_below_1_cbm: "",
    fee_1_cbm_and_above: "",
    grace_days: "5",
  });
  const [savingStorageFees, setSavingStorageFees] = useState(false);

  useEffect(() => {
    fetchCurrentRate();
    fetchStorageFees();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [contResp, ratesResp] = await Promise.all([
          API.get("/buysellapi/containers/public/", { params: { all: true } }).catch(() => ({ data: [] })),
          API.get("/buysellapi/container-shipping-rates/").catch(() => ({ data: [] })),
        ]);
        setContainers(Array.isArray(contResp.data) ? contResp.data : contResp.data?.results || []);
        setContainerRates(Array.isArray(ratesResp.data) ? ratesResp.data : []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [showContainerModal]);

  const fetchCurrentRate = async () => {
    try {
      setLoading(true);
      const response = await API.get("/buysellapi/shipping-rates/");

      if (response.data) {
        setRates({
          normal_goods_rate: response.data.normal_goods_rate || "",
          special_goods_rate: response.data.special_goods_rate || "",
          normal_goods_rate_lt1:
            response.data.normal_goods_rate_lt1?.toString() || "",
          special_goods_rate_lt1:
            response.data.special_goods_rate_lt1?.toString() || "",
        });
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Error fetching shipping rates:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageFees = async () => {
    try {
      const response = await API.get("/buysellapi/storage-fee-settings/");
      if (response.data) {
        setStorageFees({
          fee_below_1_cbm: String(response.data.fee_below_1_cbm ?? ""),
          fee_1_cbm_and_above: String(response.data.fee_1_cbm_and_above ?? ""),
          grace_days: String(response.data.grace_days ?? "5"),
        });
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Error fetching storage fees:", error);
      }
    }
  };

  const handleStorageFeesSubmit = async (e) => {
    e.preventDefault();
    const below = parseFloat(storageFees.fee_below_1_cbm);
    const gte = parseFloat(storageFees.fee_1_cbm_and_above);
    const grace = parseInt(storageFees.grace_days, 10);
    if (
      Number.isNaN(below) ||
      Number.isNaN(gte) ||
      Number.isNaN(grace) ||
      below < 0 ||
      gte < 0 ||
      grace < 0
    ) {
      toast.error("Enter valid storage fee amounts and grace days (0 or more)");
      return;
    }
    try {
      setSavingStorageFees(true);
      await API.post("/buysellapi/storage-fee-settings/", {
        fee_below_1_cbm: below,
        fee_1_cbm_and_above: gte,
        grace_days: grace,
        is_active: true,
      });
      toast.success("Storage fee settings saved");
      fetchStorageFees();
    } catch (error) {
      console.error("Error saving storage fees:", error);
      toast.error(
        error?.response?.data?.error || "Failed to save storage fee settings"
      );
    } finally {
      setSavingStorageFees(false);
    }
  };

  const fetchRateHistory = async () => {
    try {
      const response = await API.get("/buysellapi/shipping-rates/all/");
      setRateHistory(response.data || []);
      setShowHistory(true);
    } catch (error) {
      console.error("Error fetching rate history:", error);
      toast.error("Failed to load rate history");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !rates.normal_goods_rate ||
      !rates.special_goods_rate ||
      !rates.normal_goods_rate_lt1 ||
      !rates.special_goods_rate_lt1
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    if (
      parseFloat(rates.normal_goods_rate) <= 0 ||
      parseFloat(rates.special_goods_rate) <= 0 ||
      parseFloat(rates.normal_goods_rate_lt1) <= 0 ||
      parseFloat(rates.special_goods_rate_lt1) <= 0
    ) {
      toast.error("Rates must be greater than zero");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        normal_goods_rate: parseFloat(rates.normal_goods_rate),
        special_goods_rate: parseFloat(rates.special_goods_rate),
        normal_goods_rate_lt1: parseFloat(rates.normal_goods_rate_lt1),
        special_goods_rate_lt1: parseFloat(rates.special_goods_rate_lt1),
        is_active: true,
      };

      await API.post("/buysellapi/shipping-rates/", payload);

      toast.success("Shipping rates updated successfully");
      fetchCurrentRate();
    } catch (error) {
      console.error("Error updating shipping rates:", error);
      toast.error(
        error?.response?.data?.error || "Failed to update shipping rates"
      );
    } finally {
      setLoading(false);
    }
  };

  const openContainerRateModal = (container, existing) => {
    setSelectedContainer(container);
    if (existing) {
      setContainerRateForm({
        normal_goods_rate: String(existing.normal_goods_rate ?? ""),
        special_goods_rate: String(existing.special_goods_rate ?? ""),
        normal_goods_rate_lt1: String(existing.normal_goods_rate_lt1 ?? existing.normal_goods_rate ?? ""),
        special_goods_rate_lt1: String(existing.special_goods_rate_lt1 ?? existing.special_goods_rate ?? ""),
      });
    } else {
      setContainerRateForm({
        normal_goods_rate: rates.normal_goods_rate || "",
        special_goods_rate: rates.special_goods_rate || "",
        normal_goods_rate_lt1: rates.normal_goods_rate_lt1 || "",
        special_goods_rate_lt1: rates.special_goods_rate_lt1 || "",
      });
    }
    setShowContainerModal(true);
  };

  const handleSaveContainerRate = async (e) => {
    e.preventDefault();
    if (!selectedContainer) return;
    const id = selectedContainer.id ?? selectedContainer;
    if (!containerRateForm.normal_goods_rate || !containerRateForm.special_goods_rate ||
        !containerRateForm.normal_goods_rate_lt1 || !containerRateForm.special_goods_rate_lt1) {
      toast.error("Please fill all rate fields");
      return;
    }
    setSavingContainerRate(true);
    try {
      await API.post("/buysellapi/container-shipping-rates/", {
        container_id: id,
        is_agent_rate: false,
        normal_goods_rate: parseFloat(containerRateForm.normal_goods_rate),
        special_goods_rate: parseFloat(containerRateForm.special_goods_rate),
        normal_goods_rate_lt1: parseFloat(containerRateForm.normal_goods_rate_lt1),
        special_goods_rate_lt1: parseFloat(containerRateForm.special_goods_rate_lt1),
      });
      toast.success("Container rate saved");
      setShowContainerModal(false);
      setSelectedContainer(null);
      const ratesResp = await API.get("/buysellapi/container-shipping-rates/");
      setContainerRates(Array.isArray(ratesResp.data) ? ratesResp.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.container_id?.[0] || err?.response?.data?.detail || "Failed to save");
    } finally {
      setSavingContainerRate(false);
    }
  };

  const handleClearContainerRate = async (container) => {
    const id = container.id ?? container;
    if (!window.confirm(`Remove custom rate for this container? It will use the global rate.`)) return;
    try {
      await API.delete("/buysellapi/container-shipping-rates/", {
        params: { container_id: id, is_agent_rate: "false" },
      });
      toast.success("Container rate cleared");
      const ratesResp = await API.get("/buysellapi/container-shipping-rates/");
      setContainerRates(Array.isArray(ratesResp.data) ? ratesResp.data : []);
    } catch (err) {
      toast.error("Failed to clear");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Shipping Rates Management
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Set and manage shipping rates per CBM for different types of goods
        </p>
      </div>

      {/* Global rate (used when no container rate is set) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Global Shipping Rate (default for all containers)
          </h3>
          <button
            onClick={fetchRateHistory}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
          >
            <FaHistory /> View History
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Normal Goods Rate */}
            <div>
              <label
                htmlFor="normalRate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                <div className="flex items-center gap-2">
                  <FaDollarSign className="text-green-600" />
                  <span>Normal Goods Rate (per CBM)</span>
                </div>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  id="normalRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={rates.normal_goods_rate}
                  onChange={(e) =>
                    setRates({ ...rates, normal_goods_rate: e.target.value })
                  }
                  className="w-full pl-8 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                  placeholder="0.00"
                  required
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Rate charged per cubic meter (CBM) for regular shipments
              </p>
            </div>

            {/* Special Goods Rate */}
            <div>
              <label
                htmlFor="specialRate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                <div className="flex items-center gap-2">
                  <FaDollarSign className="text-orange-600" />
                  <span>Special Goods Rate (per CBM)</span>
                </div>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  id="specialRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={rates.special_goods_rate}
                  onChange={(e) =>
                    setRates({ ...rates, special_goods_rate: e.target.value })
                  }
                  className="w-full pl-8 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-semibold"
                  placeholder="0.00"
                  required
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Rate charged per cubic meter (CBM) for special/fragile items
              </p>
            </div>
            {/* Normal Goods Rate (CBM < 1) */}
            <div>
              <label
                htmlFor="normalRateLt1"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                <div className="flex items-center gap-2">
                  <FaDollarSign className="text-green-600" />
                  <span>Normal Goods Rate (CBM &lt; 1)</span>
                </div>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  id="normalRateLt1"
                  type="number"
                  step="0.01"
                  min="0"
                  value={rates.normal_goods_rate_lt1}
                  onChange={(e) =>
                    setRates({
                      ...rates,
                      normal_goods_rate_lt1: e.target.value,
                    })
                  }
                  className="w-full pl-8 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                  placeholder="0.00"
                  required
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Rate used when shipment volume is below 1 CBM
              </p>
            </div>

            {/* Special Goods Rate (CBM < 1) */}
            <div>
              <label
                htmlFor="specialRateLt1"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                <div className="flex items-center gap-2">
                  <FaDollarSign className="text-orange-600" />
                  <span>Special Goods Rate (CBM &lt; 1)</span>
                </div>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  id="specialRateLt1"
                  type="number"
                  step="0.01"
                  min="0"
                  value={rates.special_goods_rate_lt1}
                  onChange={(e) =>
                    setRates({
                      ...rates,
                      special_goods_rate_lt1: e.target.value,
                    })
                  }
                  className="w-full pl-8 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-semibold"
                  placeholder="0.00"
                  required
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Rate used when shipment volume is below 1 CBM
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
            >
              <FaSave /> {loading ? "Saving..." : "Save Rates"}
            </button>
          </div>
        </form>

        {/* Rate Preview */}
        {rates.normal_goods_rate &&
          rates.special_goods_rate &&
          rates.normal_goods_rate_lt1 &&
          rates.special_goods_rate_lt1 && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Rate Preview
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Normal Goods
                    </span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${parseFloat(rates.normal_goods_rate).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    per CBM
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Normal Goods (CBM &lt; 1)
                    </span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${parseFloat(rates.normal_goods_rate_lt1).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    for shipments below 1 CBM
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Special Goods
                    </span>
                    <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      ${parseFloat(rates.special_goods_rate).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    per CBM
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Special Goods (CBM &lt; 1)
                    </span>
                    <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      ${parseFloat(rates.special_goods_rate_lt1).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    for shipments below 1 CBM
                  </p>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Storage fees (past container arrival + grace days) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
          Storage fees
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Charged on open shipping invoices when <strong>either</strong> the invoice
          payment due date has passed <strong>or</strong> the container arrival date in
          Ghana plus grace days has passed. Set container arrival dates where used. Fee
          tier uses total CBM: <strong>0–0.9 CBM</strong> vs <strong>1 CBM and above</strong>.
          Rates are <strong>per day (daily add-on)</strong> in Ghana cedis (GH₵). Total storage
          on an invoice = daily rate × number of days past due. Freight stays in USD.{" "}
          <strong>Grace days</strong> below are the default for containers that do not set
          their own invoice due period.
        </p>
        <form onSubmit={handleStorageFeesSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Daily rate — 0 to 0.9 CBM (GH₵/day)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={storageFees.fee_below_1_cbm}
                onChange={(e) =>
                  setStorageFees({ ...storageFees, fee_below_1_cbm: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Daily rate — 1 CBM and above (GH₵/day)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={storageFees.fee_1_cbm_and_above}
                onChange={(e) =>
                  setStorageFees({
                    ...storageFees,
                    fee_1_cbm_and_above: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Grace days after arrival
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={storageFees.grace_days}
                onChange={(e) =>
                  setStorageFees({ ...storageFees, grace_days: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Storage applies after this many days from container arrival date
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingStorageFees}
              className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 font-medium disabled:opacity-50"
            >
              <FaSave /> {savingStorageFees ? "Saving..." : "Save storage fees"}
            </button>
          </div>
        </form>
      </div>

      {/* Per-container customer rates */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
          Per-container customer rates
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Set a shipping rate for a specific container. Invoices and tracking fees for that container will use this rate instead of the global rate.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-200">Container</th>
                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-200">Customer rate</th>
                <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {containers.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-4 text-gray-500 dark:text-gray-400">No containers found.</td></tr>
              ) : (
                containers.map((c) => {
                  const containerId = c.id ?? c;
                  const containerNumber = c.container_number ?? `#${containerId}`;
                  const existing = containerRates.find((r) => Number(r.container) === Number(containerId) && !r.is_agent_rate);
                  return (
                    <tr key={containerId}>
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{containerNumber}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                        {existing ? `$${Number(existing.normal_goods_rate).toFixed(2)} / $${Number(existing.special_goods_rate).toFixed(2)}` : "Use global"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => openContainerRateModal(c, existing)}
                          className="text-pink-600 dark:text-pink-400 hover:underline mr-2"
                        >
                          {existing ? "Edit" : "Set rate"}
                        </button>
                        {existing && (
                          <button
                            type="button"
                            onClick={() => handleClearContainerRate(c)}
                            className="text-gray-500 dark:text-gray-400 hover:underline"
                          >
                            Clear
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Container rate modal */}
      {showContainerModal && selectedContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Rate for {selectedContainer.container_number ?? selectedContainer.id ?? "container"}
            </h3>
            <form onSubmit={handleSaveContainerRate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Normal (per CBM) $</label>
                  <input type="number" step="0.01" min="0" required value={containerRateForm.normal_goods_rate} onChange={(e) => setContainerRateForm((f) => ({ ...f, normal_goods_rate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Special (per CBM) $</label>
                  <input type="number" step="0.01" min="0" required value={containerRateForm.special_goods_rate} onChange={(e) => setContainerRateForm((f) => ({ ...f, special_goods_rate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Normal (CBM &lt; 1) $</label>
                  <input type="number" step="0.01" min="0" required value={containerRateForm.normal_goods_rate_lt1} onChange={(e) => setContainerRateForm((f) => ({ ...f, normal_goods_rate_lt1: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Special (CBM &lt; 1) $</label>
                  <input type="number" step="0.01" min="0" required value={containerRateForm.special_goods_rate_lt1} onChange={(e) => setContainerRateForm((f) => ({ ...f, special_goods_rate_lt1: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => { setShowContainerModal(false); setSelectedContainer(null); }} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">Cancel</button>
                <button type="submit" disabled={savingContainerRate} className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 disabled:opacity-50">{savingContainerRate ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rate History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Rate History
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {rateHistory.length > 0 ? (
                <div className="space-y-4">
                  {rateHistory.map((rate) => (
                    <div
                      key={rate.id}
                      className={`p-4 rounded-lg border ${
                        rate.is_active
                          ? "border-blue-300 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {rate.is_active && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full mr-2">
                              ACTIVE
                            </span>
                          )}
                          {new Date(rate.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Normal Goods
                          </span>
                          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                            ${parseFloat(rate.normal_goods_rate).toFixed(2)}{" "}
                            /CBM
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Normal Goods (CBM &lt; 1)
                          </span>
                          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                            {rate.normal_goods_rate_lt1 !== null &&
                            rate.normal_goods_rate_lt1 !== undefined
                              ? `$${parseFloat(
                                  rate.normal_goods_rate_lt1
                                ).toFixed(2)}`
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Special Goods
                          </span>
                          <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                            ${parseFloat(rate.special_goods_rate).toFixed(2)}{" "}
                            /CBM
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Special Goods (CBM &lt; 1)
                          </span>
                          <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                            {rate.special_goods_rate_lt1 !== null &&
                            rate.special_goods_rate_lt1 !== undefined
                              ? `$${parseFloat(
                                  rate.special_goods_rate_lt1
                                ).toFixed(2)}`
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No rate history available
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingRatesManagement;
