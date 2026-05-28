import axios from "axios";
// Import caching utilities
import { getCachedData, setCachedData, deduplicateRequest, CACHE_DURATION } from './utils/apiCache';

/**
 * Frontend API client
 * -------------------
 * This file was rewritten to provide a single, predictable way of talking to
 * the backend. Everything goes through the same axios instance so we avoid
 * accidental GET/POST mismatches (which were causing the 405 errors) and we
 * always apply the same auth / CSRF / error handling logic.
 * Now includes intelligent caching to reduce backend requests.
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
  // In production/live, set VITE_API_BASE_URL so requests go to the API server (e.g. https://apibuysellclub.org).
  return "";
};

const BASE_URL = resolveBaseUrl();

// Log base URL in development for debugging (remove in production if needed)
if (typeof window !== "undefined" && (import.meta.env?.DEV || window.location.hostname === "localhost")) {
  console.log("API Base URL:", BASE_URL || "(relative - using Vite proxy)");
}

// Warn in production if BASE_URL is not set (relative URLs won't work if frontend and backend are on different domains)
if (typeof window !== "undefined" && !import.meta.env?.DEV && window.location.hostname !== "localhost" && !BASE_URL) {
  console.error(
    "⚠️ VITE_API_BASE_URL is not set! API requests will fail if frontend and backend are on different domains.\n" +
    "Please set VITE_API_BASE_URL environment variable to your backend URL (e.g., http://apibuysellclub.org.buysellclub.org)"
  );
}

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

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const url = originalRequest.url || "";
    const isTimeout =
      error.code === "ECONNABORTED" ||
      (typeof error.message === "string" &&
        error.message.toLowerCase().includes("timeout"));
    if (isTimeout) {
      error.message = "timeout please try again";
    }

    // Attach full request URL to error for debugging 404s (e.g. in live/production)
    const requestUrl = originalRequest.baseURL && originalRequest.url
      ? `${originalRequest.baseURL.replace(/\/+$/, "")}${originalRequest.url.startsWith("/") ? originalRequest.url : `/${originalRequest.url}`}`
      : originalRequest.url || url;
    if (error.response) {
      error.response.requestUrl = requestUrl;
    }
    // Log 404s so you can see which resource failed (helpful in live mode)
    // Skip logging for optional endpoints that may not exist on all deployments
    const isOptional404 =
      requestUrl.includes("/api/admin/container-expenses") ||
      (status === 404 &&
        url.includes("/buysellapi/shipping-marks/me/") &&
        error.response?.data?.message?.includes("No shipping mark"));
    if (status === 404 && !isOptional404) {
      console.warn("[API] 404 Not Found:", requestUrl);
    }

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


// Convenience wrapper so every call goes through the same validation.
// Now with intelligent caching to reduce backend requests
const http = {
  get: async (path, config = {}) => {
    const url = normalizePath(path);
    const params = config.params || null;
    
    // Create cache key from URL and params
    const cacheKey = `${url}${params ? `?${new URLSearchParams(params).toString()}` : ''}`;
    
    // Check if caching is disabled for this request
    const noCache = config.noCache || false;
    const cacheDuration = config.cacheDuration || CACHE_DURATION.MEDIUM;
    
    if (noCache) {
      // Bypass cache for this request
    return await api.get(url, { params, ...config });
    }
    
    // Use deduplication and caching
    return deduplicateRequest(cacheKey, async () => {
      const response = await api.get(url, { params, ...config });
      // Cache successful responses
      if (response && response.data) {
        setCachedData(cacheKey, response, cacheDuration);
      }
      return response;
    });
  },
  delete: async (path, config = {}) => {
    const url = normalizePath(path);
    return await api.delete(url, config);
  },
  head: (path, config) => api.head(normalizePath(path), config),
  options: (path, config) => api.options(normalizePath(path), config),
  post: async (path, data, config = {}) => {
    const url = normalizePath(path);
    return await api.post(url, data, config);
  },
  put: async (path, data, config = {}) => {
    const url = normalizePath(path);
    return await api.put(url, data, config);
  },
  patch: async (path, data, config = {}) => {
    const url = normalizePath(path);
    return await api.patch(url, data, config);
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
    requestPasswordResetLink: (payload) =>
      http.post("/buysellapi/auth/request-password-reset-link/", payload),
    validatePasswordResetLink: (token) =>
      http.get("/buysellapi/auth/validate-password-reset-link/", { params: { token } }),
    resetPasswordWithLink: (payload) =>
      http.post("/buysellapi/auth/reset-password-with-link/", payload),
  },
  /** Upload a file (image/video) for admin use. type: 'product' | 'whatsapp' | 'video' | 'thumbnail' | 'image' */
  uploadFile: (file, type = "product") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    return http.post("/buysellapi/admin/upload/", formData);
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
    adminRemove: (id) => http.delete(`/buysellapi/admin/orders/${id}/`),
    payment: (id, body) => http.post(`/buysellapi/orders/${id}/payment/`, body || {}),
    /** Download order receipt as PDF (user: own orders; admin: any order via admin path). */
    async downloadReceipt(orderId, useAdminPath = false) {
      const path = useAdminPath
        ? `/buysellapi/admin/orders/${orderId}/receipt/`
        : `/buysellapi/orders/${orderId}/receipt/`;
      const res = await api.get(normalizePath(path), { responseType: "blob" });
      const blob = res.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-order-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  },
  buy4me: {
    list: (params) => http.get("/buysellapi/buy4me-requests/", { params }),
    detail: (id) => http.get(`/buysellapi/buy4me-requests/${id}/`),
    create: (payload) => http.post("/buysellapi/buy4me-requests/", payload),
    createWithPayment: (payload) => http.post("/buysellapi/buy4me-requests/create-with-payment/", payload),
    createWithProof: (payload) => http.post("/buysellapi/buy4me-requests/create-with-proof/", payload),
    /** Pay-first flow: get current paid slot (awaiting_details + paid) if any */
    awaitingSubmission: () => http.get("/buysellapi/buy4me-requests/awaiting-submission/"),
    /** Pay-first flow: create slot and get Paystack payment URL */
    initiateSourcingFee: (payload) => http.post("/buysellapi/buy4me-requests/initiate-sourcing-fee/", payload || {}),
    /** Pay-first flow: submit order details for a paid slot (one submission per payment) */
    submitDetails: (id, payload) => http.patch(`/buysellapi/buy4me-requests/${id}/submit-details/`, payload),
    update: (id, payload) =>
      http.put(`/buysellapi/buy4me-requests/${id}/`, payload),
    remove: (id) => http.delete(`/buysellapi/buy4me-requests/${id}/`),
    payment: (id) => http.post(`/buysellapi/buy4me-requests/${id}/payment/`),
    settings: {
      get: () => http.get("/buysellapi/buy4me-settings/"),
      update: (payload) => http.post("/buysellapi/buy4me-settings/", payload),
    },
    admin: {
      list: (params) =>
        http.get("/buysellapi/admin/buy4me-requests/", {
          params,
          noCache: true,
          cacheDuration: 0,
        }),
      detail: (id, params) =>
        http.get(`/buysellapi/admin/buy4me-requests/${id}/`, { params }),
      remove: (id) =>
        http.delete(`/buysellapi/admin/buy4me-requests/${id}/`),
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
        edit: (id, payload) =>
          http.patch(`/buysellapi/admin/buy4me-requests/${id}/invoice/`, payload),
      },
      createInvoiceForClient: (payload) =>
        http.post("/buysellapi/admin/buy4me-requests/create-invoice/", payload),
    },
    /** Download Buy4Me invoice PDF (user: own request; admin: any request via admin path). */
    async downloadInvoiceReceipt(requestId, useAdminPath = false) {
      const path = useAdminPath
        ? `/buysellapi/admin/buy4me-requests/${requestId}/invoice/receipt/`
        : `/buysellapi/buy4me-requests/${requestId}/invoice/receipt/`;
      const res = await api.get(normalizePath(path), { responseType: "blob" });
      const blob = res.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `buy4me-invoice-${requestId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  },
  shipping: {
    marks: (params) => http.get("/buysellapi/shipping-marks/", { params }),
    dashboard: () => http.get("/buysellapi/shipping-dashboard/"),
    rate: () => http.get("/buysellapi/shipping-rates/"),
    adRate: () => http.get("/buysellapi/ad-shipping-rates/"),
    adRatesList: () => http.get("/buysellapi/ad-shipping-rates/all/"),
  },
  airAdServices: {
    list: (params) =>
      http.get("/buysellapi/admin/air-ad-shipping-services/", {
        params,
        noCache: true,
        cacheDuration: 0,
      }),
    publicList: (params) =>
      http.get("/buysellapi/air-ad-shipping-services/", {
        params,
        noCache: true,
        cacheDuration: 0,
      }),
    create: (payload) =>
      http.post("/buysellapi/admin/air-ad-shipping-services/", payload),
    update: (id, payload) =>
      http.put(`/buysellapi/admin/air-ad-shipping-services/${id}/`, payload),
    remove: (id) =>
      http.delete(`/buysellapi/admin/air-ad-shipping-services/${id}/`),
  },
  containers: {
    current: (params) => http.get("/buysellapi/containers/current/", { params }),
    list: () => http.get("/buysellapi/containers/public/"),
  },
  invoices: {
    meList: () =>
      http.get("/buysellapi/me/shipping-invoices/", {
        noCache: true,
        cacheDuration: 0,
      }),
    public: (params) => http.get("/buysellapi/invoices/public/", { params }),
    availableTrackings: (invoiceId) =>
      http.get(`/buysellapi/invoices/${invoiceId}/available-trackings/`),
    addItem: (invoiceId, payload) =>
      http.post(`/buysellapi/invoices/${invoiceId}/items/`, payload),
    updateItem: (invoiceId, itemId, payload) =>
      http.patch(`/buysellapi/invoices/${invoiceId}/items/${itemId}/`, payload),
    removeItem: (invoiceId, itemId) =>
      http.delete(`/buysellapi/invoices/${invoiceId}/items/${itemId}/`),
    recordPayment: (invoiceId, payload) =>
      http.post(`/buysellapi/invoices/${invoiceId}/record-payment/`, payload),
    /** Download shipping fee invoice PDF (admin only). */
    async downloadReceipt(invoiceId) {
      const res = await api.get(
        normalizePath(`/buysellapi/admin/invoices/${invoiceId}/receipt/`),
        { responseType: "blob" }
      );
      const blob = res.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shipping-invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  },
  alipay: {
    payments: (params = {}, options = {}) => {
      return http.get("/buysellapi/admin/alipay-payments", {
        params,
        noCache: true,
        cacheDuration: 0,
        ...options,
      });
    },
    detail: (id, params) =>
      http.get(`/buysellapi/admin/alipay-payments/${id}/`, { params }),
    myPayments: (params) => {
      return http.get("/buysellapi/alipay-payments/me", { params });
    },
    rate: () => http.get("/buysellapi/alipay-exchange-rate/"),
    buyingRate: () => http.get("/buysellapi/alipay-buying-rate/"),
    updateBuyingRate: (payload) =>
      http.post("/buysellapi/alipay-buying-rate/", payload),
    updatePaymentBuyingRate: (id, payload) =>
      http.put(`/buysellapi/admin/alipay-payments/${id}/buying-rate/`, payload),
  },
  quickOrder: {
    list: (params) => http.get("/buysellapi/quick-order-products/", { params }),
    payment: (id, amount) => http.post(`/buysellapi/quick-order-products/${id}/payment/`, { amount }),
    adminList: (params) => http.get("/buysellapi/admin/quick-order-products/", { params }),
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
  productOptionTypes: {
    list: (params) => http.get("/buysellapi/product-option-types/", { params }),
    detail: (slug) => http.get(`/buysellapi/product-option-types/${slug}/`),
    create: (payload) => http.post("/buysellapi/product-option-types/", payload),
    update: (slug, payload) =>
      http.patch(`/buysellapi/product-option-types/${slug}/`, payload),
    remove: (slug) => http.delete(`/buysellapi/product-option-types/${slug}/`),
  },
  analytics: {
    admin: (params) =>
      http.get("/buysellapi/admin/analytics/", {
        params,
        noCache: true,
        cacheDuration: 0,
      }),
    dashboardSummary: () => http.get("/buysellapi/admin/dashboard-summary/"),
    trends: () =>
      http.get("/buysellapi/admin/analytics/trends/", {
        noCache: true,
        cacheDuration: 0,
      }),
  },
  liveChat: {
    messages: (params) =>
      http.get("/buysellapi/live-chat/messages/", {
        params,
        noCache: true,
        cacheDuration: 0,
      }),
    send: (payload) => http.post("/buysellapi/live-chat/messages/", payload),
    markRead: (messageId) =>
      http.patch(`/buysellapi/live-chat/messages/${messageId}/mark-read/`),
    unreadCount: () =>
      http.get("/buysellapi/live-chat/messages/unread-count/", {
        noCache: true,
        cacheDuration: 0,
      }),
    markAllRead: () => http.post("/buysellapi/live-chat/messages/mark-all-read/"),
    endSession: (userId) => http.post("/buysellapi/live-chat/session/end/", { user_id: userId }),
  },
  training: {
    courses: (params) => http.get("/buysellapi/training-courses/", { params }),
    bookings: (params) =>
      http.get("/buysellapi/training-bookings/", { params }),
    book: (payload) => http.post("/buysellapi/training-bookings/", payload),
    settings: () => http.get("/buysellapi/training-settings/"),
    updateSettings: (payload) => http.post("/buysellapi/training-settings/", payload),
    payment: (id, payload) => http.put(`/buysellapi/training-bookings/${id}/payment/`, payload),
    paymentGateway: (id, body) => http.post(`/buysellapi/training-bookings/${id}/payment/`, body || {}),
    adminBookings: (params) =>
      http.get("/buysellapi/admin/training-bookings/", {
        params,
        noCache: true,
        cacheDuration: 0,
      }),
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
    // Course payment endpoints
    checkCourseAccess: (courseId) => http.get(`/buysellapi/training-courses/${courseId}/access/`),
    initiateCoursePayment: (courseId) => http.post(`/buysellapi/training-courses/${courseId}/payment/`),
  },
  maintenance: {
    get: () => http.get("/buysellapi/maintenance-settings/"),
    update: (payload) => http.post("/buysellapi/maintenance-settings/", payload),
  },
  localAgent: {
    settings: {
      get: () => http.get("/buysellapi/local-agent-settings/"),
      update: (payload) => http.post("/buysellapi/local-agent-settings/", payload),
    },
    dashboard: () => http.get("/buysellapi/local-agent/dashboard/"),
    claimReward: () => http.post("/buysellapi/local-agent/rewards/claim/"),
    adminClaims: (params, config = {}) =>
      http.get("/buysellapi/admin/local-agent-reward-claims/", {
        params,
        ...config,
      }),
    adminApproveClaim: (claimId) =>
      http.post(`/buysellapi/admin/local-agent-reward-claims/${claimId}/approve/`),
    adminRejectClaim: (claimId) =>
      http.post(`/buysellapi/admin/local-agent-reward-claims/${claimId}/reject/`),
  },
  community: {
    settings: {
      get: (config = {}) => http.get("/buysellapi/community/settings/", config),
      update: (payload) => http.post("/buysellapi/community/settings/", payload),
    },
    // Cache community status so tabs don't reload constantly when revisited.
    myRequest: (config = {}) =>
      http.get("/buysellapi/community/requests/me/", {
        cacheDuration: CACHE_DURATION.MEDIUM,
        ...config,
      }),
    sheetData: (config = {}) =>
      http.get("/buysellapi/community/sheet-data/", {
        cacheDuration: CACHE_DURATION.LONG,
        ...config,
      }),
    submitRequest: (payload) => http.post("/buysellapi/community/requests/", payload),
    initiatePayment: (payload) => http.post("/buysellapi/community/requests/initiate-payment/", payload),
    submitInternationalMomo: (payload) =>
      http.post("/buysellapi/community/requests/international-momo-submit/", payload),
    setPasswordValidate: (token) =>
      http.get("/buysellapi/community/set-password/validate/", { params: { token } }),
    setPasswordSubmit: (payload) =>
      http.post("/buysellapi/community/set-password/submit/", payload),
    adminRequests: (config = {}) =>
      http.get("/buysellapi/admin/community/requests/", config),
    adminApprove: (requestId, payload = {}) =>
      http.post(`/buysellapi/admin/community/requests/${requestId}/approve/`, payload),
    adminReject: (requestId, payload = {}) =>
      http.post(`/buysellapi/admin/community/requests/${requestId}/reject/`, payload),
    adminDelete: (requestId) =>
      http.delete(`/buysellapi/admin/community/requests/${requestId}/`),
    adminAssignMember: (payload) =>
      http.post("/buysellapi/admin/community/assign-member/", payload),
    adminResendSetPasswordLink: (requestId) =>
      http.post(`/buysellapi/admin/community/requests/${requestId}/resend-set-password-link/`),
  },
  digitalStore: {
    /** Public list of digital products (PDFs, etc). */
    products: (params) =>
      http.get("/buysellapi/digital-store/products/", {
        params,
        cacheDuration: CACHE_DURATION.SHORT,
      }),
    /** Start Paystack checkout for a digital product purchase. */
    initiatePaystack: (payload) =>
      http.post(
        "/buysellapi/digital-store/purchases/initiate-paystack/",
        payload || {}
      ),
    /** Upload proof for manual MoMo payment */
    uploadPaymentProof: (file) => {
      const formData = new FormData();
      formData.append("file", file);
      return http.post("/buysellapi/digital-store/uploads/payment-proof/", formData);
    },
    /** Submit manual MoMo payment for abroad (requires proof_url) */
    submitManualMoMo: (payload) =>
      http.post("/buysellapi/digital-store/purchases/manual-momo/", payload || {}),
    /** Logged-in: list of purchased items available for download. */
    library: (params) =>
      http.get("/buysellapi/digital-store/purchases/me/", {
        params,
        cacheDuration: CACHE_DURATION.SHORT,
      }),
    /** Logged-in: get a one-time / expiring download link. */
    downloadLink: (purchaseId) =>
      http.get(`/buysellapi/digital-store/purchases/${purchaseId}/download/`, {
        noCache: true,
        cacheDuration: 0,
      }),
    /** Logged-in: resend download email for a paid purchase */
    resendDownloadEmail: (purchaseId) =>
      http.post(`/buysellapi/digital-store/purchases/${purchaseId}/resend-email/`, {}),
    /** After Paystack: send receipt email if server has not recorded one yet (idempotent). */
    ensureReceiptEmail: (purchaseId) =>
      http.post(
        `/buysellapi/digital-store/purchases/${purchaseId}/ensure-receipt-email/`,
        {}
      ),
    /** Logged-in: download PDF receipt (own purchases only; same path as email attachment). */
    async downloadReceipt(purchaseId) {
      const path = `/buysellapi/digital-store/purchases/${purchaseId}/receipt/`;
      const res = await api.get(normalizePath(path), { responseType: "blob" });
      const blob = res.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-digital-${purchaseId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    admin: {
      listProducts: (params) =>
        http.get("/buysellapi/admin/digital-store/products/", {
          params,
          noCache: true,
          cacheDuration: 0,
        }),
      createProduct: (payload) =>
        http.post("/buysellapi/admin/digital-store/products/", payload || {}),
      updateProduct: (id, payload) =>
        http.put(`/buysellapi/admin/digital-store/products/${id}/`, payload || {}),
      deleteProduct: (id) =>
        http.delete(`/buysellapi/admin/digital-store/products/${id}/`),
      listPurchases: (params) =>
        http.get("/buysellapi/admin/digital-store/purchases/", {
          params,
          noCache: true,
          cacheDuration: 0,
        }),
      approvePurchase: (purchaseId) =>
        http.post(
          `/buysellapi/admin/digital-store/purchases/${purchaseId}/approve/`,
          {}
        ),
      rejectPurchase: (purchaseId) =>
        http.post(
          `/buysellapi/admin/digital-store/purchases/${purchaseId}/reject/`,
          {}
        ),
      updatePurchaseStatus: (purchaseId, payload) =>
        http.post(
          `/buysellapi/admin/digital-store/purchases/${purchaseId}/status/`,
          payload || {}
        ),
      sendReceiptEmail: (purchaseId) =>
        http.post(
          `/buysellapi/admin/digital-store/purchases/${purchaseId}/send-receipt-email/`,
          {}
        ),
      deletePurchase: (purchaseId) =>
        http.delete(
          `/buysellapi/admin/digital-store/purchases/${purchaseId}/`
        ),
    },
  },
  communityContent: {
    winningProducts: {
      list: (config = {}) =>
        http.get("/buysellapi/community/winning-products/", {
          cacheDuration: CACHE_DURATION.LONG,
          ...config,
        }),
      adminList: (config = {}) =>
        http.get("/buysellapi/admin/community/winning-products/", {
          noCache: true,
          cacheDuration: 0,
          ...config,
        }),
      create: (payload) =>
        http.post("/buysellapi/admin/community/winning-products/", payload),
      update: (id, payload) =>
        http.put(`/buysellapi/admin/community/winning-products/${id}/`, payload),
      remove: (id) =>
        http.delete(`/buysellapi/admin/community/winning-products/${id}/`),
      like: (id) =>
        http.post(`/buysellapi/community/winning-products/${id}/like/`, {}),
      unlike: (id) =>
        http.delete(`/buysellapi/community/winning-products/${id}/like/`),
      recordView: (id) =>
        http.post(`/buysellapi/community/winning-products/${id}/view/`, {}),
    },
    tutorials: {
      list: (config = {}) =>
        http.get("/buysellapi/community/tutorials/", {
          cacheDuration: CACHE_DURATION.LONG,
          ...config,
        }),
      adminList: (config = {}) =>
        http.get("/buysellapi/admin/community/tutorials/", {
          noCache: true,
          cacheDuration: 0,
          ...config,
        }),
      create: (payload) =>
        http.post("/buysellapi/admin/community/tutorials/", payload),
      update: (id, payload) =>
        http.put(`/buysellapi/admin/community/tutorials/${id}/`, payload),
      remove: (id) =>
        http.delete(`/buysellapi/admin/community/tutorials/${id}/`),
      like: (id) =>
        http.post(`/buysellapi/community/tutorials/${id}/like/`, {}),
      unlike: (id) =>
        http.delete(`/buysellapi/community/tutorials/${id}/like/`),
      recordView: (id) =>
        http.post(`/buysellapi/community/tutorials/${id}/view/`, {}),
    },
    resources: {
      list: (config = {}) =>
        http.get("/buysellapi/community/resources/", {
          cacheDuration: CACHE_DURATION.LONG,
          ...config,
        }),
      adminList: (config = {}) =>
        http.get("/buysellapi/admin/community/resources/", {
          noCache: true,
          cacheDuration: 0,
          ...config,
        }),
      create: (payload) =>
        http.post("/buysellapi/admin/community/resources/", payload),
      update: (id, payload) =>
        http.put(`/buysellapi/admin/community/resources/${id}/`, payload),
      remove: (id) =>
        http.delete(`/buysellapi/admin/community/resources/${id}/`),
    },
  },
  vendor: {
    submit: (payload) => http.post("/buysellapi/vendor-applications/", payload),
    me: (config = {}) => http.get("/buysellapi/vendor-applications/me/", config),
    adminList: (params = {}, config = {}) =>
      http.get("/buysellapi/admin/vendor-applications/", { params, ...config }),
    adminApprove: (applicationId, payload = {}) =>
      http.post(`/buysellapi/admin/vendor-applications/${applicationId}/approve/`, payload),
    adminReject: (applicationId, payload = {}) =>
      http.post(`/buysellapi/admin/vendor-applications/${applicationId}/reject/`, payload),
    sales: (config = {}) => http.get("/buysellapi/vendor/sales/", config),
    payoutEligibility: (config = {}) =>
      http.get("/buysellapi/vendor/payout-eligibility/", config),
    payoutRequests: {
      list: (config = {}) => http.get("/buysellapi/vendor/payout-requests/", config),
      create: (payload) => http.post("/buysellapi/vendor/payout-requests/", payload),
    },
  },
  adminVendorPayoutRequests: {
    list: (params = {}, config = {}) =>
      http.get("/buysellapi/admin/vendor-payout-requests/", { params, ...config }),
    approve: (requestId) =>
      http.post(`/buysellapi/admin/vendor-payout-requests/${requestId}/approve/`),
    reject: (requestId, payload = {}) =>
      http.post(`/buysellapi/admin/vendor-payout-requests/${requestId}/reject/`, payload),
    markPaid: (requestId) =>
      http.post(`/buysellapi/admin/vendor-payout-requests/${requestId}/mark-paid/`),
  },
  adminVendorUsers: (config = {}) =>
    http.get("/buysellapi/admin/vendor-users/", config),
  quickTracking: {
    search: (params) =>
      http.get("/buysellapi/quick-tracking-notes/search/", {
        params,
        noCache: true,
        cacheDuration: 0,
      }),
    adminList: (params) =>
      http.get("/buysellapi/admin/quick-tracking-notes/", {
        params,
        noCache: true,
        cacheDuration: 0,
      }),
    adminDetail: (id) =>
      http.get(`/buysellapi/admin/quick-tracking-notes/${id}/`),
    create: (payload) =>
      http.post("/buysellapi/admin/quick-tracking-notes/", payload),
    update: (id, payload) =>
      http.put(`/buysellapi/admin/quick-tracking-notes/${id}/`, payload),
    remove: (id) =>
      http.delete(`/buysellapi/admin/quick-tracking-notes/${id}/`),
  },
  staffClock: {
    config: () =>
      http.get("/buysellapi/staff-clock/config/", { noCache: true, cacheDuration: 0 }),
    staffList: () =>
      http.get("/buysellapi/staff-clock/staff/", { noCache: true, cacheDuration: 0 }),
    me: () =>
      http.get("/buysellapi/staff-clock/me/", { noCache: true, cacheDuration: 0 }),
    submit: (payload) =>
      http.post("/buysellapi/staff-clock/submit/", payload),
    adminRecords: (params) =>
      http.get("/buysellapi/admin/staff-clock/records/", { params }),
  },
};

// ---------------------------------------------------------------------------
// Legacy helper exports (so existing imports keep working)
// ---------------------------------------------------------------------------
export default api;
export { Api, http };

// Export cache utilities for manual cache management
export { clearCache, invalidateCache, getCachedData, setCachedData, CACHE_DURATION } from './utils/apiCache';
export { storageCache } from './utils/storageCache';


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
export const initiateOrderPayment = Api.orders.payment;
export const downloadOrderReceipt = (orderId, useAdminPath = false) =>
  Api.orders.downloadReceipt(orderId, useAdminPath);

export const getBuy4meRequests = Api.buy4me.list;
export const getBuy4meRequest = Api.buy4me.detail;
export const createBuy4meRequest = Api.buy4me.create;
export const createBuy4meRequestWithPayment = Api.buy4me.createWithPayment;
export const createBuy4meRequestWithProof = Api.buy4me.createWithProof;
export const getBuy4meAwaitingSubmission = Api.buy4me.awaitingSubmission;
export const initiateBuy4meSourcingFee = Api.buy4me.initiateSourcingFee;
export const submitBuy4meDetails = Api.buy4me.submitDetails;
export const updateBuy4meRequest = Api.buy4me.update;
export const deleteBuy4meRequest = Api.buy4me.remove;
export const initiateBuy4mePayment = Api.buy4me.payment;
export const downloadBuy4meInvoiceReceipt = (requestId, useAdminPath = false) =>
  Api.buy4me.downloadInvoiceReceipt(requestId, useAdminPath);
export const downloadShippingInvoiceReceipt = (invoiceId) =>
  Api.invoices.downloadReceipt(invoiceId);
export const getAdminBuy4meRequests = Api.buy4me.admin.list;
export const getAdminBuy4meRequest = Api.buy4me.admin.detail;
export const updateAdminBuy4meRequest = Api.buy4me.update;
export const deleteAdminBuy4meRequest = Api.buy4me.admin.remove;
export const updateBuy4meRequestStatus = Api.buy4me.admin.updateStatus;
export const updateBuy4meRequestTracking = Api.buy4me.admin.updateTracking;
export const createBuy4meRequestInvoice = Api.buy4me.admin.invoice.create;
export const updateBuy4meRequestInvoiceStatus = Api.buy4me.admin.invoice.update;
export const editBuy4meRequestInvoice = Api.buy4me.admin.invoice.edit;
export const createBuy4meInvoiceForClient = Api.buy4me.admin.createInvoiceForClient;
export const getBuy4meSettings = Api.buy4me.settings.get;
export const updateBuy4meSettings = Api.buy4me.settings.update;

export const getQuickOrderProducts = Api.quickOrder.list;
export const initiateQuickOrderPayment = Api.quickOrder.payment;
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

export const getProductOptionTypes = Api.productOptionTypes.list;
export const getProductOptionType = Api.productOptionTypes.detail;
export const createProductOptionType = Api.productOptionTypes.create;
export const updateProductOptionType = Api.productOptionTypes.update;
export const deleteProductOptionType = Api.productOptionTypes.remove;

export const getAdminAnalytics = Api.analytics.admin;
export const getAdminAnalyticsTrends = Api.analytics.trends;
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
export const checkCourseAccess = Api.training.checkCourseAccess;
export const initiateCoursePayment = Api.training.initiateCoursePayment;
export const initiateTrainingPayment = Api.training.paymentGateway;
export const getLiveChatMessages = Api.liveChat.messages;
export const sendLiveChatMessage = Api.liveChat.send;
export const markLiveChatMessageRead = Api.liveChat.markRead;
export const getLiveChatUnreadCount = Api.liveChat.unreadCount;
export const markAllLiveChatRead = Api.liveChat.markAllRead;
export const endLiveChatSession = Api.liveChat.endSession;
export const getMaintenanceSettings = Api.maintenance.get;
export const updateMaintenanceSettings = Api.maintenance.update;
export const getLocalAgentSettings = Api.localAgent.settings.get;
export const updateLocalAgentSettings = Api.localAgent.settings.update;
export const claimLocalAgentRewards = Api.localAgent.claimReward;
export const getLocalAgentRewardClaims = Api.localAgent.adminClaims;
export const approveLocalAgentRewardClaim = Api.localAgent.adminApproveClaim;
export const rejectLocalAgentRewardClaim = Api.localAgent.adminRejectClaim;

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
