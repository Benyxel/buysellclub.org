import React, { useState, useEffect } from "react";
import { FaSave, FaHistory, FaDollarSign } from "react-icons/fa";
import { toast } from "../../utils/toast";
import API from "../../api";

const AdShippingRatesManagement = () => {
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
      const response = await API.get("/buysellapi/ad-shipping-rates/");
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
        console.error("Error fetching ad shipping rates:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRateHistory = async () => {
    try {
      const response = await API.get("/buysellapi/ad-shipping-rates/all/");
      setRateHistory(response.data || []);
      setShowHistory(true);
    } catch (error) {
      console.error("Error fetching ad rate history:", error);
      toast.error("Failed to load ad rate history");
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

      await API.post("/buysellapi/ad-shipping-rates/", payload);
      toast.success("Ad shipping rates updated successfully");
      fetchCurrentRate();
    } catch (error) {
      console.error("Error updating ad shipping rates:", error);
      toast.error(
        error?.response?.data?.error || "Failed to update ad shipping rates"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Ad Shipping Rates
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Set the public-facing shipping rates for normal and special goods.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Current Ad Shipping Rates
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
            <div>
              <label
                htmlFor="adNormalRate"
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
                  id="adNormalRate"
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
                Displayed public rate for normal goods.
              </p>
            </div>

            <div>
              <label
                htmlFor="adSpecialRate"
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
                  id="adSpecialRate"
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
                Displayed public rate for special goods.
              </p>
            </div>
            <div>
              <label
                htmlFor="adNormalRateLt1"
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
                  id="adNormalRateLt1"
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
                Used when total CBM is less than 1 (normal goods).
              </p>
            </div>

            <div>
              <label
                htmlFor="adSpecialRateLt1"
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
                  id="adSpecialRateLt1"
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
                Used when total CBM is less than 1 (special goods).
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-3 rounded-lg text-white flex items-center gap-2 ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <FaSave />
              {loading ? "Saving..." : "Save Rates"}
            </button>
          </div>
        </form>
      </div>

      {showHistory && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Ad Rate History
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Normal Rate
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Special Rate
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Normal &lt; 1
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Special &lt; 1
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Active
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {rateHistory.map((rate) => (
                  <tr key={rate.id}>
                    <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                      ${parseFloat(rate.normal_goods_rate).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                      ${parseFloat(rate.special_goods_rate).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                      {rate.normal_goods_rate_lt1
                        ? `$${parseFloat(rate.normal_goods_rate_lt1).toFixed(2)}`
                        : "N/A"}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                      {rate.special_goods_rate_lt1
                        ? `$${parseFloat(rate.special_goods_rate_lt1).toFixed(2)}`
                        : "N/A"}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {rate.is_active ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          Yes
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                      {rate.created_at
                        ? new Date(rate.created_at).toLocaleString()
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdShippingRatesManagement;

