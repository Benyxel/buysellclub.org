import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getApiUrl } from '../../config/api';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaImage,
  FaTimes,
  FaSave,
  FaExclamationTriangle,
} from "react-icons/fa";
import {
  getAdminQuickOrderProducts,
  getAdminQuickOrderProduct,
  createQuickOrderProduct,
  updateQuickOrderProduct,
  deleteQuickOrderProduct,
  clearQuickOrderProductsCache,
} from "../../api";

const QuickOrderProducts = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [formData, setFormData] = useState({
    _id: "",
    id: "",
    title: "",
    description: "",
    images: ["", "", "", "", ""],
    imageFiles: [],
    link: "",
    minQuantity: 20,
    active: true,
  });

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await getAdminQuickOrderProducts();
      const productsData = Array.isArray(response.data) ? response.data : (response.data.results || []);
      
      // Transform products to match expected format
      const transformedProducts = productsData.map(product => ({
        _id: product.id,
        id: product.id,
        title: product.title,
        description: product.description || '',
        images: product.images || [],
        link: product.product_url || '',
        minQuantity: product.min_quantity || 20,
        active: product.is_active !== undefined ? product.is_active : true,
      }));
      
      setProducts(transformedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      // Only show error for actual failures (4xx/5xx), not for empty data
      const status = error.response?.status;
      if (status && status >= 400) {
        const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to load products';
        toast.error(errorMessage, { toastId: "fetch-products-error" });
      }
      // Set empty array on any error to prevent UI crashes
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddNew = () => {
    setFormData({
      _id: "",
      id: "",
      title: "",
      description: "",
      images: ["", "", "", "", ""],
      imageFiles: [],
      link: "",
      minQuantity: 20,
      active: true,
    });
    setEditMode(false);
    setShowForm(true);
  };

  const handleEdit = (product) => {
    setFormData({
      _id: product._id,
      title: product.title,
      description: product.description,
      images: [...product.images, ""].slice(0, 5), // Ensure we have at least one empty slot
      imageFiles: Array(product.images.length + 1).fill(null), // Reset imageFiles
      link: product.link,
      minQuantity: product.minQuantity,
      active: product.active,
    });
    setEditMode(true);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }

    try {
      // Use the API wrapper which will handle cache invalidation
      await deleteQuickOrderProduct(id);

      // Clear cache for quick order products to ensure fresh data on public page
      clearQuickOrderProductsCache();

      toast.success("Product deleted successfully", { toastId: "delete-product-success" });
      setConfirmDelete(null);
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      const errorMsg = error.response?.data?.detail || 
                       error.response?.data?.error || 
                       error.message || 
                       "Failed to delete product";
      toast.error(errorMsg, { toastId: "delete-product-error" });
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleImageChange = (index, value) => {
    const newImages = [...formData.images];
    newImages[index] = value;

    // If we're editing the last image and it's not empty, add a new empty slot
    if (index === newImages.length - 1 && value !== "") {
      newImages.push("");
    }

    setFormData({ ...formData, images: newImages });
  };

  const handleImageFileChange = (index, event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    // Create a copy of the imageFiles array
    const newImageFiles = [...formData.imageFiles];
    // Store the file object
    newImageFiles[index] = file;

    // Create a preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      const newImages = [...formData.images];
      newImages[index] = reader.result;

      // If we're editing the last image and it's not empty, add a new empty slot
      if (index === newImages.length - 1) {
        newImages.push("");
        newImageFiles.push(null);
      }

      setFormData({
        ...formData,
        images: newImages,
        imageFiles: newImageFiles,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Filter out empty image URLs
      const filteredImages = formData.images.filter((img) => img && img.trim() !== "");

      if (filteredImages.length === 0) {
        toast.error("Please provide at least one image URL");
        setIsSubmitting(false);
        return;
      }

      // Prepare data for Django API
      const productData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        product_url: formData.link.trim(),
        images: filteredImages,
        min_quantity: parseInt(formData.minQuantity) || 20,
        is_active: formData.active !== undefined ? formData.active : true,
      };

      console.log("Submitting product data:", productData);
      console.log("is_active value:", productData.is_active);

      let response;
      if (editMode) {
        response = await updateQuickOrderProduct(formData._id || formData.id, productData);
      } else {
        response = await createQuickOrderProduct(productData);
      }

      console.log("Product save response:", response);
      console.log("Saved product is_active:", response.data?.is_active);

      toast.success(
        editMode ? "Product updated successfully" : "Product added successfully"
      );
      setShowForm(false);
      setEditMode(false);
      // Reset form
      setFormData({
        _id: "",
        id: "",
        title: "",
        description: "",
        images: ["", "", "", "", ""],
        imageFiles: [],
        link: "",
        minQuantity: 20,
        active: true,
      });
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || "Failed to save product";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Quick Order Products
        </h1>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2"
        >
          <FaPlus /> Add New Product
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : showForm ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {editMode ? "Edit Product" : "New Product"}
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Product title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                rows="3"
                placeholder="Product description"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Link
              </label>
              <input
                type="url"
                name="link"
                value={formData.link}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="https://example.com/product"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Quantity
              </label>
              <input
                type="number"
                name="minQuantity"
                value={formData.minQuantity}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Images
              </label>
              <div className="space-y-2">
                {formData.images.map((image, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <FaImage className="text-gray-400" />
                    <div className="flex-1 flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileChange(index, e)}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <input
                        type="url"
                        value={image.startsWith("data:") ? "" : image}
                        onChange={(e) =>
                          handleImageChange(index, e.target.value)
                        }
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Or enter image URL"
                      />
                    </div>
                    {image && (
                      <button
                        type="button"
                        onClick={() => {
                          const newImages = [...formData.images];
                          const newImageFiles = [...formData.imageFiles];
                          newImages[index] = "";
                          newImageFiles[index] = null;
                          setFormData({
                            ...formData,
                            images: newImages,
                            imageFiles: newImageFiles,
                          });
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                ))}
                {formData.images.some((img) => img) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.images.map(
                      (image, index) =>
                        image && (
                          <div key={index} className="relative group">
                            <img
                              src={image}
                              alt={`Preview ${index + 1}`}
                              className="w-20 h-20 object-cover rounded border border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newImages = [...formData.images];
                                const newImageFiles = [...formData.imageFiles];
                                newImages[index] = "";
                                newImageFiles[index] = null;
                                setFormData({
                                  ...formData,
                                  images: newImages,
                                  imageFiles: newImageFiles,
                                });
                              }}
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
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="active"
                name="active"
                checked={formData.active}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label
                htmlFor="active"
                className="ml-2 block text-sm text-gray-900"
              >
                Active (visible to users)
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg mr-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2"
              >
                {isSubmitting ? (
                  "Saving..."
                ) : (
                  <>
                    <FaSave /> {editMode ? "Update" : "Save"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500">
            No products found. Click "Add New Product" to create one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div
              key={product._id}
              className={`border rounded-lg p-4 ${
                product.active
                  ? "border-gray-200"
                  : "border-gray-300 bg-gray-50"
              }`}
            >
              <div className="flex justify-between mb-2">
                <h3
                  className={`font-medium ${
                    product.active ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {product.title}
                  {!product.active && (
                    <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                      Inactive
                    </span>
                  )}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(product._id)}
                    className={`${
                      confirmDelete === product._id
                        ? "text-red-600"
                        : "text-gray-500 hover:text-red-500"
                    }`}
                  >
                    {confirmDelete === product._id ? (
                      <FaExclamationTriangle />
                    ) : (
                      <FaTrash />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                {product.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${product.title} image ${index + 1}`}
                    className="w-16 h-16 object-cover rounded"
                  />
                ))}
              </div>

              <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                {product.description}
              </p>

              <div className="flex justify-between text-xs text-gray-500">
                <span>Min Qty: {product.minQuantity}</span>
                <span>{new Date(product.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuickOrderProducts;
