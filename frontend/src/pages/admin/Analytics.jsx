import React, { useState, useEffect } from "react";
import { toast } from "../../utils/toast";
import { getAdminAnalytics, getAdminAnalyticsTrends } from "../../api";
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
  FaUsers,
  FaTimes,
} from "react-icons/fa";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";

const Analytics = ({ activeTab = "overview" }) => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("all"); // all, daily, monthly, yearly
  const [alipayPeriod, setAlipayPeriod] = useState("daily");
  const [buy4mePeriod, setBuy4mePeriod] = useState("monthly");
  const [ordersPeriod, setOrdersPeriod] = useState("monthly");
  const [trainingPeriod, setTrainingPeriod] = useState("all");
  const [communityPeriod, setCommunityPeriod] = useState("daily");
  const [alipayPage, setAlipayPage] = useState(1);
  const [buy4mePage, setBuy4mePage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [trainingPage, setTrainingPage] = useState(1);
  const [communityPage, setCommunityPage] = useState(1);
  const [trends, setTrends] = useState(null);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [trendsError, setTrendsError] = useState(null);
  const [showAllContainersModal, setShowAllContainersModal] = useState(false);
  const [showAllMonthlyModal, setShowAllMonthlyModal] = useState(false);
  const [showAllYearlyModal, setShowAllYearlyModal] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod, activeTab, buy4mePeriod, ordersPeriod, trainingPeriod, communityPeriod]);

  useEffect(() => {
    setAlipayPage(1);
  }, [alipayPeriod]);

  useEffect(() => {
    setBuy4mePage(1);
  }, [buy4mePeriod]);

  useEffect(() => {
    setOrdersPage(1);
  }, [ordersPeriod]);

  useEffect(() => {
    setTrainingPage(1);
  }, [trainingPeriod]);

  useEffect(() => {
    setCommunityPage(1);
  }, [communityPeriod]);

  const toDateParam = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  };

  const getDateRange = (period) => {
    if (!period || period === "all") return null;
    const now = new Date();
    let startDate = null;
    switch (period) {
      case "daily":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "weekly":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "yearly":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = null;
    }
    return startDate ? { startDate, endDate: now } : null;
  };

  const getOverviewRange = (period) => {
    if (!period || period === "all") return null;
    const now = new Date();
    let startDate = null;
    if (period === "daily") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === "monthly") {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }
    return startDate ? { startDate, endDate: now } : null;
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (activeTab === "buy4me") {
        const range = getDateRange(buy4mePeriod);
        if (range) {
          const startDate = toDateParam(range.startDate);
          const endDate = toDateParam(range.endDate);
          if (startDate && endDate) {
            params.start_date = startDate;
            params.end_date = endDate;
          }
        }
      } else if (activeTab === "orders") {
        const range = getDateRange(ordersPeriod);
        if (range) {
          const startDate = toDateParam(range.startDate);
          const endDate = toDateParam(range.endDate);
          if (startDate && endDate) {
            params.start_date = startDate;
            params.end_date = endDate;
          }
        }
      } else if (activeTab === "training") {
        const range = getDateRange(trainingPeriod);
        if (range) {
          const startDate = toDateParam(range.startDate);
          const endDate = toDateParam(range.endDate);
          if (startDate && endDate) {
            params.start_date = startDate;
            params.end_date = endDate;
          }
        }
      } else if (activeTab === "community") {
        // Do not send date range for community: backend returns all-time totals and
        // its own ranges for daily/weekly/monthly/yearly series. Otherwise we'd filter
        // by e.g. last 24h and show zeros when requests are older.
      } else if (activeTab === "overview") {
        const range = getOverviewRange(selectedPeriod);
        if (range) {
          const startDate = toDateParam(range.startDate);
          const endDate = toDateParam(range.endDate);
          if (startDate && endDate) {
            params.start_date = startDate;
            params.end_date = endDate;
          }
        }
      }
      const response = await getAdminAnalytics(params);
      setAnalytics(response.data);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      const is404 = err.response?.status === 404;
      const requestUrl = err.response?.requestUrl;
      const message = is404 && requestUrl
        ? `Analytics not found (404). Check API URL: ${requestUrl}`
        : err.response?.data?.detail || "Failed to load analytics";
      setError(message);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const pageSize = 5;

  const paginateRows = (rows, page) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const totalPages = Math.max(1, Math.ceil(safeRows.length / pageSize));
    const clampedPage = Math.min(Math.max(page, 1), totalPages);
    const start = (clampedPage - 1) * pageSize;
    return {
      page: clampedPage,
      totalPages,
      rows: safeRows.slice(start, start + pageSize),
    };
  };

  const PaginationControls = ({ page, totalPages, onChange }) => {
    if (totalPages <= 1) return null;
    return (
      <div className="mt-3 flex items-center justify-end gap-2 text-sm">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          Prev
        </button>
        <span className="text-gray-600 dark:text-gray-400">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          Next
        </button>
      </div>
    );
  };

  const fetchTrends = async () => {
    setTrendsLoading(true);
    setTrendsError(null);
    try {
      const response = await getAdminAnalyticsTrends();
      setTrends(response.data);
    } catch (err) {
      console.error("Error fetching analytics trends:", err);
      const is404 = err.response?.status === 404;
      const requestUrl = err.response?.requestUrl;
      const message = is404 && requestUrl
        ? `Analytics trends not found (404). Check that the API is reachable at: ${requestUrl}`
        : err.response?.data?.detail || "Failed to load analytics trends";
      setTrendsError(message);
      toast.error("Failed to load performance highlights");
    } finally {
      setTrendsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  const formatCurrency = (amount, currency = "USD") => {
    if (currency === "CNY") {
      return `¥${parseFloat(amount || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency === "GHS" ? "GHS" : "USD",
    }).format(amount);
  };

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-600 dark:text-gray-400">
        Loading analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <p className="text-gray-900 dark:text-white">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {activeTab === "overview" && (
        <>
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

          {trendsLoading ? (
            <div className="flex items-center justify-center h-40">
              <FaSpinner className="animate-spin text-3xl text-blue-600" />
            </div>
          ) : trendsError ? (
            <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-200">
                {trendsError}
              </p>
            </div>
          ) : (
            trends && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                      Orders (30d)
                    </p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                      {trends.overview.total_orders.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                      Revenue
                    </p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(trends.overview.total_revenue, "USD")}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {formatCurrency(trends.overview.total_revenue_ghs ?? 0, "GHS")}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                      Shipping Collected
                    </p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(trends.overview.shipping_collected, "USD")}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {formatCurrency(trends.overview.shipping_collected_ghs ?? 0, "GHS")}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                      Buy4me Invoices
                    </p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {trends.overview.buy4me_requests}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                      Sourcing fee (Buy4me)
                    </p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      ₵{Number(trends.overview.total_sourcing_fee_buy4me ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      From proof of payment (admin-set fee)
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                      5% charge (Buy4me)
                    </p>
                    <p className="text-xl font-bold text-teal-600 dark:text-teal-400">
                      ₵{Number(trends.overview.total_5_percent_paid_invoices ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Service fee on paid Buy4me invoices
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                      Shop profit
                    </p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      ₵{Number(trends.overview.shop_profit ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Admin charge on paid shop orders
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                      Container total shipping fee
                    </p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      ₵{Number(trends.overview.container_total_shipping_fee ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Total amount from all container invoices (GHS)
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                      Container expenses
                    </p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      ₵{Number(trends.overview.container_total_expenses ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Total expenses recorded for containers
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                      Container profit
                    </p>
                    <p className={`text-xl font-bold ${Number(trends.overview.container_profit ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      ₵{Number(trends.overview.container_profit ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Total amount − expenses
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                    Daily Performance (Orders vs Revenue)
                  </h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trends.daily_performance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(val) =>
                            new Date(val).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          }
                        />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          labelFormatter={(label) =>
                            new Date(label).toLocaleDateString()
                          }
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          name="Order Revenue"
                          stroke="#2563eb"
                          strokeWidth={3}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="shipping_collected"
                          name="Shipping Collected"
                          stroke="#059669"
                          strokeWidth={3}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                    Order Status Breakdown
                  </h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(trends.status_breakdown || {}).map(
                          ([status, count]) => ({ status, count })
                        )}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" />
                        <YAxis />
                        <Tooltip />
                        <Bar
                          dataKey="count"
                          name="Orders"
                          fill="#f97316"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* Site analytics: daily signups, daily visitors, Quick Links & Community pages */}
      {activeTab === "site" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <FaChartLine className="text-2xl text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
              Site Analytics (last 30 days)
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div>
              <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <FaUsers className="text-blue-600" /> Daily signups
              </h4>
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Date</th>
                      <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">Signups</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {(analytics.site?.daily_signups || []).length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-gray-500">No signups in the last 30 days</td>
                      </tr>
                    ) : (
                      [...(analytics.site?.daily_signups || [])]
                        .sort((a, b) => (b.date > a.date ? 1 : -1))
                        .map((row) => (
                          <tr key={row.date}>
                            <td className="px-4 py-2 text-gray-900 dark:text-white">{row.date}</td>
                            <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">{row.count}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <FaChartLine className="text-green-600" /> Daily visitors
              </h4>
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Date</th>
                      <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">Visitors</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {(analytics.site?.daily_visitors || []).length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-gray-500">No visit data yet</td>
                      </tr>
                    ) : (
                      [...(analytics.site?.daily_visitors || [])]
                        .sort((a, b) => (b.date > a.date ? 1 : -1))
                        .map((row) => (
                          <tr key={row.date}>
                            <td className="px-4 py-2 text-gray-900 dark:text-white">{row.date}</td>
                            <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">{row.count}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <FaChartLine className="text-purple-600" /> Quick Links & Community page views
          </h4>
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Page</th>
                  <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">Views</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {(analytics.site?.page_views || []).length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-gray-500">No page views yet</td>
                  </tr>
                ) : (
                  (analytics.site?.page_views || []).map((row) => (
                    <tr key={row.path}>
                      <td className="px-4 py-2 text-gray-900 dark:text-white font-mono">{row.path}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">{row.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shipping Management Analytics */}
      {activeTab === "shipping" && (
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
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ₵{Number(analytics.shipping?.total_to_collect_ghs || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Collected
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(analytics.shipping?.collected || 0)}
              </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ₵{Number(analytics.shipping?.collected_ghs || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Remaining
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(analytics.shipping?.remaining || 0)}
              </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ₵{Number(analytics.shipping?.remaining_ghs || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
            </div>
          </div>

          {/* Container expense & profit summary */}
          {analytics.container_profit && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Container total shipping fee</p>
                <p className="text-xl font-bold text-gray-800 dark:text-white">
                  ₵{Number(analytics.container_profit.total_shipping_fee ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Container expenses</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  ₵{Number(analytics.container_profit.total_expenses ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Container profit</p>
                <p className={`text-xl font-bold ${Number(analytics.container_profit.profit ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  ₵{Number(analytics.container_profit.profit ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}

          {/* Containers Breakdown – first 5 shown in table; "View all" always available to open popup */}
          {analytics.shipping && (() => {
              const containers = Array.isArray(analytics.shipping.containers) ? analytics.shipping.containers : [];
              const CONTAINERS_PREVIEW_LIMIT = 5;
              const previewContainers = containers.slice(0, CONTAINERS_PREVIEW_LIMIT);
              const renderContainerRow = (container) => (
                <tr key={container.container_id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {container.container_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                    ₵{Number(container.total_amount_ghs || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-orange-600 dark:text-orange-400">
                    ₵{Number(container.remaining_ghs ?? container.remaining ?? 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-blue-600 dark:text-blue-400">
                    ₵{Number(container.collected_ghs ?? 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-amber-600 dark:text-amber-400">
                    ₵{Number(container.total_expenses ?? 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span
                      className={
                        Number(container.profit ?? 0) >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }
                    >
                      ₵{Number(container.profit ?? 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400">
                    {container.paid_count}/{container.invoice_count} Paid
                  </td>
                </tr>
              );
              return (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                    By Container (invoice remaining, expenses & profit)
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
                            Remaining
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Total collected
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Expenses
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Profit
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Invoices
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {previewContainers.length > 0 ? previewContainers.map(renderContainerRow) : (
                          <tr>
                            <td colSpan={7} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                              No containers yet. Create containers under Shipping → Containers.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllContainersModal(true)}
                    className="mt-3 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    View all containers ({containers.length})
                  </button>
                  {/* Popup: all containers */}
                  {showAllContainersModal && (
                    <div
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                      onClick={() => setShowAllContainersModal(false)}
                      role="dialog"
                      aria-modal="true"
                      aria-label="All containers"
                    >
                      <div
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                            All containers ({containers.length})
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowAllContainersModal(false)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                            aria-label="Close"
                          >
                            <FaTimes className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="overflow-auto flex-1 p-4">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                  Container
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                  Total Amount
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                  Remaining
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                  Total collected
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                  Expenses
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                  Profit
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                  Invoices
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {containers.length > 0 ? containers.map(renderContainerRow) : (
                                <tr>
                                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                    No containers yet. Create containers under Shipping → Containers.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                          <button
                            type="button"
                            onClick={() => setShowAllContainersModal(false)}
                            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Monthly & yearly container expenses and profit */}
          {analytics.container_profit?.monthly?.length > 0 ||
            analytics.container_profit?.yearly?.length > 0 ? (
            <div className="mt-8">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Container expenses & profit by period
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {analytics.container_profit.monthly?.length > 0 && (() => {
                  const MONTHLY_PREVIEW_LIMIT = 2;
                  const monthlyRows = [...(analytics.container_profit.monthly || [])].reverse();
                  const previewMonthly = monthlyRows.slice(0, MONTHLY_PREVIEW_LIMIT);
                  const hasMoreMonthly = monthlyRows.length > MONTHLY_PREVIEW_LIMIT;
                  const renderMonthlyRow = (row, i) => (
                    <tr key={row.month || i}>
                      <td className="px-3 py-2 text-gray-900 dark:text-white">
                        {row.month
                          ? new Date(row.month).toLocaleDateString("en-US", {
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">
                        ₵{Number(row.total_shipping_fee ?? 0).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 text-right text-amber-600 dark:text-amber-400">
                        ₵{Number(row.total_expenses ?? 0).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={
                            Number(row.profit ?? 0) >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          ₵{Number(row.profit ?? 0).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                  return (
                    <div>
                      <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Monthly
                      </h5>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Month
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Fee
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Expenses
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Profit
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {previewMonthly.map(renderMonthlyRow)}
                          </tbody>
                        </table>
                      </div>
                      {hasMoreMonthly && (
                        <button
                          type="button"
                          onClick={() => setShowAllMonthlyModal(true)}
                          className="mt-3 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          View all months ({monthlyRows.length})
                        </button>
                      )}
                      {showAllMonthlyModal && (
                        <div
                          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                          onClick={() => setShowAllMonthlyModal(false)}
                          role="dialog"
                          aria-modal="true"
                          aria-label="All monthly records"
                        >
                          <div
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                All monthly records ({monthlyRows.length})
                              </h3>
                              <button
                                type="button"
                                onClick={() => setShowAllMonthlyModal(false)}
                                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                aria-label="Close"
                              >
                                <FaTimes className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="overflow-auto flex-1 p-4">
                              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                      Month
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                      Fee
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                      Expenses
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                      Profit
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                  {monthlyRows.map(renderMonthlyRow)}
                                </tbody>
                              </table>
                            </div>
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                              <button
                                type="button"
                                onClick={() => setShowAllMonthlyModal(false)}
                                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {analytics.container_profit.yearly?.length > 0 && (() => {
                  const YEARLY_PREVIEW_LIMIT = 2;
                  const yearlyRows = [...(analytics.container_profit.yearly || [])].reverse();
                  const previewYearly = yearlyRows.slice(0, YEARLY_PREVIEW_LIMIT);
                  const renderYearlyRow = (row, i) => (
                    <tr key={row.year || i}>
                      <td className="px-3 py-2 text-gray-900 dark:text-white">
                        {row.year
                          ? new Date(row.year).getFullYear()
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">
                        ₵{Number(row.total_shipping_fee ?? 0).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 text-right text-amber-600 dark:text-amber-400">
                        ₵{Number(row.total_expenses ?? 0).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={
                            Number(row.profit ?? 0) >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          ₵{Number(row.profit ?? 0).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                  return (
                    <div>
                      <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Yearly
                      </h5>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Year
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Fee
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Expenses
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Profit
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {previewYearly.map(renderYearlyRow)}
                          </tbody>
                        </table>
                      </div>
                      {yearlyRows.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowAllYearlyModal(true)}
                          className="mt-3 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          View all years ({yearlyRows.length})
                        </button>
                      )}
                      {showAllYearlyModal && (
                        <div
                          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                          onClick={() => setShowAllYearlyModal(false)}
                          role="dialog"
                          aria-modal="true"
                          aria-label="All yearly records"
                        >
                          <div
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                All yearly records ({yearlyRows.length})
                              </h3>
                              <button
                                type="button"
                                onClick={() => setShowAllYearlyModal(false)}
                                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                aria-label="Close"
                              >
                                <FaTimes className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="overflow-auto flex-1 p-4">
                              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                      Year
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                      Fee
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                      Expenses
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                      Profit
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                  {yearlyRows.map(renderYearlyRow)}
                                </tbody>
                              </table>
                            </div>
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                              <button
                                type="button"
                                onClick={() => setShowAllYearlyModal(false)}
                                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Alipay Management Analytics */}
      {activeTab === "alipay" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaDollarSign className="text-2xl text-green-600" />
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
              Alipay Payments
            </h3>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setAlipayPeriod("daily")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                alipayPeriod === "daily"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FaCalendarDay /> Daily
            </button>
            <button
              onClick={() => setAlipayPeriod("weekly")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                alipayPeriod === "weekly"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FaCalendarWeek /> Weekly
            </button>
            <button
              onClick={() => setAlipayPeriod("monthly")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                alipayPeriod === "monthly"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FaCalendarAlt /> Monthly
            </button>
            <button
              onClick={() => setAlipayPeriod("yearly")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                alipayPeriod === "yearly"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FaCalendarAlt /> Yearly
            </button>
          </div>

          {/* Summary */}
          {analytics.alipay?.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total
                </p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pending
                </p>
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
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-5 lg:col-span-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Revenue (GHS)
                </p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(
                    analytics.alipay.summary.total_revenue_ghs || 0,
                    "GHS"
                  )}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 lg:col-span-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Revenue (CNY)
                </p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(
                    analytics.alipay.summary.total_revenue_cny || 0,
                    "CNY"
                  )}
                </p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-5 lg:col-span-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Profit (GHS)
                </p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(
                    analytics.alipay.summary.total_profit_ghs || 0,
                    "GHS"
                  )}
                </p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-5 lg:col-span-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Profit (CNY)
                </p>
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(
                    analytics.alipay.summary.total_profit_cny || 0,
                    "CNY"
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Daily/Weekly/Monthly/Yearly Breakdown */}
          <div className="space-y-4">
            {alipayPeriod === "daily" && analytics.alipay?.daily && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <FaCalendarDay /> Daily Payments (Last 30 Days)
                </h4>
                <div className="overflow-x-auto">
                  {(() => {
                    const { rows, page, totalPages } = paginateRows(
                      analytics.alipay.daily,
                      alipayPage
                    );
                    return (
                      <>
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
                          Revenue (GHS)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Revenue (CNY)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Profit (GHS)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Profit (CNY)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {rows.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                            {item.count}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(item.total_ghs || 0, "GHS")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(item.total_cny || 0, "CNY")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(item.total_profit_ghs || 0, "GHS")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(item.total_profit_cny || 0, "CNY")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                      <PaginationControls
                        page={page}
                        totalPages={totalPages}
                        onChange={setAlipayPage}
                      />
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {alipayPeriod === "weekly" && analytics.alipay?.weekly && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <FaCalendarWeek /> Weekly Payments (Last 12 Weeks)
                </h4>
                <div className="overflow-x-auto">
                  {(() => {
                    const { rows, page, totalPages } = paginateRows(
                      analytics.alipay.weekly,
                      alipayPage
                    );
                    return (
                      <>
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Week
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Count
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Revenue (GHS)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Revenue (CNY)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Profit (GHS)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Profit (CNY)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {rows.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {new Date(item.week).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                            {item.count}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(item.total_ghs || 0, "GHS")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(item.total_cny || 0, "CNY")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(item.total_profit_ghs || 0, "GHS")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(item.total_profit_cny || 0, "CNY")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <PaginationControls
                    page={page}
                    totalPages={totalPages}
                    onChange={setAlipayPage}
                  />
                  </>
                    );
                  })()}
                </div>
              </div>
            )}

            {alipayPeriod === "monthly" && analytics.alipay?.monthly && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <FaCalendarWeek /> Monthly Payments (Last 12 Months)
                </h4>
                <div className="overflow-x-auto">
                  {(() => {
                    const { rows, page, totalPages } = paginateRows(
                      analytics.alipay.monthly,
                      alipayPage
                    );
                    return (
                      <>
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
                          Revenue (GHS)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Revenue (CNY)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Profit (GHS)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Profit (CNY)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {rows.map((item, idx) => (
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
                            {formatCurrency(item.total_ghs || 0, "GHS")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(item.total_cny || 0, "CNY")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(item.total_profit_ghs || 0, "GHS")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(item.total_profit_cny || 0, "CNY")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <PaginationControls
                    page={page}
                    totalPages={totalPages}
                    onChange={setAlipayPage}
                  />
                  </>
                    );
                  })()}
                </div>
              </div>
            )}

            {alipayPeriod === "yearly" && analytics.alipay?.yearly && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <FaCalendarAlt /> Yearly Payments
                </h4>
                <div className="overflow-x-auto">
                  {(() => {
                    const { rows, page, totalPages } = paginateRows(
                      analytics.alipay.yearly,
                      alipayPage
                    );
                    return (
                      <>
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
                          Revenue (GHS)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Revenue (CNY)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Profit (GHS)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Profit (CNY)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {rows.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {new Date(item.year).getFullYear()}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                            {item.count}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(item.total_ghs || 0, "GHS")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(item.total_cny || 0, "CNY")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(item.total_profit_ghs || 0, "GHS")}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(item.total_profit_cny || 0, "CNY")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <PaginationControls
                    page={page}
                    totalPages={totalPages}
                    onChange={setAlipayPage}
                  />
                  </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Buy4me Analytics */}
      {activeTab === "buy4me" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaHandHoldingUsd className="text-2xl text-purple-600" />
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
              Buy4me Analytics
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setBuy4mePeriod("all")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                buy4mePeriod === "all"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setBuy4mePeriod("daily")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                buy4mePeriod === "daily"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FaCalendarDay /> Daily
            </button>
            <button
              onClick={() => setBuy4mePeriod("weekly")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                buy4mePeriod === "weekly"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FaCalendarWeek /> Weekly
            </button>
            <button
              onClick={() => setBuy4mePeriod("monthly")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                buy4mePeriod === "monthly"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FaCalendarAlt /> Monthly
            </button>
            <button
              onClick={() => setBuy4mePeriod("yearly")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                buy4mePeriod === "yearly"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FaCalendarAlt /> Yearly
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Total Requests
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {analytics.buy4me?.total_requests || 0}
              </p>
              {(analytics.buy4me?.total_sourcing_fee != null || analytics.buy4me?.total_5_percent_paid_invoices != null) && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Sourcing fee (from proof):</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      ₵{Number(analytics.buy4me.total_sourcing_fee ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">5% charge (paid invoices):</span>
                    <span className="font-medium text-teal-600 dark:text-teal-400">
                      ₵{Number(analytics.buy4me.total_5_percent_paid_invoices ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
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
                      ₵{Number(analytics.buy4me.invoices.total_amount || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Paid:
                    </span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      ₵{Number(analytics.buy4me.invoices.paid_amount || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} (
                      {analytics.buy4me.invoices.paid_count})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Pending:
                    </span>
                    <span className="font-medium text-orange-600 dark:text-orange-400">
                      ₵{Number(analytics.buy4me.invoices.pending_amount || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {analytics.buy4me?.time_series && buy4mePeriod !== "all" && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Buy4me Payments
              </h4>
              <div className="overflow-x-auto">
                {(() => {
                  const { rows, page, totalPages } = paginateRows(
                    analytics.buy4me.time_series[buy4mePeriod] || [],
                    buy4mePage
                  );
                  return (
                    <>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Period
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Count
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Amount (GHS)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Sourcing fee (GHS)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        5% charge (GHS)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {rows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {new Date(row[buy4mePeriod === "yearly" ? "year" : buy4mePeriod === "monthly" ? "month" : buy4mePeriod === "weekly" ? "week" : "date"]).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                          {row.count}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                          ₵{Number(row.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-amber-600 dark:text-amber-400 font-medium">
                          ₵{Number(row.sourcing_fee ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-teal-600 dark:text-teal-400 font-medium">
                          ₵{Number(row.five_percent ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <PaginationControls
                  page={page}
                  totalPages={totalPages}
                  onChange={setBuy4mePage}
                />
                </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Orders Analytics */}
      {activeTab === "orders" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaShoppingCart className="text-2xl text-indigo-600" />
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
              Shop Orders Analytics
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setOrdersPeriod("all")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                ordersPeriod === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setOrdersPeriod("daily")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                ordersPeriod === "daily"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FaCalendarDay /> Daily
            </button>
            <button
              onClick={() => setOrdersPeriod("weekly")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                ordersPeriod === "weekly"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FaCalendarWeek /> Weekly
            </button>
            <button
              onClick={() => setOrdersPeriod("monthly")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                ordersPeriod === "monthly"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FaCalendarAlt /> Monthly
            </button>
            <button
              onClick={() => setOrdersPeriod("yearly")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                ordersPeriod === "yearly"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FaCalendarAlt /> Yearly
            </button>
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
                  {analytics.orders?.shop_profit != null && (
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-gray-600 dark:text-gray-400">
                        Shop profit (admin charge):
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ₵{Number(analytics.orders.shop_profit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {analytics.orders?.time_series && ordersPeriod !== "all" && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Orders
              </h4>
              <div className="overflow-x-auto">
                {(() => {
                  const { rows, page, totalPages } = paginateRows(
                    analytics.orders.time_series[ordersPeriod] || [],
                    ordersPage
                  );
                  return (
                    <>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Period
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Count
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Revenue (GHS)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Admin charge profit (GHS)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {rows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {new Date(row[ordersPeriod === "yearly" ? "year" : ordersPeriod === "monthly" ? "month" : ordersPeriod === "weekly" ? "week" : "date"]).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                          {row.count}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                          ₵{Number(row.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-emerald-600 dark:text-emerald-400 font-medium">
                          ₵{Number(row.profit ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <PaginationControls
                  page={page}
                  totalPages={totalPages}
                  onChange={setOrdersPage}
                />
                </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Training Analytics */}
      {activeTab === "training" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaGraduationCap className="text-2xl text-yellow-600" />
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
              Training Analytics
            </h3>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setTrainingPeriod("all")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                trainingPeriod === "all"
                  ? "bg-yellow-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FaChartLine /> All
            </button>
            <button
              onClick={() => setTrainingPeriod("daily")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                trainingPeriod === "daily"
                  ? "bg-yellow-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FaCalendarDay /> Daily
            </button>
            <button
              onClick={() => setTrainingPeriod("weekly")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                trainingPeriod === "weekly"
                  ? "bg-yellow-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FaCalendarWeek /> Weekly
            </button>
            <button
              onClick={() => setTrainingPeriod("monthly")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                trainingPeriod === "monthly"
                  ? "bg-yellow-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FaCalendarAlt /> Monthly
            </button>
            <button
              onClick={() => setTrainingPeriod("yearly")}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                trainingPeriod === "yearly"
                  ? "bg-yellow-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FaCalendarAlt /> Yearly
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Bookings
              </p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {analytics.training?.total_bookings || 0}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Paid Bookings
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {analytics.training?.revenue?.paid_count || 0}
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Revenue (GHS)
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(analytics.training?.revenue?.total || 0, "GHS")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Booking Status Breakdown
              </p>
              {analytics.training?.status_breakdown ? (
                <div className="space-y-2">
                  {Object.entries(analytics.training.status_breakdown).map(
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
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No booking status data available.
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Payment Status Breakdown
              </p>
              {analytics.training?.payment_status_breakdown ? (
                <div className="space-y-2">
                  {Object.entries(analytics.training.payment_status_breakdown).map(
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
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No payment status data available.
                </p>
              )}
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Pending Amount:
                </span>
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  {formatCurrency(
                    analytics.training?.revenue?.pending_amount || 0,
                    "GHS"
                  )}
                </span>
              </div>
            </div>
          </div>

          {analytics.training?.time_series && trainingPeriod !== "all" && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Training Bookings
              </h4>
              <div className="overflow-x-auto">
                {(() => {
                  const { rows, page, totalPages } = paginateRows(
                    analytics.training.time_series[trainingPeriod] || [],
                    trainingPage
                  );
                  return (
                    <>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Period
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Count
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Revenue (GHS)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {rows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {new Date(row[trainingPeriod === "yearly" ? "year" : trainingPeriod === "monthly" ? "month" : trainingPeriod === "weekly" ? "week" : "date"]).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                          {row.count}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                          ₵{Number(row.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <PaginationControls
                  page={page}
                  totalPages={totalPages}
                  onChange={setTrainingPage}
                />
                </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === "community" && (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <FaUsers className="text-xl text-green-600" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Community Analytics
              </h2>
            </div>
            <div className="flex gap-2">
              {[
                { key: "daily", label: "Daily" },
                { key: "weekly", label: "Weekly" },
                { key: "monthly", label: "Monthly" },
                { key: "yearly", label: "Yearly" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setCommunityPeriod(tab.key)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    communityPeriod === tab.key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                Total Requests
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.community?.total_requests || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                Approved
              </p>
              <p className="text-2xl font-bold text-emerald-600">
                {analytics.community?.approved || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                Pending
              </p>
              <p className="text-2xl font-bold text-yellow-600">
                {analytics.community?.pending || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                Total Amount (GHS)
              </p>
              <p className="text-2xl font-bold text-blue-600">
                ₵{Number(analytics.community?.total_amount || 0).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="space-y-4 mt-6">
            {communityPeriod === "daily" && analytics.community?.daily && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <FaCalendarDay /> Daily Requests (Last 30 Days)
                </h4>
                <div className="overflow-x-auto">
                  {(() => {
                    const { rows, page, totalPages } = paginateRows(
                      analytics.community.daily,
                      communityPage
                    );
                    return (
                      <>
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Date
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Requests
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Amount (GHS)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {rows.map((item, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                  {new Date(item.date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                                  {item.count}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                                  {formatCurrency(item.total_amount || 0, "GHS")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <PaginationControls
                          page={page}
                          totalPages={totalPages}
                          onChange={setCommunityPage}
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {communityPeriod === "weekly" && analytics.community?.weekly && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <FaCalendarWeek /> Weekly Requests (Last 12 Weeks)
                </h4>
                <div className="overflow-x-auto">
                  {(() => {
                    const { rows, page, totalPages } = paginateRows(
                      analytics.community.weekly,
                      communityPage
                    );
                    return (
                      <>
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Week
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Requests
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Amount (GHS)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {rows.map((item, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                  {new Date(item.week).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                                  {item.count}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                                  {formatCurrency(item.total_amount || 0, "GHS")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <PaginationControls
                          page={page}
                          totalPages={totalPages}
                          onChange={setCommunityPage}
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {communityPeriod === "monthly" && analytics.community?.monthly && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <FaCalendarAlt /> Monthly Requests (Last 12 Months)
                </h4>
                <div className="overflow-x-auto">
                  {(() => {
                    const { rows, page, totalPages } = paginateRows(
                      analytics.community.monthly,
                      communityPage
                    );
                    return (
                      <>
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Month
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Requests
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Amount (GHS)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {rows.map((item, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                  {new Date(item.month).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                                  {item.count}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                                  {formatCurrency(item.total_amount || 0, "GHS")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <PaginationControls
                          page={page}
                          totalPages={totalPages}
                          onChange={setCommunityPage}
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {communityPeriod === "yearly" && analytics.community?.yearly && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <FaCalendarAlt /> Yearly Requests
                </h4>
                <div className="overflow-x-auto">
                  {(() => {
                    const { rows, page, totalPages } = paginateRows(
                      analytics.community.yearly,
                      communityPage
                    );
                    return (
                      <>
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Year
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Requests
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                Amount (GHS)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {rows.map((item, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                  {new Date(item.year).getFullYear()}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                                  {item.count}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                                  {formatCurrency(item.total_amount || 0, "GHS")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <PaginationControls
                          page={page}
                          totalPages={totalPages}
                          onChange={setCommunityPage}
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
