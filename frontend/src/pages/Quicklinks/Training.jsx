import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaClock, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaPlay, FaShoppingCart, FaYoutube, FaPassport } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { createTrainingBooking, getTrainingCourses } from '../../api';

const Training = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    booking_date: '',
    booking_time: '',
    has_valid_passport: false,
    notes: ''
  });

  const [courses, setCourses] = useState([]);
  const [youtubeVideos, setYoutubeVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Available time slots
  const timeSlots = [
    { value: '09:30', label: '9:30 AM' },
    { value: '12:30', label: '12:30 PM' },
    { value: '15:00', label: '3:00 PM' },
  ];

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    try {
      // Fetch all active courses from backend
      const response = await getTrainingCourses();
      const allCourses = response.data || [];
      
      // Separate premium courses and YouTube videos
      const premiumCourses = allCourses
        .filter(course => course.course_type === 'premium')
        .map(course => ({
          _id: course.id,
          title: course.title,
          description: course.description,
          price: parseFloat(course.price || 0),
          duration: course.duration,
          thumbnail: course.thumbnail,
          videoUrl: course.video_url,
        }));
      
      const youtubeVideos = allCourses
        .filter(course => course.course_type === 'youtube')
        .map(course => ({
          _id: course.id,
          title: course.title,
          description: course.description,
          thumbnail: course.thumbnail,
          videoUrl: course.video_url,
          youtubeVideoId: course.youtube_video_id,
        }));
      
      setCourses(premiumCourses);
      setYoutubeVideos(youtubeVideos);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load training courses');
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
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
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
      toast.error('Training sessions are only available Monday through Friday. Please select a weekday.');
      setFormData({
        ...formData,
        booking_date: ''
      });
      return;
    }
    setFormData({
      ...formData,
      booking_date: selectedDate
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const adminToken = localStorage.getItem('adminToken');
    if (!token && !adminToken) {
      toast.error('You must be logged in to book a training session. Please log in and try again.');
      // Optionally redirect to login page
      setTimeout(() => {
        window.location.href = '/Login';
      }, 2000);
      return;
    }
    
    // Validate passport
    if (!formData.has_valid_passport) {
      toast.error('You must have a valid passport to book a training session.');
      return;
    }

    // Validate date is weekday
    if (!isWeekday(formData.booking_date)) {
      toast.error('Training sessions are only available Monday through Friday.');
      return;
    }

    // Validate all required fields
    if (!formData.name || !formData.email || !formData.phone || !formData.booking_date || !formData.booking_time) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const bookingData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        booking_date: formData.booking_date,
        booking_time: formData.booking_time,
        has_valid_passport: formData.has_valid_passport,
        notes: formData.notes || ''
      };

      const response = await createTrainingBooking(bookingData);
      toast.success('Training session booked successfully!');
      setFormData({
        name: '',
        email: '',
        phone: '',
        booking_date: '',
        booking_time: '',
        has_valid_passport: false,
        notes: ''
      });
    } catch (error) {
      console.error('Training booking error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Failed to book training session. Please try again.';
      
      if (error.response?.status === 401) {
        errorMessage = 'You must be logged in to book a training session. Please log in and try again.';
      } else if (error.response?.data) {
        // Handle field-specific errors
        if (error.response.data.has_valid_passport) {
          errorMessage = Array.isArray(error.response.data.has_valid_passport) 
            ? error.response.data.has_valid_passport[0] 
            : error.response.data.has_valid_passport;
        } else if (error.response.data.booking_date) {
          errorMessage = Array.isArray(error.response.data.booking_date) 
            ? error.response.data.booking_date[0] 
            : error.response.data.booking_date;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.non_field_errors) {
          errorMessage = Array.isArray(error.response.data.non_field_errors)
            ? error.response.data.non_field_errors[0]
            : error.response.data.non_field_errors;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handlePurchase = (courseId) => {
    // Here you would typically handle the purchase process
    toast.success('Course added to cart!');
  };

  const handleVideoClick = (url, type, youtubeVideoId = null) => {
    if (type === 'youtube') {
      // If we have a YouTube video ID, construct the embed URL
      if (youtubeVideoId) {
        window.open(`https://www.youtube.com/watch?v=${youtubeVideoId}`, '_blank');
      } else if (url) {
        window.open(url, '_blank');
      } else {
        toast.error('Video URL not available');
      }
    } else {
      // Handle paid course video preview differently
      if (url && url !== '#') {
        window.open(url, '_blank');
      } else {
        toast.info('Video preview is available after purchase');
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
          Schedule a personalized training session with our experts. Choose your preferred date and time, and we'll help you master the skills you need.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
        {/* Contact Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
            Training Information
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <FaMapMarkerAlt className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">Location</h3>
                <p className="text-gray-600 dark:text-gray-400">123 Training Center, City, Country</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <FaClock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">Available Hours</h3>
                <p className="text-gray-600 dark:text-gray-400">Monday - Friday: 9:30 AM, 12:30 PM, 3:00 PM</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <FaEnvelope className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">Contact</h3>
                <p className="text-gray-600 dark:text-gray-400">training@example.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
            Book Your Session
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">
                  Date <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 block mt-1">(Monday - Friday only)</span>
                </label>
                <div className="relative">
                  <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    name="booking_date"
                    value={formData.booking_date}
                    onChange={handleDateChange}
                    min={getMinDate()}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">
                  Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                  <select
                    name="booking_time"
                    value={formData.booking_time}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white appearance-none"
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

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="has_valid_passport"
                  id="has_valid_passport"
                  checked={formData.has_valid_passport}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  required
                />
                <label htmlFor="has_valid_passport" className="flex-1">
                  <div className="flex items-center gap-2 text-gray-800 dark:text-white font-medium mb-1">
                    <FaPassport className="text-primary" />
                    <span>I confirm that I have a valid passport</span>
                    <span className="text-red-500">*</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    A valid passport is required to attend the training session. If you do not have a valid passport, please obtain one before booking.
                  </p>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Additional Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Any special requirements or questions..."
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submitting || !formData.has_valid_passport}
              className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Booking...
                </>
              ) : (
                'Book Training Session'
              )}
            </button>
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
              Access our premium video courses with in-depth content and expert instruction.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((course) => (
            <div key={course._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="relative">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-500 text-sm">Course Image</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <button
                        onClick={() => handleVideoClick(course.videoUrl, 'paid')}
                    className="p-2 bg-white rounded-full text-primary hover:text-primary/90"
                    title="Preview course"
                  >
                    <FaPlay className="w-8 h-8" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  {course.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  {course.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-primary font-semibold">
                    ${course.price.toFixed(2)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    {course.duration}
                  </span>
                </div>
                <button
                  onClick={() => handlePurchase(course._id)}
                  className="w-full mt-4 bg-primary text-white py-2 rounded-lg hover:bg-primary/90 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <FaShoppingCart />
                  Purchase Course
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
        </div>

        {/* YouTube Videos Section */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
              Free YouTube Training
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Watch our free training videos on YouTube and start learning today.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {youtubeVideos.map((video) => (
                <div key={video._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                  <div className="relative">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-400 dark:text-gray-500 text-sm">Video Thumbnail</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleVideoClick(video.videoUrl, 'youtube', video.youtubeVideoId)}
                        className="p-2 bg-white rounded-full text-red-600 hover:text-red-700"
                        title="Watch on YouTube"
                      >
                        <FaYoutube className="w-8 h-8" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                      {video.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      {video.description}
                    </p>
                    <button
                      onClick={() => handleVideoClick(video.videoUrl, 'youtube', video.youtubeVideoId)}
                      className="w-full mt-4 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <FaYoutube />
                      Watch on YouTube
                    </button>
                  </div>
                </div>
              ))}
            </div>
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

export default Training;
