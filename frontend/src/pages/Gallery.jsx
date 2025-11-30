import React, { useEffect, useState } from "react";
import {
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaImage,
  FaSpinner,
} from "react-icons/fa";

// Use Vite env var for API base URL if present
const apiBase = import.meta.env.VITE_API_BASE_URL || "";

function Gallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 12;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const base = apiBase.replace(/\/$/, "");
        const url = base
          ? `${base}/buysellapi/gallery/?page=${currentPage}&page_size=${pageSize}`
          : `/buysellapi/gallery/?page=${currentPage}&page_size=${pageSize}`;
        const r = await fetch(url, { credentials: "include" });
        if (!mounted) return;
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        const data = await r.json();
        if (data.results) {
          setImages(data.results);
          setTotalCount(data.count || 0);
          setTotalPages(data.total_pages || 1);
        } else if (Array.isArray(data)) {
          setImages(data);
          setTotalCount(data.length);
          setTotalPages(1);
        }
      } catch (e) {
        console.debug("Gallery API load failed:", e?.message || e);
        setError("Failed to load gallery images");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [currentPage]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex < 0) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setLightboxIndex(-1);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((i) => (i - 1 + images.length) % images.length);
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((i) => (i + 1) % images.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, images.length]);

  const openLightbox = (idx) => setLightboxIndex(idx);
  const closeLightbox = () => setLightboxIndex(-1);
  const next = () => setLightboxIndex((i) => (i + 1) % images.length);
  const prev = () =>
    setLightboxIndex((i) => (i - 1 + images.length) % images.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              Our Gallery
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-2">
              Explore our collection of beautiful moments
            </p>
            {totalCount > 0 && (
              <p className="text-sm text-blue-200">
                {totalCount} {totalCount === 1 ? "image" : "images"} available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <FaSpinner className="text-6xl text-blue-600 dark:text-blue-400 animate-spin mb-4" />
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Loading gallery...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="max-w-md mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaImage className="text-2xl text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Unable to Load Gallery
            </h3>
            <p className="text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && images.length === 0 && (
          <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaImage className="text-4xl text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-white mb-3">
              No Images Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              The gallery is currently empty.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Admins can add images via the admin dashboard.
            </p>
          </div>
        )}

        {/* Gallery Grid */}
        {!loading && !error && images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
            {images.map((it, idx) => {
              const src = it.image;
              const title = it.title || "";
              return (
                <div
                  key={it.id || idx}
                  className="group relative overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  onClick={() => openLightbox(idx)}
                >
                  {/* Image Container */}
                  <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <img
                      src={src}
                      alt={title || `Gallery image ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    {/* Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Title Overlay */}
                    {title && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <p className="text-white text-xs font-medium line-clamp-2">
                          {title}
                        </p>
                      </div>
                    )}

                    {/* View Icon on Hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <FaImage className="text-lg text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Title Below Image (Desktop) */}
                  {title && (
                    <div className="p-1.5 hidden sm:block">
                      <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1">
                        {title}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-8 mb-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              Next
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex >= 0 && images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 md:top-6 md:right-6 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white text-2xl transition-all duration-200 hover:scale-110"
            aria-label="Close"
          >
            <FaTimes />
          </button>

          {/* Image Container */}
          <div className="relative max-w-7xl w-full mx-4 md:mx-8">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              {/* Main Image */}
              <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                <img
                  src={images[lightboxIndex].image}
                  alt={
                    images[lightboxIndex].title ||
                    `Gallery image ${lightboxIndex + 1}`
                  }
                  className="w-full max-h-[85vh] object-contain mx-auto"
                />
              </div>

              {/* Title */}
              {images[lightboxIndex].title && (
                <div className="mt-4 text-center">
                  <p className="text-white text-lg md:text-xl font-medium px-4">
                    {images[lightboxIndex].title}
                  </p>
                </div>
              )}

              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium">
                  {lightboxIndex + 1} / {images.length}
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white text-xl md:text-2xl transition-all duration-200 hover:scale-110"
                  aria-label="Previous image"
                >
                  <FaChevronLeft />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white text-xl md:text-2xl transition-all duration-200 hover:scale-110"
                  aria-label="Next image"
                >
                  <FaChevronRight />
                </button>
              </>
            )}
          </div>

          {/* Keyboard Hint */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full">
              Use ← → arrow keys or click buttons to navigate
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Gallery;
