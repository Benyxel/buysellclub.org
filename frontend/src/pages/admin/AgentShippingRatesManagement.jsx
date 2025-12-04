import React, { useState, useEffect } from "react";
import { FaSave, FaHistory, FaDollarSign, FaUserTag } from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../../api";

const AgentShippingRatesManagement = () => {
  const [rates, setRates] = useState({
    normal_goods_rate: "",
    special_goods_rate: "",
    normal_goods_rate_lt1: "",
    special_goods_rate_lt1: "",
  });
  const [loading, setLoading] = useState(false);
  const [rateHistory, setRateHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchCurrentRate();
  }, []);

  const fetchCurrentRate = async () => {
    try {
      setLoading(true);
      // Use agent-specific shipping rates endpoint
      const response = await API.get("/buysellapi/agent/shipping-rates/");

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
        console.error("Error fetching agent shipping rates:", error);
      }
      // If endpoint doesn't exist yet, initialize with empty values
      setRates({
        normal_goods_rate: "",
        special_goods_rate: "",
        normal_goods_rate_lt1: "",
        special_goods_rate_lt1: "",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRateHistory = async () => {
    try {
      const response = await API.get("/buysellapi/agent/shipping-rates/all/");
      setRateHistory(response.data || []);
      setShowHistory(true);
    } catch (error) {
      console.error("Error fetching agent rate history:", error);
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
        is_agent_rate: true, // Mark as agent-specific rate
      };

      await API.post("/buysellapi/agent/shipping-rates/", payload);

      toast.success("Agent shipping rates updated successfully");
      fetchCurrentRate();
    } catch (error) {
      console.error("Error updating agent shipping rates:", error);
      toast.error(
        error?.response?.data?.error || "Failed to update agent shipping rates"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
          <FaUserTag className="text-blue-600" />
          Agent Shipping Rates Management
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Set and manage shipping rates per CBM for agent shipments. These rates are separate from regular client rates.
        </p>
      </div>

      {/* Current Rates Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Current Agent Shipping Rates
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
                Agent rate charged per cubic meter (CBM) for regular shipments
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
                Agent rate charged per cubic meter (CBM) for special/fragile items
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
                Agent rate used when shipment volume is below 1 CBM
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
                Agent rate used when shipment volume is below 1 CBM
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
            >
              <FaSave /> {loading ? "Saving..." : "Save Agent Rates"}
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
                Agent Rate Preview
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
                    per CBM (Agent)
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
                    for shipments below 1 CBM (Agent)
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
                    per CBM (Agent)
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
                    for shipments below 1 CBM (Agent)
                  </p>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Rate History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Agent Rate History
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
                  No agent rate history available
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentShippingRatesManagement;
