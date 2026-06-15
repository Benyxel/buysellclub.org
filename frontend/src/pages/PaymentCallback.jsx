import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from '../utils/toast';
import api from '../api';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, failed, pending
  const [message, setMessage] = useState('Verifying your payment...');
  const [verifiedOrderId, setVerifiedOrderId] = useState(null);
  const [paymentType, setPaymentType] = useState(null); // 'order' | 'training'

  useEffect(() => {
    const verifyPayment = async () => {
      // Paystack redirect may use ?reference= or ?trxref= (transaction reference)
      const reference = searchParams.get('reference') || searchParams.get('trxref');
      const orderId = searchParams.get('order-id') || searchParams.get('order_id');
      const token = searchParams.get('token');

      if (reference) {
        const doVerify = async (attempt = 1, maxAttempts = 4) => {
          try {
            const response = await api.get('/buysellapi/payment/verify-paystack/', {
              params: { reference },
            });
            if (response.data && response.data.success) {
              const payType = response.data.type;
              const isTraining = payType === 'training';
              const isCommunity = payType === 'community';
              const isExecutive = payType === 'executive';
              const isBuy4me = payType === 'buy4me';
              const isDonation = payType === 'donation';
              const isDigitalStore = payType === 'digital_store';
              const bookingId = response.data.booking_id;
              const orderId = response.data.order_id;
              const requestId = response.data.request_id || response.data.community_request_id || response.data.executive_request_id;
              const digitalPurchaseId = response.data.purchase_id;
              setVerifiedOrderId(orderId || bookingId || requestId || digitalPurchaseId);
              setPaymentType(payType || (isTraining ? 'training' : 'order'));
              setStatus('success');
              if (isDonation) {
                setMessage('Thank you for your donation!');
                toast.success('Donation received. Thank you!');
                setTimeout(() => navigate('/'), 2000);
              } else if (isCommunity) {
                setMessage('Payment successful! Check your email for a link to set your username and password so you can log in.');
                toast.success('Payment confirmed! Check your email to set your username and password.');
                setTimeout(() => navigate('/Profile?tab=community'), 4000);
              } else if (isExecutive) {
                setMessage('Payment successful! Check your email for a link to set your username and password. Executive membership includes Community access.');
                toast.success('Payment confirmed! Check your email to set your username and password.');
                const loggedIn = !!(typeof window !== 'undefined' && localStorage.getItem('token'));
                setTimeout(() => navigate(loggedIn ? '/Profile?tab=membership' : '/Community'), 4000);
              } else if (isBuy4me && requestId) {
                setMessage(`Sourcing fee paid! You can now submit your Buy4me order on the next page.`);
                toast.success(`Sourcing fee paid! Submit your order details.`);
                setTimeout(() => navigate('/Buy4me'), 2000);
              } else if (isDigitalStore) {
                const digitalPid = response.data.purchase_id;
                setMessage("Payment successful! Your digital download is now available.");
                toast.success("Payment confirmed! Your download is ready.");
                setTimeout(() => {
                  if (digitalPid) {
                    navigate(`/DigitalStore?paid=1&purchase_id=${digitalPid}`);
                  } else {
                    navigate("/DigitalStore?paid=1");
                  }
                }, 2000);
              } else if (isTraining && bookingId) {
                setMessage(`Payment successful! Your training booking #${bookingId} has been confirmed.`);
                toast.success(`Training booking #${bookingId} confirmed!`);
                setTimeout(() => navigate('/Training'), 2000);
              } else if (orderId) {
                setMessage(`Payment successful! Your order #${orderId} has been confirmed and is being processed.`);
                toast.success(`Order #${orderId} payment confirmed!`);
                setTimeout(() => navigate(`/Orders?order=${orderId}`), 2000);
              } else {
                setMessage('Payment successful!');
                setTimeout(() => navigate('/'), 2000);
              }
              return;
            }
            const errText = (response.data?.error || '').toLowerCase();
            // Paystack may return "pending" briefly in test mode; retry after 2s
            if (attempt < maxAttempts && (errText.includes('pending') || errText.includes('not completed'))) {
              setMessage(`Verifying payment... (attempt ${attempt + 1}/${maxAttempts})`);
              setTimeout(() => doVerify(attempt + 1, maxAttempts), 2000);
              return;
            }
            setStatus('failed');
            setMessage(response.data?.error || 'Payment verification failed. Please contact support.');
            toast.error(response.data?.error || 'Payment verification failed');
            setTimeout(() => navigate('/'), 5000);
          } catch (err) {
            console.error('Paystack verify error:', err);
            const errMsg = err.response?.data?.error || err.response?.data?.detail || '';
            const errText = (errMsg || err.message || '').toLowerCase();
            const is401 = err.response?.status === 401;
            if (attempt < maxAttempts && (errText.includes('pending') || errText.includes('not completed'))) {
              setMessage(`Verifying payment... (attempt ${attempt + 1}/${maxAttempts})`);
              setTimeout(() => doVerify(attempt + 1, maxAttempts), 2000);
              return;
            }
            setStatus('failed');
            const msg = is401 || errText.includes('authentic') || errText.includes('credential')
              ? 'Payment verification could not complete. Please log in and try again, or contact support.'
              : (errMsg || 'Failed to verify payment. Please contact support.');
            setMessage(msg);
            toast.error(msg);
            setTimeout(() => navigate('/'), 5000);
          }
        };
        doVerify();
        return;
      }

      setStatus('failed');
      setMessage('Missing payment information. Please contact support.');
      toast.error('Invalid payment callback - missing information');
      setTimeout(() => navigate('/'), 5000);
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
                  if (paymentType === 'training') {
                    navigate('/Training');
                    return;
                  }
                  if (paymentType === 'community') {
                    navigate('/Profile?tab=community');
                    return;
                  }
                  if (paymentType === 'executive') {
                    navigate('/Profile?tab=membership');
                    return;
                  }
                  if (paymentType === 'buy4me') {
                    navigate('/Buy4me');
                    return;
                  }
                  if (paymentType === 'donation') {
                    navigate('/');
                    return;
                  }
                  if (paymentType === 'digital_store') {
                    const pid = verifiedOrderId;
                    navigate(pid ? `/DigitalStore?paid=1&purchase_id=${pid}` : '/DigitalStore?paid=1');
                    return;
                  }
                  const orderId = verifiedOrderId || searchParams.get('order-id') || searchParams.get('order_id');
                  if (orderId && !String(orderId).startsWith('training_') && !String(orderId).startsWith('buy4me_') && !String(orderId).startsWith('course_')) {
                    navigate(`/Orders?order=${orderId}`);
                  } else if (orderId && (String(orderId).startsWith('training_') || String(orderId).startsWith('buy4me_') || String(orderId).startsWith('course_'))) {
                    navigate('/Profile');
                  } else {
                    navigate('/Orders');
                  }
                }}
                className="flex-1 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
              >
                View {paymentType === 'training' ? 'Training' : paymentType === 'community' ? 'Profile' : paymentType === 'executive' ? 'Membership' : paymentType === 'buy4me' ? 'Buy4me' : paymentType === 'donation' ? 'Home' : paymentType === 'digital_store' ? 'Digital Store' : (verifiedOrderId ? 'Order' : 'Details')}
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

