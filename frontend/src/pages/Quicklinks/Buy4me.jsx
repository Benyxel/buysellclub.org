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
} from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import buyimg from "../../assets/bm2.jpg";
import product1 from "../../assets/products/pro1.jpg";
import product2 from "../../assets/products/p2.jpg";
import product3 from "../../assets/products/p3.jpg";
import product4 from "../../assets/products/p4.jpg";
import product5 from "../../assets/products/p5.jpg";
import product6 from "../../assets/products/p6.jpg";
import product7 from "../../assets/products/p7.jpg";
import product8 from "../../assets/products/p8.jpg";
import product9 from "../../assets/products/p9.jpg";
import product10 from "../../assets/products/p10.jpg";
import { useNavigate, useLocation } from "react-router-dom";
import { createBuy4meRequest, updateBuy4meRequest, getQuickOrderProducts } from "../../api";

// We'll use these as placeholders while products are loading or if API fails
const placeholderProducts = [
  {
    id: 1,
    title: "Gaming Laptop",
    description:
      "High-performance gaming laptop with RTX 3080, 32GB RAM, 1TB SSD",
    images: [product1, product2],
    link: "https://example.com/gaming-laptop",
    minQuantity: 20,
  },
  {
    id: 2,
    title: "Smartphone Bundle",
    description:
      "Latest smartphone with accessories including case, screen protector, and wireless charger",
    images: [product3, product4],
    link: "https://example.com/smartphone-bundle",
    minQuantity: 20,
  },
];

