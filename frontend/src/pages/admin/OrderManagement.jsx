import React, { useState, useEffect } from 'react';
import { FaSearch, FaSortAmountDown, FaSortAmountUp, FaFilter, FaDownload, FaEye, FaCheck, FaTimes, FaChevronLeft, FaChevronRight, FaTrash, FaSpinner } from 'react-icons/fa';
import { toast } from '../../utils/toast';
import API, { Api, getOrders, downloadOrderReceipt } from '../../api';
import BulkActions from '../../components/shared/BulkActions';
import { getApiUrl } from '../../config/api';
import { getPlaceholderImagePath } from '../../utils/paths';

const OrderManagement = () => {
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchOrders(currentPage, pageSize);
  }, [currentPage, pageSize]);

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

  if (loading) {
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

      {/* Filters and Search */}
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