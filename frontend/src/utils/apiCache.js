/**
 * API Cache Utility
 * Provides in-memory caching and request deduplication for API calls
 */

const cache = new Map();
export const CACHE_DURATION = {
  SHORT: 30000,      // 30 seconds - for frequently changing data
  MEDIUM: 300000,    // 5 minutes - for semi-static data
  LONG: 1800000,     // 30 minutes - for static data
  VERY_LONG: 3600000, // 1 hour - for rarely changing data
};

/**
 * Get cached data if it exists and is not expired
 */
export const getCachedData = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > cached.duration) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
};

/**
 * Set data in cache with expiration duration
 */
export const setCachedData = (key, data, duration = CACHE_DURATION.MEDIUM) => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    duration,
  });
};

/**
 * Clear cache entries matching a pattern or all cache
 */
export const clearCache = (pattern) => {
  if (!pattern) {
    cache.clear();
    return;
  }
  
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

/**
 * Request deduplication - prevents multiple identical requests
 */
const pendingRequests = new Map();

export const deduplicateRequest = async (key, requestFn) => {
  // If request is already pending, return the same promise
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }
  
  // Check cache first
  const cached = getCachedData(key);
  if (cached) {
    return Promise.resolve(cached);
  }
  
  // Make request
  const promise = requestFn()
    .then((data) => {
      // Cache successful responses
      if (data && data.data !== undefined) {
        setCachedData(key, data);
      }
      pendingRequests.delete(key);
      return data;
    })
    .catch((error) => {
      pendingRequests.delete(key);
      throw error;
    });
  
  pendingRequests.set(key, promise);
  return promise;
};

/**
 * Invalidate cache for a specific key or pattern
 */
export const invalidateCache = (pattern) => {
  clearCache(pattern);
};

/**
 * Get cache statistics (for debugging)
 */
export const getCacheStats = () => {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
};


