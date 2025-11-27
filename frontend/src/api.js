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
    typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_BASE_URL : undefined,
    typeof process !== "undefined" ? process.env?.VITE_API_BASE_URL : undefined,
    typeof window !== "undefined" ? window.__ENV__?.VITE_API_BASE_URL : undefined,
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
    "Connection": "keep-alive", // Reuse connections for better performance
  },
  timeout: 15000, // Reduced from 30s to 15s for faster failure detection
  maxRedirects: 5,
  // Browser automatically handles connection pooling and keep-alive
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
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
    if (response.config?.__cacheKey && response.status === 200 && !response.config.__cached) {
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
            originalRequest.headers = originalRequest.headers || {};
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

// Convenience wrapper so every call goes through the same validation.
const http = {
  get: (path, config) => api.get(normalizePath(path), config),
  delete: (path, config) => api.delete(normalizePath(path), config),
  head: (path, config) => api.head(normalizePath(path), config),
  options: (path, config) => api.options(normalizePath(path), config),
  post: (path, data, config) => api.post(normalizePath(path), data, config),
  put: (path, data, config) => api.put(normalizePath(path), data, config),
  patch: (path, data, config) => api.patch(normalizePath(path), data, config),
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
    update: (slug, payload) => http.put(`/buysellapi/products/${slug}/`, payload),
    remove: (slug) => http.delete(`/buysellapi/products/${slug}/`),
    reviews: {
      list: (params) => http.get("/buysellapi/product-reviews/", { params }),
      create: (payload) => http.post("/buysellapi/product-reviews/", payload),
      update: (id, payload) => http.put(`/buysellapi/product-reviews/${id}/`, payload),
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
    update: (id, payload) => http.put(`/buysellapi/buy4me-requests/${id}/`, payload),
    remove: (id) => http.delete(`/buysellapi/buy4me-requests/${id}/`),
    admin: {
      list: (params) => http.get("/buysellapi/admin/buy4me-requests/", { params }),
      updateStatus: (id, status) =>
        http.put(`/buysellapi/admin/buy4me-requests/${id}/status/`, { status }),
      updateTracking: (id, payload) =>
        http.put(`/buysellapi/admin/buy4me-requests/${id}/tracking/`, payload),
      invoice: {
        create: (id, payload) =>
          http.post(`/buysellapi/admin/buy4me-requests/${id}/invoice/`, payload),
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
    list: () => http.get("/buysellapi/quick-order-products/"),
    adminList: () => http.get("/buysellapi/admin/quick-order-products/"),
    adminDetail: (id) => http.get(`/buysellapi/admin/quick-order-products/${id}/`),
    create: (payload) => http.post("/buysellapi/admin/quick-order-products/", payload),
    update: (id, payload) =>
      http.put(`/buysellapi/admin/quick-order-products/${id}/`, payload),
    remove: (id) => http.delete(`/buysellapi/admin/quick-order-products/${id}/`),
  },
  categories: {
    list: (params) => http.get("/buysellapi/categories/", { params }),
    detail: (slug) => http.get(`/buysellapi/categories/${slug}/`),
    create: (payload) => http.post("/buysellapi/categories/", payload),
    update: (slug, payload) => http.put(`/buysellapi/categories/${slug}/`, payload),
    remove: (slug) => http.delete(`/buysellapi/categories/${slug}/`),
  },
  productTypes: {
    list: (params) => http.get("/buysellapi/product-types/", { params }),
    detail: (slug) => http.get(`/buysellapi/product-types/${slug}/`),
    create: (payload) => http.post("/buysellapi/product-types/", payload),
    update: (slug, payload) => http.put(`/buysellapi/product-types/${slug}/`, payload),
    remove: (slug) => http.delete(`/buysellapi/product-types/${slug}/`),
  },
  analytics: {
    admin: (params) => http.get("/buysellapi/admin/analytics/", { params }),
    dashboardSummary: () => http.get("/buysellapi/admin/dashboard-summary/"),
  },
  training: {
    courses: (params) => http.get("/buysellapi/training-courses/", { params }),
    bookings: (params) => http.get("/buysellapi/training-bookings/", { params }),
    book: (payload) => http.post("/buysellapi/training-bookings/", payload),
    adminBookings: (params) => http.get("/buysellapi/admin/training-bookings/", { params }),
    adminCourses: (params) => http.get("/buysellapi/admin/training-courses/", { params }),
    adminCourseDetail: (id) => http.get(`/buysellapi/admin/training-courses/${id}/`),
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

export const getQuickOrderProducts = Api.quickOrder.list;
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
    await http.get("/buysellapi/products/", { params: { limit: 1 }, timeout: 10000 });
    return {
      success: true,
      message: "Connection successful",
      baseURL: BASE_URL || "(relative)",
    };
  } catch (error) {
    return {
      success: false,
      message: error.response ? "Backend responded with an error" : "Cannot reach backend",
      status: error.response?.status,
      baseURL: BASE_URL || "(relative)",
      detail: error.message,
    };
  }
};
