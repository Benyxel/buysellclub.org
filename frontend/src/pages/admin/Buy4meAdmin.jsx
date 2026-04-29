import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaEye, FaCheck, FaTimes, FaFileInvoiceDollar, FaPrint, FaDownload, FaSpinner, FaChevronLeft, FaChevronRight, FaCog, FaPlus, FaSearch } from 'react-icons/fa';
import { toast } from '../../utils/toast';
import InvoiceModal from '../../components/InvoiceModal';
import Invoice from '../../components/Invoice';
import BulkActions from '../../components/shared/BulkActions';
import ConfirmModal from '../../components/shared/ConfirmModal';
import {
  getAdminBuy4meRequests,
  getAdminBuy4meRequest,
  updateBuy4meRequestStatus,
  updateBuy4meRequestTracking,
  deleteAdminBuy4meRequest,
  createBuy4meRequestInvoice,
  editBuy4meRequestInvoice,
  updateBuy4meRequestInvoiceStatus,
  createBuy4meInvoiceForClient,
  getBuy4meSettings,
  updateBuy4meSettings,
  downloadBuy4meInvoiceReceipt,
} from '../../api';
import API from '../../api';

const Buy4meAdmin = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState("all"); // all | need_invoice
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceProductCostsRmb, setInvoiceProductCostsRmb] = useState([]);
  const [invoiceQuantities, setInvoiceQuantities] = useState([]);
  const [invoiceRmbToGhsRate, setInvoiceRmbToGhsRate] = useState('');
  const [invoiceShippingMethod, setInvoiceShippingMethod] = useState('sea');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPrintableInvoice, setShowPrintableInvoice] = useState(false);
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [previewProof, setPreviewProof] = useState('');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  
  // Settings state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [defaultSourcingPayment, setDefaultSourcingPayment] = useState(0);
  const [settingsNotes, setSettingsNotes] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Create invoice for client (admin) – same pattern as Alipay: email lookup auto-fills name/contact
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [createInvoiceForm, setCreateInvoiceForm] = useState({
    client_email: '',
    client_name: '',
    client_contact: '',
    title: '',
    product_costs_rmb: [''],
    quantities: [1],
    rmb_to_ghs_rate: '',
    shipping_method: 'sea',
    service_fee_percent: 5,
  });
  const [createInvoiceLookupLoading, setCreateInvoiceLookupLoading] = useState(false);
  const [createInvoiceSubmitting, setCreateInvoiceSubmitting] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [allRequests, setAllRequests] = useState(null); // used for cross-page quick filters

  const fetchAllBuy4meRequests = async (size = 200) => {
    try {
      setLoading(true);
      const firstParams = { page: 1, page_size: size || 200 };
      if (invoiceFilter && invoiceFilter !== "all") {
        firstParams.invoice_status = invoiceFilter;
      }
      const firstResp = await getAdminBuy4meRequests(firstParams);
      if (!(firstResp?.data && typeof firstResp.data === "object" && "results" in firstResp.data)) {
        // If backend doesn't paginate here, fall back to single fetch handler.
        await fetchBuy4meRequests(1, pageSize);
        return;
      }

      const count = firstResp.data.count || 0;
      const results1 = Array.isArray(firstResp.data.results) ? firstResp.data.results : [];
      let merged = [...results1];

      const totalPagesToFetch = Math.max(1, Math.ceil(count / (size || 200)));
      for (let p = 2; p <= totalPagesToFetch; p += 1) {
        const params = { page: p, page_size: size || 200 };
        if (invoiceFilter && invoiceFilter !== "all") {
          params.invoice_status = invoiceFilter;
        }
        const resp = await getAdminBuy4meRequests(params);
        const pageResults = Array.isArray(resp?.data?.results) ? resp.data.results : [];
        merged = merged.concat(pageResults);
        if (pageResults.length === 0) break;
      }

      const transformed = merged.map(transformRequest);
      setAllRequests(transformed);
    } catch (error) {
      console.error("Error fetching all Buy4me requests:", error);
      const status = error.response?.status;
      if (status && status >= 400) {
        const errorMessage =
          error.response?.data?.error ||
          error.response?.data?.detail ||
          error.message ||
          "Failed to fetch Buy4me requests";
        toast.error(errorMessage, { toastId: "fetch-buy4me-error" });
      }
      setAllRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (quickFilter === "all") {
      setAllRequests(null);
      fetchBuy4meRequests(currentPage, pageSize);
    } else {
      // Cross-page quick filters need the full dataset.
      fetchAllBuy4meRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, invoiceFilter, quickFilter]);

  // Build product list for invoice: additional_links (incl. image-only slots), or main product, or one row per image when no links
  const getProductsForInvoice = (request) => {
    if (!request) return [];
    const additional = request.additional_links || [];
    const mainUrl = request.product_url || request.link || null;
    const mainQty = request.quantity ?? 1;
    if (additional.length > 0) {
      return additional.map((link) =>
        typeof link === 'string'
          ? { url: link, quantity: 1 }
          : { url: link?.url ?? '', quantity: link?.quantity ?? 1 }
      );
    }
    if (mainUrl) return [{ url: mainUrl, quantity: mainQty }];
    const images = request.images || [];
    if (images.length > 0) {
      const qtyEach = Math.max(1, Math.floor(mainQty / images.length));
      return Array.from({ length: images.length }, (_, i) =>
        i === images.length - 1 && mainQty > 0
          ? { url: '', quantity: Math.max(1, mainQty - (images.length - 1) * qtyEach) }
          : { url: '', quantity: qtyEach }
      );
    }
    return [];
  };

  // When invoice form is shown, initialize product cost/quantity arrays to match request products (avoid setState during render)
  useEffect(() => {
    if (!showInvoiceForm || !selectedRequest) return;
    if (isEditingInvoice && selectedRequest.invoice) {
      const costs = selectedRequest.invoice_product_costs_rmb ?? selectedRequest.invoice.productCostsRmb ?? [];
      const qty = selectedRequest.invoice_product_quantities ?? selectedRequest.invoice.productQuantities ?? [];
      const rate = selectedRequest.invoice_rmb_to_ghs_rate ?? selectedRequest.invoice.rmbToGhsRate ?? '';
      setInvoiceProductCostsRmb(Array.isArray(costs) && costs.length ? costs.map((c) => String(c ?? '')) : ['']);
      setInvoiceQuantities(Array.isArray(qty) && qty.length ? qty.map((q) => (typeof q === 'number' ? q : parseInt(q, 10) || 1)) : [1]);
      setInvoiceRmbToGhsRate(rate ? String(rate) : '');
      return;
    }
    const products = getProductsForInvoice(selectedRequest);
    const totalProducts = Math.max(products.length, 1);
    const paddedProducts =
      products.length >= totalProducts
        ? products
        : [...products, ...Array.from({ length: totalProducts - products.length }, () => ({ url: '', quantity: 1 }))];
    setInvoiceProductCostsRmb((prev) =>
      prev.length === totalProducts ? prev : new Array(totalProducts).fill('')
    );
    setInvoiceQuantities((prev) =>
      prev.length === totalProducts ? prev : paddedProducts.map((p) => (typeof p === 'object' && p.quantity != null ? p.quantity : 1))
    );
  }, [showInvoiceForm, selectedRequest?.id, isEditingInvoice, selectedRequest?.additional_links, selectedRequest?.product_url, selectedRequest?.link, selectedRequest?.quantity, selectedRequest?.images, selectedRequest?.invoice, selectedRequest?.invoice_product_costs_rmb, selectedRequest?.invoice_product_quantities, selectedRequest?.invoice_rmb_to_ghs_rate]);

  const transformRequest = (request) => {
    const invoiceFromList =
      request.invoice ||
      (request.invoice_created || request.invoice_number
        ? {
            invoiceNumber: request.invoice_number,
            status: request.invoice_status || "pending",
            amount: request.invoice_amount || 0,
            totalGhs: request.invoice_total_ghs || 0,
          }
        : null);

    return {
      _id: request.id,
      id: request.id,
      title: request.title,
      description: request.description,
      userName: request.user_name || request.user_username || 'Unknown',
      status: request.status,
      tracking_status: request.tracking_status,
      sourcing_fee_paid: request.sourcing_fee_paid || false,
      link: request.product_url || '',
      product_url: request.product_url,
      additional_links: request.additional_links || [],
      images: request.images || [],
      quantity: request.quantity || 1,
      invoice: invoiceFromList,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
      ...request
    };
  };

  const fetchBuy4meRequests = async (page = currentPage, size = pageSize) => {
    // Always fetch fresh data from server
    try {
      setLoading(true);
      const params = { page: page || 1, page_size: size || 10 };
      if (invoiceFilter && invoiceFilter !== 'all') {
        params.invoice_status = invoiceFilter;
      }
      const response = await getAdminBuy4meRequests(params);
      
      // Handle both array and paginated response
      let requestsData = [];
      if (response.data && typeof response.data === 'object' && 'results' in response.data) {
        // Paginated response
        requestsData = response.data.results || [];
        setTotal(response.data.count || 0);
      } else if (Array.isArray(response.data)) {
        // Non-paginated array response (fallback)
        requestsData = response.data;
        setTotal(response.data.length);
      } else {
        requestsData = [];
        setTotal(0);
      }
      
      // Transform data to match frontend expectations
      const transformedRequests = requestsData.map(transformRequest);
      
      setRequests(transformedRequests);
    } catch (error) {
      console.error('Error fetching Buy4me requests:', error);
      // Only show error for actual failures (4xx/5xx), not for empty data
      const status = error.response?.status;
      if (status && status >= 400) {
        const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to fetch Buy4me requests';
        toast.error(errorMessage, { toastId: "fetch-buy4me-error" });
      }
      // Set empty array on any error to prevent UI crashes
      setRequests([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = async (request) => {
    setSelectedRequest(request);

    const requestId = request?.id || request?._id;
    if (!requestId) return;

    try {
      const response = await getAdminBuy4meRequest(requestId, {
        includeMedia: true,
      });
      const updatedRequest = response?.data || {};
      const transformedRequest = transformRequest(updatedRequest);
      setSelectedRequest(transformedRequest);
    } catch (error) {
      console.error('Error fetching Buy4me request details:', error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        'Failed to load request details';
      toast.error(errorMessage, { toastId: "buy4me-detail-error" });
    }
  };

  const handleCloseModal = () => {
    setSelectedRequest(null);
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      const response = await updateBuy4meRequestStatus(requestId, newStatus);
      const updatedRequest = response.data;
      
      // Transform response to match frontend expectations
      const transformedRequest = transformRequest(updatedRequest);
      
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

      // Update local state immediately without refresh
      setRequests((prevRequests) => 
        prevRequests.filter(req => (req.id !== deleteTarget && req._id !== deleteTarget))
      );
      setTotal((prevTotal) => {
        const nextTotal = Math.max(0, prevTotal - 1);
        if (currentPage > 1 && nextTotal <= (currentPage - 1) * pageSize) {
          setCurrentPage(currentPage - 1);
        }
        return nextTotal;
      });
      
      // Refresh data from server to ensure consistency
      fetchBuy4meRequests(currentPage, pageSize);
      
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
      const quantities = invoiceQuantities.slice(0, invoiceProductCostsRmb.length).map(qty => qty || 0);
      const invoiceData = {
        product_costs_rmb: invoiceProductCostsRmb.map(cost => parseFloat(cost)),
        quantities,
        rmb_to_ghs_rate: parseFloat(invoiceRmbToGhsRate),
        shipping_method: isEditingInvoice ? invoiceShippingMethod : (selectedRequest?.invoice_shipping_method || selectedRequest?.invoice?.shippingMethod || 'sea'),
        service_fee_percent: 5.0,
      };
      const response = isEditingInvoice
        ? await editBuy4meRequestInvoice(requestId, invoiceData)
        : await createBuy4meRequestInvoice(requestId, invoiceData);
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
      setIsEditingInvoice(false);
      setShowInvoiceModal(true);
      toast.success(isEditingInvoice ? 'Invoice updated successfully' : 'Invoice created successfully');
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

  /** Open edit-invoice form and load previous invoice items (rate, quantities, costs) from the request. */
  const handleOpenEditInvoice = async () => {
    const requestId = selectedRequest?.id || selectedRequest?._id;
    if (!requestId) return;
    try {
      const response = await getAdminBuy4meRequest(requestId, { includeMedia: true });
      const raw = response?.data || {};
      const req = transformRequest(raw);
      setSelectedRequest(req);

      const costs = raw.invoice_product_costs_rmb ?? req.invoice?.productCostsRmb ?? req.invoice_product_costs_rmb ?? [];
      const qty = raw.invoice_product_quantities ?? req.invoice?.productQuantities ?? req.invoice_product_quantities ?? [];
      const rate = raw.invoice_rmb_to_ghs_rate ?? req.invoice?.rmbToGhsRate ?? req.invoice_rmb_to_ghs_rate ?? '';

      const costStrings = Array.isArray(costs) && costs.length
        ? costs.map((c) => String(c ?? ''))
        : [''];
      const quantities = Array.isArray(qty) && qty.length
        ? qty.map((q) => (typeof q === 'number' ? q : parseInt(q, 10) || 1))
        : [1];
      const rateStr = rate !== undefined && rate !== null && rate !== '' ? String(rate) : '';
      const shipping = raw.invoice_shipping_method ?? req.invoice?.shippingMethod ?? req.invoice_shipping_method ?? 'sea';

      setInvoiceProductCostsRmb(costStrings);
      setInvoiceQuantities(quantities);
      setInvoiceRmbToGhsRate(rateStr);
      setInvoiceShippingMethod(shipping === 'air' ? 'air' : 'sea');
      setIsEditingInvoice(true);
      setShowInvoiceForm(true);
    } catch (err) {
      console.error('Error loading invoice for edit:', err);
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to load invoice details');
    }
  };

  // Settings handlers
  const handleOpenSettings = async () => {
    setLoadingSettings(true);
    try {
      const response = await getBuy4meSettings();
      if (response.data) {
        setDefaultSourcingPayment(response.data.defaultSourcingPayment ?? 0);
        setSettingsNotes(response.data.notes || '');
      }
      setShowSettingsModal(true);
    } catch (error) {
      console.error('Error fetching buy4me settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!defaultSourcingPayment || defaultSourcingPayment <= 0) {
      toast.error('Default sourcing payment must be greater than 0');
      return;
    }

    setSavingSettings(true);
    try {
      await updateBuy4meSettings({
        defaultSourcingPayment: parseFloat(defaultSourcingPayment),
        notes: settingsNotes,
      });
      toast.success('Settings updated successfully');
      setShowSettingsModal(false);
    } catch (error) {
      console.error('Error updating buy4me settings:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update settings';
      toast.error(errorMessage);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenCreateInvoiceModal = () => {
    setCreateInvoiceForm({
      client_email: '',
      client_name: '',
      client_contact: '',
      title: '',
      product_costs_rmb: [''],
      quantities: [1],
      rmb_to_ghs_rate: '',
      shipping_method: 'sea',
      service_fee_percent: 5,
    });
    setShowCreateInvoiceModal(true);
  };

  const handleCreateInvoiceLookup = async () => {
    const email = (createInvoiceForm.client_email || '').trim().toLowerCase();
    if (!email) {
      toast.error('Enter client email to look up');
      return;
    }
    setCreateInvoiceLookupLoading(true);
    try {
      const res = await API.get('/buysellapi/admin/users/by-email/', { params: { email } });
      const d = res.data;
      setCreateInvoiceForm((prev) => ({
        ...prev,
        client_name: d.full_name || prev.client_name,
        client_contact: d.contact || prev.client_contact,
        client_email: d.email || email,
      }));
      toast.success('Client details loaded');
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('No user found with this email. Client must have an account.');
      } else {
        toast.error(err.response?.data?.error || 'Failed to look up client');
      }
    } finally {
      setCreateInvoiceLookupLoading(false);
    }
  };

  const handleCreateInvoiceForClientSubmit = async (e) => {
    e.preventDefault();
    const email = (createInvoiceForm.client_email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      toast.error('Client email is required');
      return;
    }
    const costs = createInvoiceForm.product_costs_rmb.filter((c) => c !== '' && c != null).map((c) => parseFloat(c));
    if (costs.length === 0) {
      toast.error('At least one product cost (RMB) is required');
      return;
    }
    if (!createInvoiceForm.rmb_to_ghs_rate || parseFloat(createInvoiceForm.rmb_to_ghs_rate) <= 0) {
      toast.error('RMB to GHS rate is required and must be positive');
      return;
    }
    const quantities = createInvoiceForm.quantities.slice(0, costs.length).map((q) => (parseInt(q, 10) || 1));
    if (quantities.length !== costs.length) {
      const qtyPad = Array(costs.length - quantities.length).fill(1);
      quantities.push(...qtyPad);
    }
    setCreateInvoiceSubmitting(true);
    try {
      const payload = {
        client_email: email,
        product_costs_rmb: costs,
        quantities,
        rmb_to_ghs_rate: parseFloat(createInvoiceForm.rmb_to_ghs_rate),
        shipping_method: createInvoiceForm.shipping_method || 'sea',
        service_fee_percent: parseFloat(createInvoiceForm.service_fee_percent) || 5,
        title: (createInvoiceForm.title || '').trim() || undefined,
      };
      const response = await createBuy4meInvoiceForClient(payload);
      const created = response.data;
      toast.success('Invoice created successfully');
      setShowCreateInvoiceModal(false);
      fetchBuy4meRequests(1, pageSize);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to create invoice';
      toast.error(msg);
    } finally {
      setCreateInvoiceSubmitting(false);
    }
  };

  const baseRequests = quickFilter === "all" ? requests : allRequests || [];

  const filteredRequests = baseRequests
    .filter(request => statusFilter === 'all' || request.status === statusFilter)
    .filter((request) => {
      if (quickFilter === "all") return true;
      const hasTracking = Boolean((request.tracking_status || "").trim());
      const hasInvoice = Boolean(request.invoice || request.invoice_created || request.invoice_number);
      if (quickFilter === "need_invoice") {
        // Needs invoice creation (approved + no invoice yet)
        return request.status === "approved" && !hasInvoice;
      }
      return true;
    })
    .filter(request => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (request.title || '').toLowerCase().includes(searchLower) ||
        (request.description || '').toLowerCase().includes(searchLower) ||
        (request.userName || '').toLowerCase().includes(searchLower) ||
        String(request.id || request._id || '').includes(searchTerm)
      );
    });

  const effectiveTotal = quickFilter === "all" ? total : filteredRequests.length;
  const effectiveTotalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize));
  const pagedRequests =
    quickFilter === "all"
      ? filteredRequests
      : filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Pagination handlers (after effectiveTotalPages is computed)
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= effectiveTotalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

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
      
      // Update UI immediately without refresh
      const deletedIds = new Set(selectedRequests);
      setRequests((prevRequests) => 
        prevRequests.filter((req) => !deletedIds.has(req.id || req._id))
      );
      setTotal((prevTotal) => {
        const nextTotal = Math.max(0, prevTotal - selectedRequests.length);
        if (currentPage > 1 && nextTotal <= (currentPage - 1) * pageSize) {
          setCurrentPage(currentPage - 1);
        }
        return nextTotal;
      });
      
      // Refresh data from server to ensure consistency
      fetchBuy4meRequests(currentPage, pageSize);
      
      setSelectedRequests([]);
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
      fetchBuy4meRequests(currentPage, pageSize);
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

  const handleDownloadInvoicePdf = async (requestId) => {
    setDownloadingInvoiceId(requestId);
    try {
      await downloadBuy4meInvoiceReceipt(requestId, true);
      toast.success("Invoice downloaded");
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        "Failed to download invoice";
      toast.error(typeof msg === "string" ? msg : "Failed to download invoice");
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  if (showPrintableInvoice) {
    return (
      <div className="print-container">
        <Invoice 
          invoice={selectedRequest?.invoice} 
          request={selectedRequest} 
          printable={true}
          invoiceId={selectedRequest?.id}
          customerEmail={selectedRequest?.user_email || selectedRequest?.userEmail}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="mb-6 flex justify-between items-start">
          <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Buy4ME Requests Management</h2>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage customer product purchase requests
          </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreateInvoiceModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Create invoice for a client (enter email to auto-fill name & contact)"
            >
              <FaPlus className="w-5 h-5" />
              <span>Create invoice for client</span>
            </button>
            <button
              onClick={handleOpenSettings}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Buy4me Settings"
            >
              <FaCog className="w-5 h-5" />
              <span>Settings</span>
            </button>
          </div>
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
            <select
              value={invoiceFilter}
              onChange={(e) => {
                setInvoiceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              title="Filter by invoice payment status"
            >
              <option value="all">All Invoices</option>
              <option value="paid">Paid Invoices</option>
              <option value="pending">Pending Invoices</option>
              <option value="cancelled">Cancelled Invoices</option>
              <option value="draft">Draft Invoices</option>
            </select>

            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuickFilter("need_invoice");
                  setStatusFilter("approved");
                  setCurrentPage(1);
                }}
                className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                  quickFilter === "need_invoice"
                    ? "bg-amber-600 border-amber-600 text-white"
                    : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
                title="Approved requests that need invoice creation"
              >
                Create invoice
              </button>
              {quickFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setQuickFilter("all")}
                  className="px-3 py-2 text-sm font-medium rounded-md border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                  title="Clear quick filter"
                >
                  Clear
                </button>
              )}
            </div>
            
            <button
              onClick={fetchBuy4meRequests}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
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
                  Sourcing fee
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
                  <td colSpan="8" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No Buy4me requests found
                  </td>
                </tr>
              ) : (
                pagedRequests.map(request => (
                  <tr key={request.id || request._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRequests.includes(request.id || request._id)}
                        onChange={() => handleSelectRequest(request.id || request._id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-white truncate cursor-default"
                        title={request.title || 'N/A'}
                      >
                        {request.title || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate cursor-default" title={request.description || ''}>
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
                      {request.sourcing_fee_paid ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" title="Sourcing fee paid (Paystack)">
                          Paid
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
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

      {/* Pagination */}
      {effectiveTotal > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {effectiveTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, effectiveTotal)} of {effectiveTotal} requests
            </span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 ${
                currentPage === 1
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <FaChevronLeft />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
              Page {currentPage} of {effectiveTotalPages || 1}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= effectiveTotalPages}
              className={`px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 ${
                currentPage >= effectiveTotalPages
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}

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
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Sourcing fee</h4>
                  {selectedRequest.sourcing_fee_paid ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      Paid
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
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
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Quantity</h4>
                  <p className="text-gray-900 dark:text-white">{selectedRequest.quantity}</p>
                </div>
                {(() => {
                  const products = selectedRequest.additional_links && selectedRequest.additional_links.length > 0
                    ? selectedRequest.additional_links
                    : (selectedRequest.link || selectedRequest.product_url)
                      ? [{ url: selectedRequest.link || selectedRequest.product_url, quantity: selectedRequest.quantity }]
                      : [];
                  if (products.length === 0) return null;
                  return (
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Products</h4>
                      <div className="space-y-2">
                        {products.map((link, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <a
                              href={typeof link === 'string' ? link : link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 break-all text-sm"
                            >
                              {typeof link === 'string' ? link : link.url}
                            </a>
                            {typeof link === 'object' && (link.quantity != null || link.quantity === 0) && (
                              <span className="text-xs text-gray-500">(Qty: {link.quantity})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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
                {selectedRequest.proof_of_payment && (
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Proof of Payment</h4>
                    <div className="flex items-start gap-3">
                      <div className="h-24 border dark:border-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={selectedRequest.proof_of_payment}
                          alt="Proof of payment"
                          className="h-full w-auto object-contain bg-gray-100 dark:bg-gray-700"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/150?text=Image+Not+Found';
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewProof(selectedRequest.proof_of_payment)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View full size
                      </button>
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
                            const response = await updateBuy4meRequestTracking(requestId, { tracking_status: newTrackingStatus });
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
                  
                  {(showInvoiceForm && (!selectedRequest.invoice || isEditingInvoice)) ? (
                    <>
                      {(() => {
                        const products = getProductsForInvoice(selectedRequest);
                        const totalProducts = isEditingInvoice
                          ? Math.max((invoiceProductCostsRmb || []).length, 1)
                          : Math.max(products.length, 1);
                        const productRows = isEditingInvoice
                          ? Array.from({ length: totalProducts }, (_, i) => ({ url: null, quantity: (invoiceQuantities[i] ?? 1) }))
                          : (products.length >= totalProducts
                              ? products
                              : [...products, ...Array.from({ length: totalProducts - products.length }, () => ({ url: null, quantity: 1 }))]);

                        return (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <h5 className="text-md font-medium text-gray-900 dark:text-white mb-3">{isEditingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</h5>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Product Costs (RMB) <span className="text-red-500">*</span>
                              </label>
                              <div className="space-y-3">
                                {productRows.map((link, index) => {
                                  const linkUrl = typeof link === 'string' ? link : (link && link.url) || null;
                                  return (
                                    <div key={index}>
                                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                        {linkUrl ? `${linkUrl.substring(0, 50)}${linkUrl.length > 50 ? '...' : ''}` : `Product ${index + 1}`}
                                      </label>
                                      <div className="flex gap-2">
                                        <div className="flex-1 flex rounded-md shadow-sm">
                                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400">
                                            ¥
                                          </span>
                                          <input
                                            type="number"
                                            value={invoiceProductCostsRmb[index] || ''}
                                            onChange={(e) => {
                                              const newCosts = [...invoiceProductCostsRmb];
                                              newCosts[index] = e.target.value;
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
                                            value={invoiceQuantities[index] ?? ''}
                                            onChange={(e) => {
                                              const newQuantities = [...invoiceQuantities];
                                              newQuantities[index] = parseInt(e.target.value, 10) || 0;
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
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Shipping Method
                              </label>
                              {isEditingInvoice ? (
                                <select
                                  value={invoiceShippingMethod}
                                  onChange={(e) => setInvoiceShippingMethod(e.target.value)}
                                  className="mt-1 block w-full max-w-[180px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 sm:text-sm"
                                >
                                  <option value="sea">Sea Shipping</option>
                                  <option value="air">Air Shipping</option>
                                </select>
                              ) : (
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                  {selectedRequest?.invoice_shipping_method === "air"
                                    ? "Air Shipping"
                                    : "Sea Shipping"}
                                </p>
                              )}
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
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                              >
                                <FaFileInvoiceDollar className="mr-2" />
                                {isEditingInvoice ? 'Save changes' : 'Create Invoice'}
                              </button>
                              <button
                                onClick={() => {
                                  setShowInvoiceForm(false);
                                  setInvoiceAmount('');
                                  setInvoiceProductCostsRmb([]);
                                  setInvoiceQuantities([]);
                                  setInvoiceRmbToGhsRate('');
                                  setInvoiceShippingMethod('sea');
                                  setIsEditingInvoice(false);
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
                  ) : selectedRequest.invoice ? (
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
                            onClick={() => handleDownloadInvoicePdf(selectedRequest.id || selectedRequest._id)}
                            disabled={downloadingInvoiceId === (selectedRequest.id || selectedRequest._id)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                            title="Download invoice PDF"
                          >
                            {downloadingInvoiceId === (selectedRequest.id || selectedRequest._id) ? (
                              <FaSpinner className="mr-1 animate-spin" />
                            ) : (
                              <FaDownload className="mr-1" />
                            )}
                            Download
                          </button>
                          <button
                            onClick={handlePrintInvoice}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            <FaPrint className="mr-1" />
                            Print
                          </button>
                          <button
                            onClick={handleOpenEditInvoice}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-amber-700 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:hover:bg-amber-800"
                            title="Edit invoice amounts and line items"
                          >
                            <FaEdit className="mr-1" />
                            Edit invoice
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
                            ₵{Number(selectedRequest.invoice.totalGhs || selectedRequest.invoice.amount || 0).toFixed(2)}
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
                              <span className="text-xl">₵{Number(storedTotal || totalAmountGhs || 0).toFixed(2)}</span>
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
                  ) : (
                    <button
                      onClick={() => {
                        handleViewRequest(selectedRequest);
                        setShowInvoiceForm(true);
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    >
                      <FaFileInvoiceDollar className="mr-2" />
                      Create Invoice
                    </button>
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
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    >
                      Approve Request
                    </button>
                    <button
                      onClick={() => {
                        handleUpdateStatus(selectedRequest.id, 'rejected');
                        handleCloseModal();
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
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
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
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

      {previewProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                Proof of Payment
              </h3>
              <button
                type="button"
                onClick={() => setPreviewProof('')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300"
              >
                Close
              </button>
            </div>
            <div className="flex justify-center">
              <img
                src={previewProof}
                alt="Proof of Payment"
                className="max-h-[70vh] rounded-lg border"
              />
            </div>
          </div>
        </div>
      )}

      <InvoiceModal 
        isOpen={showInvoiceModal} 
        onClose={() => setShowInvoiceModal(false)} 
        invoice={selectedRequest?.invoice} 
        request={selectedRequest} 
        invoiceId={selectedRequest?.id}
        customerEmail={selectedRequest?.user_email || selectedRequest?.userEmail}
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

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Buy4me Settings
                </h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              {loadingSettings ? (
                <div className="flex justify-center py-8">
                  <FaSpinner className="animate-spin text-4xl text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Default Sourcing Payment (GHS) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={defaultSourcingPayment}
                      onChange={(e) => setDefaultSourcingPayment(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="100.00"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      This is the default amount users will pay for sourcing services before product purchase.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={settingsNotes}
                      onChange={(e) => setSettingsNotes(e.target.value)}
                      rows="3"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Add any notes about these settings..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {savingSettings ? (
                        <>
                          <FaSpinner className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Settings</span>
                      )}
                    </button>
                    <button
                      onClick={() => setShowSettingsModal(false)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create invoice for client modal – same pattern as Alipay: email lookup auto-fills name/contact */}
      {showCreateInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Create Buy4me Invoice for Client
                </h3>
                <button
                  onClick={() => setShowCreateInvoiceModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enter client email and click Look up to auto-fill name and contact (same as Alipay payment).
              </p>
              <form onSubmit={handleCreateInvoiceForClientSubmit} className="space-y-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client email *</label>
                    <input
                      type="email"
                      value={createInvoiceForm.client_email}
                      onChange={(e) => setCreateInvoiceForm((prev) => ({ ...prev, client_email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="client@example.com"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateInvoiceLookup}
                    disabled={createInvoiceLookupLoading}
                    className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center gap-1 disabled:opacity-50"
                  >
                    {createInvoiceLookupLoading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
                    Look up
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name (auto-filled)</label>
                    <input
                      type="text"
                      value={createInvoiceForm.client_name}
                      onChange={(e) => setCreateInvoiceForm((prev) => ({ ...prev, client_name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Auto-filled from lookup"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact (auto-filled)</label>
                    <input
                      type="text"
                      value={createInvoiceForm.client_contact}
                      onChange={(e) => setCreateInvoiceForm((prev) => ({ ...prev, client_contact: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Auto-filled from lookup"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice title (optional)</label>
                  <input
                    type="text"
                    value={createInvoiceForm.title}
                    onChange={(e) => setCreateInvoiceForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g. Admin-created Buy4me Invoice"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product costs (RMB) * – one per line/item</label>
                  {createInvoiceForm.product_costs_rmb.map((cost, idx) => (
                    <div key={idx} className="flex gap-2 items-center mb-2">
                      <span className="text-gray-500 w-8">#{idx + 1}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cost}
                        onChange={(e) => {
                          const next = [...createInvoiceForm.product_costs_rmb];
                          next[idx] = e.target.value;
                          setCreateInvoiceForm((prev) => ({ ...prev, product_costs_rmb: next }));
                        }}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="0.00"
                      />
                      <span className="text-gray-500 text-sm">×</span>
                      <input
                        type="number"
                        min="1"
                        value={createInvoiceForm.quantities[idx] ?? 1}
                        onChange={(e) => {
                          const next = [...createInvoiceForm.quantities];
                          next[idx] = parseInt(e.target.value, 10) || 1;
                          setCreateInvoiceForm((prev) => ({ ...prev, quantities: next }));
                        }}
                        className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      {createInvoiceForm.product_costs_rmb.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCreateInvoiceForm((prev) => ({
                              ...prev,
                              product_costs_rmb: prev.product_costs_rmb.filter((_, i) => i !== idx),
                              quantities: prev.quantities.filter((_, i) => i !== idx),
                            }));
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCreateInvoiceForm((prev) => ({
                      ...prev,
                      product_costs_rmb: [...prev.product_costs_rmb, ''],
                      quantities: [...prev.quantities, 1],
                    }))}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    + Add another product cost
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RMB to GHS rate *</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={createInvoiceForm.rmb_to_ghs_rate}
                      onChange={(e) => setCreateInvoiceForm((prev) => ({ ...prev, rmb_to_ghs_rate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g. 0.58"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shipping</label>
                    <select
                      value={createInvoiceForm.shipping_method}
                      onChange={(e) => setCreateInvoiceForm((prev) => ({ ...prev, shipping_method: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="sea">Sea</option>
                      <option value="air">Air</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service fee %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={createInvoiceForm.service_fee_percent}
                    onChange={(e) => setCreateInvoiceForm((prev) => ({ ...prev, service_fee_percent: e.target.value }))}
                    className="w-full max-w-[120px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={createInvoiceSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {createInvoiceSubmitting ? <FaSpinner className="animate-spin" /> : <FaFileInvoiceDollar />}
                    Create invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateInvoiceModal(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Buy4meAdmin;