import React from 'react';
import { FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaDownload, FaPrint, FaEnvelope } from 'react-icons/fa';
import { format } from 'date-fns';
import LogoPlaceholder from '../assets/buyselll.jpg';

const Invoice = ({ invoice, request, printable = false }) => {
  if (!invoice) return null;
  
  const logoSrc = LogoPlaceholder || 'https://via.placeholder.com/150x50?text=Company+Logo';
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <div className="flex items-center px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            <FaCheckCircle className="mr-1" />
            Paid
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex items-center px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
            <FaTimesCircle className="mr-1" />
            Cancelled
          </div>
        );
      default:
        return (
          <div className="flex items-center px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            <FaHourglassHalf className="mr-1" />
            Pending
          </div>
        );
    }
  };

  const formattedDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return format(new Date(), 'MMM dd, yyyy');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  const handleEmailInvoice = () => {
    // This would connect to your email service
    alert('Email functionality would be implemented here');
  };

  const calculateTotal = () => {
    // For buy4me invoices, use totalGhs if available, otherwise fall back to amount
    if (invoice.totalGhs) {
      return invoice.totalGhs;
    }
    let total = invoice.amount || 0;
    if (invoice.tax) total += invoice.tax;
    if (invoice.shipping) total += invoice.shipping;
    if (invoice.serviceFee) total += invoice.serviceFee;
    return total;
  };

  const getCurrencySymbol = () => {
    // For buy4me invoices, use GHS (₵), otherwise USD ($)
    return invoice.totalGhs ? '₵' : '$';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 ${printable ? 'p-8 max-w-4xl mx-auto' : 'rounded-lg shadow-md p-6'}`}>
      {/* Print-only styles */}
      {printable && (
        <style type="text/css" media="print">
          {`
            @page { size: auto; margin: 0mm; }
            body { margin: 1.6cm; }
            .no-print { display: none !important; }
          `}
        </style>
      )}

      {/* Invoice Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-4 border-b dark:border-gray-700">
        <div className="flex items-center mb-4 sm:mb-0">
          <img 
            src={logoSrc} 
            alt="BuySellClub Logo" 
            className="h-12 mr-3 object-contain"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/150x50?text=Company+Logo';
            }}
          />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">INVOICE</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Buy &amp; Sell Club</p>
          </div>
        </div>
        <div>
          {getStatusBadge(invoice.status)}
        </div>
      </div>

      {/* Invoice Information */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Invoice To:</h3>
          <p className="font-medium text-gray-900 dark:text-white">{request?.userName || 'Customer'}</p>
          {request?.userEmail && <p className="text-gray-700 dark:text-gray-300">{request.userEmail}</p>}
          {request?.userAddress && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              <p>{request.userAddress}</p>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="mb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 inline">Invoice Number:</h3>
            <p className="font-medium text-gray-900 dark:text-white inline ml-2">{invoice.invoiceNumber}</p>
          </div>
          <div className="mb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 inline">Date Issued:</h3>
            <p className="text-gray-700 dark:text-gray-300 inline ml-2">{formattedDate(invoice.createdAt)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 inline">Due Date:</h3>
            <p className="text-gray-700 dark:text-gray-300 inline ml-2">{formattedDate(new Date(new Date(invoice.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000))}</p>
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Order Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {/* Buy4Me Invoice Details - Show detailed breakdown */}
              {((invoice.productCostsRmb && invoice.productCostsRmb.length > 0) || invoice.totalProductCostRmb) && invoice.rmbToGhsRate ? (
                <>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="font-medium">{request?.title || 'Buy4Me Service'}</div>
                      <div className="text-gray-500 dark:text-gray-400 mt-1">{request?.description || 'Product procurement services'}</div>
                      {invoice.shippingMethod && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Shipping: {invoice.shippingMethod === 'sea' ? 'Sea' : 'Air'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-medium">
                      {/* Show total product cost in GHS as the main amount */}
                      ₵{((invoice.totalProductCostRmb || (invoice.productCostsRmb ? invoice.productCostsRmb.reduce((sum, cost) => sum + (parseFloat(cost) || 0), 0) : 0)) / invoice.rmbToGhsRate).toFixed(2)}
                    </td>
                  </tr>
                  {/* Individual Product Costs */}
                  {invoice.productCostsRmb && invoice.productCostsRmb.length > 0 && invoice.productCostsRmb.map((cost, index) => {
                    const qty = invoice.productQuantities && invoice.productQuantities[index] ? invoice.productQuantities[index] : 0;
                    const costPerUnit = parseFloat(cost || 0);
                    const totalCost = costPerUnit * qty;
                    return (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          Product {index + 1} Cost (RMB) {qty > 0 ? `× ${qty}` : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                          {qty > 0 ? (
                            <>
                              ¥{costPerUnit.toFixed(2)} × {qty} = ¥{totalCost.toFixed(2)}
                            </>
                          ) : (
                            <>¥{costPerUnit.toFixed(2)}</>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total Product Cost */}
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">
                      Total Product Cost (RMB)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-medium">
                      ¥{(invoice.totalProductCostRmb || (invoice.productCostsRmb ? invoice.productCostsRmb.reduce((sum, cost) => sum + (parseFloat(cost) || 0), 0) : 0)).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      GHS to RMB Rate (1 GHS = {invoice.rmbToGhsRate.toFixed(4)} RMB)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                      {invoice.rmbToGhsRate.toFixed(4)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      Total Product Cost (GHS) = ¥{(invoice.totalProductCostRmb || (invoice.productCostsRmb ? invoice.productCostsRmb.reduce((sum, cost) => sum + (parseFloat(cost) || 0), 0) : 0)).toFixed(2)} ÷ {invoice.rmbToGhsRate.toFixed(4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-medium">
                      ₵{((invoice.totalProductCostRmb || (invoice.productCostsRmb ? invoice.productCostsRmb.reduce((sum, cost) => sum + (parseFloat(cost) || 0), 0) : 0)) / invoice.rmbToGhsRate).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      Service Fee ({invoice.serviceFeePercent || 5}%)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                      ₵{(((invoice.totalProductCostRmb || (invoice.productCostsRmb ? invoice.productCostsRmb.reduce((sum, cost) => sum + (parseFloat(cost) || 0), 0) : 0)) / invoice.rmbToGhsRate) * ((invoice.serviceFeePercent || 5) / 100)).toFixed(2)}
                    </td>
                  </tr>
                </>
              ) : (
                // Legacy invoice format (for non-buy4me invoices)
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="font-medium">{request?.title || 'Service'}</div>
                    <div className="text-gray-500 dark:text-gray-400 mt-1">{request?.description || 'Service description'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-medium">
                    {getCurrencySymbol()}{invoice.amount?.toFixed(2) || '0.00'}
                  </td>
                </tr>
              )}
              
              {/* Legacy invoice fields (for other invoice types) */}
              {!invoice.productCostsRmb && !invoice.totalProductCostRmb && invoice.tax > 0 && (
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    Tax
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                    {getCurrencySymbol()}{invoice.tax.toFixed(2)}
                  </td>
                </tr>
              )}
              {!invoice.productCostsRmb && !invoice.totalProductCostRmb && invoice.shipping > 0 && (
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    Shipping
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                    {getCurrencySymbol()}{invoice.shipping.toFixed(2)}
                  </td>
                </tr>
              )}
              {!invoice.productCostsRmb && !invoice.totalProductCostRmb && invoice.serviceFee > 0 && (
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    Service Fee
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                    {getCurrencySymbol()}{invoice.serviceFee.toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white text-right">
                  Total:
                </td>
                <td className="px-6 py-4 text-right text-lg font-bold text-gray-900 dark:text-white">
                  {getCurrencySymbol()}{calculateTotal().toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment Information */}
      <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Payment Information</h3>
        
        {invoice.isPaid ? (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md dark:bg-green-900 dark:border-green-700">
            <p className="text-green-700 dark:text-green-300 font-medium flex items-center">
              <FaCheckCircle className="mr-2" /> Payment Received on {formattedDate(invoice.paymentDate)}
            </p>
            {invoice.paymentMethod && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Payment Method: {invoice.paymentMethod.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </p>
            )}
            {invoice.paymentReference && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Reference: {invoice.paymentReference}
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Please make payment to the following account by <span className="font-medium">{formattedDate(invoice.dueDate)}</span>:
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Bank Name:</p>
                <p className="font-medium text-gray-900 dark:text-white">First International Bank</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Account Name:</p>
                <p className="font-medium text-gray-900 dark:text-white">Buy & Sell Club Ltd</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Account Number:</p>
                <p className="font-medium text-gray-900 dark:text-white">1234567890</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Reference:</p>
                <p className="font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Terms and Notes */}
      <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Terms & Notes</h3>
        <p>Payment is due within 7 days of invoice date. Late payments may be subject to a 5% late fee.</p>
        <p className="mt-2">Thank you for your business!</p>
      </div>

      {/* Actions */}
      {!printable && (
        <div className="flex justify-end space-x-2 pt-4 border-t dark:border-gray-700 no-print">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 flex items-center"
          >
            <FaPrint className="mr-2" />
            Print
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 flex items-center"
          >
            <FaDownload className="mr-2" />
            Download
          </button>
          <button
            onClick={handleEmailInvoice}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 flex items-center"
          >
            <FaEnvelope className="mr-2" />
            Email
          </button>
        </div>
      )}

      {/* Additional Notes */}
      {invoice.notes && (
        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Notes</h3>
          <p>{invoice.notes}</p>
        </div>
      )}
    </div>
  );
};

export default Invoice; 