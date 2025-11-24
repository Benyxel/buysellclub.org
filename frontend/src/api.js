import axios from "axios";
import { API_BASE_URL } from "./config/api";

// Helper to get CSRF token from cookie
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// API wrapper for Django backend communication
// Ensure baseURL doesn't have trailing slash to avoid double slashes
const normalizedBaseURL = API_BASE_URL ? API_BASE_URL.replace(/\/+$/, "") : "";

console.log("[API Config] API_BASE_URL:", API_BASE_URL);
console.log("[API Config] Normalized baseURL:", normalizedBaseURL);

const API = axios.create({
  baseURL: normalizedBaseURL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Always send cookies
});

// Add request interceptor to attach JWT token and CSRF token to all requests
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    const adminToken = localStorage.getItem("adminToken");
    const authToken = token || adminToken;

    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    // Attach CSRF token for unsafe methods
    const unsafeMethods = ["post", "put", "patch", "delete"];
    if (unsafeMethods.includes(config.method)) {
      const csrfToken = getCookie("csrftoken");
      if (csrfToken) {
        config.headers["X-CSRFToken"] = csrfToken;
      }
    }

    config.withCredentials = true;
    
    // Debug: Log the actual URL being called
    const fullUrl = config.baseURL 
      ? (config.baseURL.endsWith('/') ? config.baseURL.slice(0, -1) : config.baseURL) + 
        (config.url.startsWith('/') ? config.url : '/' + config.url)
      : config.url;
    console.log(`[API] ${config.method?.toUpperCase()} ${fullUrl}`, {
      baseURL: config.baseURL,
      url: config.url,
      fullUrl
    });
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh and errors
API.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If token expired (401) and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken) {
        try {
          // Try to refresh the token
          // Use the same API instance to ensure consistent baseURL
          const refreshUrl = normalizedBaseURL 
            ? `${normalizedBaseURL}/buysellapi/token/refresh/`
            : "/buysellapi/token/refresh/";
          const response = await axios.post(refreshUrl, { refresh: refreshToken });

          const { access } = response.data;
          localStorage.setItem("token", access);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return API(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem("token");
          localStorage.removeItem("adminToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("userData");
          window.location.href = "/Login";
          return Promise.reject(refreshError);
        }
      }
    }

    // Enhanced error logging for debugging
    if (error.response) {
      const { status, statusText, data, config } = error.response;
      console.error(`[API Error] ${config?.method?.toUpperCase()} ${config?.url}`, {
        status,
        statusText,
        data,
        baseURL: config?.baseURL,
        fullUrl: config?.baseURL 
          ? `${config.baseURL.replace(/\/+$/, "")}${config.url.startsWith('/') ? config.url : '/' + config.url}`
          : config?.url
      });
      
      // Log specific 405 errors with more detail
      if (status === 405) {
        console.error("[API 405 Error] Method Not Allowed - Possible causes:", {
          attemptedMethod: config?.method?.toUpperCase(),
          attemptedUrl: config?.url,
          baseURL: config?.baseURL,
          fullUrl: config?.baseURL 
            ? `${config.baseURL.replace(/\/+$/, "")}${config.url.startsWith('/') ? config.url : '/' + config.url}`
            : config?.url,
          suggestion: "Check if the endpoint supports this HTTP method or if the URL is correct"
        });
      }
    } else if (error.request) {
      console.error("[API Error] No response received:", error.request);
    } else {
      console.error("[API Error] Request setup error:", error.message);
    }

    return Promise.reject(error);
  }
);

export default API;

// Product API helpers
export const getProducts = (params = {}) =>
  API.get("/buysellapi/products/", { params });
export const getProduct = (slug) => API.get(`/buysellapi/products/${slug}/`);
export const createProduct = (data) => API.post("/buysellapi/products/", data);
export const updateProduct = (slug, data) =>
  API.put(`/buysellapi/products/${slug}/`, data);
export const deleteProduct = (slug) =>
  API.delete(`/buysellapi/products/${slug}/`);

// Product Review API helpers
export const getProductReviews = (params = {}) =>
  API.get("/buysellapi/product-reviews/", { params });
export const createProductReview = (data) =>
  API.post("/buysellapi/product-reviews/", data);
export const updateProductReview = (id, data) =>
  API.put(`/buysellapi/product-reviews/${id}/`, data);
export const deleteProductReview = (id) =>
  API.delete(`/buysellapi/product-reviews/${id}/`);

