import axios from "axios";

// Default to empty string so that when no VITE_API_BASE_URL is provided
// the client uses relative URLs and the Vite dev proxy forwards requests
// to the local backend during development. In production, set
// `VITE_API_BASE_URL` to your backend URL (e.g. Railway) so the built
// app talks to the live backend.
const DEFAULT_API_BASE_URL = "";

const resolveApiBaseUrl = () => {
  // Prefer Vite-style env variables
  if (
    typeof import.meta !== "undefined" &&
    import.meta?.env?.VITE_API_BASE_URL
  ) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Fallback to process.env (Next.js / CRA builds)
  if (typeof process !== "undefined" && process?.env?.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }

  // Fallback to window-injected env (for static hosts)
  if (typeof window !== "undefined" && window.__ENV__?.VITE_API_BASE_URL) {
    return window.__ENV__.VITE_API_BASE_URL;
  }

  // If no environment-provided base is present, return empty string
  // so axios uses relative URLs (current origin) and Vite proxy works.
  return DEFAULT_API_BASE_URL;
};

const API_BASE_URL = resolveApiBaseUrl();

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
  timeout: 30000, // 30 seconds timeout
  timeoutErrorMessage:
    "Request timed out. Please check your internet connection.",
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

    // Validate baseURL configuration
    if (!config.baseURL && !config.url.startsWith("http")) {
      console.warn(
        "[API Warning] No baseURL configured and URL is not absolute. This may cause connection issues."
      );
    }

    // Debug: Log the actual URL being called
    const fullUrl = config.baseURL
      ? (config.baseURL.endsWith("/")
          ? config.baseURL.slice(0, -1)
          : config.baseURL) +
        (config.url.startsWith("/") ? config.url : "/" + config.url)
      : config.url;
    console.log(`[API] ${config.method?.toUpperCase()} ${fullUrl}`, {
      baseURL: config.baseURL || "(using relative URL)",
      url: config.url,
      fullUrl,
      timeout: config.timeout,
    });

    return config;
  },
  (error) => {
    console.error("[API] Request interceptor error:", error);
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
          const response = await axios.post(refreshUrl, {
            refresh: refreshToken,
          });

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
      console.error(
        `[API Error] ${config?.method?.toUpperCase()} ${config?.url}`,
        {
          status,
          statusText,
          data,
          baseURL: config?.baseURL,
          fullUrl: config?.baseURL
            ? `${config.baseURL.replace(/\/+$/, "")}${
                config.url.startsWith("/") ? config.url : "/" + config.url
              }`
            : config?.url,
        }
      );

      // Log specific errors with more detail
      if (status === 405) {
        console.error("[API 405 Error] Method Not Allowed - Possible causes:", {
          attemptedMethod: config?.method?.toUpperCase(),
          attemptedUrl: config?.url,
          baseURL: config?.baseURL,
          fullUrl: config?.baseURL
            ? `${config.baseURL.replace(/\/+$/, "")}${
                config.url.startsWith("/") ? config.url : "/" + config.url
              }`
            : config?.url,
          suggestion:
            "Check if the endpoint supports this HTTP method or if the URL is correct",
        });
      } else if (status === 500) {
        console.error("[API 500 Error] Internal Server Error:", {
          url: config?.url,
          method: config?.method?.toUpperCase(),
          data: data,
          suggestion: "Check backend logs for detailed error information",
        });
      } else if (status === 0 || statusText === "") {
        // CORS or network issue
        console.error(
          "[API CORS/Network Error] Possible CORS or network issue:",
          {
            url: config?.url,
            method: config?.method?.toUpperCase(),
            baseURL: config?.baseURL,
            suggestion: "Check CORS configuration in backend settings.py",
          }
        );
      }
    } else if (error.request) {
      // Network error - no response received
      const fullUrl = originalRequest?.baseURL
        ? `${originalRequest.baseURL.replace(/\/+$/, "")}${
            originalRequest.url.startsWith("/")
              ? originalRequest.url
              : "/" + originalRequest.url
          }`
        : originalRequest?.url;

      console.error("[API Error] No response received (Network Error):", {
        url: fullUrl,
        method: originalRequest?.method?.toUpperCase(),
        baseURL: originalRequest?.baseURL,
        error: error.message,
        code: error.code,
        possibleCauses: [
          "Backend server is down or unreachable",
          "Network connection issue",
          "CORS configuration problem",
          "Firewall blocking the request",
          "Backend URL is incorrect",
        ],
      });

      // Provide more helpful error message
      if (error.code === "ERR_NETWORK" || error.code === "ECONNABORTED") {
        error.userMessage =
          "Unable to connect to the server. Please check your internet connection and try again.";
      } else if (
        error.code === "ETIMEDOUT" ||
        error.message?.includes("timeout")
      ) {
        error.userMessage =
          "Request timed out. The server is taking too long to respond.";
      } else {
        error.userMessage =
          "Network error. Please check your connection and try again.";
      }
    } else {
      // Request setup error
      console.error("[API Error] Request setup error:", {
        message: error.message,
        config: error.config,
      });
      error.userMessage = "Failed to send request. Please try again.";
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
export const createBuy4meRequestInvoice = (id, data) =>
  API.post(`/buysellapi/admin/buy4me-requests/${id}/invoice/`, data);
export const updateBuy4meRequestInvoiceStatus = (id, status) =>
  API.put(`/buysellapi/admin/buy4me-requests/${id}/invoice/`, { status });

// Training Booking API helpers (User)
export const getTrainingBookings = (params = {}) =>
  API.get("/buysellapi/training-bookings/", { params });
export const getTrainingBooking = (id) =>
  API.get(`/buysellapi/training-bookings/${id}/`);
export const createTrainingBooking = (data) =>
  API.post("/buysellapi/training-bookings/", data);
export const updateTrainingBooking = (id, data) =>
  API.put(`/buysellapi/training-bookings/${id}/`, data);
export const deleteTrainingBooking = (id) =>
  API.delete(`/buysellapi/training-bookings/${id}/`);

// Admin Training Booking API helpers
export const getAdminTrainingBookings = (params = {}) =>
  API.get("/buysellapi/admin/training-bookings/", { params });
export const getAdminTrainingBooking = (id) =>
  API.get(`/buysellapi/admin/training-bookings/${id}/`);
export const updateAdminTrainingBooking = (id, data) =>
  API.put(`/buysellapi/admin/training-bookings/${id}/`, data);
export const deleteAdminTrainingBooking = (id) =>
  API.delete(`/buysellapi/admin/training-bookings/${id}/`);

// Training Course API helpers (Public)
export const getTrainingCourses = (params = {}) =>
  API.get("/buysellapi/training-courses/", { params });

// Admin Training Course API helpers
export const getAdminTrainingCourses = (params = {}) =>
  API.get("/buysellapi/admin/training-courses/", { params });
export const getAdminTrainingCourse = (id) =>
  API.get(`/buysellapi/admin/training-courses/${id}/`);
export const createTrainingCourse = (data) =>
  API.post("/buysellapi/admin/training-courses/", data);
export const updateTrainingCourse = (id, data) =>
  API.put(`/buysellapi/admin/training-courses/${id}/`, data);
export const deleteTrainingCourse = (id) =>
  API.delete(`/buysellapi/admin/training-courses/${id}/`);

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

// Connection test utility
export const testConnection = async () => {
  try {
    // Try a simple GET request to test connectivity
    const response = await API.get("/buysellapi/products/", {
      params: { limit: 1 },
      timeout: 10000, // 10 seconds for connection test
    });
    return {
      success: true,
      message: "Connection successful",
      baseURL: normalizedBaseURL || "(relative URL)",
      status: response.status,
    };
  } catch (error) {
    if (error.response) {
      // Got a response, so connection works but endpoint might have issues
      return {
        success: true,
        message: "Connection successful (endpoint returned error)",
        baseURL: normalizedBaseURL || "(relative URL)",
        status: error.response.status,
        warning: true,
      };
    } else if (error.request) {
      // No response received - connection issue
      return {
        success: false,
        message: "Cannot connect to backend",
        baseURL: normalizedBaseURL || "(relative URL)",
        error: error.message || "Network error",
        suggestion: normalizedBaseURL
          ? "Check if the backend URL is correct and the server is running"
          : "VITE_API_BASE_URL is not set. Set it in GitHub Secrets (Settings → Secrets and variables → Actions).",
      };
    } else {
      return {
        success: false,
        message: "Request setup failed",
        error: error.message,
      };
    }
  }
};
