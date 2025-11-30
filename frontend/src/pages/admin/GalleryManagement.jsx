import React, { useEffect, useState } from "react";
import {
  getAdminGalleryImages,
  createGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
} from "../../api";
import { toast } from "react-toastify";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaImage,
  FaTimes,
  FaCheck,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";

const initialForm = {
  title: "",
  description: "",
  image: null,
  order: 0,
  is_active: true,
};

export default function GalleryManagement() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await getAdminGalleryImages({});
      const items = Array.isArray(
        resp.data.results ? resp.data.results : resp.data
      )
        ? resp.data.results
          ? resp.data.results
          : resp.data
        : [];
      setImages(items);
    } catch (err) {
      console.error("Failed to load gallery images", err);
      toast.error("Failed to load gallery images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (name === "image" && files && files[0]) {
      const file = files[0];
      setForm({ ...form, image: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      const newValue = type === "checkbox" ? checked : value;
      setForm({ ...form, [name]: newValue });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("order", form.order);
      formData.append("is_active", form.is_active);
      
      if (form.image) {
        formData.append("image", form.image);
      }

      if (editing) {
        await updateGalleryImage(editing.id, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("Gallery image updated successfully");
      } else {
        await createGalleryImage(formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("Gallery image added successfully");
      }

      resetForm();
      load();
    } catch (err) {
      console.error("Failed to save gallery image", err);
      const errorData = err.response?.data;
      if (errorData) {
        setErrors(errorData);
        toast.error(
          errorData.detail || errorData.message || "Failed to save gallery image"
        );
      } else {
        toast.error("Failed to save gallery image");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (image) => {
    setEditing(image);
    setForm({
      title: image.title || "",
      description: image.description || "",
      image: null,
      order: image.order || 0,
      is_active: image.is_active !== undefined ? image.is_active : true,
    });
    setPreview(image.image_url || null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this image?")) {
      return;
    }

    try {
      await deleteGalleryImage(id);
      toast.success("Gallery image deleted successfully");
      load();
    } catch (err) {
      console.error("Failed to delete gallery image", err);
      toast.error("Failed to delete gallery image");
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditing(null);
    setPreview(null);
    setErrors({});
    setShowForm(false);
  };

  const handleCancel = () => {
    resetForm();
  };

  const moveOrder = async (image, direction) => {
    const newOrder = direction === "up" ? image.order - 1 : image.order + 1;
    try {
      const formData = new FormData();
      formData.append("title", image.title);
      formData.append("description", image.description);
      formData.append("order", newOrder);
      formData.append("is_active", image.is_active);
      
      await updateGalleryImage(image.id, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Order updated");
      load();
    } catch (err) {
      console.error("Failed to update order", err);
      toast.error("Failed to update order");
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
            Gallery Management
          </h2>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <FaPlus /> Add Image
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              {editing ? "Edit Image" : "Add New Image"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Image title"
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Image description"
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Image {!editing && "*"}
                </label>
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                {preview && (
                  <div className="mt-4">
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-w-xs h-auto rounded-lg shadow-md"
                    />
                  </div>
                )}
                {errors.image && (
                  <p className="text-red-500 text-sm mt-1">{errors.image}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  name="order"
                  value={form.order}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="0"
                />
                {errors.order && (
                  <p className="text-red-500 text-sm mt-1">{errors.order}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active (visible on frontend)
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Saving..." : editing ? "Update" : "Add Image"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading images...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <FaImage className="mx-auto text-gray-400 text-6xl mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No gallery images yet. Add your first image!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image) => (
              <div
                key={image.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="relative">
                  <img
                    src={image.image_url}
                    alt={image.title || `Gallery image ${image.id}`}
                    className="w-full h-64 object-cover"
                  />
                  {!image.is_active && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
                      Inactive
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                    {image.title || "Untitled"}
                  </h3>
                  {image.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {image.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <span>Order: {image.order}</span>
                    <span>
                      {new Date(image.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(image)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded transition-colors text-sm"
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(image.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded transition-colors text-sm"
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => moveOrder(image, "up")}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded transition-colors text-sm"
                      title="Move up"
                    >
                      <FaArrowUp /> Up
                    </button>
                    <button
                      onClick={() => moveOrder(image, "down")}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded transition-colors text-sm"
                      title="Move down"
                    >
                      <FaArrowDown /> Down
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

