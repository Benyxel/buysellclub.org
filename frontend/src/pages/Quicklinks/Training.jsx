import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarAlt,
  FaClock,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaPlay,
  FaShoppingCart,
  FaYoutube,
  FaPassport,
  FaDollarSign,
  FaMobileAlt,
  FaCreditCard,
  FaWallet,
  FaInfoCircle,
  FaLock,
  FaSpinner,
} from "react-icons/fa";
import { toast } from "../../utils/toast";
import {
  createTrainingBooking,
  getTrainingCourses,
  checkCourseAccess,
  initiateCoursePayment,
  initiateTrainingPayment,
} from "../../api";
import { Api } from "../../api";

const Training = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    booking_date: "",
    booking_time: "",
    has_valid_passport: false,
    notes: "",
  });

  const [courses, setCourses] = useState([]);
  const [youtubeVideos, setYoutubeVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [connectingToPayment, setConnectingToPayment] = useState(false);
  const [defaultTrainingCost, setDefaultTrainingCost] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [courseAccess, setCourseAccess] = useState({}); // Track which courses user has access to
  const [checkingAccess, setCheckingAccess] = useState({}); // Track which courses are being checked
  const [currentPage, setCurrentPage] = useState(1);
  const [youtubeCurrentPage, setYoutubeCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Available time slots
  const timeSlots = [
    { value: "09:30", label: "9:30 AM" },
    { value: "12:30", label: "12:30 PM" },
    { value: "15:00", label: "3:00 PM" },
  ];

  useEffect(() => {
    fetchContent();
    fetchTrainingSettings();
  }, []);

  const fetchTrainingSettings = async () => {
    try {
      const response = await Api.training.settings();
      console.log("Training settings response:", response);
      const cost =
        response.data?.defaultTrainingCost ||
        response.data?.default_training_cost ||
        0;
      setDefaultTrainingCost(parseFloat(cost) || 0);
      console.log("Set default training cost to:", cost);
    } catch (error) {
      console.error("Error fetching training settings:", error);
      console.error("Error details:", error.response?.data);
      // Default to 0 if error
      setDefaultTrainingCost(0);
    }
  };

  const fetchContent = async () => {
    setLoading(true);
    try {
      // Fetch all active courses from backend
      const response = await getTrainingCourses();
      const allCourses = response.data || [];

      // Separate premium courses and YouTube videos
      const premiumCourses = allCourses
        .filter((course) => course.course_type === "premium")
        .map((course) => ({
          _id: course.id,
          title: course.title,
          description: course.description,
          price: parseFloat(course.price || 0),
          duration: course.duration,
          thumbnail: course.thumbnail,
          videoUrl: course.video_url,
          created_at:
            course.created_at || course.createdAt || new Date().toISOString(),
        }))
        // Sort by created_at (most recent first)
        .sort((a, b) => {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          return dateB - dateA; // Most recent first
        });

      const youtubeVideos = allCourses
        .filter((course) => course.course_type === "youtube")
        .map((course) => ({
          _id: course.id,
          title: course.title,
          description: course.description,
          thumbnail: course.thumbnail,
          videoUrl: course.video_url,
          youtubeVideoId: course.youtube_video_id,
          created_at:
            course.created_at || course.createdAt || new Date().toISOString(),
        }))
        // Sort by created_at (most recent first)
        .sort((a, b) => {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          return dateB - dateA; // Most recent first
        });

      setCourses(premiumCourses);
      setYoutubeVideos(youtubeVideos);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load training courses");
      // Set empty arrays on error
      setCourses([]);
      setYoutubeVideos([]);
    } finally {
      setLoading(false);
    }
  };

  // Get minimum date (today) and filter out weekends
  const getMinDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Check if date is a weekday (Monday-Friday)
  const isWeekday = (dateString) => {
    if (!dateString) return true;
    const date = new Date(dateString);
    const day = date.getDay();
    return day >= 1 && day <= 5; // Monday = 1, Friday = 5
  };

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    if (selectedDate && !isWeekday(selectedDate)) {
      toast.error(
        "Training sessions are only available Monday through Friday. Please select a weekday."
      );
      setFormData({
        ...formData,
        booking_date: "",
      });
      return;
    }
    setFormData({
      ...formData,
      booking_date: selectedDate,
    });
  };

  const handleProceedToPayment = async (e) => {
    e.preventDefault();

    // Check if user is authenticated
    const token = localStorage.getItem("token");
    const adminToken = localStorage.getItem("adminToken");
    if (!token && !adminToken) {
      toast.error(
        "You must be logged in to book a training session. Please log in and try again."
      );
      setTimeout(() => {
        window.location.href = "/Login";
      }, 2000);
      return;
    }

    // Validate passport
    if (!formData.has_valid_passport) {
      toast.error("You must have a valid passport to book a training session.");
      return;
    }

    // Validate date is weekday
    if (!isWeekday(formData.booking_date)) {
      toast.error(
        "Training sessions are only available Monday through Friday."
      );
      return;
    }

    // Validate all required fields
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.booking_date ||
      !formData.booking_time
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // Check if training cost is set
    if (defaultTrainingCost <= 0) {
      toast.error(
        "Training cost has not been set yet. Please contact support."
      );
      return;
    }

    setSubmitting(true);

    try {
      // First, create the booking with pending payment status
      const bookingData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        booking_date: formData.booking_date,
        booking_time: formData.booking_time,
        has_valid_passport: formData.has_valid_passport,
        notes: formData.notes || "",
        trainingCost: defaultTrainingCost,
        paymentStatus: "pending",
      };

      let bookingResponse;
      try {
        bookingResponse = await createTrainingBooking(bookingData);
      } catch (authError) {
        // If authentication fails, try public endpoint
        if (
          authError.response?.status === 401 ||
          authError.response?.status === 403
        ) {
          bookingResponse = await Api.training.bookPublic(bookingData);
        } else {
          throw authError;
        }
      }

      if (
        !bookingResponse ||
        !bookingResponse.data ||
        !bookingResponse.data.id
      ) {
        throw new Error("Failed to create booking");
      }

      const bookingId = bookingResponse.data.id;

      // Show loading state while connecting to payment gateway
      setSubmitting(false); // Allow form to show connecting state
      setConnectingToPayment(true);
      toast.info("Connecting to payment gateway...");

      try {
      // Now initiate payment gateway (Paystack)
      const baseUrl = import.meta.env?.VITE_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
      const paymentResponse = await initiateTrainingPayment(bookingId, {
        callback_url: baseUrl ? `${String(baseUrl).replace(/\/$/, "")}/payment/callback` : undefined,
      });

      if (paymentResponse.data.payment_url) {
        // Redirect to payment gateway
        toast.success("Redirecting to payment gateway...");
        window.location.href = paymentResponse.data.payment_url;
      } else {
        toast.error("Payment gateway not configured. Please contact support.");
          setConnectingToPayment(false);
        setSubmitting(false);
        }
      } catch (paymentError) {
        setConnectingToPayment(false);
        throw paymentError; // Re-throw to be handled by outer catch
      }
    } catch (error) {
      console.error("Error proceeding to payment:", error);
      console.error("Error response:", error.response);

      setConnectingToPayment(false);

      // Handle different error types
      if (error.response?.status === 503) {
        const errorMsg =
          error.response?.data?.error ||
          "Payment gateway is currently unavailable. Please contact support or try again later.";
        toast.error(errorMsg);
      } else if (error.response?.status === 400) {
        const errorMsg =
          error.response?.data?.error ||
          "Invalid booking request. Please check your information and try again.";
        toast.error(errorMsg);
      } else if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        toast.error("Please log in to book a training session");
        navigate("/Login");
      } else {
        const errorMsg =
          error.response?.data?.error ||
          error.message ||
          "Failed to proceed to payment. Please try again later.";
        toast.error(errorMsg);
      }
      setSubmitting(false);
    }
  };

  const handlePaymentComplete = async (paymentData) => {
    // After payment is successful, create the booking with payment info
    setSubmitting(true);
    let bookingData;

    try {
      bookingData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        booking_date: formData.booking_date,
        booking_time: formData.booking_time,
        has_valid_passport: formData.has_valid_passport,
        notes: formData.notes || "",
        trainingCost: defaultTrainingCost,
        paymentStatus: "paid",
        paymentMethod: paymentData.paymentMethod,
      };

      console.log("Creating booking with data:", bookingData);

      // Try authenticated endpoint first, fallback to public endpoint if auth fails
      let response;
      try {
        response = await createTrainingBooking(bookingData);
      } catch (authError) {
        // If authentication fails, try public endpoint
        if (
          authError.response?.status === 401 ||
          authError.response?.status === 403
        ) {
          console.log("Auth failed, trying public endpoint...");
          response = await Api.training.bookPublic(bookingData);
        } else {
          throw authError; // Re-throw if it's not an auth error
        }
      }
      console.log("Booking response:", response);

      // Verify the booking was created successfully
      if (!response || !response.data) {
        throw new Error("Booking creation failed - no response data received");
      }

      const savedBooking = response.data;
      console.log("Booking created successfully:", savedBooking);

      toast.success("Training session booked and payment confirmed!");

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        booking_date: "",
        booking_time: "",
        has_valid_passport: false,
        notes: "",
      });
      setShowPayment(false);

      // Wait a bit longer before redirecting to show success message
      setTimeout(() => {
        navigate("/profile");
      }, 3000);
    } catch (error) {
      console.error("Training booking error:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("Error config:", error.config);
      console.error("Booking data sent:", bookingData);

      let errorMessage = "Failed to complete booking. Please try again.";

      // Handle authentication errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        errorMessage = "Please log in to complete your booking.";
        toast.error(errorMessage);
        setTimeout(() => {
          navigate("/login");
        }, 2000);
        setShowPayment(false);
        setSubmitting(false);
        return;
      }

      if (error.response?.data) {
        // Handle validation errors
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === "object") {
          // Handle field-specific validation errors
          const errorFields = Object.keys(error.response.data);
          if (errorFields.length > 0) {
            const firstError = error.response.data[errorFields[0]];
            if (Array.isArray(firstError)) {
              errorMessage = firstError[0];
            } else if (typeof firstError === "string") {
              errorMessage = firstError;
            } else {
              errorMessage = `Validation error: ${errorFields.join(", ")}`;
            }
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      setShowPayment(false); // Hide payment section on error
      // Don't redirect on error - let user fix and try again
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const checkAccess = async (courseId) => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please log in to access premium courses");
      navigate("/Login");
      return false;
    }

    try {
      setCheckingAccess((prev) => ({ ...prev, [courseId]: true }));
      const response = await checkCourseAccess(courseId);
      const hasAccess = response.data.has_access;

      setCourseAccess((prev) => ({ ...prev, [courseId]: hasAccess }));
      return hasAccess;
    } catch (error) {
      console.error("Error checking course access:", error);
      // If error, assume no access
      setCourseAccess((prev) => ({ ...prev, [courseId]: false }));
      return false;
    } finally {
      setCheckingAccess((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const handlePurchase = async (courseId, coursePrice) => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please log in to purchase courses");
      navigate("/Login");
      return;
    }

    try {
      // Initiate payment
      const response = await initiateCoursePayment(courseId);

      if (response.data.payment_url) {
        // Redirect to payment gateway
        toast.success("Redirecting to payment gateway...");
        window.location.href = response.data.payment_url;
      } else {
        toast.error("Payment gateway not configured. Please contact support.");
      }
    } catch (error) {
      console.error("Error initiating payment:", error);
      console.error("Error response:", error.response);

      // Handle 503 Service Unavailable (payment gateway not configured)
      if (error.response?.status === 503) {
        const errorMsg =
          error.response?.data?.error ||
          "Payment gateway is currently unavailable. Please contact support or try again later.";
        toast.error(errorMsg);
      } else if (error.response?.status === 400) {
        const errorMsg =
          error.response?.data?.error ||
          "Invalid payment request. Please try again.";
        toast.error(errorMsg);
      } else if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        toast.error("Please log in to purchase courses");
        navigate("/Login");
      } else {
        const errorMsg =
          error.response?.data?.error ||
          error.message ||
          "Failed to initiate payment. Please try again later.";
        toast.error(errorMsg);
      }
    }
  };

  const handleVideoClick = async (
    courseId,
    url,
    type,
    youtubeVideoId = null,
    coursePrice = 0
  ) => {
    if (type === "youtube") {
      // YouTube videos are always accessible
      if (youtubeVideoId) {
        window.open(
          `https://www.youtube.com/watch?v=${youtubeVideoId}`,
          "_blank"
        );
      } else if (url) {
        window.open(url, "_blank");
      } else {
        toast.error("Video URL not available");
      }
    } else {
      // Premium courses require payment
      // Check if course is free
      if (coursePrice === 0 || !coursePrice) {
        // Free course, allow access
        if (url && url !== "#") {
          window.open(url, "_blank");
        } else {
          toast.error("Video URL not available");
        }
        return;
      }

      // Check if user has access
      const hasAccess = await checkAccess(courseId);

      if (hasAccess) {
        // User has paid, allow access
        if (url && url !== "#") {
          window.open(url, "_blank");
        } else {
          toast.error("Video URL not available");
        }
      } else {
        // User hasn't paid, prompt for payment
        toast.info("Please purchase this course to access the video");
        // Optionally show a purchase button or modal
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
          Book a Training Session
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Schedule a personalized training session with our experts. Choose your
          preferred date and time, and we'll help you master the skills you
          need.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12 max-w-5xl mx-auto">
        {/* Contact Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Training Information
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-full flex-shrink-0">
                <FaMapMarkerAlt className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                  Location
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  FOFOOFO GROUP, Israel Palm-plaza, Okropom Street(Pazzy's
                  Villa), Accra
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-full flex-shrink-0">
                <FaClock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                  Available Hours
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Monday - Friday: 9:30 AM, 12:30 PM, 3:00 PM
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-full flex-shrink-0">
                <FaEnvelope className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                  Contact
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  support@buysellclub.org
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Book Your Session
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProceedToPayment(e);
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FaUser className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FaPhone className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1.5">
                  Date <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 block mt-0.5">
                    (Monday - Friday only)
                  </span>
                </label>
                <div className="relative">
                  <FaCalendarAlt className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    name="booking_date"
                    value={formData.booking_date}
                    onChange={handleDateChange}
                    min={getMinDate()}
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1.5">
                  Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaClock className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 w-4 h-4" />
                  <select
                    name="booking_time"
                    value={formData.booking_time}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white appearance-none"
                    required
                  >
                    <option value="">Select a time</option>
                    {timeSlots.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  name="has_valid_passport"
                  id="has_valid_passport"
                  checked={formData.has_valid_passport}
                  onChange={handleChange}
                  className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  required
                />
                <label htmlFor="has_valid_passport" className="flex-1">
                  <div className="flex items-center gap-1.5 text-gray-800 dark:text-white text-sm font-medium mb-0.5">
                    <FaPassport className="text-primary w-3.5 h-3.5" />
                    <span>I confirm that I have a valid passport</span>
                    <span className="text-red-500">*</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    A valid passport is required to attend the training session.
                    If you do not have a valid passport, please obtain one
                    before booking.
                  </p>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1.5">
                Additional Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Any special requirements or questions..."
              ></textarea>
            </div>

            {/* Payment Information */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <FaDollarSign className="text-blue-600 dark:text-blue-400 mt-0.5 w-4 h-4" />
                <div className="flex-1">
                  <h4 className="text-sm text-gray-800 dark:text-white font-medium mb-0.5">
                    Training Cost
                  </h4>
                  <p className="text-lg font-bold text-primary mb-1">
                    GHS {Number(defaultTrainingCost).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Payment must be completed before booking can be submitted.
                  </p>
                </div>
              </div>
            </div>

            {!showPayment ? (
              <>
              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={
                  submitting ||
                    connectingToPayment ||
                  !formData.has_valid_passport ||
                  defaultTrainingCost <= 0
                }
                className="w-full bg-primary text-white py-2 text-sm rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                  {connectingToPayment ? (
                    <>
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Connecting to Payment Gateway...
                    </>
                  ) : submitting ? (
                    <>
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                <FaDollarSign className="w-4 h-4" />
                Proceed to Payment
                    </>
                  )}
              </button>
                {connectingToPayment && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      <span>Please wait while we connect to the payment gateway. This may take a few seconds...</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <PaymentSectionInline
                cost={defaultTrainingCost}
                onPaymentComplete={handlePaymentComplete}
                onCancel={() => setShowPayment(false)}
                loading={submitting}
              />
            )}
          </form>
        </div>
      </div>

      {/* Video Courses Section */}
      <div className="space-y-12">
        {/* Paid Courses Section */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
              Premium Training Courses
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Access our premium video courses with in-depth content and expert
              instruction.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Calculate pagination */}
              {(() => {
                const totalPages = Math.ceil(courses.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const currentCourses = courses.slice(startIndex, endIndex);

                return (
                  <>
                    <div className="flex justify-center">
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 justify-items-center max-w-7xl w-full">
                        {currentCourses.map((course) => (
                          <div
                            key={course._id}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden w-full max-w-xs mx-auto"
                          >
                            <div className="relative">
                              {course.thumbnail ? (
                                <img
                                  src={course.thumbnail}
                                  alt={course.title}
                                  className="w-full h-32 object-cover"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                  <span className="text-gray-400 dark:text-gray-500 text-xs">
                                    Course Image
                                  </span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                {courseAccess[course._id] ? (
                                  <button
                                    onClick={() =>
                                      handleVideoClick(
                                        course._id,
                                        course.videoUrl,
                                        "paid",
                                        null,
                                        course.price
                                      )
                                    }
                                    className="p-1.5 bg-white rounded-full text-primary hover:text-primary/90"
                                    title="Watch course"
                                  >
                                    <FaPlay className="w-5 h-5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleVideoClick(
                                        course._id,
                                        course.videoUrl,
                                        "paid",
                                        null,
                                        course.price
                                      )
                                    }
                                    className="p-1.5 bg-white rounded-full text-gray-600 hover:text-gray-700"
                                    title="Purchase to unlock"
                                  >
                                    <FaLock className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="p-3">
                              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-1 line-clamp-1">
                                {course.title}
                              </h3>
                              <p className="text-gray-600 dark:text-gray-400 text-xs mb-2 line-clamp-2">
                                {course.description}
                              </p>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-primary font-semibold text-sm">
                                  ₵{course.price.toFixed(2)}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 text-xs">
                                  {course.duration}
                                </span>
                              </div>
                              {courseAccess[course._id] ? (
                                <button
                                  onClick={() =>
                                    handleVideoClick(
                                      course._id,
                                      course.videoUrl,
                                      "paid",
                                      null,
                                      course.price
                                    )
                                  }
                                  className="w-full mt-2 bg-green-500 text-white py-1.5 text-xs rounded-lg hover:bg-green-600 transition-colors duration-200 flex items-center justify-center gap-1.5"
                                >
                                  <FaPlay className="w-3 h-3" />
                                  Watch Course
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    handlePurchase(course._id, course.price)
                                  }
                                  className="w-full mt-2 bg-primary text-white py-1.5 text-xs rounded-lg hover:bg-primary/90 transition-colors duration-200 flex items-center justify-center gap-1.5"
                                  disabled={checkingAccess[course._id]}
                                >
                                  {checkingAccess[course._id] ? (
                                    <>
                                      <FaSpinner className="animate-spin w-3 h-3" />
                                      Checking...
                                    </>
                                  ) : (
                                    <>
                                      <FaShoppingCart className="w-3 h-3" />
                                      Purchase Course
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pagination Controls for Premium Courses */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-8">
                        <button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={currentPage === 1}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
                        >
                          <span>←</span>
                          Previous
                        </button>

                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: totalPages },
                            (_, i) => i + 1
                          ).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 rounded-lg transition-colors duration-200 ${
                                currentPage === page
                                  ? "bg-primary text-white"
                                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(totalPages, prev + 1)
                            )
                          }
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
                        >
                          Next
                          <span>→</span>
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>

        {/* YouTube Videos Section */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
              Free YouTube Training
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Watch our free training videos on YouTube and start learning
              today.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Calculate pagination for YouTube videos */}
              {(() => {
                const totalPages = Math.ceil(
                  youtubeVideos.length / itemsPerPage
                );
                const startIndex = (youtubeCurrentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const currentVideos = youtubeVideos.slice(startIndex, endIndex);

                return (
                  <>
                    <div className="flex justify-center">
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 justify-items-center max-w-7xl w-full">
                        {currentVideos.map((video) => (
                          <div
                            key={video._id}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden w-full max-w-xs"
                          >
                            <div className="relative">
                              {video.thumbnail ? (
                                <img
                                  src={video.thumbnail}
                                  alt={video.title}
                                  className="w-full h-32 object-cover"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                  <span className="text-gray-400 dark:text-gray-500 text-xs">
                                    Video Thumbnail
                                  </span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() =>
                                    handleVideoClick(
                                      video.videoUrl,
                                      "youtube",
                                      video.youtubeVideoId
                                    )
                                  }
                                  className="p-1.5 bg-white rounded-full text-red-600 hover:text-red-700"
                                  title="Watch on YouTube"
                                >
                                  <FaYoutube className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                            <div className="p-3">
                              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-1 line-clamp-1">
                                {video.title}
                              </h3>
                              <p className="text-gray-600 dark:text-gray-400 text-xs mb-2 line-clamp-2">
                                {video.description}
                              </p>
                              <button
                                onClick={() =>
                                  handleVideoClick(
                                    video.videoUrl,
                                    "youtube",
                                    video.youtubeVideoId
                                  )
                                }
                                className="w-full mt-2 bg-red-600 text-white py-1.5 text-xs rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center justify-center gap-1.5"
                              >
                                <FaYoutube className="w-3 h-3" />
                                Watch on YouTube
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pagination Controls for YouTube Videos */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-8">
                        <button
                          onClick={() =>
                            setYoutubeCurrentPage((prev) =>
                              Math.max(1, prev - 1)
                            )
                          }
                          disabled={youtubeCurrentPage === 1}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
                        >
                          <span>←</span>
                          Previous
                        </button>

                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: totalPages },
                            (_, i) => i + 1
                          ).map((page) => (
                            <button
                              key={page}
                              onClick={() => setYoutubeCurrentPage(page)}
                              className={`px-3 py-1 rounded-lg transition-colors duration-200 ${
                                youtubeCurrentPage === page
                                  ? "bg-primary text-white"
                                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() =>
                            setYoutubeCurrentPage((prev) =>
                              Math.min(totalPages, prev + 1)
                            )
                          }
                          disabled={youtubeCurrentPage === totalPages}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
                        >
                          Next
                          <span>→</span>
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>

        <div className="text-center mt-12">
          <a
            href="#"
            className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
          >
            <FaYoutube className="w-6 h-6" />
            Subscribe to Our Channel
          </a>
        </div>
      </div>
    </div>
  );
};

// Inline Payment Section Component
const PaymentSectionInline = ({
  cost,
  onPaymentComplete,
  onCancel,
  loading,
}) => {
  const [selectedMethod, setSelectedMethod] = useState("mobile");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    if (selectedMethod === "mobile" && !phoneNumber) {
      toast.error("Please enter your phone number");
      return;
    }

    setProcessing(true);
    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Only call onPaymentComplete if payment simulation succeeds
      // The actual booking creation happens in handlePaymentComplete
      onPaymentComplete({
        paymentMethod: selectedMethod,
        phoneNumber: selectedMethod === "mobile" ? phoneNumber : undefined,
      });
    } catch (error) {
      console.error("Payment processing error:", error);
      toast.error("Payment failed. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Select Payment Method
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setSelectedMethod("mobile")}
              className={`p-4 rounded-lg border-2 transition-colors ${
                selectedMethod === "mobile"
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
              }`}
            >
              <FaMobileAlt className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Mobile Money
              </span>
            </button>
            <button
              onClick={() => setSelectedMethod("card")}
              className={`p-4 rounded-lg border-2 transition-colors ${
                selectedMethod === "card"
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
              }`}
            >
              <FaCreditCard className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Card
              </span>
            </button>
            <button
              onClick={() => setSelectedMethod("cash")}
              className={`p-4 rounded-lg border-2 transition-colors ${
                selectedMethod === "cash"
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
              }`}
            >
              <FaWallet className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Cash
              </span>
            </button>
          </div>

          {selectedMethod === "mobile" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-3">
              <FaInfoCircle className="w-5 h-5 text-blue-500 mt-1" />
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Your payment will be processed securely. For mobile money
                  payments, you'll receive a prompt on your phone to confirm the
                  transaction.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={processing || loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              disabled={processing || loading}
              className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing || loading
                ? "Processing..."
                : `Pay GHS ${Number(cost).toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Training;
