import React, { useState, useEffect } from "react";
import {
  FaShoppingCart,
  FaImage,
  FaLink,
  FaBox,
  FaPlus,
  FaTrash,
  FaSave,
  FaEdit,
  FaTimes,
  FaInfoCircle,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { toast } from "../../utils/toast";
import "react-toastify/dist/ReactToastify.css";
import buyimg from "../../assets/bm2.jpg";
import { useLocation } from "react-router-dom";
import {
  createBuy4meRequestWithPayment,
  updateBuy4meRequest,
  getQuickOrderProducts,
  getBuy4meSettings,
  getBuy4meAwaitingSubmission,
  initiateBuy4meSourcingFee,
  submitBuy4meDetails,
} from "../../api";
import WhatsAppWidget from "../../components/WhatsAppWidget";

// Removed placeholder products - only show products from backend API

const Buy4me = () => {
  const location = useLocation();
  const [editMode, setEditMode] = useState(false);
  const [editOrderId, setEditOrderId] = useState(null);
  const [awaitingSlot, setAwaitingSlot] = useState(null);
  const [loadingAwaiting, setLoadingAwaiting] = useState(true);
  const [payingSourcingFee, setPayingSourcingFee] = useState(false);
  const [isSubmittingBuy4me, setIsSubmittingBuy4me] = useState(false);
  const [submittingQuickOrderId, setSubmittingQuickOrderId] = useState(null); // Track which quick order product is being submitted
  const [isLoading, setIsLoading] = useState(true);
  const [quickOrderProducts, setQuickOrderProducts] = useState([]);
  const [defaultSourcingPayment, setDefaultSourcingPayment] = useState(0);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  // Image preview modal state
  const [imagePreview, setImagePreview] = useState({
    isOpen: false,
    images: [],
    currentIndex: 0,
    productTitle: "",
  });
  const [quickOrderModal, setQuickOrderModal] = useState({ open: false, product: null });

  // Each product row: link, image, quantity together (no grouping)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    shippingMethod: "sea",
    products: [
      { name: "", url: "", quantity: 0, image: "" },
      { name: "", url: "", quantity: 0, image: "" },
      { name: "", url: "", quantity: 0, image: "" },
      { name: "", url: "", quantity: 0, image: "" },
      { name: "", url: "", quantity: 0, image: "" },
    ],
  });

  // Total quantity = sum of all product quantities (not the first product only)
  const totalQuantity = formData.products.reduce(
    (sum, p) => sum + (Number(p.quantity) || 0),
    0
  );

  // Fetch buy4me settings for default sourcing payment
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await getBuy4meSettings();
        if (response.data?.defaultSourcingPayment) {
          setDefaultSourcingPayment(response.data.defaultSourcingPayment);
        }
      } catch (error) {
        console.error("Failed to fetch buy4me settings:", error);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchAwaiting = async () => {
      try {
        setLoadingAwaiting(true);
        const res = await getBuy4meAwaitingSubmission();
        setAwaitingSlot(res.data?.awaiting_submission ?? null);
      } catch (err) {
        setAwaitingSlot(null);
      } finally {
        setLoadingAwaiting(false);
      }
    };
    fetchAwaiting();
  }, []);

  // Fetch quick order products from the API
  useEffect(() => {
    const fetchQuickOrderProducts = async () => {
      try {
        setIsLoading(true);
        // Fetch with pagination parameters
        const params = { page: currentPage, page_size: pageSize };
        const response = await getQuickOrderProducts(params);
        console.log("Quick order products API response:", response);
        
        // Handle different response structures
        let products = [];
        let count = 0;
        if (response.data && typeof response.data === 'object' && 'results' in response.data) {
          // Paginated response
          products = response.data.results || [];
          count = response.data.count || 0;
          setTotal(count);
        } else if (Array.isArray(response.data)) {
          // Non-paginated array response (fallback)
          products = response.data;
          count = response.data.length;
          setTotal(count);
        } else if (response.data && typeof response.data === 'object') {
          // If it's a single object, wrap it in an array
          products = [response.data];
          count = 1;
          setTotal(1);
        } else {
          products = [];
          setTotal(0);
        }
        
        console.log("Extracted products:", products);
        console.log("Total products from API:", count);
        console.log("Current page:", currentPage, "Page size:", pageSize);
        
        // Backend already filters active products, so just transform the format
        const transformedProducts = products.map(product => ({
            id: product.id,
            title: product.title,
            description: product.description || '',
            images: product.images || [],
            link: product.product_url || '',
            minQuantity: product.min_quantity || 20,
          }));
        
        console.log("Transformed products count:", transformedProducts.length);
        setQuickOrderProducts(transformedProducts);
      } catch (error) {
        console.error("Error fetching quick order products:", error);
        console.error("Error details:", error.response?.data);
        // Don't show placeholder products - only show products from backend
        // Only show error toast for actual failures (4xx/5xx), not for empty data
        const status = error.response?.status;
        if (status && status >= 400) {
          const errorMsg = error.response?.data?.detail || 
                           error.response?.data?.error || 
                           error.message || 
                           "Failed to load quick order products";
          toast.error(errorMsg, { toastId: "fetch-quick-order-error" });
        }
        // Set empty array - no placeholder products
        setQuickOrderProducts([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchQuickOrderProducts();
  }, [currentPage, pageSize]);

  // Pagination handlers
  const totalPages = Math.ceil(total / pageSize);
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Image preview handlers
  const openImagePreview = (images, startIndex = 0, productTitle = "") => {
    setImagePreview({
      isOpen: true,
      images: images || [],
      currentIndex: startIndex,
      productTitle: productTitle,
    });
  };

  const closeImagePreview = () => {
    setImagePreview({
      isOpen: false,
      images: [],
      currentIndex: 0,
      productTitle: "",
    });
  };

  const navigateImage = (direction) => {
    if (imagePreview.images.length === 0) return;
    
    let newIndex;
    if (direction === "next") {
      newIndex = (imagePreview.currentIndex + 1) % imagePreview.images.length;
    } else {
      newIndex = (imagePreview.currentIndex - 1 + imagePreview.images.length) % imagePreview.images.length;
    }
    
    setImagePreview({
      ...imagePreview,
      currentIndex: newIndex,
    });
  };

  // Handle keyboard navigation for image preview
  useEffect(() => {
    if (!imagePreview.isOpen || imagePreview.images.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeImagePreview();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setImagePreview((prev) => {
          const newIndex = (prev.currentIndex - 1 + prev.images.length) % prev.images.length;
          return { ...prev, currentIndex: newIndex };
        });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setImagePreview((prev) => {
          const newIndex = (prev.currentIndex + 1) % prev.images.length;
          return { ...prev, currentIndex: newIndex };
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imagePreview.isOpen, imagePreview.images.length]);

  useEffect(() => {
    if (location.state?.order) {
      const { order } = location.state;
      setEditMode(true);
      setEditOrderId(order.id || order._id);

      const rawLinks = order.additional_links || order.additionalLinks || [];
      const images = [...(order.images || []), "", "", "", "", ""].slice(0, 5);
      const mainUrl = (order.product_url || order.link || "").trim();
      const totalQty = Number(order.quantity) || 0;

      let products = [];
      const hasObjectLinks = Array.isArray(rawLinks) && rawLinks.length > 0 && typeof rawLinks[0] === "object" && rawLinks[0].url != null;
      const allInAdditional = hasObjectLinks && (rawLinks.length >= 5 || (mainUrl && rawLinks[0].url === mainUrl));

      if (allInAdditional) {
        products = rawLinks.slice(0, 5).map((link, i) => ({
          name: link?.name || link?.product_name || "",
          url: link.url || "",
          quantity: Number(link.quantity) || 0,
          image: images[i] || "",
        }));
      } else if (mainUrl && hasObjectLinks) {
        const restSum = rawLinks.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
        products = [
          { name: "", url: mainUrl, quantity: Math.max(0, totalQty - restSum), image: images[0] || "" },
          ...rawLinks.slice(0, 4).map((l, i) => ({ name: l?.name || l?.product_name || "", url: l.url || "", quantity: Number(l.quantity) || 0, image: images[i + 1] || "" })),
        ];
      } else if (mainUrl) {
        const linkStrings = Array.isArray(rawLinks) && typeof rawLinks[0] === "string"
          ? rawLinks.map((url) => ({ url, quantity: 20 }))
          : [];
        const restSum = linkStrings.reduce((s, l) => s + (Number(l.quantity) || 20), 0);
        products = [
          { name: "", url: mainUrl, quantity: Math.max(0, totalQty - restSum), image: images[0] || "" },
          ...linkStrings.map((l, i) => ({ name: "", url: l.url, quantity: Number(l.quantity) || 20, image: images[i + 1] || "" })),
        ];
      } else {
        const linkStrings = Array.isArray(rawLinks) && typeof rawLinks[0] === "string"
          ? rawLinks.map((url) => ({ url, quantity: 20 }))
          : [];
        products = linkStrings.map((l, i) => ({ name: "", url: l.url || "", quantity: Number(l.quantity) || 20, image: images[i] || "" }));
      }
      while (products.length < 5) products.push({ name: "", url: "", quantity: 0, image: "" });
      products = products.slice(0, 5);

      setFormData({
        title: order.title,
        description: order.description,
        shippingMethod: order.invoice_shipping_method || "sea",
        products,
      });
    }
  }, [location.state]);

  const openQuickOrderModal = (product) => {
    setQuickOrderModal({ open: true, product });
  };

  const closeQuickOrderModal = () => {
    setQuickOrderModal({ open: false, product: null });
  };

  const handleQuickOrderSubmit = async () => {
    const { product } = quickOrderModal;
    if (!product) return;
    if (!awaitingSlot?.id) {
      toast.error("Pay the sourcing fee first to place this order.");
      return;
    }
    setSubmittingQuickOrderId(product.id || product._id);
    try {
      let validLink = product.link;
      if (validLink && !validLink.startsWith("http")) validLink = "https://" + validLink;
      const orderData = {
        title: product.title || "Quick Order Product",
        description: product.description || "Ordered from Quick Order Products",
        product_url: validLink,
        additional_links: [{ url: validLink, quantity: product.minQuantity || 20 }],
        images: Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []),
        quantity: product.minQuantity || 20,
      };
      await submitBuy4meDetails(awaitingSlot.id, orderData);
      toast.success("Order submitted. Pay again to place another order.");
      setAwaitingSlot(null);
      closeQuickOrderModal();
    } catch (error) {
      const errMsg = error.response?.data?.error || error.response?.data?.detail || "Failed to submit order.";
      toast.error(errMsg);
    } finally {
      setSubmittingQuickOrderId(null);
    }
  };

  const handleQuickOrder = (product) => openQuickOrderModal(product);

  const handlePaySourcingFee = async () => {
    setPayingSourcingFee(true);
    try {
      const baseUrl = import.meta.env?.VITE_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
      const res = await initiateBuy4meSourcingFee({ callback_url: baseUrl ? `${String(baseUrl).replace(/\/$/, "")}/payment/callback` : undefined });
      if (res.data?.payment_url) {
        toast.success("Redirecting to payment...");
        window.location.href = res.data.payment_url;
        return;
      }
      toast.error("Could not start payment. Please try again.");
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || err.message || "Failed to start payment.");
    } finally {
      setPayingSourcingFee(false);
    }
  };

  const handleProductChange = (index, field, value) => {
    const newProducts = [...formData.products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setFormData({ ...formData, products: newProducts });
  };

  const handleProductImageUpload = (index, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      handleProductChange(index, "image", reader.result || "");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingBuy4me(true);

    try {
      if (!formData.title || !formData.description) {
        toast.error("Please fill in all required fields");
        setIsSubmittingBuy4me(false);
        return;
      }

      // Include every slot that has a link OR an image so admin gets one cost field per product.
      // Links are optional; image-only slots are valid (admin can use images to create invoice).
      const productsWithLinkOrImage = formData.products
        .map((p) => ({
          name: (p.name || "").trim(),
          url: (p.url || "").trim(),
          quantity: Math.max(0, Number(p.quantity) || 0),
          hasImage: !!(p.image && p.image.trim() !== ""),
        }))
        .filter((p) => p.url !== "" || p.hasImage);

      const additional_links = productsWithLinkOrImage.map((p) => ({
        url: p.url || "",
        quantity: p.quantity,
        // Send both keys for compatibility with backend serializers
        name: p.name || "",
        product_name: p.name || "",
      }));
      const totalQty = additional_links.reduce((sum, p) => sum + p.quantity, 0);
      const firstWithUrl = additional_links.find((p) => p.url && p.url.trim() !== "");
      let productUrl = firstWithUrl ? firstWithUrl.url : "";
      if (productUrl && !productUrl.startsWith("http://") && !productUrl.startsWith("https://")) {
        productUrl = "https://" + productUrl;
      }

      const orderData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        product_url: productUrl || null,
        additional_links,
        images: formData.products.map((p) => p.image).filter((img) => img && img.trim() !== ""),
        quantity: totalQty || 1,
        invoice_shipping_method: formData.shippingMethod,
      };
      
      console.log('Submitting buy4me request:', orderData);

      let response;
      let savedRequest;
      
      if (editMode) {
        // For edit mode, use the regular update endpoint
        response = await updateBuy4meRequest(editOrderId, orderData);
        savedRequest = response.data;
        
        const updates = JSON.parse(localStorage.getItem("updates") || "[]");
        updates.unshift({
          id: Date.now().toString(),
          type: "order",
          title: "Order Updated",
          message: `Your order for "${savedRequest.title}" has been updated.`,
          date: new Date().toISOString(),
          read: false,
        });
        localStorage.setItem("updates", JSON.stringify(updates));
        toast.success("Order updated successfully!");
        
        // Stay on the same page - reset form and exit edit mode
        setEditMode(false);
        setEditOrderId(null);
        setFormData({
          title: "",
          description: "",
          shippingMethod: "sea",
          products: [
            { name: "", url: "", quantity: 0, image: "" },
            { name: "", url: "", quantity: 0, image: "" },
            { name: "", url: "", quantity: 0, image: "" },
            { name: "", url: "", quantity: 0, image: "" },
            { name: "", url: "", quantity: 0, image: "" },
          ],
        });
      } else {
        if (!awaitingSlot?.id) {
          toast.error("No paid slot. Please pay the sourcing fee first.");
          setIsSubmittingBuy4me(false);
          return;
        }
        try {
          response = await submitBuy4meDetails(awaitingSlot.id, orderData);
          savedRequest = response.data;
          toast.success("Order submitted. You can pay again to place another order.");
          setAwaitingSlot(null);
          setFormData({
            title: "",
            description: "",
            shippingMethod: "sea",
            products: [
              { name: "", url: "", quantity: 0, image: "" },
              { name: "", url: "", quantity: 0, image: "" },
              { name: "", url: "", quantity: 0, image: "" },
              { name: "", url: "", quantity: 0, image: "" },
              { name: "", url: "", quantity: 0, image: "" },
            ],
          });
        } catch (error) {
          const errMsg =
            error.response?.data?.error ||
            error.response?.data?.detail ||
            error.response?.data?.message ||
            "Failed to submit order. Please try again.";
          toast.error(errMsg);
        }
        setIsSubmittingBuy4me(false);
        return;
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      console.error("Error response:", error.response);
      console.error("Error data:", error.response?.data);
      
      // Extract detailed error message
      let errorMessage = "An error occurred. Please try again.";
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle validation errors
        if (typeof errorData === 'object' && !Array.isArray(errorData)) {
          const errorFields = Object.keys(errorData);
          if (errorFields.length > 0) {
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
      
      toast.error(errorMessage, { autoClose: 5000 });
    } finally {
      setIsSubmittingBuy4me(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <WhatsAppWidget phone="+233535377248" label="WhatsApp now" />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 h-[600px] overflow-y-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editMode ? "Edit Order" : awaitingSlot ? "Place Your Order" : "Buy4me"}
                </h2>
              </div>
              {loadingAwaiting && !editMode ? (
                <div className="flex items-center justify-center py-12">
                  <span className="text-gray-500 dark:text-gray-400">Checking access...</span>
                </div>
              ) : !editMode && !awaitingSlot ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Buy4Me Product Sourcing Service
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Submit up to 5 product links or photos, and we will source the items for you from suppliers.
                  </p>
                  <ul className="text-gray-600 dark:text-gray-300 space-y-2 list-disc list-inside">
                    <li>Pay a GHS {defaultSourcingPayment || "—"} sourcing fee to start.</li>
                    <li>Once sourcing is completed, we will send you an invoice for the product cost.</li>
                    <li>After payment, we proceed with purchasing your order.</li>
                  </ul>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    One sourcing fee = one Buy4Me request (up to 5 items).
                  </p>
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">Sourcing fee: GHS {defaultSourcingPayment || "—"}</p>
                    <button
                      type="button"
                      onClick={handlePaySourcingFee}
                      disabled={payingSourcingFee || !defaultSourcingPayment || defaultSourcingPayment <= 0}
                      className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {payingSourcingFee ? "Redirecting to payment..." : "Pay sourcing fee to place order"}
                    </button>
                  </div>
                </div>
              ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Product Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter product title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Product Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows="4"
                    placeholder="Enter product description, specifications, or any additional details"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Shipping Type
                  </label>
                  <select
                    value={formData.shippingMethod}
                    onChange={(e) =>
                      setFormData({ ...formData, shippingMethod: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="sea">Sea Shipping</option>
                    <option value="air">Air Shipping</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Products (name, link, quantity, and optional image per row)
                  </label>
                  <div className="space-y-4">
                    {formData.products.map((product, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/30 p-3 sm:p-4"
                      >
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Item {index + 1}
                        </p>
                        {/* Mobile: stack; sm+: 12-col grid — name full width, link + qty row, image full width */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:gap-x-3 sm:gap-y-3">
                          <div className="sm:col-span-12">
                            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                              Product name
                            </label>
                            <div className="flex items-center gap-2">
                              <FaBox className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                              <input
                                type="text"
                                value={product.name || ""}
                                onChange={(e) =>
                                  handleProductChange(index, "name", e.target.value)
                                }
                                className="min-w-0 flex-1 px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="e.g. White sneakers"
                                autoComplete="off"
                              />
                            </div>
                          </div>
                          <div className="sm:col-span-8 lg:col-span-9">
                            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                              Product link
                            </label>
                            <div className="flex items-center gap-2">
                              <FaLink className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                              <input
                                type="url"
                                value={product.url}
                                onChange={(e) =>
                                  handleProductChange(index, "url", e.target.value)
                                }
                                className="min-w-0 flex-1 px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="https://…"
                                inputMode="url"
                              />
                            </div>
                          </div>
                          <div className="sm:col-span-4 lg:col-span-3">
                            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={product.quantity || ""}
                              onChange={(e) =>
                                handleProductChange(
                                  index,
                                  "quantity",
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent sm:max-w-[140px] sm:min-w-0"
                              placeholder="0"
                            />
                          </div>
                          <div className="sm:col-span-12">
                            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                              Reference image (optional)
                            </label>
                            <div className="flex flex-wrap items-center gap-3">
                              <label className="cursor-pointer inline-flex">
                                <span className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                                  <FaImage className="h-4 w-4 text-gray-400 shrink-0" aria-hidden />
                                  {product.image ? "Change image" : "Add image"}
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleProductImageUpload(index, e)
                                  }
                                />
                              </label>
                              {product.image && (
                                <div className="relative shrink-0">
                                  <img
                                    src={product.image}
                                    alt=""
                                    className="h-14 w-14 rounded-lg border border-gray-200 object-cover dark:border-gray-600 sm:h-16 sm:w-16"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleProductChange(index, "image", "")
                                    }
                                    className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow"
                                    aria-label="Remove image"
                                  >
                                    <FaTimes />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Quantity Display */}
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-700 dark:text-gray-300">
                      Total Quantity:
                    </p>
                    <p className="text-lg font-bold text-primary">
                      {totalQuantity}
                    </p>
                  </div>
                </div>

                {!editMode && awaitingSlot && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Sourcing fee paid. Submit your order details below. After this submission you will need to pay again to place another order.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingBuy4me}
                  className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingBuy4me ? "Submitting..." : editMode ? "Update Order" : "Place Order"}
                </button>
              </form>
              )}
            </div>
            <div className="relative rounded-lg overflow-hidden shadow-lg h-[600px]">
              <img
                src={buyimg}
                alt="Buy4Me Service"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent">
                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                  <h3 className="text-3xl font-bold mb-4">
                    Why Choose Buy4Me?
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <FaShoppingCart className="w-6 h-6 text-primary" />
                      <span>Shop from any website worldwide</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <FaBox className="w-6 h-6 text-primary" />
                      <span>Secure shipping and delivery</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <FaImage className="w-6 h-6 text-primary" />
                      <span>Multiple product images support</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <FaLink className="w-6 h-6 text-primary" />
                      <span>Easy product link sharing</span>
                    </li>
                  </ul>
                  <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-lg">
                    <p className="text-sm">
                      Our Buy4Me service helps you shop from any website in the
                      world. Simply provide the product details, and we'll
                      handle the rest!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Quick Order Products
              </h2>

              {!awaitingSlot ? (
                <div className="text-center p-8 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    Pay the sourcing fee above to see and order from Quick Order products.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    One payment gives you access to the order form and Quick Order products.
                  </p>
                </div>
              ) : isLoading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : quickOrderProducts.length === 0 ? (
                <div className="text-center p-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    No quick order products available
                  </p>
                </div>
              ) : (
                <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {quickOrderProducts.map((product, productIndex) => (
                    <div
                      key={product._id || product.id || `product-${productIndex}`}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex-grow">
                          <div className="flex gap-1 mb-2 overflow-x-auto pb-2">
                            {product.images && product.images.length > 0 ? (
                              <>
                                {product.images.slice(0, 2).map((image, index) => (
                                <img
                                  key={`${product._id || product.id || productIndex}-img-${index}`}
                                  src={image}
                                  alt={`${product.title} image ${index + 1}`}
                                    className="w-14 h-14 object-cover rounded-lg flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => openImagePreview(product.images, index, product.title)}
                                />
                                ))}
                                {product.images.length > 2 && (
                                  <div
                                    className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xs text-gray-500 flex-shrink-0 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    onClick={() => openImagePreview(product.images, 2, product.title)}
                                    title={`View all ${product.images.length} images`}
                                  >
                                    +{product.images.length - 2}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FaImage className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <h3 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2 mb-1">
                            {product.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                            {product.description}
                          </p>
                          <p className="text-xs text-primary mb-1">
                            Min: {product.minQuantity}
                          </p>
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 mb-2">
                            <p className="text-xs font-medium text-blue-900 dark:text-blue-200">
                              Sourcing fee: GHS {defaultSourcingPayment || "—"}
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              Pay first to get one order slot (form or quick order)
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <button
                            onClick={() => handleQuickOrder(product)}
                            disabled={submittingQuickOrderId === (product.id || product._id) || !defaultSourcingPayment || defaultSourcingPayment <= 0}
                            className="w-full px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submittingQuickOrderId === (product.id || product._id) ? "Submitting..." : (!defaultSourcingPayment || defaultSourcingPayment <= 0) ? "Sourcing fee not set" : "Place order"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {total > 0 && (
                  <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Showing {(currentPage - 1) * pageSize + 1} to{" "}
                        {Math.min(currentPage * pageSize, total)} of {total} products
                      </span>
                      <select
                        value={pageSize}
                        onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={30}>30 per page</option>
                        <option value={50}>50 per page</option>
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
                        Page {currentPage} of {totalPages || 1}
                      </span>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className={`px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 ${
                          currentPage >= totalPages
                            ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <FaChevronRight />
                      </button>
                    </div>
                </div>
                )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Order modal: has slot = place order (submit details); no slot = pay sourcing fee */}
      {quickOrderModal.open && quickOrderModal.product && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeQuickOrderModal}>
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {awaitingSlot ? "Place order" : "Quick order"}: {quickOrderModal.product.title}
            </h3>
            {awaitingSlot ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  This uses your paid slot. One submission per payment. After this order you will need to pay the sourcing fee again to place another.
                </p>
                <div className="flex gap-3">
                  <button type="button" onClick={closeQuickOrderModal} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                  <button
                    type="button"
                    onClick={handleQuickOrderSubmit}
                    disabled={submittingQuickOrderId === (quickOrderModal.product?.id || quickOrderModal.product?._id)}
                    className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingQuickOrderId === (quickOrderModal.product?.id || quickOrderModal.product?._id) ? "Submitting..." : "Place order"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Pay the sourcing fee first to get access to place this order (GHS {defaultSourcingPayment}). Same fee gives you access to the Buy4me form or one quick order.
                </p>
                <div className="flex gap-3">
                  <button type="button" onClick={closeQuickOrderModal} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                  <button
                    type="button"
                    onClick={() => { handlePaySourcingFee(); closeQuickOrderModal(); }}
                    disabled={payingSourcingFee || !defaultSourcingPayment || defaultSourcingPayment <= 0}
                    className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {payingSourcingFee ? "Redirecting..." : "Pay sourcing fee"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {imagePreview.isOpen && imagePreview.images.length > 0 && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={closeImagePreview}
        >
          <div
            className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeImagePreview}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              aria-label="Close preview"
            >
              <FaTimes className="w-6 h-6" />
            </button>

            {/* Navigation Buttons */}
            {imagePreview.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage("prev");
                  }}
                  className="absolute left-4 z-10 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                  aria-label="Previous image"
                >
                  <FaChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage("next");
                  }}
                  className="absolute right-4 z-10 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                  aria-label="Next image"
                >
                  <FaChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Image Container */}
            <div className="flex flex-col items-center justify-center w-full h-full">
              <img
                src={imagePreview.images[imagePreview.currentIndex]}
                alt={`${imagePreview.productTitle} - Image ${imagePreview.currentIndex + 1}`}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
              
              {/* Image Counter */}
              {imagePreview.images.length > 1 && (
                <div className="mt-4 px-4 py-2 bg-black/50 text-white rounded-lg">
                  <span className="text-sm">
                    {imagePreview.currentIndex + 1} / {imagePreview.images.length}
                  </span>
                </div>
              )}

              {/* Product Title */}
              {imagePreview.productTitle && (
                <p className="mt-2 text-white text-sm text-center max-w-2xl">
                  {imagePreview.productTitle}
                </p>
              )}
            </div>

            {/* Thumbnail Navigation (if multiple images) */}
            {imagePreview.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 overflow-x-auto max-w-full px-4">
                {imagePreview.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview({ ...imagePreview, currentIndex: index });
                    }}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === imagePreview.currentIndex
                        ? "border-primary scale-110"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Buy4me;
