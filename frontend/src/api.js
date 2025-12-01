import axios from "axios";

/**
 * Frontend API client
 * -------------------
 * This file was rewritten to provide a single, predictable way of talking to
 * the backend. Everything goes through the same axios instance so we avoid
 * accidental GET/POST mismatches (which were causing the 405 errors) and we
 * always apply the same auth / CSRF / error handling logic.
 *
 * Usage:
 *   import api, { Api } from "@/api";
 *   await api.get("/buysellapi/products/");
 *   await Api.auth.login({ username, password });
 *
 * Legacy helpers are still exported at the bottom for backwards compatibility.
 */

// ---------------------------------------------------------------------------
// Base URL resolution
// ---------------------------------------------------------------------------
const resolveBaseUrl = () => {
  const candidates = [
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_API_BASE_URL
      : undefined,
    typeof process !== "undefined" ? process.env?.VITE_API_BASE_URL : undefined,
    typeof window !== "undefined"
      ? window.__ENV__?.VITE_API_BASE_URL
      : undefined,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim() !== "") {
      return candidate.trim().replace(/\/+$/, "");
    }
  }

  // Default to relative paths so Vite proxy (localhost:5173 -> :8000) keeps working.
  return "";
};

const BASE_URL = resolveBaseUrl();

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
const normalizePath = (path = "") => {
  if (typeof path !== "string" || path.length === 0) {
    throw new Error("API path must be a non-empty string.");
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return path.startsWith("/") ? path : `/${path}`;
};

const getCookie = (name) => {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return decodeURIComponent(trimmed.substring(name.length + 1));
    }
  }
  return null;
};

// Simple request cache for GET requests (5 second TTL)
const requestCache = new Map();
const CACHE_TTL = 5000; // 5 seconds

const getCacheKey = (method, url, params) => {
  const paramsStr = params ? JSON.stringify(params) : "";
  return `${method}:${url}:${paramsStr}`;
};

// Expose getCacheKey globally in the browser to avoid ReferenceError
// in production bundles that may reference it without proper imports.
if (typeof window !== "undefined") {
  try {
    window.getCacheKey = getCacheKey;
  } catch (e) {
    // ignore if environment prevents attaching to window
  }
}

const getCachedResponse = (key) => {
  const cached = requestCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  requestCache.delete(key);
  return null;
};

const setCachedResponse = (key, data) => {
  requestCache.set(key, {
    data,
    timestamp: Date.now(),
  });
  // Clean up old cache entries periodically
  if (requestCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of requestCache.entries()) {
      if (now - v.timestamp > CACHE_TTL) {
        requestCache.delete(k);
      }
    }
  }
};

// ---------------------------------------------------------------------------
// Axios client
// ---------------------------------------------------------------------------
const api = axios.create({
  baseURL: BASE_URL || undefined,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    // Note: Browsers automatically handle Connection: keep-alive, we cannot set it manually
  },
  timeout: 15000, // Reduced from 30s to 15s for faster failure detection
  maxRedirects: 5,
  // Browser automatically handles connection pooling and keep-alive
});

