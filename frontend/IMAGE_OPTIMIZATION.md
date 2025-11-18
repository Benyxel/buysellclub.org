# Image Optimization Guide

This document outlines the image optimization strategies implemented to improve site performance.

## Implemented Optimizations

### 1. **OptimizedImage Component**
- **Location**: `src/components/OptimizedImage.jsx`
- **Features**:
  - Lazy loading using Intersection Observer
  - Automatic preloading for critical images
  - Smooth fade-in transition
  - Error handling
  - Placeholder support

### 2. **Hero Section Preloading**
- First hero image is preloaded for faster initial render
- Uses browser's native `<link rel="preload">` API
- Critical images load with `loading="eager"`

### 3. **Vite Build Optimizations**
- Small images (< 4KB) are inlined as base64
- Image assets are organized in `assets/images/` directory
- Content-based hashing for better caching

### 4. **Vercel Cache Headers**
- Images cached for 1 year (31536000 seconds)
- Immutable cache headers for better performance

## Usage

### Basic Usage
```jsx
import OptimizedImage from './components/OptimizedImage';

<OptimizedImage
  src="/path/to/image.jpg"
  alt="Description"
  className="your-classes"
/>
```

### Preload Critical Images
```jsx
<OptimizedImage
  src="/hero-image.jpg"
  alt="Hero"
  preload={true}
  loading="eager"
/>
```

### Lazy Load (Default)
```jsx
<OptimizedImage
  src="/product-image.jpg"
  alt="Product"
  loading="lazy"  // Default, can be omitted
/>
```

## Best Practices

1. **Use OptimizedImage for all images** - Especially for product images, gallery images, etc.

2. **Preload critical images** - Only for above-the-fold images (hero, logo, etc.)

3. **Optimize source images**:
   - Use WebP format when possible (better compression)
   - Compress images before adding to project
   - Use appropriate image sizes (don't use 2000px images for thumbnails)

4. **Lazy load below-the-fold images** - Product lists, galleries, etc.

## Additional Recommendations

### For Production:
1. **Convert images to WebP**:
   ```bash
   # Using cwebp (WebP encoder)
   cwebp input.jpg -q 80 -o output.webp
   ```

2. **Use responsive images** (if needed):
   ```jsx
   <OptimizedImage
     src="/image.jpg"
     srcSet="/image-small.jpg 400w, /image-medium.jpg 800w, /image-large.jpg 1200w"
     sizes="(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px"
     alt="Description"
   />
   ```

3. **Consider using a CDN** for image delivery (Vercel automatically uses CDN)

4. **Monitor Core Web Vitals**:
   - Largest Contentful Paint (LCP) - should be < 2.5s
   - Cumulative Layout Shift (CLS) - should be < 0.1

## Performance Metrics

After implementing these optimizations, you should see:
- ✅ Faster initial page load
- ✅ Reduced bandwidth usage
- ✅ Better Core Web Vitals scores
- ✅ Improved user experience on slow connections

## Tools for Image Optimization

- **Online Tools**:
  - TinyPNG (https://tinypng.com/)
  - Squoosh (https://squoosh.app/)
  - ImageOptim (https://imageoptim.com/)

- **Command Line**:
  - `sharp-cli` - Image processing
  - `imagemin` - Image minification
  - `cwebp` - WebP conversion

