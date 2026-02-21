import React, { useState, useContext, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSpinner } from 'react-icons/fa';
import { ShopContext } from '../context/ShopContext';
import { toast } from '../utils/toast';
import api, { createOrder, initiateOrderPayment } from '../api';
import { getPlaceholderImagePath } from '../utils/paths';

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, getCartAmount, clearCart, products, currency } = useContext(ShopContext);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Ghana'
  });
  const [paymentMethod, setPaymentMethod] = useState('expresspay'); // 'expresspay' | 'momo'
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [connectingToPayment, setConnectingToPayment] = useState(false);

  // Convert cartItems object to array format for display
  const checkoutItems = useMemo(() => {
    const items = [];
    if (!cartItems || typeof cartItems !== 'object' || Array.isArray(cartItems)) {
      return items;
    }

    for (const productId in cartItems) {
      for (const size in cartItems[productId]) {
        const quantity = cartItems[productId][size];
        if (quantity > 0) {
          // Find product details
          const product = products.find(
            (p) =>
              p._id === Number(productId) ||
              p._id === productId ||
              String(p._id) === String(productId)
          );

          if (product) {
            // Handle image - could be string or array
            const productImage = Array.isArray(product.image)
              ? product.image[0]
              : product.image || (product.images && product.images[0]) || '';

            items.push({
              id: productId,
              productId: productId,
              name: product.name,
              image: productImage,
              price: typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0,
              quantity: quantity,
              size: size !== 'default' ? size : null,
            });
          }
        }
      }
    }
    return items;
  }, [cartItems, products]);

  // Auto-fill first name, last name, and email from logged-in user profile
  useEffect(() => {
    let cancelled = false;
    const fillFromProfile = async () => {
      try {
        const resp = await api.get('/buysellapi/users/me/');
        const data = resp?.data;
        if (cancelled || !data) return;
        const fullName = (data.full_name || data.username || '').trim();
        const parts = fullName.split(/\s+/, 2);
        const firstName = parts[0] || '';
        const lastName = parts[1] || '';
        const email = (data.email || '').trim();
        setFormData(prev => ({
          ...prev,
          firstName: prev.firstName || firstName,
          lastName: prev.lastName || lastName,
          email: prev.email || email,
        }));
      } catch {
        // Not logged in or profile fetch failed; leave form empty
      }
    };
    fillFromProfile();
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.phone) newErrors.phone = 'Phone number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
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
          size: item.size || null
        })),
        customer_name: `${formData.firstName} ${formData.lastName}`,
        customer_email: formData.email,
        customer_phone: formData.phone,
        subtotal: parseFloat(getCartAmount().toFixed(2)),
        tax: 0,
        shipping_cost: 0,
        total: parseFloat(getCartAmount().toFixed(2)),
        payment_method: paymentMethod,
        status: 'pending',
        payment_status: 'pending'
      };
      if (paymentMethod === 'momo') {
        orderData.momo_phone = formData.phone || orderData.customer_phone;
      }

      // Debug: Log the order data being sent
      console.log('Order data being sent:', JSON.stringify(orderData, null, 2));
      
      // Create order using API helper. For MoMo, backend requests payment first and only creates order after MoMo accepts (202).
      const response = await createOrder(orderData);
      
      // MoMo failed: backend did not create order (503)
      if (response.status === 503) {
        const errData = response.data || {};
        const msg = errData.momo_error || errData.detail || errData.error || 'MoMo payment could not be started.';
        const hint = errData.hint ? ` ${errData.hint}` : '';
        toast.error(msg + hint);
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
      
      // MoMo: order is created only after MoMo accepted the request; no separate payment initiation
      if (paymentMethod === 'momo') {
        toast.success('Check your phone to approve the payment.');
        clearCart();
        navigate('/Orders');
        setLoading(false);
        return;
      }
      
      // ExpressPay (or other): redirect to payment URL if present
      const shouldRedirectToGateway = data.payment_url && paymentMethod !== 'momo';
      if (shouldRedirectToGateway) {
        toast.success('Redirecting to payment gateway...');
        window.location.href = data.payment_url;
        return;
      }
      
      // If no payment URL in response, initiate payment separately (e.g. ExpressPay)
      if (data.id && data.total > 0) {
        setLoading(false);
        setConnectingToPayment(true);
        toast.info("Connecting to payment gateway...");

        try {
          const paymentResponse = await initiateOrderPayment(data.id, {});
          
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
          console.error('Error initiating payment:', paymentError);
          setConnectingToPayment(false);
          setLoading(false);
          if (paymentError.response?.status === 503) {
            const errorMsg = paymentError.response?.data?.error || 'Payment gateway is currently unavailable. Please contact support or try again later.';
            toast.error(errorMsg);
          } else if (paymentError.response?.status === 400) {
            const errorMsg = paymentError.response?.data?.error || 'Invalid payment request. Please try again.';
            toast.error(errorMsg);
          } else {
            toast.error(paymentError.response?.data?.error || 'Payment could not be started. Please try again.');
          }
          return;
        }
      }
      
      // Clear cart and redirect only when we did not need payment initiation, or ExpressPay returned URL
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
                        {item.size && <span className="ml-2">({item.size})</span>}
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

            {/* Checkout Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Contact & Payment</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        errors.firstName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        errors.lastName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder={paymentMethod === 'momo' ? 'MoMo number (e.g. 0244123456)' : ''}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment method
                  </label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="expresspay"
                        checked={paymentMethod === 'expresspay'}
                        onChange={() => setPaymentMethod('expresspay')}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-gray-700 dark:text-gray-300">ExpressPay (card/redirect)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="momo"
                        checked={paymentMethod === 'momo'}
                        onChange={() => setPaymentMethod('momo')}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-gray-700 dark:text-gray-300">MoMo (pay on your phone)</span>
                    </label>
                  </div>
                  {paymentMethod === 'momo' && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Use the phone number above. You will get a prompt on your phone to approve the payment.
                    </p>
                  )}
                </div>

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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