const Buy4me = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [editOrderId, setEditOrderId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [quickOrderProducts, setQuickOrderProducts] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    images: ["", "", "", "", ""],
    additionalLinks: [
      { url: "", quantity: 0 },
      { url: "", quantity: 0 },
      { url: "", quantity: 0 },
      { url: "", quantity: 0 },
      { url: "", quantity: 0 },
    ],
  });

  // Calculate total quantity
  const totalQuantity = formData.additionalLinks.reduce(
    (sum, link) => sum + (link.quantity || 0),
    0
  );

  // Fetch quick order products from the API
  useEffect(() => {
    const fetchQuickOrderProducts = async () => {
      try {
        setIsLoading(true);
        const response = await getQuickOrderProducts();
        console.log("Quick order products API response:", response);
        
        // Handle different response structures
        let products = [];
        if (Array.isArray(response.data)) {
          products = response.data;
        } else if (response.data && Array.isArray(response.data.results)) {
          products = response.data.results;
        } else if (response.data && typeof response.data === 'object') {
          // If it's a single object, wrap it in an array
          products = [response.data];
        }
        
        console.log("Extracted products:", products);
        
        // Transform products to match expected format
        const transformedProducts = products.map(product => ({
          id: product.id,
          title: product.title,
          description: product.description || '',
          images: product.images || [],
          link: product.product_url || '',
          minQuantity: product.min_quantity || 20,
        }));
        
        console.log("Transformed products:", transformedProducts);
        setQuickOrderProducts(transformedProducts);
      } catch (error) {
        console.error("Error fetching quick order products:", error);
        console.error("Error details:", error.response?.data);
        // Fallback to placeholder products if API fails
        setQuickOrderProducts(placeholderProducts);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchQuickOrderProducts();
  }, []);

  useEffect(() => {
    if (location.state?.order) {
      const { order } = location.state;
      setEditMode(true);
      setEditOrderId(order.id || order._id);

      // Process existing links, ensuring compatibility with old format
      let additionalLinks = [];

      // Handle backwards compatibility with old format and Django API format
      if (order.product_url) {
        // Django API format: product_url is the main link
        additionalLinks.push({
          url: order.product_url,
          quantity: order.quantity || 20,
        });
      } else if (order.link) {
        // Old format: link field
        additionalLinks.push({
          url: order.link,
          quantity: order.quantity || 20,
        });
      }

      // Handle additional_links (Django API format) or additionalLinks (old format)
      const linksToProcess = order.additional_links || order.additionalLinks;
      if (linksToProcess) {
        if (
          Array.isArray(linksToProcess) &&
          typeof linksToProcess[0] === "string"
        ) {
          // Old format: array of strings
          additionalLinks = [
            ...additionalLinks,
            ...linksToProcess.map((url) => ({ url, quantity: 20 })),
          ];
        } else {
          // New format: array of objects with url and quantity
          additionalLinks = [...additionalLinks, ...linksToProcess];
        }
      }

      // Ensure we have exactly 5 items
      while (additionalLinks.length < 5) {
        additionalLinks.push({ url: "", quantity: 20 });
      }

      // If we have more than 5 items, keep only the first 5
      additionalLinks = additionalLinks.slice(0, 5);

      setFormData({
        title: order.title,
        description: order.description,
        images: [...(order.images || []), "", "", "", "", ""].slice(0, 5),
        additionalLinks: additionalLinks,
      });
    }
  }, [location.state]);

  const handleQuickOrder = async (product) => {
    setIsSubmitting(true);

    try {
      // Format links according to the expected schema format
      let validLink = product.link;
      // Ensure the link has a protocol
      if (validLink && !validLink.startsWith("http")) {
        validLink = "https://" + validLink;
      }

      // Prepare the order data for Django API
      const orderData = {
        title: product.title || "Quick Order Product",
        description: product.description || "Ordered from Quick Order Products",
        product_url: validLink,
        additional_links: [],
        images: Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []),
        quantity: product.minQuantity || 20,
      };

      console.log("Submitting order data:", orderData);

      // Submit the order using Django API
      const response = await createBuy4meRequest(orderData);
      const savedRequest = response.data;

      // Add to updates
      const updates = JSON.parse(localStorage.getItem("updates") || "[]");
      updates.unshift({
        id: Date.now().toString(),
        type: "order",
        title: "New Order Placed",
        message: `Your order for "${savedRequest.title}" has been placed successfully.`,
        date: new Date().toISOString(),
        read: false,
      });
      localStorage.setItem("updates", JSON.stringify(updates));

      toast.success("Order placed successfully!");
      navigate("/Payment", { state: { order: savedRequest } });
    } catch (error) {
      console.error("Error submitting quick order:", error);
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
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (index, value) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData({ ...formData, images: newImages });
  };

  const handleImageUpload = (index, event) => {
    const file = event.target.files[0];
    if (file) {
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
        const newImages = [...formData.images];
        newImages[index] = reader.result;
        setFormData({ ...formData, images: newImages });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalLinkChange = (index, field, value) => {
    const newAdditionalLinks = [...formData.additionalLinks];
    newAdditionalLinks[index] = {
      ...newAdditionalLinks[index],
      [field]: value,
    };
    setFormData({ ...formData, additionalLinks: newAdditionalLinks });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.title || !formData.description) {
        toast.error("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      // Check if at least one link is provided
      const hasLinks = formData.additionalLinks.some(
        (link) => link.url && link.url.trim() !== ""
      );
      if (!hasLinks) {
        toast.error("Please provide at least one product link");
        setIsSubmitting(false);
        return;
      }

      // Filter out empty links and ensure proper format
      const filteredLinks = formData.additionalLinks
        .filter((link) => link.url && link.url.trim() !== "")
        .map((link) => ({
          url: link.url.trim(),
          quantity: link.quantity || 20
        }));

      // Prepare order data for Django API
      // Get the first link as product_url and rest as additional_links
      const firstLink = filteredLinks[0];
      const restLinks = filteredLinks.slice(1);
      
      // Ensure product_url is a valid URL or null
      let productUrl = firstLink?.url || null;
      if (productUrl && !productUrl.startsWith('http://') && !productUrl.startsWith('https://')) {
        productUrl = 'https://' + productUrl;
      }
      
      const orderData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        product_url: productUrl,
        additional_links: restLinks.length > 0 ? restLinks : [],
        images: formData.images.filter((img) => img && img.trim() !== ''),
        quantity: filteredLinks.reduce((sum, link) => sum + (link.quantity || 20), 0),
      };
      
      console.log('Submitting buy4me request:', orderData);

      let response;
      let savedRequest;
      
      if (editMode) {
        response = await updateBuy4meRequest(editOrderId, orderData);
        savedRequest = response.data;
      } else {
        response = await createBuy4meRequest(orderData);
        savedRequest = response.data;
      }
      
      console.log('Buy4me request created/updated:', savedRequest);

      const updates = JSON.parse(localStorage.getItem("updates") || "[]");
      updates.unshift({
        id: Date.now().toString(),
        type: "order",
        title: editMode ? "Order Updated" : "New Order Placed",
        message: editMode
          ? `Your order for "${savedRequest.title}" has been updated.`
          : `Your order for "${savedRequest.title}" has been placed successfully.`,
        date: new Date().toISOString(),
        read: false,
      });
      localStorage.setItem("updates", JSON.stringify(updates));

      toast.success(
        editMode ? "Order updated successfully!" : "Order placed successfully!"
      );

      if (!editMode) {
        navigate("/Payment", { state: { order: savedRequest } });
      } else {
        navigate("/profile");
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
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 h-[600px] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editMode ? "Edit Order" : "Place Your Order"}
                </h2>
                <button
                  onClick={() => navigate("/profile")}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>
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
                    Product Images (up to 5)
                  </label>
                  <div className="space-y-3">
                    {formData.images.map((image, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <FaImage className="w-5 h-5 text-gray-400" />
                        <div className="flex-1 flex gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(index, e)}
                            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>
                        {image && (
                          <button
                            type="button"
                            onClick={() => handleImageChange(index, "")}
                            className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <FaTimes className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {formData.images.some((img) => img) && (
                    <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                      {formData.images.map(
                        (image, index) =>
                          image && (
                            <div key={index} className="relative group">
                              <img
                                src={image}
                                alt={`Preview ${index + 1}`}
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => handleImageChange(index, "")}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <FaTimes className="w-3 h-3" />
                              </button>
                            </div>
                          )
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Product Links with Quantities
                  </label>
                  <div className="space-y-3">
                    {formData.additionalLinks.map((link, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <FaLink className="w-5 h-5 text-gray-400" />
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) =>
                            handleAdditionalLinkChange(
                              index,
                              "url",
                              e.target.value
                            )
                          }
                          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Enter product link"
                        />
                        <div className="flex items-center">
                          <label className="sr-only">Quantity</label>
                          <input
                            type="number"
                            min="0"
                            value={link.quantity}
                            onChange={(e) =>
                              handleAdditionalLinkChange(
                                index,
                                "quantity",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Qty"
                          />
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

                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {isSubmitting
                    ? "Submitting..."
                    : editMode
                    ? "Update Order"
                    : "Place Order"}
                </button>
              </form>
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

              {isLoading ? (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quickOrderProducts.map((product, productIndex) => (
                    <div
                      key={product._id || product.id || `product-${productIndex}`}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex-grow">
                          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                            {product.images && product.images.length > 0 ? (
                              product.images.map((image, index) => (
                                <img
                                  key={`${product._id || product.id || productIndex}-img-${index}`}
                                  src={image}
                                  alt={`${product.title} image ${index + 1}`}
                                  className="w-20 h-20 object-cover rounded-lg"
                                />
                              ))
                            ) : (
                              <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                <FaImage className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {product.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {product.description}
                          </p>
                          <p className="text-sm text-primary mt-2">
                            Minimum Quantity: {product.minQuantity}
                          </p>
                        </div>
                        <div className="mt-4">
                          <button
                            onClick={() => handleQuickOrder(product)}
                            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            {isSubmitting ? "Processing..." : "Place Order"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Buy4me;
