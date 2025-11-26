import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaEye, FaCheck, FaTimes, FaFileInvoiceDollar, FaPrint, FaDownload, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import InvoiceModal from '../../components/InvoiceModal';
import Invoice from '../../components/Invoice';
import BulkActions from '../../components/shared/BulkActions';
import ConfirmModal from '../../components/shared/ConfirmModal';
import {
  getAdminBuy4meRequests,
  updateBuy4meRequestStatus,
  updateBuy4meRequestTracking,
  deleteAdminBuy4meRequest,
  createBuy4meRequestInvoice,
  updateBuy4meRequestInvoiceStatus,
} from '../../api';

const Buy4meAdmin = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceProductCostsRmb, setInvoiceProductCostsRmb] = useState([]);
  const [invoiceQuantities, setInvoiceQuantities] = useState([]);
  const [invoiceRmbToGhsRate, setInvoiceRmbToGhsRate] = useState('');
  const [invoiceShippingMethod, setInvoiceShippingMethod] = useState('sea');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPrintableInvoice, setShowPrintableInvoice] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  useEffect(() => {
    fetchBuy4meRequests();
  }, []);

  const fetchBuy4meRequests = async () => {
    try {
      setLoading(true);
      const response = await getAdminBuy4meRequests();
      const requestsData = Array.isArray(response.data) ? response.data : [];
      
      // Transform data to match frontend expectations
      const transformedRequests = requestsData.map(request => ({
        _id: request.id,
        id: request.id,
        title: request.title,
        description: request.description,
        userName: request.user_name || request.user_username || 'Unknown',
        status: request.status,
        tracking_status: request.tracking_status,
        link: request.product_url || '',
        product_url: request.product_url,
        additional_links: request.additional_links || [],
        images: request.images || [],
        quantity: request.quantity || 1,
        invoice: request.invoice,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
        ...request // Include all other fields
      }));
      
      setRequests(transformedRequests);
    } catch (error) {
      console.error('Error fetching Buy4me requests:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to fetch Buy4me requests';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
  };

  const handleCloseModal = () => {
    setSelectedRequest(null);
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      const response = await updateBuy4meRequestStatus(requestId, newStatus);
      const updatedRequest = response.data;
      
      // Transform response to match frontend expectations
      const transformedRequest = {
        _id: updatedRequest.id,
        id: updatedRequest.id,
        title: updatedRequest.title,
        description: updatedRequest.description,
        userName: updatedRequest.user_name || updatedRequest.user_username || 'Unknown',
        status: updatedRequest.status,
        tracking_status: updatedRequest.tracking_status,
        link: updatedRequest.product_url || '',
        product_url: updatedRequest.product_url,
        additional_links: updatedRequest.additional_links || [],
        images: updatedRequest.images || [],
        quantity: updatedRequest.quantity || 1,
        invoice: updatedRequest.invoice,
        createdAt: updatedRequest.created_at,
        updatedAt: updatedRequest.updated_at,
        ...updatedRequest
      };
      
      // Update local state with the response from server
      setRequests(requests.map(req => 
        req.id === requestId || req._id === requestId ? transformedRequest : req
      ));
      
      if (selectedRequest && (selectedRequest.id === requestId || selectedRequest._id === requestId)) {
        setSelectedRequest(transformedRequest);
      }
      
      toast.success(`Request status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating request status:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to update request status';
      toast.error(errorMessage);
    }
  };

  const handleDeleteRequest = (requestId) => {
    setDeleteTarget(requestId);
    setShowDeleteModal(true);
  };

  const confirmDeleteRequest = async () => {
    if (!deleteTarget) return;
    
    try {
      await deleteAdminBuy4meRequest(deleteTarget);

      // Update local state
      setRequests(requests.filter(req => (req.id !== deleteTarget && req._id !== deleteTarget)));
      
      if (selectedRequest && (selectedRequest.id === deleteTarget || selectedRequest._id === deleteTarget)) {
        setSelectedRequest(null);
      }
      
      toast.success('Request deleted successfully');
    } catch (error) {
      console.error('Error deleting request:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to delete request';
      toast.error(errorMessage);
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const handleCreateInvoice = async () => {
    // Validate required fields
    if (!invoiceProductCostsRmb || invoiceProductCostsRmb.length === 0 || !invoiceRmbToGhsRate) {
      toast.error('Please fill in all required fields (Product Costs in RMB for each product and GHS to RMB Rate)');
      return;
    }
    
    // Validate all costs are filled
    const hasEmptyCosts = invoiceProductCostsRmb.some(cost => !cost || cost === '');
    if (hasEmptyCosts) {
      toast.error('Please fill in the cost for all products');
      return;
    }
    
    // Validate quantities match costs array length
    if (invoiceQuantities.length !== invoiceProductCostsRmb.length) {
      toast.error('Please fill in quantities for all products');
      return;
    }
    
    // Validate quantities are non-negative
    const hasInvalidQuantities = invoiceQuantities.some(qty => qty < 0);
    if (hasInvalidQuantities) {
      toast.error('Quantities must be 0 or greater');
      return;
    }
    
    try {
      const requestId = selectedRequest.id || selectedRequest._id;
      
      // Use quantities from form state
      const quantities = invoiceQuantities.slice(0, invoiceProductCostsRmb.length).map(qty => qty || 0);
      
      const invoiceData = {
        product_costs_rmb: invoiceProductCostsRmb.map(cost => parseFloat(cost)),
        quantities: quantities, // Use quantities from form
        rmb_to_ghs_rate: parseFloat(invoiceRmbToGhsRate),
        shipping_method: invoiceShippingMethod,
        service_fee_percent: 5.0, // 5% service fee
      };
      const response = await createBuy4meRequestInvoice(requestId, invoiceData);
      const updatedRequest = response.data;
      
      // Transform response to match frontend expectations
      const transformedRequest = {
        _id: updatedRequest.id,
        id: updatedRequest.id,
        title: updatedRequest.title,
        description: updatedRequest.description,
        userName: updatedRequest.user_name || updatedRequest.user_username || 'Unknown',
        status: updatedRequest.status,
        tracking_status: updatedRequest.tracking_status,
        link: updatedRequest.product_url || '',
        product_url: updatedRequest.product_url,
        additional_links: updatedRequest.additional_links || [],
        images: updatedRequest.images || [],
        quantity: updatedRequest.quantity || 1,
        invoice: updatedRequest.invoice,
        createdAt: updatedRequest.created_at,
        updatedAt: updatedRequest.updated_at,
        ...updatedRequest
      };
      
      setRequests(requests.map(req => 
        (req.id === requestId || req._id === requestId) ? transformedRequest : req
      ));
      setSelectedRequest(transformedRequest);
      setShowInvoiceForm(false);
      setInvoiceAmount('');
      setShowInvoiceModal(true);
      toast.success('Invoice created successfully');
    } catch (error) {
      console.error('Error creating invoice:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to create invoice';
      toast.error(errorMessage);
    }
  };

  const handleUpdateInvoiceStatus = async (status) => {
    try {
      const requestId = selectedRequest.id || selectedRequest._id;
      const response = await updateBuy4meRequestInvoiceStatus(requestId, status);
      const updatedRequest = response.data;
      
      // Transform response to match frontend expectations
      const transformedRequest = {
        _id: updatedRequest.id,
        id: updatedRequest.id,
        title: updatedRequest.title,
        description: updatedRequest.description,
        userName: updatedRequest.user_name || updatedRequest.user_username || 'Unknown',
        status: updatedRequest.status,
        tracking_status: updatedRequest.tracking_status,
        link: updatedRequest.product_url || '',
        product_url: updatedRequest.product_url,
        additional_links: updatedRequest.additional_links || [],
        images: updatedRequest.images || [],
        quantity: updatedRequest.quantity || 1,
        invoice: updatedRequest.invoice,
        createdAt: updatedRequest.created_at,
        updatedAt: updatedRequest.updated_at,
        ...updatedRequest
      };
      
      setRequests(requests.map(req => 
        (req.id === requestId || req._id === requestId) ? transformedRequest : req
      ));
      setSelectedRequest(transformedRequest);
      toast.success('Invoice status updated successfully');
    } catch (error) {
      console.error('Error updating invoice status:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to update invoice status';
      toast.error(errorMessage);
    }
  };

  const filteredRequests = requests
    .filter(request => statusFilter === 'all' || request.status === statusFilter)
    .filter(request => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (request.title || '').toLowerCase().includes(searchLower) ||
        (request.description || '').toLowerCase().includes(searchLower) ||
        (request.userName || '').toLowerCase().includes(searchLower) ||
        String(request.id || request._id || '').includes(searchTerm)
      );
    });

  // Bulk actions handlers
  const handleSelectRequest = (requestId) => {
    setSelectedRequests((prev) =>
      prev.includes(requestId)
        ? prev.filter((id) => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(filteredRequests.map((req) => req.id || req._id));
    }
    setSelectAll(!selectAll);
  };

  useEffect(() => {
    setSelectAll(selectedRequests.length === filteredRequests.length && filteredRequests.length > 0);
  }, [selectedRequests, filteredRequests]);

  const handleBulkDelete = (selectedIds) => {
    if (selectedIds.length === 0) return;
    setDeleteTarget('selected');
    setShowBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedRequests.length === 0) return;
    
    try {
      const deletePromises = selectedRequests.map((id) => deleteAdminBuy4meRequest(id));
      await Promise.all(deletePromises);
      toast.success(`${selectedRequests.length} request(s) deleted successfully`);
      setSelectedRequests([]);
      fetchBuy4meRequests();
    } catch (error) {
      console.error('Error bulk deleting requests:', error);
      toast.error('Failed to delete some requests');
    } finally {
      setShowBulkDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const handleBulkUpdateStatus = async (selectedIds, newStatus) => {
    try {
      const updatePromises = selectedIds.map((id) => updateBuy4meRequestStatus(id, newStatus));
      await Promise.all(updatePromises);
      toast.success(`${selectedIds.length} request(s) status updated successfully`);
      setSelectedRequests([]);
      fetchBuy4meRequests();
    } catch (error) {
      console.error('Error bulk updating status:', error);
      toast.error('Failed to update some requests');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const handleViewInvoice = (request) => {
    setSelectedRequest(request);
    setShowInvoiceModal(true);
  };

  const handlePrintInvoice = () => {
    setShowPrintableInvoice(true);
    setTimeout(() => {
      window.print();
      setShowPrintableInvoice(false);
    }, 300);
  };

  if (showPrintableInvoice) {
    return (
      <div className="print-container">
        <Invoice invoice={selectedRequest?.invoice} request={selectedRequest} printable={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Buy4ME Requests Management</h2>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage customer product purchase requests
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
            
            <button
              onClick={fetchBuy4meRequests}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Refresh
            </button>
          </div>
          
          <div className="w-full sm:w-auto mt-2 sm:mt-0">
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        <BulkActions
          selectedItems={selectedRequests}
          onBulkDelete={() => handleBulkDelete(selectedRequests)}
          onBulkUpdateStatus={handleBulkUpdateStatus}
          availableStatuses={[
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'processing', label: 'Processing' },
            { value: 'completed', label: 'Completed' },
            { value: 'rejected', label: 'Rejected' },
          ]}
          showDelete={true}
          showStatusUpdate={true}
        />

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tracking
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Invoice
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No Buy4me requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map(request => (
                  <tr key={request.id || request._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRequests.includes(request.id || request._id)}
                        onChange={() => handleSelectRequest(request.id || request._id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{request.title || 'N/A'}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {request.description && request.description.length > 50 
                          ? `${request.description.substring(0, 50)}...` 
                          : (request.description || 'No description')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{request.userName || 'Unknown'}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(request.status)}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {request.tracking_status ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {request.tracking_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          Not Started
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {request.invoice ? (
                        <button
                          onClick={() => handleViewInvoice(request)}
                          className="flex items-center text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                        >
                          <FaFileInvoiceDollar className="mr-1" />
                          {request.invoice.invoiceNumber}
                          <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            request.invoice.status === 'paid' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : request.invoice.status === 'cancelled'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          }`}>
                            {request.invoice.status.charAt(0).toUpperCase() + request.invoice.status.slice(1)}
                          </span>
                        </button>
                      ) : request.status === 'approved' ? (
                        <button
                          onClick={() => {
                            handleViewRequest(request);
                            setShowInvoiceForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm flex items-center"
                        >
                          <FaFileInvoiceDollar className="mr-1" />
                          Create Invoice
                        </button>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {request.status === 'pending' ? 'Pending Approval' : 'Not Available'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewRequest(request)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                        title="View Request"
                      >
                        <FaEye />
                      </button>
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(request.id || request._id, 'approved')}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-3"
                            title="Approve"
                          >
                            <FaCheck />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(request.id || request._id, 'rejected')}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 mr-3"
                            title="Reject"
                          >
                            <FaTimes />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteRequest(request.id || request._id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Request Details
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Customer</h4>
                  <p className="text-gray-900 dark:text-white font-medium">{selectedRequest.userName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</h4>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(selectedRequest.status)}`}>
                    {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Tracking Status</h4>
                  {selectedRequest.tracking_status ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {selectedRequest.tracking_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      Not Started
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Created At</h4>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(selectedRequest.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Last Updated</h4>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(selectedRequest.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Product Title</h4>
                  <p className="text-gray-900 dark:text-white font-medium">{selectedRequest.title}</p>
                </div>
                <div className="md:col-span-2">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h4>
                  <p className="text-gray-900 dark:text-white">{selectedRequest.description}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Quantity</h4>
                  <p className="text-gray-900 dark:text-white">{selectedRequest.quantity}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Product Link</h4>
                  <a 
                    href={selectedRequest.link || selectedRequest.product_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 break-all"
                  >
                    {selectedRequest.link || selectedRequest.product_url || 'N/A'}
                  </a>
                </div>
                {selectedRequest.additional_links && selectedRequest.additional_links.length > 0 && (
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Additional Links</h4>
                    <div className="space-y-2">
                      {selectedRequest.additional_links.map((link, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <a 
                            href={typeof link === 'string' ? link : link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 break-all text-sm"
                          >
                            {typeof link === 'string' ? link : link.url}
                          </a>
                          {typeof link === 'object' && link.quantity && (
                            <span className="text-xs text-gray-500">(Qty: {link.quantity})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedRequest.images && selectedRequest.images.length > 0 && (
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Product Images</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {selectedRequest.images.map((image, index) => (
                        image && (
                          <div key={index} className="h-40 border dark:border-gray-700 rounded-lg overflow-hidden">
                            <img 
                              src={image} 
                              alt={`Product image ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://via.placeholder.com/150?text=Image+Not+Found';
                              }}
                            />
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Tracking Status Management */}
              {(selectedRequest.status === 'approved' || selectedRequest.status === 'processing') && (
                <div className="mt-6 border-t dark:border-gray-700 pt-6">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tracking Status</h4>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <label htmlFor="trackingStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Update Tracking Status
                    </label>
                    <select
                      id="trackingStatus"
                      value={selectedRequest.tracking_status || ''}
                      onChange={async (e) => {
                        const newTrackingStatus = e.target.value;
                        if (newTrackingStatus) {
                          try {
                            const requestId = selectedRequest.id || selectedRequest._id;
                            const response = await updateBuy4meRequestTracking(requestId, newTrackingStatus);
                            const updatedRequest = response.data;
                            const transformedRequest = {
                              _id: updatedRequest.id,
                              id: updatedRequest.id,
                              title: updatedRequest.title,
                              description: updatedRequest.description,
                              userName: updatedRequest.user_name || updatedRequest.user_username || 'Unknown',
                              status: updatedRequest.status,
                              tracking_status: updatedRequest.tracking_status,
                              link: updatedRequest.product_url || '',
                              images: updatedRequest.images || [],
                              quantity: updatedRequest.quantity || 1,
                              invoice: updatedRequest.invoice,
                              createdAt: updatedRequest.created_at,
                              updatedAt: updatedRequest.updated_at,
                              ...updatedRequest
                            };
                            setRequests(requests.map(req => 
                              (req.id === requestId || req._id === requestId) ? transformedRequest : req
                            ));
                            setSelectedRequest(transformedRequest);
                            toast.success('Tracking status updated successfully');
                          } catch (error) {
                            console.error('Error updating tracking status:', error);
                            const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to update tracking status';
                            toast.error(errorMessage);
                          }
                        }
                      }}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    >
                      <option value="">Select Tracking Status</option>
                      <option value="sourcing">Sourcing</option>
                      <option value="buying">Buying</option>
                      <option value="sent_to_warehouse">Sent to Warehouse</option>
                      <option value="shipped">Shipped</option>
                      <option value="at_the_port">At the Port</option>
                      <option value="off_loading">Off Loading</option>
                      <option value="pickup">Pickup</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedRequest.status === 'approved' && (
                <div className="mt-6 border-t dark:border-gray-700 pt-6">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Invoice Management</h4>
                  
                  {!selectedRequest.invoice ? (
                    <>
                      {showInvoiceForm && (() => {
                        // Calculate number of products: 1 main product + additional links
                        const additionalLinksCount = selectedRequest?.additional_links?.length || 0;
                        const totalProducts = 1 + additionalLinksCount;
                        
                        // Initialize costs and quantities arrays if not already set or if product count changed
                        if (invoiceProductCostsRmb.length !== totalProducts) {
                          setInvoiceProductCostsRmb(new Array(totalProducts).fill(''));
                        }
                        if (invoiceQuantities.length !== totalProducts) {
                          // Initialize all quantities to 0 - all products are independent
                          setInvoiceQuantities(new Array(totalProducts).fill(0));
                        }
                        
                        return (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <h5 className="text-md font-medium text-gray-900 dark:text-white mb-3">Create New Invoice</h5>
                          <div className="space-y-4">
                            {/* Product Cost Fields - One for each product */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Product Costs (RMB) <span className="text-red-500">*</span>
                              </label>
                              <div className="space-y-3">
                                {/* Main Product Cost */}
                                <div>
                                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    Product 1
                                  </label>
                                  <div className="flex gap-2">
                                    <div className="flex-1 flex rounded-md shadow-sm">
                                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400">
                                        ¥
                                      </span>
                                      <input
                                        type="number"
                                        value={invoiceProductCostsRmb[0] || ''}
                                        onChange={(e) => {
                                          const newCosts = [...invoiceProductCostsRmb];
                                          newCosts[0] = e.target.value;
                                          setInvoiceProductCostsRmb(newCosts);
                                        }}
                                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        required
                                      />
                                    </div>
                                    <div className="flex items-center">
                                      <label className="sr-only">Quantity</label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={invoiceQuantities[0] || 0}
                                        onChange={(e) => {
                                          const newQuantities = [...invoiceQuantities];
                                          newQuantities[0] = parseInt(e.target.value) || 0;
                                          setInvoiceQuantities(newQuantities);
                                        }}
                                        className="w-20 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                                        placeholder="Qty"
                                      />
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Additional Products Costs */}
                                {selectedRequest?.additional_links?.map((link, index) => {
                                  const productIndex = index + 1;
                                  const linkUrl = typeof link === 'string' ? link : link.url;
                                  
                                  return (
                                    <div key={index}>
                                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                        Product {productIndex + 1}: {linkUrl.substring(0, 50)}{linkUrl.length > 50 ? '...' : ''}
                                      </label>
                                      <div className="flex gap-2">
                                        <div className="flex-1 flex rounded-md shadow-sm">
                                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400">
                                            ¥
                                          </span>
                                          <input
                                            type="number"
                                            value={invoiceProductCostsRmb[productIndex] || ''}
                                            onChange={(e) => {
                                              const newCosts = [...invoiceProductCostsRmb];
                                              newCosts[productIndex] = e.target.value;
                                              setInvoiceProductCostsRmb(newCosts);
                                            }}
                                            className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                            required
                                          />
                                        </div>
                                        <div className="flex items-center">
                                          <label className="sr-only">Quantity</label>
                                          <input
                                            type="number"
                                            min="0"
                                            value={invoiceQuantities[productIndex] || 0}
                                            onChange={(e) => {
                                              const newQuantities = [...invoiceQuantities];
                                              newQuantities[productIndex] = parseInt(e.target.value) || 0;
                                              setInvoiceQuantities(newQuantities);
                                            }}
                                            className="w-20 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                                            placeholder="Qty"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div>
                              <label htmlFor="invoiceRmbToGhsRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                GHS to RMB Conversion Rate <span className="text-red-500">*</span>
                              </label>
                              <div className="mt-1 flex rounded-md shadow-sm">
                                <input
                                  type="number"
                                  id="invoiceRmbToGhsRate"
                                  value={invoiceRmbToGhsRate}
                                  onChange={(e) => setInvoiceRmbToGhsRate(e.target.value)}
                                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                  placeholder="0.0000"
                                  min="0"
                                  step="0.0001"
                                  required
                                />
                              </div>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Rate: 1 GHS = {invoiceRmbToGhsRate || '0'} RMB (GHS ÷ Rate = RMB converted to GHS)
                              </p>
                            </div>
                            <div>
                              <label htmlFor="invoiceShippingMethod" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Shipping Method <span className="text-red-500">*</span>
                              </label>
                              <select
                                id="invoiceShippingMethod"
                                value={invoiceShippingMethod}
                                onChange={(e) => setInvoiceShippingMethod(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                required
                              >
                                <option value="sea">Sea Shipping</option>
                                <option value="air">Air Shipping</option>
                              </select>
                            </div>
                            {invoiceProductCostsRmb.length > 0 && invoiceRmbToGhsRate && (() => {
                              // Calculate total from all product costs multiplied by quantities from form
                              let totalCostRmb = 0;
                              const productCostsWithQty = invoiceProductCostsRmb.map((cost, index) => {
                                const qty = invoiceQuantities[index] || 0;
                                const costPerUnit = parseFloat(cost || 0);
                                const totalCostForProduct = costPerUnit * qty;
                                totalCostRmb += totalCostForProduct;
                                return { cost: costPerUnit, qty, total: totalCostForProduct };
                              });
                              
                              const totalCostGhs = totalCostRmb / parseFloat(invoiceRmbToGhsRate || 1);
                              const serviceFeeGhs = totalCostGhs * 0.05;
                              const totalGhs = totalCostGhs + serviceFeeGhs;
                              
                              return (
                              <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Invoice Calculation:</p>
                                <div className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
                                  {productCostsWithQty.map((item, index) => (
                                    <div key={index} className="flex justify-between text-xs">
                                      <span>Product {index + 1} (¥{item.cost.toFixed(2)} × {item.qty}):</span>
                                      <span>¥{item.total.toFixed(2)}</span>
                                    </div>
                                  ))}
                                  <div className="flex justify-between font-medium border-t border-blue-200 dark:border-blue-700 pt-1 mt-1">
                                    <span>Total Product Cost (RMB):</span>
                                    <span>¥{totalCostRmb.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Total Product Cost (GHS):</span>
                                    <span>₵{totalCostGhs.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Service Fee (5%):</span>
                                    <span>₵{serviceFeeGhs.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between font-bold border-t border-blue-200 dark:border-blue-700 pt-1 mt-1">
                                    <span>Total Amount (GHS):</span>
                                    <span>₵{totalGhs.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                              );
                            })()}
                            <div className="flex gap-2">
                              <button
                                onClick={handleCreateInvoice}
                                disabled={
                                  !invoiceProductCostsRmb || 
                                  invoiceProductCostsRmb.length === 0 || 
                                  !invoiceRmbToGhsRate || 
                                  invoiceProductCostsRmb.some(cost => !cost || parseFloat(cost) <= 0) ||
                                  invoiceQuantities.length !== invoiceProductCostsRmb.length ||
                                  invoiceQuantities.some(qty => qty < 0) ||
                                  parseFloat(invoiceRmbToGhsRate) <= 0
                                }
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                              >
                                <FaFileInvoiceDollar className="mr-2" />
                                Create Invoice
                              </button>
                              <button
                                onClick={() => {
                                  setShowInvoiceForm(false);
                                  setInvoiceAmount('');
                                  setInvoiceProductCostsRmb([]);
                                  setInvoiceQuantities([]);
                                  setInvoiceRmbToGhsRate('');
                                  setInvoiceShippingMethod('sea');
                                }}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h5 className="text-md font-medium text-gray-900 dark:text-white">Invoice Details</h5>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setShowInvoiceModal(true)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                          >
                            <FaEye className="mr-1" />
                            View
                          </button>
                          <button
                            onClick={handlePrintInvoice}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            <FaPrint className="mr-1" />
                            Print
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Invoice Number</p>
                          <p className="text-sm text-gray-900 dark:text-white">{selectedRequest.invoice.invoiceNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Amount</p>
                          <p className="text-sm text-gray-900 dark:text-white font-semibold">
                            ₵{(selectedRequest.invoice.totalGhs || selectedRequest.invoice.amount || 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            selectedRequest.invoice.status === 'paid'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : selectedRequest.invoice.status === 'cancelled'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          }`}>
                            {selectedRequest.invoice.status.charAt(0).toUpperCase() + selectedRequest.invoice.status.slice(1)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Shipping Method</p>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {selectedRequest.invoice.shippingMethod 
                              ? (selectedRequest.invoice.shippingMethod === 'sea' ? 'Sea Shipping' : 'Air Shipping')
                              : 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">RMB to GHS Rate</p>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {selectedRequest.invoice.rmbToGhsRate 
                              ? `1 GHS = ${parseFloat(selectedRequest.invoice.rmbToGhsRate).toFixed(4)} RMB`
                              : 'Not set'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Service Fee</p>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {selectedRequest.invoice.serviceFeePercent || 5}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</p>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {new Date(selectedRequest.invoice.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Detailed Invoice Breakdown */}
                      {(() => {
                        // Calculate values once to ensure consistency
                        const productCostsRmb = selectedRequest.invoice.productCostsRmb || [];
                        
                        // Get quantities from invoice (stored in backend)
                        const productQuantities = selectedRequest.invoice.productQuantities || [];
                        
                        // Calculate total product cost by multiplying each cost by its quantity from invoice
                        const totalProductCostRmb = selectedRequest.invoice.totalProductCostRmb || 
                          (productCostsRmb.length > 0 
                            ? productCostsRmb.reduce((sum, cost, index) => {
                                const qty = productQuantities[index] || 0;
                                return sum + (parseFloat(cost || 0) * qty);
                              }, 0)
                            : 0);
                        
                        const rmbToGhsRate = parseFloat(selectedRequest.invoice.rmbToGhsRate || 1);
                        const serviceFeePercent = selectedRequest.invoice.serviceFeePercent || 5;
                        
                        const totalProductCostGhs = totalProductCostRmb > 0 && rmbToGhsRate > 0 ? totalProductCostRmb / rmbToGhsRate : 0;
                        const serviceFeeGhs = totalProductCostGhs > 0 ? totalProductCostGhs * (serviceFeePercent / 100) : 0;
                        const totalAmountGhs = totalProductCostGhs + serviceFeeGhs;
                        const storedTotal = selectedRequest.invoice.totalGhs || selectedRequest.invoice.amount || 0;
                        
                        return (
                        <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 mb-4 border border-blue-200 dark:border-blue-700">
                          <h6 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">Invoice Breakdown</h6>
                          <div className="space-y-3 text-sm">
                            {/* Product Cost (GHS) */}
                            {totalProductCostGhs > 0 ? (
                              <div className="flex justify-between items-center text-blue-900 dark:text-blue-200">
                                <span className="font-medium">Product Cost:</span>
                                <span className="text-lg font-semibold">₵{totalProductCostGhs.toFixed(2)}</span>
                              </div>
                            ) : storedTotal > 0 && (
                              <div className="flex justify-between items-center text-blue-900 dark:text-blue-200">
                                <span className="font-medium">Product Cost:</span>
                                <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">Not available</span>
                              </div>
                            )}
                            
                            {/* Service Fee (5%) */}
                            {serviceFeeGhs > 0 ? (
                              <div className="flex justify-between items-center text-blue-800 dark:text-blue-300">
                                <span className="font-medium">Service Fee ({serviceFeePercent}%):</span>
                                <span className="text-lg font-semibold">₵{serviceFeeGhs.toFixed(2)}</span>
                              </div>
                            ) : storedTotal > 0 && (
                              <div className="flex justify-between items-center text-blue-800 dark:text-blue-300">
                                <span className="font-medium">Service Fee ({serviceFeePercent}%):</span>
                                <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">Not available</span>
                              </div>
                            )}
                            
                            {/* Total Amount */}
                            <div className="flex justify-between items-center font-bold border-t-2 border-blue-300 dark:border-blue-600 pt-3 mt-3 text-blue-900 dark:text-blue-200">
                              <span className="text-base">Total Amount:</span>
                              <span className="text-xl">₵{(storedTotal || totalAmountGhs || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        );
                      })()}

                      <div className="border-t dark:border-gray-600 pt-4 mt-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Update Invoice Status</p>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdateInvoiceStatus('paid')}
                            disabled={selectedRequest.invoice.status === 'paid'}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                              selectedRequest.invoice.status === 'paid'
                                ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                                : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800'
                            }`}
                          >
                            Mark as Paid
                          </button>
                          <button
                            onClick={() => handleUpdateInvoiceStatus('pending')}
                            disabled={selectedRequest.invoice.status === 'pending'}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                              selectedRequest.invoice.status === 'pending'
                                ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-800'
                            }`}
                          >
                            Mark as Pending
                          </button>
                          <button
                            onClick={() => handleUpdateInvoiceStatus('cancelled')}
                            disabled={selectedRequest.invoice.status === 'cancelled'}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                              selectedRequest.invoice.status === 'cancelled'
                                ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                                : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800'
                            }`}
                          >
                            Mark as Cancelled
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3 justify-end">
                {selectedRequest.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleUpdateStatus(selectedRequest.id, 'approved');
                        handleCloseModal();
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Approve Request
                    </button>
                    <button
                      onClick={() => {
                        handleUpdateStatus(selectedRequest.id, 'rejected');
                        handleCloseModal();
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Reject Request
                    </button>
                  </>
                )}
                {selectedRequest.status === 'approved' && (
                  <button
                    onClick={() => {
                      handleUpdateStatus(selectedRequest.id, 'completed');
                      handleCloseModal();
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Mark as Completed
                  </button>
                )}
                <button
                  onClick={handleCloseModal}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <InvoiceModal 
        isOpen={showInvoiceModal} 
        onClose={() => setShowInvoiceModal(false)} 
        invoice={selectedRequest?.invoice} 
        request={selectedRequest} 
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDeleteRequest}
        title="Delete Buy4ME Request"
        message="Are you sure you want to delete this request? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => {
          setShowBulkDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmBulkDelete}
        title="Delete Buy4ME Requests"
        message={`Are you sure you want to delete ${selectedRequests.length} request${selectedRequests.length > 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default Buy4meAdmin;