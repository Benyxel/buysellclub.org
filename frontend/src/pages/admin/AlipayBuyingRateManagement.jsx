import React, { useEffect, useMemo, useState } from "react";
import { FaSave, FaSyncAlt } from "react-icons/fa";
import { toast } from "../../utils/toast";
import { Api } from "../../api";

const formatMoney = (value, decimals = 2) => {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return num.toFixed(decimals);
};

const AlipayBuyingRateManagement = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("completed");
  const [buyingRate, setBuyingRate] = useState("");
  const [newBuyingRate, setNewBuyingRate] = useState("");
  const [rateDrafts, setRateDrafts] = useState({});

  const fetchBuyingRate = async () => {
    try {
      const { data } = await Api.alipay.buyingRate();
      if (data?.ghs_to_cny !== undefined && data?.ghs_to_cny !== null) {
        setBuyingRate(data.ghs_to_cny);
      }
    } catch (error) {
      console.error("Error fetching buying rate:", error);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await Api.alipay.payments({
        page: currentPage,
        limit: 10,
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const { data } = response;
      if (data.results !== undefined) {
        setPayments(data.results || []);
        setTotalPages(data.total_pages || Math.ceil((data.count || 0) / 10) || 1);
      } else if (Array.isArray(data)) {
        setPayments(data);
        setTotalPages(1);
      } else if (data.data) {
        setPayments(data.data || []);
        setTotalPages(data.totalPages || 1);
      } else {
        setPayments([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching Alipay payments:", error);
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          "Failed to fetch Alipay payments"
      );
      setPayments([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchBuyingRate();
  }, [currentPage, statusFilter]);

  const handleUpdateBuyingRate = async () => {
    const rate = newBuyingRate.trim();
    if (!rate || Number.isNaN(Number(rate)) || Number(rate) <= 0) {
      toast.error("Enter a valid buying rate");
      return;
    }
    try {
      const { data } = await Api.alipay.updateBuyingRate({
        ghs_to_cny: Number(rate),
      });
      setBuyingRate(data.ghs_to_cny);
      setNewBuyingRate("");
      toast.success("Buying rate updated");
    } catch (error) {
      console.error("Error updating buying rate:", error);
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          "Failed to update buying rate"
      );
    }
  };

  const handleRateChange = (id, value) => {
    setRateDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveRate = async (payment) => {
    const paymentId = payment._id || payment.id;
    const draft = rateDrafts[paymentId];
    if (!draft || Number.isNaN(Number(draft)) || Number(draft) <= 0) {
      toast.error("Enter a valid buying rate");
      return;
    }
    try {
      const response = await Api.alipay.updatePaymentBuyingRate(paymentId, {
        buyingRate: Number(draft),
      });
      const updated = response.data;
      setPayments((prev) =>
        prev.map((p) =>
          String(p._id || p.id) === String(paymentId) ? { ...p, ...updated } : p
        )
      );
      toast.success("Buying rate updated");
    } catch (error) {
      console.error("Error updating buying rate:", error);
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          "Failed to update buying rate"
      );
    }
  };

  const rows = useMemo(() => {
    return payments.map((payment) => ({
      payment,
      profitGhs: payment.profitGhs ?? null,
      profitCny: payment.profitCny ?? null,
    }));
  }, [payments]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Global Buying Rate
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          New buying rate applies only to new records.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Current Buying Rate (CNY per 1 GHS)
            </label>
            <input
              type="text"
              value={buyingRate || ""}
              readOnly
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Set New Buying Rate
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={newBuyingRate}
              onChange={(event) => setNewBuyingRate(event.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g. 0.585"
            />
          </div>
          <button
            type="button"
            onClick={handleUpdateBuyingRate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FaSyncAlt /> Update Rate
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Buying Rate Per Payment
          </h3>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="completed">Paid (Completed)</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Loading payments...
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            No payments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    User
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Selling Rate
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Buying Rate
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Profit (GHS)
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Profit (CNY)
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map(({ payment, profitGhs, profitCny }) => {
                  const paymentId = payment._id || payment.id;
                  return (
                    <tr key={paymentId} className="bg-white dark:bg-gray-800">
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                        {payment.userName || payment.realName || "Unknown"}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {payment.originalCurrency} {formatMoney(payment.originalAmount)}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {formatMoney(payment.exchangeRate, 3)}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={
                            rateDrafts[paymentId] ??
                            (payment.buyingRate ?? "")
                          }
                          onChange={(event) =>
                            handleRateChange(paymentId, event.target.value)
                          }
                          className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {profitGhs === null ? "-" : formatMoney(profitGhs, 2)}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {profitCny === null ? "-" : formatMoney(profitCny, 3)}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                        {payment.status}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleSaveRate(payment)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                        >
                          <FaSave />
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div>
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage >= totalPages}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlipayBuyingRateManagement;
