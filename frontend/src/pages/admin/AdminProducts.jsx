import React, { useEffect, useState } from "react";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getProductTypes,
  Api,
} from "../../api";
import { toast } from "../../utils/toast";
import { FaPlus, FaEdit, FaTrash, FaImage, FaTimes, FaCheck, FaChevronLeft, FaChevronRight, FaUpload } from "react-icons/fa";
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
  vendor: "",
  admin_charge_type: "",
  admin_charge_value: "",
  trending: false,
  is_active: true,
  features: {}, // e.g. { Size: ["S","M","L"], Color: ["Red","Blue"] }
  variant_inventory: {}, // e.g. { "Size:S|Color:Red": 10, "Size:M|Color:Blue": 5 } - quantity per variant
};

// Build variant key from feature name + value (e.g. "Size:S")
const featurePart = (name, val) => `${name}:${val}`;

// Generate all variant keys from features (Cartesian product), sorted for consistency
function getVariantKeysFromFeatures(features) {
  if (!features || typeof features !== "object") return [];
  const entries = Object.entries(features)
    .filter(([, vals]) => Array.isArray(vals) && vals.length > 0)
    .map(([name, vals]) => [name, vals.map((v) => String(v).trim()).filter(Boolean)]);
  if (entries.length === 0) return [];
  const names = entries.map(([n]) => n).sort();
  const valueLists = names.map((n) => (entries.find(([k]) => k === n) || [null, []])[1]);
  const result = [];
  function recurse(idx, parts) {
    if (idx === names.length) {
      result.push(parts.join("|"));
      return;
    }
    for (const v of valueLists[idx]) {
      recurse(idx + 1, [...parts, featurePart(names[idx], v)]);
    }
  }
  recurse(0, []);
  return result;
}

