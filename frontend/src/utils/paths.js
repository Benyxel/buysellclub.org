/**
 * Utility functions for handling paths with base path support
 * For GitHub Pages deployment with subdirectory base path
 */

// Get the base path from environment variable (set during build)
const BASE_PATH = import.meta.env.VITE_BASE_PATH || '/buysellclubproject';

/**
 * Get the base path
 * @returns {string} The base path (e.g., '/buysellclubproject' or '/')
 */
export const getBasePath = () => BASE_PATH;

/**
 * Convert a public asset path to include the base path
 * Use this for assets in the public folder
 * @param {string} path - Path starting with '/' (e.g., '/buysellt.jpg')
 * @returns {string} Path with base path prepended
 */
export const getPublicAssetPath = (path) => {
  if (!path || typeof path !== 'string') return path;
  
  // If path is already absolute URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // If path starts with '/', prepend base path
  if (path.startsWith('/')) {
    // Remove leading slash, add base path, ensure single slash
    const cleanPath = path.slice(1);
    const base = BASE_PATH === '/' ? '' : BASE_PATH.replace(/\/$/, '');
    return `${base}/${cleanPath}`;
  }
  
  // Relative path, return as is (Vite will handle it)
  return path;
};

/**
 * Get placeholder image path
 * @returns {string} Path to placeholder image
 */
export const getPlaceholderImagePath = () => {
  return getPublicAssetPath('/placeholder-image.png');
};

