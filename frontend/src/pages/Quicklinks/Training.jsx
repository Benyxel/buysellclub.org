import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaClock, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaPlay, FaShoppingCart, FaYoutube } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Training = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    message: ''
  });

  const [courses, setCourses] = useState([]);
  const [youtubeVideos, setYoutubeVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    // MOCK: Provide demo courses and youtube videos
    setLoading(true);
    setTimeout(() => {
      setCourses([
        { _id: 'c1', title: 'Import Basics', description: 'Learn essentials of importing goods.', price: 29.99, duration: '1h 20m', thumbnail: 'https://via.placeholder.com/400x225?text=Import+Basics', videoUrl: '#' },
        { _id: 'c2', title: 'Advanced Sourcing', description: 'Find reliable suppliers effectively.', price: 59.00, duration: '2h 05m', thumbnail: 'https://via.placeholder.com/400x225?text=Advanced+Sourcing', videoUrl: '#' },
        { _id: 'c3', title: 'Logistics 101', description: 'Shipping, customs, and warehousing.', price: 45.50, duration: '1h 45m', thumbnail: 'https://via.placeholder.com/400x225?text=Logistics+101', videoUrl: '#' },
        { _id: 'c4', title: 'Payments & Risk', description: 'Alipay and safe transactions.', price: 39.95, duration: '58m', thumbnail: 'https://via.placeholder.com/400x225?text=Payments+%26+Risk', videoUrl: '#' },
      ]);
      setYoutubeVideos([
        { _id: 'y1', title: 'Getting Started with Importing', description: 'Free intro video', thumbnail: 'https://via.placeholder.com/400x225?text=YouTube', videoUrl: 'https://youtube.com' },
        { _id: 'y2', title: 'Supplier Vetting Tips', description: 'Find good suppliers', thumbnail: 'https://via.placeholder.com/400x225?text=YouTube', videoUrl: 'https://youtube.com' },
      ]);
      setLoading(false);
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // MOCK: Simulate success
    setTimeout(() => {
      toast.success('Training session booked successfully! (mocked)');
      setFormData({
      name: '',
      email: '',
      phone: '',
      date: '',
      time: '',
      message: ''
      });
    }, 300);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePurchase = (courseId) => {
    // Here you would typically handle the purchase process
    toast.success('Course added to cart!');
  };

  const handleVideoClick = (url, type) => {
    if (type === 'youtube') {
      window.open(url, '_blank');
    } else {
      // Handle paid course video preview differently
      toast.info('Video preview is available after purchase');
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
                <p className="text-gray-600 dark:text-gray-400">Monday - Friday: 9:00 AM - 6:00 PM</p>
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
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
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
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Email</label>
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
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
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
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Date</label>
                <div className="relative">
                  <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Time</label>
                <div className="relative">
                  <FaClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Additional Notes</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors duration-200"
            >
              Book Training Session
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
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/400x225?text=Course+Thumbnail';
                  }}
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <button
                        onClick={() => handleVideoClick(course.videoUrl, 'paid')}
                    className="p-2 bg-white rounded-full text-primary hover:text-primary/90"
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
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/400x225?text=Video+Thumbnail';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleVideoClick(video.videoUrl, 'youtube')}
                        className="p-2 bg-white rounded-full text-red-600 hover:text-red-700"
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
                      onClick={() => handleVideoClick(video.videoUrl, 'youtube')}
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