api.interceptors.request.use(
  (config) => {
    // Ensure headers object always exists
    if (!config.headers) {
      config.headers = {};
    }

    // Ensure headers is a plain object (not undefined/null)
    if (typeof config.headers !== "object" || config.headers === null) {
      config.headers = {};
    }

    const token =
      localStorage.getItem("token") || localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const unsafeMethods = new Set(["post", "put", "patch", "delete"]);
    if (unsafeMethods.has((config.method || "").toLowerCase())) {
      const csrfToken = getCookie("csrftoken");
      if (csrfToken) {
        config.headers["X-CSRFToken"] = csrfToken;
      }
    }

    // If sending FormData, let the browser/axios set the Content-Type header
    // (it must include the multipart boundary). The axios instance has a
    // default Content-Type of application/json which would break multipart.
    try {
      if (typeof FormData !== "undefined" && config.data instanceof FormData) {
        if (config.headers && config.headers["Content-Type"]) {
          delete config.headers["Content-Type"];
        }
      }
    } catch (e) {
      // Ignore environment where FormData isn't defined
    }

    config.withCredentials = true;
    config.url = normalizePath(config.url);

    // Store cache key for response interceptor (for GET requests)
    if ((config.method || "get").toLowerCase() === "get" && !config.skipCache) {
      const paramsStr = config.params ? JSON.stringify(config.params) : "";
      config.__cacheKey = `${config.method}:${config.url}:${paramsStr}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses (only if not already cached)
    if (
      response.config?.__cacheKey &&
      response.status === 200 &&
      !response.config.__cached
    ) {
      const key = response.config.__cacheKey;
      const cached = requestCache.get(key);
      if (!cached || Date.now() - cached.timestamp >= CACHE_TTL) {
        requestCache.set(key, {
          data: response.data,
          timestamp: Date.now(),
        });
        // Clean up old cache entries periodically
        if (requestCache.size > 100) {
          const now = Date.now();
          for (const [k, v] of requestCache.entries()) {
            if (now - v.timestamp > CACHE_TTL) {
              requestCache.delete(k);
            }
          }
        }
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const url = originalRequest.url || "";

    // Suppress console errors for expected 404s on shipping-marks/me endpoint
    // This is normal when a user doesn't have a shipping mark yet
    if (
      status === 404 &&
      url.includes("/buysellapi/shipping-marks/me/") &&
      error.response?.data?.message?.includes("No shipping mark")
    ) {
      // This is expected - user doesn't have a shipping mark yet
      // Return the error but don't log it as it's handled by the calling code
      return Promise.reject(error);
    }

    // Auto refresh tokens on 401 once.
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken) {
        try {
          const refreshResp = await axios.post(
            `${BASE_URL || ""}/buysellapi/token/refresh/`,
            { refresh: refreshToken },
            { withCredentials: true }
          );
          const { access } = refreshResp.data || {};
          if (access) {
            localStorage.setItem("token", access);
            // Ensure headers object exists and is a plain object
            if (
              !originalRequest.headers ||
              typeof originalRequest.headers !== "object"
            ) {
              originalRequest.headers = {};
            }
            originalRequest.headers.Authorization = `Bearer ${access}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          localStorage.removeItem("token");
          localStorage.removeItem("adminToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("userData");
        }
      }
    }

    return Promise.reject(error);
  }
);

// Persistent localStorage-backed cache helpers for GET requests.
const PERSISTENT_CACHE_KEY = "api_cache_v1";
const ADMIN_CACHE_VERSION_KEY = "admin_cache_version";
const DEFAULT_PERSISTENT_TTL = 2 * 60 * 1000; // 2 minutes
const ADMIN_CACHE_TTL = Infinity; // Admin data never expires unless invalidated

// Admin cache version - increment this when admin data changes
let adminCacheVersion = (() => {
  try {
    return parseInt(localStorage.getItem(ADMIN_CACHE_VERSION_KEY) || "1", 10);
  } catch {
    return 1;
  }
})();

// Increment admin cache version (call this when admin data is modified)
export const invalidateAdminCache = () => {
  adminCacheVersion += 1;
  try {
    localStorage.setItem(ADMIN_CACHE_VERSION_KEY, String(adminCacheVersion));
    // Clear all admin-related cache entries
    const store = loadPersistentCache();
    const keysToDelete = Object.keys(store).filter(
      (key) => key.includes("/admin/") || key.includes("/buysellapi/admin/")
    );
    keysToDelete.forEach((key) => delete store[key]);
    savePersistentCache(store);

    // Also clear component-level admin caches
    try {
      localStorage.removeItem("admin_users_cache");
      localStorage.removeItem("admin_buy4me_cache");
      localStorage.removeItem("admin_trackings_cache");
      localStorage.removeItem("admin_orders_cache");
      localStorage.removeItem("admin_dashboard_cache");
    } catch (e) {
      // ignore
    }
  } catch (e) {
    console.warn("Failed to invalidate admin cache:", e);
  }
};

