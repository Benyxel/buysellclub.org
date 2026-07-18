import React, { useState, useEffect } from "react";
import { toast } from "../../utils/toast";
import "react-toastify/dist/ReactToastify.css";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaImage,
  FaTimes,
  FaSave,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import ConfirmModal from "../../components/shared/ConfirmModal";
import { formatCompactCount } from "../../utils/formatCompactCount";
import {
  getAdminQuickOrderProducts,
  createQuickOrderProduct,
  updateQuickOrderProduct,
  deleteQuickOrderProduct,
} from "../../api";

const emptyForm = () => ({
  _id: "",
  id: "",
  title: "",
  description: "",
  images: ["", "", "", "", ""],
  imageFiles: [],
  minQuantity: 20,
  availabilityStatus: "available",
  arrivingDate: "",
  totalQuantity: 0,
  unitCost: "",
  expectedSellingPrice: "",
  saleEnabled: false,
  salePrice: "",
  active: true,
});

const mapProduct = (product) => ({
  _id: product.id,
  id: product.id,
  title: product.title,
  description: product.description || "",
  images: product.images || [],
  minQuantity: product.min_quantity || 20,
  availabilityStatus: product.availability_status || "available",
  arrivingDate: product.arriving_date || "",
  totalQuantity: product.total_quantity ?? 0,
  unitCost: product.unit_cost ?? 0,
  expectedSellingPrice: product.expected_selling_price ?? 0,
  saleEnabled: Boolean(product.sale_enabled),
  salePrice: product.sale_price ?? "",
  effectiveUnitPrice: product.effective_unit_price ?? product.unit_cost ?? 0,
  minOrderTotal: product.min_order_total ?? 0,
  active: product.is_active !== undefined ? product.is_active : true,
});

