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
} from "react-icons/fa";
import { toast } from "../../utils/toast";
import "react-toastify/dist/ReactToastify.css";
import buyimg from "../../assets/bm2.jpg";
import { Link, useLocation } from "react-router-dom";
import {
  createBuy4meRequestWithPayment,
  updateBuy4meRequest,
  getBuy4meSettings,
  getBuy4meAwaitingSubmission,
  initiateBuy4meSourcingFee,
  submitBuy4meDetails,
} from "../../api";
import WhatsAppWidget from "../../components/WhatsAppWidget";
import {
  Buy4meSourcingFeePricing,
  getEffectiveSourcingFeeAmount,
} from "../../components/Buy4meSourcingFeePricing";

// Removed placeholder products - only show products from backend API

const Buy4me = () => {
  const location = useLocation();
  const [editMode, setEditMode] = useState(false);
  const [editOrderId, setEditOrderId] = useState(null);
  const [awaitingSlot, setAwaitingSlot] = useState(null);
  const [loadingAwaiting, setLoadingAwaiting] = useState(true);
  const [payingSourcingFee, setPayingSourcingFee] = useState(false);
  const [isSubmittingBuy4me, setIsSubmittingBuy4me] = useState(false);
  const [defaultSourcingPayment, setDefaultSourcingPayment] = useState(0);
  const [sourcingPricing, setSourcingPricing] = useState(null);

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

  const effectiveSourcingFee = getEffectiveSourcingFeeAmount(
    sourcingPricing,
    defaultSourcingPayment
  );
  const sourcingFeeReady = effectiveSourcingFee > 0;

  // Fetch buy4me settings for default sourcing payment
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await getBuy4meSettings();
        if (response.data?.defaultSourcingPayment != null) {
          setDefaultSourcingPayment(response.data.defaultSourcingPayment);
        }
        setSourcingPricing(response.data?.sourcingPricing ?? null);
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

  const handlePaySourcingFee = async () => {
    setPayingSourcingFee(true);
    try {
      try {
        sessionStorage.setItem("buy4meReturnPath", "/Buy4me");
      } catch {
        /* ignore */
      }
      const baseUrl = import.meta.env?.VITE_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
      const res = await initiateBuy4meSourcingFee({ callback_url: baseUrl ? `${String(baseUrl).replace(/\/$/, "")}/payment/callback` : undefined });
      if (res.data?.payment_url) {
        const discount = Number(res.data.executive_discount_ghs || 0);
        if (discount > 0) {
          toast.success(
            `Executive discount applied. Redirecting to pay GHS ${Number(res.data.amount).toFixed(2)}...`
          );
        } else {
          toast.success("Redirecting to payment...");
        }
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
                    <li>
                      <Buy4meSourcingFeePricing
                        variant="inline"
                        originalAmount={defaultSourcingPayment}
                        amount={sourcingPricing?.amount}
                        executiveDiscountGhs={sourcingPricing?.executiveDiscountGhs}
                        executiveDiscountPercent={sourcingPricing?.executiveDiscountPercent}
                        label="Pay sourcing fee"
                      />{" "}
                      to start.
                    </li>
                    <li>Once sourcing is completed, we will send you an invoice for the product cost.</li>
                    <li>After payment, we proceed with purchasing your order.</li>
                    <li>
                      Looking for ready wholesale catalog products? Visit{" "}
                      <Link to="/Wholesale" className="text-primary underline font-medium">
                        Wholesale Orders
                      </Link>{" "}
                      — free to browse and order (no sourcing fee).
                    </li>
                  </ul>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    One sourcing fee = one Buy4Me request (up to 5 items).
                  </p>
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                    <div className="mb-2">
                      <Buy4meSourcingFeePricing
                        originalAmount={defaultSourcingPayment}
                        amount={sourcingPricing?.amount}
                        executiveDiscountGhs={sourcingPricing?.executiveDiscountGhs}
                        executiveDiscountPercent={sourcingPricing?.executiveDiscountPercent}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handlePaySourcingFee}
                      disabled={payingSourcingFee || !sourcingFeeReady}
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
        </div>
      </div>
    </div>
  );
};

export default Buy4me;
