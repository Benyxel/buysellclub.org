import React, { useState, useEffect, useCallback } from "react";
import {
  FaExchangeAlt,
  FaAlipay,
  FaEye,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaFilter,
  FaDownload,
  FaExclamationTriangle,
} from "react-icons/fa";
import { toast } from "react-toastify";
import API, { Api } from "../../api";
import ConfirmModal from "../../components/shared/ConfirmModal";

const AlipayManagement = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(12.0);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [newRate, setNewRate] = useState("");
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paymentIdToDelete, setPaymentIdToDelete] = useState(null);

  // Define fetchPayments before useEffect to avoid TDZ errors when referencing in deps
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Fetching Alipay payments with params:", {
        page: currentPage,
        limit: 10,
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const response = await Api.alipay.payments({
        page: currentPage,
        limit: 10,
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      console.log("Alipay payments response:", response);
      const { data } = response;
      console.log("Alipay payments data:", data);
      
      // Handle both paginated and non-paginated responses
      if (data.results !== undefined) {
        // Paginated response (Django REST framework style)
        setPayments(data.results || []);
        setTotalPages(data.total_pages || Math.ceil((data.count || 0) / 10) || 1);
      } else if (Array.isArray(data)) {
        // Direct array response
        setPayments(data);
        setTotalPages(1);
      } else if (data.data) {
        // Backend format: { data: [...], page, limit, total, totalPages }
        setPayments(data.data || []);
        setTotalPages(data.totalPages || 1);
      } else {
        // Empty or unknown format - set empty array (valid state)
        console.warn("Unexpected response format:", data);
        setPayments([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
      });
      // Only show error for actual failures, not empty data
      // Empty data (200 OK with empty array) is a valid response
      const status = error.response?.status;
      if (status && status >= 400) {
        // Only show error for 4xx/5xx errors, not for empty data
        const errorMsg = error.response?.data?.detail || 
                         error.response?.data?.error || 
                         error.response?.data?.message ||
                         error.message || 
                         "Error fetching Alipay payments";
        toast.error(errorMsg, { toastId: "fetch-payments-error" });
      } else if (!status) {
        // Network error or no response
        toast.error("Network error: Unable to fetch Alipay payments. Please check your connection.", { 
          toastId: "fetch-payments-network-error" 
        });
      }
      // Always set empty array on error to prevent UI crashes
      setPayments([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchPayments();
    fetchExchangeRate();
  }, [fetchPayments]);

  const fetchExchangeRate = async () => {
    try {
      const { data } = await API.get("/buysellapi/alipay-exchange-rate/");
      if (data && (data.ghs_to_cny !== undefined && data.ghs_to_cny !== null)) {
        setExchangeRate(data.ghs_to_cny);
      }
      // If no data or no rate, keep the default value (12.0) - this is fine
    } catch (error) {
      // Only log network/server errors, don't show toast for missing exchange rate
      // Missing exchange rate is not critical - we have a default value
      const status = error.response?.status;
      if (status && status >= 500) {
        // Only log server errors, not 404s or empty responses
        console.error("Error fetching exchange rate:", error);
      }
      // Keep default value (12.0) - this is acceptable
    }
  };

  const handleUpdateRate = async () => {
    if (!newRate || isNaN(newRate) || parseFloat(newRate) <= 0) {
      toast.error("Please enter a valid exchange rate");
      return;
    }

    try {
      const rateValue = parseFloat(newRate);
      const { data } = await API.post("/buysellapi/alipay-exchange-rate/", {
        ghs_to_cny: rateValue,
      });
      setExchangeRate(data.ghs_to_cny);
      toast.success("Exchange rate updated successfully");
      setIsRateModalOpen(false);
      setNewRate("");
      fetchExchangeRate();
    } catch (error) {
      console.error("Error updating exchange rate:", error);
      toast.error(
        error.response?.data?.error || "Error updating exchange rate"
      );
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedPayment) return;

    try {
      const paymentId = selectedPayment._id || selectedPayment.id;
      const { data } = await API.put(
        `/buysellapi/admin/alipay-payments/${paymentId}/status/`,
        {
          status: newStatus,
          adminNotes: adminNotes.trim() ? adminNotes : undefined,
          transactionId: transactionId.trim() ? transactionId : undefined,
        }
      );
      setPayments(payments.map((p) => {
        const pId = p._id || p.id;
        return pId === paymentId ? data : p;
      }));
      toast.success(`Payment status updated to ${newStatus}`, {
        toastId: "update-status-success"
      });
      setIsUpdateStatusOpen(false);
      setNewStatus("");
      setAdminNotes("");
      setTransactionId("");
      // Refresh the list to get updated data
      fetchPayments();
    } catch (error) {
      console.error("Error updating payment status:", error);
      const errorMsg = error.response?.data?.detail ||
                       error.response?.data?.error ||
                       error.message ||
                       "Error updating payment status";
      toast.error(errorMsg, { toastId: "update-status-error" });
    }
  };

  const promptDeletePayment = (id) => {
    setPaymentIdToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDeletePayment = async () => {
    if (!paymentIdToDelete) return;
    try {
      await API.delete(`/buysellapi/admin/alipay-payments/${paymentIdToDelete}/`);
      
      // Update UI immediately without refresh
      setPayments((prevPayments) => 
        prevPayments.filter((p) => {
          const pId = p._id || p.id;
          return pId !== paymentIdToDelete;
        })
      );
      
      toast.success("Payment deleted successfully", {
        toastId: "delete-payment-success"
      });
    } catch (error) {
      console.error("Error deleting payment:", error);
      const errorMsg = error.response?.data?.detail ||
                      error.response?.data?.error || 
                      error.message || 
                      "Error deleting payment";
      toast.error(errorMsg, { toastId: "delete-payment-error" });
    } finally {
      setShowDeleteModal(false);
      setPaymentIdToDelete(null);
    }
  };

  const openPaymentDetails = (payment) => {
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };

  const openStatusUpdate = (payment) => {
    setSelectedPayment(payment);
    setNewStatus(payment.status);
    setAdminNotes(payment.adminNotes || "");
    setTransactionId(payment.transactionId || "");
    setIsUpdateStatusOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
            Pending
          </span>
        );
      case "processing":
        return (
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
            Processing
          </span>
        );
      case "completed":
        return (
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
            Completed
          </span>
        );
      case "rejected":
        return (
          <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
            Rejected
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  const getPlatformBadge = (platform) => {
    const base = "px-2 py-1 rounded-full text-xs font-medium";
    const map = {
      "1688.com": "bg-orange-100 text-orange-800",
      Pinduoduo: "bg-purple-100 text-purple-800",
      Alibaba: "bg-blue-100 text-blue-800",
      Idlefish: "bg-emerald-100 text-emerald-800",
      Other: "bg-gray-100 text-gray-700",
    };
    const cls = map[platform] || map.Other;
    return <span className={`${base} ${cls}`}>{platform}</span>;
  };

  const currencyPill = (currency) => {
    const base =
      "px-2 py-0.5 rounded-full text-[10px] font-semibold align-middle";
    const isCedi = currency === "CEDI";
    const cls = isCedi
      ? "bg-emerald-100 text-emerald-800"
      : "bg-indigo-100 text-indigo-800";
    return <span className={`${base} ${cls}`}>{currency}</span>;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 md:mb-0">
            Alipay Payments Management
          </h2>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <button
              onClick={() => setIsRateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition"
            >
              <FaExchangeAlt className="mr-2" />
              Set Exchange Rate
            </button>
            <span className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 border border-blue-100 dark:border-blue-800">
              Current:{" "}
              <span className="ml-1 font-semibold">
                {Number(exchangeRate || 0).toFixed(3)}
              </span>
            </span>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
              <FaFilter className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden shadow-sm border-b border-gray-200 dark:border-gray-700 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wider"
                    >
                      User
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wider"
                    >
                      Account Type
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wider"
                    >
                      Currency
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wider"
                    >
                      Amount
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wider"
                    >
                      Platform
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-10 text-center">
                        <div className="text-gray-500 dark:text-gray-400">
                          No Alipay payments found
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          New submissions will appear here.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr
                        key={payment._id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-750/50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 flex items-center justify-center text-xs font-bold">
                              {String(payment.userName || "U")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {payment.userName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                            {payment.accountType}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            {currencyPill(payment.originalCurrency)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white font-semibold">
                            {payment.originalCurrency === "CEDI" ? "₵" : "¥"}{" "}
                            {Number(payment.originalAmount ?? 0).toFixed(2)}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                              Converted:
                            </span>
                            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                              {payment.convertedCurrency === "CEDI" ? "₵" : "¥"}{" "}
                              {Number(payment.convertedAmount ?? 0).toFixed(2)}
                            </span>
                            {currencyPill(payment.convertedCurrency)}
                          </div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            @ rate{" "}
                            {Number(payment.exchangeRate || 0).toFixed(3)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {getPlatformBadge(payment.platformSource)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(payment.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openPaymentDetails(payment)}
                            title="View details"
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => openStatusUpdate(payment)}
                            title="Update status"
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-3"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => promptDeletePayment(payment._id)}
                            title="Delete payment"
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      {isModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Payment Details
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      User Information
                    </h4>
                    <p className="text-gray-900 dark:text-white">
                      {selectedPayment.userName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Account Type: {selectedPayment.accountType}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Alipay Account
                    </h4>
                    <p className="text-gray-900 dark:text-white">
                      {selectedPayment.alipayAccount}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Real Name: {selectedPayment.realName}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      QR Code
                    </h4>
                    <div className="mt-2 border dark:border-gray-700 rounded-lg overflow-hidden">
                      <img
                        src={selectedPayment.qrCodeImage}
                        alt="Alipay QR Code"
                        className="w-full max-h-48 object-contain"
                      />
                    </div>
                  </div>

                  {selectedPayment.proofOfPayment && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Proof of Payment
                      </h4>
                      <div className="mt-2 border dark:border-gray-700 rounded-lg overflow-hidden">
                        <img
                          src={selectedPayment.proofOfPayment}
                          alt="Proof of Payment"
                          className="w-full max-h-48 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Payment Amount
                    </h4>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedPayment.originalCurrency === "CEDI" ? "₵" : "¥"}{" "}
                      {Number(selectedPayment.originalAmount ?? 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Converted:{" "}
                      {selectedPayment.convertedCurrency === "CEDI" ? "₵" : "¥"}{" "}
                      {Number(selectedPayment.convertedAmount ?? 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Exchange Rate:{" "}
                      {Number(selectedPayment.exchangeRate || 0).toFixed(3)}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Status Information
                    </h4>
                    <div className="mt-1">
                      {getStatusBadge(selectedPayment.status)}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Submitted:{" "}
                      {new Date(selectedPayment.createdAt).toLocaleString()}
                    </p>
                    {selectedPayment.paymentDate && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Payment Date:{" "}
                        {new Date(selectedPayment.paymentDate).toLocaleString()}
                      </p>
                    )}
                    {selectedPayment.completionDate && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Completion Date:{" "}
                        {new Date(
                          selectedPayment.completionDate
                        ).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Additional Information
                  </h4>
                  <p className="text-gray-900 dark:text-white">
                    Platform: {selectedPayment.platformSource}
                  </p>
                  {selectedPayment.transactionId && (
                    <p className="text-gray-900 dark:text-white">
                      Transaction ID: {selectedPayment.transactionId}
                    </p>
                  )}
                  {selectedPayment.adminNotes && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Admin Notes
                      </h4>
                      <p className="text-gray-900 dark:text-white p-2 bg-gray-50 dark:bg-gray-700 rounded mt-1">
                        {selectedPayment.adminNotes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-6 space-x-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      openStatusUpdate(selectedPayment);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {isUpdateStatusOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Update Payment Status
                </h3>
                <button
                  onClick={() => setIsUpdateStatusOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Status: {getStatusBadge(selectedPayment.status)}
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Transaction ID (optional)
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter transaction ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Admin Notes (optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows="3"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Add notes about this payment"
                  ></textarea>
                </div>

                <div className="flex justify-end mt-6 space-x-3">
                  <button
                    onClick={() => setIsUpdateStatusOpen(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateStatus}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exchange Rate Modal */}
      {isRateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Update Exchange Rate
                </h3>
                <button
                  onClick={() => setIsRateModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Rate:{" "}
                    <span className="font-bold">
                      {Number(exchangeRate).toFixed(3)}
                    </span>
                  </label>
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-start">
                      <FaExclamationTriangle className="flex-shrink-0 text-yellow-500 mt-0.5" />
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          Changing the exchange rate will affect all new
                          payments. Existing payments will not be affected.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Exchange Rate
                  </label>
                  <input
                    type="number"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    step="0.001"
                    min="0.001"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter new rate"
                  />
                </div>

                <div className="flex justify-end mt-6 space-x-3">
                  <button
                    onClick={() => setIsRateModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateRate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Rate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setPaymentIdToDelete(null);
        }}
        onConfirm={confirmDeletePayment}
        title="Delete Alipay Payment"
        message="Are you sure you want to delete this payment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default AlipayManagement;
