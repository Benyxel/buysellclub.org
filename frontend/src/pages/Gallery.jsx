import React, { useEffect, useState } from "react";
import { getGalleryImages } from "../api";
import { toast } from "react-toastify";
import { FaImage, FaSpinner } from "react-icons/fa";

export default function Gallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    setLoading(true);
    try {
      const resp = await getGalleryImages({});
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

  const openLightbox = (image) => {
    setSelectedImage(image);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      closeLightbox();
    } else if (e.key === "ArrowLeft" && selectedImage) {
      const currentIndex = images.findIndex((img) => img.id === selectedImage.id);
      if (currentIndex > 0) {
        setSelectedImage(images[currentIndex - 1]);
      }
    } else if (e.key === "ArrowRight" && selectedImage) {
      const currentIndex = images.findIndex((img) => img.id === selectedImage.id);
      if (currentIndex < images.length - 1) {
        setSelectedImage(images[currentIndex + 1]);
      }
    }
  };

  useEffect(() => {
    if (selectedImage) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedImage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-6xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">Loading gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Gallery
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Explore our collection of images
          </p>
        </div>

        {images.length === 0 ? (
          <div className="text-center py-20">
            <FaImage className="mx-auto text-gray-400 text-8xl mb-6" />
            <p className="text-gray-600 dark:text-gray-400 text-xl">
              No images available at the moment.
            </p>
          </div>
        ) : (
          <>
            {/* Gallery Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer bg-white dark:bg-gray-800"
                  onClick={() => openLightbox(image)}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                  }}
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={image.image_url}
                      alt={image.title || `Gallery image ${image.id}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      {image.title && (
                        <h3 className="font-semibold text-lg mb-1">{image.title}</h3>
                      )}
                      {image.description && (
                        <p className="text-sm text-gray-200 line-clamp-2">
                          {image.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Lightbox Modal */}
            {selectedImage && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
                onClick={closeLightbox}
              >
                <div
                  className="relative max-w-7xl max-h-[90vh] mx-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={closeLightbox}
                    className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors text-2xl font-bold"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                  <img
                    src={selectedImage.image_url}
                    alt={selectedImage.title || "Gallery image"}
                    className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                  />
                  {(selectedImage.title || selectedImage.description) && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
                      {selectedImage.title && (
                        <h3 className="text-white text-2xl font-semibold mb-2">
                          {selectedImage.title}
                        </h3>
                      )}
                      {selectedImage.description && (
                        <p className="text-gray-200">{selectedImage.description}</p>
                      )}
                    </div>
                  )}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentIndex = images.findIndex(
                            (img) => img.id === selectedImage.id
                          );
                          if (currentIndex > 0) {
                            setSelectedImage(images[currentIndex - 1]);
                          }
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors backdrop-blur-sm"
                        aria-label="Previous image"
                      >
                        ←
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentIndex = images.findIndex(
                            (img) => img.id === selectedImage.id
                          );
                          if (currentIndex < images.length - 1) {
                            setSelectedImage(images[currentIndex + 1]);
                          }
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors backdrop-blur-sm"
                        aria-label="Next image"
                      >
                        →
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