// Order API helpers
export const getOrders = (params = {}) =>
  API.get("/buysellapi/orders/", { params });
export const getOrder = (id) => API.get(`/buysellapi/orders/${id}/`);
export const createOrder = (data) => API.post("/buysellapi/orders/", data);
export const updateOrder = (id, data) =>
  API.put(`/buysellapi/orders/${id}/`, data);
export const deleteOrder = (id) => API.delete(`/buysellapi/orders/${id}/`);
// Admin order helpers
export const getAdminOrders = (params = {}) =>
  API.get("/buysellapi/admin/orders/", { params });

// Buy4me Request API helpers (User)
export const getBuy4meRequests = (params = {}) =>
  API.get("/buysellapi/buy4me-requests/", { params });
export const getBuy4meRequest = (id) =>
  API.get(`/buysellapi/buy4me-requests/${id}/`);
export const createBuy4meRequest = (data) =>
  API.post("/buysellapi/buy4me-requests/", data);
export const updateBuy4meRequest = (id, data) =>
  API.put(`/buysellapi/buy4me-requests/${id}/`, data);
export const deleteBuy4meRequest = (id) =>
  API.delete(`/buysellapi/buy4me-requests/${id}/`);

// Buy4me Request API helpers (Admin)
export const getAdminBuy4meRequests = (params = {}) =>
  API.get("/buysellapi/admin/buy4me-requests/", { params });
export const getAdminBuy4meRequest = (id) =>
  API.get(`/buysellapi/admin/buy4me-requests/${id}/`);
export const updateAdminBuy4meRequest = (id, data) =>
  API.put(`/buysellapi/admin/buy4me-requests/${id}/`, data);
export const deleteAdminBuy4meRequest = (id) =>
  API.delete(`/buysellapi/admin/buy4me-requests/${id}/`);
export const updateBuy4meRequestStatus = (id, status) =>
  API.put(`/buysellapi/admin/buy4me-requests/${id}/status/`, { status });
export const updateBuy4meRequestTracking = (id, tracking_status) =>
  API.put(`/buysellapi/admin/buy4me-requests/${id}/tracking/`, {
    tracking_status,
  });
export const createBuy4meRequestInvoice = (id, amount) =>
  API.post(`/buysellapi/admin/buy4me-requests/${id}/invoice/`, { amount });
export const updateBuy4meRequestInvoiceStatus = (id, status) =>
  API.put(`/buysellapi/admin/buy4me-requests/${id}/invoice/`, { status });

// Quick Order Product API helpers (Public)
export const getQuickOrderProducts = () =>
  API.get("/buysellapi/quick-order-products/");

// Quick Order Product API helpers (Admin)
export const getAdminQuickOrderProducts = () =>
  API.get("/buysellapi/admin/quick-order-products/");
export const getAdminQuickOrderProduct = (id) =>
  API.get(`/buysellapi/admin/quick-order-products/${id}/`);
export const createQuickOrderProduct = (data) =>
  API.post("/buysellapi/admin/quick-order-products/", data);
export const updateQuickOrderProduct = (id, data) =>
  API.put(`/buysellapi/admin/quick-order-products/${id}/`, data);
export const deleteQuickOrderProduct = (id) =>
  API.delete(`/buysellapi/admin/quick-order-products/${id}/`);

// Category API helpers
export const getCategories = (params = {}) =>
  API.get("/buysellapi/categories/", { params });
export const getCategory = (slug) => API.get(`/buysellapi/categories/${slug}/`);
export const createCategory = (data) =>
  API.post("/buysellapi/categories/", data);
export const updateCategory = (slug, data) =>
  API.put(`/buysellapi/categories/${slug}/`, data);
export const deleteCategory = (slug) =>
  API.delete(`/buysellapi/categories/${slug}/`);

// Product Type API helpers
export const getProductTypes = (params = {}) =>
  API.get("/buysellapi/product-types/", { params });
export const getProductType = (slug) =>
  API.get(`/buysellapi/product-types/${slug}/`);
export const createProductType = (data) =>
  API.post("/buysellapi/product-types/", data);
export const updateProductType = (slug, data) =>
  API.put(`/buysellapi/product-types/${slug}/`, data);
export const deleteProductType = (slug) =>
  API.delete(`/buysellapi/product-types/${slug}/`);

// Analytics API helpers
export const getAdminAnalytics = (params = {}) =>
  API.get("/buysellapi/admin/analytics/", { params });

// User registration API helper
export const registerUser = (data) =>
  API.post("/buysellapi/user/register/", data);
