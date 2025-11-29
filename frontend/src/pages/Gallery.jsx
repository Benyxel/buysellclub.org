import React, { useState, useEffect } from "react";
import { FaTimes, FaSearch, FaFilter, FaStar, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import API from "../api";
import { toast } from "react-toastify";

const Gallery = () => {
  const [galleryItems, setGalleryItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchGalleryItems(1, true);
  }, []);

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1);
    fetchGalleryItems(1, true);
  }, [selectedCategory]);

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        // Client-side search for now (can be moved to server-side)
        filterItems();
      } else {
        setFilteredItems(galleryItems);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, galleryItems]);

  const fetchGalleryItems = async (page = 1, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Build query params
      const params = {
        page,
        limit: 12,
      };

      if (selectedCategory !== "all") {
        params.category = selectedCategory;
      }

      const resp = await API.get("/buysellapi/gallery/", { params });
      
      // Handle both old format (array) and new format (paginated)
      let newItems = [];
      let hasNext = false;
      let total = 0;

      if (resp.data.results) {
        // New paginated format
        newItems = resp.data.results;
        hasNext = resp.data.has_next || false;
        total = resp.data.count || 0;
      } else if (Array.isArray(resp.data)) {
        // Old format (array) - for backward compatibility
        newItems = resp.data;
        hasNext = false;
        total = newItems.length;
      }

      if (reset) {
        setGalleryItems(newItems);
        setFilteredItems(newItems);
      } else {
        setGalleryItems((prev) => [...prev, ...newItems]);
        setFilteredItems((prev) => [...prev, ...newItems]);
      }

      setHasMore(hasNext);
      setTotalItems(total);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching gallery items:", error);
      toast.error("Failed to load gallery images");
      if (reset) {
        setGalleryItems([]);
        setFilteredItems([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchGalleryItems(currentPage + 1, false);
    }
  };

  const filterItems = () => {
    // Filtering is now handled server-side, but we keep this for client-side search
    if (searchTerm) {
      const filtered = galleryItems.filter(
        (item) =>
          item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(galleryItems);
    }
  };

  // Get categories from current gallery items
  const categories = (() => {
    const cats = new Set();
    galleryItems.forEach((item) => {
      if (item.category) {
        cats.add(item.category);
      }
    });
    return Array.from(cats).sort();
  })();

  const openLightbox = (index) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = "auto";
  };

  const navigateImage = (direction) => {
    if (direction === "next") {
      setCurrentImageIndex((prev) =>
        prev < filteredItems.length - 1 ? prev + 1 : 0
      );
    } else {
      setCurrentImageIndex((prev) =>
        prev > 0 ? prev - 1 : filteredItems.length - 1
      );
    }
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (lightboxOpen) {
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowRight") navigateImage("next");
        if (e.key === "ArrowLeft") navigateImage("prev");
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [lightboxOpen, filteredItems.length]);

  const featuredItems = galleryItems.filter((item) => item.is_featured);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Loading gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full translate-x-1/2 translate-y-1/2"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 animate-fade-in">
              Our Gallery
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8">
              Explore our collection of beautiful images
            </p>
          </div>
        </div>
      </div>

      {/* Featured Section - Fetch separately */}
      {featuredItems.length > 0 && (
        <section className="py-12 bg-white dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-8">
              <FaStar className="text-yellow-500 text-2xl" />
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                Featured Images
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredItems.slice(0, 6).map((item, index) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
                  onClick={() => {
                    const itemIndex = filteredItems.findIndex(
                      (i) => i.id === item.id
                    );
                    if (itemIndex !== -1) openLightbox(itemIndex);
                  }}
                  onMouseEnter={() => setHoveredIndex(item.id)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-gray-200 dark:bg-gray-700">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://via.placeholder.com/400x300?text=Image+Not+Found";
                      }}
                    />
                  </div>
                  <div
                    className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
                      hoveredIndex === item.id ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-200 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      {item.category && (
                        <span className="inline-block mt-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-4 right-4">
                    <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <FaStar className="text-xs" />
                      Featured
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Filters and Search */}
      <section className="py-8 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search images..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <FaFilter className="text-gray-600 dark:text-gray-400" />
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                  selectedCategory === "all"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                    selectedCategory === category
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🖼️</div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                No images found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm || selectedCategory !== "all"
                  ? "Try adjusting your filters"
                  : "Gallery is empty"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item, index) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer bg-white dark:bg-gray-800"
                  onClick={() => openLightbox(index)}
                  onMouseEnter={() => setHoveredIndex(item.id)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="aspect-square overflow-hidden bg-gray-200 dark:bg-gray-700">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://via.placeholder.com/400x400?text=Image+Not+Found";
                      }}
                    />
                  </div>
                  <div
                    className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
                      hoveredIndex === item.id ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                      <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-200 line-clamp-2 mb-2">
                          {item.description}
                        </p>
                      )}
                      {item.category && (
                        <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.is_featured && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <FaStar className="text-xs" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center mt-12">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-3"
              >
                {loadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <span>Load More Images</span>
                    <FaChevronRight className="inline" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Show total count */}
          {totalItems > 0 && (
            <div className="text-center mt-8 text-gray-600 dark:text-gray-400">
              Showing {filteredItems.length} of {totalItems} images
            </div>
          )}
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxOpen && filteredItems[currentImageIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 p-3 bg-black/50 rounded-full hover:bg-black/70 transition-all"
          >
            <FaTimes className="text-2xl" />
          </button>

          <div
            className="relative max-w-7xl mx-auto px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Navigation Buttons */}
            {filteredItems.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage("prev");
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 p-4 bg-black/50 rounded-full hover:bg-black/70 transition-all"
                >
                  <FaChevronLeft className="text-2xl" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage("next");
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 p-4 bg-black/50 rounded-full hover:bg-black/70 transition-all"
                >
                  <FaChevronRight className="text-2xl" />
                </button>
              </>
            )}

            {/* Image */}
            <div className="relative">
              <img
                src={filteredItems[currentImageIndex].image_url}
                alt={filteredItems[currentImageIndex].title}
                className="max-h-[90vh] max-w-full object-contain rounded-lg"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://via.placeholder.com/800x600?text=Image+Not+Found";
                }}
              />
            </div>

            {/* Image Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-8 text-white">
              <div className="max-w-4xl mx-auto">
                <h3 className="text-3xl font-bold mb-2">
                  {filteredItems[currentImageIndex].title}
                </h3>
                {filteredItems[currentImageIndex].description && (
                  <p className="text-lg text-gray-200 mb-3">
                    {filteredItems[currentImageIndex].description}
                  </p>
                )}
                <div className="flex items-center gap-4">
                  {filteredItems[currentImageIndex].category && (
                    <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold">
                      {filteredItems[currentImageIndex].category}
                    </span>
                  )}
                  {filteredItems[currentImageIndex].is_featured && (
                    <span className="px-4 py-2 bg-yellow-500 rounded-full text-sm font-semibold flex items-center gap-2">
                      <FaStar /> Featured
                    </span>
                  )}
                  <span className="text-gray-300 text-sm">
                    {currentImageIndex + 1} / {filteredItems.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;


