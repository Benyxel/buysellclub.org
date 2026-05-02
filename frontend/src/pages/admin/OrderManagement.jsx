import React, { useState, useEffect } from 'react';
import { FaSearch, FaSortAmountDown, FaSortAmountUp, FaFilter, FaDownload, FaEye, FaCheck, FaTimes, FaChevronLeft, FaChevronRight, FaTrash, FaSpinner, FaEnvelope } from 'react-icons/fa';
import { toast } from '../../utils/toast';
import API, { Api, getOrders, downloadOrderReceipt } from '../../api';
import BulkActions from '../../components/shared/BulkActions';
import { getApiUrl } from '../../config/api';
import { getPlaceholderImagePath } from '../../utils/paths';

const OrderManagement = ({ onDigitalUnreadInvalidate }) => {
  const [orderTab, setOrderTab] = useState(() => {
    try {
      const raw = localStorage.getItem('admin_orders_last_tab');
      return raw === 'digital' ? 'digital' : 'shop';
    } catch {
      return 'shop';
    }
  }); // shop | digital
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [orderToUpdate, setOrderToUpdate] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [newPaymentStatus, setNewPaymentStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);
  const [digitalOrders, setDigitalOrders] = useState([]);
  const [digitalLoading, setDigitalLoading] = useState(false);
  const [digitalStatusFilter, setDigitalStatusFilter] = useState(() => {
    try {
      return localStorage.getItem('admin_digital_orders_status') || 'all';
    } catch {
      return 'all';
    }
  });
  const [digitalPage, setDigitalPage] = useState(() => {
    try {
      const n = Number(localStorage.getItem('admin_digital_orders_page') || '');
      return n && n > 0 ? n : 1;
    } catch {
      return 1;
    }
  });
  const [digitalPageSize, setDigitalPageSize] = useState(() => {
    try {
      const n = Number(localStorage.getItem('admin_digital_orders_page_size') || '');
      return n && n > 0 ? n : 20;
    } catch {
      return 20;
    }
  });
  const [digitalTotal, setDigitalTotal] = useState(0);
  const [approvingDigitalId, setApprovingDigitalId] = useState(null);
  const [selectedDigitalOrder, setSelectedDigitalOrder] = useState(null);
  const [showDigitalDetails, setShowDigitalDetails] = useState(false);
  const [digitalStatusDraft, setDigitalStatusDraft] = useState('');
  const [savingDigitalStatus, setSavingDigitalStatus] = useState(false);
  const [sendingDigitalReceiptId, setSendingDigitalReceiptId] = useState(null);
  const [downloadingDigitalReceiptId, setDownloadingDigitalReceiptId] = useState(null);

  const resolveMediaUrl = (rawUrl) => {
    const url = String(rawUrl || '').trim();
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // Use the same helper used across admin (Alipay) to resolve /media/... to backend host
    return getApiUrl(url);
  };

  const isImageUrl = (url) => {
    const u = String(url || '').split('?')[0].toLowerCase();
    return u.endsWith('.png') || u.endsWith('.jpg') || u.endsWith('.jpeg') || u.endsWith('.webp') || u.endsWith('.gif');
  };

  const getDigitalPurchaseStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    const base =
      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
    switch (s) {
      case 'pending':
        return (
          <span className={`${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200`}>
            Pending
          </span>
        );
      case 'pending_review':
        return (
          <span className={`${base} bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200`}>
            Pending review
          </span>
        );
      case 'paid':
        return (
          <span className={`${base} bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200`}>
            Paid
          </span>
        );
      case 'rejected':
        return (
          <span className={`${base} bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200`}>
            Rejected
          </span>
        );
      case 'cancelled':
        return (
          <span className={`${base} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`}>
            Cancelled
          </span>
        );
      default:
        return (
          <span className={`${base} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`}>
            {status || '—'}
          </span>
        );
    }
  };
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const totalDigitalPages = Math.max(1, Math.ceil((digitalTotal || 0) / (digitalPageSize || 20)));

  useEffect(() => {
    try {
      localStorage.setItem('admin_orders_last_tab', orderTab);
    } catch {
      // ignore
    }
  }, [orderTab]);

  useEffect(() => {
    try {
      localStorage.setItem('admin_digital_orders_page', String(digitalPage));
      localStorage.setItem('admin_digital_orders_page_size', String(digitalPageSize));
      localStorage.setItem('admin_digital_orders_status', String(digitalStatusFilter));
    } catch {
      // ignore
    }
  }, [digitalPage, digitalPageSize, digitalStatusFilter]);

  useEffect(() => {
    if (orderTab === 'shop') {
      fetchOrders(currentPage, pageSize);
    }
  }, [currentPage, pageSize, orderTab]);

  useEffect(() => {
    if (orderTab === 'digital') {
      fetchDigitalOrders(digitalPage, digitalPageSize, digitalStatusFilter);
    }
  }, [orderTab, digitalPage, digitalPageSize, digitalStatusFilter]);

  // Pagination handlers
  const totalPages = Math.ceil(total / pageSize);
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  useEffect(() => {
    applyFiltersAndSort();
  }, [orders, searchTerm, sortField, sortDirection, filterStatus]);

  // Keep "select all" in sync with current page selection
  useEffect(() => {
    const allSelected = filteredOrders.length > 0 && filteredOrders.every((o) => selectedOrders.includes(o.id));
    setSelectAll(allSelected);
  }, [filteredOrders, selectedOrders]);

  const fetchOrders = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      // Use admin endpoint to get all orders - always fetch fresh data
      const params = { page: page || 1, page_size: size || 10 };
      const response = await API.get("/buysellapi/admin/orders/", { params });
      
      // Handle both array and paginated response
      let ordersData = [];
      if (response.data && typeof response.data === 'object' && 'results' in response.data) {
        // Paginated response
        ordersData = response.data.results || [];
        setTotal(response.data.count || 0);
      } else if (Array.isArray(response.data)) {
        // Non-paginated array response (fallback)
        ordersData = response.data;
        setTotal(response.data.length);
      } else {
        ordersData = [];
        setTotal(0);
      }
      setOrders(ordersData);
      setFilteredOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error(error.response?.data?.error || 'Failed to load orders');
      setOrders([]);
      setFilteredOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchDigitalOrders = async (page = digitalPage, size = digitalPageSize, status = digitalStatusFilter) => {
    setDigitalLoading(true);
    try {
      const params = { page: page || 1, page_size: size || 20 };
      if (status && status !== 'all') params.status = status;
      const res = await Api.digitalStore.admin.listPurchases(params);
      const list = res.data?.results || [];
      setDigitalOrders(list);
      setDigitalTotal(res.data?.count || 0);
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.response?.data?.error || 'Failed to load digital orders');
      setDigitalOrders([]);
      setDigitalTotal(0);
    } finally {
      setDigitalLoading(false);
    }
  };

  const approveDigitalOrder = async (purchaseId) => {
    try {
      setApprovingDigitalId(purchaseId);
      await Api.digitalStore.admin.approvePurchase(purchaseId);
      toast.success('Digital purchase approved.');
      onDigitalUnreadInvalidate?.();
      fetchDigitalOrders(digitalPage, digitalPageSize, digitalStatusFilter);
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.response?.data?.error || 'Approval failed');
    } finally {
      setApprovingDigitalId(null);
    }
  };

  const sendDigitalReceiptEmailToCustomer = async (purchaseId) => {
    try {
      setSendingDigitalReceiptId(purchaseId);
      await Api.digitalStore.admin.sendReceiptEmail(purchaseId);
      toast.success('Receipt email sent to customer.');
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || 'Could not send receipt email.');
    } finally {
      setSendingDigitalReceiptId(null);
    }
  };

  const downloadDigitalPurchaseReceipt = async (purchaseId) => {
    try {
      setDownloadingDigitalReceiptId(purchaseId);
      await Api.digitalStore.downloadReceipt(purchaseId);
      toast.success('Receipt downloaded.');
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        e?.message ||
        'Failed to download receipt';
      toast.error(typeof msg === 'string' ? msg : 'Failed to download receipt');
    } finally {
      setDownloadingDigitalReceiptId(null);
    }
  };

  const saveDigitalStatus = async () => {
    if (!selectedDigitalOrder?.id) return;
    const next = String(digitalStatusDraft || '').trim();
    if (!next || next === selectedDigitalOrder.status) {
      toast.info('No changes to save');
      return;
    }
    try {
      setSavingDigitalStatus(true);
      await Api.digitalStore.admin.updatePurchaseStatus(selectedDigitalOrder.id, { status: next });
      toast.success('Status updated.');
      onDigitalUnreadInvalidate?.();
      // Refresh list + update modal copy
      await fetchDigitalOrders(digitalPage, digitalPageSize, digitalStatusFilter);
      setSelectedDigitalOrder((prev) => (prev ? { ...prev, status: next } : prev));
      setDigitalStatusDraft(next);
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || 'Status update failed');
    } finally {
      setSavingDigitalStatus(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...orders];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(order => 
        String(order.id).includes(searchTerm) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.customer_email && order.customer_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.customer_phone && order.customer_phone.includes(searchTerm))
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredOrders(filtered);
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const openStatusModal = (order) => {
    setOrderToUpdate(order);
    setNewStatus(order.status);
    setNewPaymentStatus(order.payment_status);
    setShowStatusModal(true);
  };

  const closeStatusModal = () => {
    setShowStatusModal(false);
    setOrderToUpdate(null);
    setNewStatus('');
    setNewPaymentStatus('');
  };

  const handleStatusUpdate = async () => {
    if (!orderToUpdate) return;

    try {
      const updateData = {};
      if (newStatus !== orderToUpdate.status) {
        updateData.status = newStatus;
      }
      if (newPaymentStatus !== orderToUpdate.payment_status) {
        updateData.payment_status = newPaymentStatus;
      }

      if (Object.keys(updateData).length === 0) {
        toast.info('No changes to save');
        closeStatusModal();
        return;
      }

      const response = await API.put(`/buysellapi/orders/${orderToUpdate.id}/`, updateData);

      toast.success('Order status updated successfully');
      closeStatusModal();
      fetchOrders(currentPage, pageSize); // Refresh orders with fresh data
    } catch (error) {
      console.error('Error updating order status:', error);
      const errorMessage = error.response?.data?.status || error.response?.data?.payment_status || error.response?.data?.error || 'Failed to update order status';
      toast.error(errorMessage);
    }
  };

  const generateInvoice = async (orderId) => {
    try {
      const response = await fetch(getApiUrl(`api/admin/orders/${orderId}/invoice`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Invoice generated successfully');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    }
  };

  const handleDownloadReceipt = async (orderId) => {
    setDownloadingReceiptId(orderId);
    try {
      await downloadOrderReceipt(orderId, true);
      toast.success('Receipt downloaded');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to download receipt';
      toast.error(typeof msg === 'string' ? msg : 'Failed to download receipt');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const handleDeleteOrder = async (order) => {
    if (!window.confirm(`Delete order #${order.id}? This will permanently remove the order.`)) {
      return;
    }
    const url = `/buysellapi/admin/orders/${order.id}/`;
    try {
      // Use same API instance as fetchOrders; try DELETE first, fallback to POST (some proxies block DELETE)
      let response;
      try {
        response = await API.delete(url);
      } catch (deleteErr) {
        if (deleteErr.response?.status === 405 || deleteErr.code === 'ERR_NETWORK') {
          response = await API.post(url, {});
        } else {
          throw deleteErr;
        }
      }
      if (response?.status === 200 || response?.status === 204) {
        toast.success('Order deleted successfully');
        fetchOrders(currentPage, pageSize);
        if (selectedOrder?.id === order.id) {
          setShowOrderDetails(false);
          setSelectedOrder(null);
        }
      } else {
        toast.error('Unexpected response from server');
      }
    } catch (error) {
      console.error('Error deleting order:', error?.response?.data || error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete order';
      toast.error(errorMessage);
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && orderTab === 'shop') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Order Management</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage and track all customer orders
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOrderTab('shop')}
          className={`rounded-lg px-3 py-2 text-sm font-semibold border ${
            orderTab === 'shop'
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-white dark:border-gray-700 dark:hover:bg-gray-950/40'
          }`}
        >
          Shop Orders
        </button>
        <button
          type="button"
          onClick={() => setOrderTab('digital')}
          className={`rounded-lg px-3 py-2 text-sm font-semibold border ${
            orderTab === 'digital'
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-white dark:border-gray-700 dark:hover:bg-gray-950/40'
          }`}
        >
          Digital Store Orders
        </button>
      </div>

      {orderTab === 'digital' ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Digital purchases
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Paystack purchases auto-complete. Manual MoMo needs approval.
              </p>
            </div>
            <select
              value={digitalStatusFilter}
              onChange={(e) => {
                setDigitalStatusFilter(e.target.value);
                setDigitalPage(1);
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="all">All</option>
              <option value="pending_review">Pending review</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {digitalLoading ? (
            <div className="p-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <FaSpinner className="animate-spin" />
              Loading…
            </div>
          ) : digitalOrders.length === 0 ? (
            <div className="p-6 text-sm text-gray-600 dark:text-gray-300">
              No digital purchases yet.
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Payment</th>
                    <th className="px-4 py-3 text-left">Proof</th>
                    <th className="px-4 py-3 text-left">Created</th>
                    <th className="px-4 py-3 text-left">Paid</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {digitalOrders.map((o) => (
                    <tr key={o.id} className="text-gray-800 dark:text-gray-100">
                      <td className="px-4 py-3">{o.id}</td>
                      <td className="px-4 py-3">{o.product_title}</td>
                      <td className="px-4 py-3">
                        <div className="min-w-[160px]">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {o.user_name || '-'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {o.user_email || o.user_contact || ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">{o.status}</td>
                      <td className="px-4 py-3">{o.payment_provider || o.payment_method || '-'}</td>
                      <td className="px-4 py-3">
                        {o.proof_url ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDigitalOrder(o);
                              setDigitalStatusDraft(o.status || '');
                              setShowDigitalDetails(true);
                            }}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            View proof
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3">{o.paid_at ? new Date(o.paid_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3">
                        {o.status === 'pending_review' ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDigitalOrder(o);
                                setDigitalStatusDraft(o.status || '');
                                setShowDigitalDetails(true);
                              }}
                              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-950/40"
                              title="View details"
                            >
                              <FaEye />
                            </button>
                            <button
                              type="button"
                              onClick={() => approveDigitalOrder(o.id)}
                              disabled={approvingDigitalId === o.id}
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-60"
                            >
                              {approvingDigitalId === o.id ? 'Approving…' : 'Approve'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDigitalOrder(o);
                                setDigitalStatusDraft(o.status || '');
                                setShowDigitalDetails(true);
                              }}
                              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-950/40"
                              title="View details"
                            >
                              <FaEye />
                            </button>
                            {o.status === 'paid' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => sendDigitalReceiptEmailToCustomer(o.id)}
                                  disabled={sendingDigitalReceiptId === o.id}
                                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900/60"
                                  title="Email receipt to customer"
                                >
                                  {sendingDigitalReceiptId === o.id ? (
                                    <FaSpinner className="animate-spin" />
                                  ) : (
                                    <FaEnvelope />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => downloadDigitalPurchaseReceipt(o.id)}
                                  disabled={downloadingDigitalReceiptId === o.id}
                                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-950/40"
                                  title="Download receipt PDF"
                                >
                                  {downloadingDigitalReceiptId === o.id ? (
                                    <FaSpinner className="animate-spin" />
                                  ) : (
                                    <FaDownload />
                                  )}
                                </button>
                              </>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Page {digitalPage} of {totalDigitalPages} • Total {digitalTotal}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={digitalPageSize}
                onChange={(e) => {
                  setDigitalPageSize(Number(e.target.value || 20));
                  setDigitalPage(1);
                }}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <button
                type="button"
                onClick={() => setDigitalPage((p) => Math.max(1, p - 1))}
                disabled={digitalPage <= 1}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-950/40"
              >
                <FaChevronLeft />
              </button>
              <button
                type="button"
                onClick={() => setDigitalPage((p) => Math.min(totalDigitalPages, p + 1))}
                disabled={digitalPage >= totalDigitalPages}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-950/40"
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDigitalDetails && selectedDigitalOrder ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black bg-opacity-50 p-3 sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowDigitalDetails(false);
              setSelectedDigitalOrder(null);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Payment Details
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowDigitalDetails(false);
                    setSelectedDigitalOrder(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  aria-label="Close"
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
                      {selectedDigitalOrder.user_name || '-'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Email: {selectedDigitalOrder.user_email || '-'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Contact: {selectedDigitalOrder.user_contact || '-'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Product
                    </h4>
                    <p className="text-gray-900 dark:text-white">
                      {selectedDigitalOrder.product_title || '-'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Purchase ID: #{selectedDigitalOrder.id}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Product Thumbnail
                    </h4>
                    <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-950">
                      {selectedDigitalOrder.product_thumbnail_url ? (
                        <img
                          src={resolveMediaUrl(selectedDigitalOrder.product_thumbnail_url)}
                          alt="Product thumbnail"
                          className="w-full max-h-48 object-contain"
                        />
                      ) : (
                        <div className="p-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                          No thumbnail
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Proof of Payment
                    </h4>
                    <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-950">
                      {!selectedDigitalOrder.proof_url ? (
                        <div className="p-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                          No proof uploaded
                        </div>
                      ) : isImageUrl(selectedDigitalOrder.proof_url) ? (
                        <img
                          src={resolveMediaUrl(selectedDigitalOrder.proof_url)}
                          alt="Proof of Payment"
                          className="w-full max-h-48 object-contain"
                        />
                      ) : (
                        <iframe
                          title="Proof document"
                          src={resolveMediaUrl(selectedDigitalOrder.proof_url)}
                          className="w-full h-48 bg-white dark:bg-gray-950"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Payment Amount
                    </h4>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      ₵{' '}
                      {Number(
                        selectedDigitalOrder.amount_ghs ??
                          selectedDigitalOrder.amountGhs ??
                          0
                      ).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Provider: {selectedDigitalOrder.payment_provider || '-'} • Method:{' '}
                      {selectedDigitalOrder.payment_method || '-'}
                    </p>
                    {selectedDigitalOrder.paystack_reference ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 break-all mt-2">
                        Ref: {selectedDigitalOrder.paystack_reference}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Status Information
                    </h4>
                    <div className="mt-1">{getDigitalPurchaseStatusBadge(digitalStatusDraft)}</div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Submitted:{' '}
                      {selectedDigitalOrder.created_at
                        ? new Date(selectedDigitalOrder.created_at).toLocaleString()
                        : '-'}
                    </p>
                    {selectedDigitalOrder.paid_at ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Paid: {new Date(selectedDigitalOrder.paid_at).toLocaleString()}
                      </p>
                    ) : null}

                    <div className="mt-3 space-y-2">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                        Update status
                      </label>
                      <select
                        value={digitalStatusDraft}
                        onChange={(e) => setDigitalStatusDraft(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                      >
                        <option value="pending">pending</option>
                        <option value="pending_review">pending_review</option>
                        <option value="paid">paid</option>
                        <option value="rejected">rejected</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {(selectedDigitalOrder.manual_sender_name ||
                  selectedDigitalOrder.manual_sender_number ||
                  selectedDigitalOrder.manual_note) ? (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Additional Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      <p className="text-gray-900 dark:text-white">
                        Sender: {selectedDigitalOrder.manual_sender_name || '-'}
                      </p>
                      <p className="text-gray-900 dark:text-white">
                        Sender #: {selectedDigitalOrder.manual_sender_number || '-'}
                      </p>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Note</p>
                        <p className="text-gray-900 dark:text-white p-2 bg-gray-50 dark:bg-gray-700 rounded mt-1 whitespace-pre-wrap">
                          {selectedDigitalOrder.manual_note || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {digitalStatusDraft === 'paid' || selectedDigitalOrder.status === 'paid' ? (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => sendDigitalReceiptEmailToCustomer(selectedDigitalOrder.id)}
                      disabled={sendingDigitalReceiptId === selectedDigitalOrder.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm font-semibold hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900/60"
                    >
                      {sendingDigitalReceiptId === selectedDigitalOrder.id ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <FaEnvelope />
                      )}
                      Email receipt to customer
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadDigitalPurchaseReceipt(selectedDigitalOrder.id)}
                      disabled={downloadingDigitalReceiptId === selectedDigitalOrder.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60"
                    >
                      {downloadingDigitalReceiptId === selectedDigitalOrder.id ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <FaDownload />
                      )}
                      Download receipt PDF
                    </button>
                  </div>
                ) : null}

                <div className="flex justify-end mt-6 space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDigitalDetails(false);
                      setSelectedDigitalOrder(null);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={saveDigitalStatus}
                    disabled={savingDigitalStatus}
                    className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-60"
                  >
                    {savingDigitalStatus ? 'Saving…' : 'Update Status'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Filters and Search */}
      {orderTab === 'digital' ? null : (
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      )}

      {orderTab === 'digital' ? null : (
      <>
      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => {
                      setSelectAll(e.target.checked);
                      setSelectedOrders(e.target.checked ? filteredOrders.map((o) => o.id) : []);
                    }}
                    className="rounded"
                    title="Select all"
                  />
                </th>
                <th className="py-3 px-4 text-left">
                  <button
                    onClick={() => {
                      setSortField('id');
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    }}
                    className="flex items-center text-gray-700 dark:text-gray-300 font-medium text-sm"
                  >
                    Order #
                    {sortField === 'id' && (
                      sortDirection === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 text-left text-gray-700 dark:text-gray-300 font-medium">Customer</th>
                <th className="py-3 px-4 text-left text-gray-700 dark:text-gray-300 font-medium">Total</th>
                <th className="py-3 px-4 text-left">
                  <button
                    onClick={() => {
                      setSortField('status');
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    }}
                    className="flex items-center text-gray-700 dark:text-gray-300 font-medium text-sm"
                  >
                    Status
                    {sortField === 'status' && (
                      sortDirection === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 text-left text-gray-700 dark:text-gray-300 font-medium">Payment Status</th>
                <th className="py-3 px-4 text-left">
                  <button
                    onClick={() => {
                      setSortField('created_at');
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    }}
                    className="flex items-center text-gray-700 dark:text-gray-300 font-medium text-sm"
                  >
                    Date
                    {sortField === 'created_at' && (
                      sortDirection === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 text-left text-gray-700 dark:text-gray-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => handleSelectOrder(order.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">#{order.id}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{order.customer_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{order.customer_email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">₵{typeof order.total === 'number' ? order.total.toFixed(2) : parseFloat(order.total || 0).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        order.payment_status === 'paid' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : order.payment_status === 'failed'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : order.payment_status === 'refunded'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderDetails(true);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => handleDownloadReceipt(order.id)}
                          disabled={downloadingReceiptId === order.id}
                          className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                          title="Download receipt"
                        >
                          {downloadingReceiptId === order.id ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                        </button>
                        <button
                          onClick={() => openStatusModal(order)}
                          className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                          title="Update Status"
                        >
                          Update Status
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order)}
                          className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Cancel / Delete order"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Order Details - #{selectedOrder.id}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadReceipt(selectedOrder.id)}
                    disabled={downloadingReceiptId === selectedOrder.id}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                    title="Download receipt"
                  >
                    {downloadingReceiptId === selectedOrder.id ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                    Receipt
                  </button>
                  <button
                    onClick={() => setShowOrderDetails(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Customer Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Customer Information</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-900 dark:text-white">{selectedOrder.customer_name}</p>
                    <p className="text-gray-600 dark:text-gray-400">{selectedOrder.customer_email}</p>
                    {selectedOrder.customer_phone && (
                      <p className="text-gray-600 dark:text-gray-400">{selectedOrder.customer_phone}</p>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Order Items</h4>
                  <div className="space-y-4">
                    {selectedOrder.items && Array.isArray(selectedOrder.items) && selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <img
                          src={item.image || getPlaceholderImagePath()}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded"
                          onError={(e) => {
                            e.target.src = getPlaceholderImagePath();
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Quantity: {item.quantity} × ₵{typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price || 0).toFixed(2)}
                            {([item.color, item.size && item.size !== 'default' ? item.size : null].filter(Boolean).length > 0) && ` (${[item.color, item.size && item.size !== 'default' ? item.size : null].filter(Boolean).join(' • ')})`}
                          </p>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          ₵{((item.quantity || 0) * (typeof item.price === 'number' ? item.price : parseFloat(item.price || 0))).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Order Summary</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                      <span className="text-gray-900 dark:text-white">₵{typeof selectedOrder.subtotal === 'number' ? selectedOrder.subtotal.toFixed(2) : parseFloat(selectedOrder.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                      <span className="text-gray-900 dark:text-white">₵{typeof selectedOrder.shipping_cost === 'number' ? selectedOrder.shipping_cost.toFixed(2) : parseFloat(selectedOrder.shipping_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tax</span>
                      <span className="text-gray-900 dark:text-white">₵{typeof selectedOrder.tax === 'number' ? selectedOrder.tax.toFixed(2) : parseFloat(selectedOrder.tax || 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                        <span className="font-semibold text-gray-900 dark:text-white">₵{typeof selectedOrder.total === 'number' ? selectedOrder.total.toFixed(2) : parseFloat(selectedOrder.total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-gray-600 dark:text-gray-400">Payment Status</span>
                      <span className={`font-semibold ${selectedOrder.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {selectedOrder.payment_status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Payment Method</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrder.payment_method || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Shipping Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Shipping Information</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-900 dark:text-white">{selectedOrder.shipping_address}</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedOrder.shipping_city}, {selectedOrder.shipping_state} {selectedOrder.shipping_zip_code}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">{selectedOrder.shipping_country}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && orderToUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Update Order Status - #{orderToUpdate.id}
                </h3>
                <button
                  onClick={closeStatusModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                {/* Order Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Order Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Payment Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Status
                  </label>
                  <select
                    value={newPaymentStatus}
                    onChange={(e) => setNewPaymentStatus(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>

                {/* Current Status Display */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <strong>Current Status:</strong> {orderToUpdate.status}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Current Payment Status:</strong> {orderToUpdate.payment_status}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={closeStatusModal}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStatusUpdate}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, total)} of {total} orders
            </span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 ${
                currentPage === 1
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <FaChevronLeft />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className={`px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 ${
                currentPage >= totalPages
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement; 