// Build a single variant key from selected values { Color: "Red", Size: "M" } -> "Color:Red|Size:M" (sorted names)
function buildVariantKeyFromSelections(selections) {
  if (!selections || typeof selections !== "object") return "";
  const parts = Object.entries(selections)
    .filter(([, val]) => val != null && String(val).trim() !== "")
    .map(([name, val]) => featurePart(name, String(val).trim()));
  if (parts.length === 0) return "";
  return Object.keys(selections)
    .filter((k) => selections[k] != null && String(selections[k]).trim() !== "")
    .sort()
    .map((n) => featurePart(n, String(selections[n]).trim()))
    .join("|");
}

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
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [imageInput, setImageInput] = useState(""); // For adding new image URLs
  const [showForm, setShowForm] = useState(false);
  const [productNewColorInput, setProductNewColorInput] = useState("");
  const [productNewSizeInput, setProductNewSizeInput] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  // Add-variant form: one selection per feature (e.g. { Color: "", Size: "" }) and quantity
  const [addVariantSelections, setAddVariantSelections] = useState({});
  const [addVariantQuantity, setAddVariantQuantity] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageFileInputRef = React.useRef(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const loadCategories = async () => {
    try {
      // Request a large page size to get all categories
      const resp = await getCategories({ page_size: 1000 });
      let items = [];
      
      // Handle paginated response
      if (resp.data && typeof resp.data === 'object' && 'results' in resp.data) {
        items = resp.data.results || [];
      } 
      // Handle array response (non-paginated)
      else if (Array.isArray(resp.data)) {
        items = resp.data;
      }
      
      setCategories(items.filter(cat => cat.is_active));
    } catch (err) {
      console.error("Failed to load categories", err);
      setCategories([]);
    }
  };

  const loadProductTypes = async () => {
    try {
      // Request a large page size to get all product types
      const resp = await getProductTypes({ page_size: 1000 });
      let items = [];
      
      // Handle paginated response
      if (resp.data && typeof resp.data === 'object' && 'results' in resp.data) {
        items = resp.data.results || [];
      } 
      // Handle array response (non-paginated)
      else if (Array.isArray(resp.data)) {
        items = resp.data;
      }
      
      setProductTypes(items.filter(type => type.is_active));
    } catch (err) {
      console.error("Failed to load product types", err);
      setProductTypes([]);
    }
  };

  const loadVendors = async () => {
    try {
      const resp = await Api.adminVendorUsers();
      setVendors(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error("Failed to load vendors", err);
      setVendors([]);
    }
  };

  const load = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      const params = { page: page || 1, page_size: size || 10 };
      const resp = await getProducts(params);
      
      // Handle both array and paginated response
      let items = [];
      if (resp.data && typeof resp.data === 'object' && 'results' in resp.data) {
        // Paginated response
        items = resp.data.results || [];
        setTotal(resp.data.count || 0);
      } else if (Array.isArray(resp.data)) {
        // Non-paginated array response (fallback)
        items = resp.data;
        setTotal(resp.data.length);
      } else if (resp.data?.results) {
        // Alternative paginated format
        items = resp.data.results;
        setTotal(resp.data.count || items.length);
      } else {
        items = [];
        setTotal(0);
      }
      setProducts(items);
    } catch (err) {
      console.error("Failed to load products", err);
      toast.error("Failed to load products");
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(currentPage, pageSize);
    loadCategories();
    loadProductTypes();
    loadVendors();
  }, [currentPage, pageSize]);

  // Pagination handlers
  const totalPages = Math.ceil(total / pageSize);
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

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

    if (form.admin_charge_type === "flat" || form.admin_charge_type === "percentage") {
      const v = Number(form.admin_charge_value);
      if (form.admin_charge_value === "" || isNaN(v) || v < 0) {
        newErrors.admin_charge_value = form.admin_charge_type === "flat"
          ? "Enter a valid flat amount (e.g. 5.00)"
          : "Enter a valid percentage (e.g. 10)";
      }
      if (form.admin_charge_type === "percentage" && v > 100) {
        newErrors.admin_charge_value = "Percentage cannot exceed 100";
      }
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

  const normalizeImageUrl = (url) => {
    if (!url || typeof url !== "string") return url;
    const u = url.trim();
    if (!u) return u;
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    return `https://${u}`;
  };

  const addImage = () => {
    if (imageInput.trim()) {
      const url = normalizeImageUrl(imageInput.trim());
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, url],
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

  const handleUploadImage = async (e, uploadType = "product") => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (e.g. JPG, PNG)");
      return;
    }
    try {
      setUploadingImage(true);
      const response = await Api.uploadFile(file, uploadType);
      const url = response?.data?.url || response?.data?.filePath;
      if (url) {
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, url],
        }));
        if (errors.images) setErrors((prev) => ({ ...prev, images: "" }));
        toast.success("Image uploaded");
      } else {
        toast.error("Upload succeeded but no URL returned");
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Upload failed";
      toast.error(msg);
    } finally {
      setUploadingImage(false);
      if (imageFileInputRef.current) imageFileInputRef.current.value = "";
    }
  };

  const clearProductFeature = (featureName) => {
    setForm((prev) => {
      const next = { ...(prev.features || {}) };
      delete next[featureName];
      return { ...prev, features: next };
    });
  };

  const addProductFeature = (featureName, valueOrList) => {
    const toAdd = Array.isArray(valueOrList)
      ? valueOrList.map((v) => String(v).trim()).filter(Boolean)
      : [String(valueOrList).trim()].filter(Boolean);
    if (toAdd.length === 0) return;
    setForm((prev) => {
      const current = prev.features?.[featureName] ?? [];
      const arr = Array.isArray(current) ? [...current] : [];
      const set = new Set(arr);
      toAdd.forEach((v) => set.add(v));
      const next = { ...(prev.features || {}), [featureName]: [...set] };
      return { ...prev, features: next };
    });
  };

  const removeProductFeature = (featureName, value) => {
    setForm((prev) => {
      const current = prev.features?.[featureName] ?? [];
      const arr = Array.isArray(current) ? current.filter((v) => v !== value) : [];
      const next = { ...(prev.features || {}) };
      if (arr.length === 0) delete next[featureName];
      else next[featureName] = arr;
      return { ...prev, features: next };
    });
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
        images: form.images.map(normalizeImageUrl).filter((img) => img && img.trim() !== ""),
        category: form.category.trim(),
        product_type: form.product_type.trim(),
        inventory: Number(form.inventory || 0),
        vendor: form.vendor ? Number(form.vendor) : null,
        admin_charge_type: form.admin_charge_type || null,
        admin_charge_value: (form.admin_charge_type === "flat" || form.admin_charge_type === "percentage")
          ? Number(form.admin_charge_value)
          : null,
        trending: Boolean(form.trending),
        is_active: Boolean(form.is_active),
        features: form.features && typeof form.features === "object" ? form.features : {},
        variant_inventory: (() => {
          const vi = form.variant_inventory && typeof form.variant_inventory === "object" ? form.variant_inventory : {};
          return Object.fromEntries(
            Object.entries(vi).map(([k, v]) => [k, v === "" || v == null ? 0 : Math.max(0, parseInt(v, 10) || 0)])
          );
        })(),
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
      load(currentPage, pageSize);
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
    setAddVariantSelections({});
    setAddVariantQuantity(0);
    setProductNewColorInput("");
    setProductNewSizeInput("");
  };

  const onEdit = (p) => {
    setEditing(p.slug);
    const features = p.features && typeof p.features === "object" ? { ...p.features } : {};
    const variant_inventory =
      p.variant_inventory && typeof p.variant_inventory === "object"
        ? Object.fromEntries(
            Object.entries(p.variant_inventory).map(([k, v]) => [k, v == null || v === "" ? 0 : Number(v) || 0])
          )
        : {};
    const rawImages = Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []);
    const images = rawImages.map((img) => (img && typeof img === "string" ? normalizeImageUrl(img) : String(img || "")).trim()).filter(Boolean);
    setForm({
      name: p.name || "",
      slug: p.slug || "",
      description: p.description || "",
      price: p.price || "",
      images: images.length ? images : [],
      category: p.category || "",
      product_type: p.product_type || "",
      inventory: p.inventory || "",
      vendor: p.vendor != null ? String(p.vendor) : "",
      admin_charge_type: p.admin_charge_type || "",
      admin_charge_value: p.admin_charge_value != null && p.admin_charge_value !== "" ? String(p.admin_charge_value) : "",
      trending: p.trending || false,
      is_active: p.is_active !== undefined ? p.is_active : true,
      features,
      variant_inventory,
    });
    setShowForm(true);
    setErrors({});
    setAddVariantSelections({});
    setAddVariantQuantity(0);
    setProductNewColorInput("");
    setProductNewSizeInput("");
  };

  const onDelete = async (slug) => {
    if (!window.confirm(`Are you sure you want to delete "${slug}"?`)) return;
    try {
      await deleteProduct(slug);
      toast.success("Product deleted successfully");
      load(currentPage, pageSize);
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
      load(currentPage, pageSize);
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
      load(currentPage, pageSize);
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

              {/* Retail price (vendor receives this; customer sees retail + admin charge as selling price) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Retail price <span className="text-red-500">*</span>
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
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Amount the vendor receives. Selling price in shop = retail price + admin charge.
                </p>
                {errors.price && (
                  <p className="mt-1 text-sm text-red-500">{errors.price}</p>
                )}
              </div>

              {/* Admin charge (selling fee) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin charge (selling fee)
                </label>
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[140px]">
                    <select
                      name="admin_charge_type"
                      value={form.admin_charge_type}
                      onChange={onChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white dark:border-gray-600 border-gray-300"
                    >
                      <option value="">None</option>
                      <option value="flat">Flat amount (₵)</option>
                      <option value="percentage">Percentage of price (%)</option>
                    </select>
                  </div>
                  {(form.admin_charge_type === "flat" || form.admin_charge_type === "percentage") && (
                    <div className="flex-1 min-w-[120px]">
                      <input
                        name="admin_charge_value"
                        type="number"
                        step={form.admin_charge_type === "percentage" ? "1" : "0.01"}
                        min="0"
                        max={form.admin_charge_type === "percentage" ? "100" : undefined}
                        value={form.admin_charge_value}
                        onChange={onChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                          errors.admin_charge_value ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder={form.admin_charge_type === "flat" ? "e.g. 5.00" : "e.g. 10"}
                      />
                      {errors.admin_charge_value && (
                        <p className="mt-1 text-sm text-red-500">{errors.admin_charge_value}</p>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Added to product price in the shop. Vendor only sees the product price above.
                </p>
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

              {/* Vendor (optional - link product to approved vendor) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vendor
                </label>
                <select
                  name="vendor"
                  value={form.vendor}
                  onChange={onChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white dark:border-gray-600"
                >
                  <option value="">No vendor (admin product)</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.full_name || v.username} ({v.username})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Assign to an approved vendor so they can see sales for this product
                </p>
              </div>
            </div>

            {/* Per-product colors and sizes (no global list) */}
            <div className="md:col-span-2 space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Colors for this product
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Add the colors this product is available in (e.g. Red, Blue). Leave empty if the product has no color option.
              </p>
              <div className="flex flex-wrap gap-2 items-center mb-2">
                {(Array.isArray(form.features?.Color) ? form.features.Color : []).map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => removeProductFeature("Color", c)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400"
                      aria-label={`Remove ${c}`}
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={productNewColorInput}
                  onChange={(e) => setProductNewColorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const toAdd = (productNewColorInput || "").split(",").map((s) => s.trim()).filter(Boolean);
                      if (toAdd.length) addProductFeature("Color", toAdd);
                      setProductNewColorInput("");
                    }
                  }}
                  placeholder="Add color (or several: Red, Blue, Green)"
                  className="flex-1 min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    const toAdd = (productNewColorInput || "").split(",").map((s) => s.trim()).filter(Boolean);
                    if (toAdd.length) addProductFeature("Color", toAdd);
                    setProductNewColorInput("");
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:opacity-90"
                >
                  <FaPlus /> Add
                </button>
                {(form.features?.Color?.length > 0) && (
                  <button type="button" onClick={() => clearProductFeature("Color")} className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    Clear all
                  </button>
                )}
              </div>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 mt-6">
                Sizes for this product
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Add the sizes this product is available in (e.g. S, M, L). Leave empty if the product has no size option.
              </p>
              <div className="flex flex-wrap gap-2 items-center mb-2">
                {(Array.isArray(form.features?.Size) ? form.features.Size : []).map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeProductFeature("Size", s)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400"
                      aria-label={`Remove ${s}`}
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={productNewSizeInput}
                  onChange={(e) => setProductNewSizeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const toAdd = (productNewSizeInput || "").split(",").map((s) => s.trim()).filter(Boolean);
                      if (toAdd.length) addProductFeature("Size", toAdd);
                      setProductNewSizeInput("");
                    }
                  }}
                  placeholder="Add size (or several: S, M, L, XL)"
                  className="flex-1 min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    const toAdd = (productNewSizeInput || "").split(",").map((s) => s.trim()).filter(Boolean);
                    if (toAdd.length) addProductFeature("Size", toAdd);
                    setProductNewSizeInput("");
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:opacity-90"
                >
                  <FaPlus /> Add
                </button>
                {(form.features?.Size?.length > 0) && (
                  <button type="button" onClick={() => clearProductFeature("Size")} className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Variant inventory: size only (exclude Color). Set quantity per size. */}
            {(() => {
              const featureEntries = form.features && typeof form.features === "object"
                ? Object.entries(form.features)
                    .filter(([name]) => name === "Size")
                    .filter(([, vals]) => Array.isArray(vals) && vals.length > 0)
                    .map(([name, vals]) => [name, vals.map((v) => String(v).trim()).filter(Boolean)])
                    .filter(([, vals]) => vals.length > 0)
                : [];
              const featureNames = featureEntries.map(([n]) => n).sort();
              const hasFeatures = featureNames.length > 0;
              const currentVariants = form.variant_inventory && typeof form.variant_inventory === "object"
                ? Object.entries(form.variant_inventory)
                : [];

              const addVariant = () => {
                const selections = { ...addVariantSelections };
                const key = buildVariantKeyFromSelections(selections);
                if (!key) return;
                const qty = Math.max(0, parseInt(addVariantQuantity, 10) || 0);
                setForm((prev) => ({
                  ...prev,
                  variant_inventory: {
                    ...(prev.variant_inventory || {}),
                    [key]: qty,
                  },
                }));
                setAddVariantSelections(featureNames.reduce((acc, n) => ({ ...acc, [n]: "" }), {}));
                setAddVariantQuantity(0);
              };

              const removeVariant = (key) => {
                setForm((prev) => {
                  const next = { ...(prev.variant_inventory || {}) };
                  delete next[key];
                  return { ...prev, variant_inventory: next };
                });
              };

              if (!hasFeatures) return null;
              return (
                <div className="md:col-span-2 space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Variant inventory
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Set quantity per size. Sizes not listed are unavailable (0 stock) on the storefront. Color is shown to customers but does not affect stock.
                  </p>
                  {/* List of added variants */}
                  {currentVariants.length > 0 && (
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-600 rounded-lg mb-3">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Variant</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 w-28">Quantity</th>
                            <th className="px-4 py-2 w-20"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                          {currentVariants.map(([key, qty]) => (
                            <tr key={key}>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                {key.replace(/\|/g, " • ").replace(/:/g, ": ")}
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  min={0}
                                  value={qty}
                                  onChange={(e) => {
                                    const v = e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10) || 0);
                                    setForm((prev) => ({
                                      ...prev,
                                      variant_inventory: { ...(prev.variant_inventory || {}), [key]: v },
                                    }));
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeVariant(key)}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                  title="Remove variant"
                                >
                                  <FaTimes className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Add variant row */}
                  <div className="flex flex-wrap items-end gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    {featureNames.map((name) => {
                      const options = (featureEntries.find(([n]) => n === name) || [null, []])[1];
                      return (
                        <div key={name} className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{name}</label>
                          <select
                            value={addVariantSelections[name] ?? ""}
                            onChange={(e) => setAddVariantSelections((prev) => ({ ...prev, [name]: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white dark:border-gray-600 min-w-[100px]"
                          >
                            <option value="">Select {name}</option>
                            {options.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Qty</label>
                      <input
                        type="number"
                        min={0}
                        value={addVariantQuantity}
                        onChange={(e) => setAddVariantQuantity(e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addVariant}
                      disabled={!buildVariantKeyFromSelections(addVariantSelections)}
                      className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaPlus className="w-4 h-4" /> Add variant
                    </button>
                  </div>
                </div>
              );
            })()}

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
              <div className="flex flex-wrap gap-2 mb-3">
                <input
                  type="text"
                  value={imageInput}
                  onChange={(e) => setImageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addImage();
                    }
                  }}
                  className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="Enter image URL or upload below"
                />
                <button
                  type="button"
                  onClick={addImage}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  Add URL
                </button>
                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadImage(e, "image")}
                />
                <button
                  type="button"
                  onClick={() => imageFileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <FaUpload className="text-sm" />
                  {uploadingImage ? "Uploading..." : "Upload product image"}
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
                        src={normalizeImageUrl(img)}
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
          Existing Products ({total})
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
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Retail price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Selling price
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
                        {((p.images && p.images.length > 0) || p.image) && (
                          <img
                            src={normalizeImageUrl((p.images && p.images[0]) || p.image)}
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
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {p.vendor_full_name || p.vendor_username || "—"}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                      ₵{Number(p.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                      ₵{Number(p.total_price != null ? p.total_price : p.price).toFixed(2)}
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
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEdit(p)}
                          className="px-3 py-1 bg-pink-600 text-white rounded hover:bg-pink-700 transition-colors flex items-center gap-1"
                        >
                          <FaEdit /> Edit
                        </button>
                        <button
                          onClick={() => onDelete(p.slug)}
                          className="px-3 py-1 bg-pink-600 text-white rounded hover:bg-pink-700 transition-colors flex items-center gap-1"
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
      </div>
    </div>
  );
}
