import React, { useState, useRef, useEffect } from 'react';

/**
 * OptimizedImage Component
 * - Lazy loads images for better performance
 * - Shows placeholder while loading
 * - Handles error states
 * - Supports preloading for critical images
 */
const OptimizedImage = ({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E',
  loading = 'lazy',
  preload = false,
  onLoad,
  onError,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    // If preload is true, load immediately
    if (preload) {
      loadImage();
      return;
    }

    // Otherwise, use Intersection Observer for lazy loading
    if (loading === 'lazy' && 'IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              loadImage();
              if (observerRef.current && imgRef.current) {
                observerRef.current.unobserve(imgRef.current);
              }
            }
          });
        },
        {
          rootMargin: '50px', // Start loading 50px before image enters viewport
        }
      );

      if (imgRef.current) {
        observerRef.current.observe(imgRef.current);
      }
    } else {
      // Fallback for browsers without IntersectionObserver
      loadImage();
    }

    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current);
      }
    };
  }, [src, preload, loading]);

  const loadImage = () => {
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      if (onLoad) onLoad();
    };

    img.onerror = () => {
      setHasError(true);
      if (onError) onError();
    };

    img.src = src;
  };

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-50'} transition-opacity duration-300`}
      loading={preload ? 'eager' : loading}
      decoding="async"
      style={{ 
        backgroundColor: hasError ? '#f3f4f6' : 'transparent',
        ...props.style 
      }}
      {...props}
    />
  );
};

export default OptimizedImage;

