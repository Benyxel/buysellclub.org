import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../api";

const Signup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    contact: "",
    location: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
    // Clear form-level errors
    if (errors.form) {
      setErrors({ ...errors, form: "" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    const newErrors = {};

    // Required fields validation
    const required = [
      "username",
      "full_name",
      "email",
      "password",
      "confirm_password",
      "contact",
      "location",
    ];
    required.forEach((k) => {
      if (!form[k] || !form[k].trim()) {
        newErrors[k] = "This field is required";
      }
    });

    // Username validation
    if (form.username) {
      if (form.username.length < 3) {
        newErrors.username = "Username must be at least 3 characters long";
      } else if (form.username.length > 10) {
        newErrors.username = "Username cannot exceed 10 characters";
      } else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) {
        newErrors.username =
          "Username can only contain letters, numbers, and underscores";
      }
    }

    // Email validation
    if (form.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    // Password validation
    if (form.password) {
      if (form.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters long";
      }
    }

    // Confirm password validation
    if (form.password && form.confirm_password) {
      if (form.password !== form.confirm_password) {
        newErrors.confirm_password = "Passwords do not match";
      }
    }

    // Contact validation
    if (form.contact) {
      const cleanedContact = form.contact.replace(/[\s\-()]/g, "");
      if (cleanedContact.length < 10) {
        newErrors.contact = "Please enter a valid contact number";
      }
    }

    // If there are validation errors, show them and stop
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the highlighted errors");
      return;
    }

    setLoading(true);
    setErrors({}); // Clear previous errors

    try {
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
      const csrfToken = getCookie("csrftoken");
      
      // Show loading toast
      const loadingToast = toast.info("Creating your account...", { autoClose: false });
      
      // Call Django registration endpoint with CSRF token and increased timeout
      const response = await API.post("/buysellapi/user/register/", {
        username: form.username,
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        confirm_password: form.confirm_password,
        contact: form.contact,
        location: form.location,
      }, {
        headers: {
          "X-CSRFToken": csrfToken,
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 seconds for registration (longer for slow connections)
      });

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Show success message from backend with status
      const successMessage = response.data?.message || response.data?.status || "Account created successfully! 🎉";
      toast.success(successMessage, { autoClose: 5000 });
      
      console.log("Signup successful:", response.data);

      // Navigate to login page
      navigate("/Login");
    } catch (err) {
      console.error("Signup error:", err);

      // Handle timeout errors specifically
      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        toast.error("Request timed out. Please check your internet connection and try again.", { autoClose: 7000 });
        setErrors({
          form: "Connection timeout. Please try again with a stable internet connection.",
        });
        setLoading(false);
        return;
      }

      // Handle network errors
      if (!err.response && err.request) {
        toast.error("Network error. Please check your internet connection and try again.", { autoClose: 7000 });
        setErrors({
          form: "Cannot connect to server. Please check your internet connection.",
        });
        setLoading(false);
        return;
      }

      // Handle specific error messages
      if (err.response?.data) {
        const apiErrors = err.response.data;
        const mapped = {};

        // Handle different error formats from backend
        Object.entries(apiErrors).forEach(([field, msgs]) => {
          if (Array.isArray(msgs) && msgs.length) {
            // Array of error messages - take the first one
            mapped[field] = msgs[0];
          } else if (typeof msgs === "string") {
            // String error message
            mapped[field] = msgs;
          } else if (typeof msgs === "object" && msgs !== null) {
            // Nested object errors (e.g., password validation)
            if (msgs.message) mapped[field] = msgs.message;
            else mapped[field] = JSON.stringify(msgs);
          }
        });

        // Handle general error messages
        if (apiErrors.detail && !mapped.form) {
          mapped.form = apiErrors.detail;
        }
        if (apiErrors.message && !mapped.form) {
          mapped.form = apiErrors.message;
        }
        if (apiErrors.error && !mapped.form) {
          mapped.form = apiErrors.error;
        }

        // Update error state
        setErrors(mapped);

        // Show toast with the most relevant error
        let toastMessage = "Signup failed. Please check your information.";

        if (mapped.form) {
          toastMessage = mapped.form;
        } else if (mapped.username) {
          toastMessage = `Username: ${mapped.username}`;
        } else if (mapped.email) {
          toastMessage = `Email: ${mapped.email}`;
        } else if (mapped.password) {
          toastMessage = `Password: ${mapped.password}`;
        } else if (mapped.confirm_password) {
          toastMessage = `Confirm Password: ${mapped.confirm_password}`;
        } else if (mapped.contact) {
          toastMessage = `Contact: ${mapped.contact}`;
        } else if (Object.keys(mapped).length > 0) {
          // Show first error found
          const firstError = Object.values(mapped)[0];
          toastMessage = firstError;
        }

        toast.error(toastMessage, { autoClose: 7000 });
      } else if (err.request) {
        // Request made but no response received (already handled above)
        toast.error("Network error. Please check your internet connection.", { autoClose: 7000 });
        setErrors({
          form: "Cannot connect to server. Please try again later.",
        });
      } else {
        // Something else happened
        const errorMsg = err.message || "An unexpected error occurred. Please try again.";
        toast.error(errorMsg, { autoClose: 7000 });
        setErrors({ form: errorMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* Animated Vessel */}
        <div className="relative h-20 bg-gradient-to-b from-blue-400 to-blue-500 dark:from-blue-600 dark:dark:to-blue-700 overflow-hidden">
          {/* Water waves */}
          <div className="absolute bottom-0 left-0 right-0 h-8">
            <div className="absolute bottom-0 w-full h-4 bg-gradient-to-t from-blue-600/30 to-transparent animate-pulse"></div>
            <svg
              className="absolute bottom-0 w-full h-8"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
            >
              <path
                fill="rgba(255,255,255,0.1)"
                fillOpacity="1"
                d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              >
                <animate
                  attributeName="d"
                  dur="3s"
                  repeatCount="indefinite"
                  values="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,80C672,64,768,64,864,80C960,96,1056,128,1152,128C1248,128,1344,96,1392,80L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                />
              </path>
            </svg>
          </div>

          {/* Animated Container Ship */}
          <div className="absolute top-2 left-0 animate-ship">
            <svg
              width="120"
              height="72"
              viewBox="0 0 80 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Ship Hull */}
              <path
                d="M10 32L14 28H66L70 32L68 38H12L10 32Z"
                fill="#2C3E50"
                stroke="#1A252F"
                strokeWidth="1.5"
              />
              {/* Hull stripe */}
              <path d="M14 30H66L68 32H12L14 30Z" fill="#34495E" />

              {/* Deck */}
              <rect
                x="14"
                y="26"
                width="52"
                height="2"
                fill="#7F8C8D"
                stroke="#6C7A7B"
                strokeWidth="0.5"
              />

              {/* Bridge/Superstructure (back) */}
              <rect
                x="58"
                y="14"
                width="10"
                height="12"
                fill="#E74C3C"
                stroke="#C0392B"
                strokeWidth="1"
              />
              <rect
                x="58"
                y="10"
                width="10"
                height="4"
                fill="#C0392B"
                stroke="#A93226"
                strokeWidth="1"
              />
              {/* Bridge windows */}
              <rect x="59.5" y="16" width="2" height="2" fill="#87CEEB" />
              <rect x="62.5" y="16" width="2" height="2" fill="#87CEEB" />
              <rect x="65" y="16" width="2" height="2" fill="#87CEEB" />

              {/* Smokestack */}
              <rect
                x="62"
                y="6"
                width="3"
                height="4"
                fill="#E67E22"
                stroke="#D35400"
                strokeWidth="1"
              />
              <ellipse cx="63.5" cy="6" rx="1.5" ry="0.8" fill="#34495E" />

              {/* Container Stack 1 (back left) */}
              <rect
                x="18"
                y="20"
                width="8"
                height="6"
                fill="#3498DB"
                stroke="#2980B9"
                strokeWidth="1"
              />
              <rect
                x="18"
                y="14"
                width="8"
                height="6"
                fill="#E74C3C"
                stroke="#C0392B"
                strokeWidth="1"
              />

              {/* Container Stack 2 (back middle) */}
              <rect
                x="28"
                y="20"
                width="8"
                height="6"
                fill="#2ECC71"
                stroke="#27AE60"
                strokeWidth="1"
              />
              <rect
                x="28"
                y="14"
                width="8"
                height="6"
                fill="#F39C12"
                stroke="#E67E22"
                strokeWidth="1"
              />

              {/* Container Stack 3 (front left) */}
              <rect
                x="38"
                y="20"
                width="8"
                height="6"
                fill="#9B59B6"
                stroke="#8E44AD"
                strokeWidth="1"
              />
              <rect
                x="38"
                y="14"
                width="8"
                height="6"
                fill="#1ABC9C"
                stroke="#16A085"
                strokeWidth="1"
              />

              {/* Container Stack 4 (front middle) */}
              <rect
                x="48"
                y="20"
                width="8"
                height="6"
                fill="#E67E22"
                stroke="#D35400"
                strokeWidth="1"
              />
              <rect
                x="48"
                y="14"
                width="8"
                height="6"
                fill="#3498DB"
                stroke="#2980B9"
                strokeWidth="1"
              />

              {/* Container details (to show they're containers) */}
              <line
                x1="22"
                y1="23"
                x2="22"
                y2="26"
                stroke="#2471A3"
                strokeWidth="0.5"
                opacity="0.5"
              />
              <line
                x1="32"
                y1="23"
                x2="32"
                y2="26"
                stroke="#229954"
                strokeWidth="0.5"
                opacity="0.5"
              />
              <line
                x1="42"
                y1="23"
                x2="42"
                y2="26"
                stroke="#7D3C98"
                strokeWidth="0.5"
                opacity="0.5"
              />
              <line
                x1="52"
                y1="23"
                x2="52"
                y2="26"
                stroke="#BA4A00"
                strokeWidth="0.5"
                opacity="0.5"
              />

              {/* Bow wave */}
              <ellipse
                cx="14"
                cy="36"
                rx="4"
                ry="2"
                fill="rgba(255,255,255,0.3)"
              />

              {/* Hull shadow */}
              <ellipse
                cx="40"
                cy="38"
                rx="26"
                ry="2"
                fill="#1A252F"
                opacity="0.4"
              />
            </svg>
          </div>

          {/* Sun */}
          <div className="absolute top-2 right-4 w-10 h-10 bg-yellow-300 dark:bg-yellow-400 rounded-full shadow-lg animate-pulse">
            <div className="absolute inset-0 rounded-full bg-yellow-200 dark:bg-yellow-300 animate-ping opacity-75"></div>
          </div>
        </div>

        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 text-center">
            Create Account
          </h1>
          {errors.form && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700">
              {errors.form}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Two-column grid for compact layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.username
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent`}
                  placeholder="username"
                  required
                />
                {errors.username && (
                  <p className="mt-1 text-xs text-red-600">{errors.username}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.full_name
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent`}
                  placeholder="John Doe"
                  required
                />
                {errors.full_name && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.full_name}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.email
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent`}
                  placeholder="you@example.com"
                  required
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.password
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent`}
                  placeholder="Min 6 characters"
                  required
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  value={form.confirm_password}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.confirm_password
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent`}
                  placeholder="Re-enter password"
                  required
                />
                {errors.confirm_password && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.confirm_password}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Contact *
                </label>
                <input
                  type="text"
                  name="contact"
                  value={form.contact}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.contact
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent`}
                  placeholder="+233 123456789"
                  required
                />
                {errors.contact && (
                  <p className="mt-1 text-xs text-red-600">{errors.contact}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Location *
                </label>
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.location
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent`}
                  placeholder="Accra, Ghana"
                  required
                />
                {errors.location && (
                  <p className="mt-1 text-xs text-red-600">{errors.location}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 mt-4 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
            Already have an account?{" "}
            <Link
              to="/Login"
              className="text-primary font-medium hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
