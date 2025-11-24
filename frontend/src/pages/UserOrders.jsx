import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { FaEye, FaTimes, FaShoppingBag, FaSpinner } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getOrders, getOrder, updateOrder } from '../api';
import { getPlaceholderImagePath } from '../utils/paths';

const UserOrders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      if (!token) {
        console.warn('No authentication token found');
        toast.info('Please log in to view your orders');
        setOrders([]);
        setLoading(false);
        return;
      }

      const response = await getOrders();
      
      // Debug: Log full response
      console.log('Orders API response:', response);
      console.log('Response data:', response.data);
      console.log('Response status:', response.status);
      
      // Handle different response structures
      let ordersData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          ordersData = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          ordersData = response.data.results;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          ordersData = response.data.data;
        }
      }
      
      // Debug: Log orders to see structure
      console.log('Orders parsed:', ordersData);
      console.log('Number of orders:', ordersData.length);
      
      setOrders(ordersData);
      
      if (ordersData.length === 0) {
        console.log('No orders found in response');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load orders';
      if (error.response?.status === 401) {
        errorMessage = 'Please log in to view your orders';
        toast.error(errorMessage);
        setTimeout(() => {
          window.location.href = '/Login';
        }, 2000);
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view orders';
        toast.error(errorMessage);
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }
      
      // Fallback to localStorage if API fails
      const savedOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      if (savedOrders.length > 0) {
        console.log('Using fallback orders from localStorage:', savedOrders.length);
        setOrders(savedOrders);
      } else {
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Always fetch orders when component mounts or location changes
    fetchOrders();
    
    // Refresh orders every 30 seconds
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [location.pathname, fetchOrders]);

  const handleCancelOrder = async (orderId) => {
    try {
      // Use the API helper to update order status to cancelled
      const response = await updateOrder(orderId, { status: 'cancelled' });

      if (response.status === 200 || response.status === 204) {
        // Update local state
        setOrders(orders.map(order => 
          order.id === orderId ? { ...order, status: 'cancelled' } : order
        ));

        toast.success('Order cancelled successfully');
        
        // Refresh orders to get latest data
        fetchOrders();
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Failed to cancel order';
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
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">My Orders</h2>
        <p className="text-gray-600 dark:text-gray-400">
          View and manage your orders
        </p>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="py-3 px-4 text-left">Order #</th>
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-left">Total</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Payment Status</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-3 px-4">#{order.id}</td>
                  <td className="py-3 px-4">
                    {new Date(order.created_at || order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3 px-4">₵{typeof order.total === 'number' ? order.total.toFixed(2) : parseFloat(order.total || 0).toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status || 'Pending'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      order.payment_status === 'paid' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : order.payment_status === 'failed'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {order.payment_status || 'Pending'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDetails(true);
                        }}
                        className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <FaEye />
                      </button>
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-6">
                {/* Order Items */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Order Items</h4>
                  <div className="space-y-4">
                    {(() => {
                      // Handle different item formats
                      let items = [];
                      if (selectedOrder.items) {
                        if (Array.isArray(selectedOrder.items)) {
                          items = selectedOrder.items;
                        } else if (typeof selectedOrder.items === 'string') {
                          try {
                            items = JSON.parse(selectedOrder.items);
                          } catch (e) {
                            console.error('Failed to parse items JSON:', e);
                          }
                        } else if (typeof selectedOrder.items === 'object') {
                          items = Object.values(selectedOrder.items);
                        }
                      }
                      
                      if (!items || items.length === 0) {
                        return (
                          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                            <p className="text-sm">No items found in this order</p>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="space-y-4">
                          {items.map((item, index) => {
                            const itemName = item.name || item.product_name || 'Unnamed Product';
                            const itemImage = item.image || item.image_url || getPlaceholderImagePath();
                            const itemQuantity = item.quantity || 0;
                            const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price || 0);
                            const itemSize = item.size && item.size !== 'default' && item.size !== 'null' && item.size !== null ? item.size : null;
                            const itemTotal = itemQuantity * itemPrice;
                            
                            return (
                              <div key={index} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <img
                                  src={itemImage}
                                  alt={itemName}
                                  className="w-20 h-20 rounded-lg object-cover"
                                  onError={(e) => {
                                    e.target.src = getPlaceholderImagePath();
                                  }}
                                />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 dark:text-white">{itemName}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Quantity: {itemQuantity} × ₵{itemPrice.toFixed(2)}
                                    {itemSize && ` • Size: ${itemSize}`}
                                  </p>
                                </div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  ₵{itemTotal.toFixed(2)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
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
                      <span className="text-gray-900 dark:text-white">₵{typeof selectedOrder.shipping_cost === 'number' ? selectedOrder.shipping_cost.toFixed(2) : parseFloat(selectedOrder.shipping_cost || selectedOrder.shipping || 0).toFixed(2)}</span>
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
                      <span className={`font-semibold ${
                        selectedOrder.payment_status === 'paid' 
                          ? 'text-green-600' 
                          : selectedOrder.payment_status === 'failed'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      }`}>
                        {selectedOrder.payment_status || 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shipping Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Shipping Information</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-900 dark:text-white">{selectedOrder.shipping_address || selectedOrder.shipping?.address}</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedOrder.shipping_city || selectedOrder.shipping?.city}, {selectedOrder.shipping_state || selectedOrder.shipping?.state} {selectedOrder.shipping_zip_code || selectedOrder.shipping?.zipCode}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">{selectedOrder.shipping_country || selectedOrder.shipping?.country}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserOrders; 