import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "../utils/toast";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import API from "../api";
import { normalizePhone } from "../utils/ghanaPhone";
import WhatsAppWidget from "../components/WhatsAppWidget";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    location.state?.redirectTo ??
    (() => {
      const q = new URLSearchParams(location.search);
      const r = q.get("redirectTo");
      return r && r.startsWith("/") ? r : null;
    })();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [useOtp, setUseOtp] = useState(false);
  const [otpIdentifier, setOtpIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [errors, setErrors] = useState({
    username: "",
    password: "",
    form: "",
  });
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [showGoogleContactModal, setShowGoogleContactModal] = useState(false);
  const [googleContact, setGoogleContact] = useState("");
  const [googleContactError, setGoogleContactError] = useState("");
  const [googleContactLoading, setGoogleContactLoading] = useState(false);
  const [googleLoginUsername, setGoogleLoginUsername] = useState("");
  const [suspendedModal, setSuspendedModal] = useState({ open: false, reason: "" });

  const openSuspendedModal = (reason) => {
    const text =
      (reason || "").trim() ||
      "Your account has been suspended. Please contact support.";
    setSuspendedModal({ open: true, reason: text });
    setErrors((p) => ({ ...p, form: "" }));
  };

  const suspendedReasonFromResponse = (data) => {
    if (!data || !data.account_suspended) return null;
    return (
      (data.suspension_reason || data.detail || "").trim() ||
      "Your account has been suspended. Please contact support."
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Client-side validation
    const newErrors = { username: "", password: "", form: "" };
    if (!username) newErrors.username = "Username is required";
    if (!password) newErrors.password = "Password is required";
    setErrors(newErrors);
    if (newErrors.username || newErrors.password) {
      toast.error("Please enter username and password");
      setLoading(false);
      return;
    }

    try {
      // Call Django JWT token endpoint
      const response = await API.post("/buysellapi/token/", {
        username,
        password,
      });

      // Extract tokens from response
      const { access, refresh } = response.data;

      // Save tokens to localStorage
      localStorage.setItem("token", access);
      localStorage.setItem("refreshToken", refresh);
      localStorage.setItem("userData", JSON.stringify({ username }));

      // Debug: Verify token was saved
      console.log("Login - Token saved:", {
        token: access,
        refreshToken: refresh,
        userData: { username },
      });

      // Dispatch custom event to notify Navbar of login
      // Set login prompt flag to show one-time post-login modal
      try {
        localStorage.setItem("loginPrompt", JSON.stringify({ username }));
      } catch {
        // ignore
      }

      window.dispatchEvent(new Event("authChange"));

      toast.success("Logged in successfully!");

      // Navigate to redirect target (e.g. CommunityPayment) or home
      navigate(redirectTo || "/");
    } catch (err) {
      console.error("Login error:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);

      const suspended = suspendedReasonFromResponse(err.response?.data);
      if (suspended) {
        openSuspendedModal(suspended);
        return;
      }

      let errorMsg = "Login failed. Please try again.";

      // Handle 400 Bad Request errors
      if (err.response?.status === 400) {
        if (err.response?.data?.non_field_errors) {
          const errors = err.response.data.non_field_errors;
          errorMsg = Array.isArray(errors) ? errors[0] : errors;
        } else if (err.response?.data?.detail) {
          errorMsg = err.response.data.detail;
        } else if (err.response?.data?.username) {
          const usernameErrors = err.response.data.username;
          errorMsg = Array.isArray(usernameErrors)
            ? usernameErrors[0]
            : usernameErrors;
        } else if (err.response?.data?.password) {
          const passwordErrors = err.response.data.password;
          errorMsg = Array.isArray(passwordErrors)
            ? passwordErrors[0]
            : passwordErrors;
        } else if (err.response?.data?.message) {
          errorMsg = err.response.data.message;
        } else {
          // Try to extract any error message from the response
          const errorKeys = Object.keys(err.response?.data || {});
          if (errorKeys.length > 0) {
            const firstError = err.response.data[errorKeys[0]];
            errorMsg = Array.isArray(firstError)
              ? firstError[0]
              : String(firstError);
          }
        }
      }
      // Handle 401 Unauthorized errors
      else if (err.response?.status === 401) {
        errorMsg = "Invalid username or password";

        if (err.response?.data?.detail) {
          errorMsg = err.response.data.detail;
        } else if (err.response?.data?.non_field_errors) {
          const errors = err.response.data.non_field_errors;
          errorMsg = Array.isArray(errors) ? errors[0] : errors;
        } else if (err.response?.data?.message) {
          errorMsg = err.response.data.message;
        }
      }
      // Handle other errors
      else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else if (err.response?.data?.non_field_errors) {
        const errors = err.response.data.non_field_errors;
        errorMsg = Array.isArray(errors) ? errors[0] : errors;
      } else if (err.message) {
        errorMsg = err.message;
      }

      setErrors((prev) => ({ ...prev, form: errorMsg }));
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!otpIdentifier) {
      toast.error("Please enter your email or username");
      return;
    }
    try {
      setLoading(true);
      await API.post("/buysellapi/auth/request-otp/", {
        identifier: otpIdentifier,
      });
      setOtpSent(true);
      toast.success("OTP sent! Check your email");
    } catch (err) {
      const suspended = suspendedReasonFromResponse(err.response?.data);
      if (suspended) {
        openSuspendedModal(suspended);
        return;
      }
      const msg = err.response?.data?.detail || "Failed to send OTP";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpIdentifier || !otpCode) {
      toast.error("Enter your identifier and the OTP code");
      return;
    }
    try {
      setLoading(true);
      const resp = await API.post("/buysellapi/auth/verify-otp/", {
        identifier: otpIdentifier,
        code: otpCode,
      });
      const { access, refresh, username: u } = resp.data || {};
      if (!access || !refresh) {
        throw new Error("Invalid server response");
      }
      localStorage.setItem("token", access);
      localStorage.setItem("refreshToken", refresh);
      localStorage.setItem("userData", JSON.stringify({ username: u }));
      window.dispatchEvent(new Event("authChange"));
      toast.success("Logged in with OTP!");
      navigate(redirectTo || "/");
    } catch (err) {
      const suspended = suspendedReasonFromResponse(err.response?.data);
      if (suspended) {
        openSuspendedModal(suspended);
        return;
      }
      const msg =
        err.response?.data?.detail || "Invalid code. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(
    async (tokenResponse) => {
      console.log("Google credential received:", tokenResponse);

      // Handle both CredentialResponse and direct credential string
      const credential = tokenResponse?.credential || tokenResponse;

      if (
        !credential ||
        typeof credential !== "string" ||
        credential.trim() === ""
      ) {
        console.error("Invalid credential format:", tokenResponse);
        setGoogleError("Unable to read Google credentials. Please try again.");
        setGoogleLoading(false);
        return;
      }

      setGoogleLoading(true);
      try {
        console.log("Sending credential to backend...");
        const response = await API.post("/buysellapi/auth/google-login/", {
          credential: credential.trim(),
        });
        const {
          access,
          refresh,
          username: returnedUsername,
          needs_contact_update,
        } = response.data || {};

        if (!access || !refresh) {
          throw new Error("Authentication tokens were not returned.");
        }

        const persistedUsername = returnedUsername || "";
        localStorage.setItem("token", access);
        localStorage.setItem("refreshToken", refresh);
        localStorage.setItem(
          "userData",
          JSON.stringify({ username: persistedUsername })
        );
        localStorage.setItem(
          "loginPrompt",
          JSON.stringify({ username: persistedUsername })
        );
        window.dispatchEvent(new Event("authChange"));
        setGoogleLoginUsername(persistedUsername);
        setGoogleError("");

        if (needs_contact_update) {
          setGoogleContact("");
          setShowGoogleContactModal(true);
        } else {
          toast.success("Logged in with Google!");
          navigate(redirectTo || "/");
        }
      } catch (err) {
        console.error("Google login error:", err);
        console.error("Error details:", {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          statusText: err.response?.statusText,
          url: err.config?.url,
        });
        const suspended = suspendedReasonFromResponse(err.response?.data);
        if (suspended) {
          openSuspendedModal(suspended);
          setGoogleError("");
          return;
        }
        const message =
          err.response?.data?.detail ||
          err.response?.data?.form ||
          err.response?.data?.message ||
          err.message ||
          "Google login failed. Please try again.";
        setGoogleError(message);
        toast.error(message);
      } finally {
        setGoogleLoading(false);
      }
    },
    [navigate, redirectTo]
  );

  useEffect(() => {
    if (!googleClientId) return undefined;

    setGoogleReady(false);
    const scriptId = "google-oauth-script-login";
    const initClient = () => {
      if (!window.google?.accounts?.id) {
        setGoogleError(
          "Google Identity SDK failed to initialize. Refresh the page to try again."
        );
        return;
      }

      // Initialize Google Identity Services for ID tokens
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          console.log("Google callback triggered:", response);
          handleGoogleCredential(response);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Render the Google Sign-In button
      const buttonDiv = document.getElementById("google-login-button");
      if (buttonDiv) {
        // Clear any existing content
        buttonDiv.innerHTML = "";
        window.google.accounts.id.renderButton(buttonDiv, {
          theme: "outline",
          size: "large",
          type: "standard",
          text: "signin_with",
          width: "100%",
        });
      }

      setGoogleReady(true);
      setGoogleError("");
    };

    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      if (window.google?.accounts?.id) {
        initClient();
      } else {
        existingScript.addEventListener("load", initClient);
        return () => existingScript.removeEventListener("load", initClient);
      }
      return undefined;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initClient;
    script.onerror = () => {
      setGoogleError("Failed to load Google login. Please try again shortly.");
    };
    document.head.appendChild(script);

    return () => {
      const scriptEl = document.getElementById(scriptId);
      if (scriptEl && scriptEl.parentNode) {
        scriptEl.parentNode.removeChild(scriptEl);
      }
    };
  }, [googleClientId, handleGoogleCredential]);

  const handleGoogleLogin = () => {
    setGoogleError("");

    if (!googleClientId) {
      setGoogleError("Google login is not configured yet.");
      return;
    }

    if (!window.google?.accounts?.id) {
      setGoogleError("Google login is still loading. Please wait a moment.");
      return;
    }

    // Trigger the Google button click programmatically
    const buttonDiv = document.getElementById("google-login-button");
    if (buttonDiv) {
      const googleButton = buttonDiv.querySelector('div[role="button"]');
      if (googleButton) {
        googleButton.click();
      } else {
        setGoogleError(
          "Google button is not ready. Please wait a moment and try again."
        );
      }
    } else {
      setGoogleError(
        "Google sign-in button not found. Please refresh the page."
      );
    }
  };

  const handleGoogleContactSave = async () => {
    const trimmedContact = googleContact.trim();
    if (!trimmedContact) {
      setGoogleContactError("Contact number is required");
      return;
    }

    const normalized = normalizePhone(trimmedContact);
    if (!normalized.ok) {
      setGoogleContactError(normalized.error || "Please enter a valid contact number");
      return;
    }

    setGoogleContactError("");
    setGoogleContactLoading(true);

    try {
      await API.patch("/buysellapi/users/me/", { contact: normalized.normalized });
      toast.success("Contact saved! Redirecting.");
      setShowGoogleContactModal(false);
      setGoogleContact("");
      navigate(redirectTo || "/");
    } catch (err) {
      const message =
        err.response?.data?.contact ||
        err.response?.data?.detail ||
        "Failed to save contact. Please try again.";
      setGoogleContactError(message);
      toast.error(message);
    } finally {
      setGoogleContactLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
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

        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              Login
            </h1>
            <button
              type="button"
              onClick={() => {
                setUseOtp(!useOtp);
                setErrors({ username: "", password: "", form: "" });
              }}
              className="text-sm text-primary hover:underline"
            >
              {useOtp ? "Use password instead" : "Login with OTP"}
            </button>
          </div>
          <div className="-mt-4 mb-4 text-right">
            <button
              type="button"
              onClick={() => setShowReset(!showReset)}
              className="text-xs text-gray-600 dark:text-gray-300 hover:underline"
            >
              {showReset ? "Close password reset" : "Forgot password?"}
            </button>
          </div>
          {errors.form && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700">
              {errors.form}
            </div>
          )}
          {showReset ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Forgot password? Reset it
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We’ll send a code to your email so you can set a new password. This is not the same as logging in with OTP — use &quot;Login with OTP&quot; above if you only want to sign in with a code.
              </p>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  Email or Username
                </label>
                <input
                  type="text"
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="you@example.com or username"
                />
              </div>
              {!resetSent ? (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      if (!resetIdentifier) {
                        toast.error("Enter your email or username");
                        return;
                      }
                      try {
                        setLoading(true);
                        await API.post(
                          "/buysellapi/auth/request-password-reset/",
                          {
                            identifier: resetIdentifier,
                          }
                        );
                        setResetSent(true);
                        toast.success("Reset code sent if the account exists.");
                      } catch (err) {
                        const msg =
                          err.response?.data?.detail ||
                          "Failed to send reset code";
                        toast.error(msg);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className={`w-full py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors ${
                      loading ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading ? "Sending..." : "Send password reset code"}
                  </button>
                  <div className="text-center mt-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={async () => {
                        if (!resetIdentifier) {
                          toast.error("Enter your email or username first");
                          return;
                        }
                        try {
                          setLoading(true);
                          await API.post(
                            "/buysellapi/auth/request-password-reset-link/",
                            { email: resetIdentifier, identifier: resetIdentifier }
                          );
                          toast.success(
                            "If an account exists, a reset link has been sent to your email. Check your inbox (and spam)."
                          );
                        } catch (err) {
                          toast.error(err.response?.data?.error || "Failed to send link.");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="text-sm text-primary hover:underline disabled:opacity-50"
                    >
                      Prefer a link? Send reset link to my email
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      Enter Code
                    </label>
                    <input
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent tracking-widest"
                      placeholder="123456"
                      inputMode="numeric"
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="********"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmNewPassword ? "text" : "password"}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="********"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmNewPassword(!showConfirmNewPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                        aria-label={
                          showConfirmNewPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showConfirmNewPassword ? (
                          <FaEyeSlash className="w-5 h-5" />
                        ) : (
                          <FaEye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      if (
                        !resetIdentifier ||
                        !resetCode ||
                        !newPassword ||
                        !confirmNewPassword
                      ) {
                        toast.error("Please fill all fields");
                        return;
                      }
                      if (newPassword !== confirmNewPassword) {
                        toast.error("Passwords do not match");
                        return;
                      }
                      try {
                        setLoading(true);
                        await API.post(
                          "/buysellapi/auth/verify-password-reset/",
                          {
                            identifier: resetIdentifier,
                            code: resetCode,
                            new_password: newPassword,
                            confirm_password: confirmNewPassword,
                          }
                        );
                        toast.success(
                          "Password reset successful. You can now log in."
                        );
                        // Reset UI back to login
                        setShowReset(false);
                        setUseOtp(false);
                      } catch (err) {
                        const msg =
                          err.response?.data?.detail ||
                          err.response?.data?.confirm_password ||
                          "Failed to reset password";
                        toast.error(msg);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className={`w-full py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors ${
                      loading ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetSent(false)}
                    className="w-full py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Resend Code
                  </button>
                </>
              )}
            </div>
          ) : useOtp ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  Email or Username
                </label>
                <input
                  type="text"
                  value={otpIdentifier}
                  onChange={(e) => setOtpIdentifier(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent`}
                  placeholder="you@example.com or username"
                />
              </div>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading}
                  className={`w-full py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? "Sending..." : "Send Code"}
                </button>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      Enter Code
                    </label>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent tracking-widest`}
                      placeholder="123456"
                      inputMode="numeric"
                      maxLength={6}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading}
                    className={`w-full py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors ${
                      loading ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading ? "Verifying..." : "Verify & Sign in"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="w-full py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Resend Code
                  </button>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.username
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent`}
                  placeholder="Enter your username"
                  autoComplete="username"
                />
                {errors.username && (
                  <p className="mt-1 text-xs text-red-600">{errors.username}</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-2 pr-10 rounded-lg border ${
                      errors.password
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent`}
                    placeholder="********"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <FaEyeSlash className="w-5 h-5" />
                    ) : (
                      <FaEye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors ${
                  loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              {/* Google Login Section */}
              {googleClientId && (
                <div className="mt-4">
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  {googleError && (
                    <div className="mb-3 p-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                      {googleError}
                    </div>
                  )}

                  <div id="google-login-button" className="w-full"></div>

                  {!googleReady && googleClientId && (
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={googleLoading || !googleReady}
                      className={`w-full mt-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 ${
                        googleLoading || !googleReady
                          ? "opacity-70 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      {googleLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-300"></div>
                          <span>Signing in with Google...</span>
                        </>
                      ) : (
                        <>
                          <FcGoogle className="w-5 h-5" />
                          <span>Sign in with Google</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </form>
          )}

          {/* Google Contact Modal */}
          {showGoogleContactModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  Complete Your Profile
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Please provide your contact number to complete your account
                  setup. This is required to continue.
                </p>
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={googleContact}
                    onChange={(e) => {
                      setGoogleContact(e.target.value);
                      setGoogleContactError("");
                    }}
                    required
                    className={`w-full px-4 py-2 rounded-lg border ${
                      googleContactError
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent`}
                    placeholder="Enter your contact number"
                  />
                  {googleContactError && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {googleContactError}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleGoogleContactSave}
                    disabled={googleContactLoading || !googleContact.trim()}
                    className={`flex-1 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors ${
                      googleContactLoading || !googleContact.trim()
                        ? "opacity-70 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {googleContactLoading ? "Saving..." : "Save & Continue"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {suspendedModal.open && (
            <>
              <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
                <div
                  className="max-w-md w-full rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-red-200 dark:border-red-900/50 p-6"
                  role="alertdialog"
                  aria-labelledby="suspended-title"
                  aria-describedby="suspended-desc"
                >
                  <h3
                    id="suspended-title"
                    className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2"
                  >
                    Account suspended
                  </h3>
                  <p
                    id="suspended-desc"
                    className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4"
                  >
                    {suspendedModal.reason}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Questions or think this is a mistake? Tap{" "}
                    <strong className="text-gray-900 dark:text-white">WhatsApp now</strong>{" "}
                    to reach us.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSuspendedModal({ open: false, reason: "" })}
                    className="w-full py-2.5 rounded-lg bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 font-medium hover:opacity-90 transition-opacity"
                  >
                    OK
                  </button>
                </div>
              </div>
              <WhatsAppWidget
                phone="+233535377248"
                label="WhatsApp now"
                className="!z-[2100]"
              />
            </>
          )}

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            <span>Don&apos;t have an account? </span>
            <Link to="/Signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
