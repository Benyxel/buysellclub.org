import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCheckCircle, FaTimesCircle, FaCreditCard, FaMobileAlt, FaWallet, FaInfoCircle, FaCalendarAlt, FaClock } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import API from '../../api';

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [booking, setBooking] = useState(null);
  const [paymentType, setPaymentType] = useState(null); // 'buy4me' or 'training'
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('mobile');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    const state = location.state;
    if (state?.type === 'training' && state?.booking) {
      setBooking(state.booking);
      setPaymentType('training');
      // Fetch latest booking data to get training cost
      if (state.booking.id) {
        fetchBookingDetails(state.booking.id);
      }
    } else if (state?.order) {
      setOrder(state.order);
      setPaymentType('buy4me');
    } else {
      navigate('/quicklinks/buy4me');
      return;
    }
  }, [location.state, navigate]);

  const fetchBookingDetails = async (bookingId) => {
    try {
      const response = await API.get(`/buysellapi/training-bookings/${bookingId}/`);
      setBooking(response.data);
    } catch (error) {
      console.error('Error fetching booking details:', error);
    }
  };

  const handlePayment = async () => {
    if (selectedMethod === 'mobile' && !phoneNumber) {
      toast.error('Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      if (paymentType === 'training') {
        // Process training payment
        if (!booking || !booking.id) {
          toast.error('Booking information is missing');
          return;
        }

        // Check if training cost is set
        const cost = booking.trainingCost || booking.training_cost || 0;
        if (cost <= 0) {
          toast.error('Training cost has not been set by admin yet. Please contact support.');
          return;
        }

        // Process payment via API
        await API.put(`/buysellapi/training-bookings/${booking.id}/payment/`, {
          paymentMethod: selectedMethod,
          phoneNumber: selectedMethod === 'mobile' ? phoneNumber : undefined,
        });

        // Create update notification
        const updates = JSON.parse(localStorage.getItem('updates') || '[]');
        updates.unshift({
          id: Date.now().toString(),
          type: 'training',
          title: 'Training Payment Successful',
          message: `Your training session payment has been processed successfully. Your booking is now confirmed.`,
          date: new Date().toISOString(),
          read: false
        });
        localStorage.setItem('updates', JSON.stringify(updates));

        setPaymentStatus('success');
        toast.success('Payment successful! Your training booking is confirmed.');
      } else {
        // Process Buy4me payment (existing logic)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const buy4meOrders = JSON.parse(localStorage.getItem('buy4meOrders') || '[]');
        const updatedOrders = buy4meOrders.map(o => {
          if (o.id === order.id) {
            return {
              ...o,
              status: 'Processing',
              paymentStatus: 'completed',
              paymentDate: new Date().toISOString(),
              paymentMethod: selectedMethod,
              phoneNumber: selectedMethod === 'mobile' ? phoneNumber : undefined
            };
          }
          return o;
        });
        localStorage.setItem('buy4meOrders', JSON.stringify(updatedOrders));
        
        const updates = JSON.parse(localStorage.getItem('updates') || '[]');
        updates.unshift({
          id: Date.now().toString(),
          type: 'order',
          title: 'Order Payment Successful',
          message: `Your order for "${order.title}" has been paid successfully. We're now processing your order.`,
          date: new Date().toISOString(),
          read: false
        });
        localStorage.setItem('updates', JSON.stringify(updates));

        setPaymentStatus('success');
        toast.success('Payment successful! Your order is being processed.');
      }
      
      // Redirect to profile page after 2 seconds
      setTimeout(() => {
        navigate('/profile');
      }, 2000);
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      const errorMsg = error.response?.data?.error || error.response?.data?.detail || error.message || 'Payment failed. Please try again.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!order && !booking) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 mb-6"
          >
            <FaArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Orders</span>
          </button>

          {/* Order/Booking Summary */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {paymentType === 'training' ? 'Training Booking Summary' : 'Order Summary'}
            </h2>
            <div className="space-y-4">
              {paymentType === 'training' && booking ? (
                <>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Training Session</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {booking.name} - {booking.email}
                    </p>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Date:</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Time:</span>
                    <span className="text-gray-900 dark:text-white">
                      {booking.booking_time_display || booking.booking_time}
                    </span>
                  </div>
                </>
              ) : order ? (
                <>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{order.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{order.description}</p>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Order Date:</span>
                    <span className="text-gray-900 dark:text-white">{new Date(order.date).toLocaleDateString()}</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Payment Method Selection */}
          {paymentStatus === 'pending' && (
            <div className="px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Select Payment Method
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setSelectedMethod('mobile')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedMethod === 'mobile'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                    }`}
                  >
                    <FaMobileAlt className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mobile Money</span>
                  </button>
                  <button
                    onClick={() => setSelectedMethod('card')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedMethod === 'card'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                    }`}
                  >
                    <FaCreditCard className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Card</span>
                  </button>
                  <button
                    onClick={() => setSelectedMethod('cash')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedMethod === 'cash'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                    }`}
                  >
                    <FaWallet className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cash</span>
                  </button>
                </div>

                {selectedMethod === 'mobile' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Enter your phone number"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                )}

                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <FaInfoCircle className="w-5 h-5 text-blue-500 mt-1" />
                    <div>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Your payment will be processed securely. For mobile money payments, you'll receive a prompt on your phone to confirm the transaction.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {loading ? 'Processing Payment...' : (
                    paymentType === 'training' && booking
                      ? `Pay GHS ${Number(booking.trainingCost || booking.training_cost || 0).toFixed(2)}`
                      : 'Pay GHS 100.00'
                  )}
                </button>
              </div>
            </div>
          )}

          {paymentStatus === 'success' && (
            <div className="px-6 py-4 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center justify-center text-green-600 dark:text-green-400">
                <FaCheckCircle className="w-8 h-8 mr-2" />
                <span className="text-lg font-medium">Payment Successful!</span>
              </div>
              <p className="mt-2 text-center text-gray-600 dark:text-gray-300">
                Redirecting to your profile...
              </p>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="px-6 py-4 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center justify-center text-red-600 dark:text-red-400">
                <FaTimesCircle className="w-8 h-8 mr-2" />
                <span className="text-lg font-medium">Payment Failed</span>
              </div>
              <p className="mt-2 text-center text-gray-600 dark:text-gray-300">
                Please try again or contact support.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payment; 