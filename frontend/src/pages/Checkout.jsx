import React, { useState, useContext, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSpinner } from 'react-icons/fa';
import { ShopContext } from '../context/ShopContext';
import { toast } from '../utils/toast';
import api, { createOrder, initiateOrderPayment } from '../api';
import { getPlaceholderImagePath } from '../utils/paths';

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, cartItemOptions = {}, getCartAmount, clearCart, products, currency } = useContext(ShopContext);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [loading, setLoading] = useState(false);
  const [connectingToPayment, setConnectingToPayment] = useState(false);
  // Shipping info: user can enter contact and delivery location
  const [shippingContact, setShippingContact] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');

  // Convert cartItems object to array format for display
  const checkoutItems = useMemo(() => {
    const items = [];
    if (!cartItems || typeof cartItems !== 'object' || Array.isArray(cartItems)) {
      return items;
    }

    for (const productId in cartItems) {
      for (const cartKey in cartItems[productId]) {
        const quantity = cartItems[productId][cartKey];
        if (quantity > 0) {
          const product = products.find(
            (p) =>
              p._id === Number(productId) ||
              p._id === productId ||
              String(p._id) === String(productId)
          );
          if (product) {
            const productImage = Array.isArray(product.image)
              ? product.image[0]
              : product.image || (product.images && product.images[0]) || '';
            const sizeForOrder = cartKey === 'default' ? null : (cartKey.includes('|Color:') ? cartKey.split('|Color:')[0] : cartKey);
            const color = (cartItemOptions[productId]?.[cartKey]?.color) || (cartKey.includes('|Color:') ? cartKey.split('|Color:')[1] : null) || null;
            items.push({
              id: productId,
              productId: productId,
              name: product.name,
              image: productImage,
              price: typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0,
              quantity: quantity,
              size: sizeForOrder,
              color: color || null,
            });
          }
        }
      }
    }
    return items;
  }, [cartItems, cartItemOptions, products]);

  // Load logged-in user profile for order details
  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const resp = await api.get('/buysellapi/users/me/');
        if (cancelled) return;
        const profile = resp?.data || null;
        setUserProfile(profile);
        if (profile?.contact) setShippingContact((profile.contact || '').trim());
      } catch {
        setUserProfile(null);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };
    loadProfile();
    return () => { cancelled = true; };
  }, []);

  // Redirect to cart if cart is empty
  useEffect(() => {
    if (checkoutItems.length === 0) {
      toast.info('Your cart is empty. Redirecting to cart...');
      setTimeout(() => {
        navigate('/Cart');
      }, 1500);
    }
  }, [checkoutItems.length, navigate]);

  const customerName = (userProfile?.full_name || userProfile?.username || '').trim() || 'Customer';
  const customerEmail = (userProfile?.email || '').trim();
  const customerPhone = (shippingContact || (userProfile?.contact || '').trim()).trim() || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userProfile) {
      toast.error('Please log in to place an order.');
      return;
    }
    if (!customerEmail) {
      toast.error('Please add an email to your profile to place an order.');
      navigate('/Profile');
      return;
    }
    const contact = (shippingContact || '').trim();
    const location = (deliveryLocation || '').trim();
    if (!contact) {
      toast.error('Please enter your contact number for delivery.');
      return;
    }
    if (!location) {
      toast.error('Please enter your delivery location.');
      return;
    }

    // Validate inventory before submitting
    const inventoryErrors = [];
    for (const item of checkoutItems) {
      const product = products.find(
        (p) =>
          p._id === Number(item.productId) ||
          p._id === item.productId ||
          String(p._id) === String(item.productId)
      );
      
      if (product) {
        if (product.inventory === undefined) {
          // If inventory is not tracked, skip validation
          continue;
        }
        
        if (product.inventory < item.quantity) {
          inventoryErrors.push(
            `Product "${item.name}" has only ${product.inventory} in stock, but you have ${item.quantity} in your cart.`
          );
        }
      }
    }
    
    if (inventoryErrors.length > 0) {
      toast.error(inventoryErrors[0]);
      if (inventoryErrors.length > 1) {
        console.error("Multiple inventory errors:", inventoryErrors);
      }
      return;
    }
    
    setLoading(true);

    try {
      // Prepare order data to match backend Order model structure
      const orderData = {
        items: checkoutItems.map(item => ({
          product: item.productId,
          name: item.name,
          image: item.image || '',
          price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
          quantity: item.quantity,
          size: item.size || null,
          color: item.color || null,
        })),
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: contact,
        shipping_address: location,
        subtotal: parseFloat(getCartAmount().toFixed(2)),
        tax: 0,
        shipping_cost: 0,
        total: parseFloat(getCartAmount().toFixed(2)),
        payment_method: paymentMethod,
        status: 'pending',
        payment_status: 'pending'
      };
      const baseUrl = import.meta.env.VITE_APP_URL;
      if (baseUrl && paymentMethod === 'paystack') {
        orderData.callback_url = `${String(baseUrl).replace(/\/$/, '')}/payment/callback`;
      }

      const response = await createOrder(orderData);

      if (response.status === 503) {
        const errData = response.data || {};
        const msg = errData.detail || errData.error || 'Payment could not be started.';
        toast.error(msg);
        setLoading(false);
        return;
      }
      
      // Verify response status
      if (response.status !== 201 && response.status !== 200) {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
      
      // Verify response
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }
      
      // Check if order was created successfully
      if (!response.data.id) {
        console.error('Response data:', response.data);
        throw new Error('Order was not created - no order ID returned');
      }
      
      console.log('Order created successfully:', response.data);
      const data = response.data;

      if (data.payment_url) {
        toast.success('Redirecting to payment gateway...');
        window.location.href = data.payment_url;
        return;
      }
      
      if (data.id && data.total > 0) {
        setLoading(false);
        setConnectingToPayment(true);
        toast.info("Connecting to payment gateway...");

        try {
          const paymentResponse = await initiateOrderPayment(data.id, { payment_method: paymentMethod });
          
          if (paymentResponse?.data?.payment_url) {
            toast.success('Redirecting to payment gateway...');
            window.location.href = paymentResponse.data.payment_url;
            return;
          }
          if (!paymentResponse?.data?.payment_url) {
            toast.error(paymentResponse?.data?.error || "Payment gateway not configured. Please contact support.");
            setConnectingToPayment(false);
            setLoading(false);
            return;
          }
        } catch (paymentError) {
          const res = paymentError.response;
          console.error('Error initiating payment:', res?.data || paymentError);
          setConnectingToPayment(false);
          setLoading(false);
          if (res?.status === 503) {
            const errorMsg = res?.data?.error || res?.data?.message || 'Payment gateway is currently unavailable. Please contact support or try again later.';
            toast.error(errorMsg);
          } else if (res?.status === 400) {
            const errorMsg = paymentError.response?.data?.error || 'Invalid payment request. Please try again.';
            toast.error(errorMsg);
          } else {
            toast.error(paymentError.response?.data?.error || 'Payment could not be started. Please try again.');
          }
          return;
        }
      }
      
      clearCart();
      toast.success(`Order placed successfully! Order ID: ${data.id}`);
      navigate(`/Orders`);
    } catch (error) {
      setConnectingToPayment(false);
      console.error('Error placing order:', error);
      console.error('Error response:', error.response?.data);
      
      // Extract error message - show all validation errors
      let errorMessage = 'Failed to place order. Please try again.';
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle object with field-specific errors
        if (typeof errorData === 'object' && !Array.isArray(errorData)) {
          const errorFields = Object.keys(errorData);
          if (errorFields.length > 0) {
            // Collect all field errors
            const fieldErrors = errorFields.map(field => {
              const fieldError = Array.isArray(errorData[field]) 
                ? errorData[field].join(', ') 
                : errorData[field];
              return `${field}: ${fieldError}`;
            });
            errorMessage = fieldErrors.join('; ');
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (Array.isArray(errorData)) {
          errorMessage = errorData.join('; ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('Full error details:', error.response?.data);
      toast.error(errorMessage, { autoClose: 5000 });
    } finally {
      setLoading(false);
    }
  };

  // Show loading or redirect message if cart is empty
  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Your cart is empty. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Checkout</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Order Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h2>
              
              <div className="space-y-4">
                {checkoutItems.map((item, index) => (
                  <div key={`${item.id}-${item.size || 'default'}-${index}`} className="flex items-center gap-4">
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
                        Quantity: {item.quantity} × <span className="text-gray-500">Price</span> {currency}{item.price.toFixed(2)}
                        {(item.color || item.size) && (
                          <span className="ml-2 text-gray-500 dark:text-gray-400">
                            ({[item.color, item.size ? item.size.replace(/\|/g, ' • ').replace(/:/g, ': ') : null].filter(Boolean).join(' • ')})
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {currency}{(item.quantity * item.price).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 mt-6 pt-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-900 dark:text-white">{currency}{getCartAmount().toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-gray-900 dark:text-white">{currency}{getCartAmount().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Payment</h2>

              {profileLoading ? (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 py-4">
                  <FaSpinner className="w-5 h-5 animate-spin" />
                  <span>Loading your details...</span>
                </div>
              ) : !userProfile ? (
                <div className="py-4">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">You need to be logged in to checkout.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/Login')}
                    className="w-full py-3 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
                  >
                    Log in
                  </button>
                </div>
              ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Paying as</p>
                  <p className="text-gray-900 dark:text-white font-medium mt-0.5">{customerName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{customerEmail}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Shipping info</h3>
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="checkout-contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Contact number
                      </label>
                      <input
                        id="checkout-contact"
                        type="tel"
                        value={shippingContact}
                        onChange={(e) => setShippingContact(e.target.value)}
                        placeholder="e.g. 0244123456"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="checkout-delivery" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Delivery location
                      </label>
                      <textarea
                        id="checkout-delivery"
                        value={deliveryLocation}
                        onChange={(e) => setDeliveryLocation(e.target.value)}
                        placeholder="Address, area, or landmark for delivery"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">Paystack (card / mobile money)</p>

                <button
                  type="submit"
                  disabled={loading || connectingToPayment}
                  className={`w-full py-3 px-4 rounded-lg text-white font-semibold flex items-center justify-center gap-2 ${
                    loading || connectingToPayment
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {connectingToPayment ? (
                    <>
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Connecting to Payment Gateway...
                    </>
                  ) : loading ? (
                    <>
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Place Order'
                  )}
                </button>
                {connectingToPayment && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      <span>Please wait while we connect to the payment gateway. This may take a few seconds...</span>
                    </div>
                  </div>
                )}
              </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
