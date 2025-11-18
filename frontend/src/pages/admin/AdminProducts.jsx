import React, { useEffect, useState } from "react";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getProductTypes,
} from "../../api";
import { toast } from "react-toastify";
import { FaPlus, FaEdit, FaTrash, FaImage, FaTimes, FaCheck } from "react-icons/fa";
import BulkActions from "../../components/shared/BulkActions";

const initialForm = {
  name: "",
  slug: "",
  description: "",
  price: "",
  images: [],
  category: "",
  product_type: "",
  inventory: "",
  trending: false,
  is_active: true,
};

// Helper function to generate slug from name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [imageInput, setImageInput] = useState(""); // For adding new image URLs
  const [showForm, setShowForm] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const loadCategories = async () => {
    try {
      const resp = await getCategories();
      const items = Array.isArray(resp.data) ? resp.data : [];
      setCategories(items.filter(cat => cat.is_active));
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  };

  const loadProductTypes = async () => {
    try {
      const resp = await getProductTypes();
      const items = Array.isArray(resp.data) ? resp.data : [];
      setProductTypes(items.filter(type => type.is_active));
    } catch (err) {
      console.error("Failed to load product types", err);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const resp = await getProducts({});
      const items = Array.isArray(
        resp.data.results ? resp.data.results : resp.data
      )
        ? resp.data.results
          ? resp.data.results
          : resp.data
        : [];
      setProducts(items);
    } catch (err) {
      console.error("Failed to load products", err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadCategories();
    loadProductTypes();
  }, []);

  // Auto-generate slug when name changes
  useEffect(() => {
    if (form.name && !editing) {
      const autoSlug = generateSlug(form.name);
      setForm((prev) => ({ ...prev, slug: autoSlug }));
    }
  }, [form.name, editing]);

  const validateForm = () => {
    const newErrors = {};

    if (!form.name || form.name.trim() === "") {
      newErrors.name = "Product name is required";
    }

    if (!form.slug || form.slug.trim() === "") {
      newErrors.slug = "Slug is required";
    } else if (!/^[a-z0-9-]+$/.test(form.slug)) {
      newErrors.slug = "Slug can only contain lowercase letters, numbers, and hyphens";
    } else {
      // Check if slug already exists (only for new products)
      if (!editing) {
        const slugExists = products.some(p => p.slug === form.slug.trim());
        if (slugExists) {
          newErrors.slug = "This slug is already in use. Please choose a different one.";
        }
      } else {
        // For editing, check if slug exists for other products
        const slugExists = products.some(p => p.slug === form.slug.trim() && p.slug !== editing);
        if (slugExists) {
          newErrors.slug = "This slug is already in use by another product.";
        }
      }
    }

    if (!form.price || form.price === "" || Number(form.price) <= 0) {
      newErrors.price = "Valid price is required";
    }

    if (form.images.length === 0) {
      newErrors.images = "At least one image is required";
    }

    if (!form.category || form.category.trim() === "") {
      newErrors.category = "Category is required";
    }

    if (!form.product_type || form.product_type.trim() === "") {
      newErrors.product_type = "Product type is required";
    }

    if (form.inventory === "" || Number(form.inventory) < 0) {
      newErrors.inventory = "Valid inventory count is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((s) => ({
      ...s,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const addImage = () => {
    if (imageInput.trim()) {
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, imageInput.trim()],
      }));
      setImageInput("");
      if (errors.images) {
        setErrors((prev) => ({ ...prev, images: "" }));
      }
    }
  };

  const removeImage = (index) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the form errors");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || "",
        price: Number(form.price),
        images: form.images.filter((img) => img.trim() !== ""),
        category: form.category.trim(),
        product_type: form.product_type.trim(),
        inventory: Number(form.inventory || 0),
        trending: Boolean(form.trending),
        is_active: Boolean(form.is_active),
      };

      // Debug: Log the payload
      console.log("Submitting product payload:", payload);

      if (editing) {
        const response = await updateProduct(editing, payload);
        console.log("Update response:", response);
        toast.success("Product updated successfully!");
      } else {
        const response = await createProduct(payload);
        console.log("Create response:", response);
        toast.success("Product created successfully!");
      }

      resetForm();
      load();
    } catch (err) {
      console.error("Save product failed - Full error:", err);
      console.error("Error response:", err.response);
      console.error("Error response data:", err.response?.data);
      
      // Better error message extraction
      let errorMessage = "Failed to save product. Please check all fields.";
      
      if (err.response) {
        const data = err.response.data;
        
        // Handle different error formats
        if (data.detail) {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else if (typeof data === 'object') {
          // Extract field-specific errors
          const fieldErrors = Object.entries(data)
            .map(([field, errors]) => {
              const errorList = Array.isArray(errors) ? errors : [errors];
              return `${field}: ${errorList.join(", ")}`;
            })
            .join("; ");
          
          if (fieldErrors) {
            errorMessage = fieldErrors;
          }
        }
        
        // Check for specific error codes
        if (err.response.status === 401) {
          errorMessage = "Authentication required. Please log in again.";
        } else if (err.response.status === 403) {
          errorMessage = "You don't have permission to create products. Admin access required.";
        } else if (err.response.status === 400) {
          errorMessage = errorMessage || "Invalid data. Please check all fields.";
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage, { autoClose: 5000 });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditing(null);
    setErrors({});
    setImageInput("");
    setShowForm(false);
  };

  const onEdit = (p) => {
    setEditing(p.slug);
    setForm({
      name: p.name || "",
      slug: p.slug || "",
      description: p.description || "",
      price: p.price || "",
      images: Array.isArray(p.images) ? [...p.images] : [],
      category: p.category || "",
      product_type: p.product_type || "",
      inventory: p.inventory || "",
      trending: p.trending || false,
      is_active: p.is_active !== undefined ? p.is_active : true,
    });
    setShowForm(true);
    setErrors({});
  };

  const onDelete = async (slug) => {
    if (!window.confirm(`Are you sure you want to delete "${slug}"?`)) return;
    try {
      await deleteProduct(slug);
      toast.success("Product deleted successfully");
      load();
    } catch (err) {
      console.error("Delete failed", err);
      toast.error(err.response?.data?.detail || "Failed to delete product");
    }
  };

  // Bulk actions handlers
  const handleSelectProduct = (slug) => {
    setSelectedProducts((prev) =>
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : [...prev, slug]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map((p) => p.slug));
    }
    setSelectAll(!selectAll);
  };

  useEffect(() => {
    setSelectAll(selectedProducts.length === products.length && products.length > 0);
  }, [selectedProducts, products]);

  const handleBulkDelete = async (selectedSlugs) => {
    if (!window.confirm(`Are you sure you want to delete ${selectedSlugs.length} product(s)?`)) {
      return;
    }
    try {
      const deletePromises = selectedSlugs.map((slug) => deleteProduct(slug));
      await Promise.all(deletePromises);
      toast.success(`${selectedSlugs.length} product(s) deleted successfully`);
      setSelectedProducts([]);
      load();
    } catch (error) {
      console.error("Error bulk deleting products:", error);
      toast.error("Failed to delete some products");
    }
  };

  const handleBulkUpdateStatus = async (selectedSlugs, newStatus) => {
    try {
      const updatePromises = selectedSlugs.map(async (slug) => {
        const product = products.find((p) => p.slug === slug);
        if (!product) return Promise.resolve();
        return updateProduct(slug, { is_active: newStatus === "active" });
      });
      await Promise.all(updatePromises);
      toast.success(`${selectedSlugs.length} product(s) status updated successfully`);
      setSelectedProducts([]);
      load();
    } catch (error) {
      console.error("Error bulk updating status:", error);
      toast.error("Failed to update some products");
    }
  };

  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Products Management
        </h2>
        {!showForm && (
          <button
            onClick={handleAddNew}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2 shadow-md"
          >
            <FaPlus /> Add New Product
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {editing ? "Edit Product" : "Add New Product"}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter product name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Slug <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">
                    (Auto-generated from name)
                  </span>
                </label>
                <input
                  name="slug"
                  value={form.slug}
                  onChange={onChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                    errors.slug ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="product-slug"
                />
                {errors.slug && (
                  <p className="mt-1 text-sm text-red-500">{errors.slug}</p>
                )}
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price <span className="text-red-500">*</span>
                </label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={onChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                    errors.price ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="0.00"
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-500">{errors.price}</p>
                )}
              </div>

              {/* Inventory */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Inventory <span className="text-red-500">*</span>
                </label>
                <input
                  name="inventory"
                  type="number"
                  min="0"
                  value={form.inventory}
                  onChange={onChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                    errors.inventory ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="0"
                />
                {errors.inventory && (
                  <p className="mt-1 text-sm text-red-500">{errors.inventory}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={form.category}
                  onChange={onChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                    errors.category ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-500">{errors.category}</p>
                )}
              </div>

              {/* Product Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="product_type"
                  value={form.product_type}
                  onChange={onChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                    errors.product_type ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Select Type</option>
                  {productTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {errors.product_type && (
                  <p className="mt-1 text-sm text-red-500">{errors.product_type}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white dark:border-gray-600"
                placeholder="Enter detailed product description..."
              />
              <p className="mt-1 text-xs text-gray-500">
                {form.description.length} characters
              </p>
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Images <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="url"
                  value={imageInput}
                  onChange={(e) => setImageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addImage();
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="Enter image URL and press Enter or click Add"
                />
                <button
                  type="button"
                  onClick={addImage}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  Add
                </button>
              </div>
              {errors.images && (
                <p className="mt-1 text-sm text-red-500 mb-2">{errors.images}</p>
              )}

              {/* Image Preview Grid */}
              {form.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {form.images.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-300"
                        onError={(e) => {
                          e.target.src =
                            "https://via.placeholder.com/300x300?text=Invalid+URL";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkboxes */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  name="trending"
                  type="checkbox"
                  checked={form.trending}
                  onChange={onChange}
                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mark as Trending
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  name="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={onChange}
                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active (Visible to customers)
                </span>
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <FaCheck />
                {submitting
                  ? "Saving..."
                  : editing
                  ? "Update Product"
                  : "Create Product"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Existing Products ({products.length})
        </h3>

        {/* Bulk Actions */}
        <BulkActions
          selectedItems={selectedProducts}
          onBulkDelete={handleBulkDelete}
          onBulkUpdateStatus={handleBulkUpdateStatus}
          availableStatuses={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
          showDelete={true}
          showStatusUpdate={true}
        />

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FaImage className="text-6xl mx-auto mb-4 opacity-50" />
            <p>No products yet. Click "Add New Product" to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 w-12">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Inventory
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {products.map((p) => (
                  <tr key={p.slug} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(p.slug)}
                        onChange={() => handleSelectProduct(p.slug)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {p.images && p.images.length > 0 && (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {p.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {p.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                      ₵{Number(p.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                      {p.inventory}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            p.is_active
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}
                        >
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                        {p.trending && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            Trending
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEdit(p)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-1"
                        >
                          <FaEdit /> Edit
                        </button>
                        <button
                          onClick={() => onDelete(p.slug)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center gap-1"
                        >
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