const loadPersistentCache = () => {
  try {
    const raw = localStorage.getItem(PERSISTENT_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
};

const savePersistentCache = (obj) => {
  try {
    localStorage.setItem(PERSISTENT_CACHE_KEY, JSON.stringify(obj));
  } catch (e) {
    // ignore quota errors
  }
};

const getPersistent = (key, isAdmin = false) => {
  const store = loadPersistentCache();
  const entry = store[key];
  if (!entry) return null;

  // Check admin cache version for admin endpoints
  if (isAdmin && entry.cacheVersion !== adminCacheVersion) {
    delete store[key];
    savePersistentCache(store);
    return null;
  }

  // For non-admin or matching version, check TTL
  const ttl = isAdmin ? ADMIN_CACHE_TTL : entry.ttl || DEFAULT_PERSISTENT_TTL;
  if (Date.now() - entry.timestamp > ttl) {
    // stale
    delete store[key];
    savePersistentCache(store);
    return null;
  }
  return entry.data;
};

const setPersistent = (
  key,
  data,
  ttl = DEFAULT_PERSISTENT_TTL,
  isAdmin = false
) => {
  const store = loadPersistentCache();
  store[key] = {
    data,
    timestamp: Date.now(),
    ttl: isAdmin ? ADMIN_CACHE_TTL : ttl,
    cacheVersion: isAdmin ? adminCacheVersion : undefined,
  };
  savePersistentCache(store);
  // keep in-memory small cache in sync too
  requestCache.set(key, { data, timestamp: Date.now() });
};

// Minimum loading delay (100ms) to ensure loading states are visible but not too slow
const MIN_LOADING_DELAY = 100;
const delayPromise = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Check if URL is an admin endpoint
// Admin endpoints include:
// - URLs with /admin/ or /buysellapi/admin/ or /api/admin/
// - /buysellapi/users/ (when accessed by admin - check adminToken)
// - /buysellapi/trackings/ (when accessed by admin - check adminToken)
const isAdminEndpoint = (url, config = {}) => {
  // Explicitly marked as admin
  if (config.isAdmin === true) {
    return true;
  }

  // URLs with /admin/ in path
  if (
    url.includes("/admin/") ||
    url.includes("/buysellapi/admin/") ||
    url.includes("/api/admin/")
  ) {
    return true;
  }

  // Check if user has adminToken (indicates admin session)
  const hasAdminToken =
    typeof localStorage !== "undefined" && localStorage.getItem("adminToken");

  // Admin-specific endpoints that don't have /admin/ in path
  // Only treat as admin if adminToken exists (admin is logged in)
  if (hasAdminToken) {
    const normalizedUrl = url.split("?")[0]; // Remove query params
    const adminPatterns = [
      "/buysellapi/users/", // Admin user management (returns all users for admin)
      "/buysellapi/trackings/", // Admin tracking management (returns all trackings for admin)
    ];
    return adminPatterns.some(
      (pattern) => normalizedUrl === pattern || normalizedUrl.endsWith(pattern)
    );
  }

  return false;
};

// Convenience wrapper so every call goes through the same validation.
// Enhanced GET: in-memory cache (short TTL) + persistent localStorage (longer TTL)
// Returns cached response immediately when available (stale-while-revalidate) and
// triggers a background refresh to update caches.
// Admin endpoints: cache never expires unless invalidated
const http = {
  get: async (path, config = {}) => {
    const url = normalizePath(path);
    const method = "get";
    const params = config.params || null;
    const skipCache = config.skipCache || false;
    const persistentTTL = config.persistentTTL || DEFAULT_PERSISTENT_TTL;
    const isAdmin = isAdminEndpoint(url, config);

    const key = getCacheKey(method, url, params);
    const startTime = Date.now();

    if (!skipCache) {
      // 1) check in-memory cache (very short lived)
      const mem = getCachedResponse(key);
      if (mem) {
        // Return cached data immediately - no delay needed for cached responses
        return { data: mem, status: 200, config: { url } };
      }

      // 2) check persistent cache (survives refresh)
      const persisted = getPersistent(key, isAdmin);
      if (persisted) {
        // Return cached data immediately - no delay needed for cached responses

        // For admin endpoints, don't background refresh (data only changes on mutations)
        // For non-admin, trigger background refresh (don't await)
        if (!isAdmin) {
          (async () => {
            try {
              const resp = await api.get(url, {
                params,
                withCredentials: true,
              });
              if (resp && resp.status === 200) {
                setPersistent(key, resp.data, persistentTTL, false);
              }
            } catch (e) {
              // background refresh failure - ignore
            }
          })();
        }

        return { data: persisted, status: 200, config: { url } };
      }
    }

    // No valid cache -> perform network request (no artificial delay for better UX)
    const resp = await api.get(url, { params, ...config });

    try {
      if (resp && resp.status === 200) {
        // update both caches
        requestCache.set(key, { data: resp.data, timestamp: Date.now() });
        setPersistent(key, resp.data, persistentTTL, isAdmin);
      }
    } catch (e) {
      // ignore cache failures
    }
    return resp;
  },
  delete: async (path, config = {}) => {
    const url = normalizePath(path);
    const isAdmin = isAdminEndpoint(url, config);
    const resp = await api.delete(url, config);
    // Invalidate admin cache on delete
    if (isAdmin && resp && resp.status >= 200 && resp.status < 300) {
      invalidateAdminCache();
    }
    return resp;
  },
  head: (path, config) => api.head(normalizePath(path), config),
  options: (path, config) => api.options(normalizePath(path), config),
  post: async (path, data, config = {}) => {
    const url = normalizePath(path);
    const isAdmin = isAdminEndpoint(url, config);
    const resp = await api.post(url, data, config);
    // Invalidate admin cache on create
    if (isAdmin && resp && resp.status >= 200 && resp.status < 300) {
      invalidateAdminCache();
    }
    return resp;
  },
  put: async (path, data, config = {}) => {
    const url = normalizePath(path);
    const isAdmin = isAdminEndpoint(url, config);
    const resp = await api.put(url, data, config);
    // Invalidate admin cache on update
    if (isAdmin && resp && resp.status >= 200 && resp.status < 300) {
      invalidateAdminCache();
    }
    return resp;
  },
  patch: async (path, data, config = {}) => {
    const url = normalizePath(path);
    const isAdmin = isAdminEndpoint(url, config);
    const resp = await api.patch(url, data, config);
    // Invalidate admin cache on patch
    if (isAdmin && resp && resp.status >= 200 && resp.status < 300) {
      invalidateAdminCache();
    }
    return resp;
  },
};

// ---------------------------------------------------------------------------
// High-level API surface grouped by domain
// ---------------------------------------------------------------------------
const Api = {
  auth: {
    login: (payload) => http.post("/buysellapi/token/", payload),
    refresh: (payload) => http.post("/buysellapi/token/refresh/", payload),
    profile: () => http.get("/buysellapi/users/me/"),
    register: (payload) => http.post("/buysellapi/user/register/", payload),
  },
  products: {
    list: (params) => http.get("/buysellapi/products/", { params }),
    detail: (slug) => http.get(`/buysellapi/products/${slug}/`),
    create: (payload) => http.post("/buysellapi/products/", payload),
    update: (slug, payload) =>
      http.put(`/buysellapi/products/${slug}/`, payload),
    remove: (slug) => http.delete(`/buysellapi/products/${slug}/`),
    reviews: {
      list: (params) => http.get("/buysellapi/product-reviews/", { params }),
      create: (payload) => http.post("/buysellapi/product-reviews/", payload),
      update: (id, payload) =>
        http.put(`/buysellapi/product-reviews/${id}/`, payload),
      remove: (id) => http.delete(`/buysellapi/product-reviews/${id}/`),
    },
  },
  orders: {
    list: (params) => http.get("/buysellapi/orders/", { params }),
    detail: (id) => http.get(`/buysellapi/orders/${id}/`),
    create: (payload) => http.post("/buysellapi/orders/", payload),
    update: (id, payload) => http.put(`/buysellapi/orders/${id}/`, payload),
    remove: (id) => http.delete(`/buysellapi/orders/${id}/`),
    adminList: (params) => http.get("/buysellapi/admin/orders/", { params }),
  },
  buy4me: {
    list: (params) => http.get("/buysellapi/buy4me-requests/", { params }),
    detail: (id) => http.get(`/buysellapi/buy4me-requests/${id}/`),
    create: (payload) => http.post("/buysellapi/buy4me-requests/", payload),
    update: (id, payload) =>
      http.put(`/buysellapi/buy4me-requests/${id}/`, payload),
    remove: (id) => http.delete(`/buysellapi/buy4me-requests/${id}/`),
    admin: {
      list: (params) =>
        http.get("/buysellapi/admin/buy4me-requests/", { params }),
      updateStatus: (id, status) =>
        http.put(`/buysellapi/admin/buy4me-requests/${id}/status/`, { status }),
      updateTracking: (id, payload) =>
        http.put(`/buysellapi/admin/buy4me-requests/${id}/tracking/`, payload),
      invoice: {
        create: (id, payload) =>
          http.post(
            `/buysellapi/admin/buy4me-requests/${id}/invoice/`,
            payload
          ),
        update: (id, payload) =>
          http.put(`/buysellapi/admin/buy4me-requests/${id}/invoice/`, payload),
      },
    },
  },
  shipping: {
    marks: (params) => http.get("/buysellapi/shipping-marks/", { params }),
    dashboard: () => http.get("/buysellapi/shipping-dashboard/"),
  },
  alipay: {
    payments: (params) => http.get("/api/admin/alipay-payments", { params }),
    rate: () => http.get("/buysellapi/alipay-exchange-rate/"),
  },
  quickOrder: {
    list: (params) => http.get("/buysellapi/quick-order-products/", { params, skipCache: true }),
    adminList: () => http.get("/buysellapi/admin/quick-order-products/"),
    adminDetail: (id) =>
      http.get(`/buysellapi/admin/quick-order-products/${id}/`),
    create: (payload) =>
      http.post("/buysellapi/admin/quick-order-products/", payload),
    update: (id, payload) =>
      http.put(`/buysellapi/admin/quick-order-products/${id}/`, payload),
    remove: (id) =>
      http.delete(`/buysellapi/admin/quick-order-products/${id}/`),
  },
  categories: {
    list: (params) => http.get("/buysellapi/categories/", { params }),
    detail: (slug) => http.get(`/buysellapi/categories/${slug}/`),
    create: (payload) => http.post("/buysellapi/categories/", payload),
    update: (slug, payload) =>
      http.patch(`/buysellapi/categories/${slug}/`, payload),
    remove: (slug) => http.delete(`/buysellapi/categories/${slug}/`),
  },
  productTypes: {
    list: (params) => http.get("/buysellapi/product-types/", { params }),
    detail: (slug) => http.get(`/buysellapi/product-types/${slug}/`),
    create: (payload) => http.post("/buysellapi/product-types/", payload),
    update: (slug, payload) =>
      http.patch(`/buysellapi/product-types/${slug}/`, payload),
    remove: (slug) => http.delete(`/buysellapi/product-types/${slug}/`),
  },
  analytics: {
    admin: (params) => http.get("/buysellapi/admin/analytics/", { params }),
    dashboardSummary: () => http.get("/buysellapi/admin/dashboard-summary/"),
  },
  training: {
    courses: (params) => http.get("/buysellapi/training-courses/", { params }),
    bookings: (params) =>
      http.get("/buysellapi/training-bookings/", { params }),
    book: (payload) => http.post("/buysellapi/training-bookings/", payload),
    adminBookings: (params) =>
      http.get("/buysellapi/admin/training-bookings/", { params }),
    adminCourses: (params) =>
      http.get("/buysellapi/admin/training-courses/", { params }),
    adminCourseDetail: (id) =>
      http.get(`/buysellapi/admin/training-courses/${id}/`),
    adminCreateCourse: (payload) =>
      http.post("/buysellapi/admin/training-courses/", payload),
    adminUpdateCourse: (id, payload) =>
      http.put(`/buysellapi/admin/training-courses/${id}/`, payload),
    adminDeleteCourse: (id) =>
      http.delete(`/buysellapi/admin/training-courses/${id}/`),
  },
};

// ---------------------------------------------------------------------------
// Legacy helper exports (so existing imports keep working)
// ---------------------------------------------------------------------------
export default api;
export { Api, http };

// Also export the cache key helper for any external usage
export { getCacheKey };

export const getProducts = Api.products.list;
export const getProduct = Api.products.detail;
export const createProduct = Api.products.create;
export const updateProduct = Api.products.update;
export const deleteProduct = Api.products.remove;

export const getProductReviews = Api.products.reviews.list;
export const createProductReview = Api.products.reviews.create;
export const updateProductReview = Api.products.reviews.update;
export const deleteProductReview = Api.products.reviews.remove;

export const getOrders = Api.orders.list;
export const getOrder = Api.orders.detail;
export const createOrder = Api.orders.create;
export const updateOrder = Api.orders.update;
export const deleteOrder = Api.orders.remove;
export const getAdminOrders = Api.orders.adminList;

export const getBuy4meRequests = Api.buy4me.list;
export const getBuy4meRequest = Api.buy4me.detail;
export const createBuy4meRequest = Api.buy4me.create;
export const updateBuy4meRequest = Api.buy4me.update;
export const deleteBuy4meRequest = Api.buy4me.remove;
export const getAdminBuy4meRequests = Api.buy4me.admin.list;
export const getAdminBuy4meRequest = Api.buy4me.detail;
export const updateAdminBuy4meRequest = Api.buy4me.update;
export const deleteAdminBuy4meRequest = Api.buy4me.remove;
export const updateBuy4meRequestStatus = Api.buy4me.admin.updateStatus;
export const updateBuy4meRequestTracking = Api.buy4me.admin.updateTracking;
export const createBuy4meRequestInvoice = Api.buy4me.admin.invoice.create;
export const updateBuy4meRequestInvoiceStatus = Api.buy4me.admin.invoice.update;

// Helper to clear quick order products cache
const clearQuickOrderProductsCache = () => {
  try {
    const store = loadPersistentCache();
    const keysToDelete = Object.keys(store).filter(
      (key) => key.includes("quick-order-products")
    );
    keysToDelete.forEach((key) => delete store[key]);
    savePersistentCache(store);
    // Also clear in-memory cache
    for (const [key] of requestCache.entries()) {
      if (key.includes("quick-order-products")) {
        requestCache.delete(key);
      }
    }
  } catch (e) {
    console.warn("Failed to clear quick order products cache:", e);
  }
};

export const getQuickOrderProducts = Api.quickOrder.list;
export { clearQuickOrderProductsCache };
export const getAdminQuickOrderProducts = Api.quickOrder.adminList;
export const getAdminQuickOrderProduct = Api.quickOrder.adminDetail;
export const createQuickOrderProduct = Api.quickOrder.create;
export const updateQuickOrderProduct = Api.quickOrder.update;
export const deleteQuickOrderProduct = Api.quickOrder.remove;

export const getCategories = Api.categories.list;
export const getCategory = Api.categories.detail;
export const createCategory = Api.categories.create;
export const updateCategory = Api.categories.update;
export const deleteCategory = Api.categories.remove;

export const getProductTypes = Api.productTypes.list;
export const getProductType = Api.productTypes.detail;
export const createProductType = Api.productTypes.create;
export const updateProductType = Api.productTypes.update;
export const deleteProductType = Api.productTypes.remove;

export const getAdminAnalytics = Api.analytics.admin;
export const registerUser = Api.auth.register;
export const getTrainingCourses = Api.training.courses;
export const getTrainingBookings = Api.training.bookings;
export const createTrainingBooking = Api.training.book;
export const getAdminTrainingBookings = Api.training.adminBookings;
export const getAdminTrainingCourses = Api.training.adminCourses;
export const getAdminTrainingCourse = Api.training.adminCourseDetail;
export const createTrainingCourse = Api.training.adminCreateCourse;
export const updateTrainingCourse = Api.training.adminUpdateCourse;
export const deleteTrainingCourse = Api.training.adminDeleteCourse;

export const testConnection = async () => {
  try {
    await http.get("/buysellapi/products/", {
      params: { limit: 1 },
      timeout: 10000,
    });
    return {
      success: true,
      message: "Connection successful",
      baseURL: BASE_URL || "(relative)",
    };
  } catch (error) {
    return {
      success: false,
      message: error.response
        ? "Backend responded with an error"
        : "Cannot reach backend",
      status: error.response?.status,
      baseURL: BASE_URL || "(relative)",
      detail: error.message,
    };
  }
};
