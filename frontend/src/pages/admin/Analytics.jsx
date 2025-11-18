import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { getAdminAnalytics } from "../../api";
import {
  FaShip,
  FaDollarSign,
  FaChartLine,
  FaShoppingCart,
  FaHandHoldingUsd,
  FaGraduationCap,
  FaSpinner,
  FaCalendarDay,
  FaCalendarWeek,
  FaCalendarAlt,
} from "react-icons/fa";

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("all"); // all, daily, monthly, yearly

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedPeriod !== "all") {
        const now = new Date();
        if (selectedPeriod === "daily") {
          const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          params.start_date = startDate.toISOString();
        } else if (selectedPeriod === "monthly") {
          const startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          params.start_date = startDate.toISOString();
        }
        params.end_date = now.toISOString();
      }
      const response = await getAdminAnalytics(params);
      setAnalytics(response.data);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(err.response?.data?.detail || "Failed to load analytics");
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency === "GHS" ? "GHS" : "USD",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FaSpinner className="animate-spin text-4xl text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Analytics Dashboard
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedPeriod("all")}
            className={`px-4 py-2 rounded-lg ${
              selectedPeriod === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setSelectedPeriod("daily")}
            className={`px-4 py-2 rounded-lg ${
              selectedPeriod === "daily"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setSelectedPeriod("monthly")}
            className={`px-4 py-2 rounded-lg ${
              selectedPeriod === "monthly"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            Last Year
          </button>
        </div>
      </div>

      {/* Shipping Management Analytics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <FaShip className="text-2xl text-blue-600" />
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            Shipping Management
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total to Collect
            </p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(analytics.shipping?.total_to_collect || 0)}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Collected</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(analytics.shipping?.collected || 0)}
            </p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(analytics.shipping?.remaining || 0)}
            </p>
          </div>
        </div>

        {/* Containers Breakdown */}
        {analytics.shipping?.containers && analytics.shipping.containers.length > 0 && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
              By Container
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Container
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Total Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Collected
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Remaining
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Invoices
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {analytics.shipping.containers.map((container) => (
                    <tr key={container.container_id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {container.container_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                        {formatCurrency(container.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">
                        {formatCurrency(container.collected)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-orange-600 dark:text-orange-400">
                        {formatCurrency(container.remaining)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400">
                        {container.paid_count}/{container.invoice_count} Paid
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Alipay Management Analytics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <FaDollarSign className="text-2xl text-green-600" />
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            Alipay Payments
          </h3>
        </div>

        {/* Summary */}
        {analytics.alipay?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {analytics.alipay.summary.total_payments}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Completed
              </p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {analytics.alipay.summary.completed}
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                {analytics.alipay.summary.pending}
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Processing
              </p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {analytics.alipay.summary.processing}
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Revenue
              </p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(analytics.alipay.summary.total_revenue, "GHS")}
              </p>
            </div>
          </div>
        )}

        {/* Daily/Monthly/Yearly Breakdown */}
        <div className="space-y-4">
          {selectedPeriod === "daily" && analytics.alipay?.daily && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <FaCalendarDay /> Daily Payments (Last 30 Days)
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Count
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Amount (GHS)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {analytics.alipay.daily.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                          {item.count}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                          {formatCurrency(item.total_amount, "GHS")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedPeriod === "monthly" && analytics.alipay?.monthly && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <FaCalendarWeek /> Monthly Payments (Last 12 Months)
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Month
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Count
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Amount (GHS)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {analytics.alipay.monthly.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {new Date(item.month).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                          {item.count}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                          {formatCurrency(item.total_amount, "GHS")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedPeriod === "all" && analytics.alipay?.yearly && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <FaCalendarAlt /> Yearly Payments
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Year
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Count
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Amount (GHS)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {analytics.alipay.yearly.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {new Date(item.year).getFullYear()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                          {item.count}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                          {formatCurrency(item.total_amount, "GHS")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Buy4me Analytics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <FaHandHoldingUsd className="text-2xl text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            Buy4me Analytics
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Total Requests
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {analytics.buy4me?.total_requests || 0}
            </p>
            {analytics.buy4me?.status_breakdown && (
              <div className="mt-4 space-y-2">
                {Object.entries(analytics.buy4me.status_breakdown).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-600 dark:text-gray-400 capitalize">
                        {status}:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {count}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Invoice Summary
            </p>
            {analytics.buy4me?.invoices && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total Invoiced:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {analytics.buy4me.invoices.total_invoiced}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total Amount:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(analytics.buy4me.invoices.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Paid:
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(analytics.buy4me.invoices.paid_amount)} (
                    {analytics.buy4me.invoices.paid_count})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Pending:
                  </span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">
                    {formatCurrency(analytics.buy4me.invoices.pending_amount)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders Analytics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <FaShoppingCart className="text-2xl text-indigo-600" />
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            Shop Orders Analytics
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Total Orders
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {analytics.orders?.total_orders || 0}
            </p>
            {analytics.orders?.status_breakdown && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Status Breakdown:
                </p>
                {Object.entries(analytics.orders.status_breakdown).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-600 dark:text-gray-400 capitalize">
                        {status}:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {count}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Revenue
            </p>
            {analytics.orders?.revenue && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total Revenue:
                  </span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(analytics.orders.revenue.total, "GHS")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Paid Orders:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {analytics.orders.revenue.paid_orders}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Average Order Value:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(
                      analytics.orders.revenue.average_order_value,
                      "GHS"
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Training Analytics (Placeholder) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <FaGraduationCap className="text-2xl text-yellow-600" />
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            Training Analytics
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {analytics.training?.message ||
            "Training analytics will be available soon"}
        </p>
      </div>
    </div>
  );
};

export default Analytics;

