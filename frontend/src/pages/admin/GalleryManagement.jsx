import React, { useState, useEffect } from "react";
import API from "../../api";
import { toast } from "react-toastify";
import { FaTrash, FaUpload, FaSpinner, FaImage, FaPlus, FaTimes, FaChevronLeft, FaChevronRight } from "react-icons/fa";

const GalleryManagement = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 12;

  useEffect(() => {
    loadImages();
  }, [currentPage]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const response = await API.get(`/buysellapi/gallery/?page=${currentPage}&page_size=${pageSize}`);
      // Handle paginated response or plain array
      if (response.data && response.data.results) {
        setImages(response.data.results || []);
        setTotalCount(response.data.count || 0);
        setTotalPages(response.data.total_pages || 1);
      } else if (Array.isArray(response.data)) {
        setImages(response.data);
        setTotalCount(response.data.length);
        setTotalPages(1);
      } else {
        setImages([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error loading images:", error);
      // Only show error for actual failures (4xx/5xx), not for empty data
      const status = error.response?.status;
      if (status && status >= 400) {
        const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message || "Failed to load images";
        toast.error(errorMsg, { toastId: "load-images-error" });
      }
      setImages([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("Image size should be less than 10MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSave = async () => {
    if (!file) {
      toast.error("Please select an image");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      if (title.trim()) {
        formData.append("title", title.trim());
      }

      await API.post("/buysellapi/gallery/upload/", formData);
      toast.success("Image saved successfully!");
      
      setFile(null);
      setTitle("");
      setShowModal(false);
      document.getElementById("file-input").value = "";
      loadImages();
    } catch (error) {
      console.error("Error saving image:", error);
      toast.error(error.response?.data?.error || "Failed to save image");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (img) => {
    setImageToDelete(img);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!imageToDelete) return;

    setDeleting(true);
    try {
      await API.delete(`/buysellapi/gallery/${imageToDelete.id}/delete/`);
      toast.success("Image deleted successfully");
      setShowDeleteModal(false);
      setImageToDelete(null);
      // Reset to page 1 if current page becomes empty after deletion
      if (images.length === 1 && currentPage > 1) {
        setCurrentPage(1);
      } else {
        loadImages();
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to delete image";
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setImageToDelete(null);
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Gallery Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your gallery images
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg font-medium"
        >
          <FaPlus />
          Add New Image
        </button>
      </div>

      {/* Modal Popup */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setFile(null);
              setTitle("");
              document.getElementById("file-input")?.value && (document.getElementById("file-input").value = "");
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md transform transition-all">
            <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                Add New Image
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setFile(null);
                  setTitle("");
                  document.getElementById("file-input")?.value && (document.getElementById("file-input").value = "");
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Image File <span className="text-red-500">*</span>
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-300 file:cursor-pointer"
                />
                {file && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter image title"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!file || uploading}
                  className="flex-1 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg transition-all"
                >
                  {uploading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaUpload />
                      Save Image
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setFile(null);
                    setTitle("");
                    document.getElementById("file-input")?.value && (document.getElementById("file-input").value = "");
                  }}
                  className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && imageToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) {
              handleDeleteCancel();
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md transform transition-all">
            <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                Delete Image
              </h3>
              <button
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <FaTrash className="text-2xl text-red-600 dark:text-red-400" />
                </div>
                <p className="text-gray-800 dark:text-white font-medium text-center mb-2">
                  Are you sure you want to delete this image?
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  This action cannot be undone.
                </p>
                {imageToDelete.title && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 text-center">
                    Title: {imageToDelete.title}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                  className="flex-1 px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg transition-all"
                >
                  {deleting ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FaTrash />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Images Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Gallery Images
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
            {totalCount} {totalCount === 1 ? 'image' : 'images'} total
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <FaSpinner className="animate-spin text-4xl text-blue-600 dark:text-blue-400" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <FaImage className="text-5xl text-gray-400 dark:text-gray-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">No images yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Click "Add New Image" to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <img
                    src={img.image}
                    alt={img.title || `Image ${img.id}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 flex items-center justify-center">
                    <button
                      onClick={() => handleDeleteClick(img)}
                      className="opacity-0 group-hover:opacity-100 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-opacity duration-200 shadow-lg"
                      title="Delete image"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                </div>
                {img.title && (
                  <div className="p-2">
                    <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 truncate">
                      {img.title}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-6">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <FaChevronLeft />
              Previous
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-4 py-2 rounded-lg transition-colors shadow-md hover:shadow-lg ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              Next
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryManagement;

