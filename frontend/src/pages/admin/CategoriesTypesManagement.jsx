import React, { useEffect, useState } from "react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getProductTypes,
  createProductType,
  updateProductType,
  deleteProductType,
} from "../../api";
import { toast } from "react-toastify";
import { FaPlus, FaEdit, FaTrash, FaTimes, FaCheck } from "react-icons/fa";

const initialCategoryForm = {
  name: "",
  description: "",
  is_active: true,
  order: 100,
};

const initialTypeForm = {
  name: "",
  description: "",
  is_active: true,
  order: 100,
};

export default function CategoriesTypesManagement() {
  const [categories, setCategories] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("categories"); // 'categories' or 'types'
  
  // Category state
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  
  // Product Type state
  const [typeForm, setTypeForm] = useState(initialTypeForm);
  const [editingType, setEditingType] = useState(null);
  const [showTypeForm, setShowTypeForm] = useState(false);

  const loadCategories = async () => {
    try {
      const resp = await getCategories();
      // Handle both array and paginated response
      const items = Array.isArray(resp.data) 
        ? resp.data 
        : (resp.data?.results || []);
      setCategories(items);
    } catch (err) {
      console.error("Failed to load categories", err);
      // Only show error for actual failures (4xx/5xx), not for empty data
      const status = err.response?.status;
      if (status && status >= 400) {
        const errorMsg = err.response?.data?.detail || err.message || "Failed to load categories";
        toast.error(errorMsg, { toastId: "load-categories-error" });
      }
      setCategories([]); // Set empty array on error
    }
  };

  const loadProductTypes = async () => {
    try {
      const resp = await getProductTypes();
      // Handle both array and paginated response
      const items = Array.isArray(resp.data) 
        ? resp.data 
        : (resp.data?.results || []);
      setProductTypes(items);
    } catch (err) {
      console.error("Failed to load product types", err);
      // Only show error for actual failures (4xx/5xx), not for empty data
      const status = err.response?.status;
      if (status && status >= 400) {
        const errorMsg = err.response?.data?.detail || err.message || "Failed to load product types";
        toast.error(errorMsg, { toastId: "load-types-error" });
      }
      setProductTypes([]); // Set empty array on error
    }
  };

  const load = async () => {
    setLoading(true);
    await Promise.all([loadCategories(), loadProductTypes()]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Category handlers
  const handleCategoryChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCategoryForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.name || categoryForm.name.trim() === "") {
      toast.error("Category name is required");
      return;
    }

    try {
      // Prepare payload - exclude slug as it's auto-generated
      const payload = {
        name: categoryForm.name.trim(),
        description: categoryForm.description || "",
        is_active: categoryForm.is_active,
        order: categoryForm.order || 100,
      };

      if (editingCategory) {
        await updateCategory(editingCategory.slug, payload);
        toast.success("Category updated successfully!");
      } else {
        await createCategory(payload);
        toast.success("Category created successfully!");
      }
      resetCategoryForm();
      loadCategories();
    } catch (err) {
      console.error("Failed to save category", err);
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.name?.[0] ||
        err.response?.data?.message ||
        "Failed to save category";
      toast.error(errorMsg);
    }
  };

  const handleCategoryEdit = (category) => {
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      is_active: category.is_active,
      order: category.order || 100,
    });
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleCategoryDelete = async (category) => {
    if (!window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      await deleteCategory(category.slug);
      toast.success("Category deleted successfully!");
      loadCategories();
    } catch (err) {
      console.error("Failed to delete category", err);
      toast.error("Failed to delete category");
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm(initialCategoryForm);
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  // Product Type handlers
  const handleTypeChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTypeForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const handleTypeSubmit = async (e) => {
    e.preventDefault();
    if (!typeForm.name || typeForm.name.trim() === "") {
      toast.error("Product type name is required");
      return;
    }

    try {
      // Prepare payload - exclude slug as it's auto-generated
      const payload = {
        name: typeForm.name.trim(),
        description: typeForm.description || "",
        is_active: typeForm.is_active,
        order: typeForm.order || 100,
      };

      if (editingType) {
        await updateProductType(editingType.slug, payload);
        toast.success("Product type updated successfully!");
      } else {
        await createProductType(payload);
        toast.success("Product type created successfully!");
      }
      resetTypeForm();
      loadProductTypes();
    } catch (err) {
      console.error("Failed to save product type", err);
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.name?.[0] ||
        err.response?.data?.message ||
        "Failed to save product type";
      toast.error(errorMsg);
    }
  };

  const handleTypeEdit = (type) => {
    setTypeForm({
      name: type.name,
      description: type.description || "",
      is_active: type.is_active,
      order: type.order || 100,
    });
    setEditingType(type);
    setShowTypeForm(true);
  };

  const handleTypeDelete = async (type) => {
    if (!window.confirm(`Are you sure you want to delete "${type.name}"?`)) {
      return;
    }

    try {
      await deleteProductType(type.slug);
      toast.success("Product type deleted successfully!");
      loadProductTypes();
    } catch (err) {
      console.error("Failed to delete product type", err);
      toast.error("Failed to delete product type");
    }
  };

  const resetTypeForm = () => {
    setTypeForm(initialTypeForm);
    setEditingType(null);
    setShowTypeForm(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Categories & Product Types Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage product categories and types for your shop
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2 font-medium ${
              activeTab === "categories"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab("types")}
            className={`px-4 py-2 font-medium ${
              activeTab === "types"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Product Types
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      ) : (
        <>
          {/* Categories Tab */}
          {activeTab === "categories" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Categories ({categories.length})
                </h2>
                <button
                  onClick={() => {
                    resetCategoryForm();
                    setShowCategoryForm(true);
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                >
                  <FaPlus /> Add Category
                </button>
              </div>

              {/* Category Form */}
              {showCategoryForm && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {editingCategory ? "Edit Category" : "Add New Category"}
                    </h3>
                    <button
                      onClick={resetCategoryForm}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <FaTimes />
                    </button>
                  </div>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={categoryForm.name}
                        onChange={handleCategoryChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={categoryForm.description}
                        onChange={handleCategoryChange}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Order
                        </label>
                        <input
                          type="number"
                          name="order"
                          value={categoryForm.order}
                          onChange={handleCategoryChange}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div className="flex items-center pt-8">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="is_active"
                            checked={categoryForm.is_active}
                            onChange={handleCategoryChange}
                            className="w-4 h-4 text-primary rounded focus:ring-primary"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Active
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                      >
                        <FaCheck /> {editingCategory ? "Update" : "Create"}
                      </button>
                      <button
                        type="button"
                        onClick={resetCategoryForm}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Categories List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          No categories found. Create your first category!
                        </td>
                      </tr>
                    ) : (
                      categories.map((category) => (
                        <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {category.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {category.description || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {category.order}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                category.is_active
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              }`}
                            >
                              {category.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleCategoryEdit(category)}
                              className="text-primary hover:text-primary/80 mr-4"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleCategoryDelete(category)}
                              className="text-red-600 hover:text-red-800"
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
          )}

          {/* Product Types Tab */}
          {activeTab === "types" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Product Types ({productTypes.length})
                </h2>
                <button
                  onClick={() => {
                    resetTypeForm();
                    setShowTypeForm(true);
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                >
                  <FaPlus /> Add Product Type
                </button>
              </div>

              {/* Product Type Form */}
              {showTypeForm && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {editingType ? "Edit Product Type" : "Add New Product Type"}
                    </h3>
                    <button
                      onClick={resetTypeForm}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <FaTimes />
                    </button>
                  </div>
                  <form onSubmit={handleTypeSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={typeForm.name}
                        onChange={handleTypeChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={typeForm.description}
                        onChange={handleTypeChange}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Order
                        </label>
                        <input
                          type="number"
                          name="order"
                          value={typeForm.order}
                          onChange={handleTypeChange}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div className="flex items-center pt-8">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="is_active"
                            checked={typeForm.is_active}
                            onChange={handleTypeChange}
                            className="w-4 h-4 text-primary rounded focus:ring-primary"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Active
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                      >
                        <FaCheck /> {editingType ? "Update" : "Create"}
                      </button>
                      <button
                        type="button"
                        onClick={resetTypeForm}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Product Types List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {productTypes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          No product types found. Create your first product type!
                        </td>
                      </tr>
                    ) : (
                      productTypes.map((type) => (
                        <tr key={type.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {type.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {type.description || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {type.order}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                type.is_active
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              }`}
                            >
                              {type.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleTypeEdit(type)}
                              className="text-primary hover:text-primary/80 mr-4"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleTypeDelete(type)}
                              className="text-red-600 hover:text-red-800"
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
          )}
        </>
      )}
    </div>
  );
}

