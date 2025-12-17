import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from '../utils/toast';
import API from '../api';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, failed, pending
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const verifyPayment = async () => {
      const orderId = searchParams.get('order-id') || searchParams.get('order_id');
      const token = searchParams.get('token');

      if (!orderId || !token) {
        setStatus('failed');
        setMessage('Missing payment information. Please contact support.');
        toast.error('Invalid payment callback - missing information');
        setTimeout(() => navigate('/'), 5000);
        return;
      }

      try {
        // Query payment status using the token via our backend
        const response = await API.post('/buysellapi/payment/verify-expresspay/', {
          'order-id': orderId,
          token: token,
        });

        if (response.data && response.data.success) {
          const paymentData = response.data;
          const result = paymentData.result;

          if (result === 1) {
            // Payment approved
            setStatus('success');

            // Determine redirect based on order type
            if (orderId.startsWith('training_')) {
              const bookingId = orderId.replace('training_', '');
              setMessage(`Payment successful! Your training booking #${bookingId} is confirmed.`);
              toast.success('Training booking payment confirmed!');
              setTimeout(() => navigate('/Profile'), 2000);
            } else if (orderId.startsWith('buy4me_')) {
              const requestId = orderId.replace('buy4me_', '');
              setMessage(`Payment successful! Your Buy4me request #${requestId} is being processed.`);
              toast.success('Buy4me payment confirmed!');
              setTimeout(() => navigate('/Profile'), 2000);
            } else if (orderId.startsWith('course_')) {
              const courseId = orderId.replace('course_', '');
              setMessage(`Payment successful! Your course purchase is confirmed.`);
              toast.success('Course payment confirmed!');
              setTimeout(() => navigate('/Profile'), 2000);
            } else {
              // Regular shop order - show order ID and redirect to Orders page
              const shopOrderId = orderId;
              setMessage(`Payment successful! Your order #${shopOrderId} has been confirmed and is being processed.`);
              toast.success(`Order #${shopOrderId} payment confirmed!`);
              // Redirect to Orders page with order ID as query param to potentially highlight it
              setTimeout(() => navigate(`/Orders?order=${shopOrderId}`), 2000);
            }
          } else if (result === 2) {
            // Payment declined
            setStatus('failed');
            setMessage('Payment was declined. Please try again or contact support.');
            toast.error('Payment declined');
            setTimeout(() => navigate('/'), 5000);
          } else if (result === 4) {
            // Payment pending
            setStatus('pending');
            setMessage('Your payment is pending. We will notify you once it is confirmed.');
            toast.info('Payment is pending confirmation');
            setTimeout(() => navigate('/Profile'), 5000);
          } else {
            // Error
            setStatus('failed');
            setMessage('Payment verification failed. Please contact support.');
            toast.error('Payment verification failed');
            setTimeout(() => navigate('/'), 5000);
          }
        } else {
          setStatus('failed');
          setMessage('Failed to verify payment. Please contact support.');
          toast.error('Payment verification failed');
          setTimeout(() => navigate('/'), 5000);
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to verify payment';
        setMessage(errorMsg);
        toast.error(errorMsg);
        setTimeout(() => navigate('/'), 5000);
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Verifying Payment
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Payment Successful!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => {
                  const orderId = searchParams.get('order-id') || searchParams.get('order_id');
                  if (orderId && !orderId.startsWith('training_') && !orderId.startsWith('buy4me_') && !orderId.startsWith('course_')) {
                    navigate(`/Orders?order=${orderId}`);
                  } else if (orderId && (orderId.startsWith('training_') || orderId.startsWith('buy4me_') || orderId.startsWith('course_'))) {
                    navigate('/Profile');
                  } else {
                    navigate('/Orders');
                  }
                }}
                className="flex-1 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
              >
                View {(() => {
                  const orderId = searchParams.get('order-id') || searchParams.get('order_id');
                  if (orderId && !orderId.startsWith('training_') && !orderId.startsWith('buy4me_') && !orderId.startsWith('course_')) {
                    return 'Order';
                  }
                  return 'Details';
                })()}
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex-1 px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
              Redirecting automatically...
            </p>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Payment Pending
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Redirecting you...
            </p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Payment Failed
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Go to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;

