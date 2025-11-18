import React, { useState, useContext } from 'react';
import { FaShoppingBag, FaTruck, FaCheckCircle, FaTimesCircle, FaFileInvoiceDollar } from 'react-icons/fa';
import { ShopContext } from '../context/ShopContext';
import Invoice from './Invoice';

const OrderCard = ({ order }) => {
  const { clearCart } = useContext(ShopContext);
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  const handleOrderComplete = () => {
    // Get existing orders from localStorage
    const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    
    // Create new order object
    const newOrder = {
      id: Date.now().toString(), // Generate a unique ID
      date: new Date().toISOString(),
      status: 'Processing',
      items: order.items.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      })),
      total: order.total,
      subtotal: order.subtotal,
      shipping: order.shipping,
      shippingAddress: order.shippingAddress
    };

    // Add new order to existing orders
    const updatedOrders = [...existingOrders, newOrder];
    
    // Save updated orders to localStorage
    localStorage.setItem('orders', JSON.stringify(updatedOrders));

    // Clear the cart using the context function
    if (clearCart) {
      clearCart();
    } else {
      // Fallback: clear manually
      localStorage.removeItem('cartItems');
    }
    
    // Show invoice
    setCompletedOrder(newOrder);
    setShowInvoice(true);
  };

  if (showInvoice) {
    return <Invoice order={completedOrder} />;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Order Summary</h2>
        <FaShoppingBag className="w-6 h-6 text-primary" />
      </div>

      <div className="space-y-4">
        {order.items.map((item, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <img
                src={item.image}
                alt={item.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{item.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Quantity: {item.quantity}</p>
              </div>
            </div>
            <p className="font-semibold text-gray-900 dark:text-white">₵{item.price}</p>
          </div>
        ))}

        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
          <span className="font-semibold text-gray-900 dark:text-white">₵{order.subtotal}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400">Shipping</span>
          <span className="font-semibold text-gray-900 dark:text-white">₵{order.shipping}</span>
        </div>

        <div className="flex justify-between items-center py-2">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">Total</span>
          <span className="text-lg font-bold text-primary">₵{order.total}</span>
        </div>

        <div className="mt-6">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Shipping Address</h3>
          <p className="text-gray-600 dark:text-gray-400">{order.shippingAddress}</p>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={handleOrderComplete}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <FaCheckCircle className="w-5 h-5" />
            Place Order
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors">
            <FaTimesCircle className="w-5 h-5" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;