const QuickOrderProducts = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [formData, setFormData] = useState(emptyForm());

  const fetchProducts = async (page = currentPage, size = pageSize) => {
    try {
      setIsLoading(true);
      const params = { page: page || 1, page_size: size || 10 };
      const response = await getAdminQuickOrderProducts(params);
      let productsData = [];
      if (response.data && typeof response.data === "object" && "results" in response.data) {
        productsData = response.data.results || [];
        setTotal(response.data.count || 0);
      } else if (Array.isArray(response.data)) {
        productsData = response.data;
        setTotal(response.data.length);
      } else {
        setTotal(0);
      }
      setProducts(productsData.map(mapProduct));
    } catch (error) {
      const status = error.response?.status;
      if (status && status >= 400) {
        toast.error(
          error.response?.data?.error ||
            error.response?.data?.detail ||
            "Failed to load products",
          { toastId: "fetch-products-error" }
        );
      }
      setProducts([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(currentPage, pageSize);
  }, [currentPage, pageSize]);

  const totalPages = Math.ceil(total / pageSize);
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleAddNew = () => {
    setFormData(emptyForm());
    setEditMode(false);
    setShowForm(true);
  };

  const handleEdit = (product) => {
    setFormData({
      _id: product._id,
      id: product.id,
      title: product.title,
      description: product.description,
      images: [...(product.images || []), ""].slice(0, 5),
      imageFiles: Array((product.images || []).length + 1).fill(null),
      minQuantity: product.minQuantity,
      availabilityStatus: product.availabilityStatus || "available",
      arrivingDate: product.arrivingDate
        ? String(product.arrivingDate).slice(0, 10)
        : "",
      totalQuantity: product.totalQuantity,
      unitCost: product.unitCost,
      expectedSellingPrice: product.expectedSellingPrice,
      saleEnabled: product.saleEnabled,
      salePrice: product.salePrice || "",
      active: product.active,
    });
    setEditMode(true);
    setShowForm(true);
  };

  const handleDeleteClick = (product) => {
    setConfirmDelete(product);
  };

  const confirmDeleteProduct = async () => {
    if (!confirmDelete) return;
    const deletedId = confirmDelete._id || confirmDelete.id;
    setDeleting(true);
    try {
      const response = await deleteQuickOrderProduct(deletedId);
      toast.success(
        response?.data?.message || "Product deleted successfully"
      );
      setProducts((prev) => {
        const next = prev.filter((p) => (p._id || p.id) !== deletedId);
        if (next.length === 0 && currentPage > 1) {
          const nextPage = currentPage - 1;
          setCurrentPage(nextPage);
          // fetch on next tick after state updates
          setTimeout(() => fetchProducts(nextPage, pageSize), 0);
        }
        return next;
      });
      setTotal((prev) => Math.max(0, prev - 1));
      setConfirmDelete(null);
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          "Failed to delete product"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (index, value) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    if (index === newImages.length - 1 && value !== "") newImages.push("");
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
    const newImageFiles = [...formData.imageFiles];
    newImageFiles[index] = file;
    const reader = new FileReader();
    reader.onloadend = () => {
      const newImages = [...formData.images];
      newImages[index] = reader.result;
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

  const moqPreview = Number(formData.minQuantity) || 0;
  const unitPreview = formData.saleEnabled
    ? Number(formData.salePrice) || 0
    : Number(formData.unitCost) || 0;
  const minOrderPreview = (unitPreview * moqPreview).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const filteredImages = formData.images.filter(
        (img) => img && String(img).trim() !== ""
      );
      if (filteredImages.length === 0) {
        toast.error("Please provide at least one image");
        setIsSubmitting(false);
        return;
      }

      const totalQty = parseInt(formData.totalQuantity, 10) || 0;

      const productData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        product_url: "",
        images: filteredImages,
        min_quantity: parseInt(formData.minQuantity, 10) || 1,
        availability_status: formData.availabilityStatus || "available",
        arriving_date:
          formData.availabilityStatus === "arriving" && formData.arrivingDate
            ? formData.arrivingDate
            : null,
        total_quantity: totalQty,
        unit_cost: parseFloat(formData.unitCost) || 0,
        expected_selling_price: parseFloat(formData.expectedSellingPrice) || 0,
        sale_enabled: Boolean(formData.saleEnabled),
        sale_price: formData.saleEnabled
          ? parseFloat(formData.salePrice) || 0
          : null,
        is_active: formData.active !== undefined ? formData.active : true,
      };

      if (editMode) {
        await updateQuickOrderProduct(formData._id || formData.id, productData);
      } else {
        await createQuickOrderProduct(productData);
      }

      toast.success(editMode ? "Product updated successfully" : "Product added successfully");
      setShowForm(false);
      setEditMode(false);
      setFormData(emptyForm());
      fetchProducts(currentPage, pageSize);
    } catch (error) {
      const data = error.response?.data;
      const msg =
        (typeof data === "object" &&
          data &&
          (data.error ||
            data.detail ||
            data.arriving_date?.[0] ||
            data.sale_price?.[0] ||
            data.min_quantity?.[0] ||
            Object.values(data).flat?.()?.[0])) ||
        error.message ||
        "Failed to save product";
      toast.error(String(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex justify-end items-center mb-6">
        <button
          type="button"
          onClick={handleAddNew}
          className="px-4 py-2 bg-pink-600 text-white rounded-lg flex items-center gap-2 hover:bg-pink-700"
        >
          <FaPlus /> Add New Product
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        </div>
      ) : showForm ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {editMode ? "Edit Product" : "New Product"}
            </h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500">
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  name="availabilityStatus"
                  value={formData.availabilityStatus}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                >
                  <option value="available">Available</option>
                  <option value="arriving">Arriving</option>
                </select>
              </div>
              {formData.availabilityStatus === "arriving" && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Arriving date
                  </label>
                  <input
                    type="date"
                    name="arrivingDate"
                    value={formData.arrivingDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                    required
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">MOQ</label>
                <input
                  type="number"
                  name="minQuantity"
                  value={formData.minQuantity}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Total quantity (available)
                </label>
                <input
                  type="number"
                  name="totalQuantity"
                  value={formData.totalQuantity}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Decreases automatically when users place orders
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Unit cost (GHS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="unitCost"
                  value={formData.unitCost}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Expected selling price (GHS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="expectedSellingPrice"
                  value={formData.expectedSellingPrice}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                />
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-900/10 p-4 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="saleEnabled"
                  checked={formData.saleEnabled}
                  onChange={handleInputChange}
                  className="h-4 w-4"
                />
                Put product on sale
              </label>
              {formData.saleEnabled && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Sale unit price (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="salePrice"
                    value={formData.salePrice}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                    required
                  />
                </div>
              )}
              <p className="text-sm text-gray-700 dark:text-gray-300">
                MOQ total (unit × MOQ): <strong>GHS {minOrderPreview}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
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
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300"
                      />
                      <input
                        type="url"
                        value={image.startsWith("data:") ? "" : image}
                        onChange={(e) => handleImageChange(index, e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300"
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
                        className="text-red-500"
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
                          <img
                            key={index}
                            src={image}
                            alt={`Preview ${index + 1}`}
                            className="w-20 h-20 object-cover rounded border"
                          />
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
                className="h-4 w-4"
              />
              <label htmlFor="active" className="ml-2 text-sm">
                Active (visible to users)
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg flex items-center gap-2 hover:bg-pink-700"
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500">
            No products found. Click &quot;Add New Product&quot; to create one.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map((product) => (
              <div
                key={product._id}
                className={`border rounded-lg p-3 ${
                  product.active
                    ? "border-gray-200 dark:border-gray-700"
                    : "border-gray-300 bg-gray-50 dark:bg-gray-800/50"
                }`}
              >
                <div className="flex justify-between mb-2 gap-2">
                  <h3 className="font-medium text-sm line-clamp-1 text-gray-900 dark:text-white">
                    {product.title}
                  </h3>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(product)}
                      className="text-blue-500 text-sm"
                    >
                      <FaEdit />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(product)}
                      className="text-sm text-gray-500 hover:text-red-600"
                      title="Delete product"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>

                <div className="flex gap-1 mb-2 overflow-x-auto pb-2">
                  {(product.images || []).slice(0, 3).map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt=""
                      className="w-12 h-12 object-cover rounded flex-shrink-0"
                    />
                  ))}
                </div>

                <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                  {product.description}
                </p>
                <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                  <p>
                    <span className="font-medium capitalize">
                      {product.availabilityStatus}
                    </span>
                    {product.availabilityStatus === "arriving" &&
                      product.arrivingDate &&
                      ` · ${product.arrivingDate}`}
                  </p>
                  <p>
                    MOQ {product.minQuantity} · Available {product.totalQuantity}
                  </p>
                  <p>
                    Unit GHS {Number(product.effectiveUnitPrice).toFixed(2)}
                    {product.saleEnabled ? " (sale)" : ""}
                  </p>
                  <p>
                    MOQ total GHS {Number(product.minOrderTotal).toFixed(2)}
                  </p>
                  {!product.active && (
                    <span className="inline-block text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {total > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, total)} of{" "}
                  <span title={String(total)}>{formatCompactCount(total)}</span>{" "}
                  products
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="px-3 py-1 border rounded-lg bg-white dark:bg-gray-700 text-sm"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-lg border"
                >
                  <FaChevronLeft />
                </button>
                <span className="text-sm px-3">
                  Page {currentPage} of{" "}
                  <span title={String(totalPages || 1)}>
                    {formatCompactCount(totalPages || 1)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1 rounded-lg border"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {confirmDelete && (
        <ConfirmModal
          isOpen={Boolean(confirmDelete)}
          onClose={() => {
            if (!deleting) setConfirmDelete(null);
          }}
          onConfirm={confirmDeleteProduct}
          title="Delete Wholesale Product"
          message={`Are you sure you want to delete "${confirmDelete.title}"? This cannot be undone. If there are open orders (pending/approved/processing) on this product, delete will be blocked — reject or complete those requests first, or deactivate the product instead.`}
          confirmText={deleting ? "Deleting…" : "Delete"}
          cancelText="Cancel"
          type="danger"
          disabled={deleting}
        />
      )}
    </div>
  );
};

export default QuickOrderProducts;
