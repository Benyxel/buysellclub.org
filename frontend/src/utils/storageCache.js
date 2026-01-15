/**
 * Storage Cache Utility
 * Provides localStorage-based caching with expiration
 */

const CACHE_PREFIX = 'cache_';
const DEFAULT_MAX_AGE = 3600000; // 1 hour

/**
 * Get cached data from localStorage
 */
export const storageCache = {
  get: (key, maxAge = DEFAULT_MAX_AGE) => {
    try {
      const item = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!item) return null;
      
      const { data, timestamp } = JSON.parse(item);
      const age = Date.now() - timestamp;
      
      if (age > maxAge) {
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  },
  
  set: (key, data) => {
    try {
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to cache data:', error);
      // If storage is full, try to clear old cache entries
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing old cache');
        storageCache.clear();
        // Try again
        try {
          localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({
            data,
            timestamp: Date.now(),
          }));
        } catch (e) {
          console.error('Failed to cache data after clearing:', e);
        }
      }
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (error) {
      console.error('Failed to remove cached data:', error);
    }
  },
  
  clear: (pattern) => {
    try {
      if (!pattern) {
        // Clear all cache keys
        Object.keys(localStorage)
          .filter(key => key.startsWith(CACHE_PREFIX))
          .forEach(key => localStorage.removeItem(key));
      } else {
        Object.keys(localStorage)
          .filter(key => key.startsWith(`${CACHE_PREFIX}${pattern}`))
          .forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  },
  
  /**
   * Get all cache keys (for debugging)
   */
  getKeys: () => {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(CACHE_PREFIX))
      .map(key => key.replace(CACHE_PREFIX, ''));
  },
};

export default storageCache;

