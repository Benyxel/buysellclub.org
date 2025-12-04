import React, { useState, useEffect } from "react";
import { FaDollarSign, FaHistory, FaSpinner } from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../../api";

const AgentShippingRates = () => {
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rateHistory, setRateHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchCurrentRate();
  }, []);

  const fetchCurrentRate = async () => {
    try {
      setLoading(true);
      // Fetch agent-specific shipping rates (read-only for agents)
      const response = await API.get("/buysellapi/agent/shipping-rates/");

      if (response?.data) {
        setRates({
          normal_goods_rate: parseFloat(response.data.normal_goods_rate) || 0,
          special_goods_rate: parseFloat(response.data.special_goods_rate) || 0,
          normal_goods_rate_lt1: parseFloat(response.data.normal_goods_rate_lt1) || 0,
          special_goods_rate_lt1: parseFloat(response.data.special_goods_rate_lt1) || 0,
          effective_date: response.data.effective_date || response.data.created_at || null,
        });
      } else {
        setRates(null);
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Error fetching agent shipping rates:", error);
        toast.error("Failed to load shipping rates");
      }
      // No rates set yet or error occurred
      setRates(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchRateHistory = async () => {
    try {
      const response = await API.get("/buysellapi/agent/shipping-rates/all/");
      setRateHistory(Array.isArray(response.data) ? response.data : []);
      setShowHistory(true);
    } catch (error) {
      console.error("Error fetching rate history:", error);
      toast.error("Failed to load rate history");
    }
  };

  if (loading && !rates) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <FaDollarSign className="text-green-600" />
          Agent Shipping Rates
        </h2>
        <button
          onClick={fetchRateHistory}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          <FaHistory /> View History
        </button>
      </div>

      {!rates ? (
        <div className="text-center py-8 text-gray-500">
          <p>No shipping rates have been set for agents yet.</p>
          <p className="text-sm mt-2">Please contact admin to set agent shipping rates.</p>
        </div>
      ) : (
        <>
          {/* Current Rates */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Current Rates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                  Normal Goods (≥1 CBM)
                </h4>
                <p className="text-2xl font-bold text-blue-600">
                  ${(rates.normal_goods_rate || 0).toFixed(2)} / CBM
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                  Special Goods (≥1 CBM)
                </h4>
                <p className="text-2xl font-bold text-purple-600">
                  ${(rates.special_goods_rate || 0).toFixed(2)} / CBM
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                  Normal Goods (&lt;1 CBM)
                </h4>
                <p className="text-2xl font-bold text-green-600">
                  ${(rates.normal_goods_rate_lt1 || 0).toFixed(2)} / CBM
                </p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                  Special Goods (&lt;1 CBM)
                </h4>
                <p className="text-2xl font-bold text-yellow-600">
                  ${(rates.special_goods_rate_lt1 || 0).toFixed(2)} / CBM
                </p>
              </div>
            </div>
            {rates.effective_date && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Effective from: {new Date(rates.effective_date).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Rate History Modal */}
          {showHistory && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                      Rate History
                    </h3>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      ×
                    </button>
                  </div>
                  {rateHistory.length === 0 ? (
                    <p className="text-gray-500">No rate history available</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Normal (≥1 CBM)
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Special (≥1 CBM)
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Normal (&lt;1 CBM)
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Special (&lt;1 CBM)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {rateHistory.map((rate, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                {rate.created_at
                                  ? new Date(rate.created_at).toLocaleDateString()
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                ${(parseFloat(rate.normal_goods_rate) || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                ${(parseFloat(rate.special_goods_rate) || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                ${(parseFloat(rate.normal_goods_rate_lt1) || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                ${(parseFloat(rate.special_goods_rate_lt1) || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AgentShippingRates;

