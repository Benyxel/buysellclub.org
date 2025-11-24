import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FaShoppingBag, FaTruck, FaCheckCircle, FaTimesCircle, FaBox, FaMapMarkerAlt, FaCalendarAlt, FaTrash, FaEye, FaSpinner } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getOrders, getOrder } from '../api';
import { getPlaceholderImagePath } from '../utils/paths';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const location = useLocation();
  const hasFetchedRef = useRef(false);

  const fetchOrders = React.useCallback(async () => {
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
      
      if (ordersData.length > 0) {
        ordersData.forEach((order, index) => {
          console.log(`Order ${index + 1}:`, {
            id: order.id,
            items: order.items,
            itemsType: typeof order.items,
            itemsIsArray: Array.isArray(order.items),
            itemsLength: order.items?.length,
            status: order.status,
            total: order.total
          });
        });
      }
      
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
        // Optionally redirect to login
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
    hasFetchedRef.current = true;
    
    // Refresh orders every 30 seconds
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [location.pathname, fetchOrders]);

  const handleViewDetails = async (orderId) => {
    try {
      const response = await getOrder(orderId);
      setSelectedOrder(response.data);
      setShowOrderDetails(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to load order details');
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your order history? This action cannot be undone.')) {
      localStorage.removeItem('orders');
      setOrders([]);
      toast.success('Order history cleared successfully');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'shipped':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return <FaCheckCircle className="text-green-600" />;
      case 'processing':
        return <FaSpinner className="text-yellow-600 animate-spin" />;
      case 'shipped':
        return <FaTruck className="text-blue-600" />;
      case 'cancelled':
        return <FaTimesCircle className="text-red-600" />;
      default:
        return <FaBox className="text-gray-600" />;
    }
  };

  const getStatusSteps = (status) => {
    const steps = [
      { key: 'pending', label: 'Order Placed', icon: <FaShoppingBag /> },
      { key: 'processing', label: 'Processing', icon: <FaSpinner /> },
      { key: 'shipped', label: 'Shipped', icon: <FaTruck /> },
      { key: 'delivered', label: 'Delivered', icon: <FaCheckCircle /> },
    ];

    const statusOrder = ['pending', 'processing', 'shipped', 'delivered'];
    const currentIndex = statusOrder.indexOf(status?.toLowerCase());
    
    return steps.map((step, index) => {
      const isCompleted = index <= currentIndex;
      const isCurrent = index === currentIndex;
      const isCancelled = status?.toLowerCase() === 'cancelled';

      return {
        ...step,
        isCompleted: isCancelled ? false : isCompleted,
        isCurrent: isCancelled ? false : isCurrent,
        isCancelled,
      };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <FaShoppingBag className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order History</h1>
                <p className="text-gray-600 dark:text-gray-400">View and track your orders</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchOrders}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh orders"
              >
                <FaSpinner className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              {orders.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <FaTrash className="w-4 h-4" />
                  Clear History
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <FaShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">No orders found</p>
              <p className="text-gray-500 dark:text-gray-500 mt-2">Your order history will appear here</p>
              <Link
                to="/Shop"
                className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Go to Shop
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                const statusSteps = getStatusSteps(order.status);
                return (
                  <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Order #{order.id}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Placed on {new Date(order.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </span>
                        <button
                          onClick={() => handleViewDetails(order.id)}
                          className="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                          <FaEye />
                          View Details
                        </button>
                      </div>
                    </div>

                    {/* Order Tracking Timeline */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Order Status</h3>
                      <div className="relative">
                        <div className="flex items-center justify-between">
                          {statusSteps.map((step, index) => (
                            <div key={step.key} className="flex-1 flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                                step.isCancelled 
                                  ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200'
                                  : step.isCompleted
                                  ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-200'
                                  : step.isCurrent
                                  ? 'bg-primary text-white'
                                  : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                              }`}>
                                {step.icon}
                              </div>
                              <p className={`text-xs text-center ${
                                step.isCompleted || step.isCurrent
                                  ? 'text-gray-900 dark:text-white font-medium'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {step.label}
                              </p>
                            </div>
                          ))}
                        </div>
                        {/* Progress Line */}
                        {order.status?.toLowerCase() !== 'cancelled' && (
                          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 -z-10">
                            <div 
                              className="h-full bg-primary transition-all duration-500"
                              style={{ 
                                width: `${(statusSteps.filter(s => s.isCompleted).length / (statusSteps.length - 1)) * 100}%` 
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Items Preview */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Items</h3>
                      {(() => {
                        // Handle different item formats
                        let items = [];
                        if (order.items) {
                          if (Array.isArray(order.items)) {
                            items = order.items;
                          } else if (typeof order.items === 'string') {
                            try {
                              items = JSON.parse(order.items);
                            } catch (e) {
                              console.error('Failed to parse items JSON:', e);
                            }
                          } else if (typeof order.items === 'object') {
                            items = Object.values(order.items);
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
                          <div className="space-y-3">
                            {items.slice(0, 3).map((item, index) => {
                              // Normalize item data
                              const itemName = item.name || item.product_name || 'Unnamed Product';
                              const itemImage = item.image || item.image_url || getPlaceholderImagePath();
                              const itemQuantity = item.quantity || 0;
                              const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price || 0);
                              const itemSize = item.size && item.size !== 'default' && item.size !== 'null' && item.size !== null ? item.size : null;
                              
                              return (
                                <div key={index} className="flex items-center gap-4">
                                  <img
                                    src={itemImage}
                                    alt={itemName}
                                    className="w-16 h-16 rounded-lg object-cover"
                                    onError={(e) => {
                                      e.target.src = getPlaceholderImagePath();
                                    }}
                                  />
                                  <div className="flex-1">
                                    <h3 className="font-medium text-gray-900 dark:text-white">{itemName}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      Qty: {itemQuantity} × ₵{itemPrice.toFixed(2)}
                                      {itemSize && ` • Size: ${itemSize}`}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                            {items.length > 3 && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                                +{items.length - 3} more item(s)
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Order Summary */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <FaMapMarkerAlt className="w-4 h-4" />
                          <span className="text-sm">
                            {order.shipping_city}, {order.shipping_state}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Total: <span className="font-semibold">₵{typeof order.total === 'number' ? order.total.toFixed(2) : parseFloat(order.total || 0).toFixed(2)}</span>
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Payment: <span className={`font-medium ${
                              order.payment_status === 'paid' 
                                ? 'text-green-600' 
                                : order.payment_status === 'failed'
                                ? 'text-red-600'
                                : 'text-yellow-600'
                            }`}>
                              {order.payment_status}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FaTimesCircle />
                </button>
              </div>

              <div className="space-y-6">
                {/* Order Status Timeline */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Tracking</h4>
                  {(() => {
                    const statusSteps = getStatusSteps(selectedOrder.status);
                    return (
                      <div className="relative">
                        <div className="flex items-center justify-between">
                          {statusSteps.map((step, index) => (
                            <div key={step.key} className="flex-1 flex flex-col items-center">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                                step.isCancelled 
                                  ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200'
                                  : step.isCompleted
                                  ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-200'
                                  : step.isCurrent
                                  ? 'bg-primary text-white'
                                  : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                              }`}>
                                {step.icon}
                              </div>
                              <p className={`text-sm text-center ${
                                step.isCompleted || step.isCurrent
                                  ? 'text-gray-900 dark:text-white font-medium'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {step.label}
                              </p>
                            </div>
                          ))}
                        </div>
                        {selectedOrder.status?.toLowerCase() !== 'cancelled' && (
                          <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 -z-10">
                            <div 
                              className="h-full bg-primary transition-all duration-500"
                              style={{ 
                                width: `${(statusSteps.filter(s => s.isCompleted).length / (statusSteps.length - 1)) * 100}%` 
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Order Items</h4>
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
                          // Normalize item data
                          const itemName = item.name || item.product_name || 'Unnamed Product';
                          const itemImage = item.image || item.image_url || '/placeholder-image.png';
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
                                  e.target.src = '/placeholder-image.png';
                                }}
                              />
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900 dark:text-white">{itemName}</h3>
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

                {/* Order Summary */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Order Summary</h4>
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
                      <span className={`font-semibold ${
                        selectedOrder.payment_status === 'paid' 
                          ? 'text-green-600' 
                          : selectedOrder.payment_status === 'failed'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      }`}>
                        {selectedOrder.payment_status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shipping Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Shipping Address</h4>
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
        </div>
      </div>
    </div>
  );
};

export default Orders;
